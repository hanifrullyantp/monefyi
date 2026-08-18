import type { NormalizedProjectView } from '../../lib/migration/project-normalize';
import type { MappedProjectView } from '../../lib/migration/planner-mapper';
import type { PopupCard, PopupListItem } from '../migration/CardPopup';
import { formatRupiah, formatDateId } from '../../../utils/projectUi';

export type ProjectPopupKind =
  | 'bahan' | 'tukang' | 'piutang' | 'hutang'
  | 'saldo' | 'pembayaran' | 'laba';

const CONTRACT_TOLERANCE = 1;

type LedgerItem = MappedProjectView['hutangPiutang'][number];

/** Kontrak harus = piutang + cash + bahan + tukang (actual). */
export function checkContractComposition(normalized: NormalizedProjectView): {
  isMatch: boolean;
  contractValue: number;
  componentsTotal: number;
  gap: number;
  piutang: number;
  cash: number;
  bahan: number;
  tukang: number;
} {
  const p = normalized.project;
  const piutang = p.budget.piutang || 0;
  const cash = p.saldo || 0;
  const bahan = p.budget.bahan.actual || 0;
  const tukang = p.budget.tukang.actual || 0;
  const componentsTotal = piutang + cash + bahan + tukang;
  const contractValue = p.contractValue || 0;
  const gap = contractValue - componentsTotal;
  return {
    isMatch: Math.abs(gap) <= CONTRACT_TOLERANCE,
    contractValue,
    componentsTotal,
    gap,
    piutang,
    cash,
    bahan,
    tukang,
  };
}

function groupLedgerByParty(
  items: LedgerItem[],
  valueColor: string,
): PopupListItem[] {
  const groups = new Map<string, { count: number; total: number }>();
  for (const item of items) {
    const key = (item.partyName || item.name).trim() || 'Lainnya';
    const g = groups.get(key) || { count: 0, total: 0 };
    g.count += 1;
    g.total += item.amount;
    groups.set(key, g);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([title, { count, total }]) => ({
      title,
      meta: `${count} item`,
      value: formatRupiah(total),
      valueColor,
    }));
}

