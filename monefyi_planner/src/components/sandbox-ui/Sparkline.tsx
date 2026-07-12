type Props = {
  data: number[];
  color?: 'primary' | 'success' | 'danger' | 'white';
  height?: number;
  width?: number;
};

const STROKE: Record<string, string> = {
  primary: '#2563eb',
  success: '#10b981',
  danger: '#ef4444',
  white: '#ffffff',
};

export default function Sparkline({ data, color = 'primary', height = 32, width = 120 }: Props) {
  if (data.length < 2) return null;
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
