"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "default",
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 z-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-slate-600 mt-2 leading-relaxed">{description}</p>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              "px-5 py-2.5 rounded-xl font-medium text-sm transition-colors",
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
