import { computeDailySummaries, type AttendanceRecord } from './attendanceService';
import type { LaborRateType, LaborSlotDraft } from '../types/labor';

/**
 * Map HR attendance records for a project into actual labor slot drafts.
 */
export function mapAttendanceToActualSlots(
  records: AttendanceRecord[],
  projectId: string,
  hoursPerDay = 8,
  _unitRate = 0,
  rateType: LaborRateType = 'daily',
): LaborSlotDraft[] {
  const filtered = records.filter(r => r.project_id === projectId);
  if (!filtered.length) return [];

  const summaries = computeDailySummaries(filtered, hoursPerDay);
  return summaries
    .filter(d => d.hoursWorked > 0)
    .map(d => {
      const fraction = Math.min(1, Math.round((d.hoursWorked / hoursPerDay) * 100) / 100);
      const overtime = Math.max(0, d.hoursWorked - hoursPerDay);
      return {
        work_date: d.date,
        day_fraction: rateType === 'hourly' ? 1 : fraction,
        regular_hours: rateType === 'hourly'
          ? Math.min(d.hoursWorked, hoursPerDay)
          : hoursPerDay * fraction,
        overtime_hours: Math.round(overtime * 100) / 100,
        notes: d.isPartial ? 'Dari absensi (jam kurang)' : 'Dari absensi HR',
      };
    });
}
