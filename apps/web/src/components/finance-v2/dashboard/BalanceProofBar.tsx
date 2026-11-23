import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatRupiah } from '../../../utils/projectUi';
import CurrencyDisplay from './shared/CurrencyDisplay';

interface Props {
  totalAktiva: number;
  totalPasiva: number;
  totalKewajiban: number;
  totalModal: number;
  isBalanced: boolean;
}

export default function BalanceProofBar({
  totalAktiva,
  totalPasiva,
  totalKewajiban,
  totalModal,
  isBalanced,
}: Props) {
  const [animate, setAnimate] = useState(false);
  const max = Math.max(totalAktiva, totalPasiva, 1);
  const aktivaPct = (totalAktiva / max) * 100;
  const pasivaPct = (totalPasiva / max) * 100;
  const kewajibanShare = totalPasiva > 0 ? (totalKewajiban / totalPasiva) * 100 : 0;
  const modalShare = totalPasiva > 0 ? (totalModal / totalPasiva) * 100 : 0;

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 300);
    return () => clearTimeout(t);
  }, [totalAktiva, totalPasiva]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl border border-slate-100 p-4 md:p-5 space-y-4"
    >
      <h3 className="text-sm font-bold text-slate-700">Bukti Keseimbangan</h3>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>AKTIVA</span>
          <CurrencyDisplay value={totalAktiva} variant="short" />
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
            initial={{ width: 0 }}
            animate={{ width: animate ? `${aktivaPct}%` : 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>PASIVA</span>
          <CurrencyDisplay value={totalPasiva} variant="short" />
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: animate ? `${(pasivaPct * kewajibanShare) / 100}%` : 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          />
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: animate ? `${(pasivaPct * modalShare) / 100}%` : 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          />
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
          <span>Kewajiban {formatRupiah(totalKewajiban)} ({kewajibanShare.toFixed(0)}%)</span>
          <span>Modal {formatRupiah(totalModal)} ({modalShare.toFixed(0)}%)</span>
          {isBalanced && <span className="text-emerald-600 font-bold">⚖️ Lebar bar seimbang</span>}
        </div>
      </div>
    </motion.div>
  );
}
