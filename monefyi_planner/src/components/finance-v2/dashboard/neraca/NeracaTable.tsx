import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { NeracaData } from '../types';
import { computeNeracaTotals } from '../mapSnapshotToNeraca';
import { neracaColors } from '../neracaColors';
import NeracaCell from './NeracaCell';
import SubtotalRow from './SubtotalRow';
import GrandTotalRow from './GrandTotalRow';
import SkeletonNeraca from '../shared/SkeletonNeraca';
import CurrencyDisplay from '../shared/CurrencyDisplay';

const TOOLTIPS = {
  kas: 'Uang paling liquid — siap dipakai kapan saja. Termasuk kas tangan, rekening bank, dan kas proyek aktif.',
  piutang: 'Uang yang seharusnya masuk tapi belum dibayar ke kita. Pantau terus — makin lama makin sulit ditagih.',
  stok: 'Nilai bahan yang sudah dibeli tapi belum dipakai. Ini aset karena bisa dipakai atau dijual.',
  aset: 'Aset fisik bisnis: kendaraan, mesin, alat. Nilainya turun seiring waktu (depresiasi).',
  prabayar: 'Biaya sudah dibayar di muka tapi belum habis. Contoh: voucher listrik untuk 30 hari.',
  hutangDagang: 'Tagihan dari supplier yang belum dibayar. Selesaikan sesuai jatuh tempo.',
  hutangPajak: 'PPN atau PPh yang sudah dipungut tapi belum disetor ke negara.',
  hutangLain: 'Pinjaman dari orang lain, institusi, atau kewajiban lain.',
  modal: 'Uang yang diinvestasikan owner atau investor. Bukan pendapatan.',
  labaDitahan: 'Keuntungan periode sebelumnya yang tidak dibagikan.',
  laba: 'Keuntungan bersih periode ini setelah semua biaya.',
} as const;

interface Props {
  data: NeracaData;
  onQuickActionKas?: () => void;
}

function SummaryCard({
  title,
  subtitle,
  items,
  total,
  totalLabel,
  accent,
}: {
  title: string;
  subtitle: string;
  items: { label: string; value: number; route: string }[];
  total: number;
  totalLabel: string;
  accent: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className={`px-4 py-3 ${accent}`}>
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs opacity-80 italic">{subtitle}</div>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map(item => (
          <li key={item.label}>
            <button
              type="button"
              onClick={() => navigate(item.route)}
              className="w-full flex justify-between px-4 py-2.5 text-sm hover:bg-slate-50"
            >
              <span className="text-slate-700">{item.label}</span>
              <CurrencyDisplay value={item.value} />
            </button>
          </li>
        ))}
      </ul>
      <div className={`px-4 py-3 flex justify-between font-black ${accent}`}>
        <span>{totalLabel}</span>
        <CurrencyDisplay value={total} />
      </div>
    </div>
  );
}

