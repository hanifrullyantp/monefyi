import { describe, expect, it, beforeEach } from 'vitest';
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
  extractMultiClauseActions,
  localSmartManagerTurn,
  type ContextPack,
} from './managerAgentService';
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
});
