/**
 * Manager Agent: General Manager yang mengorkestrasi 5 divisi operasional
 * (Proyek & Lapangan, Keuangan & Akuntansi, Estimator & QS, HRD & Payroll, Purchasing & Logistik).
 * - Compact Context Pack: snapshot ringkas dengan kode pendek ([P1], [R1.1], [W1.1], [E1], [B1], [T1], [EST1], [M1]).
 * - Dual output: balasan luwes + log koordinasi divisi + daftar aksi lintas modul + saran tindak lanjut.
 * - Deterministic executor + Hybrid Multi-Clause Parser: memastikan model murah sekalipun selalu akurat mengeksekusi perintah.
 */
import { formatCurrency, todayStr } from '../lib/adapters';
import { executeIntent, type IntentContext } from '../lib/intentExecutor';
import type { ParsedCommand } from '../lib/commandParser';
import type { Project } from '../store/appStore';
import { loadWorkItems, type WorkItem } from './workItemService';
import { loadRapItems, type RapItem } from './rapService';
import { listMembers } from './memberService';
import { listBonRequests, reviewBonRequest, generatePayrollForOrg, type BonRequest } from './payrollService';
import { loadTodosForOrg, createTodo, toggleTodoDone } from './todoService';
import { createEstimation, generateEstimationCode, loadEstimations, newEstimationDraft } from './estimatorService';
import { calcItemRow, emptyItem } from '../lib/estimatorCalc';
import { createPricelistItem, loadPricelistItems, updatePricelistItem, calcPricelistSelling } from './pricelistService';
import { createProject, updateProject } from './projectService';
import type { OrgMember } from '../types/onboarding';
import type { Estimation, PricelistCategory } from '../types/estimator';
import type { PlannerTodo } from '../types/plannerTodo';
import {
  callUnifiedAI,
  extractJson,
  cleanRawAssistantReply,
  hasActiveKey,
  type AIConfig,
  type ChatMessage,
} from './aiProviderService';

export type DivisionId = 'manager' | 'project' | 'finance' | 'estimator' | 'hr' | 'purchasing';

export const DIVISIONS: Record<
  DivisionId,
  { label: string; headName: string; role: string; emoji: string; accent: string }
