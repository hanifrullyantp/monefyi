"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import type { ToastMessage } from "@/hooks/useToast";
import { cn } from "@/lib/cn";

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: "border-green-500 bg-green-950/90",
  error: "border-red-500 bg-red-950/90",
  info: "border-blue-500 bg-blue-900/90",
  warning: "border-amber-500 bg-amber-950/90",
};

const iconColors = {
  success: "text-green-400",
  error: "text-red-400",
  info: "text-blue-400",
  warning: "text-amber-400",
};

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 md:bottom-6 md:right-6">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm max-w-sm",
                colors[toast.type]
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", iconColors[toast.type])} />
              <p className="flex-1 text-sm font-medium text-slate-100">
                {toast.message}
              </p>
              <button
                onClick={() => onRemove(toast.id)}
                aria-label="Tutup notifikasi"
                className="ml-1 rounded-full p-0.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
