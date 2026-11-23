import CurrencyDisplay from '../shared/CurrencyDisplay';
import { neracaColors } from '../neracaColors';

interface Props {
  totalAktiva: number;
  totalKewajiban: number;
  totalModal: number;
}

export default function SubtotalRow({ totalAktiva, totalKewajiban, totalModal }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-300 text-xs font-bold">
      <div
        className="px-3 py-2 flex justify-between items-center"
        style={{ backgroundColor: neracaColors.headerAktiva.totalRow, color: neracaColors.headerAktiva.text }}
      >
        <span>TOTAL AKTIVA</span>
        <CurrencyDisplay value={totalAktiva} className="font-bold" />
      </div>
      <div
        className="px-3 py-2 flex flex-col sm:flex-row sm:justify-between gap-1 border-t md:border-t-0 md:border-l border-slate-300"
        style={{ backgroundColor: neracaColors.kewajiban.totalRow, color: neracaColors.kewajiban.text }}
      >
        <span className="flex justify-between sm:block gap-4">
          <span>Kewajiban:</span>
          <CurrencyDisplay value={totalKewajiban} className="font-bold" />
        </span>
        <span className="flex justify-between sm:block gap-4 text-right" style={{ color: neracaColors.modal.text }}>
          <span>Modal:</span>
          <CurrencyDisplay value={totalModal} className="font-bold" />
        </span>
      </div>
    </div>
  );
}
