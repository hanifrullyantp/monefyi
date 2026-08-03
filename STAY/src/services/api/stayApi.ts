import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { OfflineAction } from '../../store/offlineStore';
import { useAppStore } from '../../store/appStore';
import { mapRemoteTenantData } from './stayMappers';

/**
 * Sync a single offline action to Supabase when configured.
 */
export async function syncActionToApi(action: OfflineAction): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    await new Promise((r) => setTimeout(r, 300));
    return true;
  }

  const { type, payload } = action;

  try {
    switch (type) {
      case 'addBooking': {
        const { error } = await supabase.from('stay_bookings').insert(mapBookingToDb(payload));
        if (error) throw error;
        break;
      }
      case 'updateBooking': {
        const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
        const { error } = await supabase
          .from('stay_bookings')
          .update(mapBookingUpdatesToDb(updates))
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'addGuest': {
        const { error } = await supabase.from('stay_guests').insert(mapGuestToDb(payload));
        if (error) throw error;
        break;
      }
      case 'updateGuest': {
        const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
        const { error } = await supabase.from('stay_guests').update(mapGuestUpdatesToDb(updates)).eq('id', id);
        if (error) throw error;
        break;
      }
      case 'addPayment': {
        const { error } = await supabase.from('stay_payments').insert(mapPaymentToDb(payload));
        if (error) throw error;
        break;
      }
      case 'updatePayment': {
        const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
        const { error } = await supabase
          .from('stay_payments')
          .update(mapPaymentUpdatesToDb(updates))
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'updateRoomStatus': {
        const { id, status } = payload as { id: string; status: string };
        const { error } = await supabase.from('stay_rooms').update({ status }).eq('id', id);
        if (error) throw error;
        break;
      }
      case 'updateRoomPosition': {
        const { id, x, y } = payload as { id: string; x: number; y: number };
        const { error } = await supabase
          .from('stay_rooms')
          .update({ position_x: x, position_y: y })
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'addRoom': {
        const { error } = await supabase.from('stay_rooms').insert(mapRoomToDb(payload));
        if (error) throw error;
        break;
      }
      case 'addHousekeepingTask': {
        const { error } = await supabase.from('stay_housekeeping_tasks').insert(mapHousekeepingToDb(payload));
        if (error) throw error;
        break;
      }
      case 'updateHousekeepingTask': {
        const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
        const { error } = await supabase
          .from('stay_housekeeping_tasks')
          .update(mapHousekeepingUpdatesToDb(updates))
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'updateTenant': {
        const { error } = await supabase
          .from('stay_tenants')
          .update(mapTenantUpdatesToDb(payload as Record<string, unknown>))
          .eq('id', useAppStore.getState().tenant.id);
        if (error) throw error;
        break;
      }
      case 'updatePricingRule': {
        const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
        const { error } = await supabase
          .from('stay_pricing_rules')
          .update(mapPricingUpdatesToDb(updates))
          .eq('id', id);
        if (error) throw error;
        break;
      }
      case 'addPricingRule': {
        const { error } = await supabase.from('stay_pricing_rules').insert(mapPricingToDb(payload));
        if (error) throw error;
        break;
      }
      case 'addAccountingEntry': {
        const { error } = await supabase.from('stay_accounting_entries').insert(mapAccountingToDb(payload));
        if (error) throw error;
        break;
      }
      default:
        console.warn('Unknown sync action type:', type);
    }
    return true;
  } catch (err) {
    console.error(`Sync failed for ${type}:`, err);
    return false;
  }
}

export async function fetchTenantData(tenantId: string) {
  if (!isSupabaseConfigured || !supabase) return null;

  const [
    roomTypesRes,
    roomsRes,
    guestsRes,
    bookingsRes,
    paymentsRes,
    hkRes,
    notificationsRes,
    pricingRes,
    accountingRes,
  ] = await Promise.all([
    supabase.from('stay_room_types').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_rooms').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_guests').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_bookings').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_payments').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_housekeeping_tasks').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_notifications').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_pricing_rules').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_accounting_entries').select('*').eq('tenant_id', tenantId),
  ]);

  const errors = [
    roomTypesRes.error,
    roomsRes.error,
    guestsRes.error,
    bookingsRes.error,
    paymentsRes.error,
    hkRes.error,
    notificationsRes.error,
    pricingRes.error,
    accountingRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error('fetchTenantData errors:', errors);
    return null;
  }

  return mapRemoteTenantData({
    roomTypes: roomTypesRes.data ?? [],
    rooms: roomsRes.data ?? [],
    guests: guestsRes.data ?? [],
    bookings: bookingsRes.data ?? [],
    payments: paymentsRes.data ?? [],
    hk: hkRes.data ?? [],
    notifications: notificationsRes.data ?? [],
    pricingRules: pricingRes.data ?? [],
    accounting: accountingRes.data ?? [],
  });
}