> = {
  manager: {
    label: 'General Manager',
    headName: 'GM Operasional',
    role: 'Orkestrator & Penasihat Strategis Owner',
    emoji: '👔',
    accent: 'emerald',
  },
  project: {
    label: 'Proyek & Lapangan',
    headName: 'Pak Raka (Site Manager)',
    role: 'RAP, Jadwal Gantt, Progres Fisik & Log Tukang',
    emoji: '👷',
    accent: 'blue',
  },
  finance: {
    label: 'Keuangan',
    headName: 'Bu Sinta (Kepala Keuangan)',
    role: 'Arus Kas, Realisasi Biaya, Termin & Transfer',
    emoji: '💰',
    accent: 'amber',
  },
  estimator: {
    label: 'Estimator & QS',
    headName: 'Pak Dimas (Quantity Surveyor)',
    role: 'Kalkulasi RAB, Margin & Konversi Proyek',
    emoji: '📐',
    accent: 'purple',
  },
  hr: {
    label: 'HRD & Payroll',
    headName: 'Bu Nadia (Kepala HRD)',
    role: 'Personel, Absensi, Kasbon, Gaji & Tugas Tim',
    emoji: '👥',
    accent: 'rose',
  },
  purchasing: {
    label: 'Purchasing',
    headName: 'Pak Hendra (Logistik)',
    role: 'Harga Material Master, Upah & Supplier',
    emoji: '📦',
    accent: 'teal',
  },
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
  | 'update_project_status'
  | 'review_bon'
  | 'assign_todo'
  | 'complete_todo'
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
  update_project_status: 'project',
  review_bon: 'hr',
  assign_todo: 'hr',
  complete_todo: 'hr',
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

export interface DelegationReport {
  division: DivisionId;
  note: string;
  status?: 'working' | 'done' | 'standby';
}

export interface ManagerTurn {
  reply: string;
  delegations: DelegationReport[];
  actions: AgentAction[];
  followUps?: string[];
}

export interface ContextPack {
  text: string;
  projects: Map<string, Project>;
  members: Map<string, OrgMember>;
  bons: Map<string, BonRequest>;
  todos: Map<string, PlannerTodo>;
  estimations: Map<string, Estimation>;
  workItems: Map<string, { projectId: string; item: WorkItem }>;
  rapItems: Map<string, { projectId: string; item: RapItem }>;
  pricelist: Map<string, string>;
  activeProjectCode: string | null;
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
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export async function buildContextPack(env: ManagerEnv): Promise<ContextPack> {
  const projects = new Map<string, Project>();
  const members = new Map<string, OrgMember>();
  const bons = new Map<string, BonRequest>();
  const todos = new Map<string, PlannerTodo>();
  const estimations = new Map<string, Estimation>();
  const workItems = new Map<string, { projectId: string; item: WorkItem }>();
  const rapItems = new Map<string, { projectId: string; item: RapItem }>();
  const pricelist = new Map<string, string>();
  let activeProjectCode: string | null = null;

  const lines: string[] = [`Tanggal: ${todayStr()}. Owner: ${env.userName}.`];

  const live = env.projects.filter(p => p.status !== 'archived');
  lines.push('PORTFOLIO PROYEK:');
  if (!live.length) lines.push('- (belum ada proyek)');
  for (let i = 0; i < live.length; i++) {
    const p = live[i];
    const code = `P${i + 1}`;
    projects.set(code, p);
    const isActive = env.currentProject?.id === p.id;
    if (isActive) activeProjectCode = code;
    const contract = p.contract_value || p.total_budget_planned || 0;
    const cashBalance = (p.total_received || 0) - (p.spent_amount || 0);
    lines.push(
      `[${code}]${isActive ? ' (PROYEK SEDANG DIBUKA)' : ''} ${p.name} | klien: ${p.client_name || '-'} | status: ${p.status} | kontrak: ${rp(contract)} | RAP: ${rp(p.total_budget_planned)} | realisasi biaya: ${rp(p.spent_amount)} | dana masuk: ${rp(p.total_received)} | saldo kas proyek: ${rp(cashBalance)} | progres fisik: ${Math.round(p.progress_percentage)}% (target ${Math.round(p.planned_progress || 0)}%) | kondisi: ${p.health_status}`,
    );
  }
  if (!activeProjectCode && projects.size > 0) {
    activeProjectCode = 'P1';
  }

  const active = live.filter(p => p.status === 'active' || p.status === 'planning').slice(0, 6);
  const [wiLists, rapLists] = await Promise.all([
    Promise.all(active.map(p => safe(loadWorkItems(p.id), [] as WorkItem[]))),
    Promise.all(active.map(p => safe(loadRapItems(p.id), [] as RapItem[]))),
  ]);

  const rapLines: string[] = [];
  active.forEach((p, idx) => {
    const code = [...projects.entries()].find(([, v]) => v.id === p.id)?.[0];
    rapLists[idx].slice(0, 12).forEach((ri, j) => {
      const rcode = `R${code?.slice(1)}.${j + 1}`;
      rapItems.set(rcode, { projectId: p.id, item: ri });
      const sub = (Number(ri.quantity) || 0) * (Number(ri.unit_price) || 0);
      rapLines.push(`[${rcode}] ${code}: ${ri.name} (${ri.quantity} ${ri.unit} × ${rp(ri.unit_price)} = ${rp(sub)})`);
    });
  });
  if (rapLines.length) lines.push('ITEM ANGGARAN RAP:', ...rapLines);

  const wiLines: string[] = [];
  active.forEach((p, idx) => {
    const code = [...projects.entries()].find(([, v]) => v.id === p.id)?.[0];
    wiLists[idx].slice(0, 12).forEach((wi, j) => {
      const wcode = `W${code?.slice(1)}.${j + 1}`;
      workItems.set(wcode, { projectId: p.id, item: wi });
      wiLines.push(`[${wcode}] ${code}: ${wi.name} — progres ${Math.round(Number(wi.progress_pct) || 0)}%`);
    });
  });
  if (wiLines.length) lines.push('ITEM PEKERJAAN / JADWAL LAPANGAN:', ...wiLines);

  const [memberList, pendingBons, todoList, ests, items] = await Promise.all([
    safe(listMembers(env.orgId), [] as OrgMember[]),
    safe(listBonRequests(env.orgId, 'pending'), [] as BonRequest[]),
    safe(loadTodosForOrg(env.orgId), [] as PlannerTodo[]),
    safe(loadEstimations(env.orgId), [] as Estimation[]),
    safe(loadPricelistItems(env.orgId), []),
  ]);

  lines.push('TIM & KARYAWAN (HRD):');
  const activeMembers = memberList.filter(m => m.status !== 'removed').slice(0, 30);
  if (!activeMembers.length) lines.push('- (belum ada anggota tim terdaftar)');
  activeMembers.forEach((m, i) => {
    const code = `E${i + 1}`;
    members.set(code, m);
    lines.push(`[${code}] ${m.profile?.name || 'Tanpa nama'} | role: ${m.role}${m.position ? ` | posisi: ${m.position}` : ''}`);
  });

  if (pendingBons.length) {
    lines.push('PENGAJUAN KASBON MENUNGGU KEPUTUSAN:');
    pendingBons.slice(0, 15).forEach((b, i) => {
      const code = `B${i + 1}`;
      bons.set(code, b);
      lines.push(`[${code}] ${b.profiles?.name || b.user_id.slice(0, 6)} mengajukan ${rp(b.amount)}${b.reason ? ` (${b.reason})` : ''}`);
    });
  }

  const openTodos = todoList.filter(t => t.status === 'pending' || t.status === 'in_progress');
  if (openTodos.length) {
    lines.push(`TUGAS TIM AKTIF (${openTodos.length}):`);
    openTodos.slice(0, 12).forEach((t, i) => {
      const code = `T${i + 1}`;
      todos.set(code, t);
      lines.push(`[${code}] ${t.title} | PIC: ${t.assignee_name || 'belum ditugaskan'} | proyek: ${t.project_name || '-'}${t.due_date ? ` | tenggat: ${t.due_date}` : ''}`);
    });
  }

  if (ests.length) {
    lines.push('DAFTAR ESTIMASI RAB (QS):');
    ests.slice(0, 10).forEach((e, i) => {
      const code = `EST${i + 1}`;
      estimations.set(code, e);
      lines.push(`[${code}] ${e.code} "${e.title}" | klien: ${e.customer_name || '-'} | status: ${e.status} | nilai jual: ${rp(e.total_selling_price)} | HPP: ${rp(e.subtotal_hpp)}`);
    });
  }

  if (items.length) {
    lines.push(`DATABASE MASTER HARGA (${items.length} item, sampel):`);
    items.slice(0, 15).forEach((it, i) => {
      const code = `M${i + 1}`;
      pricelist.set(code, it.id);
      lines.push(`[${code}] ${it.name} | satuan: ${it.unit} | HPP: ${rp(it.base_cost)} | harga jual: ${rp(it.selling_price)}`);
    });
  }

  return {
    text: lines.join('\n'),
    projects,
    members,
    bons,
    todos,
    estimations,
    workItems,
    rapItems,
    pricelist,
    activeProjectCode,
  };
}

const SYSTEM_PROMPT = `Kamu adalah General Manager (GM Operasional) tangan kanan Owner di perusahaan kontraktor & manajemen proyek.
Gaya bicaramu:
- Luwes, hangat, cerdas, solutif, dan terasa hidup seperti berdiskusi dengan GM manusia berpengalaman (bukan robot kaku).
- Saat Owner mengajak ngobrol, curhat bisnis, minta pendapat, atau tanya strategi: jawab dengan analisis tajam berdasarkan angka nyata di KONTEKS (sebut nama proyek, progres, sisa RAP, saldo kas, atau tim yang relevan), lalu beri rekomendasi konkret.
- Saat Owner memberi perintah kerja (satu perintah maupun banyak perintah sekaligus): kamu LANGSUNG mengoordinasikan 5 Kepala Divisi di bawahmu dan menyusun daftar actions yang lengkap untuk dieksekusi ke aplikasi!

TIM KEPALA DIVISI DI BAWAHMU:
1. project — Pak Raka (Site Manager / Lapangan): mengelola proyek, item anggaran RAP, jadwal kerja Gantt, progres fisik, dan log harian tukang.
2. finance — Bu Sinta (Kepala Keuangan): mencatat pengeluaran/biaya, uang masuk/termin klien, transfer kas antar proyek, dan memantau arus kas vs RAP.
3. estimator — Pak Dimas (Estimator & QS): menyusun estimasi RAB baru, simulasi kenaikan harga material, dan konversi estimasi menjadi proyek aktif.
4. hr — Bu Nadia (Kepala HRD & Payroll): mengelola data tukang/karyawan, absensi harian, persetujuan kasbon (bon), delegasi tugas tim (todo), dan pembuatan draf slip gaji (payroll).
5. purchasing — Pak Hendra (Purchasing & Logistik): memperbarui database master harga material, upah, dan peralatan.

ATURAN PENTING:
1. Rujuk entitas dari KONTEKS menggunakan kode pendek ([P1], [W1.1], [R1.1], [E1], [B1], [T1], [EST1], [M1]) atau namanya. Jika Owner tidak menyebut nama proyek, gunakan proyek yang bertanda (PROYEK SEDANG DIBUKA) atau [P1].
2. Jika dalam 1 kalimat Owner meminta beberapa hal sekaligus (misal: catat biaya + update progres + tambah tugas + absen tukang), masukkan SEMUA ke dalam array "actions" dan tampilkan koordinasi tiap divisi di "delegations".
3. Selalu isi "delegations" (minimal 1-3 divisi yang relevan) dengan kalimat aktif yang menunjukkan apa yang sedang dicek/dikerjakan Kepala Divisi tersebut untuk Owner.
4. Selalu isi "followUps" dengan 2-3 kalimat pendek yang bisa diklik Owner sebagai langkah/pertanyaan lanjutan.
5. Jawab HANYA JSON valid dengan struktur:
{
  "reply": "Narasi GM yang luwes, jelas, dan berbobot...",
  "delegations": [
    {"division": "finance", "note": "Bu Sinta sedang mencatat pengeluaran ke buku kas proyek & memotong sisa RAP..."},
    {"division": "project", "note": "Pak Raka memperbarui persentase progres fisik di jadwal lapangan..."}
  ],
  "actions": [
    {"type": "record_cost", "params": {"project": "P1", "item": "Semen 10 sak", "total": 650000, "qty": 10, "unitPrice": 65000}, "summary": "Catat biaya Semen 10 sak Rp 650.000 di proyek P1"}
  ],
  "followUps": [
    "Cek sisa anggaran RAP proyek ini",
    "Update progres pekerjaan lapangan hari ini"
  ]
}

DAFTAR JENIS AKSI ("type") & "params":
- record_cost: {project:"P1", item:"Semen Gresik", total:650000, qty?:10, unit?:"sak", unitPrice?:65000}
- record_income: {project:"P1", amount:15000000, category:"dp|termin|pelunasan|retensi|other", description:"Termin 1 dari klien"}
- record_transfer: {fromProject?:"P1", toProject?:"P2", counterparty?:"Kas Kantor", amount:2000000, transferType?:"loan|repayment", description?:"Talangan material"}
- update_progress: {project:"P1", workItem:"W1.1 atau nama pekerjaan", progress:65}
- add_worker_log: {project:"P1", workers:6}
- add_project: {name:"Renovasi Ruko Kemang", client:"Pak Hendro", location?:"Jakarta Selatan"}
- update_project_status: {project:"P1", status:"planning|active|on_hold|completed"}
- add_rap_item: {project:"P1", name:"Besi Beton 10mm", qty:50, unit:"btg", unitPrice:85000, type?:"material|labor|equipment|subcontract|other"}
- add_work_item: {project:"P1", name:"Pekerjaan Atap Baja Ringan", plannedStart?:"YYYY-MM-DD", plannedEnd?:"YYYY-MM-DD", weight?:15}
- review_bon: {bon:"B1", decision:"approve|reject", reason?:"Disetujui GM"}
- assign_todo: {project:"P1", title:"Cek pengiriman keramik", assignee?:"E1 atau nama", due?:"YYYY-MM-DD", priority?:"low|medium|high|urgent"}
- complete_todo: {todo:"T1 atau judul tugas"}
- generate_payroll: {}
- add_employee: {name:"Kang Dedi", role?:"worker|staff|manager", phone?:"0812..."}
- record_attendance: {employee:"E1 atau nama", type?:"check_in|check_out", project?:"P1", note?:"Hadir tepat waktu"}
- upsert_pricelist: {name:"HPL Taco Motif Kayu", unit:"lbr", baseCost:185000, marginPct?:20, category?:"material|upah|alat|jasa|borongan|other"}
- create_estimation: {title:"Interior Kitchen Set", customer:"Bu Rina", phone?:"0811...", items?:[{name:"Kabinet Atas", qty:4, unit:"m1", unitPrice:2200000}]}
- convert_estimation: {estimation:"EST1", projectName?:"Proyek Kitchen Set Bu Rina"}`;

export function buildMessages(
  context: ContextPack,
  history: { role: 'user' | 'assistant'; content: string }[],
  userText: string,
): ChatMessage[] {
  return [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\nKONTEKS PERUSAHAAN SAAT INI:\n${context.text}` },
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content }) as ChatMessage),
    { role: 'user', content: userText },
  ];
}

const HIGH_RISK: ActionType[] = ['generate_payroll', 'add_project', 'convert_estimation'];

function actionAmount(a: { type: ActionType; params: Record<string, unknown> }): number {
  const direct = Number(a.params.total ?? a.params.amount ?? 0) || 0;
  if (direct > 0) return direct;
  const qty = Number(a.params.qty) || 0;
  const unitPrice = Number(a.params.unitPrice) || 0;
  return qty > 0 && unitPrice > 0 ? qty * unitPrice : 0;
}

function needsApproval(
  a: { type: ActionType; params: Record<string, unknown> },
  config: AIConfig,
): boolean {
  if (config.executionMode === 'review') return true;
  if (HIGH_RISK.includes(a.type)) return true;
  if (a.type === 'review_bon' && String(a.params.decision) === 'approve' && actionAmount(a) > config.autoLimit) {
    return true;
  }
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

/** Briefing deterministik yang komunikatif dan tajam. */
export function localBriefing(context: ContextPack): string {
  const parts: string[] = [];
  const ps = [...context.projects.entries()];
  if (!ps.length) {
    return 'Saat ini belum ada proyek aktif di portofolio kita. Anda bisa meminta saya membuat proyek baru (misal: *"Buat proyek Renovasi Rumah Pak Budi"*) atau menyiapkan estimasi RAB terlebih dahulu.';
  }
  const totalContract = ps.reduce((s, [, p]) => s + (p.contract_value || p.total_budget_planned || 0), 0);
  const totalSpent = ps.reduce((s, [, p]) => s + (p.spent_amount || 0), 0);
  const totalReceived = ps.reduce((s, [, p]) => s + (p.total_received || 0), 0);

  parts.push(
    `Laporan eksekutif portofolio (${ps.length} proyek aktif — Total Kontrak ${rp(totalContract)}, Dana Masuk ${rp(totalReceived)}, Realisasi Biaya ${rp(totalSpent)}):`,
  );
  for (const [code, p] of ps.slice(0, 8)) {
    const contract = p.contract_value || p.total_budget_planned || 0;
    const margin = contract - p.spent_amount;
    const cash = (p.total_received || 0) - (p.spent_amount || 0);
    const flag =
      p.spent_amount > p.total_budget_planned && p.total_budget_planned > 0
        ? ' ⚠️ Over-RAP'
        : cash < 0
          ? ' 💡 Kas defisit (butuh termin)'
          : ' ✅ Sehat';
    parts.push(
      `• [${code}] ${p.name}: Fisik ${Math.round(p.progress_percentage)}% | Biaya ${rp(p.spent_amount)} dari RAP ${rp(p.total_budget_planned)} | Kas Proyek ${rp(cash)} | Est. Sisa Margin ${rp(margin)}${flag}`,
    );
  }
  if (context.bons.size) {
    parts.push(`\n📌 Catatan HRD: Ada ${context.bons.size} pengajuan kasbon yang menunggu keputusan Anda.`);
  }
  if (context.todos.size) {
    parts.push(`📌 Catatan Tim: Ada ${context.todos.size} tugas aktif yang sedang berjalan.`);
  }
  return parts.join('\n');
}

function parseIdrAmount(raw: string): number {
  const clean = raw.trim().replace(/^rp\.?\s*/i, '');
  const m = clean.match(/(\d+(?:[.,]\d+)?)\s*(miliar|m|juta|jt|ribu|rb|k)?/i);
  if (!m) return 0;
  const numStr = m[1];
  const unit = (m[2] || '').toLowerCase();
  if (unit) {
    const val = parseFloat(numStr.replace(',', '.'));
    if (unit === 'miliar' || unit === 'm') return Math.round(val * 1_000_000_000);
    if (unit === 'juta' || unit === 'jt') return Math.round(val * 1_000_000);
    if (unit === 'ribu' || unit === 'rb' || unit === 'k') return Math.round(val * 1_000);
    return Math.round(val);
  }
  // Angka ribuan berformat titik seperti 650.000 atau 1.500.000
  const digitsOnly = numStr.replace(/[.,]/g, '');
  return parseInt(digitsOnly, 10) || 0;
}

function detectTargetProject(text: string, context: ContextPack): [string, Project] | null {
  const codeMatch = text.match(/\b(P\d+)\b/i);
  if (codeMatch) {
    const found = context.projects.get(codeMatch[1].toUpperCase());
    if (found) return [codeMatch[1].toUpperCase(), found];
  }
  const lower = text.toLowerCase();
  for (const [code, proj] of context.projects.entries()) {
    if (lower.includes(proj.name.toLowerCase())) return [code, proj];
  }
  if (context.activeProjectCode && context.projects.has(context.activeProjectCode)) {
    return [context.activeProjectCode, context.projects.get(context.activeProjectCode)!];
  }
  return [...context.projects.entries()][0] || null;
}

/**
 * Audit otomatis status seluruh proyek terhadap progres fisik & keuangan aktual:
 * - Progres >= 100% dan status belum completed -> diubah ke completed.
 * - Progres > 0% dan status masih planning / on_hold -> diubah ke active.
 * - Ada dana masuk / biaya keluar dan status masih planning -> diubah ke active.
 * Menghasilkan tindakan nyata (update_project_status) agar tidak hanya menyuruh tanpa eksekusi.
 */
export function auditAndSyncProjectStatuses(context: ContextPack): {
  rawActions: { type: ActionType; params: Record<string, unknown>; summary: string }[];
  delegations: DelegationReport[];
  summaryText: string;
} {
  const rawActions: { type: ActionType; params: Record<string, unknown>; summary: string }[] = [];
  const changesSummary: string[] = [];
  const alreadySynced: string[] = [];

  for (const [code, p] of context.projects.entries()) {
    const progress = Math.round(p.progress_percentage || 0);
    const hasMoney = (p.spent_amount || 0) > 0 || (p.total_received || 0) > 0;
    let targetStatus: Project['status'] | null = null;
    let reason = '';

    if (progress >= 100 && p.status !== 'completed') {
      targetStatus = 'completed';
      reason = `progres lapangan sudah 100%`;
    } else if (progress > 0 && progress < 100 && (p.status === 'planning' || p.status === 'on_hold')) {
      targetStatus = 'active';
      reason = `progres lapangan sudah berjalan (${progress}%)`;
    } else if (hasMoney && p.status === 'planning') {
      targetStatus = 'active';
      reason = `sudah ada transaksi keuangan (dana masuk ${rp(p.total_received)} / biaya ${rp(p.spent_amount)})`;
    }

    if (targetStatus && targetStatus !== p.status) {
      rawActions.push({
        type: 'update_project_status',
        params: { project: code, status: targetStatus },
        summary: `Update status [${code}] ${p.name}: ${p.status.toUpperCase()} -> ${targetStatus.toUpperCase()} (${reason})`,
      });
      changesSummary.push(
        `• **[${code}] ${p.name}**: status semula \`${p.status}\` diubah ke **\`${targetStatus.toUpperCase()}\`** — alasan: ${reason}`,
      );
    } else {
      alreadySynced.push(`• **[${code}] ${p.name}**: status \`${p.status}\` (progres ${progress}%) sudah sesuai`);
    }
  }

  const delegations: DelegationReport[] = [
    {
      division: 'project',
      note: rawActions.length > 0
        ? `Pak Raka (Site Manager) mengeksekusi sinkronisasi ${rawActions.length} status proyek langsung ke database.`
        : 'Pak Raka (Site Manager) memverifikasi seluruh status proyek dan memastikan data sudah sinkron.',
      status: 'working',
    },
    {
      division: 'finance',
      note: 'Bu Sinta memvalidasi catatan realisasi biaya & dana masuk tiap proyek.',
      status: 'done',
    },
  ];

  const summaryText = rawActions.length > 0
    ? `Siap Pak/Bu Owner! Saya langsung perintahkan **Pak Raka (Site Manager)** untuk merapikan dan menyinkronkan status seluruh proyek kita agar sesuai dengan kondisi riil di lapangan:\n\n${changesSummary.join('\n')}\n\n${rawActions.length} pembaruan status ini langsung dieksekusi oleh tim ke sistem database proyek.`
    : `Hasil audit menyeluruh bersama **Pak Raka (Site Manager)**: Seluruh status proyek saat ini sudah sinkron dengan progres fisik dan transaksi keuangan. Tidak ada data proyek yang gantung atau tidak up-to-date:\n\n${alreadySynced.slice(0, 6).join('\n')}`;

  return { rawActions, delegations, summaryText };
}

