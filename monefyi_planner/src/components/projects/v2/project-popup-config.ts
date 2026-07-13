import type { NormalizedProjectView } from '../../lib/migration/project-normalize';
import type { PopupCard, PopupListItem } from '../migration/CardPopup';
import { formatRupiah, formatDateId } from '../../../utils/projectUi';

export type ProjectPopupKind =
  | 'bahan' | 'tukang' | 'piutang' | 'hutang'
  | 'saldo' | 'pembayaran' | 'laba';

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
        ...(p.budget.hutang > 0 ? [{ title: 'Hutang Vendor', meta: 'Realisasi melebihi dana masuk', value: formatRupiah(p.budget.hutang), valueColor: '#e11d48' }] : []),
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
    return {
      title: 'Hutang Project', detailTab: 'keuangan',
      cards: [
        { value: `${normalized.hutangItems.length} pihak`, label: 'Jumlah Hutang' },
        { value: formatRupiah(p.budget.hutang), label: 'Total Hutang' },
        { value: p.saldo < 0 ? 'Defisit Kas' : 'Aktif', label: 'Status' },
      ],
      list: normalized.hutangItems.map(h => ({
        title: h.name,
        meta: `Kepada: ${h.partyName || h.name} · Jatuh tempo: ${formatDateId(h.due)}`,
        value: formatRupiah(h.amount),
        valueColor: '#e11d48',
      })),
    };
  }

  // piutang
  const piutangList = normalized.piutangItems.length > 0
    ? normalized.piutangItems.map(item => ({
        title: item.partyName || item.name,
        meta: `Piutang proyek · Jatuh tempo: ${formatDateId(item.due)}`,
        value: formatRupiah(item.amount),
        valueColor: '#059669',
      }))
    : p.budget.piutang > 0
      ? [{
          title: p.client || 'Klien',
          meta: 'Piutang belum ditagih — sisa nilai kontrak',
          value: formatRupiah(p.budget.piutang),
          valueColor: '#059669',
        }]
      : [];

  return {
    title: 'Piutang Project', detailTab: 'keuangan',
    cards: [
      { value: piutangList.length > 0 ? `${piutangList.length} pihak` : '0 pihak', label: 'Debitur' },
      { value: formatRupiah(p.budget.piutang), label: 'Total Piutang' },
      { value: p.client || '—', label: 'Klien' },
    ],
    list: piutangList,
  };
}