export function buildProjectPopupConfig(
  kind: ProjectPopupKind | null,
  normalized: NormalizedProjectView,
): {
  title: string;
  cards: PopupCard[];
  list: PopupListItem[];
  detailTab?: 'rap' | 'keuangan';
} | null {
  if (!kind) return null;
  const p = normalized.project;

  if (kind === 'bahan') {
    const mats = p.rap.materials;
    return {
      title: 'Material / Bahan', detailTab: 'rap',
      cards: [
        { value: `${mats.length} item`, label: 'Jumlah Item' },
        { value: formatRupiah(p.budget.bahan.actual), label: 'Total Nominal' },
        { value: `${new Set(mats.map(m => m.vendor).filter(Boolean)).size} vendor`, label: 'Vendor' },
      ],
      list: mats.map(m => ({
        title: m.name,
        meta: `${m.qtyActual} ${m.unit} × ${formatRupiah(m.unitPrice)}`,
        value: formatRupiah(m.total),
        valueColor: m.status === 'over' ? '#e11d48' : undefined,
      })),
    };
  }

  if (kind === 'tukang') {
    const workers = p.rap.workers;
    return {
      title: 'Tenaga Kerja', detailTab: 'rap',
      cards: [
        { value: `${workers.length} tukang`, label: 'Jumlah Tenaga' },
        { value: formatRupiah(p.budget.tukang.actual), label: 'Total Upah' },
        { value: `${workers.reduce((s, w) => s + w.qtyActual, 0)} hari`, label: 'Total Hari' },
      ],
      list: workers.map(w => ({
        title: w.name,
        meta: `${w.qtyActual} hari × ${formatRupiah(w.unitPrice)}`,
        value: formatRupiah(w.total),
      })),
    };
  }

  if (kind === 'saldo') {
    return {
      title: 'Saldo Project', detailTab: 'keuangan',
      cards: [
        { value: formatRupiah(p.saldo), label: 'Saldo Kas' },
        { value: formatRupiah(normalized.totalPemasukan), label: 'Dana Masuk' },
        { value: formatRupiah(normalized.totalRealisasi), label: 'Realisasi' },
      ],
      list: [
        { title: 'Dana Masuk', meta: 'Total pembayaran klien', value: formatRupiah(normalized.totalPemasukan) },
        { title: 'Realisasi', meta: 'Total biaya tercatat', value: formatRupiah(normalized.totalRealisasi), valueColor: '#e11d48' },
        { title: 'Saldo (= Masuk − Realisasi)', meta: p.saldo < 0 ? 'Defisit kas' : 'Kas tersedia', value: formatRupiah(p.saldo), valueColor: p.saldo < 0 ? '#e11d48' : '#059669' },
        ...(p.budget.hutang > 0 ? [{ title: 'Hutang Vendor', meta: 'Hutang tercatat ke vendor / pihak lain', value: formatRupiah(p.budget.hutang), valueColor: '#e11d48' }] : []),
      ],
    };
  }

  if (kind === 'pembayaran') {
    return {
      title: 'Riwayat Pembayaran', detailTab: 'keuangan',
      cards: [
        { value: `${p.payments.length} termin`, label: 'Jumlah Termin' },
        { value: formatRupiah(normalized.totalPemasukan), label: 'Total Diterima' },
        { value: `${p.contractValue > 0 ? ((normalized.totalPemasukan / p.contractValue) * 100).toFixed(0) : 0}%`, label: 'Dari Kontrak' },
      ],
      list: p.payments.map(pay => ({
        title: pay.name,
        meta: formatDateId(pay.date),
        value: formatRupiah(pay.amount),
        valueColor: '#059669',
      })),
    };
  }

  if (kind === 'laba') {
    const margin = p.contractValue > 0 ? ((p.rap.estLaba / p.contractValue) * 100).toFixed(1) : '0';
    return {
      title: 'Estimasi Laba', detailTab: 'keuangan',
      cards: [
        { value: formatRupiah(p.rap.estLaba), label: 'Est. Laba' },
        { value: formatRupiah(p.contractValue), label: 'Nilai Kontrak' },
        { value: `${margin}%`, label: 'Margin' },
      ],
      list: [
        { title: 'Nilai Kontrak', meta: 'Total nilai proyek', value: formatRupiah(p.contractValue) },
        { title: 'Realisasi', meta: 'Biaya yang sudah keluar', value: formatRupiah(p.rap.realisasi), valueColor: '#e11d48' },
        { title: 'Est. Laba', meta: 'Kontrak − Realisasi', value: formatRupiah(p.rap.estLaba), valueColor: '#059669' },
      ],
    };
  }

  if (kind === 'hutang') {
    const grouped = groupLedgerByParty(normalized.hutangItems, '#e11d48');
    const subjectCount = grouped.length;
    const itemCount = normalized.hutangItems.length;
    return {
      title: 'Hutang Project', detailTab: 'keuangan',
      cards: [
        { value: `${subjectCount} subjek`, label: 'Kelompok Hutang' },
        { value: `${itemCount} item`, label: 'Jumlah Item' },
        { value: formatRupiah(p.budget.hutang), label: 'Total Hutang' },
      ],
      list: grouped.length > 0 ? grouped : [{
        title: 'Belum ada hutang',
        meta: 'Catat hutang vendor dari tab Keuangan',
        value: formatRupiah(0),
      }],
    };
  }

  // piutang
  const piutangItems = normalized.piutangItems.length > 0
    ? normalized.piutangItems
    : p.budget.piutang > 0
      ? [{
          id: 0,
          type: 'piutang' as const,
          name: `Piutang ${p.client || 'Klien'}`,
          partyName: p.client || 'Klien',
          amount: p.budget.piutang,
          due: p.endDate,
          status: 'upcoming',
        }]
      : [];

  const groupedPiutang = groupLedgerByParty(piutangItems, '#059669');
  const piutangSubjectCount = groupedPiutang.length;

  return {
    title: 'Piutang Project', detailTab: 'keuangan',
    cards: [
      { value: `${piutangSubjectCount} subjek`, label: 'Kelompok Piutang' },
      { value: `${piutangItems.length} item`, label: 'Jumlah Item' },
      { value: formatRupiah(p.budget.piutang), label: 'Total Piutang' },
    ],
    list: groupedPiutang.length > 0 ? groupedPiutang : [{
      title: 'Belum ada piutang',
      meta: 'Catat piutang klien dari tab Keuangan',
      value: formatRupiah(0),
    }],
  };
}
