type Props = {
  data: number[];
  color?: 'primary' | 'success' | 'danger' | 'white';
  height?: number;
  width?: number;
  variant?: 'line' | 'bars';
};

const STROKE: Record<string, string> = {
  primary: '#2563eb',
  success: '#10b981',
  danger: '#ef4444',
  white: '#ffffff',
};

const FILL: Record<string, string> = {
  primary: '#2563eb',
  success: '#10b981',
  danger: '#ef4444',
  white: 'rgba(255,255,255,0.5)',
};

export default function Sparkline({
  data,
  color = 'primary',
  height = 32,
  width = 120,
  variant = 'line',
}: Props) {
  if (data.length < 2) return null;

  if (variant === 'bars') {
    const max = Math.max(...data, 1);
    const fill = FILL[color] || FILL.primary;
    return (
      <div className="flex items-end gap-0.5 h-7" style={{ width }} aria-hidden>
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm min-h-1"
            style={{
              height: `${Math.max(Math.round((v / max) * 28), 4)}px`,
              background: fill,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline
        fill="none"
        stroke={STROKE[color] || STROKE.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
