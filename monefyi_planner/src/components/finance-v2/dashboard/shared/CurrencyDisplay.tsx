import { formatFinanceRupiah } from '../../../../lib/financeV2Calc';
import { formatRupiah } from '../../../../utils/projectUi';
import { useCountUp } from './useCountUp';

interface Props {
  value: number;
  variant?: 'full' | 'short';
  animate?: boolean;
  className?: string;
  negativeRed?: boolean;
  emptyAsDash?: boolean;
}

export default function CurrencyDisplay({
  value,
  variant = 'full',
  animate = false,
  className = '',
  negativeRed = true,
  emptyAsDash = true,
}: Props) {
  const animated = useCountUp(value);
  const display = animate ? animated : value;
  const formatted = variant === 'short' ? formatRupiah(display) : formatFinanceRupiah(display);
  const isNegative = value < 0;

  if (!Number.isFinite(value) || (emptyAsDash && value === 0)) {
    return <span className={`text-slate-400 italic ${className}`}>—</span>;
  }

  return (
    <span
      className={`tabular-nums ${negativeRed && isNegative ? 'text-rose-600' : ''} ${className}`}
    >
      {formatted}
    </span>
  );
}
