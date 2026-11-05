/**
 * Manager Agent: General Manager yang mengorkestrasi divisi (Proyek, Keuangan, Estimator, HRD, Purchasing).
 * - Compact Context Pack: snapshot ringkas dengan kode pendek ([P1], [E1], [B1]) agar model murah tidak perlu menebak UUID.
 * - Dual output: balasan natural + daftar aksi terstruktur.
 * - Deterministic executor: resolusi kode → ID, hitung nominal, tulis ke service aplikasi.
 */
import { formatCurrency, todayStr } from '../lib/adapters';
import { executeIntent, type IntentContext } from '../lib/intentExecutor';
import type { ParsedCommand } from '../lib/commandParser';
import type { Project } from '../store/appStore';
import { loadWorkItems, type WorkItem } from './workItemService';
import { listMembers } from './memberService';
import { listBonRequests, reviewBonRequest, generatePayrollForOrg, type BonRequest } from './payrollService';
import { loadTodosForOrg, createTodo } from './todoService';
import { loadEstimations } from './estimatorService';
import { createPricelistItem, loadPricelistItems, updatePricelistItem, calcPricelistSelling } from './pricelistService';
import { createProject } from './projectService';
import type { OrgMember } from '../types/onboarding';
import type { Estimation, PricelistCategory } from '../types/estimator';
import type { PlannerTodo } from '../types/plannerTodo';
import {
  callUnifiedAI,
  extractJson,
  hasActiveKey,
  type AIConfig,
  type ChatMessage,
} from './aiProviderService';

export type DivisionId = 'manager' | 'project' | 'finance' | 'estimator' | 'hr' | 'purchasing';

export const DIVISIONS: Record<DivisionId, { label: string; role: string; emoji: string }> = {
  manager: { label: 'General Manager', role: 'Orkestrator & penasihat strategis', emoji: '👔' },
  project: { label: 'Proyek & Lapangan', role: 'Site Manager / Mandor', emoji: '👷' },
  finance: { label: 'Keuangan', role: 'Finance Officer', emoji: '💰' },
  estimator: { label: 'Estimator & QS', role: 'Quantity Surveyor', emoji: '📐' },
  hr: { label: 'HRD & Payroll', role: 'HRD', emoji: '👥' },
  purchasing: { label: 'Purchasing', role: 'Purchasing & Logistik', emoji: '📦' },
};

export type ActionType =
  | 'record_cost'
  | 'record_income'
  | 'record_transfer'
  | 'update_progress'
  | 'add_worker_log'
  | 'add_project'
  | 'add_rap_item'
  | 'add_work_item'
  | 'review_bon'
  | 'assign_todo'
  | 'generate_payroll'
  | 'add_employee'
  | 'record_attendance'
  | 'upsert_pricelist'
  | 'create_estimation'
  | 'convert_estimation';

const ACTION_DIVISION: Record<ActionType, DivisionId> = {
  record_cost: 'finance',
  record_income: 'finance',
  record_transfer: 'finance',
  update_progress: 'project',
  add_worker_log: 'project',
  add_project: 'project',
  add_rap_item: 'project',
  add_work_item: 'project',
  review_bon: 'hr',
  assign_todo: 'hr',
  generate_payroll: 'hr',
  add_employee: 'hr',
  record_attendance: 'hr',
  upsert_pricelist: 'purchasing',
  create_estimation: 'estimator',
  convert_estimation: 'estimator',
};

export interface AgentAction {
  id: string;
  type: ActionType;
  division: DivisionId;
  params: Record<string, unknown>;
  summary: string;
  needsApproval: boolean;
  status: 'pending' | 'running' | 'done' | 'failed' | 'rejected';
  resultMessage?: string;
  navigateTo?: string;
}

export interface ManagerTurn {
  reply: string;
  delegations: { division: DivisionId; note: string }[];
  actions: AgentAction[];
}

export interface ContextPack {
  text: string;
  projects: Map<string, Project>;
  members: Map<string, OrgMember>;
  bons: Map<string, BonRequest>;
  estimations: Map<string, Estimation>;
  workItems: Map<string, { projectId: string; item: WorkItem }>;
  pricelist: Map<string, string>;
}

