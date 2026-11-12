/**
 * Helper database untuk engine: log aksi append-only, idempotency per hari, lock eksekusi,
 * dan guardrail untuk aksi manual. Semua akses memakai service role (server only).
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getServiceClient(): SupabaseClient {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://zzwqfmdyncxbolestkqp.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d3FmbWR5bmN4Ym9sZXN0a3FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM0Mjc5NCwiZXhwIjoyMDgxOTE4Nzk0fQ.nQWJJiUTu5YjDcOFI3I1-I1Yf3FFW7_-uNiQXL7RkM8";
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi untuk engine.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Tanggal WIB (YYYY-MM-DD). Dipakai untuk kunci idempotency harian. */
export function wibDate(now: number = Date.now()): string {
  return new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function hasSucceededToday(idempotencyKey: string): Promise<boolean> {
  try {
    const { data, error } = await getServiceClient()
      .from("engine_action_log")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .eq("live_executed", true)
      .limit(1);
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export interface EngineActionLogEntry {
  source: "cron" | "manual";
  actor: string;
  actionType: string;
  planId?: string | null;
  idempotencyKey?: string | null;
  campaignId?: string;
  campaignName?: string;
  ok: boolean;
  liveExecuted: boolean;
  beforeValue?: number | null;
  afterValue?: number | null;
  summary?: string;
  response?: unknown;
}

/** Mengembalikan true jika tercatat. Kegagalan log dicatat di console dan tidak membatalkan aksi. */
export async function logEngineAction(entry: EngineActionLogEntry): Promise<boolean> {
  try {
    const { error } = await getServiceClient().from("engine_action_log").insert({
      source: entry.source,
      actor: entry.actor,
      action_type: entry.actionType,
      plan_id: entry.planId ?? null,
      idempotency_key: entry.idempotencyKey ?? null,
      campaign_id: entry.campaignId || null,
      campaign_name: entry.campaignName || null,
      ok: entry.ok,
      live_executed: entry.liveExecuted,
      before_value: entry.beforeValue ?? null,
      after_value: entry.afterValue ?? null,
      summary: entry.summary || null,
      response: entry.response ?? null,
    });
    if (error) {
      console.error("[engine_action_log] gagal mencatat:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[engine_action_log] exception:", err);
    return false;
  }
}

/** Lock atomik: hanya satu analisa/eksekusi yang boleh berjalan dalam satu waktu. */
export async function acquireRunLock(id: string, ttlMs = 10 * 60 * 1000): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString();
    const until = new Date(Date.now() + ttlMs).toISOString();
    const { data, error } = await getServiceClient()
      .from("engine_run_lock")
      .update({ locked_until: until })
      .eq("id", id)
      .lt("locked_until", nowIso)
      .select("id");
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

export async function releaseRunLock(id: string): Promise<void> {
  try {
    await getServiceClient()
      .from("engine_run_lock")
      .update({ locked_until: new Date(0).toISOString() })
      .eq("id", id);
  } catch {
    /* lock akan kedaluwarsa sendiri */
  }
}

export interface ManualGuardDecision {
  allowed: boolean;
  reason?: string;
  minBudget?: number;
}

/**
 * Guardrail untuk aksi manual (dan aksi yang dipanggil engine). Fail closed:
 * jika konfigurasi tidak terbaca, perubahan live ditolak.
 * kind "pause" selalu diizinkan karena mengurangi risiko.
 */
export async function checkManualLiveChange(input: {
  kind: "pause" | "activate" | "create" | "budget";
  requestedBudget?: number;
}): Promise<ManualGuardDecision> {
  if (input.kind === "pause") return { allowed: true };

  let cfg: { kill_switch?: boolean; approved_daily_ceiling?: number; min_daily_budget?: number } | null = null;
  try {
    const { data, error } = await getServiceClient()
      .from("winning_engine_config")
      .select("kill_switch, approved_daily_ceiling, min_daily_budget")
      .eq("id", "default")
      .maybeSingle();
    if (error || !data) cfg = null;
    else cfg = data;
  } catch {
    cfg = null;
  }
  if (!cfg) {
    return { allowed: false, reason: "Konfigurasi guardrail tidak terbaca. Perubahan dibatalkan demi keamanan." };
  }

  if (cfg.kill_switch) {
    return { allowed: false, reason: "Kill-Switch aktif. Aktivasi dan perubahan budget dihentikan. Pause tetap diizinkan." };
  }

  const minBudget = Number(cfg.min_daily_budget || 100000);
  if (input.kind === "budget") {
    const req = Number(input.requestedBudget || 0);
    const ceiling = Number(cfg.approved_daily_ceiling || 0);
    if (ceiling > 0 && req > ceiling) {
      return {
        allowed: false,
        reason: `Budget Rp ${req.toLocaleString("id-ID")} melebihi plafon harian yang disetujui Rp ${ceiling.toLocaleString("id-ID")}.`,
        minBudget,
      };
    }
    if (req < minBudget) {
      return {
        allowed: false,
        reason: `Budget minimum Rp ${minBudget.toLocaleString("id-ID")} per hari sesuai guardrail.`,
        minBudget,
      };
    }
  }
  return { allowed: true, minBudget };
}

/**
 * Nilai guardrail yang HARUS berasal dari database, bukan dari body request.
 * Mengembalikan null jika tidak terbaca (pemanggil harus menolak eksekusi).
 */
export async function loadServerGuardrails(): Promise<{
  killSwitch: boolean;
  approvedDailyCeiling: number;
  minDailyBudget: number;
  maxDailyBudget: number;
} | null> {
  try {
    const { data, error } = await getServiceClient()
      .from("winning_engine_config")
      .select("kill_switch, approved_daily_ceiling, min_daily_budget, max_daily_budget")
      .eq("id", "default")
      .maybeSingle();
    if (error || !data) return null;
    return {
      killSwitch: Boolean(data.kill_switch),
      approvedDailyCeiling: Number(data.approved_daily_ceiling || 0),
      minDailyBudget: Number(data.min_daily_budget || 100000),
      maxDailyBudget: Number(data.max_daily_budget || 0),
    };
  } catch {
    return null;
  }
}

/**
 * Jumlah pesanan yang benar-benar lunas sejak waktu tertentu, dari tabel pesanan Anda.
 * Opt-in lewat env agar tidak menebak skema:
 *   ORDERS_TABLE            nama tabel (wajib; jika kosong rekonsiliasi dilewati)
 *   ORDERS_STATUS_COLUMN    default "status"
 *   ORDERS_PAID_VALUES      default "paid,settled,success,lunas"
 *   ORDERS_CREATED_COLUMN   default "created_at"
 * Mengembalikan null jika belum dikonfigurasi atau gagal dibaca.
 */
export async function loadPaidOrderCount(sinceIso: string): Promise<number | null> {
  const table = process.env.ORDERS_TABLE;
  if (!table) return null;
  const statusCol = process.env.ORDERS_STATUS_COLUMN || "status";
  const createdCol = process.env.ORDERS_CREATED_COLUMN || "created_at";
  const paid = (process.env.ORDERS_PAID_VALUES || "paid,settled,success,lunas")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const { count, error } = await getServiceClient()
      .from(table)
      .select("*", { count: "exact", head: true })
      .in(statusCol, paid)
      .gte(createdCol, sinceIso);
    if (error) {
      console.error("[reconciliation] gagal membaca pesanan:", error.message);
      return null;
    }
    return typeof count === "number" ? count : null;
  } catch (err) {
    console.error("[reconciliation] exception:", err);
    return null;
  }
}

/**
 * Kampanye yang baru saja diaktifkan ulang oleh admin (undo pause). AI tidak boleh mem-pause lagi
 * selama jendela tahan, supaya tidak terjadi tarik-menarik antara admin dan mesin.
 * Mengembalikan peta campaignId -> alasan.
 */
export async function loadUserHolds(hours = 72): Promise<Record<string, string>> {
  const holds: Record<string, string> = {};
  try {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data } = await getServiceClient()
      .from("engine_action_log")
      .select("campaign_id, created_at")
      .eq("action_type", "undo_pause_bleeding_campaign")
      .eq("live_executed", true)
      .gte("created_at", since);
    for (const row of data || []) {
      if (!row.campaign_id) continue;
      holds[String(row.campaign_id)] =
        `Admin mengaktifkan ulang kampanye ini pada ${new Date(row.created_at).toISOString().slice(0, 16).replace("T", " ")} UTC. ` +
        `AI tidak akan menghentikannya lagi selama ${hours} jam.`;
    }
  } catch {
    /* tanpa riwayat tahan, aturan boncos normal tetap berlaku */
  }
  return holds;
}
