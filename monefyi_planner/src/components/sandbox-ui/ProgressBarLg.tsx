type Props = {
  value: number;
  max?: number;
  label?: string;
  variant?: 'danger' | 'success' | 'primary' | 'orange';
  className?: string;
};

const VARIANT: Record<string, string> = {
  danger: 'bg-rose-500',
  success: 'bg-emerald-500',
  primary: 'bg-blue-500',
  orange: 'bg-amber-500',
};

export default function ProgressBarLg({ value, max = 100, label, variant = 'danger', className = '' }: Props) {
  const pct = max > 0 && Number.isFinite(value)
    ? Math.min(Math.max((value / max) * 100, 0), 100)
    : 0;
  const hasFill = pct > 0;
  const showLabel = hasFill && Boolean(label);
  return (
    <div className={`h-7 bg-slate-100 rounded-lg overflow-hidden relative ${className}`}>
      {hasFill && (
        <div
          className={`h-full ${VARIANT[variant]} rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all duration-500 ${
            showLabel ? 'min-w-[4rem]' : ''
          }`}
          style={{ width: `${Math.max(pct, showLabel ? 18 : 0)}%` }}
        >
          {showLabel ? label : null}
        </div>
      )}
    </div>
  );
}
