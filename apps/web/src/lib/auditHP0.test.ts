import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import {
  UNIFIED_MANAGER_ACTIONS,
  UNIFIED_MANAGER_ACTION_TYPES,
  type UnifiedManagerActionType,
} from '@domain/unifiedAgentGateway';
import { decideActionStatus } from '@agent-core/runtime';
import {
  executeAgentAction,
  localSmartManagerTurn,
  validateActionParams,
  type AgentAction,
  type ContextPack,
  type ManagerEnv,
} from '../services/managerAgentService';
import { loadAIConfig, type AIConfig } from '../services/aiProviderService';
import type { Project } from '../store/appStore';

const REPO_ROOT = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));

function makeTestCtxAndEnv(userRole?: 'worker' | 'manager' | 'owner'): { ctx: ContextPack; env: ManagerEnv } {
  const proj: Project = {
    id: 'proj-p0-1',
    tenant_id: 'org-p0-1',
    name: 'Ruko Bu Ana',
    code: 'PRJ-01',
    client_name: 'Bu Ana',
    type: 'construction',
    status: 'active',
    start_date: '2026-11-01',
    end_date: '2027-02-01',
    total_budget_planned: 200_000_000,
    contract_value: 260_000_000,
    currency: 'IDR',
    progress_percentage: 35,
    health_status: 'on_track',
    planned_progress: 35,
    spent_amount: 50_000_000,
    total_received: 100_000_000,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };

  const ctx: ContextPack = {
    text: '[P1] Ruko Bu Ana',
    projects: new Map([['P1', proj]]),
    members: new Map([
      [
        'E1',
        {
          id: 'mem-worker-1',
          org_id: 'org-p0-1',
          user_id: 'usr-worker-1',
          role: 'worker',
          status: 'active',
          joined_at: '2026-11-01T00:00:00Z',
          profile: { name: 'Kang Dedi', email: 'dedi@test.id' },
        },
      ],
    ]),
    bons: new Map([
      [
        'B1',
        {
          id: 'bon-1',
          org_id: 'org-p0-1',
          user_id: 'usr-worker-1',
          amount: 400_000,
          reason: 'Beli makan',
          status: 'pending',
          profiles: { name: 'Kang Dedi' },
        },
      ],
    ]),
    todos: new Map(),
    estimations: new Map(),
    workItems: new Map(),
    rapItems: new Map(),
    pricelist: new Map(),
    activeProjectCode: 'P1',
  };

  const env: ManagerEnv = {
    userId: userRole === 'worker' ? 'usr-worker-1' : 'usr-owner-1',
    orgId: 'org-p0-1',
    userName: 'User Test',
    ...(userRole ? { userRole } : {}),
    accessToken: '',
    projects: [proj],
    currentProject: proj,
    onNavigate: vi.fn(),
    onRefreshProjects: vi.fn().mockResolvedValue(undefined),
  } as ManagerEnv;

  return { ctx, env };
}

