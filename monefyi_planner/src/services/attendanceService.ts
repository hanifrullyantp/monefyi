import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import type { AttendanceSettings } from '../utils/attendanceSettings';
import { getCurrentPosition, isInsideWorkSite, type GeoPosition } from '../utils/geoUtils';

const PROFILE_BY_USER = 'profiles!user_id';

export type AttendanceType = 'check_in' | 'check_out';
export type AttendanceSource = 'manual' | 'admin_manual' | 'geofence' | 'wifi_auto';

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
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  is_offsite?: boolean;
  source?: AttendanceSource;
}

export interface PartialDayInfo {
  date: string;
  hoursWorked: number;
  requiredHours: number;
  checkIn?: string;
  checkOut?: string;
}

export interface DailyAttendanceSummary {
  date: string;
  hoursWorked: number;
  isComplete: boolean;
  isPartial: boolean;
  checkIn?: string;
  checkOut?: string;
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
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  is_offsite?: boolean | null;
  source?: AttendanceSource | null;
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
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    location_accuracy: row.location_accuracy ?? null,
    is_offsite: row.is_offsite ?? false,
    source: row.source ?? 'manual',
  };
}

export interface LocationCheckResult {
  position?: GeoPosition;
  isOffsite: boolean;
  distanceM?: number;
  message?: string;
}

export async function resolveAttendanceLocation(
  settings: AttendanceSettings,
): Promise<LocationCheckResult> {
  if (!settings.geofence_enabled || !settings.work_site) {
    return { isOffsite: false };
  }
  try {
    const position = await getCurrentPosition();
    const inside = isInsideWorkSite(position, settings.work_site);
    return {
      position,
      isOffsite: !inside,
      message: inside
        ? undefined
        : `Anda di luar lokasi kerja${settings.work_site.name ? ` (${settings.work_site.name})` : ''}. Absensi tetap dicatat.`,
    };
  } catch (e) {
    return {
      isOffsite: false,
      message: e instanceof Error ? e.message : 'Lokasi tidak tersedia.',
    };
  }
}

function buildInsertPayload(
  entry: {
    user_id: string;
    org_id: string;
    type: AttendanceType;
    project_id?: string;
    project_name?: string;
    note?: string;
    recorded_at?: string;
    latitude?: number | null;
    longitude?: number | null;
    location_accuracy?: number | null;
    is_offsite?: boolean;
    source?: AttendanceSource;
  },
) {
  return {
    org_id: entry.org_id,
    user_id: entry.user_id,
    type: entry.type,
    recorded_at: entry.recorded_at,
    project_id: entry.project_id || null,
    project_name: entry.project_name || null,
    note: entry.note || null,
    latitude: entry.latitude ?? null,
    longitude: entry.longitude ?? null,
    location_accuracy: entry.location_accuracy ?? null,
    is_offsite: entry.is_offsite ?? false,
    source: entry.source || 'manual',
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
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy?: number | null;
  is_offsite?: boolean;
  source?: AttendanceSource;
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
    .insert(buildInsertPayload(entry))
    .select(`*, ${PROFILE_BY_USER}(name)`)
    .single();

  assertNoDbError(error);
  return mapRow(data as DbAttendanceRow, entry.user_name);
}

/** Owner/manager manual attendance for a team member. */
export async function recordAdminAttendance(entry: {
  user_id: string;
  user_name?: string;
  org_id: string;
  type: AttendanceType;
  recorded_at: string;
  project_id?: string;
  project_name?: string;
  note?: string;
}): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('planner_attendance_records')
    .insert(buildInsertPayload({
      ...entry,
      note: entry.note || 'admin_manual',
      source: 'admin_manual',
    }))
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

/** Pair check-in/out per day and compute hours worked. */
export function computeDailySummaries(
  records: AttendanceRecord[],
  hoursPerDay = 8,
  referenceDate = new Date(),
): DailyAttendanceSummary[] {
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const d = r.timestamp.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  }

  const summaries: DailyAttendanceSummary[] = [];
  for (const [date, dayRecords] of byDate) {
    const sorted = [...dayRecords].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let hoursWorked = 0;
    let checkIn: string | undefined;
    let checkOut: string | undefined;
    let openIn: string | null = null;

    for (const r of sorted) {
      if (r.type === 'check_in') {
        openIn = r.timestamp;
        if (!checkIn) checkIn = formatTime(r.timestamp);
      } else if (r.type === 'check_out' && openIn) {
        const ms = new Date(r.timestamp).getTime() - new Date(openIn).getTime();
        hoursWorked += Math.max(0, ms / 3600000);
        checkOut = formatTime(r.timestamp);
        openIn = null;
      }
    }

    // Still checked in — count until now if today
    if (openIn && date === referenceDate.toISOString().slice(0, 10)) {
      hoursWorked += Math.max(0, (Date.now() - new Date(openIn).getTime()) / 3600000);
    }

    const isComplete = hoursWorked >= hoursPerDay - 0.01;
    const hasCheckIn = sorted.some(r => r.type === 'check_in');
    summaries.push({
      date,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      isComplete: hasCheckIn && isComplete,
      isPartial: hasCheckIn && hoursWorked > 0 && !isComplete,
      checkIn,
      checkOut,
    });
  }

  return summaries.sort((a, b) => b.date.localeCompare(a.date));
}

