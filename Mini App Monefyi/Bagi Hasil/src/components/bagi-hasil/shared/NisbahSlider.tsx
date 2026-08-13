"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface NisbahParty {
  nama: string;
  nisbah: number;
  color: "green" | "blue" | "amber" | "purple" | "teal";
}

interface NisbahSliderProps {
  pihak: NisbahParty[];
  onChange: (index: number, newNisbah: number) => void;
  disabled?: boolean;
  total?: number;
  className?: string;
}

const colorMap: Record<
  NisbahParty["color"],
  { bar: string; text: string; bg: string; thumb: string }
> = {
  green: {
    bar: "bg-green-500",
    text: "text-green-400",
    bg: "bg-green-500/20",
    thumb: "bg-green-500",
  },
  blue: {
    bar: "bg-blue-500",
    text: "text-blue-400",
    bg: "bg-blue-500/20",
    thumb: "bg-blue-500",
  },
  amber: {
    bar: "bg-amber-500",
    text: "text-amber-400",
    bg: "bg-amber-500/20",
    thumb: "bg-amber-500",
  },
  purple: {
    bar: "bg-purple-500",
    text: "text-purple-400",
    bg: "bg-purple-500/20",
    thumb: "bg-purple-500",
  },
  teal: {
    bar: "bg-teal-500",
    text: "text-teal-400",
    bg: "bg-teal-500/20",
    thumb: "bg-teal-500",
  },
};

export default function NisbahSlider({
  pihak,
  onChange,
  disabled = false,
  total,
  className,
}: NisbahSliderProps) {
  const totalNisbah = pihak.reduce((s, p) => s + p.nisbah, 0);
  const isValid = Math.abs(totalNisbah - 100) < 0.01;

  const handleSliderChange = useCallback(
    (index: number, rawValue: string) => {
      const val = parseFloat(rawValue);
      if (!isNaN(val)) onChange(index, val);
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (index: number, rawValue: string) => {
      const val = parseFloat(rawValue);
      if (!isNaN(val)) onChange(index, Math.min(100, Math.max(0, val)));
    },
    [onChange]
  );

  // Segmented bar visual
  const segments = pihak.map((p, i) => ({
    ...p,
    width: `${p.nisbah}%`,
    key: i,
  }));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Segmented bar */}
      <div className="flex h-6 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-900">
        {segments.map((seg, i) => (
          <motion.div
            key={seg.key}
            className={cn(colorMap[seg.color].bar, "h-full transition-all")}
            style={{ width: seg.width }}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        ))}
      </div>

      {/* Per-party sliders */}
      <div className="space-y-3">
        {pihak.map((p, i) => {
          const colors = colorMap[p.color];
          return (
            <div key={i} className={cn("rounded-xl border border-slate-700 p-3", colors.bg)}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm font-semibold", colors.text)}>
                  {p.nama}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={p.nisbah.toFixed(1)}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    disabled={disabled}
                    aria-label={`Nisbah ${p.nama}`}
                    className={cn(
                      "w-16 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-center text-sm font-bold text-slate-100 outline-none focus:ring-2 focus:ring-green-500/50",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  />
                  <span className={cn("text-sm font-bold", colors.text)}>%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={p.nisbah}
                onChange={(e) => handleSliderChange(i, e.target.value)}
                disabled={disabled}
                aria-label={`Geser nisbah ${p.nama}`}
                className="w-full accent-green-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          );
        })}
      </div>

      {/* Total indicator */}
      <div
        className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
          isValid
            ? "bg-green-950/50 border border-green-800 text-green-400"
            : "bg-red-950/50 border border-red-800 text-red-400"
        )}
        role="status"
        aria-live="polite"
      >
        <span className="font-medium">Total Nisbah</span>
        <span className="font-bold tabular-nums">
          {total !== undefined ? total.toFixed(2) : totalNisbah.toFixed(2)}%
          {isValid ? " ✓" : " ✗"}
        </span>
      </div>

      {!isValid && (
        <p className="text-xs text-red-400" role="alert">
          Total nisbah keuntungan harus tepat 100%. Saat ini:{" "}
          {totalNisbah.toFixed(2)}%
        </p>
      )}
    </div>
  );
}