/** Load remote tenant data into appStore. */
export async function hydrateAppStoreFromRemote(tenantId: string): Promise<boolean> {
  const data = await fetchTenantData(tenantId);
  if (!data) return false;

  const hasData =
    data.rooms.length > 0 ||
    data.bookings.length > 0 ||
    data.guests.length > 0 ||
    data.roomTypes.length > 0;

  if (hasData) {
    useAppStore.getState().hydrateFromRemote(data);
  }
  return true;
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function fetchStayUserProfile(authUserId: string) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('stay_users')
    .select('*, stay_tenants(*)')
    .eq('auth_user_id', authUserId)
    .single();
  if (error) {
    console.error('fetchStayUserProfile:', error);
    return null;
  }
  return data;
}

export async function saveGuestSurvey(
  _bookingId: string,
  guestId: string,
  data: { idNumber?: string; feedback?: string; rating?: number; discountCode?: string }
) {
  if (!isSupabaseConfigured || !supabase) return { success: true };
  const { error } = await supabase.from('stay_guests').update({
    id_number: data.idNumber,
    notes: data.feedback,
    discount_code: data.discountCode,
  }).eq('id', guestId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

function mapPaymentUpdatesToDb(updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    referenceNumber: 'reference_number',
    externalId: 'external_id',
    paymentUrl: 'payment_url',
    expiryDate: 'expiry_date',
    bookingId: 'booking_id',
  };
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    result[map[k] || k] = v;
  }
  return result;
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
    discount_code: g.discountCode,
  };
}

function mapGuestUpdatesToDb(updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    idType: 'id_type',
    idNumber: 'id_number',
    isBlacklisted: 'is_blacklisted',
    totalStays: 'total_stays',
    discountCode: 'discount_code',
  };
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    result[map[k] || k] = v;
  }
  return result;
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

function mapRoomToDb(r: Record<string, unknown>) {
  return {
    id: r.id,
    tenant_id: r.tenantId,
    room_type_id: r.roomTypeId,
    number: r.number,
    floor: r.floor,
    status: r.status,
    notes: r.notes,
    is_active: r.isActive,
    position_x: r.positionX,
    position_y: r.positionY,
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
    completed_at: t.completedAt,
  };
}

function mapHousekeepingUpdatesToDb(updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    assignedTo: 'assigned_to',
    scheduledAt: 'scheduled_at',
    completedAt: 'completed_at',
  };
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    result[map[k] || k] = v;
  }
  return result;
}

function mapTenantUpdatesToDb(updates: Record<string, unknown>) {
  const map: Record<string, string> = {
    primaryColor: 'primary_color',
    checkInTime: 'check_in_time',
    checkOutTime: 'check_out_time',
    taxPercent: 'tax_percent',
    serviceChargePercent: 'service_charge_percent',
    subscriptionPlan: 'subscription_plan',
    subscriptionExpiry: 'subscription_expiry',
  };
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    result[map[k] || k] = v;
  }
  return result;
}

function mapPricingToDb(r: Record<string, unknown>) {
  return {
    id: r.id,
    tenant_id: r.tenantId,
    name: r.name,
    rule_type: r.type,
    adjustment: r.adjustment,
    is_active: r.isActive,
  };
}

function mapPricingUpdatesToDb(updates: Record<string, unknown>) {
  const map: Record<string, string> = { isActive: 'is_active' };
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'type') {
      result.rule_type = v;
    } else {
      result[map[k] || k] = v;
    }
  }
  return result;
}

function mapAccountingToDb(e: Record<string, unknown>) {
  return {
    id: e.id,
    tenant_id: e.tenantId,
    entry_date: e.date,
    description: e.description,
    category: e.category,
    entry_type: e.type,
    amount: e.amount,
    reference: e.reference,
  };
}
