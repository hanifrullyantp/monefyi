// src/components/ui/ResultCard.tsx
"use client";

import { cn } from "@/lib/cn";
import { useCountUp } from "@/hooks/useCountUp";
import { type ReactNode } from "react";

type CardVariant = "highlight" | "warning" | "success" | "danger" | "default";

interface ResultCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: CardVariant;
  countUp?: boolean;
  suffix?: string;
  prefix?: string;
  className?: string;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-slate-800/60 border-slate-700/50",
  highlight: "bg-slate-800/80 border-emerald-500/30",
  warning: "bg-amber-950/30 border-amber-500/30",
  success: "bg-emerald-950/30 border-emerald-500/40",
  danger: "bg-red-950/30 border-red-500/30",
};

const variantTextClasses: Record<CardVariant, string> = {
  default: "text-white",
  highlight: "text-emerald-400",
  warning: "text-amber-400",
  success: "text-emerald-400",
  danger: "text-red-400",
};

function CountUpValue({ target, enabled }: { target: number; enabled: boolean }) {
  const current = useCountUp(target, 1500, enabled);
  return (
    <span className="tabular-nums">
      {current.toLocaleString("id-ID")}
    </span>
  );
}

export function ResultCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  countUp = false,
  prefix,
  suffix,
  className,
}: ResultCardProps) {
  const numericValue = typeof value === "number" ? value : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 flex flex-col gap-2",
        variantClasses[variant],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className={cn("text-xl font-bold tabular-nums", variantTextClasses[variant])}>
        {prefix && <span className="text-base">{prefix}</span>}
        {countUp && typeof value === "number" ? (
          <CountUpValue target={numericValue} enabled={true} />
        ) : (
          <span>{value}</span>
        )}
        {suffix && <span className="text-sm ml-1 font-normal text-slate-400">{suffix}</span>}
      </div>
      {subtitle && (
        <p className="text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