/**
 * Mengekstrak satu atau banyak aksi lintas divisi dari kalimat perintah (mendukung kalimat majemuk).
 * Dipakai baik pada mode lokal maupun sebagai jaring pengaman ketika model LLM murah lupa menyertakan array actions.
 */
export function extractMultiClauseActions(
  context: ContextPack,
  userText: string,
): {
  rawActions: { type: ActionType; params: Record<string, unknown>; summary: string }[];
  delegations: DelegationReport[];
} {
  const defaultProj = detectTargetProject(userText, context);
  const clauses = userText
    .split(/(?:\s+(?:lalu|terus|kemudian|serta|dan\s+juga)\s+|;\s*|\n+)/i)
    .map(c => c.trim())
    .filter(Boolean);

  const rawActions: { type: ActionType; params: Record<string, unknown>; summary: string }[] = [];
  const delegationsMap = new Map<DivisionId, string>();

  // Cek khusus instruksi merapikan/menyinkronkan status semua proyek
  if (/(?:rapi(?:kan)?|sinkron(?:kan)?|update|sesuai(?:kan)?)\s+.*(?:proy?ek|project|status)|status.*real|up to date|tidak up to date/i.test(userText)) {
    const audit = auditAndSyncProjectStatuses(context);
    if (audit.rawActions.length > 0) {
      return {
        rawActions: audit.rawActions,
        delegations: audit.delegations,
      };
    }
  }

  for (const clause of clauses) {
    const targetProj = detectTargetProject(clause, context) || defaultProj;
    const pCode = targetProj?.[0] || 'P1';
    const pName = targetProj?.[1]?.name || 'Proyek';

    // 1. Buat proyek baru
    const addProjMatch = clause.match(/(?:buat|tambah|buka)\s+proyek(?:\s+baru)?\s+["']?([^,"'\n]+)["']?(?:\s+klien\s+([^,\n]+))?/i);
    if (addProjMatch && !/rap|pekerjaan|tugas/i.test(addProjMatch[1])) {
      const name = addProjMatch[1].trim();
      const client = (addProjMatch[2] || '').trim();
      rawActions.push({
        type: 'add_project',
        params: { name, client },
        summary: `Buat proyek baru "${name}"${client ? ` (Klien: ${client})` : ''}`,
      });
      delegationsMap.set('project', `Pak Raka menyiapkan ruang kerja proyek baru "${name}".`);
      continue;
    }

    // 2. Konversi estimasi jadi proyek
    if (/(?:konversi|jadikan\s+proyek)\s+estimasi/i.test(clause)) {
      const estCodeMatch = clause.match(/\b(EST\d+)\b/i);
      const firstEst = estCodeMatch
        ? context.estimations.get(estCodeMatch[1].toUpperCase())
        : [...context.estimations.values()][0];
      if (firstEst) {
        const code = [...context.estimations.entries()].find(([, v]) => v.id === firstEst.id)?.[0] || 'EST1';
        rawActions.push({
          type: 'convert_estimation',
          params: { estimation: code, projectName: firstEst.title },
          summary: `Konversi estimasi ${firstEst.code} (${firstEst.title}) menjadi proyek aktif`,
        });
        delegationsMap.set('estimator', `Pak Dimas menyinkronkan item RAB ${firstEst.code} ke struktur RAP & jadwal proyek.`);
        continue;
      }
    }

    // 3. Buat estimasi baru
    const estMatch = clause.match(/(?:buat|bikin|siapkan)\s+estimasi\s+(.+?)(?:\s+(?:untuk|klien|customer)\s+([a-zA-Z0-9 ._-]+))?$/i);
    if (estMatch) {
      const title = estMatch[1].trim();
      const customer = (estMatch[2] || 'Klien Baru').trim();
      rawActions.push({
        type: 'create_estimation',
        params: { title, customer },
        summary: `Buat draf estimasi RAB "${title}" untuk ${customer}`,
      });
      delegationsMap.set('estimator', `Pak Dimas membuat dokumen estimasi RAB "${title}".`);
      continue;
    }

    // 4. Dana masuk / termin / DP
    const incomeMatch = clause.match(
      /(?:catat\s+)?(?:uang\s+masuk|dana\s+masuk|terima\s+(?:dp|termin|pelunasan|pembayaran)|masuk\s+(?:dp|termin|pelunasan))\s*(.*?)\s+(\d+(?:[.,]\d+)?\s*(?:miliar|m|juta|jt|ribu|rb|k)?)/i,
    );
    if (incomeMatch && targetProj) {
      const amount = parseIdrAmount(incomeMatch[2]);
      if (amount > 0) {
        const desc = incomeMatch[1]?.trim() || 'Penerimaan termin klien';
        const cat = /dp/i.test(clause) ? 'dp' : /pelunasan/i.test(clause) ? 'pelunasan' : /retensi/i.test(clause) ? 'retensi' : 'termin';
        rawActions.push({
          type: 'record_income',
          params: { project: pCode, amount, category: cat, description: desc },
          summary: `Catat dana masuk (${cat.toUpperCase()}) ${rp(amount)} ke ${pName}`,
        });
        delegationsMap.set('finance', `Bu Sinta membukukan penerimaan kas masuk ${rp(amount)} ke buku besar ${pName}.`);
        continue;
      }
    }

    // 5. Update progres pekerjaan lapangan
    const progMatch = clause.match(/(?:update|ubah|naikkan|catat)\s+progres(?:s)?\s+(.+?)\s+(?:jadi|ke|menjadi)?\s*(\d{1,3})\s*%/i);
    if (progMatch && targetProj) {
      const workItem = progMatch[1].replace(/\bdi\s+proyek\s+.*/i, '').trim();
      const pct = Math.min(100, Math.max(0, Number(progMatch[2]) || 0));
      rawActions.push({
        type: 'update_progress',
        params: { project: pCode, workItem, progress: pct },
        summary: `Update progres "${workItem}" menjadi ${pct}% di ${pName}`,
      });
      delegationsMap.set('project', `Pak Raka memperbarui progres fisik "${workItem}" → ${pct}% beserta log harian.`);
      continue;
    }

    // 6. Log jumlah pekerja hadir di lapangan
    const workerLogMatch = clause.match(/(?:hari\s+ini\s+)?(?:hadir|masuk|log\s+pekerja|tukang\s+hadir)\s+(\d+)\s*(?:orang|pekerja|tukang)/i)
      || clause.match(/(\d+)\s*(?:orang|pekerja|tukang)\s+hadir/i);
    if (workerLogMatch && targetProj) {
      const workers = Number(workerLogMatch[1]) || 0;
      if (workers > 0) {
        rawActions.push({
          type: 'add_worker_log',
          params: { project: pCode, workers },
          summary: `Catat log lapangan: ${workers} pekerja hadir hari ini di ${pName}`,
        });
        delegationsMap.set('project', `Pak Raka mencatat kehadiran ${workers} personel lapangan di buku harian ${pName}.`);
        continue;
      }
    }

    // 7. Tambah item RAP
    const rapAddMatch = clause.match(/(?:tambah|masukkan)\s+(?:item\s+)?rap\s+(.+?)\s+(\d+)\s*([a-zA-Z0-9]+)?\s*(?:@|harga|senilai)?\s*(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)/i);
    if (rapAddMatch && targetProj) {
      const name = rapAddMatch[1].trim();
      const qty = Number(rapAddMatch[2]) || 1;
      const unit = (rapAddMatch[3] || 'ls').trim();
      const unitPrice = parseIdrAmount(rapAddMatch[4]);
      if (unitPrice > 0) {
        rawActions.push({
          type: 'add_rap_item',
          params: { project: pCode, name, qty, unit, unitPrice },
          summary: `Tambah item RAP "${name}" (${qty} ${unit} × ${rp(unitPrice)}) di ${pName}`,
        });
        delegationsMap.set('project', `Pak Raka menambahkan pos anggaran "${name}" ke tabel RAP ${pName}.`);
        continue;
      }
    }

    // 8. Tambah jadwal item pekerjaan (Work Item)
    const wiAddMatch = clause.match(/(?:tambah|buat)\s+(?:item\s+)?(?:pekerjaan|jadwal)\s+["']?([^,"'\n]+)["']?/i);
    if (wiAddMatch && targetProj) {
      const name = wiAddMatch[1].trim();
      rawActions.push({
        type: 'add_work_item',
        params: { project: pCode, name },
        summary: `Tambah jadwal pekerjaan "${name}" ke Gantt ${pName}`,
      });
      delegationsMap.set('project', `Pak Raka menyusun item pekerjaan "${name}" ke jadwal pelaksanaan ${pName}.`);
      continue;
    }

    // 9. Setujui / Tolak Kasbon
    if (/kasbon|bon\b/i.test(clause) && /(?:setuju|approve|acc|tolak|reject)/i.test(clause) && context.bons.size > 0) {
      const approve = /(?:setuju|approve|acc)/i.test(clause) && !/tolak|reject/i.test(clause);
      const [bCode, b] = [...context.bons.entries()][0];
      rawActions.push({
        type: 'review_bon',
        params: { bon: bCode, decision: approve ? 'approve' : 'reject' },
        summary: `${approve ? 'Setujui' : 'Tolak'} kasbon ${b.profiles?.name || bCode} sebesar ${rp(b.amount)}`,
      });
      delegationsMap.set('hr', `Bu Nadia memproses status kasbon ${b.profiles?.name || bCode} (${rp(b.amount)}).`);
      continue;
    }

    // 10. Buat rekap payroll / slip gaji
    if (/(?:buat|generate|hitung|rekap)\s+(?:slip\s+)?(?:payroll|gaji)/i.test(clause)) {
      rawActions.push({
        type: 'generate_payroll',
        params: {},
        summary: 'Generate rekap draf payroll seluruh anggota tim bulan ini',
      });
      delegationsMap.set('hr', 'Bu Nadia menghitung hari hadir & menyiapkan draf payroll bulanan.');
      continue;
    }

    // 11. Tambah karyawan / tukang ke HRD
    const empMatch = clause.match(/(?:tambah|rekrut|daftarkan)\s+(?:karyawan|tukang|anggota|staf|staff)\s+([a-zA-Z0-9 ._-]+)/i);
    if (empMatch) {
      const name = empMatch[1].trim();
      rawActions.push({
        type: 'add_employee',
        params: { name, role: /staf|staff/i.test(clause) ? 'staff' : 'worker' },
        summary: `Daftarkan anggota tim baru "${name}" di HRD`,
      });
      delegationsMap.set('hr', `Bu Nadia mendaftarkan "${name}" ke database personel HRD.`);
      continue;
    }

    // 12. Absensi karyawan spesifik
    const attMatch = clause.match(/(?:absen(?:kan|si)?|catat\s+hadir)\s+([a-zA-Z0-9 ._-]+?)(?:\s+(masuk|pulang))?$/i);
    if (attMatch && !/\d+\s*(?:orang|tukang|pekerja)/i.test(clause)) {
      const empName = attMatch[1].trim();
      const attType = /pulang|keluar/i.test(attMatch[2] || '') ? 'check_out' : 'check_in';
      rawActions.push({
        type: 'record_attendance',
        params: { employee: empName, type: attType, project: pCode },
        summary: `Catat absensi ${attType === 'check_in' ? 'masuk' : 'pulang'} untuk ${empName}`,
      });
      delegationsMap.set('hr', `Bu Nadia mencatat absensi kehadiran ${empName}.`);
      continue;
    }

    // 13. Tandai tugas selesai
    const doneTodoMatch = clause.match(/(?:selesaikan|tandai\s+selesai|bereskan)\s+tugas\s+(.+)/i);
    if (doneTodoMatch) {
      const ref = doneTodoMatch[1].trim();
      rawActions.push({
        type: 'complete_todo',
        params: { todo: ref },
        summary: `Tandai tugas "${ref}" selesai`,
      });
      delegationsMap.set('hr', `Bu Nadia memperbarui status tugas "${ref}" menjadi selesai.`);
      continue;
    }

    // 14. Delegasi tugas / todo
    const todoMatch = clause.match(/(?:tugaskan|buat\s+tugas|delegasikan|todo)\s+(?:ke\s+([a-zA-Z0-9]+)\s+(?:untuk\s+)?)?(.+)/i);
    if (todoMatch && targetProj) {
      const assignee = todoMatch[1]?.trim();
      const title = todoMatch[2].trim();
      rawActions.push({
        type: 'assign_todo',
        params: { project: pCode, title, ...(assignee ? { assignee } : {}), priority: 'medium' },
        summary: `Delegasikan tugas "${title}"${assignee ? ` ke ${assignee}` : ''} di ${pName}`,
      });
      delegationsMap.set('hr', `Bu Nadia mengirimkan penugasan "${title}" ke daftar kerja tim.`);
      continue;
    }

    // 15. Update harga material di Master Pricelist
    const priceMatch = clause.match(/(?:update|ubah|tambah)\s+harga\s+(?:master|pricelist|material)?\s*(.+?)\s+(?:jadi|ke|@)?\s*(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)/i);
    if (priceMatch) {
      const name = priceMatch[1].trim();
      const baseCost = parseIdrAmount(priceMatch[2]);
      if (baseCost > 0) {
        rawActions.push({
          type: 'upsert_pricelist',
          params: { name, baseCost, unit: 'pcs', category: 'material' },
          summary: `Update harga master "${name}" menjadi ${rp(baseCost)}`,
        });
        delegationsMap.set('purchasing', `Pak Hendra memperbarui harga HPP "${name}" di Database Master Pricelist.`);
        continue;
      }
    }

    // 16. Catat pengeluaran / pembelian biaya proyek (mendukung qty × harga maupun langsung total)
    const costQtyMatch = clause.match(
      /(?:catat|beli|bayar|keluar(?:kan)?)\s+(?:biaya\s+)?(.+?)\s+(\d+)\s*([a-zA-Z]+)?\s*(?:@|x|kali)\s*(\d+(?:[.,]\d+)?\s*(?:juta|jt|ribu|rb|k)?)/i,
    );
    if (costQtyMatch && targetProj) {
      const item = costQtyMatch[1].trim();
      const qty = Number(costQtyMatch[2]) || 1;
      const unit = (costQtyMatch[3] || 'pcs').trim();
      const unitPrice = parseIdrAmount(costQtyMatch[4]);
      const total = qty * unitPrice;
      if (total > 0) {
        rawActions.push({
          type: 'record_cost',
          params: { project: pCode, item, qty, unit, unitPrice, total },
          summary: `Catat pengeluaran "${item}" (${qty} ${unit} × ${rp(unitPrice)} = ${rp(total)}) di ${pName}`,
        });
        delegationsMap.set('finance', `Bu Sinta mencatat realisasi biaya ${rp(total)} dan menautkannya ke pos RAP ${pName}.`);
        continue;
      }
    }

    const costSimpleMatch = clause.match(
      /(?:catat|beli|bayar|pengeluaran)\s+(?:biaya\s+)?(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:miliar|m|juta|jt|ribu|rb|k)?)(?:\s+di\s+proyek\s+.*)?$/i,
    );
    if (costSimpleMatch && targetProj && !/uang\s+masuk|dana\s+masuk|termin|dp\b/i.test(clause)) {
      const item = costSimpleMatch[1].replace(/\bdi\s+proyek\s+.*/i, '').trim();
      const amount = parseIdrAmount(costSimpleMatch[2]);
      if (amount > 0) {
        rawActions.push({
          type: 'record_cost',
          params: { project: pCode, item, total: amount },
          summary: `Catat pengeluaran "${item}" ${rp(amount)} di ${pName}`,
        });
        delegationsMap.set('finance', `Bu Sinta mencatat realisasi pengeluaran "${item}" sebesar ${rp(amount)} di ${pName}.`);
      }
    }
  }

  const delegations: DelegationReport[] = [...delegationsMap.entries()].map(([division, note]) => ({
    division,
    note,
    status: 'working',
  }));

  return { rawActions, delegations };
}

