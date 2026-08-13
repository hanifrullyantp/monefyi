"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import type { Toast, ToastType } from "@/hooks/useToast";
import { cn } from "@/lib/cn";

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const toastConfig: Record<
  ToastType,
  { icon: React.ReactNode; className: string }
> = {
  success: {
    icon: <CheckCircle className="w-5 h-5 text-green-400" />,
    className: "border-green-700 bg-green-950/90",
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-red-400" />,
    className: "border-red-700 bg-red-950/90",
  },
  info: {
    icon: <Info className="w-5 h-5 text-blue-400" />,
    className: "border-blue-700 bg-blue-950/90",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    className: "border-amber-700 bg-amber-950/90",
  },
};

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-2xl max-w-sm",
                config.className
              )}
            >
              <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
              <p className="text-sm text-slate-200 flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
