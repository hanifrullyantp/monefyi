import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AI_PROVIDERS,
  extractJson,
  getActiveModel,
  getProviderMeta,
  loadAIConfig,
  saveAIConfig,
  type AIConfig,
} from './aiProviderService';
import { mergeCloudAIConfig } from './aiConfigSync';
import {
  DIVISIONS,
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
    text: '[P1] Renovasi Rumah Pak Budi | RAP Rp 100.000.000 | biaya Rp 40.000.000',
    projects: new Map([['P1', proj1]]),
    members: new Map(),
    bons: new Map([['B1', bon1]]),
    estimations: new Map(),
    workItems: new Map(),
    pricelist: new Map(),
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

  it('menyimpan dan memuat API key serta model kustom per provider', () => {
    const cfg: AIConfig = {
      ...loadAIConfig(),
      activeProvider: 'openrouter',
      keys: {
        openrouter: 'sk-or-test-123',
        gemini: 'AIza-test',
        groq: 'gsk_test',
        anthropic: 'sk-ant-test',
        openai: 'sk-openai-test',
      },
      models: {
        openrouter: 'deepseek/deepseek-chat',
      },
      executionMode: 'auto',
      autoLimit: 3_000_000,
    };
    saveAIConfig(cfg);
    const loaded = loadAIConfig();
    expect(loaded.activeProvider).toBe('openrouter');
    expect(loaded.keys.openrouter).toBe('sk-or-test-123');
    expect(loaded.keys.gemini).toBe('AIza-test');
    expect(loaded.keys.groq).toBe('gsk_test');
    expect(loaded.keys.anthropic).toBe('sk-ant-test');
    expect(loaded.keys.openai).toBe('sk-openai-test');
    expect(getActiveModel(loaded, 'openrouter')).toBe('deepseek/deepseek-chat');
    expect(getActiveModel(loaded, 'groq')).toBe('llama-3.1-8b-instant');
  });

  it('mengisi key kosong dari profil cloud saat perangkat baru', () => {
    const local = { ...loadAIConfig(), keys: {} };
    const merged = mergeCloudAIConfig(local, {
      activeProvider: 'gemini',
      keys: { gemini: 'AIza-cloud-key' },
    }, null);
    expect(merged.keys.gemini).toBe('AIza-cloud-key');
    expect(merged.activeProvider).toBe('gemini');
  });

  it('memetakan model Gemini yang sudah dihapus ke gemini-2.5-flash', () => {
    saveAIConfig({
      ...loadAIConfig(),
      activeProvider: 'gemini',
      models: { gemini: 'gemini-2.0-flash-lite' },
    });
    const loaded = loadAIConfig();
    expect(loaded.models.gemini).toBe('gemini-2.5-flash');
    expect(getActiveModel(loaded, 'gemini')).toBe('gemini-2.5-flash');
  });

  it('extractJson tahan terhadap output model murah yang menyertakan markdown fence atau teks pengantar', () => {
    const noisy = `Berikut hasil analisa saya:\n\`\`\`json\n{"reply":"Siap Bos","delegations":[{"division":"finance","note":"Cek kas"}],"actions":[]}\n\`\`\`\nSemoga membantu!`;
    const parsed = extractJson<{ reply: string; delegations: unknown[] }>(noisy);
    expect(parsed?.reply).toBe('Siap Bos');
    expect(parsed?.delegations.length).toBe(1);
  });
});

describe('General Manager & 5 Kepala Divisi (managerAgentService)', () => {
  it('memiliki 5 divisi operasional lengkap di bawah General Manager', () => {
    expect(Object.keys(DIVISIONS)).toEqual([
      'manager',
      'project',
      'finance',
      'estimator',
      'hr',
      'purchasing',
    ]);
  });

  it('mampu melakukan simulasi kenaikan harga material dan mendelegasikan ke Estimator & Keuangan', () => {
    const ctx = createMockContextPack();
    const cfg = loadAIConfig();
    const turn = localSmartManagerTurn(ctx, 'Simulasi kalau harga material naik 10% dampaknya gimana?', cfg);
    expect(turn.reply).toContain('10%');
    expect(turn.reply).toContain('[P1] Renovasi Rumah Pak Budi');
    expect(turn.delegations.map(d => d.division)).toContain('estimator');
    expect(turn.delegations.map(d => d.division)).toContain('finance');
  });

  it('mampu mengecek dan menyiapkan persetujuan kasbon untuk divisi HRD', () => {
    const ctx = createMockContextPack();
    const cfg: AIConfig = { ...loadAIConfig(), executionMode: 'review' };
    const turn = localSmartManagerTurn(ctx, 'Tolong cek kasbon dan setujui', cfg);
    expect(turn.reply).toContain('Kang Asep');
    expect(turn.delegations.some(d => d.division === 'hr')).toBe(true);
    expect(turn.actions.length).toBe(1);
    expect(turn.actions[0].type).toBe('review_bon');
    expect(turn.actions[0].division).toBe('hr');
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

