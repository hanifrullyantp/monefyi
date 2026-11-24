import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OrgMember } from '../../../types/onboarding';
import type { AttendanceRecord } from '../../../services/attendanceService';
import type { MemberCompensation, BonRequest } from '../../../services/payrollService';

const {
  mockFrom,
  mockPostPayrollJournal,
  mockPostBonJournal,
  mockRecordReversibleAction,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockPostPayrollJournal: vi.fn(),
  mockPostBonJournal: vi.fn(),
  mockRecordReversibleAction: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

vi.mock('../../../services/financeV2/payrollJournalBridge', () => ({
  postPayrollDisbursementJournal: mockPostPayrollJournal,
  postBonDisbursementJournal: mockPostBonJournal,
}));

vi.mock('../../../services/undoService', () => ({
  recordReversibleAction: mockRecordReversibleAction,
}));

import {
  analyzeFieldPayroll,
  executeMayarDisbursementBatch,
  confirmPayrollDisbursementBatch,
  formatWhatsAppSlip,
  PayrollJournalPostError,
  type FieldPayrollBudget,
  type PayrollPaymentProvider,
} from '../../../services/aiHrdPayrollService';
import {
  updatePayrollStatus,
  reviewBonRequest,
} from '../../../services/payrollService';

const VALID_ORG_ID = '11111111-1111-4111-8111-111111111111';
const VALID_USER_1 = '22222222-2222-4222-8222-222222222222';
const VALID_USER_2 = '33333333-3333-4333-8333-333333333333';
const VALID_ENTRY_UUID = '44444444-4444-4444-8444-444444444444';
const VALID_BON_UUID = '55555555-5555-4555-8555-555555555555';

const baseBudget: FieldPayrollBudget = {
  budgetAmount: 10_000_000,
  sourceAccount: 'kas_lapangan',
  periodLabel: 'Minggu IV November 2026',
  notes: 'Gaji lapangan proyek A',
  managerName: 'Pak Mandor',
};

const baseMembers: OrgMember[] = [
  {
    id: 'm1',
    org_id: VALID_ORG_ID,
    user_id: VALID_USER_1,
    role: 'worker',
    status: 'active',
    position: 'Tukang Batu',
    phone: '081234567890',
    profile: { name: 'Slamet' },
    bank_name: 'BCA',
    bank_account: '1122334455',
    bank_holder: 'Slamet',
  },
  {
    id: 'm2',
    org_id: VALID_ORG_ID,
    user_id: VALID_USER_2,
    role: 'worker',
    status: 'active',
    position: 'Helper',
    phone: '081298765432',
    profile: { name: 'Tarjo' },
    bank_name: 'BRI',
    bank_account: '5544332211',
    bank_holder: 'Tarjo',
  },
];

function makeAttendance(userId: string, days: number): AttendanceRecord[] {
  return Array.from({ length: days }, (_, idx) => {
    const day = String(idx + 1).padStart(2, '0');
    return {
      id: `att-${userId}-${day}`,
      user_id: userId,
      user_name: userId,
      org_id: VALID_ORG_ID,
      type: 'check_in',
      timestamp: `2026-11-${day}T08:00:00Z`,
    };
  });
}

describe('G8-1: Kebenaran Payroll, Tanpa Klaim Lunas Palsu, & Anti-Swallow Error Jurnal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Tanpa tarif cadangan tersembunyi (Rp 150.000) & kebijakan kerja konfigurabel', () => {
    it('menandai pekerja tanpa tarif sebagai missing_rate, requiresRateQuestion=true, baseRate=0 (bukan 150000)', () => {
      const result = analyzeFieldPayroll({
        budget: baseBudget,
        members: baseMembers,
        attendanceRecords: [
          ...makeAttendance(VALID_USER_1, 5),
          ...makeAttendance(VALID_USER_2, 5),
        ],
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 175_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
          // m2 (Tarjo) tidak punya kompensasi / daily_rate = 0
          {
            id: 'c2',
            org_id: VALID_ORG_ID,
            member_id: 'm2',
            user_id: VALID_USER_2,
            salary_type: 'daily',
            daily_rate: 0,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: [],
      });

      const slamet = result.calculations.find((c) => c.userId === VALID_USER_1)!;
      const tarjo = result.calculations.find((c) => c.userId === VALID_USER_2)!;

      expect(slamet.rateStatus).toBe('configured');
      expect(slamet.requiresRateQuestion).toBe(false);
      expect(slamet.baseRate).toBe(175_000);
      expect(slamet.grossSalary).toBe(875_000);

      expect(tarjo.rateStatus).toBe('missing_rate');
      expect(tarjo.requiresRateQuestion).toBe(true);
      expect(tarjo.baseRate).toBe(0);
      expect(tarjo.grossSalary).toBe(0);
      expect(tarjo.netSalary).toBe(0);

      expect(result.summary.missingRateCount).toBe(1);
      expect(result.summary.missingRateQuestions.length).toBe(1);
      expect(result.summary.missingRateQuestions[0]).toContain('Tarjo');
      expect(result.summary.isReadyForDisbursement).toBe(false);
      expect(result.summary.aiObservations.some((o) => o.includes('Tarjo'))).toBe(true);
    });

    it('menghitung lembur dan pembagi bulanan dari laborPolicy yang dapat dikonfigurasi (bukan angka keras)', () => {
      const comps: MemberCompensation[] = [
        {
          id: 'c1',
          org_id: VALID_ORG_ID,
          member_id: 'm1',
          user_id: VALID_USER_1,
          salary_type: 'monthly',
          daily_rate: 0,
          monthly_salary: 4_000_000,
          currency: 'IDR',
        },
      ];

      const result = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 22),
        compensationList: comps,
        bonRequests: [],
        laborPolicy: {
          standardWorkDaysPerMonth: 20, // daily = 4jt / 20 = 200rb
          overtimeThresholdDays: 20, // 22 - 20 = 2 hari lembur
          overtimeMultiplier: 2, // 2 * 200rb * 2 = 800rb
        },
      });

      const slamet = result.calculations[0];
      expect(slamet.grossSalary).toBe(4_000_000);
      expect(slamet.overtimeBonus).toBe(800_000);
      expect(slamet.netSalary).toBe(4_800_000);
    });
  });

  describe('2. Kasbon melebihi gaji kotor tidak disembunyikan oleh Math.max(0, ...)', () => {
    it('mencatat remainingKasbonBalance & kasbonShortfall akurat dengan applied + remaining === totalKasbon', () => {
      const bons: BonRequest[] = [
        {
          id: 'b1',
          org_id: VALID_ORG_ID,
          user_id: VALID_USER_1,
          amount: 1_200_000,
          status: 'approved',
        },
      ];

      const result = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 4), // 4 * 200.000 = 800.000
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 200_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: bons,
      });

      const slamet = result.calculations[0];
      expect(slamet.grossSalary).toBe(800_000);
      expect(slamet.totalKasbon).toBe(1_200_000);
      expect(slamet.appliedKasbonDeduction).toBe(800_000);
      expect(slamet.remainingKasbonBalance).toBe(400_000);
      expect(slamet.kasbonShortfall).toBe(400_000);
      expect(slamet.netSalary).toBe(0);
      expect(slamet.appliedKasbonDeduction + slamet.remainingKasbonBalance).toBe(slamet.totalKasbon);
      expect(result.summary.totalRemainingKasbon).toBe(400_000);
      expect(result.summary.totalKasbonShortfall).toBe(400_000);
    });

    it('menghormati batas maxKasbonDeductionPct dari laborPolicy dan menjaga sisa utang kasbon', () => {
      const result = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 5), // 5 * 200.000 = 1.000.000
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 200_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: [
          { id: 'b1', org_id: VALID_ORG_ID, user_id: VALID_USER_1, amount: 700_000, status: 'approved' },
        ],
        laborPolicy: { maxKasbonDeductionPct: 50 }, // max 500.000 dipotong
      });

      const slamet = result.calculations[0];
      expect(slamet.appliedKasbonDeduction).toBe(500_000);
      expect(slamet.remainingKasbonBalance).toBe(200_000);
      expect(slamet.kasbonShortfall).toBe(0);
      expect(slamet.netSalary).toBe(500_000);
      expect(slamet.appliedKasbonDeduction + slamet.remainingKasbonBalance).toBe(700_000);
    });
  });

  describe('3. Tanpa konfirmasi nyata, dilarang keras status paid / LUNAS & BERHASIL DITRANSFER', () => {
    it('executeMayarDisbursementBatch tanpa paymentConfirmation mengembalikan awaiting_payment_confirmation & slip WA menunggu konfirmasi', async () => {
      const analysis = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 5),
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 200_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: [],
      });

      const batch = await executeMayarDisbursementBatch({
        orgId: VALID_ORG_ID,
        budget: baseBudget,
        items: analysis.calculations,
        actorId: 'agent-hrd',
        skipDbSync: true,
      });

      expect(batch.status).toBe('awaiting_payment_confirmation');
      expect(batch.paymentConfirmed).toBe(false);
      expect(batch.items[0].status).toBe('awaiting_payment_confirmation');
      expect(batch.items[0].paymentConfirmed).toBe(false);
      expect(batch.items[0].paidAt).toBeUndefined();

      const slip = formatWhatsAppSlip(batch.items[0], baseBudget.periodLabel);
      expect(slip).toContain('Status: *MENUNGGU KONFIRMASI PEMBAYARAN*');
      expect(slip).not.toContain('LUNAS & BERHASIL DITRANSFER');
      expect(slip).not.toContain('LUNAS (TERKONFIRMASI)');
    });
  });

  describe('4. Konfirmasi pembayaran nyata + UUID valid + SoD + posting jurnal baru menghasilkan status paid', () => {
    it('menolak konfirmasi manual bila confirmedBy === preparedBy (pelanggaran SoD)', async () => {
      const analysis = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 5),
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 200_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: [],
      });

      await expect(
        executeMayarDisbursementBatch({
          orgId: VALID_ORG_ID,
          budget: baseBudget,
          items: analysis.calculations,
          actorId: 'staff-1',
          preparedBy: 'staff-1',
          skipDbSync: true,
          paymentConfirmation: {
            kind: 'manual_owner_confirmation',
            confirmedBy: 'staff-1',
            confirmedAt: '2026-11-24T15:00:00Z',
            paymentMethod: 'bank_transfer',
          },
        }),
      ).rejects.toThrow(/self_approval_forbidden|confirmedBy !== preparedBy/i);
    });

    it('menolak payrollEntryId non-UUID seperti batchRef_userId', async () => {
      const analysis = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 5),
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 200_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: [],
      });

      const itemsWithBadId = analysis.calculations.map((it) => ({
        ...it,
        payrollEntryId: `MYR-PAY-123_${it.userId}`,
      }));

      await expect(
        confirmPayrollDisbursementBatch({
          orgId: VALID_ORG_ID,
          budget: baseBudget,
          items: itemsWithBadId,
          actorId: 'owner-1',
          preparedBy: 'agent-hrd',
          skipDbSync: true,
          paymentConfirmation: {
            kind: 'manual_owner_confirmation',
            confirmedBy: 'owner-1',
            confirmedAt: '2026-11-24T15:00:00Z',
            paymentMethod: 'bank_transfer',
          },
        }),
      ).rejects.toThrow(/UUID/i);
    });

    it('manual_owner_confirmation dengan SoD valid + UUID DB + jurnal sukses -> status paid & slip LUNAS (TERKONFIRMASI)', async () => {
      mockPostPayrollJournal.mockResolvedValue({
        journalId: '66666666-6666-4666-8666-666666666666',
        allocation: { lines: [] },
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'planner_payroll_entries') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: VALID_ENTRY_UUID },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'planner_bon_requests') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const analysis = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 5),
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 200_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: [],
      });

      const result = await executeMayarDisbursementBatch({
        orgId: VALID_ORG_ID,
        budget: baseBudget,
        items: analysis.calculations,
        actorId: 'owner-1',
        preparedBy: 'agent-hrd',
        paymentConfirmation: {
          kind: 'manual_owner_confirmation',
          confirmedBy: 'owner-1',
          confirmedAt: '2026-11-24T15:10:00Z',
          paymentMethod: 'bank_transfer',
          proofNote: 'Mutasi BCA 24/11',
        },
      });

      expect(result.status).toBe('paid');
      expect(result.paymentConfirmed).toBe(true);
      expect(result.items[0].status).toBe('paid');
      expect(result.items[0].paymentConfirmed).toBe(true);
      expect(result.items[0].payrollEntryId).toBe(VALID_ENTRY_UUID);
      expect(mockPostPayrollJournal).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: VALID_ORG_ID,
          payrollEntryId: VALID_ENTRY_UUID,
          netAmount: 1_000_000,
        }),
      );

      const slip = formatWhatsAppSlip(result.items[0], baseBudget.periodLabel);
      expect(slip).toContain('Status: *LUNAS (TERKONFIRMASI)*');
    });

    it('provider_webhook terverifikasi via pluggable PayrollPaymentProvider + jurnal valid -> status paid', async () => {
      mockPostPayrollJournal.mockResolvedValue({
        journalId: '77777777-7777-4777-8777-777777777777',
        allocation: { lines: [] },
      });

      const customProvider: PayrollPaymentProvider = {
        name: 'mayar_webhook_adapter',
        async createPayoutBatch() {
          return {
            providerName: 'mayar_webhook_adapter',
            externalBatchRef: 'MYR-BATCH-001',
            status: 'awaiting_payment_confirmation',
            createdAt: '2026-11-24T15:00:00Z',
          };
        },
        async verifyPaymentConfirmation({ confirmation }) {
          return {
            verified:
              confirmation.kind === 'provider_webhook' &&
              confirmation.externalReference === 'WH-VALID-99',
          };
        },
      };

      const analysis = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 3),
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 200_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: [],
      });

      const items = analysis.calculations.map((it) => ({
        ...it,
        payrollEntryId: VALID_ENTRY_UUID,
      }));

      const result = await executeMayarDisbursementBatch({
        orgId: VALID_ORG_ID,
        budget: baseBudget,
        items,
        actorId: 'agent-hrd',
        skipDbSync: true,
        paymentProvider: customProvider,
        paymentConfirmation: {
          kind: 'provider_webhook',
          providerName: 'mayar_webhook_adapter',
          externalReference: 'WH-VALID-99',
          verifiedAt: '2026-11-24T15:20:00Z',
        },
        deps: {
          postPayrollDisbursementJournal: mockPostPayrollJournal,
        },
      });

      expect(result.status).toBe('paid');
      expect(result.paymentConfirmed).toBe(true);
      expect(result.batchRef).toBe('MYR-BATCH-001');
      expect(result.items[0].status).toBe('paid');
      expect(mockPostPayrollJournal).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Kegagalan posting jurnal TIDAK pernah ditelan + memicu rollback kompensasi', () => {
    it('aiHrdPayrollService: gagal posting jurnal melempar PayrollJournalPostError berstatus journal_post_failed & rollback ke approved', async () => {
      mockPostPayrollJournal.mockRejectedValue(new Error('Ledger write timeout'));

      const updatePayloads: Array<Record<string, unknown>> = [];
      mockFrom.mockImplementation((table: string) => {
        if (table === 'planner_payroll_entries') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: VALID_ENTRY_UUID },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              updatePayloads.push(payload);
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              };
            }),
          };
        }
        return {};
      });

      const analysis = analyzeFieldPayroll({
        budget: baseBudget,
        members: [baseMembers[0]],
        attendanceRecords: makeAttendance(VALID_USER_1, 3),
        compensationList: [
          {
            id: 'c1',
            org_id: VALID_ORG_ID,
            member_id: 'm1',
            user_id: VALID_USER_1,
            salary_type: 'daily',
            daily_rate: 200_000,
            monthly_salary: 0,
            currency: 'IDR',
          },
        ],
        bonRequests: [],
      });

      let caught: unknown;
      try {
        await executeMayarDisbursementBatch({
          orgId: VALID_ORG_ID,
          budget: baseBudget,
          items: analysis.calculations,
          actorId: 'owner-1',
          preparedBy: 'agent-hrd',
          paymentConfirmation: {
            kind: 'manual_owner_confirmation',
            confirmedBy: 'owner-1',
            confirmedAt: '2026-11-24T15:30:00Z',
            paymentMethod: 'cash',
          },
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(PayrollJournalPostError);
      const errObj = caught as PayrollJournalPostError;
      expect(errObj.batch.status).toBe('journal_post_failed');
      expect(errObj.batch.paymentConfirmed).toBe(false);
      expect(errObj.batch.items[0].status).toBe('journal_post_failed');
      expect(errObj.batch.items[0].journalError).toContain('Ledger write timeout');
      expect(updatePayloads.some((p) => p.status === 'paid')).toBe(false);
      expect(
        updatePayloads.some(
          (p) => p.status === 'approved' && String(p.notes || '').includes('[JOURNAL_POST_FAILED]'),
        ),
      ).toBe(true);
    });

    it('payrollService.updatePayrollStatus: gagal posting jurnal melakukan rollback ke status sebelumnya dan melempar error', async () => {
      mockPostPayrollJournal.mockRejectedValue(new Error('Periode terkunci'));

      const updatePayloads: Array<Record<string, unknown>> = [];
      mockFrom.mockImplementation((table: string) => {
        if (table === 'planner_payroll_entries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: VALID_ENTRY_UUID,
                    org_id: VALID_ORG_ID,
                    user_id: VALID_USER_1,
                    period_month: '2026-11-01',
                    base_amount: 1_000_000,
                    bonus_amount: 0,
                    deduction_amount: 0,
                    net_amount: 1_000_000,
                    status: 'approved',
                    notes: 'Siap bayar',
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              updatePayloads.push(payload);
              return {
                eq: vi.fn().mockImplementation(() => ({
                  // Panggilan pertama pakai .select().single(), panggilan rollback langsung resolved
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: VALID_ENTRY_UUID,
                        org_id: VALID_ORG_ID,
                        user_id: VALID_USER_1,
                        period_month: '2026-11-01',
                        net_amount: 1_000_000,
                        status: 'paid',
                        profiles: { name: 'Slamet' },
                      },
                      error: null,
                    }),
                  }),
                  error: null,
                })),
              };
            }),
          };
        }
        return {};
      });

      await expect(
        updatePayrollStatus(VALID_ENTRY_UUID, 'paid', undefined, {
          orgId: VALID_ORG_ID,
          actorId: 'owner-1',
        }),
      ).rejects.toThrow(/Periode terkunci/);

      expect(updatePayloads[0].status).toBe('paid');
      expect(updatePayloads[1].status).toBe('approved');
      expect(updatePayloads[1].notes).toBe('Siap bayar');
      expect(mockRecordReversibleAction).not.toHaveBeenCalled();
    });

    it('payrollService.reviewBonRequest: gagal posting jurnal melakukan rollback ke status sebelumnya dan melempar error', async () => {
      mockPostBonJournal.mockRejectedValue(new Error('Akun kas tidak ditemukan'));

      const updatePayloads: Array<Record<string, unknown>> = [];
      mockFrom.mockImplementation((table: string) => {
        if (table === 'planner_bon_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: VALID_BON_UUID,
                    org_id: VALID_ORG_ID,
                    user_id: VALID_USER_1,
                    amount: 500_000,
                    status: 'approved',
                    reviewed_by: 'manager-1',
                    reviewed_at: '2026-11-20T10:00:00Z',
                    reject_reason: null,
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              updatePayloads.push(payload);
              return {
                eq: vi.fn().mockImplementation(() => ({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: VALID_BON_UUID,
                        org_id: VALID_ORG_ID,
                        user_id: VALID_USER_1,
                        amount: 500_000,
                        status: 'paid',
                        profiles: { name: 'Slamet' },
                      },
                      error: null,
                    }),
                  }),
                  error: null,
                })),
              };
            }),
          };
        }
        return {};
      });

      await expect(
        reviewBonRequest(VALID_BON_UUID, 'paid', 'owner-1', undefined, {
          orgId: VALID_ORG_ID,
          actorId: 'owner-1',
        }),
      ).rejects.toThrow(/Akun kas tidak ditemukan/);

      expect(updatePayloads[0].status).toBe('paid');
      expect(updatePayloads[1].status).toBe('approved');
      expect(updatePayloads[1].reviewed_by).toBe('manager-1');
      expect(mockRecordReversibleAction).not.toHaveBeenCalled();
    });
  });
});
