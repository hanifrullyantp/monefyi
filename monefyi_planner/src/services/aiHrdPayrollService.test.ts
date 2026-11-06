import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeFieldPayroll,
  executeMayarDisbursementBatch,
  generateSlipGajiMessage,
  type FieldPayrollBudget,
} from './aiHrdPayrollService';
import type { OrgMember } from '../types/onboarding';

describe('AI HRD Payroll & Field Disbursement Service', () => {
  const dummyBudget: FieldPayrollBudget = {
    budgetAmount: 10000000,
    sourceAccount: 'kas_lapangan',
    periodLabel: 'Minggu I November 2026',
    notes: 'Alokasi tukang proyek',
    managerName: 'Pak Raka',
  };

  const dummyMembers: OrgMember[] = [
    {
      id: 'm1',
      org_id: 'org1',
      user_id: 'u1',
      role: 'worker',
      position: 'Tukang Besi & Cor',
      phone: '08123456789',
      profile: { name: 'Ahmad Supriyadi' },
      bank_name: 'BCA',
      bank_account: '1234567890',
      bank_holder: 'Ahmad Supriyadi',
    },
    {
      id: 'm2',
      org_id: 'org1',
      user_id: 'u2',
      role: 'worker',
      position: 'Mandor Lapangan',
      phone: '082233445566',
      profile: { name: 'Budi Santoso' },
      bank_name: 'Mandiri',
      bank_account: '9876543210',
      bank_holder: 'Budi Santoso',
    },
    {
      id: 'm3',
      org_id: 'org1',
      user_id: 'u3',
      role: 'worker',
      position: 'Helper Lapangan',
      phone: '085566778899',
      profile: { name: 'Joko' },
      // Rekening kosong
      bank_name: '',
      bank_account: '',
      bank_holder: '',
    },
  ];

  it('menghitung gaji pokok, potongan kasbon, dan memvalidasi anggaran saldo lapangan', () => {
    const analysis = analyzeFieldPayroll({
      budget: dummyBudget,
      members: dummyMembers,
      attendanceRecords: [
        { id: 'att1', user_id: 'u1', org_id: 'org1', type: 'check_in', created_at: '2026-11-01T08:00:00Z' },
        { id: 'att2', user_id: 'u1', org_id: 'org1', type: 'check_in', created_at: '2026-11-02T08:00:00Z' },
      ],
      compensationList: [
        { id: 'c1', org_id: 'org1', member_id: 'm1', user_id: 'u1', salary_type: 'daily', daily_rate: 150000, monthly_salary: 0, currency: 'IDR' },
        { id: 'c2', org_id: 'org1', member_id: 'm2', user_id: 'u2', salary_type: 'monthly', daily_rate: 200000, monthly_salary: 4400000, currency: 'IDR' },
      ],
      bonRequests: [
        { id: 'b1', org_id: 'org1', user_id: 'u1', amount: 100000, status: 'approved' },
      ],
    });

    expect(analysis.calculations.length).toBe(3);
    const ahmad = analysis.calculations.find(c => c.name === 'Ahmad Supriyadi');
    expect(ahmad).toBeDefined();
    expect(ahmad?.kasbonDeduction).toBe(100000);
    expect(ahmad?.isBankValid).toBe(true);

    const joko = analysis.calculations.find(c => c.name === 'Joko');
    expect(joko?.isBankValid).toBe(false);

    expect(analysis.summary.budgetSubmitted).toBe(10000000);
    expect(analysis.summary.totalNet).toBeGreaterThan(0);
    expect(analysis.summary.missingBankCount).toBe(1);
    expect(analysis.summary.aiObservations.length).toBeGreaterThan(0);
  });

  it('menghasilkan pesan WhatsApp slip gaji digital yang rapi dan informatif', () => {
    const item = {
      memberId: 'm1',
      userId: 'u1',
      name: 'Ahmad Supriyadi',
      position: 'Tukang Besi & Cor',
      role: 'worker',
      phone: '08123456789',
      salaryType: 'daily' as const,
      baseRate: 150000,
      daysPresent: 20,
      grossSalary: 3000000,
      overtimeBonus: 200000,
      kasbonDeduction: 100000,
      netSalary: 3100000,
      bankName: 'BCA',
      bankAccount: '1234567890',
      bankHolder: 'Ahmad Supriyadi',
      isBankValid: true,
      status: 'verified' as const,
      disbursementRef: 'MYR-PAY-9988-ABCD',
    };

    const msg = generateSlipGajiMessage(item, 'Minggu I November 2026');
    expect(msg).toContain('SLIP GAJI PEKERJA LAPANGAN');
    expect(msg).toContain('Ahmad Supriyadi');
    expect(msg).toContain('3.100.000');
    expect(msg).toContain('MYR-PAY-9988-ABCD');
    expect(msg).toContain('BCA');
  });

  it('mengeksekusi batch disbursement Mayar dan menghasilkan batch record', async () => {
    const analysis = analyzeFieldPayroll({
      budget: dummyBudget,
      members: dummyMembers,
      attendanceRecords: [],
      compensationList: [],
      bonRequests: [],
    });

    const result = await executeMayarDisbursementBatch({
      orgId: 'org1',
      budget: dummyBudget,
      items: analysis.calculations,
      actorId: 'admin1',
      skipDbSync: true,
    });

    expect(result.mayarBatchRef).toMatch(/^MYR-PAY-/);
    expect(result.status).toBe('success');
    expect(result.employeeCount).toBe(3);
    expect(result.totalDisbursed).toBe(analysis.summary.totalNet);
  });
});
