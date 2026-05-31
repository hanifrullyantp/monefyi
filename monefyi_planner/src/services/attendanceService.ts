export type AttendanceType = 'check_in' | 'check_out';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  org_id: string;
  type: AttendanceType;
  timestamp: string;
  project_name?: string;
  note?: string;
}

const STORAGE_KEY = 'monefyi_planner_attendance';

function readAll(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AttendanceRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAll(records: AttendanceRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-500)));
}

export function recordAttendance(entry: Omit<AttendanceRecord, 'id' | 'timestamp'> & { timestamp?: string }) {
  const records = readAll();
  const record: AttendanceRecord = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: entry.timestamp || new Date().toISOString(),
  };
  records.push(record);
  writeAll(records);
  return record;
}

export function getOrgAttendance(orgId: string, days = 30): AttendanceRecord[] {
  const cutoff = Date.now() - days * 86400000;
  return readAll()
    .filter(r => r.org_id === orgId && new Date(r.timestamp).getTime() >= cutoff)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getTodayAttendance(orgId: string): AttendanceRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  return getOrgAttendance(orgId, 1).filter(r => r.timestamp.startsWith(today));
}

export function getUserTodayStatus(userId: string, orgId: string): {
  checkedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
} {
  const today = getTodayAttendance(orgId).filter(r => r.user_id === userId);
  const lastIn = today.find(r => r.type === 'check_in');
  const lastOut = today.filter(r => r.type === 'check_out').sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  const inAfterOut = lastIn && (!lastOut || lastIn.timestamp > lastOut.timestamp);
  return {
    checkedIn: !!inAfterOut,
    checkInTime: lastIn ? formatTime(lastIn.timestamp) : undefined,
    checkOutTime: lastOut && !inAfterOut ? formatTime(lastOut.timestamp) : undefined,
  };
}

export function getMonthlySummary(userId: string, orgId: string) {
  const records = getOrgAttendance(orgId, 31).filter(r => r.user_id === userId);
  const days = new Set(records.filter(r => r.type === 'check_in').map(r => r.timestamp.slice(0, 10)));
  return { daysPresent: days.size, totalRecords: records.length };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function formatAttendanceTime(iso: string) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function groupTodayByUser(orgId: string) {
  const today = getTodayAttendance(orgId);
  const map = new Map<string, { name: string; checkIn?: string; checkOut?: string; status: 'in' | 'out' | 'none' }>();
  for (const r of today) {
    const cur = map.get(r.user_id) || { name: r.user_name, status: 'none' as const };
    if (r.type === 'check_in') {
      cur.checkIn = formatTime(r.timestamp);
      cur.status = 'in';
    } else {
      cur.checkOut = formatTime(r.timestamp);
      cur.status = 'out';
    }
    map.set(r.user_id, cur);
  }
  return map;
}
