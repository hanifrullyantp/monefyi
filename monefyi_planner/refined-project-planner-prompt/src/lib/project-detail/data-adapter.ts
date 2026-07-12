// =====================================================
// Project Detail — normalized view model from APP_DATA
// Fixes worker item index offset (materials.length + idx)
// =====================================================

import { APP_DATA } from "../mock-data";

export type Project = (typeof APP_DATA.projects)[number];

export interface WorkItemRow {
  item: Record<string, unknown>;
  /** Global index for toggleItemCheck / inline edit */
  idx: number;
  kind: "material" | "worker";
}

export interface NormalizedProject {
  project: Project;
  totalRealisasi: number;
  totalPemasukan: number;
  sisaKontrak: number;
  sisaPembayaran: number;
  realisasiPct: string;
  workItems: WorkItemRow[];
  checkedCount: number;
  totalWorkItems: number;
  hutangItems: Project["hutangPiutang"];
  piutangItems: Project["hutangPiutang"];
  allTransactions: Array<
    | (Project["payments"][number] & { sortDate: string })
    | (Project["expenses"][number] & { sortDate: string })
  >;
  totalAktiva: number;
  totalPasiva: number;
  estLaba: number;
}

/**
 * Build a consistent view model for project detail tabs.
 * @param project
 */
export function normalizeProject(project: Project): NormalizedProject {
  const bahanActual = project.budget?.bahan?.actual || 0;
  const tukangActual = project.budget?.tukang?.actual || 0;
  const itemRealisasi = bahanActual + tukangActual;
  const totalRealisasi = project.rap?.realisasi ?? itemRealisasi;
  const totalPemasukan = project.payments.reduce((s, pay) => s + pay.amount, 0);
  const materials = project.rap?.materials || [];
  const workers = project.rap?.workers || [];

  const workItems: WorkItemRow[] = [
    ...materials.map((item, idx) => ({
      item: item as Record<string, unknown>,
      idx,
      kind: "material" as const,
    })),
    ...workers.map((item, idx) => ({
      item: item as Record<string, unknown>,
      idx: materials.length + idx,
      kind: "worker" as const,
    })),
  ];

  const checkedCount = workItems.filter(
    (w) => Boolean(w.item.checked) || Number(w.item.qtyActual) > 0
  ).length;
  const hutangItems = project.hutangPiutang.filter((h) => h.type === "hutang");
  const piutangItems = project.hutangPiutang.filter((h) => h.type === "piutang");

  const allTransactions = [
    ...project.payments.map((tx) => ({ ...tx, sortDate: tx.date })),
    ...project.expenses.map((tx) => ({ ...tx, sortDate: tx.date })),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  const piutang = project.budget?.piutang || 0;
  const hutang = project.budget?.hutang || 0;
  const estLaba = project.rap?.estLaba || 0;

  // Neraca: Aktiva = Saldo + Piutang | Pasiva (net) = Dana Masuk − Hutang
  const totalAktiva = project.saldo + piutang;
  const totalPasiva = totalPemasukan - hutang;

  return {
    project,
    totalRealisasi,
    totalPemasukan,
    sisaKontrak: project.contractValue - totalRealisasi,
    sisaPembayaran: project.contractValue - totalPemasukan,
    realisasiPct:
      project.contractValue > 0
        ? ((totalRealisasi / project.contractValue) * 100).toFixed(1)
        : "0",
    workItems,
    checkedCount,
    totalWorkItems: workItems.length,
    hutangItems,
    piutangItems,
    allTransactions,
    totalAktiva,
    totalPasiva,
    estLaba,
  };
}
