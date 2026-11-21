import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  AI_PROVIDERS,
  cleanRawAssistantReply,
  extractJson,
  getActiveModel,
  getProviderMeta,
  hasActiveKey,
  loadAIConfig,
  resolveWorkingProvider,
  saveAIConfig,
  type AIConfig,
} from './aiProviderService';
import {
  DIVISIONS,
  auditAndSyncProjectStatuses,
  executeAgentAction,
  extractMultiClauseActions,
  localBriefing,
  localSmartManagerTurn,
  type ContextPack,
  type ManagerEnv,
} from './managerAgentService';
import { createProject, updateProject } from './projectService';

vi.mock('./projectService', () => ({
  createProject: vi.fn(),
  updateProject: vi.fn(),
}));
import { formatCurrency } from '../lib/adapters';
import type { Project } from '../store/appStore';
import type { BonRequest } from './payrollService';

function createMockContextPack(): ContextPack {
  const proj1: Project = {
    id: 'uuid-proj-1',
    tenant_id: 'org-1',
    name: 'Renovasi Rumah Pak Budi',
    code: 'PRJ-001',
    client_name: 'Pak Budi',
    type: 'construction',
    status: 'active',
    start_date: '2026-10-01',
    end_date: '2026-12-31',
    total_budget_planned: 100_000_000,
    contract_value: 130_000_000,
    currency: 'IDR',
    progress_percentage: 45,
    health_status: 'on_track',
    planned_progress: 40,
    spent_amount: 40_000_000,
    total_received: 65_000_000,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  };

  const bon1: BonRequest = {
    id: 'uuid-bon-1',
    org_id: 'org-1',
    user_id: 'user-tukang-1',
    amount: 500_000,
    reason: 'Beli bensin & makan',
    status: 'pending',
    profiles: { name: 'Kang Asep' },
  };

  return {
    text: '[P1] (PROYEK SEDANG DIBUKA) Renovasi Rumah Pak Budi | RAP Rp 100.000.000 | biaya Rp 40.000.000',
    projects: new Map([['P1', proj1]]),
    members: new Map(),
    bons: new Map([['B1', bon1]]),
    todos: new Map(),
    estimations: new Map(),
    workItems: new Map(),
    rapItems: new Map(),
    pricelist: new Map(),
    activeProjectCode: 'P1',
  };
}

