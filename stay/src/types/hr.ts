export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave';

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  userId: string;
  workDate: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface PayrollEntry {
  id: string;
  tenantId: string;
  userId: string;
  periodMonth: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: 'draft' | 'processed' | 'paid';
  paidAt?: string;
}

export interface StaffLoan {
  id: string;
  tenantId: string;
  userId: string;
  amount: number;
  remaining: number;
  reason?: string;
  status: 'active' | 'paid' | 'cancelled';
  createdAt: string;
}