export interface ManagerEnv {
  userId: string;
  orgId: string;
  userName: string;
  projects: Project[];
  currentProject: Project | null;
  onNavigate: (path: string) => void;
  onRefreshProjects: () => Promise<void>;
}

const rp = (n: number) => formatCurrency(Number(n) || 0);

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export async function buildContextPack(env: ManagerEnv): Promise<ContextPack> {
  const projects = new Map<string, Project>();
  const members = new Map<string, OrgMember>();
  const bons = new Map<string, BonRequest>();
  const estimations = new Map<string, Estimation>();
  const workItems = new Map<string, { projectId: string; item: WorkItem }>();
  const pricelist = new Map<string, string>();
  const lines: string[] = [`Tanggal: ${todayStr()}. Pemilik: ${env.userName}.`];

  const live = env.projects.filter(p => p.status !== 'archived');
  lines.push('PROYEK:');
  if (!live.length) lines.push('- (belum ada proyek)');
  for (let i = 0; i < live.length; i++) {
    const p = live[i];
    const code = `P${i + 1}`;
    projects.set(code, p);
    const contract = p.contract_value || p.total_budget_planned || 0;
    lines.push(
      `[${code}] ${p.name} | klien ${p.client_name || '-'} | status ${p.status} | kontrak ${rp(contract)} | RAP ${rp(p.total_budget_planned)} | biaya ${rp(p.spent_amount)} | kas masuk ${rp(p.total_received)} | progres ${Math.round(p.progress_percentage)}% (rencana ${Math.round(p.planned_progress || 0)}%) | ${p.health_status}`,
    );
  }

  const active = live.filter(p => p.status === 'active' || p.status === 'planning').slice(0, 6);
  const wiLists = await Promise.all(active.map(p => safe(loadWorkItems(p.id), [] as WorkItem[])));
  const wiLines: string[] = [];
  active.forEach((p, idx) => {
    const code = [...projects.entries()].find(([, v]) => v.id === p.id)?.[0];
    wiLists[idx].slice(0, 12).forEach((wi, j) => {
      const wcode = `W${code?.slice(1)}.${j + 1}`;
      workItems.set(wcode, { projectId: p.id, item: wi });
      wiLines.push(`[${wcode}] ${code}: ${wi.name} ${Math.round(Number(wi.progress_pct) || 0)}%`);
    });
  });
  if (wiLines.length) lines.push('ITEM PEKERJAAN:', ...wiLines);

  const [memberList, pendingBons, todos, ests, items] = await Promise.all([
    safe(listMembers(env.orgId), [] as OrgMember[]),
    safe(listBonRequests(env.orgId, 'pending'), [] as BonRequest[]),
    safe(loadTodosForOrg(env.orgId), [] as PlannerTodo[]),
    safe(loadEstimations(env.orgId), [] as Estimation[]),
    safe(loadPricelistItems(env.orgId), []),
  ]);

  lines.push('TIM (HRD):');
  memberList.filter(m => m.status !== 'removed').slice(0, 30).forEach((m, i) => {
    const code = `E${i + 1}`;
    members.set(code, m);
    lines.push(`[${code}] ${m.profile?.name || 'Tanpa nama'} | ${m.role}${m.position ? ` | ${m.position}` : ''}`);
  });

  if (pendingBons.length) {
    lines.push('KASBON MENUNGGU:');
    pendingBons.slice(0, 15).forEach((b, i) => {
      const code = `B${i + 1}`;
      bons.set(code, b);
      lines.push(`[${code}] ${b.profiles?.name || b.user_id.slice(0, 6)} minta ${rp(b.amount)}${b.reason ? ` (${b.reason})` : ''}`);
    });
  }

  const openTodos = todos.filter(t => t.status === 'pending' || t.status === 'in_progress');
  if (openTodos.length) {
    lines.push(`TUGAS TERBUKA (${openTodos.length}):`);
    openTodos.slice(0, 10).forEach(t =>
      lines.push(`- ${t.title} | ${t.assignee_name || 'belum ditugaskan'} | ${t.project_name || '-'}${t.due_date ? ` | tempo ${t.due_date}` : ''}`),
    );
  }

  if (ests.length) {
    lines.push('ESTIMASI:');
    ests.slice(0, 10).forEach((e, i) => {
      const code = `EST${i + 1}`;
      estimations.set(code, e);
      lines.push(`[${code}] ${e.code} ${e.title} | ${e.customer_name || '-'} | ${e.status} | ${rp(e.total_selling_price)}`);
    });
  }

  if (items.length) {
    lines.push(`PRICELIST (${items.length} item, contoh):`);
    items.slice(0, 15).forEach((it, i) => {
      const code = `M${i + 1}`;
      pricelist.set(code, it.id);
      lines.push(`[${code}] ${it.name} | ${it.unit} | modal ${rp(it.base_cost)}`);
    });
  }

  return { text: lines.join('\n'), projects, members, bons, estimations, workItems, pricelist };
}

