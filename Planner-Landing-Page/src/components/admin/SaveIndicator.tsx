"use client";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  className?: string;
}

export function SaveIndicator({ status, className }: SaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-medium transition-all duration-300",
        status === "saving" && "text-slate-500",
        status === "saved" && "text-emerald-600",
        status === "error" && "text-red-600",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Menyimpan...
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="w-4 h-4" />
          Tersimpan
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="w-4 h-4" />
          Gagal menyimpan
        </>
      )}
    </div>
  );
}
