import { orgToday } from '../../../packages/domain/src/dates';
import { supabase } from '../lib/supabase';
import { assertNoDbError } from '../lib/supabaseErrors';
import { useAppStore } from '../store/appStore';
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

const DEFAULT_ORG_TIMEZONE = 'Asia/Jakarta';

function resolveOrgTimeZone(timeZone?: string | null): string {
  if (timeZone && timeZone.trim()) return timeZone.trim();
  try {
    const tz = useAppStore.getState()?.tenant?.timezone;
    if (tz && tz.trim()) return tz.trim();
  } catch {
    /* ignore if store is mocked without tenant */
  }
  return DEFAULT_ORG_TIMEZONE;
}

function safeOrgDate(date: Date, timeZone: string): string {
  try {
    return orgToday(timeZone, date);
  } catch {
    return orgToday(DEFAULT_ORG_TIMEZONE, date);
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: DEFAULT_ORG_TIMEZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value || 0);
  const hour = get('hour') === 24 ? 0 : get('hour');
  const wallUtcMs = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
    0,
  );
  const utcSecMs = Math.floor(date.getTime() / 1000) * 1000;
  return wallUtcMs - utcSecMs;
}

function startOfOrgDateKeyIso(dateKey: string, timeZone: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utcMidnightMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const offset1 = getTimeZoneOffsetMs(new Date(utcMidnightMs), timeZone);
  let candidateMs = utcMidnightMs - offset1;
  const offset2 = getTimeZoneOffsetMs(new Date(candidateMs), timeZone);
  if (offset2 !== offset1) {
    candidateMs = utcMidnightMs - offset2;
  }
  return new Date(candidateMs).toISOString();
}

/** Konversi timestamp ISO atau Date menjadi key tanggal `YYYY-MM-DD` pada zona waktu organisasi/lokal. */
export function toOrgDateKey(isoOrDate: string | Date, timeZone?: string): string {
  const tz = resolveOrgTimeZone(timeZone);
  if (typeof isoOrDate === 'string') {
    const trimmed = isoOrDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) {
    return typeof isoOrDate === 'string' ? isoOrDate.slice(0, 10) : safeOrgDate(new Date(), tz);
  }
  return safeOrgDate(date, tz);
}

/** Awal hari (00:00:00 zona organisasi) dalam ISO UTC agar absen 00:00–06:59 WIB tidak terlewat. */
export function startOfOrgDayIso(now: Date = new Date(), timeZone?: string): string {
  const tz = resolveOrgTimeZone(timeZone);
  const dateKey = toOrgDateKey(now, tz);
  return startOfOrgDateKeyIso(dateKey, tz);
}

export async function getUserTodayStatus(
  userId: string,
  orgId: string,
  timeZone?: string,
): Promise<{
  checkedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  checkInAtIso?: string;
  checkOutAtIso?: string;
}> {
  const tz = resolveOrgTimeZone(timeZone);
  const start = startOfOrgDayIso(new Date(), tz);
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
    Boolean(lastIn) &&
    (!lastOut || new Date(lastIn!.recorded_at).getTime() > new Date(lastOut.recorded_at).getTime());

  return {
    checkedIn: inAfterOut,
    checkInTime: lastIn ? formatTime(lastIn.recorded_at, tz) : undefined,
    checkOutTime: lastOut && !inAfterOut ? formatTime(lastOut.recorded_at, tz) : undefined,
    checkInAtIso: lastIn && inAfterOut ? String(lastIn.recorded_at) : undefined,
    checkOutAtIso: lastOut && !inAfterOut ? String(lastOut.recorded_at) : undefined,
  };
}