const SYSTEM_PROMPT = `Kamu adalah General Manager (GM) perusahaan kontraktor/proyek milik pengguna (Owner). Bicara bahasa Indonesia yang ringkas, hangat, dan tegas seperti manajer sungguhan.
Kamu memimpin 5 divisi: project (Proyek & Lapangan), finance (Keuangan), estimator (Estimator & QS), hr (HRD & Payroll), purchasing (Purchasing & master harga).
Kamu bisa: ngobrol, berdiskusi, memberi analisis/saran/simulasi, DAN mengeksekusi pekerjaan lewat aksi.

ATURAN:
1. Gunakan HANYA data pada KONTEKS. Rujuk entitas dengan kode ([P1], [E2], [B1], [W1.2], [EST1], [M3]). Jangan mengarang kode atau angka.
2. Jangan menghitung total rumit; berikan qty dan unitPrice atau total apa adanya dari Owner (angka Rupiah bulat, tanpa titik).
3. Jika Owner hanya bertanya/berdiskusi, actions = []. Jika data kurang (proyek tidak jelas), tanyakan di reply dan actions = [].
4. Boleh banyak aksi lintas divisi dalam satu respons.
5. Jawab HANYA JSON valid dengan bentuk:
{"reply":"...","delegations":[{"division":"finance","note":"..."}],"actions":[{"type":"...","params":{...},"summary":"..."}]}

JENIS AKSI & params:
- record_cost: {project:"P1", item:"Semen 10 sak", total:850000, qty?:10, unitPrice?:85000}
- record_income: {project:"P1", amount:5000000, category:"dp|termin|pelunasan|retensi|other", description:"..."}
- record_transfer: {fromProject?:"P1", toProject?:"P2", counterparty?:"Kas Kantor", amount:2000000, transferType?:"loan|repayment", description?:"..."}
- update_progress: {project:"P1", workItem:"W1.2", progress:60}
- add_worker_log: {project:"P1", workers:5}
- add_project: {name:"...", client:"...", location?:"..."}
- add_rap_item: {project:"P1", name:"HPL Taco", qty:10, unit:"lbr", unitPrice:185000, type?:"material|labor|equipment|subcontract|other"}
- add_work_item: {project:"P1", name:"Pemasangan Kabinet", plannedStart?:"YYYY-MM-DD", plannedEnd?:"YYYY-MM-DD", weight?:15}
- review_bon: {bon:"B1", decision:"approve|reject", reason?:"..."}
- assign_todo: {project:"P1", title:"...", assignee?:"E2", due?:"YYYY-MM-DD", priority?:"low|medium|high|urgent"}
- generate_payroll: {}
- add_employee: {name:"Budi Santoso", role?:"worker|staff|manager", phone?:"0812..."}
- record_attendance: {employee:"E2", type?:"check_in|check_out", project?:"P1", note?:"..."}
- upsert_pricelist: {name:"...", unit:"m2", baseCost:150000, marginPct?:20, category?:"material|upah|alat|jasa|borongan|other"}
- create_estimation: {title:"...", customer:"...", phone?:"..."}
- convert_estimation: {estimation:"EST1", projectName?:"..."}`;