describe('Multi-Provider BYOK (aiProviderService)', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore if localStorage is not available
    }
  });

  it('mendukung 5 provider utama: OpenRouter, Gemini, Groq, Claude (Anthropic), dan OpenAI', () => {
    const ids = AI_PROVIDERS.map(p => p.id);
    expect(ids).toEqual(['openrouter', 'gemini', 'groq', 'anthropic', 'openai']);
    for (const provider of AI_PROVIDERS) {
      expect(provider.models.length).toBeGreaterThan(0);
      expect(provider.models.some(m => m.cheap)).toBe(true);
      expect(getProviderMeta(provider.id).label).toBeTruthy();
    }
  });

  it('menyimpan dan memuat API key serta otomatis memilih provider yang punya key', () => {
    const cfg: AIConfig = {
      ...loadAIConfig(),
      activeProvider: 'openrouter',
      keys: {
        gemini: 'AIza-test',
        groq: 'gsk_test',
      },
      models: {
        openrouter: 'deepseek/deepseek-chat',
      },
      executionMode: 'auto',
      autoLimit: 3_000_000,
    };
    saveAIConfig(cfg);
    const loaded = loadAIConfig();
    // Karena openrouter key kosong tapi gemini punya key, resolveWorkingProvider memilih gemini
    expect(resolveWorkingProvider(loaded)).toBe('gemini');
    expect(hasActiveKey(loaded)).toBe(true);
    expect(getActiveModel(loaded, 'openrouter')).toBe('deepseek/deepseek-chat');
    expect(getActiveModel(loaded, 'groq')).toBe('llama-3.1-8b-instant');
  });

  it('cleanRawAssistantReply membersihkan fragmen JSON terpotong agar tidak bocor ke tampilan chat', () => {
    const rawBroken = `{\n  "reply": "Baik, Pak/Bu Owner. Saya sudah cek proyek-proyek yang statusnya tidak sinkron dengan progres.",\n  "delegations": [\n    {\n      "division": "`;
    const cleaned = cleanRawAssistantReply(rawBroken);
    expect(cleaned).toBe('Baik, Pak/Bu Owner. Saya sudah cek proyek-proyek yang statusnya tidak sinkron dengan progres.');
    expect(cleaned).not.toContain('{');
    expect(cleaned).not.toContain('"reply"');
  });

  it('mampu mengaudit dan merapikan status semua proyek secara otomatis ke database (tindakan nyata Pak Raka)', () => {
    const ctx = createMockContextPack();
    // Tambahkan proyek P2 (progres 55%, status planning) dan P3 (progres 100%, status active)
    ctx.projects.set('P2', {
      id: 'uuid-proj-2',
      tenant_id: 'org-1',
      name: 'KITCHEN SET FINA',
      code: 'PRJ-002',
      client_name: 'Fina',
      type: 'interior',
      status: 'planning',
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      total_budget_planned: 50_000_000,
      currency: 'IDR',
      progress_percentage: 55,
      health_status: 'on_track',
      planned_progress: 50,
      spent_amount: 20_000_000,
      total_received: 30_243_000,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    });
    ctx.projects.set('P3', {
      id: 'uuid-proj-3',
      tenant_id: 'org-1',
      name: 'Furniture Cece',
      code: 'PRJ-003',
      client_name: 'Cece',
      type: 'interior',
      status: 'active',
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      total_budget_planned: 30_000_000,
      currency: 'IDR',
      progress_percentage: 100,
      health_status: 'on_track',
      planned_progress: 100,
      spent_amount: 25_000_000,
      total_received: 30_000_000,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    });

    const audit = auditAndSyncProjectStatuses(ctx);
    // P1 (progres 45%, status planning -> active)
    // P2 (progres 55%, status planning -> active)
    // P3 (progres 100%, status active -> completed)
    expect(audit.rawActions.length).toBeGreaterThanOrEqual(2);
    const p2Action = audit.rawActions.find(a => a.params.project === 'P2');
    expect(p2Action?.type).toBe('update_project_status');
    expect(p2Action?.params.status).toBe('active');

    const p3Action = audit.rawActions.find(a => a.params.project === 'P3');
    expect(p3Action?.type).toBe('update_project_status');
    expect(p3Action?.params.status).toBe('completed');

    expect(audit.summaryText).toContain('KITCHEN SET FINA');
    expect(audit.summaryText).toContain('Furniture Cece');
    expect(audit.delegations[0].division).toBe('project');
    expect(audit.delegations[0].note).toContain('Pak Raka');
  });
});

