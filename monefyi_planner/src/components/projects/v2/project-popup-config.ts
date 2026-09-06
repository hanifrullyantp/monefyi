import type { NormalizedProjectView } from '../../lib/migration/project-normalize';
import type { MappedProjectView } from '../../lib/migration/planner-mapper';
import type { PopupCard, PopupListItem } from '../migration/CardPopup';
import { formatRupiah, formatDateId } from '../../../utils/projectUi';
import { cashAfterExtraPiutang, extraPiutangBeyondContract } from '../../../lib/projects/cashIdentity';

export type ProjectPopupKind =
  | 'bahan' | 'tukang' | 'piutang' | 'hutang'
  | 'saldo' | 'pembayaran' | 'laba' | 'kontrak';

const CONTRACT_TOLERANCE = 1;

type LedgerItem = MappedProjectView['hutangPiutang'][number];

export type CompositionDiagnosis = {
  code: 'CASH_REDUCED_BY_PIUTANG' | 'MISSING_PIUTANG' | 'CONTRACT_UNDERSTATED' | 'OTHER_COSTS' | 'SALDO_GAP' | 'UNEXPLAINED';
  title: string;
  detail: string;
  recommendation: string;
  amount: number;
};

export type ContractCompositionCheck = {
  isMatch: boolean;
  contractValue: number;
  componentsTotal: number;
  gap: number;
  piutang: number;
  cash: number;
  bahan: number;
  tukang: number;
  received: number;
  spent: number;
  expectedPiutang: number;
  extraPiutang: number;
  otherCosts: number;
  diagnoses: CompositionDiagnosis[];
};

/** Kontrak harus = piutang + cash + bahan + tukang (actual). Piutang di luar sisa kontrak memotong kas. */
export function checkContractComposition(normalized: NormalizedProjectView): ContractCompositionCheck {
  const p = normalized.project;
  const piutang = p.budget.piutang || 0;
  const bahan = p.budget.bahan.actual || 0;
  const tukang = p.budget.tukang.actual || 0;
  const contractValue = p.contractValue || 0;
  const received = normalized.totalPemasukan || 0;
  const spent = normalized.totalRealisasi || 0;
  const expectedPiutang = Math.max(0, contractValue - received);
  const extraPiutang = extraPiutangBeyondContract(piutang, contractValue, received);
  const cash = cashAfterExtraPiutang(p.saldo || 0, extraPiutang, received, spent);
  const componentsTotal = piutang + cash + bahan + tukang;
  const gap = contractValue - componentsTotal;
  const otherCosts = spent - bahan - tukang;
  const missingPiutang = expectedPiutang - piutang;
  const grossCash = received - spent;

  const diagnoses: CompositionDiagnosis[] = [];
  if (extraPiutang > CONTRACT_TOLERANCE) {
    diagnoses.push({
      code: 'CASH_REDUCED_BY_PIUTANG',
      title: 'Kas dikurangi piutang terbuka',
      detail: `Piutang ${formatRupiah(extraPiutang)} memotong kas. Dana masuk − realisasi ${formatRupiah(grossCash)} → kas ${formatRupiah(cash)}.`,
      recommendation: 'Piutang yang belum tertagih mengurangi cash, bukan menambah total aktiva di atas nilai kontrak.',
      amount: extraPiutang,
    });
  }

  if (Math.abs(gap) > CONTRACT_TOLERANCE) {
    if (missingPiutang > CONTRACT_TOLERANCE && expectedPiutang > 0) {
      diagnoses.push({
        code: 'MISSING_PIUTANG',
        title: 'Piutang lebih kecil dari sisa kontrak',
        detail: `Sisa kontrak yang belum diterima ${formatRupiah(expectedPiutang)}, tetapi piutang tercatat hanya ${formatRupiah(piutang)}.`,
        recommendation: 'Catat piutang klien untuk sisa termin, atau sesuaikan nilai kontrak jika sudah dinegosiasi ulang.',
        amount: missingPiutang,
      });
    }

    if (Math.abs(otherCosts) > CONTRACT_TOLERANCE) {
      diagnoses.push({
        code: 'OTHER_COSTS',
        title: 'Realisasi tidak sama dengan Bahan + Tukang',
        detail: `Total realisasi ${formatRupiah(spent)} vs Bahan ${formatRupiah(bahan)} + Tukang ${formatRupiah(tukang)} (selisih ${formatRupiah(otherCosts)}).`,
        recommendation: 'Periksa biaya di luar RAP bahan/tukang (overhead, transport, lain-lain) yang masuk realisasi.',
        amount: otherCosts,
      });
    }

    const unexplainedOnly = diagnoses.filter(d => d.code !== 'CASH_REDUCED_BY_PIUTANG');
    if (unexplainedOnly.length === 0) {
      diagnoses.push({
        code: 'UNEXPLAINED',
        title: 'Selisih belum teridentifikasi otomatis',
        detail: `Kontrak ${formatRupiah(contractValue)} ≠ Piutang + Kas + Bahan + Tukang ${formatRupiah(componentsTotal)}.`,
        recommendation: 'Buka tab Keuangan dan cocokkan termin, piutang, serta realisasi satu per satu.',
        amount: gap,
      });
    }
  }

  return {
    isMatch: Math.abs(gap) <= CONTRACT_TOLERANCE,
    contractValue,
    componentsTotal,
    gap,
    piutang,
    cash,
    bahan,
    tukang,
    received,
    spent,
    expectedPiutang,
    extraPiutang,
    otherCosts,
    diagnoses,
  };
}

