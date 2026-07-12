// =====================================================
// Popup card configs (3-card drill-down popups)
// =====================================================

import { APP_DATA } from "../mock-data";
import { formatRupiah, formatDate, projectDetailRoute } from "../utils";

export type PopupConfig = {
  title: string;
  icon?: string;
  cards: { icon: string; value: string; label: string; bg: string; color: string }[];
  list: { icon?: string; title: string; meta: string; value: string; bg?: string; color?: string; valueColor?: string }[];
  detailRoute?: string;
};

export type PopupContext = {
  business: typeof APP_DATA.business;
  projects: typeof APP_DATA.projects;
};

export function getPopupConfig(
  type: string,
  project: (typeof APP_DATA.projects)[number] | null | undefined,
  ctx: PopupContext
): PopupConfig {
  const biz = ctx.business;

  const configs: Record<string, {
    title: string; icon?: string;
    cards: {icon: string; value: string; label: string; bg: string; color: string}[];
    list: {icon?: string; title: string; meta: string; value: string; bg?: string; color?: string; valueColor?: string}[];
    detailRoute?: string;
  }> = {
    "bahan": {
      title: "Material / Bahan",
      icon: "package",
      cards: [
        { icon: "package", value: `${project?.rap?.materials?.length || 0} item`, label: "Jumlah Item", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "wallet", value: formatRupiah(project?.budget?.bahan?.actual || 0, true), label: "Total Nominal", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "store", value: "3 vendor", label: "Vendor Terlibat", bg: "var(--success-light)", color: "var(--success)" },
      ],
      list: (project?.rap?.materials || []).map(m => ({
        icon: "package",
        title: String(m.name),
        meta: `${m.qtyActual} ${m.unit} x ${formatRupiah(m.unitPrice)} = ${formatRupiah(m.total)}`,
        value: formatRupiah(m.total, true),
        bg: "var(--gray-100)",
        valueColor: m.status === 'over' ? "var(--danger)" : "var(--gray-800)",
      })),
      detailRoute: project ? projectDetailRoute(project.id, "rap") : undefined,
    },
    "tukang": {
      title: "Tenaga Kerja",
      icon: "hard-hat",
      cards: [
        { icon: "hard-hat", value: `${project?.rap?.workers?.length || 0} tukang`, label: "Jumlah Tenaga", bg: "var(--warning-light)", color: "var(--warning-dark)" },
        { icon: "wallet", value: formatRupiah(project?.budget?.tukang?.actual || 0, true), label: "Total Upah", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "calendar", value: "15 hari", label: "Total Hari", bg: "var(--primary-light)", color: "var(--primary)" },
      ],
      list: (project?.rap?.workers || []).map(w => ({
        icon: "hard-hat",
        title: String(w.name),
        meta: `${w.qtyActual} hari x ${formatRupiah(w.unitPrice)}`,
        value: formatRupiah(w.total, true),
        bg: "var(--warning-light)",
        color: "var(--warning-dark)",
      })),
      detailRoute: project ? projectDetailRoute(project.id, "rap") : undefined,
    },
    "piutang": {
      title: "Piutang Project",
      icon: "file-check",
      cards: [
        { icon: "file-check", value: `${project?.hutangPiutang?.filter(h=>h.type==='piutang').length || 0} item`, label: "Jumlah Piutang", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "wallet", value: formatRupiah(project?.budget?.piutang || 0, true), label: "Total Piutang", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "clock", value: "Belum Ditagih", label: "Status", bg: "var(--warning-light)", color: "var(--warning-dark)" },
      ],
      list: (project?.hutangPiutang?.filter(h => h.type === 'piutang') || []).map(p => ({
        icon: "file-check",
        title: String(p.name),
        meta: `Jatuh tempo: ${formatDate(p.due)}`,
        value: formatRupiah(p.amount, true),
        bg: "var(--success-light)",
        color: "var(--success)",
        valueColor: "var(--success)",
      })),
      detailRoute: project ? projectDetailRoute(project.id, "keuangan") : undefined,
    },
    "hutang": {
      title: "Hutang Project",
      icon: "receipt",
      cards: [
        { icon: "receipt", value: `${project?.hutangPiutang?.filter(h=>h.type==='hutang').length || 0} item`, label: "Jumlah Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "wallet", value: formatRupiah(project?.budget?.hutang || 0, true), label: "Total Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "clock", value: "Segera", label: "Jatuh Tempo", bg: "var(--warning-light)", color: "var(--warning-dark)" },
      ],
      list: (project?.hutangPiutang?.filter(h => h.type === 'hutang') || []).map(h => ({
        icon: "receipt",
        title: String(h.name),
        meta: `Jatuh tempo: ${formatDate(h.due)} • ${h.status === 'overdue' ? 'OVERDUE' : 'Upcoming'}`,
        value: formatRupiah(h.amount, true),
        bg: "var(--danger-light)",
        color: "var(--danger)",
        valueColor: "var(--danger)",
      })),
      detailRoute: project ? projectDetailRoute(project.id, "keuangan") : undefined,
    },
    "pembayaran": {
      title: "Riwayat Pembayaran / Termin",
      icon: "credit-card",
      cards: [
        { icon: "credit-card", value: `${project?.payments?.length || 0} termin`, label: "Jumlah Termin", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "wallet", value: formatRupiah(project?.payments?.reduce((s,p)=>s+p.amount,0)||0, true), label: "Total Diterima", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "trending-up", value: `${(((project?.payments?.reduce((s,p)=>s+p.amount,0)||0)/((project?.contractValue||1))*100)).toFixed(0)}%`, label: "Dari Kontrak", bg: "var(--info-light)", color: "var(--info)" },
      ],
      list: (project?.payments || []).map(p => ({
        icon: "arrow-down-circle",
        title: String(p.name),
        meta: formatDate(p.date),
        value: formatRupiah(p.amount, true),
        bg: "var(--success-light)",
        color: "var(--success)",
        valueColor: "var(--success)",
      })),
      detailRoute: project ? projectDetailRoute(project.id, "keuangan") : undefined,
    },
    "laba": {
      title: "Estimasi Laba Project",
      icon: "trending-up",
      cards: [
        { icon: "wallet", value: formatRupiah(project?.contractValue||0, true), label: "Nilai Kontrak", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "receipt", value: formatRupiah(project?.rap?.realisasi||0, true), label: "Total Biaya", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "trending-up", value: formatRupiah(project?.rap?.estLaba||0, true), label: "Est. Laba", bg: "var(--success-light)", color: "var(--success)" },
      ],
      list: [
        { icon: "wallet", title: "Nilai Kontrak", meta: "Pendapatan bruto", value: formatRupiah(project?.contractValue||0, true), valueColor: "var(--primary)" },
        { icon: "package", title: "Biaya Material", meta: "Total pengeluaran bahan", value: `- ${formatRupiah(project?.budget?.bahan?.actual||0, true)}`, valueColor: "var(--danger)" },
        { icon: "hard-hat", title: "Biaya Tenaga", meta: "Total upah tukang", value: `- ${formatRupiah(project?.budget?.tukang?.actual||0, true)}`, valueColor: "var(--danger)" },
        { icon: "trending-up", title: "Estimasi Laba", meta: "Margin bersih", value: formatRupiah(project?.rap?.estLaba||0, true), valueColor: "var(--success)" },
      ],
      detailRoute: project ? projectDetailRoute(project.id, "keuangan") : undefined,
    },
    "saldo": {
      title: "Saldo Project",
      icon: "wallet",
      cards: [
        { icon: "wallet", value: formatRupiah(project?.saldo||0, true), label: "Saldo Tersedia", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "arrow-down-circle", value: formatRupiah(project?.payments?.reduce((s,p)=>s+p.amount,0)||0, true), label: "Total Masuk", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "arrow-up-circle", value: formatRupiah((project?.budget?.bahan?.actual||0)+(project?.budget?.tukang?.actual||0), true), label: "Total Keluar", bg: "var(--danger-light)", color: "var(--danger)" },
      ],
      list: [...(project?.payments||[]), ...(project?.expenses||[])].slice(0,5).map(tx => ({
        icon: tx.type === 'in' ? 'arrow-down-circle' : 'arrow-up-circle',
        title: String(tx.name),
        meta: formatDate(tx.date),
        value: `${tx.type === 'in' ? '+' : '-'} ${formatRupiah(tx.amount, true)}`,
        bg: tx.type === 'in' ? "var(--success-light)" : "var(--danger-light)",
        color: tx.type === 'in' ? "var(--success)" : "var(--danger)",
        valueColor: tx.type === 'in' ? "var(--success)" : "var(--danger)",
      })),
      detailRoute: project ? projectDetailRoute(project.id, "keuangan") : undefined,
    },
    "kas-bisnis": {
      title: "Kas Bisnis",
      icon: "wallet",
      cards: [
        { icon: "wallet", value: formatRupiah(biz.totalKas, true), label: "Total Kas", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "landmark", value: `${biz.accounts.length} akun`, label: "Jumlah Akun", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "trending-up", value: "+18%", label: "Pertumbuhan", bg: "var(--info-light)", color: "var(--info)" },
      ],
      list: biz.accounts.map(acc => ({
        icon: acc.icon,
        title: acc.name,
        meta: "Akun aktif",
        value: formatRupiah(acc.balance, true),
        bg: "var(--primary-light)",
        color: "var(--primary)",
        valueColor: "var(--primary)",
      })),
      detailRoute: "finance",
    },
    "hutang-bisnis": {
      title: "Hutang Bisnis",
      icon: "receipt",
      cards: [
        { icon: "receipt", value: `${biz.hutangList.length} item`, label: "Jumlah Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "wallet", value: formatRupiah(biz.hutangList.reduce((s,h)=>s+h.amount,0), true), label: "Total Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "clock", value: "3 jatuh tempo", label: "Segera Bayar", bg: "var(--warning-light)", color: "var(--warning-dark)" },
      ],
      list: biz.hutangList.map(h => ({
        icon: h.icon,
        title: h.name,
        meta: `${h.category} • Jatuh tempo: ${formatDate(h.due)}`,
        value: formatRupiah(h.amount, true),
        bg: "var(--danger-light)",
        color: "var(--danger)",
        valueColor: "var(--danger)",
      })),
      detailRoute: "finance",
    },
    "piutang-bisnis": {
      title: "Piutang Bisnis",
      icon: "file-check",
      cards: [
        { icon: "file-check", value: `${biz.piutangList.length} item`, label: "Jumlah Piutang", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "wallet", value: formatRupiah(biz.piutangList.reduce((s,p)=>s+p.amount,0), true), label: "Total Piutang", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "clock", value: "2 aktif", label: "Menunggu", bg: "var(--info-light)", color: "var(--info)" },
      ],
      list: biz.piutangList.map(p => ({
        icon: p.icon,
        title: p.name,
        meta: `${p.category} • Jatuh tempo: ${formatDate(p.due)}`,
        value: formatRupiah(p.amount, true),
        bg: "var(--success-light)",
        color: "var(--success)",
        valueColor: "var(--success)",
      })),
      detailRoute: "finance",
    },
    "aktiva": {
      title: "Total Aktiva",
      icon: "scale",
      cards: [
        { icon: "wallet", value: formatRupiah(biz.totalKas, true), label: "Kas & Bank", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "building-2", value: formatRupiah(biz.asetTetap, true), label: "Aset Tetap", bg: "var(--purple-light)", color: "var(--purple)" },
        { icon: "package", value: "15 jt", label: "Persediaan", bg: "var(--success-light)", color: "var(--success)" },
      ],
      list: [
        { icon: "wallet", title: "Kas & Bank", meta: "4 akun", value: formatRupiah(biz.totalKas, true), valueColor: "var(--primary)" },
        { icon: "file-check", title: "Piutang Klien", meta: "2 klien", value: formatRupiah(biz.piutangList.reduce((s,p)=>s+p.amount,0), true), valueColor: "var(--success)" },
        { icon: "package", title: "Persediaan", meta: "Sisa material", value: "Rp 15jt", valueColor: "var(--gray-800)" },
        { icon: "building-2", title: "Aset Tetap", meta: "5 item", value: formatRupiah(biz.asetTetap, true), valueColor: "var(--purple)" },
      ],
      detailRoute: "finance",
    },
    "pasiva": {
      title: "Total Pasiva",
      icon: "landmark",
      cards: [
        { icon: "receipt", value: formatRupiah(biz.totalHutang, true), label: "Total Hutang", bg: "var(--danger-light)", color: "var(--danger)" },
        { icon: "wallet", value: formatRupiah(biz.ekuitas, true), label: "Ekuitas", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "trending-up", value: formatRupiah(biz.labaDitahan, true), label: "Laba Ditahan", bg: "var(--primary-light)", color: "var(--primary)" },
      ],
      list: [
        { icon: "receipt", title: "Total Hutang", meta: "Kewajiban", value: formatRupiah(biz.totalHutang, true), valueColor: "var(--danger)" },
        { icon: "wallet", title: "Modal Disetor", meta: "Ekuitas awal", value: formatRupiah(biz.modal, true), valueColor: "var(--primary)" },
        { icon: "trending-up", title: "Laba Ditahan", meta: "Akumulasi", value: formatRupiah(biz.labaDitahan, true), valueColor: "var(--success)" },
      ],
      detailRoute: "finance",
    },
    "ekuitas": {
      title: "Ekuitas",
      icon: "wallet",
      cards: [
        { icon: "wallet", value: formatRupiah(biz.modal, true), label: "Modal", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "trending-up", value: formatRupiah(biz.labaDitahan, true), label: "Laba Ditahan", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "scale", value: formatRupiah(biz.ekuitas, true), label: "Total Ekuitas", bg: "var(--purple-light)", color: "var(--purple)" },
      ],
      list: [
        { icon: "wallet", title: "Modal Awal", meta: "Setoran modal", value: formatRupiah(biz.modal, true), valueColor: "var(--primary)" },
        { icon: "trending-up", title: "Laba Ditahan", meta: "Akumulasi laba", value: formatRupiah(biz.labaDitahan, true), valueColor: "var(--success)" },
      ],
      detailRoute: "finance",
    },
    "laba-bisnis": {
      title: "Laba Ditahan Bisnis",
      icon: "trending-up",
      cards: [
        { icon: "trending-up", value: formatRupiah(biz.labaDitahan, true), label: "Laba Ditahan", bg: "var(--success-light)", color: "var(--success)" },
        { icon: "percent", value: `${(biz.labaDitahan/biz.totalAktiva*100).toFixed(1)}%`, label: "Margin", bg: "var(--primary-light)", color: "var(--primary)" },
        { icon: "folder-kanban", value: `${ctx.projects.length} project`, label: "Dari Proyek", bg: "var(--info-light)", color: "var(--info)" },
      ],
      list: ctx.projects.map(p => ({
        icon: "briefcase",
        title: p.name,
        meta: p.client,
        value: formatRupiah(p.rap?.estLaba||0, true),
        valueColor: "var(--success)",
      })),
      detailRoute: "finance",
    },
  };

  return configs[type] || {
    title: "Detail",
    icon: "info",
    cards: [],
    list: [],
  };
}

