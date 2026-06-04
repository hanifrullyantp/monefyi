import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';

const PROFILE_BY_USER = 'profiles!user_id';

export type AttendanceType = 'check_in' | 'check_out';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  org_id: string;
  type: AttendanceType;
  timestamp: string;
  project_id?: string | null;
  project_name?: string | null;
  note?: string | null;
}

type DbAttendanceRow = {
  id: string;
  org_id: string;
  user_id: string;
  type: AttendanceType;
  recorded_at: string;
  project_id?: string | null;
  project_name?: string | null;
  note?: string | null;
  profiles?: { name?: string | null } | null;
};

function mapRow(row: DbAttendanceRow, fallbackName = 'Karyawan'): AttendanceRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    user_name: row.profiles?.name || fallbackName,
    org_id: row.org_id,
    type: row.type,
    timestamp: row.recorded_at,
    project_id: row.project_id,
    project_name: row.project_name,
    note: row.note,
  };
}

export async function recordAttendance(entry: {
  user_id: string;
  user_name?: string;
  org_id: string;
  type: AttendanceType;
  project_id?: string;
  project_name?: string;
  note?: string;
}): Promise<AttendanceRecord> {
  const status = await getUserTodayStatus(entry.user_id, entry.org_id);
  if (entry.type === 'check_in' && status.checkedIn) {
    throw new Error('Anda sudah check-in hari ini. Check-out dulu jika perlu.');
  }
  if (entry.type === 'check_out' && !status.checkedIn) {
    throw new Error('Belum check-in hari ini.');
  }

  const { data, error } = await supabase
    .from('planner_attendance_records')
    .insert({
      org_id: entry.org_id,
      user_id: entry.user_id,
      type: entry.type,
      project_id: entry.project_id || null,
      project_name: entry.project_name || null,
      note: entry.note || null,
    })
    .select(`*, ${PROFILE_BY_USER}(name)`)
    .single();

  assertNoDbError(error);
  return mapRow(data as DbAttendanceRow, entry.user_name);
}

export async function getOrgAttendance(orgId: string, days = 30): Promise<AttendanceRecord[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from('planner_attendance_records')
    .select(`*, ${PROFILE_BY_USER}(name)`)
    .eq('org_id', orgId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false });

  assertNoDbError(error);
  return (data || []).map(row => mapRow(row as DbAttendanceRow));
}

export async function getUserAttendance(
  userId: string,
  orgId: string,
  days = 30,
): Promise<AttendanceRecord[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from('planner_attendance_records')
    .select(`*, ${PROFILE_BY_USER}(name)`)
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: false });

  assertNoDbError(error);
  return (data || []).map(row => mapRow(row as DbAttendanceRow));
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getUserTodayStatus(
  userId: string,
  orgId: string,
): Promise<{
  checkedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  checkInAtIso?: string;
  checkOutAtIso?: string;
}> {
  const start = `${todayIsoDate()}T00:00:00.000Z`;
  const { data, error } = await supabase
    .from('planner_attendance_records')
    .select('type, recorded_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .gte('recorded_at', start)
    .order('recorded_at', { ascending: true });

  assertNoDbError(error);
  const today = data || [];
  const lastIn = [...today].reverse().find(r => r.type === 'check_in');
  const lastOut = [...today].reverse().find(r => r.type === 'check_out');
  const inAfterOut =
    lastIn && (!lastOut || lastIn.recorded_at > lastOut.recorded_at);

  return {
    checkedIn: !!inAfterOut,
    checkInTime: lastIn ? formatTime(lastIn.recorded_at) : undefined,
    checkOutTime: lastOut && !inAfterOut ? formatTime(lastOut.recorded_at) : undefined,
    checkInAtIso: lastIn && inAfterOut ? String(lastIn.recorded_at) : undefined,
    checkOutAtIso: lastOut && !inAfterOut ? String(lastOut.recorded_at) : undefined,
  };
}

export async function getMonthlySummary(userId: string, orgId: string) {
  const records = await getUserAttendance(userId, orgId, 31);
  const days = new Set(
    records.filter(r => r.type === 'check_in').map(r => r.timestamp.slice(0, 10)),
  );
  return { daysPresent: days.size, totalRecords: records.length };
}

export async function countDaysPresentInMonth(
  userId: string,
  orgId: string,
  periodMonth: Date,
): Promise<number> {
  const y = periodMonth.getFullYear();
  const m = periodMonth.getMonth();
  const start = new Date(Date.UTC(y, m, 1)).toISOString();
  const end = new Date(Date.UTC(y, m + 1, 1)).toISOString();

  const { data, error } = await supabase
    .from('planner_attendance_records')
    .select('recorded_at')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .eq('type', 'check_in')
    .gte('recorded_at', start)
    .lt('recorded_at', end);

  assertNoDbError(error);
  return new Set((data || []).map(r => String(r.recorded_at).slice(0, 10))).size;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function formatAttendanceTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function groupTodayByUser(orgId: string) {
  const start = `${todayIsoDate()}T00:00:00.000Z`;
  const { data, error } = await supabase
    .from('planner_attendance_records')
    .select(`user_id, type, recorded_at, ${PROFILE_BY_USER}(name)`)
    .eq('org_id', orgId)
    .gte('recorded_at', start)
    .order('recorded_at', { ascending: true });

  assertNoDbError(error);

  const map = new Map<
    string,
    { name: string; checkIn?: string; checkOut?: string; status: 'in' | 'out' | 'none' }
  >();

  for (const r of data || []) {
    const row = r as DbAttendanceRow;
    const cur = map.get(row.user_id) || {
      name: row.profiles?.name || 'Karyawan',
      status: 'none' as const,
    };
    if (row.type === 'check_in') {
      cur.checkIn = formatTime(row.recorded_at);
      cur.status = 'in';
    } else {
      cur.checkOut = formatTime(row.recorded_at);
      cur.status = 'out';
    }
    map.set(row.user_id, cur);
  }
  return map;
}

export function formatCurrency(amount: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