export default function NeracaTable({ data, onQuickActionKas }: Props) {
  const [mobileMode, setMobileMode] = useState<'table' | 'summary'>('summary');
  const totals = computeNeracaTotals(data);

  if (data.isLoading) return <SkeletonNeraca />;

  if (data.error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        ⚠️ {data.error}
      </div>
    );
  }

  const isEmpty = totals.totalAktiva === 0 && totals.totalPasiva === 0;

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-3">
        <div className="text-4xl">📊</div>
        <h3 className="font-bold text-slate-800">Neraca Anda masih kosong</h3>
        <p className="text-sm text-slate-500">Mulai dengan mencatat saldo awal bisnis</p>
        <button
          type="button"
          onClick={onQuickActionKas}
          className="inline-flex px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold"
        >
          + Catat Saldo Awal Kas
        </button>
      </div>
    );
  }

  const aktivaItems = [
    { label: 'Kas', value: data.kas, route: '/app/finance-v2/kas' },
    { label: 'Piutang', value: data.piutang, route: '/app/finance-v2/piutang' },
    { label: 'Stok', value: data.stok, route: '/app/finance-v2/stok' },
    { label: 'Properti & Peralatan', value: data.propertiPeralatan, route: '/app/finance-v2/aset' },
    { label: 'Pra Bayar', value: data.praBayar, route: '/app/finance-v2/prabayar' },
  ];

  const kewajibanItems = [
    { label: 'Hutang Dagang', value: data.hutangDagang, route: '/app/finance-v2/hutang?type=dagang' },
    { label: 'Hutang Pajak', value: data.hutangPajak, route: '/app/finance-v2/hutang?type=pajak' },
    { label: 'Hutang Lain', value: data.hutangLain, route: '/app/finance-v2/hutang?type=lain' },
  ];

  const modalItems = [
    { label: 'Modal Disetor', value: data.modalDisetor, route: '/app/finance-v2/investor' },
    { label: 'Laba Ditahan', value: data.labaDitahan, route: '/app/finance-v2/laporan' },
    { label: 'Laba Periode', value: data.labaPeriode, route: '/app/finance-v2/laporan' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="space-y-3"
    >
      <div className="flex md:hidden gap-2">
        <button
          type="button"
          onClick={() => setMobileMode('table')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold ${mobileMode === 'table' ? 'bg-amber-100 text-amber-900' : 'bg-white border'}`}
        >
          📊 Tabel
        </button>
        <button
          type="button"
          onClick={() => setMobileMode('summary')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold ${mobileMode === 'summary' ? 'bg-amber-100 text-amber-900' : 'bg-white border'}`}
        >
          📋 Ringkasan
        </button>
      </div>

      {/* Mobile summary */}
      <div className={`md:hidden space-y-3 ${mobileMode === 'summary' ? '' : 'hidden'}`}>
        <SummaryCard
          title="AKTIVA"
          subtitle="Semua yang dimiliki"
          items={aktivaItems}
          total={totals.totalAktiva}
          totalLabel="Total Aktiva"
          accent="bg-amber-100 text-amber-950"
        />
        <SummaryCard
          title="KEWAJIBAN"
          subtitle="Yang harus dibayar"
          items={kewajibanItems}
          total={totals.totalKewajiban}
          totalLabel="Total Kewajiban"
          accent="bg-orange-100 text-orange-950"
        />
        <SummaryCard
          title="MODAL"
          subtitle="Sumber dana"
          items={modalItems}
          total={totals.totalModal}
          totalLabel="Total Modal"
          accent="bg-yellow-50 text-amber-950"
        />
        <GrandTotalRow
          totalAktiva={totals.totalAktiva}
          totalPasiva={totals.totalPasiva}
          isBalanced={totals.isBalanced}
          variance={totals.variance}
        />
      </div>

      {/* Desktop / mobile table */}
      <div className={`rounded-2xl border-2 border-slate-300 overflow-hidden shadow-sm ${mobileMode === 'table' ? 'block' : 'hidden md:block'}`}>
        <div className="grid grid-cols-2">
          <div
            className="py-2.5 text-center text-xs font-bold uppercase tracking-wider"
            style={{ backgroundColor: neracaColors.headerAktiva.zone, color: '#fff' }}
          >
            AKTIVA
            <div className="text-[10px] font-normal normal-case opacity-90 italic">Semua yang Dimiliki</div>
          </div>
          <div className="py-2.5 text-center text-xs font-bold uppercase tracking-wider bg-white text-slate-700 border-l border-slate-300">
            PASIVA
            <div className="text-[10px] font-normal normal-case opacity-80 italic">Dari Mana Modal Berasal</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[5fr_6fr] divide-x divide-slate-300">
              <div
                className="text-center py-1.5 text-[11px] font-bold uppercase"
                style={{ backgroundColor: neracaColors.headerAktiva.subZone, color: neracaColors.headerAktiva.text }}
              >
                ASSET / AKTIVA
              </div>
              <div className="grid grid-cols-2">
                <div
                  className="text-center py-1.5 text-[11px] font-bold uppercase border-r border-orange-300"
                  style={{ backgroundColor: neracaColors.kewajiban.zone, color: '#fff' }}
                >
                  KEWAJIBAN
                  <div className="text-[9px] font-normal normal-case">Yang harus dibayar</div>
                </div>
                <div
                  className="text-center py-1.5 text-[11px] font-bold uppercase"
                  style={{ backgroundColor: neracaColors.modal.zone, color: neracaColors.modal.text }}
                >
                  MODAL
                  <div className="text-[9px] font-normal normal-case">Sumber dana</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[5fr_6fr] divide-x divide-slate-300">
              <div className="grid grid-cols-5">
                <NeracaCell label="Kas" value={data.kas} navigateTo="/app/finance-v2/kas" colorZone="aktiva" tooltipContent={TOOLTIPS.kas} breakdown={data.kasBreakdown.map(b => ({ label: b.name, amount: b.amount }))} quickActionLabel="+ Catat Transaksi" onQuickAction={onQuickActionKas} />
                <NeracaCell label="Piutang" value={data.piutang} navigateTo="/app/finance-v2/piutang" colorZone="aktiva" tooltipContent={TOOLTIPS.piutang} breakdown={data.piutangBreakdown.map(b => ({ label: b.name, amount: b.amount }))} />
                <NeracaCell label="Stok" value={data.stok} navigateTo="/app/finance-v2/stok" colorZone="aktiva" tooltipContent={TOOLTIPS.stok} />
                <NeracaCell label="Properti" subLabel="& Peralatan" value={data.propertiPeralatan} navigateTo="/app/finance-v2/aset" colorZone="aktiva" tooltipContent={TOOLTIPS.aset} />
                <NeracaCell label="Pra Bayar" value={data.praBayar} navigateTo="/app/finance-v2/prabayar" colorZone="aktiva" tooltipContent={TOOLTIPS.prabayar} />
              </div>
              <div className="grid grid-cols-6">
                <NeracaCell label="Hutang" subLabel="Dagang" value={data.hutangDagang} navigateTo="/app/finance-v2/hutang?type=dagang" colorZone="kewajiban" tooltipContent={TOOLTIPS.hutangDagang} />
                <NeracaCell label="Hutang" subLabel="Pajak" value={data.hutangPajak} navigateTo="/app/finance-v2/hutang?type=pajak" colorZone="kewajiban" tooltipContent={TOOLTIPS.hutangPajak} />
                <NeracaCell label="Hutang" subLabel="Lain" value={data.hutangLain} navigateTo="/app/finance-v2/hutang?type=lain" colorZone="kewajiban" tooltipContent={TOOLTIPS.hutangLain} />
                <NeracaCell label="Modal" subLabel="Disetor" value={data.modalDisetor} navigateTo="/app/finance-v2/investor" colorZone="modal" tooltipContent={TOOLTIPS.modal} />
                <NeracaCell label="Laba" subLabel="Ditahan" value={data.labaDitahan} navigateTo="/app/finance-v2/laporan" colorZone="modal" tooltipContent={TOOLTIPS.labaDitahan} />
                <NeracaCell label="Laba" subLabel="Periode" value={data.labaPeriode} navigateTo="/app/finance-v2/laporan" colorZone="modal" tooltipContent={TOOLTIPS.laba} />
              </div>
            </div>
          </div>
        </div>
        <p className="md:hidden text-[10px] text-center text-slate-400 py-1">← Geser untuk lihat semua →</p>

        <SubtotalRow
          totalAktiva={totals.totalAktiva}
          totalKewajiban={totals.totalKewajiban}
          totalModal={totals.totalModal}
        />
        <GrandTotalRow
          totalAktiva={totals.totalAktiva}
          totalPasiva={totals.totalPasiva}
          isBalanced={totals.isBalanced}
          variance={totals.variance}
        />
      </div>
    </motion.div>
  );
}