export function getPartialDays(
  records: AttendanceRecord[],
  hoursPerDay = 8,
): PartialDayInfo[] {
  return computeDailySummaries(records, hoursPerDay)
    .filter(d => d.isPartial)
    .map(d => ({
      date: d.date,
      hoursWorked: d.hoursWorked,
      requiredHours: hoursPerDay,
      checkIn: d.checkIn,
      checkOut: d.checkOut,
    }));
}

/** Effective attendance days (partial days count as fraction). */
export function countEffectiveDays(
  records: AttendanceRecord[],
  hoursPerDay = 8,
  referenceDate = new Date(),
): number {
  const summaries = computeDailySummaries(records, hoursPerDay, referenceDate);
  let total = 0;
  for (const d of summaries) {
    if (d.hoursWorked <= 0) continue;
    total += Math.min(1, d.hoursWorked / hoursPerDay);
  }
  return Math.round(total * 100) / 100;
}

export async function getMonthlySummary(
  userId: string,
  orgId: string,
  hoursPerDay = 8,
) {
  const records = await getUserAttendance(userId, orgId, 31);
  const checkInDays = new Set(
    records.filter(r => r.type === 'check_in').map(r => r.timestamp.slice(0, 10)),
  );
  const effectiveDays = countEffectiveDays(records, hoursPerDay);
  const partialDays = getPartialDays(records, hoursPerDay);
  return {
    daysPresent: checkInDays.size,
    effectiveDays,
    partialDays,
    totalRecords: records.length,
  };
}

export async function countDaysPresentInMonth(
  userId: string,
  orgId: string,
  periodMonth: Date,
  hoursPerDay = 8,
  useEffectiveDays = true,
): Promise<number> {
  const y = periodMonth.getFullYear();
  const m = periodMonth.getMonth();
  const start = new Date(Date.UTC(y, m, 1)).toISOString();
  const end = new Date(Date.UTC(y, m + 1, 1)).toISOString();

  const { data, error } = await supabase
    .from('planner_attendance_records')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .gte('recorded_at', start)
    .lt('recorded_at', end)
    .order('recorded_at', { ascending: true });

  assertNoDbError(error);
  const records = (data || []).map(row => mapRow(row as DbAttendanceRow));

  if (useEffectiveDays) {
    return countEffectiveDays(records, hoursPerDay);
  }
  return new Set(records.filter(r => r.type === 'check_in').map(r => r.timestamp.slice(0, 10))).size;
}

/** Batch: days present per user_id for current month (for employee cards). */
export function summarizeMonthlyByUser(
  records: AttendanceRecord[],
  hoursPerDay = 8,
  periodMonth = new Date(),
): Map<string, { daysPresent: number; effectiveDays: number; partialCount: number }> {
  const y = periodMonth.getFullYear();
  const m = periodMonth.getMonth();
  const monthStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const monthEnd = m === 11
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 2).padStart(2, '0')}-01`;

  const byUser = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const d = r.timestamp.slice(0, 10);
    if (d < monthStart || d >= monthEnd) continue;
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id)!.push(r);
  }

  const result = new Map<string, { daysPresent: number; effectiveDays: number; partialCount: number }>();
  for (const [userId, userRecords] of byUser) {
    const checkInDays = new Set(
      userRecords.filter(r => r.type === 'check_in').map(r => r.timestamp.slice(0, 10)),
    );
    const partialDays = getPartialDays(userRecords, hoursPerDay);
    result.set(userId, {
      daysPresent: checkInDays.size,
      effectiveDays: countEffectiveDays(userRecords, hoursPerDay),
      partialCount: partialDays.length,
    });
  }
  return result;
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

export function formatSalaryLabel(comp?: {
  salary_type?: string;
  monthly_salary?: number;
  daily_rate?: number;
} | null): string {
  if (!comp) return '—';
  if (comp.salary_type === 'daily') {
    return comp.daily_rate ? `${formatCurrency(comp.daily_rate)}/hari` : '—';
  }
  return comp.monthly_salary ? `${formatCurrency(comp.monthly_salary)}/bln` : '—';
}
