import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveAndDispatchCollectionDraft,
  buildCollectionMessageDraft,
  buildTenantProactiveReminders,
  PROACTIVE_REMINDER_TYPES,
  runMultiTenantCronBatch,
} from '../../../../../../packages/domain/src/reminderScheduler';

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

import {
  approveAndRecordCollectionDispatch,
  createCollectionDraft,
  runTenantReminderCron,
} from '../../../services/financeV2/proactiveAssistantService';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  'my-supabase-project/supabase/migrations/20261124160000_g2_proactive_reminders_audit.sql',
);

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

describe('G2-2: Mesin Pengingat Multitenant (Cron), Draf Penagihan, & Jejak Audit', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  describe('1. Idempotensi dedupeKey Cron & Cakupan 5 Jenis Pengingat Deterministik', () => {
    it('menghasilkan tepat 5 jenis pengingat deterministik dan mengabaikan item yang belum memenuhi syarat', () => {
      const asOfDate = '2026-11-24';
      const result = buildTenantProactiveReminders(
        'org-A',
        {
          payables: [
            {
              id: 'pay-due-3d',
              orgId: 'org-A',
              partyId: 'sup-1',
              partyName: 'TB Makmur',
              projectId: 'proj-a1',
              dueDate: '2026-11-27', // tepat 3 hari lagi -> picu warning
              outstandingAmount: 4_500_000,
            },
            {
              id: 'pay-safe-4d',
              orgId: 'org-A',
              partyId: 'sup-2',
              partyName: 'TB Aman',
              dueDate: '2026-11-28', // 4 hari lagi -> tidak picu
              outstandingAmount: 2_000_000,
            },
          ],
          receivables: [
            {
              id: 'rec-overdue',
              orgId: 'org-A',
              partyId: 'cli-1',
              partyName: 'Bu Ana',
              projectId: 'proj-a1',
              invoiceNumber: 'INV-A-001',
              dueDate: '2026-11-10', // lewat 14 hari -> picu
              outstandingAmount: 15_000_000,
            },
            {
              id: 'rec-current',
              orgId: 'org-A',
              partyId: 'cli-2',
              partyName: 'Pak Budi',
              dueDate: '2026-11-24', // hari ini (0 hari overdue) -> tidak picu
              outstandingAmount: 5_000_000,
            },
          ],
          termins: [
            {
              id: 'term-ready',
              orgId: 'org-A',
              projectId: 'proj-a1',
              projectName: 'Ruko Melati',
              terminName: 'Termin 2 (50%)',
              targetProgressPct: 50,
              actualProgressPct: 55,
              terminAmount: 50_000_000,
              isBilled: false,
            },
            {
              id: 'term-already-billed',
              orgId: 'org-A',
              projectId: 'proj-a1',
              projectName: 'Ruko Melati',
              terminName: 'Termin 1 (30%)',
              targetProgressPct: 30,
              actualProgressPct: 55,
              terminAmount: 30_000_000,
              isBilled: true,
            },
          ],
          expenses: [
            {
              id: 'exp-no-receipt',
              orgId: 'org-A',
              projectId: 'proj-a1',
              description: 'Pembelian besi beton 20 batang',
              entryDate: '2026-11-23',
              amount: 2_400_000,
              hasAttachment: false,
            },
            {
              id: 'exp-small',
              orgId: 'org-A',
              description: 'Parkir & materai',
              entryDate: '2026-11-23',
              amount: 120_000, // di bawah ambang default Rp 500.000
              hasAttachment: false,
            },
            {
              id: 'exp-has-receipt',
              orgId: 'org-A',
              description: 'Semen 50 sak',
              entryDate: '2026-11-23',
              amount: 3_250_000,
              hasAttachment: true,
            },
          ],
          journalLines: [
            {
              id: 'jl-review',
              orgId: 'org-A',
              journalEntryId: 'je-99',
              projectId: 'proj-a1',
              entryDate: '2026-11-22',
              description: 'Biaya lapangan tanpa klasifikasi RAP',
              amount: 1_750_000,
              needsReview: true,
              reason: 'hpp_uncategorized',
            },
            {
              id: 'jl-clean',
              orgId: 'org-A',
              journalEntryId: 'je-100',
              entryDate: '2026-11-22',
              description: 'Biaya material terklasifikasi',
              amount: 1_000_000,
              needsReview: false,
            },
          ],
        },
        asOfDate,
      );

      expect(result.crossTenantRejectedCount).toBe(0);
      expect(result.reminders).toHaveLength(5);
      expect(result.reminders.map((r) => r.reminderType)).toEqual([...PROACTIVE_REMINDER_TYPES]);
      expect(result.countsByType).toEqual({
        payable_due: 1,
        receivable_overdue: 1,
        termin_ready_to_bill: 1,
        missing_receipt_attachment: 1,
        journal_needs_review: 1,
      });

      // Verifikasi idempotensi dedupeKey pada tanggal sama vs tanggal berbeda
      const rerunSameDay = buildTenantProactiveReminders(
        'org-A',
        {
          payables: [
            {
              id: 'pay-due-3d',
              orgId: 'org-A',
              partyName: 'TB Makmur',
              dueDate: '2026-11-27',
              outstandingAmount: 4_500_000,
            },
          ],
        },
        asOfDate,
      );
      expect(rerunSameDay.reminders[0].dedupeKey).toBe(result.reminders[0].dedupeKey);
      expect(rerunSameDay.reminders[0].dedupeKey).toBe('org-A:payable_due:pay-due-3d:2026-11-24');

      const nextDay = buildTenantProactiveReminders(
        'org-A',
        {
          payables: [
            {
              id: 'pay-due-3d',
              orgId: 'org-A',
              partyName: 'TB Makmur',
              dueDate: '2026-11-27',
              outstandingAmount: 4_500_000,
            },
          ],
        },
        '2026-11-25',
      );
      expect(nextDay.reminders[0].dedupeKey).toBe('org-A:payable_due:pay-due-3d:2026-11-25');
      expect(nextDay.reminders[0].dedupeKey).not.toBe(result.reminders[0].dedupeKey);
    });
  });

  describe('2. Uji Isolasi Multi-Tenant (Zero Cross-Tenant Leakage)', () => {
    it('menolak seluruh item milik org-B yang disuntikkan ke input org-A dan menjamin hasil batch terisolasi penuh', () => {
      const asOfDate = '2026-11-24';

      const batch = runMultiTenantCronBatch(
        [
          {
            orgId: 'org-A',
            input: {
              payables: [
                {
                  id: 'pay-A-1',
                  orgId: 'org-A',
                  partyName: 'Supplier A',
                  dueDate: '2026-11-25',
                  outstandingAmount: 3_000_000,
                },
                {
                  id: 'pay-B-LEAK',
                  orgId: 'org-B', // disuntikkan ke org-A
                  partyName: 'Supplier B Rahasia',
                  dueDate: '2026-11-24',
                  outstandingAmount: 99_000_000,
                },
              ],
              receivables: [
                {
                  id: 'rec-B-LEAK',
                  orgId: 'org-B', // disuntikkan ke org-A
                  partyName: 'Klien B Rahasia',
                  dueDate: '2026-10-01',
                  outstandingAmount: 50_000_000,
                },
              ],
              termins: [
                {
                  id: 'term-B-LEAK',
                  orgId: 'org-B', // disuntikkan ke org-A
                  projectId: 'proj-B',
                  projectName: 'Proyek Rahasia B',
                  terminName: 'Termin B',
                  targetProgressPct: 50,
                  actualProgressPct: 80,
                  terminAmount: 75_000_000,
                  isBilled: false,
                },
              ],
              expenses: [
                {
                  id: 'exp-B-LEAK',
                  orgId: 'org-B', // disuntikkan ke org-A
                  description: 'Biaya Rahasia B',
                  entryDate: '2026-11-20',
                  amount: 10_000_000,
                  hasAttachment: false,
                },
              ],
              journalLines: [
                {
                  id: 'jl-B-LEAK',
                  orgId: 'org-B', // disuntikkan ke org-A
                  entryDate: '2026-11-20',
                  description: 'Jurnal Rahasia B',
                  amount: 8_000_000,
                  needsReview: true,
                },
              ],
            },
          },
          {
            orgId: 'org-B',
            input: {
              receivables: [
                {
                  id: 'rec-B-OWNED',
                  orgId: 'org-B',
                  partyName: 'Klien Resmi B',
                  invoiceNumber: 'INV-B-10',
                  dueDate: '2026-11-01',
                  outstandingAmount: 22_000_000,
                },
              ],
              payables: [
                {
                  id: 'pay-A-LEAK-TO-B',
                  orgId: 'org-A', // disuntikkan ke org-B
                  partyName: 'Supplier A Rahasia',
                  dueDate: '2026-11-24',
                  outstandingAmount: 12_000_000,
                },
              ],
            },
          },
        ],
        asOfDate,
      );

      const resA = batch.resultsByOrg['org-A'];
      const resB = batch.resultsByOrg['org-B'];

      expect(resA.crossTenantRejectedCount).toBe(5);
      expect(resA.reminders).toHaveLength(1);
      expect(resA.reminders[0].entityId).toBe('pay-A-1');
      expect(resA.reminders.every((r) => r.orgId === 'org-A')).toBe(true);
      expect(JSON.stringify(resA.reminders)).not.toContain('org-B');
      expect(JSON.stringify(resA.reminders)).not.toContain('LEAK');
      expect(JSON.stringify(resA.reminders)).not.toContain('Rahasia');

      expect(resB.crossTenantRejectedCount).toBe(1);
      expect(resB.reminders).toHaveLength(1);
      expect(resB.reminders[0].entityId).toBe('rec-B-OWNED');
      expect(resB.reminders.every((r) => r.orgId === 'org-B')).toBe(true);
      expect(JSON.stringify(resB.reminders)).not.toContain('org-A');
      expect(JSON.stringify(resB.reminders)).not.toContain('pay-A-LEAK-TO-B');

      expect(batch.totalCrossTenantRejected).toBe(6);
      expect(batch.totalRemindersGenerated).toBe(2);
    });
  });

  describe('3. Aturan L0/L1, Pemisahan Wewenang (SoD), Isolasi Tenant, & Wajib Jejak Audit', () => {
    it('draf WA dan Email pada L0 & L1 selalu pending_approval dan autoSendAllowed === false dengan nominal deterministik', () => {
      const waDraft = buildCollectionMessageDraft({
        orgId: 'org-A',
        partyId: 'party-ana',
        partyName: 'Bu Ana',
        channel: 'whatsapp',
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-2026-01',
            dueDate: '2026-11-10',
            outstandingAmount: 12_500_000.4,
            daysOverdue: 14,
            projectName: 'Ruko Melati',
          },
          {
            id: 'inv-2',
            invoiceNumber: 'INV-2026-02',
            dueDate: '2026-11-18',
            outstandingAmount: 7_500_000,
            daysOverdue: 6,
          },
        ],
        riskBand: 'high',
        autonomyLevel: 'L1',
        createdBy: 'user-staff-1',
      });

      expect(waDraft.status).toBe('pending_approval');
      expect(waDraft.autoSendAllowed).toBe(false);
      expect(waDraft.requiresHumanApproval).toBe(true);
      expect(waDraft.totalAmountRupiah).toBe(20_000_000);
      expect(waDraft.body).toContain('INV-2026-01');
      expect(waDraft.body).toContain('Rp 12.500.000');
      expect(waDraft.body).toContain('Rp 20.000.000');
      expect(waDraft.provenance.invoiceNumbers).toEqual(['INV-2026-01', 'INV-2026-02']);
      expect(waDraft.provenance.totalAmountRupiah).toBe(20_000_000);

      const emailDraftL0 = buildCollectionMessageDraft({
        orgId: 'org-A',
        partyId: 'party-ana',
        partyName: 'Bu Ana',
        channel: 'email',
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-2026-01',
            dueDate: '2026-11-10',
            outstandingAmount: 12_500_000,
          },
        ],
        riskBand: 'low',
        autonomyLevel: 'L0',
        createdBy: 'user-staff-1',
      });

      expect(emailDraftL0.status).toBe('pending_approval');
      expect(emailDraftL0.autoSendAllowed).toBe(false);
      expect(emailDraftL0.subject).toContain('Rp 12.500.000');
    });

    it('menolak pengiriman tanpa auditLogId, menolak self-approval, menolak lintas tenant, dan mengizinkan persetujuan manager berbeda + auditLogId', () => {
      const draft = buildCollectionMessageDraft({
        id: 'draft-1',
        orgId: 'org-A',
        partyId: 'party-ana',
        partyName: 'Bu Ana',
        channel: 'whatsapp',
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-001',
            dueDate: '2026-11-01',
            outstandingAmount: 10_000_000,
          },
        ],
        riskBand: 'medium',
        autonomyLevel: 'L1',
        createdBy: 'user-creator',
      });

      // (a) Tolak tanpa auditLogId
      const noAudit = approveAndDispatchCollectionDraft(draft, {
        orgId: 'org-A',
        approvedBy: 'user-manager',
        approvedAt: '2026-11-24T10:00:00Z',
        auditLogId: '   ',
      });
      expect(noAudit).toMatchObject({ ok: false, code: 'audit_trail_required' });

      // (b) Tolak self-approval (approvedBy === createdBy)
      const selfApprove = approveAndDispatchCollectionDraft(draft, {
        orgId: 'org-A',
        approvedBy: 'user-creator',
        approvedAt: '2026-11-24T10:00:00Z',
        auditLogId: 'audit-1',
      });
      expect(selfApprove).toMatchObject({ ok: false, code: 'self_approval_forbidden' });

      // (c) Tolak persetujuan lintas tenant
      const crossTenant = approveAndDispatchCollectionDraft(draft, {
        orgId: 'org-B',
        approvedBy: 'user-manager-B',
        approvedAt: '2026-11-24T10:00:00Z',
        auditLogId: 'audit-1',
      });
      expect(crossTenant).toMatchObject({ ok: false, code: 'cross_tenant_forbidden' });

      // (d) Persetujuan sah oleh manager berbeda + auditLogId -> dispatched
      const valid = approveAndDispatchCollectionDraft(draft, {
        orgId: 'org-A',
        approvedBy: 'user-manager',
        approvedAt: '2026-11-24T10:05:00Z',
        auditLogId: 'audit-log-uuid-123',
      });
      expect(valid.ok).toBe(true);
      if (valid.ok) {
        expect(valid.draft.status).toBe('dispatched');
        expect(valid.draft.approvedBy).toBe('user-manager');
        expect(valid.draft.auditLogId).toBe('audit-log-uuid-123');
        expect(valid.draft.dispatchedAt).toBe('2026-11-24T10:05:00Z');
      }
    });
  });

  describe('4. Layanan proactiveAssistantService (Supabase Mock)', () => {
    it('runTenantReminderCron melakukan deduplikasi dedupe_key per organisasi & mencatat audit log cron', async () => {
      const insertRemindersSpy = vi.fn().mockImplementation((rows: Record<string, unknown>[]) => ({
        select: () =>
          Promise.resolve({
            data: rows.map((r, i) => ({
              ...r,
              id: `rem-${i + 1}`,
              created_at: '2026-11-24T09:00:00Z',
            })),
            error: null,
          }),
      }));

      const insertAuditSpy = vi.fn().mockImplementation((row: Record<string, unknown>) => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                ...row,
                id: 'audit-cron-1',
                created_at: '2026-11-24T09:00:01Z',
              },
              error: null,
            }),
        }),
      }));

      fromMock.mockImplementation((table: string) => {
        if (table === 'planner_finance_reminders') {
          return {
            select: () => ({
              eq: () => ({
                in: () =>
                  Promise.resolve({
                    data: [{ dedupe_key: 'org-A:payable_due:pay-1:2026-11-24' }],
                    error: null,
                  }),
              }),
            }),
            insert: insertRemindersSpy,
          };
        }
        if (table === 'planner_proactive_audit_logs') {
          return { insert: insertAuditSpy };
        }
        throw new Error(`Unexpected table: ${table}`);
      });

      const res = await runTenantReminderCron({
        orgId: 'org-A',
        asOfDate: '2026-11-24',
        input: {
          payables: [
            {
              id: 'pay-1',
              orgId: 'org-A',
              partyName: 'TB Sudah Ada',
              dueDate: '2026-11-25',
              outstandingAmount: 1_000_000,
            },
            {
              id: 'pay-2',
              orgId: 'org-A',
              partyName: 'TB Baru',
              dueDate: '2026-11-26',
              outstandingAmount: 2_500_000,
            },
            {
              id: 'pay-B-foreign',
              orgId: 'org-B',
              partyName: 'TB Tenant B',
              dueDate: '2026-11-24',
              outstandingAmount: 9_000_000,
            },
          ],
        },
      });

      expect(res.schedulerResult.crossTenantRejectedCount).toBe(1);
      expect(res.skippedDedupeKeys).toEqual(['org-A:payable_due:pay-1:2026-11-24']);
      expect(res.insertedReminders).toHaveLength(1);
      expect(res.insertedReminders[0].entity_id).toBe('pay-2');
      expect(res.auditLog?.action).toBe('run_tenant_reminder_cron');
      expect(insertAuditSpy).toHaveBeenCalledTimes(1);
    });

    it('createCollectionDraft dan approveAndRecordCollectionDispatch menegakkan L1, SoD, lintas tenant, & audit_trail_required', async () => {
      const insertDraftSpy = vi.fn().mockImplementation((row: Record<string, unknown>) => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                ...row,
                id: 'draft-uuid-1',
                approved_by: null,
                audit_log_id: null,
                dispatched_at: null,
                created_at: '2026-11-24T09:10:00Z',
              },
              error: null,
            }),
        }),
      }));

      const insertAuditSpy = vi.fn().mockImplementation((row: Record<string, unknown>) => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: {
                ...row,
                id: 'audit-uuid-99',
                created_at: '2026-11-24T09:11:00Z',
              },
              error: null,
            }),
        }),
      }));

      const updateDraftSpy = vi.fn().mockImplementation((patch: Record<string, unknown>) => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'draft-uuid-1',
                    org_id: 'org-A',
                    party_id: 'party-ana',
                    channel: 'email',
                    subject: 'Pengingat Pembayaran Tagihan',
                    body: 'Halo...',
                    total_amount_rupiah: 15_000_000,
                    autonomy_level: 'L1',
                    provenance_json: {},
                    created_by: 'user-staff',
                    created_at: '2026-11-24T09:10:00Z',
                    ...patch,
                  },
                  error: null,
                }),
            }),
          }),
        }),
      }));

      fromMock.mockImplementation((table: string) => {
        if (table === 'planner_collection_drafts') {
          return {
            insert: insertDraftSpy,
            update: updateDraftSpy,
          };
        }
        if (table === 'planner_proactive_audit_logs') {
          return { insert: insertAuditSpy };
        }
        throw new Error(`Unexpected table: ${table}`);
      });

      const created = await createCollectionDraft({
        orgId: 'org-A',
        partyId: 'party-ana',
        partyName: 'Bu Ana',
        channel: 'email',
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-A-01',
            dueDate: '2026-11-10',
            outstandingAmount: 15_000_000,
          },
        ],
        riskBand: 'high',
        autonomyLevel: 'L1',
        createdBy: 'user-staff',
      });

      expect(created.draft.status).toBe('pending_approval');
      expect(created.draft.autoSendAllowed).toBe(false);
      expect(created.auditLog.action).toBe('create_collection_draft');

      // Tolak self-approval sebelum update DB
      const selfAttempt = await approveAndRecordCollectionDispatch({
        orgId: 'org-A',
        draftId: 'draft-uuid-1',
        approvedBy: 'user-staff',
        approvedAt: '2026-11-24T09:12:00Z',
        draft: created.draft,
      });
      expect(selfAttempt).toMatchObject({ ok: false, code: 'self_approval_forbidden' });
      expect(updateDraftSpy).not.toHaveBeenCalled();

      // Tolak lintas tenant sebelum update DB
      const crossAttempt = await approveAndRecordCollectionDispatch({
        orgId: 'org-B',
        draftId: 'draft-uuid-1',
        approvedBy: 'user-manager-B',
        approvedAt: '2026-11-24T09:12:00Z',
        draft: created.draft,
      });
      expect(crossAttempt).toMatchObject({ ok: false, code: 'cross_tenant_forbidden' });
      expect(updateDraftSpy).not.toHaveBeenCalled();

      // Uji penolakan audit_trail_required saat audit log gagal mengembalikan ID
      insertAuditSpy.mockImplementationOnce(() => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: { id: '' },
              error: null,
            }),
        }),
      }));
      const missingAuditAttempt = await approveAndRecordCollectionDispatch({
        orgId: 'org-A',
        draftId: 'draft-uuid-1',
        approvedBy: 'user-manager-A',
        approvedAt: '2026-11-24T09:12:00Z',
        draft: created.draft,
      });
      expect(missingAuditAttempt).toMatchObject({ ok: false, code: 'audit_trail_required' });
      expect(updateDraftSpy).not.toHaveBeenCalled();

      // Persetujuan sah oleh manager berbeda -> audit log tercipta & status berubah menjadi dispatched
      const okDispatch = await approveAndRecordCollectionDispatch({
        orgId: 'org-A',
        draftId: 'draft-uuid-1',
        approvedBy: 'user-manager-A',
        approvedAt: '2026-11-24T09:15:00Z',
        draft: created.draft,
      });
      expect(okDispatch.ok).toBe(true);
      if (okDispatch.ok) {
        expect(okDispatch.draft.status).toBe('dispatched');
        expect(okDispatch.draft.approvedBy).toBe('user-manager-A');
        expect(okDispatch.draft.auditLogId).toBe('audit-uuid-99');
        expect(okDispatch.record.status).toBe('dispatched');
      }
      expect(updateDraftSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Uji Struktural SQL 20261124160000_g2_proactive_reminders_audit.sql', () => {
    it('berlabel BLOCKED remote, memiliki 3 tabel, CHECK SoD & audit_log_id, trigger append-only audit, RLS is_org_member, dan bebas mutasi jurnal', () => {
      const rawSql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(rawSql).toContain('BLOCKED remote');

      const sql = stripSqlComments(rawSql);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_finance_reminders/i);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_collection_drafts/i);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_proactive_audit_logs/i);

      // Dedupe pengingat per org
      expect(sql).toMatch(/UNIQUE\s*\(\s*org_id\s*,\s*dedupe_key\s*\)/i);

      // CHECK pemisahan wewenang (SoD) & wajib audit_log_id saat dispatched
      expect(sql).toMatch(/CHECK\s*\(\s*approved_by\s+IS\s+NULL\s+OR\s+approved_by\s*<>\s*created_by\s*\)/i);
      expect(sql).toMatch(
        /CHECK\s*\(\s*status\s*<>\s*'dispatched'\s+OR\s*\(\s*approved_by\s+IS\s+NOT\s+NULL\s+AND\s+audit_log_id\s+IS\s+NOT\s+NULL\s*\)\s*\)/i,
      );

      // Trigger append-only untuk audit log proaktif
      expect(sql).toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.planner_reject_proactive_audit_mutation/i);
      expect(sql).toMatch(
        /CREATE\s+TRIGGER\s+planner_proactive_audit_logs_no_mutation\s+BEFORE\s+UPDATE\s+OR\s+DELETE\s+ON\s+planner_proactive_audit_logs/i,
      );
      expect(sql).toMatch(/ERRCODE\s*=\s*'55000'/i);

      // RLS ketat is_org_member pada ketiga tabel
      expect(sql).toMatch(/ALTER\s+TABLE\s+planner_finance_reminders\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(/ALTER\s+TABLE\s+planner_collection_drafts\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(/ALTER\s+TABLE\s+planner_proactive_audit_logs\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(/is_org_member\s*\(\s*org_id\s*,\s*'worker'\s*\)/i);
      expect(sql).toMatch(/is_org_member\s*\(\s*org_id\s*,\s*'manager'\s*\)/i);

      // Tidak ada policy UPDATE atau DELETE pada planner_proactive_audit_logs
      expect(sql).not.toMatch(/CREATE\s+POLICY[\s\S]*?ON\s+planner_proactive_audit_logs\s+FOR\s+(?:UPDATE|DELETE|ALL)/i);

      // Bebas mutasi tabel jurnal
      expect(sql).not.toMatch(/\bUPDATE\s+(?:public\.)?planner_journal_(?:entries|lines|allocations)\b/i);
      expect(sql).not.toMatch(/\bDELETE\s+FROM\s+(?:public\.)?planner_journal_(?:entries|lines|allocations)\b/i);
    });
  });
});