/** Pair check-in/out per day and compute hours worked. */
export function computeDailySummaries(
  records: AttendanceRecord[],
  hoursPerDay = 8,
  referenceDate = new Date(),
  timeZone?: string,
): DailyAttendanceSummary[] {
  const tz = resolveOrgTimeZone(timeZone);
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const d = toOrgDateKey(r.timestamp, tz);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  }

  const todayKey = toOrgDateKey(referenceDate, tz);
  const summaries: DailyAttendanceSummary[] = [];
  for (const [date, dayRecords] of byDate) {
    const sorted = [...dayRecords].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    let hoursWorked = 0;
    let checkIn: string | undefined;
    let checkOut: string | undefined;
    let openIn: string | null = null;

    for (const r of sorted) {
      if (r.type === 'check_in') {
        openIn = r.timestamp;
        if (!checkIn) checkIn = formatTime(r.timestamp, tz);
      } else if (r.type === 'check_out' && openIn) {
        const ms = new Date(r.timestamp).getTime() - new Date(openIn).getTime();
        hoursWorked += Math.max(0, ms / 3600000);
        checkOut = formatTime(r.timestamp, tz);
        openIn = null;
      }
    }

    // Still checked in — count until referenceDate if today
    if (openIn && date === todayKey) {
      hoursWorked += Math.max(0, (referenceDate.getTime() - new Date(openIn).getTime()) / 3600000);
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
  referenceDate = new Date(),
  timeZone?: string,
): PartialDayInfo[] {
  return computeDailySummaries(records, hoursPerDay, referenceDate, timeZone)
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
  timeZone?: string,
): number {
  const summaries = computeDailySummaries(records, hoursPerDay, referenceDate, timeZone);
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
  timeZone?: string,
) {
  const tz = resolveOrgTimeZone(timeZone);
  const records = await getUserAttendance(userId, orgId, 31);
  const checkInDays = new Set(
    records.filter(r => r.type === 'check_in').map(r => toOrgDateKey(r.timestamp, tz)),
  );
  const effectiveDays = countEffectiveDays(records, hoursPerDay, new Date(), tz);
  const partialDays = getPartialDays(records, hoursPerDay, new Date(), tz);
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
  timeZone?: string,
): Promise<number> {
  const tz = resolveOrgTimeZone(timeZone);
  const orgDateKey = toOrgDateKey(periodMonth, tz);
  const y = Number(orgDateKey.slice(0, 4));
  const m = Number(orgDateKey.slice(5, 7)); // 1..12
  const monthStartKey = `${y}-${String(m).padStart(2, '0')}-01`;
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  const monthEndKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const start = startOfOrgDateKeyIso(monthStartKey, tz);
  const end = startOfOrgDateKeyIso(monthEndKey, tz);

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
    return countEffectiveDays(records, hoursPerDay, new Date(), tz);
  }
  return new Set(records.filter(r => r.type === 'check_in').map(r => toOrgDateKey(r.timestamp, tz))).size;
}

/** Batch: days present per user_id for current month (for employee cards). */
export function summarizeMonthlyByUser(
  records: AttendanceRecord[],
  hoursPerDay = 8,
  periodMonth = new Date(),
  timeZone?: string,
): Map<string, { daysPresent: number; effectiveDays: number; partialCount: number }> {
  const tz = resolveOrgTimeZone(timeZone);
  const orgDateKey = toOrgDateKey(periodMonth, tz);
  const y = Number(orgDateKey.slice(0, 4));
  const m = Number(orgDateKey.slice(5, 7)); // 1..12
  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
  const monthEnd = m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, '0')}-01`;

  const byUser = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const d = toOrgDateKey(r.timestamp, tz);
    if (d < monthStart || d >= monthEnd) continue;
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id)!.push(r);
  }

  const result = new Map<string, { daysPresent: number; effectiveDays: number; partialCount: number }>();
  for (const [userId, userRecords] of byUser) {
    const checkInDays = new Set(
      userRecords.filter(r => r.type === 'check_in').map(r => toOrgDateKey(r.timestamp, tz)),
    );
    const partialDays = getPartialDays(userRecords, hoursPerDay, new Date(), tz);
    result.set(userId, {
      daysPresent: checkInDays.size,
      effectiveDays: countEffectiveDays(userRecords, hoursPerDay, new Date(), tz),
      partialCount: partialDays.length,
    });
  }
  return result;
}

function formatTime(iso: string, timeZone?: string) {
  const tz = resolveOrgTimeZone(timeZone);
  try {
    return new Date(iso).toLocaleTimeString('id-ID', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
}

export function formatAttendanceTime(iso: string, timeZone?: string) {
  const tz = resolveOrgTimeZone(timeZone);
  try {
    return new Date(iso).toLocaleString('id-ID', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export async function groupTodayByUser(orgId: string, timeZone?: string) {
  const tz = resolveOrgTimeZone(timeZone);
  const start = startOfOrgDayIso(new Date(), tz);
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
    const row = r as unknown as DbAttendanceRow;
    const cur = map.get(row.user_id) || {
      name: row.profiles?.name || 'Karyawan',
      status: 'none' as const,
    };
    if (row.type === 'check_in') {
      cur.checkIn = formatTime(row.recorded_at, tz);
      cur.status = 'in';
    } else {
      cur.checkOut = formatTime(row.recorded_at, tz);
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
