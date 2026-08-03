import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { OfflineAction } from '../../store/offlineStore';

/**
 * Sync a single offline action to Supabase when configured.
 * Falls back to no-op in mock/demo mode.
 */
export async function syncActionToApi(action: OfflineAction): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise((r) => setTimeout(r, 300));
    return true;
  }

  const { type, payload } = action;

  switch (type) {
    case 'addBooking':
      await supabase.from('stay_bookings').insert(mapBookingToDb(payload));
      break;
    case 'updateBooking': {
      const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
      await supabase.from('stay_bookings').update(mapBookingUpdatesToDb(updates)).eq('id', id);
      break;
    }
    case 'addGuest':
      await supabase.from('stay_guests').insert(mapGuestToDb(payload));
      break;
    case 'updateGuest': {
      const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
      await supabase.from('stay_guests').update(updates).eq('id', id);
      break;
    }
    case 'addPayment':
      await supabase.from('stay_payments').insert(mapPaymentToDb(payload));
      break;
    case 'updateRoomStatus': {
      const { id, status } = payload as { id: string; status: string };
      await supabase.from('stay_rooms').update({ status }).eq('id', id);
      break;
    }
    case 'addHousekeepingTask':
      await supabase.from('stay_housekeeping_tasks').insert(mapHousekeepingToDb(payload));
      break;
    default:
      break;
  }

  return true;
}

function mapBookingToDb(b: Record<string, unknown>) {
  return {
    id: b.id,
    tenant_id: b.tenantId,
    booking_code: b.bookingCode,
    guest_id: b.guestId,
    room_id: b.roomId,
    check_in: b.checkIn,
    check_out: b.checkOut,
    nights: b.nights,
    adults: b.adults,
    children: b.children,
    status: b.status,
    payment_status: b.paymentStatus,
    total_amount: b.totalAmount,
    paid_amount: b.paidAmount,
    notes: b.notes,
    source: b.source,
    created_by: b.createdBy,
  };
}

function mapBookingUpdatesToDb(updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    paymentStatus: 'payment_status',
    paidAmount: 'paid_amount',
    totalAmount: 'total_amount',
    checkIn: 'check_in',
    checkOut: 'check_out',
  };
  const result: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(updates)) {
    result[map[k] || k] = v;
  }
  return result;
}

function mapGuestToDb(g: Record<string, unknown>) {
  return {
    id: g.id,
    tenant_id: g.tenantId,
    name: g.name,
    email: g.email,
    phone: g.phone,
    id_type: g.idType,
    id_number: g.idNumber,
    address: g.address,
    nationality: g.nationality,
    is_blacklisted: g.isBlacklisted,
    notes: g.notes,
    total_stays: g.totalStays,
  };
}

function mapPaymentToDb(p: Record<string, unknown>) {
  return {
    id: p.id,
    tenant_id: p.tenantId,
    booking_id: p.bookingId,
    amount: p.amount,
    method: p.method,
    status: p.status,
    reference_number: p.referenceNumber,
    external_id: p.externalId,
    payment_url: p.paymentUrl,
    notes: p.notes,
  };
}

function mapHousekeepingToDb(t: Record<string, unknown>) {
  return {
    id: t.id,
    tenant_id: t.tenantId,
    room_id: t.roomId,
    assigned_to: t.assignedTo,
    status: t.status,
    type: t.type,
    notes: t.notes,
    scheduled_at: t.scheduledAt,
  };
}

export async function fetchTenantData(tenantId: string) {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const [bookings, rooms, guests, payments, hk, notifications] = await Promise.all([
    supabase.from('stay_bookings').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_rooms').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_guests').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_payments').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_housekeeping_tasks').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_notifications').select('*').eq('tenant_id', tenantId),
  ]);

  return { bookings, rooms, guests, payments, hk, notifications };
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function fetchStayUserProfile(authUserId: string) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase
    .from('stay_users')
    .select('*, stay_tenants(*)')
    .eq('auth_user_id', authUserId)
    .single();
  return data;
}

export async function saveGuestSurvey(
  bookingId: string,
  guestId: string,
  data: { idNumber?: string; feedback?: string; rating?: number }
) {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  await supabase.from('stay_guests').update({
    id_number: data.idNumber,
    notes: data.feedback,
  }).eq('id', guestId);
  return { success: true };
}