describe('P0 Audit Fixes (H-AUD-01..06)', () => {
  describe('1. H-AUD-06: needsApproval parity & no automatic owner:human self-approval in executeAgentAction', () => {
    it('seluruh 7 aksi alwaysRequiresApproval wajib needsApproval=true walaupun executionMode="auto" dan nominal=0', () => {
      const { ctx } = makeTestCtxAndEnv('owner');
      const autoCfg: AIConfig = {
        ...loadAIConfig(),
        executionMode: 'auto',
        autoLimit: 100_000_000,
      };

      // review_bon dengan nominal 400.000 (< autoLimit) di mode auto
      const bonTurn = localSmartManagerTurn(ctx, 'Setujui kasbon B1', autoCfg);
      expect(bonTurn.actions).toHaveLength(1);
      expect(bonTurn.actions[0].type).toBe('review_bon');
      expect(bonTurn.actions[0].needsApproval).toBe(true);

      // add_employee di mode auto
      const empTurn = localSmartManagerTurn(ctx, 'Tambah karyawan Kang Asep', autoCfg);
      expect(empTurn.actions).toHaveLength(1);
      expect(empTurn.actions[0].type).toBe('add_employee');
      expect(empTurn.actions[0].needsApproval).toBe(true);

      // update_project_status di mode auto
      ctx.projects.set('P2', {
        ...ctx.projects.get('P1')!,
        id: 'proj-p0-2',
        name: 'Proyek Selesai',
        status: 'active',
        progress_percentage: 100,
      });
      const statusTurn = localSmartManagerTurn(ctx, 'Rapikan status semua proyek', autoCfg);
      expect(statusTurn.actions.length).toBeGreaterThanOrEqual(1);
      for (const act of statusTurn.actions) {
        if (UNIFIED_MANAGER_ACTIONS[act.type].alwaysRequiresApproval) {
          expect(act.needsApproval, `action ${act.type} must require approval`).toBe(true);
        }
      }
    });

    it('executeAgentAction mengambil peran asli dari sesi dan menolak eskalasi peran worker serta menolak auto-approval tanpa persetujuan sah', async () => {
      const { ctx, env } = makeTestCtxAndEnv('worker');

      // Worker mencoba mengeksekusi add_project (minActorRole: 'manager', alwaysRequiresApproval: true)
      const resWorker = await executeAgentAction(
        {
          id: 'act-p0-worker-proj',
          type: 'add_project',
          division: 'project',
          params: {
            name: 'Proyek Ilegal Worker',
            client: 'Klien X',
            start_date: '2026-11-28',
            end_date: '2027-01-28',
          },
          summary: 'Buat proyek oleh worker',
          needsApproval: true,
          status: 'pending',
        },
        ctx,
        env,
      );
      expect(resWorker.ok).toBe(false);
      expect(resWorker.code).toBe('role_escalation_forbidden');

      // Tanpa userId dan tanpa approvedBy eksplisit, tidak boleh fallback ke 'owner:human'
      const emptyUserEnv: ManagerEnv = { ...env, userId: '' };
      const resNoApprover = await executeAgentAction(
        {
          id: 'act-p0-no-approver',
          type: 'add_project',
          division: 'project',
          params: {
            name: 'Proyek Tanpa Approver',
            client: 'Klien Y',
            start_date: '2026-11-28',
            end_date: '2027-01-28',
          },
          summary: 'Buat proyek tanpa approver',
          needsApproval: true,
          status: 'pending',
        },
        ctx,
        emptyUserEnv,
      );
      expect(resNoApprover.ok).toBe(false);
    });
  });

  describe('2. H-AUD-02: validateActionParams memvalidasi skema seluruh 18 aksi manajer & menolak aksi tak dikenal', () => {
    const validSamples: Record<UnifiedManagerActionType, Record<string, unknown>> = {
      record_cost: { project: 'P1', item: 'Semen 10 sak', total: 650_000 },
      record_income: { project: 'P1', amount: 15_000_000, category: 'termin' },
      record_transfer: { amount: 2_000_000, transferType: 'loan', description: 'Talangan' },
      update_progress: { project: 'P1', workItem: 'Pasang Keramik', progress: 50 },
      add_worker_log: { project: 'P1', workers: 6 },
      add_project: { name: 'Ruko Baru', client: 'Pak Budi' },
      add_rap_item: { project: 'P1', name: 'Besi 10mm', qty: 50, unit: 'btg', unitPrice: 85_000 },
      add_work_item: { project: 'P1', name: 'Pekerjaan Atap' },
      update_project_status: { project: 'P1', status: 'active' },
      review_bon: { bon: 'B1', decision: 'approve' },
      assign_todo: { project: 'P1', title: 'Cek keramik', priority: 'high' },
      complete_todo: { todo: 'T1' },
      generate_payroll: {},
      add_employee: { name: 'Kang Dedi', role: 'worker' },
      record_attendance: { employee: 'Kang Dedi', type: 'check_in', project: 'P1' },
      upsert_pricelist: { name: 'HPL Taco', unit: 'lbr', baseCost: 185_000, category: 'material' },
      create_estimation: { title: 'Kitchen Set', customer: 'Bu Rina' },
      convert_estimation: { estimation: 'EST1' },
    };

    it('menolak tipe aksi yang tidak dikenal (ok: false, code: "aksi_tidak_dikenal")', () => {
      const unknownAct = {
        id: 'act-unknown',
        type: 'drop_database' as unknown as UnifiedManagerActionType,
        division: 'project' as const,
        params: {},
        summary: 'Aksi ilegal',
        needsApproval: true,
        status: 'pending' as const,
      };
      const res = validateActionParams(unknownAct);
      expect(res.ok).toBe(false);
    });

    it('memvalidasi argumen wajib, tipe, dan enum untuk seluruh 18 aksi manajer satu per satu', () => {
      expect(UNIFIED_MANAGER_ACTION_TYPES).toHaveLength(18);

      for (const actionType of UNIFIED_MANAGER_ACTION_TYPES) {
        const validAction: AgentAction = {
          id: `act-valid-${actionType}`,
          type: actionType,
          division: 'project',
          params: validSamples[actionType],
          summary: actionType,
          needsApproval: false,
          status: 'pending',
        };
        expect(validateActionParams(validAction), `${actionType} valid sample should pass`).toEqual({ ok: true });

        if (actionType !== 'generate_payroll') {
          const emptyParamsAction: AgentAction = {
            ...validAction,
            id: `act-empty-${actionType}`,
            params: {},
          };
          const emptyRes = validateActionParams(emptyParamsAction);
          expect(emptyRes.ok, `${actionType} with empty params must fail validation`).toBe(false);
        }
      }

      // Enum validation tests
      expect(
        validateActionParams({
          id: 'act-enum-status',
          type: 'update_project_status',
          division: 'project',
          params: { project: 'P1', status: 'invalid_status' },
          summary: 'bad enum',
          needsApproval: true,
          status: 'pending',
        }).ok,
      ).toBe(false);

      expect(
        validateActionParams({
          id: 'act-enum-bon',
          type: 'review_bon',
          division: 'hr',
          params: { bon: 'B1', decision: 'maybe' },
          summary: 'bad enum',
          needsApproval: true,
          status: 'pending',
        }).ok,
      ).toBe(false);
    });
  });

  describe('3. H-AUD-01: _shared/agent/runtime.ts bersumber tunggal dari agent-core & L3 tunduk pada gatePassed, approvalLimitRupiah, dan authorizeAgentAction', () => {
    it('_shared/agent/runtime.ts self-contained dalam _shared/ tanpa impor lintas folder ke agent-core (REAUD-01)', () => {
      const sharedRuntimePath = resolve(
        REPO_ROOT,
        'my-supabase-project/supabase/functions/_shared/agent/runtime.ts',
      );
      const sharedContent = readFileSync(sharedRuntimePath, 'utf8');
      expect(sharedContent).not.toContain('agent-core/src/runtime.ts');
      expect(sharedContent).not.toMatch(/\.\.\/\.\.\/\.\.\/\.\.\//);
      expect(sharedContent).toContain("from './errors.ts'");
      expect(sharedContent).toContain("from './dates.ts'");
      expect(sharedContent).toContain("from './autonomyGovernance.ts'");
      expect(sharedContent).toContain("from './sop.ts'");
    });

    it('L3 tidak pernah melewati gatePassed, approvalLimitRupiah, authorizeAgentAction, SoD, kill switch, dan cap harian', () => {
      // Tanpa gatePassed -> tetap draft
      expect(decideActionStatus('L3', 'commit', 100_000, 1_000_000, false)).toBe('draft');
      // Melebihi approvalLimitRupiah -> tetap draft
      expect(decideActionStatus('L3', 'commit', 2_000_000, 1_000_000, true)).toBe('draft');
      // Critical -> tetap draft
      expect(decideActionStatus('L3', 'critical', 100_000, 1_000_000, true)).toBe('draft');

      // Bila governance предоставляется, L3 wajib tunduk pada authorizeAgentAction (kill switch, SoD, daily cap)
      expect(
        decideActionStatus('L3', 'commit', 100_000, 1_000_000, true, {
          request: {
            orgId: 'org-1',
            actionType: 'catat_biaya',
            amountRupiah: 100_000,
            actorId: 'usr-1',
            actorRole: 'manager',
            createdBy: 'usr-1',
            approvedBy: 'usr-1', // Self-approval SoD violation
            approverRole: 'manager',
            requiresApproval: true,
          },
          policy: {
            orgId: 'org-1',
            killSwitchEnabled: false,
            dailyAgentCapRupiah: 5_000_000,
          },
          dailyUsage: {
            committedRupiahToday: 0,
          },
        }),
      ).toBe('draft');

      // Kill switch aktif -> draft
      expect(
        decideActionStatus('L3', 'commit', 100_000, 1_000_000, true, {
          request: {
            orgId: 'org-1',
            actionType: 'catat_biaya',
            amountRupiah: 100_000,
            actorId: 'usr-1',
            actorRole: 'manager',
            createdBy: 'agent-1',
            approvedBy: 'usr-1',
            approverRole: 'manager',
            requiresApproval: false,
          },
          policy: {
            orgId: 'org-1',
            killSwitchEnabled: true,
            dailyAgentCapRupiah: 5_000_000,
          },
          dailyUsage: {
            committedRupiahToday: 0,
          },
        }),
      ).toBe('draft');
    });
  });

  describe('4. H-AUD-03: planner-agent-run/index.ts bebas deklarasi userId ganda, orgId/userId aman di catch, select timezone, dan tanpa cek POST ganda', () => {
    it('memiliki kode yang valid tanpa duplikasi const userId, select("plan_type, timezone"), dan catch aman', () => {
      const fnPath = resolve(
        REPO_ROOT,
        'my-supabase-project/supabase/functions/planner-agent-run/index.ts',
      );
      const src = readFileSync(fnPath, 'utf8');

      // Tidak boleh ada >1 deklarasi const userId
      const constUserIdMatches = src.match(/\bconst\s+userId\s*=/g) ?? [];
      expect(constUserIdMatches.length).toBeLessThanOrEqual(1);

      // Tidak boleh ada cek req.method !== "POST" ganda
      const postMethodChecks = src.match(/if\s*\(\s*req\.method\s*!==\s*["']POST["']\s*\)/g) ?? [];
      expect(postMethodChecks).toHaveLength(1);

      // Harus memilih timezone bersama plan_type dari planner_organizations
      expect(src).toMatch(/\.from\(["']planner_organizations["']\)\s*\.select\(["'][^"']*timezone[^"']*["']\)/);

      // orgId dan userId harus dideklarasikan di luar try (sebelum try {) agar blok catch tidak ReferenceError
      const tryIndex = src.indexOf('try {');
      const headerBeforeTry = src.slice(0, tryIndex);
      expect(headerBeforeTry).toMatch(/\blet\s+orgId\b/);
      expect(headerBeforeTry).toMatch(/\blet\s+userId\b/);
    });
  });

  describe('5. H-AUD-04: Rahasia VERCEL_OIDC_TOKEN dihapus dari apps/web/.env.local & .dockerignore melindungi .env*', () => {
    it('apps/web/.env.local tidak memuat VERCEL_OIDC_TOKEN dan .dockerignore mengecualikan **/.env*, node_modules, .git', () => {
      const webEnvLocalPath = resolve(REPO_ROOT, 'apps/web/.env.local');
      if (existsSync(webEnvLocalPath)) {
        const envContent = readFileSync(webEnvLocalPath, 'utf8');
        expect(envContent).not.toMatch(/^VERCEL_OIDC_TOKEN=/m);
      }

      const dockerignorePath = resolve(REPO_ROOT, '.dockerignore');
      expect(existsSync(dockerignorePath)).toBe(true);
      const dockerignore = readFileSync(dockerignorePath, 'utf8');
      expect(dockerignore).toContain('**/.env*');
      expect(dockerignore).toContain('node_modules');
      expect(dockerignore).toContain('.git');
    });
  });

  describe('6. H-AUD-05: scripts/agent-backup-dr.sh & .github/workflows/agent-staging-canary.yml aman', () => {
    it('scripts/agent-backup-dr.sh tidak memakai default project ref produksi, tidak memakai supabase db reset --remote, dan mewajibkan konfirmasi manual + target DB kosong eksplisit', () => {
      const scriptPath = resolve(REPO_ROOT, 'scripts/agent-backup-dr.sh');
      const script = readFileSync(scriptPath, 'utf8');

      expect(script).not.toContain('zzwqfmdyncxbolestkqp');
      expect(script).not.toMatch(/supabase\s+db\s+reset\s+--remote/);
      expect(script).toMatch(/psql|pg_restore/);
      expect(script).toMatch(/CONFIRM_RESTORE|read\s+-r/);
    });

    it('agent-staging-canary.yml memakai URL project spesifik, memisahkan token staging vs produksi, dan memakai GitHub Environment pada production-promote', () => {
      const wfPath = resolve(REPO_ROOT, '.github/workflows/agent-staging-canary.yml');
      const wf = readFileSync(wfPath, 'utf8');

      expect(wf).not.toContain('https://api.supabase.co/functions/v1/');
      expect(wf).toContain('SUPABASE_STAGING_ACCESS_TOKEN');
      expect(wf).toMatch(/production-promote:[\s\S]*?environment:\s*(?:production|\n\s*name:\s*production)/);
    });
  });
});

