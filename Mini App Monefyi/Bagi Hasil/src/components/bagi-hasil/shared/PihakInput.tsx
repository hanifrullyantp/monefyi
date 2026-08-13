"use client";

import { User, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface PihakInputProps {
  index: number;
  nama: string;
  peran: string;
  jumlahModal?: number;
  onNamaChange: (nama: string) => void;
  onModalChange?: (modal: number) => void;
  onRemove?: () => void;
  canRemove?: boolean;
  showModal?: boolean;
  persentaseModal?: number;
  badgeText?: string;
  badgeColor?: "green" | "blue" | "amber" | "red";
  noteText?: string;
  className?: string;
}

const badgeColors = {
  green: "bg-green-900/40 text-green-400 border-green-800",
  blue: "bg-blue-900/40 text-blue-400 border-blue-800",
  amber: "bg-amber-900/40 text-amber-400 border-amber-800",
  red: "bg-red-900/40 text-red-400 border-red-800",
};

function formatModalDisplay(val: number): string {
  if (val === 0) return "";
  return new Intl.NumberFormat("id-ID").format(val);
}

export default function PihakInput({
  index,
  nama,
  peran,
  jumlahModal,
  onNamaChange,
  onModalChange,
  onRemove,
  canRemove = false,
  showModal = false,
  persentaseModal,
  badgeText,
  badgeColor = "blue",
  noteText,
  className,
}: PihakInputProps) {
  const namaId = `pihak-${index}-nama`;
  const modalId = `pihak-${index}-modal`;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-700 bg-slate-800/50 p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700">
            <User className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Pihak {index + 1}</p>
            <p className="text-sm font-semibold text-slate-300">{peran}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badgeText && (
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                badgeColors[badgeColor]
              )}
            >
              {badgeText}
            </span>
          )}
          {persentaseModal !== undefined && (
            <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-bold text-slate-300">
              {persentaseModal.toFixed(1)}% modal
            </span>
          )}
          {canRemove && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Hapus pihak ${index + 1}`}
              className="rounded-full p-1.5 text-slate-500 hover:bg-red-950/40 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div>
        <label htmlFor={namaId} className="mb-1.5 block text-xs font-medium text-slate-400">
          Nama / Label
        </label>
        <input
          id={namaId}
          type="text"
          value={nama}
          onChange={(e) => onNamaChange(e.target.value)}
          placeholder={`Nama ${peran}`}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
        />
      </div>

      {showModal && onModalChange !== undefined && (
        <div>
          <label
            htmlFor={modalId}
            className="mb-1.5 block text-xs font-medium text-slate-400"
          >
            Jumlah Modal
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 select-none">
              Rp
            </span>
            <input
              id={modalId}
              type="text"
              inputMode="numeric"
              value={
                jumlahModal !== undefined && jumlahModal > 0
                  ? formatModalDisplay(jumlahModal)
                  : ""
              }
              onChange={(e) => {
                const raw = e.target.value.replace(/\./g, "").replace(/,/g, "");
                const num = parseInt(raw, 10);
                onModalChange(isNaN(num) ? 0 : num);
              }}
              placeholder="0"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 py-2.5 text-sm font-tabular text-slate-100 outline-none transition-all focus:border-green-500 focus:ring-2 focus:ring-green-500/30 placeholder:text-slate-600"
            />
          </div>
        </div>
      )}

      {noteText && (
        <p className="text-xs text-slate-500 italic">{noteText}</p>
      )}
    </div>
  );
}
