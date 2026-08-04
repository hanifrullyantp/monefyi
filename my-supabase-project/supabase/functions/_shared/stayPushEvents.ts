/**
 * Build & send Web Push from STAY database row events.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyStayTenantPush, type StayPushPayload } from "./stayWebPush.ts";

function formatIdr(amount: unknown): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "Rp 0";
  return `Rp ${n.toLocaleString("id-ID")}`;
}

async function insertInboxNotification(
  supabase: SupabaseClient,
  tenantId: string,
  type: string,
  title: string,
  message: string,
): Promise<void> {
  const { error } = await supabase.from("stay_notifications").insert({
    tenant_id: tenantId,
    type,
    title,
    message,
  });
  if (error) {
    console.warn("[stayPushEvents] inbox insert failed:", error.message);
  }
}

async function enrichBookingMessage(
  supabase: SupabaseClient,
  record: Record<string, unknown>,
): Promise<string> {
  const code = (record.booking_code as string) ?? "Booking";
  const amount = formatIdr(record.total_amount);
  const roomId = record.room_id as string | undefined;
  const guestId = record.guest_id as string | undefined;

  let roomLabel = "";
  let guestName = "";

  if (roomId) {
    const { data: room } = await supabase
      .from("stay_rooms")
      .select("number")
      .eq("id", roomId)
      .maybeSingle();
    if (room?.number) roomLabel = ` · Kamar ${room.number}`;
  }

  if (guestId) {
    const { data: guest } = await supabase
      .from("stay_guests")
      .select("name")
      .eq("id", guestId)
      .maybeSingle();
    if (guest?.name) guestName = `${guest.name} · `;
  }

  return `${guestName}${code}${roomLabel} · ${amount}`;
}

/**
 * Dispatch push + inbox notification from a DB INSERT event.
 */
export async function dispatchStayDbEvent(
  supabase: SupabaseClient,
  table: string,
  record: Record<string, unknown>,
): Promise<{ sent: number; failed: number; skipped?: string }> {
  const tenantId = record.tenant_id as string | undefined;
  if (!tenantId) return { sent: 0, failed: 0, skipped: "no_tenant" };

  let payload: StayPushPayload | null = null;
  let inboxType = "system";
  let inboxTitle = "";
  let inboxMessage = "";

  switch (table) {
    case "stay_bookings": {
      inboxType = "booking";
      inboxTitle = "Booking Baru";
      inboxMessage = await enrichBookingMessage(supabase, record);
      payload = {
        title: inboxTitle,
        body: inboxMessage,
        tag: `booking-${record.id}`,
        url: "/stay/bookings",
        type: "booking",
        data: { bookingId: record.id },
      };
      break;
    }
    case "stay_housekeeping_tasks": {
      const taskType = (record.type as string) ?? "cleaning";
      inboxType = "housekeeping";
      inboxTitle = "Tugas Housekeeping";
      inboxMessage = `${taskType} · status ${(record.status as string) ?? "pending"}`;
      payload = {
        title: inboxTitle,
        body: inboxMessage,
        tag: `hk-${record.id}`,
        url: "/stay/housekeeping",
        type: "housekeeping",
        data: { roomId: record.room_id },
      };
      break;
    }
    case "stay_payments": {
      const status = (record.status as string) ?? "";
      if (status !== "paid" && status !== "completed") {
        return { sent: 0, failed: 0, skipped: "payment_not_paid" };
      }
      inboxType = "payment";
      inboxTitle = (record.method as string) === "xendit"
        ? "Pembayaran Xendit Diterima"
        : "Pembayaran Diterima";
      inboxMessage = `${formatIdr(record.amount)} · ${(record.method as string) ?? "transfer"}`;
      payload = {
        title: inboxTitle,
        body: inboxMessage,
        tag: `payment-${record.id}`,
        url: "/stay/payments",
        type: "payment",
        urgent: true,
        data: { bookingId: record.booking_id },
      };
      break;
    }
    default:
      return { sent: 0, failed: 0, skipped: "unsupported_table" };
  }

  await insertInboxNotification(supabase, tenantId, inboxType, inboxTitle, inboxMessage);
  return notifyStayTenantPush(supabase, tenantId, payload);
}

/**
 * Validate internal dispatch secret from stay_system_config or env.
 */
export async function validatePushDispatchSecret(
  supabase: SupabaseClient,
  provided: string | null,
): Promise<boolean> {
  if (!provided) return false;
  const envSecret = Deno.env.get("STAY_PUSH_SECRET");
  if (envSecret && provided === envSecret) return true;

  const { data } = await supabase
    .from("stay_system_config")
    .select("value")
    .eq("key", "push_dispatch_secret")
    .maybeSingle();

  return Boolean(data?.value && data.value === provided);
}