/**
 * Orkestrasi lokal cerdas: tetap luwes untuk diskusi, simulasi, evaluasi risiko,
 * maupun mengeksekusi banyak perintah sekaligus lintas 5 divisi.
 */
export function localSmartManagerTurn(
  context: ContextPack,
  userText: string,
  config: AIConfig,
): ManagerTurn {
  const lower = userText.toLowerCase();

  // 1. Cek instruksi kerja (multi-clause / perintah operasional)
  const extracted = extractMultiClauseActions(context, userText);
  if (extracted.rawActions.length > 0) {
    const actions = normalizeActions(extracted.rawActions, config);
    const autoCount = actions.filter(a => !a.needsApproval).length;
    const divisionsInvolved = [...new Set(actions.map(a => DIVISIONS[a.division].headName))].join(', ');
    return {
      reply:
        autoCount > 0
          ? `Siap Bos! Saya langsung koordinasikan instruksi ini dengan **${divisionsInvolved}**. Ada **${actions.length} tugas operasional** yang langsung kami kerjakan ke sistem:`
          : `Siap Bos! Saya sudah menginstruksikan **${divisionsInvolved}** untuk menyiapkan **${actions.length} tindakan** berikut. Silakan klik **Eksekusi** untuk menyetujui:`,
      delegations: extracted.delegations,
      actions,
      followUps: [
        'Briefing kondisi semua proyek hari ini',
        'Cek apakah ada proyek yang berisiko over-budget',
        'Ada kasbon yang perlu diputuskan?',
      ],
    };
  }

  // 1b. Cek permintaan audit & sinkronisasi status proyek
  if (
    /(?:rapi(?:kan)?|sinkron(?:kan)?|update|sesuai(?:kan)?)\s+.*(?:proy?ek|project|status)|status.*real|up to date|tidak up to date/i.test(
      lower,
    )
  ) {
    const audit = auditAndSyncProjectStatuses(context);
    const actions = normalizeActions(audit.rawActions, config);
    return {
      reply: audit.summaryText,
      delegations: audit.delegations,
      actions,
      followUps: [
        'Briefing kondisi semua proyek hari ini',
        'Proyek mana yang paling berisiko rugi?',
      ],
    };
  }

  // 2. Simulasi kenaikan harga / sensitivitas biaya
  if (/simulasi|naik\s*\d+\s*%|kenaikan/i.test(lower)) {
    const pctMatch = lower.match(/(\d+)\s*%/);
    const pct = pctMatch ? Number(pctMatch[1]) : 10;
    const lines: string[] = [
      `Saya sudah meminta **Pak Dimas (Estimator & QS)** dan **Bu Sinta (Keuangan)** menghitung simulasi kenaikan biaya sebesar **${pct}%** terhadap sisa anggaran RAP yang belum terealisasi:`,
    ];
    for (const [code, p] of context.projects.entries()) {
      const contract = p.contract_value || p.total_budget_planned || 0;
      const remainingRap = Math.max(0, p.total_budget_planned - p.spent_amount);
      const extraCost = Math.round(remainingRap * (pct / 100));
      const newMargin = contract - (p.spent_amount + remainingRap + extraCost);
      lines.push(
        `• **[${code}] ${p.name}**: Sisa RAP ${rp(remainingRap)} → potensi beban tambahan **+${rp(extraCost)}** → estimasi sisa laba menjadi **${rp(newMargin)}**`,
      );
    }
    lines.push(
      `\n💡 **Rekomendasi GM**: Kunci harga material utama lebih awal melalui **Pak Hendra (Purchasing)** pada item dengan bobot biaya terbesar agar margin proyek tidak tergerus.`,
    );
    return {
      reply: lines.join('\n'),
      delegations: [
        { division: 'estimator', note: `Pak Dimas menghitung sensitivitas kenaikan HPP +${pct}% pada sisa RAP.`, status: 'done' },
        { division: 'finance', note: 'Bu Sinta mengecek ketahanan arus kas proyek terhadap potensi pembengkakan biaya.', status: 'done' },
        { division: 'purchasing', note: 'Pak Hendra memantau daftar material yang perlu dikunci harganya.', status: 'done' },
      ],
      actions: [],
      followUps: [
        'Simulasi kalau harga material naik 15%',
        'Proyek mana yang paling berisiko rugi?',
        'Briefing kondisi semua proyek hari ini',
      ],
    };
  }

  // 3. Evaluasi risiko / over-budget / keterlambatan
  if (/risiko|rugi|over\s*budget|bahaya|masalah|terlambat|evaluasi/i.test(lower)) {
    const risky = [...context.projects.entries()].filter(
      ([, p]) =>
        p.spent_amount > p.total_budget_planned ||
        p.health_status === 'behind' ||
        p.health_status === 'at_risk' ||
        (p.total_received || 0) < (p.spent_amount || 0),
    );
    const delegations: DelegationReport[] = [
      { division: 'finance', note: 'Bu Sinta mengaudit rasio realisasi biaya terhadap plafon RAP & kas masuk.', status: 'done' },
      { division: 'project', note: 'Pak Raka memeriksa deviasi progres fisik terhadap jadwal rencana.', status: 'done' },
    ];
    if (!risky.length) {
      return {
        reply:
          'Hasil audit bersama **Bu Sinta (Keuangan)** dan **Pak Raka (Site Manager)**: Saat ini seluruh proyek masih berada di dalam batas aman RAP dan jadwal. Fokus kita minggu ini adalah menjaga ritme progres lapangan agar penagihan termin berikutnya tepat waktu.',
        delegations,
        actions: [],
        followUps: [
          'Briefing kondisi semua proyek hari ini',
          'Simulasi: kalau harga material naik 10%, dampaknya?',
          'Ada kasbon yang perlu diputuskan?',
        ],
      };
    }
    return {
      reply: [
        `Berdasarkan pengecekan lintas divisi, ada **${risky.length} proyek** yang butuh perhatian kita segera:`,
        ...risky.map(([c, p]) => {
          const issues: string[] = [];
          if (p.spent_amount > p.total_budget_planned && p.total_budget_planned > 0) {
            issues.push(`Biaya melampaui RAP sebesar ${rp(p.spent_amount - p.total_budget_planned)}`);
          }
          if ((p.total_received || 0) < (p.spent_amount || 0)) {
            issues.push(`Kas proyek minus ${rp((p.spent_amount || 0) - (p.total_received || 0))} (perlu tagih termin)`);
          }
          if (p.health_status === 'behind' || p.health_status === 'at_risk') {
            issues.push(`Status jadwal: ${p.health_status} (Progres ${Math.round(p.progress_percentage)}%)`);
          }
          return `• **[${c}] ${p.name}** — ${issues.join(' · ') || `Biaya ${rp(p.spent_amount)} / RAP ${rp(p.total_budget_planned)}`}`;
        }),
        `\nApa langkah yang ingin kita ambil dulu, Bos? Saya bisa tugaskan Site Manager atau bagian Keuangan sekarang.`,
      ].join('\n'),
      delegations,
      actions: [],
      followUps: [
        'Tugaskan cek opname lapangan hari ini',
        'Simulasi: kalau harga material naik 10%, dampaknya?',
        'Ada kasbon yang perlu diputuskan?',
      ],
    };
  }

  // 4. Kasbon / HRD
  if (/kasbon|bon\b|gaji|payroll|karyawan|tukang|tim\b/i.test(lower)) {
    const delegations: DelegationReport[] = [
      { division: 'hr', note: `Bu Nadia memeriksa ${context.members.size} personel aktif & ${context.bons.size} antrean kasbon.`, status: 'done' },
    ];
    if (!context.bons.size) {
      return {
        reply: `Laporan dari **Bu Nadia (HRD)**: Saat ini tercatat **${context.members.size} personel aktif** dan **tidak ada pengajuan kasbon yang menggantung**. Jika Anda ingin mencatat absensi, menambah tukang baru, atau membuat draf slip gaji, tinggal perintahkan saja.`,
        delegations,
        actions: [],
        followUps: [
          'Generate draf payroll bulan ini',
          'Briefing kondisi semua proyek hari ini',
        ],
      };
    }
    const list = [...context.bons.entries()].map(
      ([c, b]) => `• **[${c}] ${b.profiles?.name || 'Anggota'}**: mengajukan **${rp(b.amount)}** (${b.reason || 'tanpa keterangan'})`,
    );
    return {
      reply: `Laporan **Bu Nadia (HRD)** — ada **${context.bons.size} kasbon** menunggu keputusan Anda:\n${list.join('\n')}\n\nKetik **"Setujui kasbon"** bila ingin langsung saya proses.`,
      delegations,
      actions: [],
      followUps: ['Setujui kasbon B1', 'Tolak kasbon B1', 'Generate draf payroll bulan ini'],
    };
  }

  // 5. Default Executive Briefing
  return {
    reply: localBriefing(context),
    delegations: [
      { division: 'project', note: `Pak Raka memantau progres fisik ${context.projects.size} proyek aktif.`, status: 'done' },
      { division: 'finance', note: 'Bu Sinta merekap saldo kas proyek, termin masuk, dan serapan RAP.', status: 'done' },
      { division: 'hr', note: `Bu Nadia memantau ${context.members.size} personel, ${context.bons.size} kasbon pending, dan ${context.todos.size} tugas aktif.`, status: 'done' },
    ],
    actions: [],
    followUps: [
      'Proyek mana yang paling berisiko rugi?',
      'Simulasi: kalau harga material naik 10%, dampaknya?',
      'Ada kasbon yang perlu diputuskan?',
    ],
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
  let text = '';
  try {
    text = await callUnifiedAI(messages, { json: true, maxTokens: 4096, temperature: 0.35 }, config);
  } catch {
    return localSmartManagerTurn(context, userText, config);
  }

  let parsed = extractJson<{
    reply?: string;
    delegations?: unknown;
    actions?: unknown;
    followUps?: unknown;
  }>(text);

  if (!parsed && (text.includes('{') || text.includes('"reply"'))) {
    try {
      const repaired = await callUnifiedAI(
        [
          ...messages,
          { role: 'assistant', content: text },
          { role: 'user', content: 'Format salah atau terpotong. Balas ulang HANYA objek JSON valid sesuai skema {reply, delegations, actions, followUps}.' },
        ],
        { json: true, maxTokens: 4096, temperature: 0.1 },
        config,
      );
      parsed = extractJson(repaired);
      if (parsed) text = repaired;
    } catch {
      // lanjut ke pembersihan teks di bawah
    }
  }

  // Bersihkan balasan GM agar tidak pernah ada fragmen raw JSON seperti { "reply": "..." yang bocor ke balon chat
  let cleanedReply = cleanRawAssistantReply(parsed?.reply || text);

  let actions = normalizeActions(parsed?.actions, config);

  // JARING PENGAMAN EKSEKUTIF: Jika user minta merapikan/sinkronkan proyek, tapi LLM hanya memberi teks narasi tanpa action
  if (
    /(?:rapi(?:kan)?|sinkron(?:kan)?|update|sesuai(?:kan)?)\s+.*(?:proy?ek|project|status)|status.*real|up to date|tidak up to date/i.test(
      userText,
    )
  ) {
    if (actions.length === 0) {
      const audit = auditAndSyncProjectStatuses(context);
      if (audit.rawActions.length > 0) {
        actions = normalizeActions(audit.rawActions, config);
        cleanedReply = `${cleanedReply}\n\n${audit.summaryText}`.trim();
      }
    }
  }

  // Jaring pengaman multi-perintah
  if (actions.length === 0) {
    const rescue = extractMultiClauseActions(context, userText);
    if (rescue.rawActions.length > 0) {
      actions = normalizeActions(rescue.rawActions, config);
    }
  }

  let delegations: DelegationReport[] = Array.isArray(parsed?.delegations)
    ? (parsed!.delegations as { division?: string; note?: string }[])
        .filter(d => d?.division && d.division in DIVISIONS)
        .map(d => ({
          division: d.division as DivisionId,
          note: String(d.note || ''),
          status: 'done',
        }))
    : [];

  // Pastikan setiap divisi yang memiliki action muncul di log koordinasi
  for (const act of actions) {
    if (!delegations.some(d => d.division === act.division)) {
      delegations.push({
        division: act.division,
        note: `${DIVISIONS[act.division].headName} menangani: ${act.summary}`,
        status: 'working',
      });
    }
  }

  const followUps = Array.isArray(parsed?.followUps)
    ? (parsed!.followUps as string[]).map(f => String(f || '').trim()).filter(Boolean).slice(0, 4)
    : ['Briefing kondisi semua proyek hari ini', 'Proyek mana yang paling berisiko rugi?'];

  return {
    reply: cleanedReply || 'Siap, saya sudah koordinasikan dengan kepala divisi terkait.',
    delegations,
    actions,
    followUps,
  };
}

// ───────────────────────── Executor ─────────────────────────

function resolveProject(ref: unknown, ctx: ContextPack, env: ManagerEnv): Project | null {
  const s = String(ref ?? '').trim().replace(/[\[\]]/g, '');
  if (s) {
    const byCode = ctx.projects.get(s.toUpperCase());
    if (byCode) return byCode;
    const lower = s.toLowerCase();
    const byName =
      env.projects.find(p => p.name.toLowerCase() === lower) ||
      env.projects.find(p => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()));
    if (byName) return byName;
  }
  if (env.currentProject) return env.currentProject;
  if (ctx.activeProjectCode && ctx.projects.has(ctx.activeProjectCode)) {
    return ctx.projects.get(ctx.activeProjectCode)!;
  }
  return env.projects.find(p => p.status !== 'archived') ?? env.projects[0] ?? null;
}

