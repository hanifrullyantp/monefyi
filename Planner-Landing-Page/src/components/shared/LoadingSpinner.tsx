import { cn } from "@/lib/utils/cn";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-8 h-8 border-2",
  lg: "w-12 h-12 border-4",
};

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "rounded-full border-slate-200 border-t-emerald-500 animate-spin",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Memuat..."
    />
  );
}