export function buildMessages(
  context: ContextPack,
  history: { role: 'user' | 'assistant'; content: string }[],
  userText: string,
): ChatMessage[] {
  return [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nKONTEKS:\n${context.text}` },
    ...history.slice(-8).map(h => ({ role: h.role, content: h.content }) as ChatMessage),
    { role: 'user', content: userText },
  ];
}

const HIGH_RISK: ActionType[] = ['generate_payroll', 'add_project', 'convert_estimation'];

function actionAmount(a: { type: ActionType; params: Record<string, unknown> }): number {
  return Number(a.params.total ?? a.params.amount ?? 0) || 0;
}

function needsApproval(
  a: { type: ActionType; params: Record<string, unknown> },
  config: AIConfig,
): boolean {
  if (config.executionMode === 'review') return true;
  if (HIGH_RISK.includes(a.type)) return true;
  if (a.type === 'review_bon' && String(a.params.decision) === 'approve') return true;
  return actionAmount(a) > config.autoLimit;
}

let actionSeq = 0;

function normalizeActions(raw: unknown, config: AIConfig): AgentAction[] {
  if (!Array.isArray(raw)) return [];
  const out: AgentAction[] = [];
  for (const item of raw) {
    const r = item as { type?: string; params?: Record<string, unknown>; summary?: string };
    const type = r?.type as ActionType | undefined;
    if (!type || !(type in ACTION_DIVISION)) continue;
    const params = r.params && typeof r.params === 'object' ? r.params : {};
    out.push({
      id: `act-${Date.now()}-${actionSeq++}`,
      type,
      division: ACTION_DIVISION[type],
      params,
      summary: String(r.summary || type),
      needsApproval: needsApproval({ type, params }, config),
      status: 'pending',
    });
  }
  return out;
}

/** Briefing deterministik tanpa LLM — GM tetap berguna walau API key belum diisi. */
export function localBriefing(context: ContextPack): string {
  const parts: string[] = [];
  const ps = [...context.projects.entries()];
  if (!ps.length) return 'Belum ada proyek aktif. Mulai dengan membuat proyek atau estimasi baru.';
  parts.push(`Briefing ${ps.length} proyek:`);
  for (const [code, p] of ps.slice(0, 8)) {
    const contract = p.contract_value || p.total_budget_planned || 0;
    const margin = contract - p.spent_amount;
    const flag = p.spent_amount > p.total_budget_planned && p.total_budget_planned > 0 ? ' ⚠️ biaya melebihi RAP' : '';
    parts.push(`• [${code}] ${p.name}: progres ${Math.round(p.progress_percentage)}%, biaya ${rp(p.spent_amount)}, kas masuk ${rp(p.total_received)}, sisa kontrak-biaya ${rp(margin)}${flag}`);
  }
  if (context.bons.size) parts.push(`• ${context.bons.size} kasbon menunggu persetujuan.`);
  return parts.join('\n');
}

function parseIdrAmount(raw: string): number {
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*(juta|jt|ribu|rb|k)?/i);
  if (!m) return 0;
  const num = parseFloat(m[1].replace(',', '.'));
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'juta' || unit === 'jt') return Math.round(num * 1_000_000);
  if (unit === 'ribu' || unit === 'rb' || unit === 'k') return Math.round(num * 1_000);
  return Math.round(num);
}

/**
 * Orkestrasi lokal deterministik saat API key belum diisi atau mode offline:
 * Tetap bisa menjawab diskusi risiko proyek, simulasi kenaikan harga, kasbon,
 * maupun mengeksekusi perintah kerja ke 5 divisi.
 */
export function localSmartManagerTurn(
  context: ContextPack,
  userText: string,
  config: AIConfig,
): ManagerTurn {
  const lower = userText.toLowerCase();
  const firstProj = [...context.projects.entries()][0];
  const delegations: { division: DivisionId; note: string }[] = [];
  const rawActions: { type: ActionType; params: Record<string, unknown>; summary: string }[] = [];

  if (/simulasi|naik\s*\d+\s*%/i.test(lower)) {
    const pctMatch = lower.match(/(\d+)\s*%/);
    const pct = pctMatch ? Number(pctMatch[1]) : 10;
    const lines: string[] = [`Simulasi dampak kenaikan biaya sebesar ${pct}% terhadap portofolio proyek aktif:`];
    for (const [code, p] of context.projects.entries()) {
      const contract = p.contract_value || p.total_budget_planned || 0;
      const remainingRap = Math.max(0, p.total_budget_planned - p.spent_amount);
      const extraCost = Math.round(remainingRap * (pct / 100));
      const newMargin = contract - (p.spent_amount + remainingRap + extraCost);
      lines.push(`• [${code}] ${p.name}: beban tambahan ±${rp(extraCost)} → estimasi sisa margin menjadi ${rp(newMargin)}`);
    }
    delegations.push(
      { division: 'estimator', note: `Menghitung sensitivitas kenaikan HPP +${pct}% pada sisa RAP.` },
      { division: 'finance', note: 'Mengecek cadangan arus kas proyek terhadap potensi pembengkakan biaya.' },
    );
    return { reply: lines.join('\n'), delegations, actions: [] };
  }

  if (/risiko|rugi|over\s*budget|bahaya/i.test(lower)) {
    const risky = [...context.projects.entries()].filter(
      ([, p]) => p.spent_amount > p.total_budget_planned || p.health_status === 'behind' || p.health_status === 'at_risk',
    );
    delegations.push(
      { division: 'finance', note: 'Memeriksa rasio realisasi biaya terhadap RAP.' },
      { division: 'project', note: 'Memeriksa deviasi progres fisik di lapangan.' },
    );
    if (!risky.length) {
      return {
        reply: 'Saat ini seluruh proyek masih berada di dalam batas aman RAP dan jadwal. Namun tetap pantau item material utama agar margin terjaga.',
        delegations,
        actions: [],
      };
    }
    return {
      reply: [
        `Ada ${risky.length} proyek yang perlu perhatian khusus:`,
        ...risky.map(([c, p]) => `• [${c}] ${p.name} — Biaya ${rp(p.spent_amount)} dari RAP ${rp(p.total_budget_planned)} (Progres ${Math.round(p.progress_percentage)}%)`),
      ].join('\n'),
      delegations,
      actions: [],
    };
  }

  if (/kasbon|bon\b/i.test(lower)) {
    delegations.push({ division: 'hr', note: `Mengecek ${context.bons.size} antrean pengajuan kasbon.` });
    if (!context.bons.size) {
      return { reply: 'Laporan dari HRD: Tidak ada pengajuan kasbon yang menggantung saat ini.', delegations, actions: [] };
    }
    if (/setuju|approve|acc/i.test(lower)) {
      const [bCode, b] = [...context.bons.entries()][0];
      rawActions.push({
        type: 'review_bon',
        params: { bon: bCode, decision: 'approve' },
        summary: `Setujui kasbon ${b.profiles?.name || bCode} sebesar ${rp(b.amount)}`,
      });
    }
    const list = [...context.bons.entries()].map(([c, b]) => `• [${c}] ${b.profiles?.name || 'Anggota'}: ${rp(b.amount)} (${b.reason || 'tanpa keterangan'})`);
    return {
      reply: `Berikut daftar kasbon menunggu keputusan:\n${list.join('\n')}`,
      delegations,
      actions: normalizeActions(rawActions, config),
    };
  }

  // Deteksi perintah tulis pengeluaran (misal: "catat beli semen 850rb")
  if (/(?:catat|beli|bayar)\s+(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)/i.test(userText) && firstProj) {
    const m = userText.match(/(?:catat|beli|bayar)\s+(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)/i)!;
    const amount = parseIdrAmount(m[2]);
    if (amount > 0) {
      delegations.push({ division: 'finance', note: `Menyiapkan pencatatan realisasi biaya ke [${firstProj[0]}] ${firstProj[1].name}.` });
      rawActions.push({
        type: 'record_cost',
        params: { project: firstProj[0], item: m[1].trim(), total: amount },
        summary: `Catat pengeluaran "${m[1].trim()}" ${rp(amount)} di ${firstProj[1].name}`,
      });
    }
  }

  // Deteksi perintah tambah tugas/todo
  if (/(?:tugaskan|buat tugas|todo)\s+(.+)/i.test(userText) && firstProj) {
    const m = userText.match(/(?:tugaskan|buat tugas|todo)\s+(.+)/i)!;
    delegations.push({ division: 'hr', note: 'Menyiapkan delegasi tugas anggota tim.' });
    rawActions.push({
      type: 'assign_todo',
      params: { project: firstProj[0], title: m[1].trim(), priority: 'medium' },
      summary: `Delegasikan tugas "${m[1].trim()}" pada proyek ${firstProj[1].name}`,
    });
  }

  if (rawActions.length) {
    return {
      reply: 'Siap, saya sudah koordinasikan instruksi Anda ke kepala divisi terkait. Silakan tinjau atau eksekusi tugas di bawah:',
      delegations,
      actions: normalizeActions(rawActions, config),
    };
  }

  delegations.push(
    { division: 'project', note: `Memantau ${context.projects.size} proyek aktif.` },
    { division: 'finance', note: 'Rekapitulasi kas masuk & realisasi biaya.' },
    { division: 'hr', note: `${context.members.size} personel terdaftar, ${context.bons.size} kasbon pending.` },
  );
  return {
    reply: `${localBriefing(context)}\n\n💡 Tips: Masukkan API Key (OpenRouter / Gemini / Groq / Claude / OpenAI) di Pengaturan → AI & API Key agar saya bisa berdiskusi bebas dan mengorkestrasi instruksi kompleks dengan model AI pilihan Anda.`,
    delegations,
    actions: [],
  };
}

export async function runManagerTurn(
  context: ContextPack,
  history: { role: 'user' | 'assistant'; content: string }[],
  userText: string,
  config: AIConfig,
): Promise<ManagerTurn> {
  if (!hasActiveKey(config)) {
    return localSmartManagerTurn(context, userText, config);
  }
  const messages = buildMessages(context, history, userText);
  let text = await callUnifiedAI(messages, { json: true, maxTokens: 1800 }, config);
  let parsed = extractJson<{ reply?: string; delegations?: unknown; actions?: unknown }>(text);
  if (!parsed) {
    // Satu kali perbaikan untuk model kecil yang keluar dari format.
    text = await callUnifiedAI(
      [...messages, { role: 'assistant', content: text }, { role: 'user', content: 'Format salah. Balas ulang HANYA JSON valid sesuai skema.' }],
      { json: true, maxTokens: 1800, temperature: 0 },
      config,
    );
    parsed = extractJson(text);
  }
  if (!parsed) return { reply: text.trim() || 'Maaf, saya belum bisa memproses itu.', delegations: [], actions: [] };

  const delegations = Array.isArray(parsed.delegations)
    ? (parsed.delegations as { division?: string; note?: string }[])
        .filter(d => d?.division && d.division in DIVISIONS)
        .map(d => ({ division: d.division as DivisionId, note: String(d.note || '') }))
    : [];
  return {
    reply: String(parsed.reply || '').trim() || 'Baik.',
    delegations,
    actions: normalizeActions(parsed.actions, config),
  };
}

// ───────────────────────── Executor ─────────────────────────

function resolveProject(ref: unknown, ctx: ContextPack, env: ManagerEnv): Project | null {
  const s = String(ref ?? '').trim().replace(/[\[\]]/g, '');
  if (!s) return env.currentProject ?? (env.projects.length === 1 ? env.projects[0] : null);
  const byCode = ctx.projects.get(s.toUpperCase());
  if (byCode) return byCode;
  const lower = s.toLowerCase();
  return (
    env.projects.find(p => p.name.toLowerCase() === lower) ||
    env.projects.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())) ||
    null
  );
}

function resolveMember(ref: unknown, ctx: ContextPack): OrgMember | null {
  const s = String(ref ?? '').trim().replace(/[\[\]]/g, '');
  if (!s) return null;
  const byCode = ctx.members.get(s.toUpperCase());
  if (byCode) return byCode;
  const lower = s.toLowerCase();
  for (const m of ctx.members.values()) {
    const n = (m.profile?.name || '').toLowerCase();
    if (n && (n === lower || n.includes(lower))) return m;
  }
  return null;
}

export interface ExecResult {
  ok: boolean;
  message: string;
  navigateTo?: string;
}

async function runIntent(
  intent: string,
  params: Record<string, unknown>,
  project: Project | null,
  env: ManagerEnv,
  workItems: WorkItem[] = [],
): Promise<ExecResult> {
  const cmd: ParsedCommand = { intent, params, confidence: 1, raw: intent };
  const ictx: IntentContext = {
    userId: env.userId,
    orgId: env.orgId,
    projects: env.projects,
    currentProject: project,
    workItems,
    onNavigate: env.onNavigate,
    onRefreshProjects: env.onRefreshProjects,
    loadWorkItemsForProject: loadWorkItems,
  };
  const r = await executeIntent(cmd, ictx);
  return { ok: r.success, message: [r.message, r.details].filter(Boolean).join(' — '), navigateTo: r.navigateTo };
}

export async function executeAgentAction(
  action: AgentAction,
  ctx: ContextPack,
  env: ManagerEnv,
): Promise<ExecResult> {
  const p = action.params;
  try {
    switch (action.type) {
      case 'record_cost': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek tidak jelas — sebutkan proyeknya.' };
        const total = Number(p.total) || (Number(p.qty) || 0) * (Number(p.unitPrice) || 0);
        if (total <= 0) return { ok: false, message: 'Nominal biaya tidak valid.' };
        return runIntent('record_cost', {
          item: String(p.item || 'Pembelian'),
          total,
          qty: p.qty != null ? Number(p.qty) : null,
          unitPrice: p.unitPrice != null ? Number(p.unitPrice) : null,
        }, project, env);
      }
      case 'record_income': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek tidak jelas — sebutkan proyeknya.' };
        return runIntent('record_income', {
          total: Number(p.amount ?? p.total) || 0,
          category: String(p.category || 'other'),
          item: String(p.description || 'Penerimaan klien'),
        }, project, env);
      }
      case 'update_progress': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek tidak jelas.' };
        const ref = String(p.workItem ?? '').replace(/[\[\]]/g, '');
        const byCode = ctx.workItems.get(ref.toUpperCase());
        const name = byCode ? byCode.item.name : ref;
        return runIntent('update_progress', { workItem: name, progress: Number(p.progress) || 0 }, project, env);
      }
      case 'add_worker_log': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek tidak jelas.' };
        return runIntent('add_worker_log', { workers: Number(p.workers) || 0 }, project, env);
      }
      case 'add_project': {
        const name = String(p.name || '').trim();
        if (!name) return { ok: false, message: 'Nama proyek wajib.' };
        const end = new Date();
        end.setMonth(end.getMonth() + 3);
        const created = await createProject({
          org_id: env.orgId,
          created_by: env.userId,
          name,
          client_name: String(p.client || ''),
          location: String(p.location || ''),
          description: '',
          start_date: todayStr(),
          end_date: end.toISOString().slice(0, 10),
          status: 'planning',
        });
        await env.onRefreshProjects();
        return { ok: true, message: `Proyek "${created.name}" dibuat.`, navigateTo: `/app/projects/${created.id}` };
      }
      case 'review_bon': {
        const bon = ctx.bons.get(String(p.bon ?? '').replace(/[\[\]]/g, '').toUpperCase());
        if (!bon) return { ok: false, message: 'Kasbon tidak ditemukan.' };
        const approve = String(p.decision) === 'approve';
        await reviewBonRequest(bon.id, approve ? 'approved' : 'rejected', env.userId, approve ? undefined : String(p.reason || 'Ditolak'), {
          orgId: env.orgId,
          actorId: env.userId,
        });
        return { ok: true, message: `Kasbon ${bon.profiles?.name || ''} ${rp(bon.amount)} ${approve ? 'disetujui' : 'ditolak'}.` };
      }
      case 'assign_todo': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek tidak jelas.' };
        const title = String(p.title || '').trim();
        if (!title) return { ok: false, message: 'Judul tugas kosong.' };
        const member = resolveMember(p.assignee, ctx);
        const prio = ['low', 'medium', 'high', 'urgent'].includes(String(p.priority)) ? String(p.priority) : 'medium';
        const due = /^\d{4}-\d{2}-\d{2}$/.test(String(p.due || '')) ? String(p.due) : null;
        await createTodo({
          org_id: env.orgId,
          project_id: project.id,
          title,
          priority: prio as PlannerTodo['priority'],
          assigned_member_id: member?.id ?? null,
          assigned_user_id: member?.user_id ?? null,
          due_date: due,
          created_by: env.userId,
        });
        return { ok: true, message: `Tugas "${title}" dibuat${member ? ` untuk ${member.profile?.name}` : ''} (${project.name}).` };
      }
      case 'generate_payroll': {
        const members = [...ctx.members.values()].map(m => ({ id: m.id, user_id: m.user_id, role: m.role }));
        const rows = await generatePayrollForOrg(env.orgId, members);
        return { ok: true, message: `Draf payroll dibuat untuk ${rows.length} anggota.`, navigateTo: '/app?tab=hr' };
      }
      case 'upsert_pricelist': {
        const name = String(p.name || '').trim();
        const baseCost = Number(p.baseCost) || 0;
        if (!name || baseCost <= 0) return { ok: false, message: 'Nama & harga modal wajib.' };
        const margin = p.marginPct != null ? Number(p.marginPct) : 20;
        const existing = (await loadPricelistItems(env.orgId, false)).find(i => i.name.toLowerCase() === name.toLowerCase());
        const selling = calcPricelistSelling(baseCost, margin);
        if (existing) {
          await updatePricelistItem(existing.id, { base_cost: baseCost, default_margin_pct: margin, selling_price: selling });
          return { ok: true, message: `Harga "${name}" diperbarui: modal ${rp(baseCost)}.` };
        }
        const cats: PricelistCategory[] = ['material', 'upah', 'alat', 'jasa', 'borongan', 'other'];
        await createPricelistItem({
          org_id: env.orgId,
          name,
          product: null,
          category: (cats.includes(String(p.category) as PricelistCategory) ? String(p.category) : 'material') as PricelistCategory,
          unit: String(p.unit || 'ls'),
          base_cost: baseCost,
          default_margin_pct: margin,
          selling_price: selling,
          notes: null,
          is_active: true,
          created_by: env.userId,
        });
        return { ok: true, message: `Item pricelist "${name}" ditambahkan (${rp(baseCost)}).` };
      }
      case 'create_estimation': {
        const customer = String(p.customer || '').trim();
        if (!customer) return { ok: false, message: 'Nama customer wajib.' };
        return runIntent('create_lead', {
          target: 'estimation',
          customer_name: customer,
          customer_phone: String(p.phone || '-'),
          need: String(p.title || 'Estimasi baru'),
        }, null, env);
      }
      case 'convert_estimation': {
        const ref = String(p.estimation ?? '').replace(/[\[\]]/g, '').toUpperCase();
        const est = ctx.estimations.get(ref);
        return runIntent('convert_estimation', {
          estimation: est ? est.id : String(p.estimation || ''),
          projectName: p.projectName,
        }, null, env);
      }
      case 'record_transfer': {
        const fromProj = p.fromProject ? resolveProject(p.fromProject, ctx, env) : null;
        const toProj = p.toProject ? resolveProject(p.toProject, ctx, env) : null;
        return runIntent('record_transfer', {
          fromProject: fromProj?.name || p.fromProject,
          toProject: toProj?.name || p.toProject,
          counterparty: p.counterparty,
          amount: Number(p.amount ?? p.total) || 0,
          transferType: p.transferType,
          description: p.description,
        }, fromProj || toProj, env);
      }
      case 'add_rap_item': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek tidak jelas — sebutkan proyeknya.' };
        return runIntent('add_rap_item', p, project, env);
      }
      case 'add_work_item': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek tidak jelas — sebutkan proyeknya.' };
        return runIntent('add_work_item', p, project, env);
      }
      case 'add_employee': {
        return runIntent('add_employee', p, null, env);
      }
      case 'record_attendance': {
        const project = p.project ? resolveProject(p.project, ctx, env) : env.currentProject;
        const member = resolveMember(p.employee, ctx);
        return runIntent('record_attendance', {
          ...p,
          employee: member?.profile?.name || p.employee,
        }, project, env);
      }
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Gagal mengeksekusi aksi' };
  }
  return { ok: false, message: 'Aksi tidak dikenali.' };
}

