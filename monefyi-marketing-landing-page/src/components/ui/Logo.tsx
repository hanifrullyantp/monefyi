import React from 'react';
import { cn } from '../../lib/cn';

interface LogoProps {
  className?: string;
  size?: number;
  iconOnly?: boolean;
}

const LOGO_SRC = '/icons/monefyi-logo.png?v=2026-08-13-m';

export function Logo({ className, size = 32, iconOnly = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3 group', className)}>
      <img
        src={LOGO_SRC}
        alt="Monefyi"
        width={size}
        height={size}
        className="flex-shrink-0 rounded-[22%] object-contain group-hover:scale-105 transition-transform duration-300"
        style={{ width: size, height: size }}
      />

      {!iconOnly && (
        <span className="text-xl font-black text-white tracking-tighter">
          Mone<span className="text-[#79C85F]">fyi</span>
        </span>
      )}
    </div>
  );
}