function groupLedgerByParty(
  items: LedgerItem[],
  valueColor: string,
  onPartyClick?: (partyName: string) => void,
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
      meta: `${count} item · ketuk untuk lihat akun`,
      value: formatRupiah(total),
      valueColor,
      onClick: onPartyClick ? () => onPartyClick(title) : undefined,
    }));
}

export function buildProjectPopupConfig(
  kind: ProjectPopupKind | null,
  normalized: NormalizedProjectView,
  options?: { onPartyClick?: (partyName: string) => void },
): {
  title: string;
  cards: PopupCard[];
  list: PopupListItem[];
  detailTab?: 'rap' | 'keuangan';
} | null {
  if (!kind) return null;
  const p = normalized.project;

  if (kind === 'kontrak') {
    const check = checkContractComposition(normalized);
    const gapAbs = Math.abs(check.gap);
    return {
      title: 'Komposisi vs Nilai Kontrak',
      detailTab: 'keuangan',
      cards: [
        { value: formatRupiah(check.contractValue), label: 'Nilai Kontrak' },
        { value: formatRupiah(check.componentsTotal), label: 'Jumlah Komponen' },
        { value: formatRupiah(gapAbs), label: check.gap < 0 ? 'Komponen lebih' : 'Kontrak lebih' },
      ],
      list: [
        { title: 'Piutang', meta: `Seharusnya sisa kontrak ${formatRupiah(check.expectedPiutang)}`, value: formatRupiah(check.piutang), valueColor: check.extraPiutang > 1 ? '#d97706' : undefined },
        { title: 'Cash / Kas', meta: check.extraPiutang > 0 ? `Dana masuk − realisasi − piutang ${formatRupiah(check.extraPiutang)}` : 'Dana masuk − realisasi', value: formatRupiah(check.cash) },
        { title: 'Bahan (actual)', meta: 'Realisasi material', value: formatRupiah(check.bahan) },
        { title: 'Tukang (actual)', meta: 'Realisasi upah', value: formatRupiah(check.tukang) },
        { title: 'Dana masuk', meta: 'Pembayaran klien diterima', value: formatRupiah(check.received) },
        ...check.diagnoses.map(d => ({
          title: d.title,
          meta: `${d.detail} → ${d.recommendation}`,
          value: formatRupiah(Math.abs(d.amount)),
          valueColor: '#d97706',
          wrap: true,
        })),
      ],
    };
  }

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
    const cashCheck = checkContractComposition(normalized);
    return {
      title: 'Saldo Project', detailTab: 'keuangan',
      cards: [
        { value: formatRupiah(cashCheck.cash), label: 'Saldo Kas' },
        { value: formatRupiah(normalized.totalPemasukan), label: 'Dana Masuk' },
        { value: formatRupiah(normalized.totalRealisasi), label: 'Realisasi' },
      ],
      list: [
        { title: 'Dana Masuk', meta: 'Total pembayaran klien', value: formatRupiah(normalized.totalPemasukan) },
        { title: 'Realisasi', meta: 'Total biaya tercatat', value: formatRupiah(normalized.totalRealisasi), valueColor: '#e11d48' },
        ...(cashCheck.extraPiutang > 0
          ? [{ title: 'Piutang (memotong kas)', meta: 'Di luar sisa kontrak', value: formatRupiah(cashCheck.extraPiutang), valueColor: '#d97706' }]
          : []),
        {
          title: cashCheck.extraPiutang > 0 ? 'Saldo (= Masuk − Realisasi − Piutang)' : 'Saldo (= Masuk − Realisasi)',
          meta: cashCheck.cash < 0 ? 'Defisit kas' : 'Kas tersedia',
          value: formatRupiah(cashCheck.cash),
          valueColor: cashCheck.cash < 0 ? '#e11d48' : '#059669',
        },
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
    const grouped = groupLedgerByParty(normalized.hutangItems, '#e11d48', options?.onPartyClick);
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

  const groupedPiutang = groupLedgerByParty(piutangItems, '#059669', options?.onPartyClick);
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
