import type { ReactNode } from 'react';
import { DESIGN_TOKENS } from '../../lib/designTokens';

export type GradientVariant = 'green' | 'blue' | 'purple' | 'orange' | 'teal';

type Props = {
  label: string;
  value: string | number;
  subInfo?: string;
  variant?: GradientVariant;
  customGradient?: string;
  customShadow?: string;
  active?: boolean;
  onClick?: () => void;
  showArrow?: boolean;
  rightBadge?: ReactNode;
  ariaLabel?: string;
};

const VARIANT_CONFIG: Record<
  GradientVariant,
  { gradient: string; shadow: string; labelColor: string; subColor: string }
> = {
  green: {
    gradient: DESIGN_TOKENS.gradients.greenHero,
    shadow: DESIGN_TOKENS.shadows.green,
    labelColor: '#D1FAE5',
    subColor: '#D1FAE5',
  },
  blue: {
    gradient: DESIGN_TOKENS.gradients.blueHero,
    shadow: DESIGN_TOKENS.shadows.blue,
    labelColor: '#DBEAFE',
    subColor: '#DBEAFE',
  },
  purple: {
    gradient: DESIGN_TOKENS.gradients.purpleHero,
    shadow: DESIGN_TOKENS.shadows.purple,
    labelColor: '#EDE9FE',
    subColor: '#EDE9FE',
  },
  orange: {
    gradient: DESIGN_TOKENS.gradients.orangeHero,
    shadow: DESIGN_TOKENS.shadows.orange,
    labelColor: '#FFEDD5',
    subColor: '#FFEDD5',
  },
  teal: {
    gradient: DESIGN_TOKENS.gradients.tealHero,
    shadow: DESIGN_TOKENS.shadows.teal,
    labelColor: '#CCFBF1',
    subColor: '#CCFBF1',
  },
};

export default function GradientStatCard({
  label,
  value,
  subInfo,
  variant = 'green',
  customGradient,
  customShadow,
  active = false,
  onClick,
  showArrow = true,
  rightBadge,
  ariaLabel,
}: Props) {
  const config = VARIANT_CONFIG[variant];
  const gradient = customGradient || config.gradient;
  const shadow = customShadow || config.shadow;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || `${label}: ${value}${subInfo ? `, ${subInfo}` : ''}`}
      aria-pressed={active}
      className={`relative overflow-hidden text-left border-0 rounded-[18px] p-3.5 sm:p-4 text-white min-h-[96px] w-full transition-transform active:scale-[0.98] ${
        active ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F172A]' : ''
      }`}
      style={{
        background: gradient,
        boxShadow: shadow,
      }}
    >
      {/* Background decorative circle */}
      <span
        aria-hidden="true"
        className="absolute -right-6 -top-7 w-24 h-24 rounded-full bg-white/10 pointer-events-none"
      />

      {/* Top row: Label + arrow / badge */}
      <div className="relative flex items-center justify-between gap-1">
        <span
          className="text-[11px] font-bold tracking-[0.06em] uppercase truncate"
          style={{ color: config.labelColor }}
        >
          {label}
        </span>
        {rightBadge ? (
          <div className="shrink-0">{rightBadge}</div>
        ) : showArrow ? (
          <span className="text-base leading-none opacity-80" aria-hidden="true">
            ›
          </span>
        ) : null}
      </div>

      {/* Main stat value */}
      <div className="relative text-2xl sm:text-[28px] font-extrabold leading-tight mt-1.5 tabular-nums truncate">
        {value}
      </div>

      {/* Sub info */}
      {subInfo && (
        <div
          className="relative text-xs mt-0.5 truncate"
          style={{ color: config.subColor }}
        >
          {subInfo}
        </div>
      )}
    </button>
  );
}
