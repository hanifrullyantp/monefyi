import React from 'react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/cn';
import type { ColorVariant, SizeVariant, IconVariant } from '../../types';

interface PremiumIconProps {
  name: keyof typeof LucideIcons;
  variant?: IconVariant;
  color?: ColorVariant;
  size?: SizeVariant;
  className?: string;
}

const sizeMap: Record<SizeVariant, { icon: number; container: string }> = {
  xs: { icon: 12, container: 'w-5 h-5' },
  sm: { icon: 14, container: 'w-7 h-7' },
  md: { icon: 18, container: 'w-9 h-9' },
  lg: { icon: 22, container: 'w-11 h-11' },
  xl: { icon: 26, container: 'w-14 h-14' },
  '2xl': { icon: 32, container: 'w-16 h-16' },
};

const colorMap: Record<ColorVariant, {
  gradient: string;
  glow: string;
  text: string;
  bg: string;
  border: string;
}> = {
  green: {
    gradient: 'from-green-500 to-green-700',
    glow: 'shadow-green-500/40',
    text: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
  },
  gold: {
    gradient: 'from-yellow-400 to-amber-600',
    glow: 'shadow-amber-500/40',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  amber: {
    gradient: 'from-amber-400 to-orange-600',
    glow: 'shadow-amber-500/40',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  red: {
    gradient: 'from-red-400 to-red-700',
    glow: 'shadow-red-500/40',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  blue: {
    gradient: 'from-blue-400 to-blue-700',
    glow: 'shadow-blue-500/40',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  purple: {
    gradient: 'from-purple-400 to-purple-700',
    glow: 'shadow-purple-500/40',
    text: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
  white: {
    gradient: 'from-slate-100 to-slate-300',
    glow: 'shadow-white/20',
    text: 'text-white',
    bg: 'bg-white/10',
    border: 'border-white/20',
  },
  slate: {
    gradient: 'from-slate-400 to-slate-600',
    glow: 'shadow-slate-500/40',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
  },
};

export function PremiumIcon({
  name,
  variant = 'default',
  color = 'green',
  size = 'md',
  className,
}: PremiumIconProps): React.ReactElement | null {
  const IconComponent = LucideIcons[name] as React.FC<{ size?: number; className?: string; strokeWidth?: number }> | undefined;
  if (!IconComponent) return null;

  const { icon: iconSize, container } = sizeMap[size];
  const colors = colorMap[color];

  if (variant === 'default') {
    return <IconComponent size={iconSize} className={cn(colors.text, className)} />;
  }

  if (variant === 'gradient') {
    return (
      <div className={cn('rounded-xl flex items-center justify-center bg-gradient-to-br', colors.gradient, container, className)}>
        <IconComponent size={iconSize} className="text-white" strokeWidth={2} />
      </div>
    );
  }

  if (variant === 'glow') {
    return (
      <div className={cn('rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg', colors.gradient, colors.glow, container, className)}>
        <IconComponent size={iconSize} className="text-white" strokeWidth={2} />
      </div>
    );
  }

  if (variant === 'outlined') {
    return (
      <div className={cn('rounded-xl flex items-center justify-center border', colors.bg, colors.border, container, className)}>
        <IconComponent size={iconSize} className={colors.text} strokeWidth={2} />
      </div>
    );
  }

  if (variant === 'filled') {
    return (
      <div className={cn('rounded-xl flex items-center justify-center', colors.bg, container, className)}>
        <IconComponent size={iconSize} className={colors.text} strokeWidth={2} />
      </div>
    );
  }

  if (variant === 'glass') {
    return (
      <div className={cn('rounded-xl flex items-center justify-center backdrop-blur-sm border', 'bg-white/5 border-white/10', container, className)}>
        <IconComponent size={iconSize} className={colors.text} strokeWidth={2} />
      </div>
    );
  }

  return <IconComponent size={iconSize} className={cn(colors.text, className)} />;
}
