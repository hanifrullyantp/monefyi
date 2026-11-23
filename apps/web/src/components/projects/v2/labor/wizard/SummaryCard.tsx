import { useEffect, useState } from 'react';
import { CalendarCheck, Clock, Wallet } from 'lucide-react';
import { formatRupiah } from '../../../../../utils/projectUi';
import type { WizardVariant } from '../../../../../hooks/useWizardVariant';

type Props = {
  days: number;
  hours: number;
  total: number;
  mode: 'planned' | 'actual';
  variant: WizardVariant;
};

export default function SummaryCard({ days, hours, total }: Props) {
  const [displayTotal, setDisplayTotal] = useState(total);

  useEffect(() => {
    const start = displayTotal;
    const diff = total - start;
    if (diff === 0) return;
    const t0 = performance.now();
    const dur = 400;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setDisplayTotal(Math.round(start + diff * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  return (
    <div className="wz-summary">
      <div className="wz-summary-metrics">
        <span className="wz-summary-metric">
          <CalendarCheck className="w-4 h-4" /> {days} hari
        </span>
        <span className="wz-summary-metric">
          <Clock className="w-4 h-4" /> {hours} jam
        </span>
      </div>
      <div className="wz-summary-metric mt-2">
        <Wallet className="w-4 h-4" /> Total:
      </div>
      <div className="wz-summary-total">{formatRupiah(displayTotal)}</div>
    </div>
  );
}
