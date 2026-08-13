// src/components/ui/ProgressBar.tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface Milestone {
  percent: number;
  label: string;
}

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercent?: boolean;
  gradient?: boolean;
  color?: "green" | "red" | "amber" | "blue";
  height?: "xs" | "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  milestones?: Milestone[];
  className?: string;
}

const heightClasses = {
  xs: "h-1",
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
  xl: "h-6",
};

const colorClasses = {
  green: "bg-emerald-500",
  red: "bg-red-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
};

export function ProgressBar({
  value,
  label,
  showPercent = false,
  gradient = false,
  color = "green",
  height = "md",
  animated = true,
  milestones,
  className,
}: ProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animated) {
      setDisplayValue(Math.min(100, Math.max(0, value)));
      return;
    }
    const timer = setTimeout(() => {
      setDisplayValue(Math.min(100, Math.max(0, value)));
    }, 100);
    return () => clearTimeout(timer);
  }, [value, animated]);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="text-slate-400">{label}</span>}
          {showPercent && (
            <span className="text-slate-300 font-mono tabular-nums">
              {value.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div className={cn("relative w-full rounded-full overflow-hidden bg-slate-700/50", heightClasses[height])}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1200 ease-out",
            gradient
              ? "progress-gradient"
              : colorClasses[color]
          )}
          style={{ width: `${displayValue}%`, transitionDuration: "1.2s" }}
        />
        {milestones?.map((m) => (
          <div
            key={m.percent}
            className="absolute top-0 bottom-0 w-px bg-white/30"
            style={{ left: `${m.percent}%` }}
            title={m.label}
          />
        ))}
      </div>
    </div>
  );
}