function resolveMember(ref: unknown, ctx: ContextPack): OrgMember | null {
  const s = String(ref ?? '').trim().replace(/[\[\]]/g, '');
  if (!s) return null;
  const byCode = ctx.members.get(s.toUpperCase());
  if (byCode) return byCode;
  const lower = s.toLowerCase();
  for (const m of ctx.members.values()) {
    const n = (m.profile?.name || '').toLowerCase();
    if (n && (n === lower || n.includes(lower) || lower.includes(n))) return m;
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
  return {
    ok: r.success,
    message: [r.message, r.details].filter(Boolean).join(' — '),
    navigateTo: r.navigateTo,
  };
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
        if (!project) return { ok: false, message: 'Proyek belum ditemukan — buat atau pilih proyek terlebih dahulu.' };
        const total = Number(p.total) || (Number(p.qty) || 0) * (Number(p.unitPrice) || 0);
        if (total <= 0) return { ok: false, message: 'Nominal biaya tidak valid.' };
        return runIntent(
          'record_cost',
          {
            item: String(p.item || 'Pembelian'),
            total,
            qty: p.qty != null ? Number(p.qty) : null,
            unit: p.unit ? String(p.unit) : null,
            unitPrice: p.unitPrice != null ? Number(p.unitPrice) : null,
          },
          project,
          env,
        );
      }
      case 'record_income': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek belum ditemukan.' };
        return runIntent(
          'record_income',
          {
            total: Number(p.amount ?? p.total) || 0,
            category: String(p.category || 'other'),
            item: String(p.description || 'Penerimaan klien'),
          },
          project,
          env,
        );
      }
      case 'update_progress': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek belum ditemukan.' };
        const ref = String(p.workItem ?? '').replace(/[\[\]]/g, '');
        const byCode = ctx.workItems.get(ref.toUpperCase());
        const name = byCode ? byCode.item.name : ref;
        return runIntent('update_progress', { workItem: name, progress: Number(p.progress) || 0 }, project, env);
      }
      case 'add_worker_log': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek belum ditemukan.' };
        return runIntent('add_worker_log', { workers: Number(p.workers) || 0 }, project, env);
      }
      case 'add_project': {
        const name = String(p.name || '').trim();
        if (!name) return { ok: false, message: 'Nama proyek wajib diisi.' };
        const end = new Date();
        end.setMonth(end.getMonth() + 3);
        const created = await createProject({
          org_id: env.orgId,
          created_by: env.userId,
          name,
          client_name: String(p.client || ''),
          location: String(p.location || ''),
          description: String(p.description || ''),
          start_date: todayStr(),
          end_date: end.toISOString().slice(0, 10),
          status: 'planning',
        });
        await env.onRefreshProjects();
        return {
          ok: true,
          message: `Proyek "${created.name}" berhasil dibuat oleh Divisi Proyek.`,
          navigateTo: `/app/projects/${created.id}`,
        };
      }
      case 'update_project_status': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek belum ditemukan.' };
        const rawStatus = String(p.status || 'active').toLowerCase();
        const validStatuses: Project['status'][] = ['planning', 'active', 'on_hold', 'completed', 'archived'];
        const status = (validStatuses.includes(rawStatus as Project['status']) ? rawStatus : 'active') as Project['status'];
        await updateProject(project.id, { status });
        await env.onRefreshProjects();
        return {
          ok: true,
          message: `Status proyek "${project.name}" diubah menjadi ${status.toUpperCase()}.`,
          navigateTo: `/app/projects/${project.id}`,
        };
      }
      case 'review_bon': {
        const ref = String(p.bon ?? '').replace(/[\[\]]/g, '').toUpperCase();
        const bon = ctx.bons.get(ref) || [...ctx.bons.values()][0];
        if (!bon) return { ok: false, message: 'Pengajuan kasbon tidak ditemukan.' };
        const approve = String(p.decision) === 'approve';
        await reviewBonRequest(
          bon.id,
          approve ? 'approved' : 'rejected',
          env.userId,
          approve ? undefined : String(p.reason || 'Ditolak'),
          { orgId: env.orgId, actorId: env.userId },
        );
        return {
          ok: true,
          message: `Kasbon ${bon.profiles?.name || ''} ${rp(bon.amount)} telah ${approve ? 'disetujui' : 'ditolak'} oleh HRD.`,
        };
      }
      case 'assign_todo': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek belum ditemukan untuk tugas ini.' };
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
        return {
          ok: true,
          message: `Tugas "${title}" didelegasikan${member ? ` ke ${member.profile?.name}` : ''} (${project.name}).`,
        };
      }
      case 'complete_todo': {
        const ref = String(p.todo ?? '').replace(/[\[\]]/g, '').trim();
        const byCode = ctx.todos.get(ref.toUpperCase());
        const byTitle = [...ctx.todos.values()].find(t => t.title.toLowerCase().includes(ref.toLowerCase()));
        const target = byCode || byTitle || [...ctx.todos.values()][0];
        if (!target) return { ok: false, message: 'Tugas aktif yang dimaksud tidak ditemukan.' };
        await toggleTodoDone(target.id, true);
        return { ok: true, message: `Tugas "${target.title}" ditandai SELESAI.` };
      }
      case 'generate_payroll': {
        const members = [...ctx.members.values()].map(m => ({ id: m.id, user_id: m.user_id, role: m.role }));
        const rows = await generatePayrollForOrg(env.orgId, members);
        return {
          ok: true,
          message: `Draf payroll dibuat untuk ${rows.length} anggota tim.`,
          navigateTo: '/app/hr/payroll',
        };
      }
      case 'upsert_pricelist': {
        const name = String(p.name || '').trim();
        const baseCost = Number(p.baseCost) || 0;
        if (!name || baseCost <= 0) return { ok: false, message: 'Nama & harga modal wajib diisi.' };
        const margin = p.marginPct != null ? Number(p.marginPct) : 20;
        const existing = (await loadPricelistItems(env.orgId, false)).find(
          i => i.name.toLowerCase() === name.toLowerCase(),
        );
        const selling = calcPricelistSelling(baseCost, margin);
        if (existing) {
          await updatePricelistItem(existing.id, {
            base_cost: baseCost,
            default_margin_pct: margin,
            selling_price: selling,
          });
          return { ok: true, message: `Harga master "${name}" diperbarui: modal ${rp(baseCost)}, jual ${rp(selling)}.` };
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
        return { ok: true, message: `Item pricelist "${name}" ditambahkan (HPP ${rp(baseCost)}).` };
      }
      case 'create_estimation': {
        const customer = String(p.customer || 'Klien').trim();
        const title = String(p.title || 'Estimasi Baru').trim();
        const rawItems = Array.isArray(p.items)
          ? (p.items as Array<{ name?: string; qty?: number; unit?: string; unitPrice?: number; category?: string }>)
          : [];
        if (rawItems.length > 0) {
          const code = await generateEstimationCode(env.orgId);
          const builtItems = rawItems.map((it, idx) => {
            const base = emptyItem(idx);
            const draft = {
              ...base,
              name: String(it.name || `Item ${idx + 1}`),
              category: (it.category || 'material') as PricelistCategory,
              unit: String(it.unit || 'ls'),
              qty: Number(it.qty) || 1,
              base_cost: Number(it.unitPrice) || 0,
              margin_pct: 20,
            };
            return { ...draft, ...calcItemRow(draft, 'margin') };
          });
          const est = await createEstimation(env.orgId, env.userId, {
            ...newEstimationDraft(code),
            title,
            customer_name: customer,
            customer_phone: String(p.phone || '-'),
            customer_address: String(p.address || ''),
            notes: 'Dibuat oleh Divisi Estimator & QS',
            items: builtItems,
          });
          return {
            ok: true,
            message: `Estimasi ${est.code} "${title}" dibuat dengan ${builtItems.length} item RAB.`,
            navigateTo: `/app/estimator/${est.id}`,
          };
        }
        return runIntent(
          'create_lead',
          {
            target: 'estimation',
            customer_name: customer,
            customer_phone: String(p.phone || '-'),
            need: title,
          },
          null,
          env,
        );
      }
      case 'convert_estimation': {
        const ref = String(p.estimation ?? '').replace(/[\[\]]/g, '').toUpperCase();
        const est = ctx.estimations.get(ref) || [...ctx.estimations.values()][0];
        return runIntent(
          'convert_estimation',
          {
            estimation: est ? est.id : String(p.estimation || ''),
            projectName: p.projectName,
          },
          null,
          env,
        );
      }
      case 'record_transfer': {
        const fromProj = p.fromProject ? resolveProject(p.fromProject, ctx, env) : null;
        const toProj = p.toProject ? resolveProject(p.toProject, ctx, env) : null;
        return runIntent(
          'record_transfer',
          {
            fromProject: fromProj?.name || p.fromProject,
            toProject: toProj?.name || p.toProject,
            counterparty: p.counterparty,
            amount: Number(p.amount ?? p.total) || 0,
            transferType: p.transferType,
            description: p.description,
          },
          fromProj || toProj,
          env,
        );
      }
      case 'add_rap_item': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek belum ditemukan.' };
        return runIntent('add_rap_item', p, project, env);
      }
      case 'add_work_item': {
        const project = resolveProject(p.project, ctx, env);
        if (!project) return { ok: false, message: 'Proyek belum ditemukan.' };
        return runIntent('add_work_item', p, project, env);
      }
      case 'add_employee': {
        return runIntent('add_employee', p, null, env);
      }
      case 'record_attendance': {
        const project = p.project ? resolveProject(p.project, ctx, env) : env.currentProject;
        const member = resolveMember(p.employee, ctx);
        return runIntent(
          'record_attendance',
          {
            ...p,
            employee: member?.profile?.name || p.employee,
          },
          project,
          env,
        );
      }
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Gagal mengeksekusi aksi' };
  }
  return { ok: false, message: 'Aksi tidak dikenali.' };
}
