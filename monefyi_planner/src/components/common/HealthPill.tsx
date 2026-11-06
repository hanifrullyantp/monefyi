import { DESIGN_TOKENS } from '../../lib/designTokens';

export type HealthStatus = 'on_track' | 'at_risk' | 'behind' | 'ahead' | string;

type Props = {
  status: HealthStatus;
  showDot?: boolean;
  className?: string;
};

export default function HealthPill({ status, showDot = false, className = '' }: Props) {
  let bg = '#F1F5F9';
  let color = '#475569';
  let dotColor = '#64748B';
  let label = status;

  if (status === 'on_track') {
    bg = DESIGN_TOKENS.health.onTrack.bg;
    color = DESIGN_TOKENS.health.onTrack.text;
    dotColor = DESIGN_TOKENS.health.onTrack.color;
    label = 'ON TRACK';
  } else if (status === 'at_risk') {
    bg = DESIGN_TOKENS.health.atRisk.bg;
    color = DESIGN_TOKENS.health.atRisk.text;
    dotColor = DESIGN_TOKENS.health.atRisk.color;
    label = 'AT RISK';
  } else if (status === 'behind') {
    bg = DESIGN_TOKENS.health.behind.bg;
    color = DESIGN_TOKENS.health.behind.text;
    dotColor = DESIGN_TOKENS.health.behind.color;
    label = 'BEHIND';
  } else if (status === 'ahead') {
    bg = '#EFF6FF';
    color = '#1D4ED8';
    dotColor = '#3B82F6';
    label = 'AHEAD';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${className}`}
      style={{ backgroundColor: bg, color }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
