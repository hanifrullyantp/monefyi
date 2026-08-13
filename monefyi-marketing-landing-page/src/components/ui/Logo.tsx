import React from 'react';
import { cn } from '../../lib/cn';

interface LogoProps {
  className?: string;
  size?: number;
  iconOnly?: boolean;
}

export function Logo({ className, size = 32, iconOnly = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3 group', className)}>
      <div 
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        >
          {/* Rounded Green Square - Match Image Color #75c34f */}
          <rect width="100" height="100" rx="22" fill="#75C34F" />
          
          {/* Stylized M - Black Shape */}
          <path
            d="M22 22H42V56L58 22H78V78H58V44L42 78H22V22Z"
            fill="black"
          />
          
          {/* The Diagonal Slash Cut - Using the background color to 'cut' the M */}
          <path
            d="M15 90L85 10"
            stroke="#75C34F"
            strokeWidth="8"
          />
        </svg>
      </div>
      
      {!iconOnly && (
        <span className="text-xl font-black text-white tracking-tighter">
          Mone<span className="text-green-500">fyi</span>
        </span>
      )}
    </div>
  );
}
