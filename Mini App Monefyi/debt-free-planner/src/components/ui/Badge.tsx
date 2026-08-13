// src/components/ui/Badge.tsx
import { cn } from "@/lib/cn";
import type { UrgencyLevel } from "@/types";

type BadgeVariant = "urgency" | "success" | "warning" | "error" | "info" | "neutral";
type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  urgency?: UrgencyLevel;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const urgencyClasses: Record<UrgencyLevel, string> = {
  kritis: "bg-red-500/20 text-red-400 border border-red-500/30",
  tinggi: "bg-red-900/30 text-red-300 border border-red-700/30",
  sedang: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  rendah: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
};

const urgencyDotClasses: Record<UrgencyLevel, string> = {
  kritis: "bg-red-500",
  tinggi: "bg-red-400",
  sedang: "bg-amber-500",
  rendah: "bg-blue-500",
};

const variantClasses: Record<BadgeVariant, string> = {
  urgency: "",
  success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  error: "bg-red-500/20 text-red-400 border border-red-500/30",
  info: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  neutral: "bg-slate-700/50 text-slate-400 border border-slate-600/30",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({
  children,
  variant = "neutral",
  urgency,
  size = "sm",
  className,
  dot = false,
}: BadgeProps) {
  const classes =
    variant === "urgency" && urgency
      ? urgencyClasses[urgency]
      : variantClasses[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        sizeClasses[size],
        classes,
        className
      )}
    >
      {dot && urgency && (
        <span
          className={cn(
            "inline-block w-1.5 h-1.5 rounded-full",
            urgencyDotClasses[urgency]
          )}
        />
      )}
      {children}
    </span>
  );
}
