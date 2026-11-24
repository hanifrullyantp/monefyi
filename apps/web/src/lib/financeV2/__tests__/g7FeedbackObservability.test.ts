import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  aggregateFeedbackQueue,
  anonymizeFeedbackPayload,
  buildEvalCandidateFromFailedAgent,
  computeQualityDashboard,
  FEEDBACK_MODULES,
  FEEDBACK_SEVERITIES,
  FEEDBACK_SIGNAL_CATEGORIES,
  ingestFeedbackSignal,
  REDACTION_TAGS,
  type FeedbackQueueItem,
} from '../../../../../../packages/domain/src/feedbackObservability';
import {
  clearFeedbackObservabilityStoreForTests,
  getAggregatedFeedbackIssues,
  getEvalCandidates,
  getFeedbackQueue,
  reportAgentUnansweredOrToolFail,
  reportBehaviorFriction,
  reportDataInvariantFailure,
  reportRuntimeError,
  reportSilentCorrection,
  reportUserFeedback,
  setOrgBehaviorTelemetryOptOut,
} from '../../../services/feedbackObservabilityService';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../../../..', import.meta.url)));
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  'my-supabase-project/supabase/migrations/20261124193000_g7_unified_feedback_events.sql',
);

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

describe('G7: Sistem Umpan Balik Terpadu, Observabilitas, Anonimisasi PII, & Dasbor Mutu', () => {
  beforeEach(() => {
    clearFeedbackObservabilityStoreForTests();
  });

  describe('Gerbang 1 — Penggabungan 20 laporan serupa menjadi 1 issue & eskalasi prioritas', () => {
    it('menggabungkan 20 laporan serupa dari pelapor berbeda menjadi tepat 1 masalah dengan priorityScore naik', () => {
      const singleBaseline = ingestFeedbackSignal(
        {
          orgId: 'org-g7-1',
          reporterId: 'user-1',
          module: 'keuangan',
          category: 'runtime_error',
          severity: 'sedang',
          title: 'Gagal menyimpan jurnal realisasi proyek',
          errorOrScreenKey: 'financeV2/cost_realization_submit_timeout',
          appVersion: '2.7.0',
          createdAt: '2026-11-24T08:00:00Z',
        },
        { behaviorTelemetryOptOut: false },
      );

      expect(singleBaseline.accepted).toBe(true);
      const singleIssues = aggregateFeedbackQueue([singleBaseline.queueItem!]);
      expect(singleIssues).toHaveLength(1);
      expect(singleIssues[0].reporterCount).toBe(1);

      const twentyEvents: FeedbackQueueItem[] = [];
      for (let i = 1; i <= 20; i += 1) {
        const res = ingestFeedbackSignal(
          {
            orgId: 'org-g7-1',
            reporterId: `user-${i}`,
            module: 'keuangan',
            category: 'runtime_error',
            severity: 'sedang',
            title: `Gagal menyimpan jurnal realisasi proyek #${i}`,
            errorOrScreenKey: 'financeV2/cost_realization_submit_timeout',
            appVersion: '2.7.0',
            createdAt: `2026-11-24T08:${String(i).padStart(2, '0')}:00Z`,
          },
          { behaviorTelemetryOptOut: false },
        );
        expect(res.accepted).toBe(true);
        twentyEvents.push(res.queueItem!);
      }

      const issues = aggregateFeedbackQueue(twentyEvents);
      expect(issues).toHaveLength(1);
      expect(issues[0].reporterCount).toBe(20);
      expect(issues[0].occurrenceCount).toBe(20);
      expect(issues[0].priorityScore).toBeGreaterThan(singleIssues[0].priorityScore);
      expect(issues[0].autoModifyCodeOrPromptAllowed).toBe(false);
    });

    it('mengurutkan prioritas secara deterministik kritis > sedang > ringan', () => {
      const kritis = ingestFeedbackSignal(
        {
          orgId: 'org-g7-1',
          reporterId: 'u1',
          module: 'keuangan',
          category: 'data_invariant_failure',
          severity: 'kritis',
          title: 'Neraca tidak seimbang',
          errorOrScreenKey: 'neraca_unbalanced',
        },
        { behaviorTelemetryOptOut: false },
      ).queueItem!;

      const sedang = ingestFeedbackSignal(
        {
          orgId: 'org-g7-1',
          reporterId: 'u2',
          module: 'proyek',
          category: 'user_bug_report',
          severity: 'sedang',
          title: 'Tombol simpan tidak merespons',
          errorOrScreenKey: 'proyek_save_btn',
        },
        { behaviorTelemetryOptOut: false },
      ).queueItem!;

      const ringan = ingestFeedbackSignal(
        {
          orgId: 'org-g7-1',
          reporterId: 'u3',
          module: 'ui',
          category: 'ui_confused',
          severity: 'ringan',
          title: 'Bingung arti istilah retensi',
          errorOrScreenKey: 'ui_retensi_tooltip',
        },
        { behaviorTelemetryOptOut: false },
      ).queueItem!;

      const ranked = aggregateFeedbackQueue([ringan, sedang, kritis]);
      expect(ranked.map((i) => i.severity)).toEqual(['kritis', 'sedang', 'ringan']);
      expect(ranked[0].priorityScore).toBeGreaterThan(ranked[1].priorityScore);
      expect(ranked[1].priorityScore).toBeGreaterThan(ranked[2].priorityScore);
    });
  });

  describe('Gerbang 2 — Anonimisasi PII & Rahasia Ketat (0 data sensitif mentah lolos ke antrean)', () => {
    it('menyensor email, HP 0812/+628, NIK 16 digit, rekening bank, Bearer eyJ..., sk-live-..., & password di nested object', () => {
      const sensitiveStrings = [
        'budi.santoso@konstruksi.co.id',
        'finance@ptmaju.id',
        '081234567890',
        '+6281399887766',
        '0811-2233-4455',
        '3275011203900001',
        '3174056501880002',
        '1234567890123',
        '8877665544',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSJ9.sigXYZ123',
        'sk-live-supersecret99887766',
        'sb_secret_topsecret_123456',
        'SangatRahasia99!',
        'session_cookie_rahasia_8899',
        'secret_api_key_abc999',
      ];

      const ingested = ingestFeedbackSignal(
        {
          orgId: 'org-g7-pii',
          reporterId: 'budi.santoso@konstruksi.co.id',
          module: 'agent',
          category: 'user_bug_report',
          title: `Error transfer ke budi.santoso@konstruksi.co.id HP 081234567890 NIK 3275011203900001`,
          errorOrScreenKey: 'transfer_failed_081234567890',
          deviceInfo: 'Android 14 / WA +6281399887766',
          context: {
            email: 'finance@ptmaju.id',
            phone: '0811-2233-4455',
            nik: '3174056501880002',
            bankAccount: {
              bank: 'BCA',
              number: '8877665544',
            },
            rekeningTeks: 'Transfer ke BCA 1234567890123 gagal',
            authorization:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSJ9.sigXYZ123',
            token: 'sk-live-supersecret99887766',
            apiKey: 'secret_api_key_abc999',
            password: 'SangatRahasia99!',
            cookie: 'session_cookie_rahasia_8899',
            deepNested: {
              logs: [
                'GET /api?apikey=secret_api_key_abc999&password=SangatRahasia99!',
                'Supabase key sb_secret_topsecret_123456 ditolak',
              ],
            },
          },
        },
        { behaviorTelemetryOptOut: false },
      );

      expect(ingested.accepted).toBe(true);
      const serialized = JSON.stringify(ingested.queueItem);

      for (const secretOrPii of sensitiveStrings) {
        expect(serialized).not.toContain(secretOrPii);
      }

      expect(serialized).toContain(REDACTION_TAGS.EMAIL);
      expect(serialized).toContain(REDACTION_TAGS.PHONE);
      expect(serialized).toContain(REDACTION_TAGS.NIK);
      expect(serialized).toContain(REDACTION_TAGS.BANK_ACCOUNT);
      expect(serialized).toContain(REDACTION_TAGS.SECRET);
    });

    it('menjaga UUID dan tanggal ISO tidak rusak saat anonymizeFeedbackPayload dijalankan', () => {
      const payload = {
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        occurredAt: '2026-11-24T15:09:07Z',
        amountRupiah: 2500000,
      };
      const sanitized = anonymizeFeedbackPayload(payload);
      expect(sanitized.projectId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(sanitized.occurredAt).toBe('2026-11-24T15:09:07Z');
      expect(sanitized.amountRupiah).toBe(2500000);
    });
  });

  describe('Gerbang 3 — Cakupan End-to-End Seluruh 8 Kategori Sinyal Lintas Aplikasi', () => {
    it('memverifikasi seluruh 8 kategori sinyal masuk ke layanan klien, teranonimisasi, dan teragregasi', async () => {
      const persistedRows: FeedbackQueueItem[] = [];
      const adapter = {
        insertFeedbackEvent: async (item: FeedbackQueueItem) => {
          persistedRows.push(item);
          return { error: null };
        },
      };

      const orgId = 'org-g7-8signals';

      // 1. user_bug_report
      const r1 = await reportUserFeedback({
        orgId,
        reporterId: 'u1',
        module: 'proyek',
        category: 'user_bug_report',
        title: 'Tombol simpan RAB gagal di layar Proyek',
        screenKey: 'project_rab_editor',
        adapter,
      });

      // 2. agent_rating (👎 + alasan singkat -> sekaligus membentuk kandidat eval)
      const r2 = await reportUserFeedback({
        orgId,
        reporterId: 'u2',
        module: 'agent',
        category: 'agent_rating',
        rating: 'down',
        reason: 'Salah memilih akun material vs upah',
        title: 'Rating buruk pada jawaban pencatatan biaya',
        model: 'tier-small-flash-lite',
        promptVersion: 'v3.2',
        adapter,
        evalCandidateInput: {
          intent: 'catat_biaya_proyek',
          userPrompt: 'Bayar tukang proyek 500rb via 081234567890',
          agentResponse: 'Masuk material 500rb',
          failureReason: 'Salah kategori HPP',
        },
      });

      // 3. ui_confused
      const r3 = await reportUserFeedback({
        orgId,
        reporterId: 'u3',
        module: 'ui',
        category: 'ui_confused',
        title: 'Saya bingung cara mencatat termin retensi',
        screenKey: 'finance_v2_income_modal',
        adapter,
      });

      // 4. runtime_error (pengganti console.error diam-diam)
      const r4 = await reportRuntimeError({
        orgId,
        reporterId: 'u4',
        module: 'keuangan',
        operation: 'postCostJournal',
        screenKey: 'cost_form',
        error: new Error('Query timeout dengan token Bearer eyJabc.def.ghi'),
        durationMs: 4200,
        slowQueryThresholdMs: 1500,
        adapter,
      });

      // 5. behavior_friction
      const r5 = await reportBehaviorFriction({
        orgId,
        reporterId: 'u5',
        module: 'sdm',
        frictionType: 'rage_click',
        screenKey: 'payroll_confirm_button',
        adapter,
      });

      // 6. silent_correction
      const r6 = await reportSilentCorrection({
        orgId,
        reporterId: 'u6',
        module: 'keuangan',
        correctionType: 'needs_choice_rejected',
        intent: 'catat_biaya_proyek',
        context: { userAction: 'bukan ini' },
        adapter,
      });

      // 7. data_invariant_failure
      const r7 = await reportDataInvariantFailure({
        orgId,
        reporterId: 'system',
        module: 'keuangan',
        invariantName: 'trial_balance_debit_equals_credit',
        context: { diffRupiah: 1000 },
        adapter,
      });

      // 8. agent_unanswered_or_tool_fail
      const r8 = await reportAgentUnansweredOrToolFail({
        orgId,
        reporterId: 'u8',
        module: 'agent',
        intent: 'get_advisor_brief',
        toolName: 'get_advisor_brief',
        userPrompt: 'Berapa runway kas proyek jika klien budi@pt.id telat bayar?',
        failureReason: 'Tool timeout setelah 3000ms',
        actualToolCalls: ['get_advisor_brief'],
        model: 'tier-small-haiku-mini',
        promptVersion: 'v3.2',
        adapter,
      });

      const results = [r1, r2, r3, r4, r5, r6, r7, r8];
      for (const res of results) {
        expect(res.accepted).toBe(true);
        expect(res.persisted).toBe(true);
        expect(res.autoModifyCodeOrPromptAllowed).toBe(false);
      }

      const queued = getFeedbackQueue(orgId);
      expect(queued).toHaveLength(8);
      expect(persistedRows).toHaveLength(8);

      const seenCategories = new Set(queued.map((q) => q.category));
      expect(seenCategories.size).toBe(FEEDBACK_SIGNAL_CATEGORIES.length);
      for (const cat of FEEDBACK_SIGNAL_CATEGORIES) {
        expect(seenCategories.has(cat)).toBe(true);
      }

      const issues = getAggregatedFeedbackIssues(orgId);
      expect(issues).toHaveLength(8);
      expect(issues[0].category).toBe('data_invariant_failure');

      const queueJson = JSON.stringify(queued);
      expect(queueJson).not.toContain('081234567890');
      expect(queueJson).not.toContain('eyJabc.def.ghi');
      expect(queueJson).not.toContain('budi@pt.id');
    });
  });

  describe('Gerbang 4 — Opt-Out Perilaku, Eval Review Gate, Dasbor Mutu L2->L1, & Migrasi SQL', () => {
    it('menolak behavior_friction saat behaviorTelemetryOptOut=true sambil tetap menerima user_bug_report & runtime_error', async () => {
      const orgId = 'org-opt-out';
      setOrgBehaviorTelemetryOptOut(orgId, true);

      const frictionRes = await reportBehaviorFriction({
        orgId,
        reporterId: 'u1',
        module: 'ui',
        frictionType: 'screen_bounce',
        screenKey: 'dashboard',
      });
      expect(frictionRes.accepted).toBe(false);
      expect(frictionRes.reason).toBe('behavior_telemetry_opted_out');
      expect(frictionRes.queueItem).toBeNull();
      expect(frictionRes.autoModifyCodeOrPromptAllowed).toBe(false);

      const bugRes = await reportUserFeedback({
        orgId,
        reporterId: 'u1',
        module: 'ui',
        category: 'user_bug_report',
        title: 'Tombol cetak PDF tidak muncul',
      });
      expect(bugRes.accepted).toBe(true);
      expect(bugRes.queueItem?.autoModifyCodeOrPromptAllowed).toBe(false);

      const errRes = await reportRuntimeError({
        orgId,
        reporterId: 'u1',
        module: 'keuangan',
        operation: 'loadLedger',
        error: new Error('Network 500'),
      });
      expect(errRes.accepted).toBe(true);
      expect(getFeedbackQueue(orgId)).toHaveLength(2);
    });

    it('menghasilkan EvalCaseCandidate teranonimisasi berstatus WAJIB pending_human_review', async () => {
      const cand = buildEvalCandidateFromFailedAgent({
        orgId: 'org-eval',
        module: 'agent',
        category: 'agent_rating',
        intent: 'catat_biaya_proyek',
        userPrompt: 'Catat beli semen 2jt ke rekening BCA 1234567890 dari budi@cv.id',
        agentResponse: 'Transfer ke 081234567890 dicatat',
        expectedBehavior: 'Tanyakan jenis akun dan tidak mencatat PII',
        failureReason: 'Salah klasifikasi akun',
        actualToolCalls: ['prepare_entry'],
        model: 'tier-small-flash-lite',
        promptVersion: 'v3.2',
        context: { apiKey: 'sk-live-99999999' },
      });

      expect(cand.status).toBe('pending_human_review');
      expect(cand.requiresHumanReview).toBe(true);
      expect(cand.autoAddedToEvalSet).toBe(false);
      expect(cand.autoModifyCodeOrPromptAllowed).toBe(false);

      const serialized = JSON.stringify(cand);
      expect(serialized).not.toContain('1234567890');
      expect(serialized).not.toContain('budi@cv.id');
      expect(serialized).not.toContain('081234567890');
      expect(serialized).not.toContain('sk-live-99999999');

      await reportAgentUnansweredOrToolFail({
        orgId: 'org-eval',
        module: 'agent',
        intent: 'get_finance_snapshot',
        userPrompt: 'Saldo kas proyek?',
        failureReason: 'Timeout',
      });
      const storedCands = getEvalCandidates('org-eval');
      expect(storedCands).toHaveLength(1);
      expect(storedCands[0].status).toBe('pending_human_review');
    });

    it('dasbor mutu mendeteksi penurunan akurasi & lonjakan salah-posting dan memicu penurunan otonomi L2 -> L1', () => {
      const healthyDashboard = computeQualityDashboard(
        [
          {
            module: 'keuangan',
            intent: 'catat_biaya_proyek',
            periodWindow: 'previous',
            totalPredictions: 100,
            correctPredictions: 99,
            mispostingCount: 0,
            criticalErrorCount: 0,
          },
          {
            module: 'keuangan',
            intent: 'catat_biaya_proyek',
            periodWindow: 'current',
            totalPredictions: 100,
            correctPredictions: 99,
            mispostingCount: 0,
            criticalErrorCount: 0,
          },
        ],
        { currentAutonomyLevel: 'L2' },
      );

      expect(healthyDashboard.autonomyDemotionRecommended).toBe(false);
      expect(healthyDashboard.recommendedAutonomyTransition).toBeNull();
      expect(healthyDashboard.warnings).toHaveLength(0);
      expect(healthyDashboard.autoModifyCodeOrPromptAllowed).toBe(false);

      const degradedDashboard = computeQualityDashboard(
        [
          {
            module: 'keuangan',
            intent: 'catat_biaya_proyek',
            periodWindow: 'previous',
            totalPredictions: 100,
            correctPredictions: 99,
            mispostingCount: 0,
            criticalErrorCount: 0,
          },
          {
            module: 'keuangan',
            intent: 'catat_biaya_proyek',
            periodWindow: 'current',
            totalPredictions: 100,
            correctPredictions: 90,
            mispostingCount: 6,
            criticalErrorCount: 2,
          },
          {
            module: 'agent',
            intent: 'catat_termin_diterima',
            periodWindow: 'current',
            totalPredictions: 50,
            correctPredictions: 48,
            mispostingCount: 1,
            criticalErrorCount: 0,
          },
        ],
        { currentAutonomyLevel: 'L2' },
      );

      expect(degradedDashboard.autonomyDemotionRecommended).toBe(true);
      expect(degradedDashboard.recommendedAutonomyTransition).toBe('L2 -> L1');
      expect(degradedDashboard.mispostingTrend).toBe('worsening');
      expect(degradedDashboard.warnings.length).toBeGreaterThan(0);
      expect(degradedDashboard.byModule.length).toBe(2);
      expect(degradedDashboard.byIntent.length).toBe(2);
      expect(degradedDashboard.autoModifyCodeOrPromptAllowed).toBe(false);
    });

    it('memvalidasi struktur migrasi SQL lokal G7 (BLOCKED remote, tabel, indeks, RLS, dan bebas mutasi jurnal)', () => {
      const rawSql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(rawSql).toContain('BLOCKED remote');

      const sql = stripSqlComments(rawSql);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_feedback_events/i);
      expect(sql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+planner_org_telemetry_settings/i);

      for (const mod of FEEDBACK_MODULES) {
        expect(sql).toContain(`'${mod}'`);
      }
      for (const sev of FEEDBACK_SEVERITIES) {
        expect(sql).toContain(`'${sev}'`);
      }
      for (const cat of FEEDBACK_SIGNAL_CATEGORIES) {
        expect(sql).toContain(`'${cat}'`);
      }

      expect(sql).toMatch(/ON\s+planner_feedback_events\s*\(\s*org_id\s*,\s*fingerprint\s*\)/i);
      expect(sql).toMatch(
        /ON\s+planner_feedback_events\s*\(\s*status\s*,\s*priority_score\s+DESC\s*\)/i,
      );
      expect(sql).toMatch(/behavior_telemetry_opt_out\s+boolean\s+NOT\s+NULL\s+DEFAULT\s+false/i);
      expect(sql).toMatch(/ALTER\s+TABLE\s+planner_feedback_events\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+planner_org_telemetry_settings\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
      );
      expect(sql).toMatch(/is_org_member\s*\(\s*org_id/i);

      // Bebas mutasi tabel jurnal
      expect(sql).not.toMatch(/\b(UPDATE|DELETE)\s+(?:FROM\s+)?planner_journal_(entries|lines)/i);
    });
  });
});
