import { create } from 'zustand';
import type { AttendanceRecord, PayrollEntry, StaffLoan } from '../types/hr';
import { fetchHrData, updatePayrollStatus, upsertAttendance } from '../services/api/stayHrApi';
import { generateId } from '../utils/id';

const DEMO_TENANT = 'tenant-1';
const today = new Date().toISOString().split('T')[0];
const periodMonth = `${today.slice(0, 7)}-01`;

const defaultPayroll: PayrollEntry[] = [
  { id: 'payroll-1', tenantId: DEMO_TENANT, userId: 'user-1', periodMonth, baseSalary: 5_000_000, allowances: 500_000, deductions: 0, netPay: 5_500_000, status: 'paid', paidAt: new Date().toISOString() },
  { id: 'payroll-2', tenantId: DEMO_TENANT, userId: 'user-2', periodMonth, baseSalary: 4_000_000, allowances: 400_000, deductions: 100_000, netPay: 4_300_000, status: 'processed' },
  { id: 'payroll-3', tenantId: DEMO_TENANT, userId: 'user-3', periodMonth, baseSalary: 3_500_000, allowances: 250_000, deductions: 50_000, netPay: 3_700_000, status: 'draft' },
];

const defaultAttendance: AttendanceRecord[] = [
  { id: 'att-1', tenantId: DEMO_TENANT, userId: 'user-1', workDate: today, clockIn: new Date().toISOString(), status: 'present' },
  { id: 'att-2', tenantId: DEMO_TENANT, userId: 'user-2', workDate: today, clockIn: new Date().toISOString(), status: 'late' },
  { id: 'att-3', tenantId: DEMO_TENANT, userId: 'user-3', workDate: today, clockIn: new Date().toISOString(), status: 'present' },
];

const defaultLoans: StaffLoan[] = [
  { id: 'loan-1', tenantId: DEMO_TENANT, userId: 'user-2', amount: 2_000_000, remaining: 1_200_000, reason: 'Kebutuhan darurat', status: 'active', createdAt: new Date().toISOString() },
  { id: 'loan-2', tenantId: DEMO_TENANT, userId: 'user-3', amount: 500_000, remaining: 0, reason: 'Pinjaman kecil', status: 'paid', createdAt: new Date().toISOString() },
];

interface HrState {
  attendance: AttendanceRecord[];
  payroll: PayrollEntry[];
  loans: StaffLoan[];
  isLoading: boolean;
  loadHrData: (tenantId: string) => Promise<void>;
  markPayrollPaid: (id: string) => Promise<void>;
  clockInStaff: (tenantId: string, userId: string) => Promise<void>;
}

export const useHrStore = create<HrState>((set, get) => ({
  attendance: defaultAttendance,
  payroll: defaultPayroll,
  loans: defaultLoans,
  isLoading: false,

  loadHrData: async (tenantId) => {
    set({ isLoading: true });
    const remote = await fetchHrData(tenantId);
    if (remote && (remote.payroll.length > 0 || remote.attendance.length > 0)) {
      set({
        attendance: remote.attendance,
        payroll: remote.payroll,
        loans: remote.loans,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  markPayrollPaid: async (id) => {
    const entry = get().payroll.find((p) => p.id === id);
    set((s) => ({
      payroll: s.payroll.map((p) =>
        p.id === id ? { ...p, status: 'paid' as const, paidAt: new Date().toISOString() } : p
      ),
    }));
    await updatePayrollStatus(id, 'paid');
    if (entry) {
      import('../services/finance/financeIntegration').then(({ postPayrollJournal }) => {
        postPayrollJournal(entry.tenantId, entry);
      });
    }
  },

  clockInStaff: async (tenantId, userId) => {
    const workDate = new Date().toISOString().split('T')[0];
    const existing = get().attendance.find((a) => a.userId === userId && a.workDate === workDate);
    if (existing) return;

    const record: AttendanceRecord = {
      id: generateId('att'),
      tenantId,
      userId,
      workDate,
      clockIn: new Date().toISOString(),
      status: 'present',
    };
    set((s) => ({ attendance: [record, ...s.attendance] }));
    await upsertAttendance(record);
  },
}));