describe('General Manager & 5 Kepala Divisi (managerAgentService)', () => {
  it('memiliki 5 divisi operasional lengkap dengan nama Kepala Divisi di bawah General Manager', () => {
    expect(Object.keys(DIVISIONS)).toEqual([
      'manager',
      'project',
      'finance',
      'estimator',
      'hr',
      'purchasing',
    ]);
    expect(DIVISIONS.project.headName).toContain('Pak Raka');
    expect(DIVISIONS.finance.headName).toContain('Bu Sinta');
    expect(DIVISIONS.estimator.headName).toContain('Pak Dimas');
    expect(DIVISIONS.hr.headName).toContain('Bu Nadia');
    expect(DIVISIONS.purchasing.headName).toContain('Pak Hendra');
  });

  it('mampu melakukan simulasi kenaikan harga material dan mendelegasikan ke Estimator, Keuangan & Purchasing', () => {
    const ctx = createMockContextPack();
    const cfg = loadAIConfig();
    const turn = localSmartManagerTurn(ctx, 'Simulasi kalau harga material naik 10% dampaknya gimana?', cfg);
    expect(turn.reply).toContain('10%');
    expect(turn.reply).toContain('[P1] Renovasi Rumah Pak Budi');
    expect(turn.delegations.map(d => d.division)).toContain('estimator');
    expect(turn.delegations.map(d => d.division)).toContain('finance');
    expect(turn.followUps?.length).toBeGreaterThan(0);
  });

  it('mampu mengecek dan menyiapkan persetujuan kasbon untuk divisi HRD', () => {
    const ctx = createMockContextPack();
    const cfg: AIConfig = { ...loadAIConfig(), executionMode: 'review' };
    const turn = localSmartManagerTurn(ctx, 'Tolong cek kasbon dan setujui', cfg);
    expect(turn.delegations.some(d => d.division === 'hr')).toBe(true);
    expect(turn.actions.length).toBe(1);
    expect(turn.actions[0].type).toBe('review_bon');
    expect(turn.actions[0].division).toBe('hr');
  });

  it('mampu mengorkestrasi banyak perintah lintas divisi dalam 1 kalimat sekaligus (Multi-Clause Orchestration)', () => {
    const ctx = createMockContextPack();
    const extracted = extractMultiClauseActions(
      ctx,
      'Catat beli semen 10 sak @ 65rb lalu update progres pondasi jadi 70% terus hadir 6 tukang kemudian tugaskan ke Budi untuk cek besi beton',
    );
    expect(extracted.rawActions.map(a => a.type)).toEqual([
      'record_cost',
      'update_progress',
      'add_worker_log',
      'assign_todo',
    ]);
    expect(extracted.rawActions[0].params.total).toBe(650_000);
    expect(extracted.rawActions[1].params.progress).toBe(70);
    expect(extracted.rawActions[2].params.workers).toBe(6);
    expect(extracted.rawActions[3].params.assignee).toBe('Budi');
    expect(extracted.delegations.map(d => d.division)).toEqual(
      expect.arrayContaining(['finance', 'project', 'hr']),
    );
  });

  it('mampu mengubah instruksi pengeluaran menjadi tugas divisi Keuangan dan menghormati mode Auto-Pilot vs Review', () => {
    const ctx = createMockContextPack();
    const autoCfg: AIConfig = { ...loadAIConfig(), executionMode: 'auto', autoLimit: 5_000_000 };
    const turnAuto = localSmartManagerTurn(ctx, 'Catat beli semen 850rb', autoCfg);
    expect(turnAuto.actions.length).toBe(1);
    expect(turnAuto.actions[0].type).toBe('record_cost');
    expect(turnAuto.actions[0].division).toBe('finance');
    expect(turnAuto.actions[0].params.total).toBe(850_000);
    expect(turnAuto.actions[0].needsApproval).toBe(false);

    // Jika nominal di atas autoLimit, wajib minta persetujuan Owner
    const turnHigh = localSmartManagerTurn(ctx, 'Catat bayar besi beton 12jt', autoCfg);
    expect(turnHigh.actions[0].params.total).toBe(12_000_000);
    expect(turnHigh.actions[0].needsApproval).toBe(true);
  });

  it('localBriefing mempertahankan contract_value: 0 dan menandai margin negatif / over-RAP tanpa label Sehat (F-22/F-23/F-27)', () => {
    const ctx = createMockContextPack();
    ctx.projects.clear();
    ctx.projects.set('P1', {
      id: 'uuid-loss-proj',
      tenant_id: 'org-1',
      name: 'test-no-return',
      code: 'PRJ-LOSS',
      client_name: 'Internal',
      type: 'custom',
      status: 'active',
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      total_budget_planned: 10_000_000,
      contract_value: 0,
      currency: 'IDR',
      progress_percentage: 40,
      health_status: 'on_track',
      planned_progress: 40,
      spent_amount: 15_000_000,
      total_received: 20_000_000,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    });

    const briefing = localBriefing(ctx);
    expect(briefing).toContain(`Total Kontrak ${formatCurrency(0)}`);
    expect(briefing).toContain(`Est. Sisa Margin ${formatCurrency(-15_000_000)}`);
    expect(briefing).toContain('Over-RAP');
    expect(briefing).toContain('Rugi / margin negatif');
    expect(briefing).not.toContain('✅ Sehat');

    const cfg = loadAIConfig();
    const sim = localSmartManagerTurn(ctx, 'Simulasi kenaikan harga 10%', cfg);
    expect(sim.reply).toContain(formatCurrency(-15_000_000));
  });

  it('localBriefing tidak melabeli proyek behind/at_risk atau keuangan kosong sebagai Sehat (F-22/F-27)', () => {
    const ctx = createMockContextPack();
    ctx.projects.clear();
    ctx.projects.set('P1', {
      id: 'uuid-behind',
      tenant_id: 'org-1',
      name: 'Proyek Telat',
      code: 'PRJ-BHD',
      client_name: 'Klien A',
      type: 'custom',
      status: 'active',
      start_date: '2026-10-01',
      end_date: '2026-12-31',
      total_budget_planned: 50_000_000,
      contract_value: 80_000_000,
      currency: 'IDR',
      progress_percentage: 15,
      health_status: 'behind',
      planned_progress: 60,
      spent_amount: 10_000_000,
      total_received: 20_000_000,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    });
    ctx.projects.set('P2', {
      id: 'uuid-empty',
      tenant_id: 'org-1',
      name: 'Proyek Kosong',
      code: 'PRJ-EMP',
      client_name: 'Klien B',
      type: 'custom',
      status: 'planning',
      start_date: '2026-11-01',
      end_date: '2026-12-31',
      total_budget_planned: 0,
      contract_value: 0,
      currency: 'IDR',
      progress_percentage: 0,
      health_status: 'on_track',
      planned_progress: 0,
      spent_amount: 0,
      total_received: 0,
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    });

    const briefing = localBriefing(ctx);
    expect(briefing).toContain('Terlambat (Behind)');
    expect(briefing).toContain('Belum ada data keuangan/RAP');
    expect(briefing).not.toContain('✅ Sehat');
  });

  it('localBriefing menampilkan ✅ Sehat hanya bila proyek benar-benar sehat secara keuangan dan jadwal', () => {
    const ctx = createMockContextPack();
    const briefing = localBriefing(ctx);
    expect(briefing).toContain('✅ Sehat');
  });

  it('tidak salah mengarahkan prompt perencanaan proyek bertipe "tim 4 orang" ke HRD Bu Nadia dan menyiapkan draft add_project editable (F-15)', () => {
    const ctx = createMockContextPack();
    const cfg: AIConfig = { ...loadAIConfig(), executionMode: 'auto', autoLimit: 5_000_000 };
    const turn = localSmartManagerTurn(
      ctx,
      'Peluncuran website toko online dalam 6 minggu, tim 4 orang',
      cfg,
    );

    expect(turn.delegations.some(d => d.division === 'hr')).toBe(false);
    expect(turn.actions).toHaveLength(1);
    const act = turn.actions[0];
    expect(act.type).toBe('add_project');
    expect(act.needsApproval).toBe(true);
    expect(act.params.name).toBe('Peluncuran website toko online');
    expect(act.params.duration_days).toBe(42);
    expect(typeof act.params.start_date).toBe('string');
    expect(typeof act.params.end_date).toBe('string');

    const startMs = Date.parse(`${String(act.params.start_date)}T00:00:00Z`);
    const endMs = Date.parse(`${String(act.params.end_date)}T00:00:00Z`);
    expect(Math.round((endMs - startMs) / 86_400_000)).toBe(42);
    expect(turn.reply).toMatch(/Mode Mesin Lokal|Mode lokal/i);
    expect(turn.reply).toMatch(/WBS|API Key LLM/i);
  });

  it('addProjMatch mengekstrak nama proyek, klien, nilai kontrak (jt/miliar/ribu), dan durasi secara bersih (F-15)', () => {
    const ctx = createMockContextPack();

    const r1 = extractMultiClauseActions(
      ctx,
      'Buat proyek Renovasi Ruko Kemang klien Pak Hendro nilai kontrak 250 juta dalam 6 minggu',
    );
    expect(r1.rawActions).toHaveLength(1);
    expect(r1.rawActions[0].type).toBe('add_project');
    expect(r1.rawActions[0].params.name).toBe('Renovasi Ruko Kemang');
    expect(r1.rawActions[0].params.client).toBe('Pak Hendro');
    expect(r1.rawActions[0].params.contract_value).toBe(250_000_000);
    expect(r1.rawActions[0].params.duration_days).toBe(42);

    const r2 = extractMultiClauseActions(
      ctx,
      'Buat proyek Villa Ubud, nilai kontrak 1,5 miliar, klien Bu Sari, 2 bulan',
    );
    expect(r2.rawActions[0].params.name).toBe('Villa Ubud');
    expect(r2.rawActions[0].params.client).toBe('Bu Sari');
    expect(r2.rawActions[0].params.contract_value).toBe(1_500_000_000);
    expect(r2.rawActions[0].params.duration_days).toBe(60);

    const r3 = extractMultiClauseActions(
      ctx,
      'Tambah proyek Kanopi Minimalis nilai kontrak 750 ribu selama 14 hari',
    );
    expect(r3.rawActions[0].params.name).toBe('Kanopi Minimalis');
    expect(r3.rawActions[0].params.contract_value).toBe(750_000);
    expect(r3.rawActions[0].params.duration_days).toBe(14);
  });

  it('executeAgentAction add_project meneruskan start_date, end_date hasil durasi, dan contract_value ke projectService (F-15)', async () => {
    const ctx = createMockContextPack();
    const fakeCreated = {
      ...ctx.projects.get('P1')!,
      id: 'uuid-new-proj',
      name: 'Renovasi Ruko Kemang',
      client_name: 'Pak Hendro',
      start_date: '2026-11-21',
      end_date: '2027-01-02',
    };
    vi.mocked(createProject).mockResolvedValueOnce(fakeCreated);
    vi.mocked(updateProject).mockResolvedValueOnce({ ...fakeCreated, contract_value: 250_000_000 });

    const env: ManagerEnv = {
      userId: 'user-1',
      orgId: 'org-1',
      userName: 'Owner',
      projects: [...ctx.projects.values()],
      currentProject: ctx.projects.get('P1')!,
      onNavigate: vi.fn(),
      onRefreshProjects: vi.fn().mockResolvedValue(undefined),
    };

    const res = await executeAgentAction(
      {
        id: 'act-add-1',
        type: 'add_project',
        division: 'project',
        params: {
          name: 'Renovasi Ruko Kemang',
          client: 'Pak Hendro',
          contract_value: 250_000_000,
          start_date: '2026-11-21',
          end_date: '2027-01-02',
          duration_days: 42,
        },
        summary: 'Buat proyek baru',
        needsApproval: true,
        status: 'pending',
      },
      ctx,
      env,
    );

    expect(res.ok).toBe(true);
    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Renovasi Ruko Kemang',
        client_name: 'Pak Hendro',
        start_date: '2026-11-21',
        end_date: '2027-01-02',
      }),
    );
    expect(updateProject).toHaveBeenCalledWith('uuid-new-proj', { contract_value: 250_000_000 });
    expect(env.onRefreshProjects).toHaveBeenCalled();

    const negRes = await executeAgentAction(
      {
        id: 'act-add-proj-neg',
        type: 'add_project',
        division: 'project',
        params: {
          name: 'Proyek Negatif',
          contract_value: '-5000',
          start_date: '2026-11-21',
          end_date: '2026-12-01',
        },
        summary: 'Negatif',
        needsApproval: true,
        status: 'pending',
      },
      ctx,
      env,
    );
    expect(negRes.ok).toBe(false);
    expect(negRes.message).toContain('negatif');

    const dateRes = await executeAgentAction(
      {
        id: 'act-add-proj-date',
        type: 'add_project',
        division: 'project',
        params: {
          name: 'Proyek Tanggal Terbalik',
          start_date: '2026-12-10',
          end_date: '2026-12-01',
        },
        summary: 'Tanggal terbalik',
        needsApproval: true,
        status: 'pending',
      },
      ctx,
      env,
    );
    expect(dateRes.ok).toBe(false);
    expect(dateRes.message).toContain('lebih awal');
  });

  it('localSmartManagerTurn merespons jujur untuk input off-topic dan permintaan reschedule tanpa membuang briefing "✅ Sehat" (F-15)', () => {
    const ctx = createMockContextPack();
    const cfg = loadAIConfig();

    const offTopic = localSmartManagerTurn(ctx, 'resep nasi goreng spesial', cfg);
    expect(offTopic.actions).toHaveLength(0);
    expect(offTopic.reply).not.toContain('✅ Sehat');
    expect(offTopic.reply).not.toContain('Laporan eksekutif portofolio');
    expect(offTopic.reply).toMatch(/di luar cakupan|Froyek/i);

    const resched = localSmartManagerTurn(
      ctx,
      'jadwalkan ulang semua tugas setelah pondasi mundur 2 minggu',
      cfg,
    );
    expect(resched.actions).toHaveLength(0);
    expect(resched.reply).not.toContain('✅ Sehat');
    expect(resched.reply).toContain('Progress > Gantt');
    expect(resched.reply).toContain('Edit Sub Tugas');
    expect(resched.reply).toMatch(/FS/);
  });

  it('localSmartManagerTurn tetap menampilkan briefing saat diminta secara eksplisit', () => {
    const ctx = createMockContextPack();
    const cfg = loadAIConfig();
    const turn = localSmartManagerTurn(ctx, 'Briefing kondisi semua proyek hari ini', cfg);
    expect(turn.reply).toContain('Laporan eksekutif portofolio');
    expect(turn.reply).toContain('✅ Sehat');
  });
});
