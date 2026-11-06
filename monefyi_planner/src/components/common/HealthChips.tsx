import { DESIGN_TOKENS } from '../../lib/designTokens';

export type HealthFilterType = 'all' | 'on_track' | 'at_risk' | 'behind';

type Props = {
  counts: {
    onTrack: number;
    atRisk: number;
    behind: number;
  };
  activeFilter: HealthFilterType;
  onSelectFilter: (filter: HealthFilterType) => void;
};

export default function HealthChips({ counts, activeFilter, onSelectFilter }: Props) {
  const chips: Array<{
    id: 'on_track' | 'at_risk' | 'behind';
    label: string;
    count: number;
    dot: string;
    bg: string;
    border: string;
    text: string;
  }> = [
    {
      id: 'on_track',
      label: DESIGN_TOKENS.health.onTrack.label,
      count: counts.onTrack,
      dot: DESIGN_TOKENS.health.onTrack.color,
      bg: DESIGN_TOKENS.health.onTrack.bg,
      border: DESIGN_TOKENS.health.onTrack.border,
      text: DESIGN_TOKENS.health.onTrack.text,
    },
    {
      id: 'at_risk',
      label: DESIGN_TOKENS.health.atRisk.label,
      count: counts.atRisk,
      dot: DESIGN_TOKENS.health.atRisk.color,
      bg: DESIGN_TOKENS.health.atRisk.bg,
      border: DESIGN_TOKENS.health.atRisk.border,
      text: DESIGN_TOKENS.health.atRisk.text,
    },
    {
      id: 'behind',
      label: DESIGN_TOKENS.health.behind.label,
      count: counts.behind,
      dot: DESIGN_TOKENS.health.behind.color,
      bg: DESIGN_TOKENS.health.behind.bg,
      border: DESIGN_TOKENS.health.behind.border,
      text: DESIGN_TOKENS.health.behind.text,
    },
  ];

  return (
    <div className="flex gap-2 w-full">
      {chips.map(chip => {
        const isSelected = activeFilter === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelectFilter(isSelected ? 'all' : chip.id)}
            aria-pressed={isSelected}
            aria-label={`Filter status kesehatan ${chip.label}, ${chip.count} proyek`}
            className={`flex-1 h-11 rounded-xl border-2 flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-bold transition-all active:scale-95 ${
              isSelected ? 'ring-2 ring-[#0F172A] shadow-xs' : ''
            }`}
            style={{
              backgroundColor: chip.bg,
              borderColor: isSelected ? chip.dot : chip.border,
              color: chip.text,
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: chip.dot }}
              aria-hidden="true"
            />
            <span className="truncate">{chip.label}</span>
            <span className="font-extrabold tabular-nums">{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}
