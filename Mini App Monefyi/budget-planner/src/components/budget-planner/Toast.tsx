"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import type { ToastItem } from "@/hooks/useToast";
import { cn } from "@/lib/cn";

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    className: "border-green-700 bg-green-950/90 text-green-300",
    iconClass: "text-green-400",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-700 bg-red-950/90 text-red-300",
    iconClass: "text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-700 bg-amber-950/90 text-amber-300",
    iconClass: "text-amber-400",
  },
  info: {
    icon: Info,
    className: "border-blue-700 bg-blue-950/90 text-blue-300",
    iconClass: "text-blue-400",
  },
};

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 md:bottom-6 md:right-6"
      aria-live="polite"
      aria-label="Notifikasi"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = variantConfig[toast.variant];
          const Icon = config.icon;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm min-w-64 max-w-sm",
                config.className
              )}
              role="alert"
            >
              <Icon size={18} className={cn("shrink-0", config.iconClass)} />
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Tutup notifikasi"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
