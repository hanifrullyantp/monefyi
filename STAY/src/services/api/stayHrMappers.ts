import type { AttendanceRecord, PayrollEntry, StaffLoan } from '../types/hr';

type DbRow = Record<string, unknown>;

export function mapAttendanceFromDb(row: DbRow): AttendanceRecord {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    workDate: row.work_date as string,
    clockIn: row.clock_in as string | undefined,
    clockOut: row.clock_out as string | undefined,
    status: row.status as AttendanceRecord['status'],
    notes: row.notes as string | undefined,
  };
}

export function mapPayrollFromDb(row: DbRow): PayrollEntry {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    periodMonth: row.period_month as string,
    baseSalary: Number(row.base_salary),
    allowances: Number(row.allowances) || 0,
    deductions: Number(row.deductions) || 0,
    netPay: Number(row.net_pay),
    status: row.status as PayrollEntry['status'],
    paidAt: row.paid_at as string | undefined,
  };
}

export function mapLoanFromDb(row: DbRow): StaffLoan {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    amount: Number(row.amount),
    remaining: Number(row.remaining),
    reason: row.reason as string | undefined,
    status: row.status as StaffLoan['status'],
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

export function mapAttendanceToDb(r: AttendanceRecord) {
  return {
    id: r.id,
    tenant_id: r.tenantId,
    user_id: r.userId,
    work_date: r.workDate,
    clock_in: r.clockIn,
    clock_out: r.clockOut,
    status: r.status,
    notes: r.notes,
  };
}

export function mapPayrollToDb(r: PayrollEntry) {
  return {
    id: r.id,
    tenant_id: r.tenantId,
    user_id: r.userId,
    period_month: r.periodMonth,
    base_salary: r.baseSalary,
    allowances: r.allowances,
    deductions: r.deductions,
    net_pay: r.netPay,
    status: r.status,
    paid_at: r.paidAt,
  };
}

export function mapLoanToDb(r: StaffLoan) {
  return {
    id: r.id,
    tenant_id: r.tenantId,
    user_id: r.userId,
    amount: r.amount,
    remaining: r.remaining,
    reason: r.reason,
    status: r.status,
  };
}
