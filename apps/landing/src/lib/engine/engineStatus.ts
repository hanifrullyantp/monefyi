import type { CampaignWindowAuditEntry, WinningActionPlan } from "@/lib/engine/winningEngine";

/**
 * Fungsi murni: tidak memanggil jaringan dan tidak menyentuh state.
 * Dipakai UI untuk ringkasan satu baris dan timeline aksi.
 */

export interface ActivityItem {
  id: number;
  at: string;
  actionType: string;
  campaignName: string;
  liveExecuted: boolean;
  ok: boolean;
  summary: string;
  review: string | null;
  rolledBack: boolean;
  undone: boolean;
  undoable: boolean;
}

export interface EngineStatus {
  tone: "ok" | "warn" | "idle";
  headline: string;
  counts: {
    learning: number;
    held: number;
    scaled24h: number;
    paused24h: number;
    pendingPlans: number;
    failed24h: number;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildEngineStatus(input: {
  dataAudit: CampaignWindowAuditEntry[];
  plans: WinningActionPlan[];
  activity: ActivityItem[];
  now?: number;
}): EngineStatus {
  const now = input.now ?? Date.now();
  const recent = input.activity.filter((a) => now - Date.parse(a.at) <= DAY_MS);

  const counts = {
    learning: input.dataAudit.filter((a) => /learning/i.test(a.reason)).length,
    held: input.dataAudit.filter((a) => a.decision === "held").length,
    scaled24h: recent.filter((a) => a.liveExecuted && a.actionType === "scale_campaign_budget").length,
    paused24h: recent.filter((a) => a.liveExecuted && a.actionType === "pause_bleeding_campaign").length,
    pendingPlans: input.plans.filter((p) => p.status === "pending").length,
    failed24h: recent.filter((a) => !a.ok).length,
  };

  const hasAnyData = input.dataAudit.length > 0 || input.plans.length > 0 || input.activity.length > 0;
  if (!hasAnyData) {
    return { tone: "idle", headline: "Belum ada analisa. Jalankan analisa untuk memulai.", counts };
  }

  const needsAttention = counts.failed24h > 0 || counts.pendingPlans > 0;
  const parts: string[] = [needsAttention ? "Perlu perhatian" : "Aman"];
  if (counts.learning > 0) parts.push(`${counts.learning} kampanye belajar`);
  if (counts.held > 0) parts.push(`${counts.held} ditahan`);
  if (counts.scaled24h > 0) parts.push(`${counts.scaled24h} di-scale 24 jam terakhir`);
  if (counts.paused24h > 0) parts.push(`${counts.paused24h} di-pause 24 jam terakhir`);
  if (counts.pendingPlans > 0) parts.push(`${counts.pendingPlans} rencana menunggu persetujuan`);
  if (counts.failed24h > 0) parts.push(`${counts.failed24h} aksi gagal`);

  return { tone: needsAttention ? "warn" : "ok", headline: parts.join(", "), counts };
}

export const UNDOABLE_ACTIONS = new Set(["scale_campaign_budget", "pause_bleeding_campaign", "pause_weak_ad"]);

export const ACTION_LABEL: Record<string, string> = {
  scale_campaign_budget: "Scale budget",
  pause_bleeding_campaign: "Pause kampanye boncos",
  adjust_budget_to_range: "Sesuaikan budget",
  create_rapid_test_campaign: "Buat kampanye uji",
  pause_weak_ad: "Pause iklan lemah",
  duplicate_winner: "Duplikasi ad set pemenang",
  activate_duplicate: "Aktifkan salinan",
  supervisor_kill_switch: "Pengawas mengaktifkan kill switch",
};
