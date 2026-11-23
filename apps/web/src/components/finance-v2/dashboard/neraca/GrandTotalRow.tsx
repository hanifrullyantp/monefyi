import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatFinanceRupiah } from '../../../../lib/financeV2Calc';
import { neracaColors } from '../neracaColors';

interface Props {
  totalAktiva: number;
  totalPasiva: number;
  isBalanced: boolean;
  variance: number;
}

export default function GrandTotalRow({ totalAktiva, totalPasiva, isBalanced, variance }: Props) {
  const [pulseKey, setPulseKey] = useState(0);
  const bg = isBalanced ? neracaColors.grandTotal.balanced : neracaColors.grandTotal.unbalanced;

  useEffect(() => {
    setPulseKey(k => k + 1);
  }, [totalAktiva, totalPasiva, isBalanced]);

  return (
    <motion.div
      key={pulseKey}
      initial={isBalanced ? { scale: 1 } : { x: 0 }}
      animate={
        isBalanced
          ? { scale: [1, 1.02, 1] }
          : { x: [0, -4, 4, -4, 4, 0] }
      }
      transition={{ duration: isBalanced ? 0.3 : 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 text-white font-extrabold text-sm md:text-base"
      style={{ backgroundColor: bg }}
    >
      <div className="px-4 py-3.5 text-center md:text-left border-b md:border-b-0 md:border-r border-white/20">
        <div>{isBalanced ? '✅' : '⚠️'} {formatFinanceRupiah(totalAktiva)}</div>
        <div className="text-xs font-normal opacity-90">Semua yang dimiliki</div>
      </div>
      <div className="px-4 py-3.5 text-center md:text-right">
        <div>
          {isBalanced ? '✅' : '⚠️'} {formatFinanceRupiah(totalPasiva)}
          {isBalanced ? '  ⚖️ SEIMBANG' : `  Selisih: ${formatFinanceRupiah(Math.abs(variance))}`}
        </div>
        <div className="text-xs font-normal opacity-90">
          {isBalanced ? 'Semua sumber modal' : 'Periksa entri jurnal'}
        </div>
      </div>
    </motion.div>
  );
}
