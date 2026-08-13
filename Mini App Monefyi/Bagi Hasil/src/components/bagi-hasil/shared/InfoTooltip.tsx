"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export default function InfoTooltip({ content, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-label="Informasi tambahan"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="text-slate-500 hover:text-blue-400 transition-colors"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 shadow-xl">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </span>
  );
}
