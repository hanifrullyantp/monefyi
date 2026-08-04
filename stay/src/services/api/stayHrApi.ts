import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { AttendanceRecord, PayrollEntry, StaffLoan } from '../../types/hr';
import {
  mapAttendanceFromDb,
  mapLoanFromDb,
  mapPayrollFromDb,
} from './stayHrMappers';

export async function fetchHrData(tenantId: string) {
  if (!isSupabaseConfigured || !supabase) return null;

  const [attendanceRes, payrollRes, loansRes] = await Promise.all([
    supabase.from('stay_attendance_records').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_payroll_entries').select('*').eq('tenant_id', tenantId),
    supabase.from('stay_staff_loans').select('*').eq('tenant_id', tenantId),
  ]);

  if (attendanceRes.error || payrollRes.error || loansRes.error) {
    console.error('fetchHrData errors', attendanceRes.error, payrollRes.error, loansRes.error);
    return null;
  }

  return {
    attendance: (attendanceRes.data ?? []).map(mapAttendanceFromDb),
    payroll: (payrollRes.data ?? []).map(mapPayrollFromDb),
    loans: (loansRes.data ?? []).map(mapLoanFromDb),
  };
}

export async function upsertAttendance(record: AttendanceRecord): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  const { error } = await supabase.from('stay_attendance_records').upsert({
    id: record.id,
    tenant_id: record.tenantId,
    user_id: record.userId,
    work_date: record.workDate,
    clock_in: record.clockIn,
    clock_out: record.clockOut,
    status: record.status,
    notes: record.notes,
  });
  return !error;
}

export async function updatePayrollStatus(
  id: string,
  status: PayrollEntry['status']
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  const { error } = await supabase
    .from('stay_payroll_entries')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('id', id);
  return !error;
}
