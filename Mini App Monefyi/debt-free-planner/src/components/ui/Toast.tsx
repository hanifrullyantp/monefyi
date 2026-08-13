// src/components/ui/Toast.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Toast as ToastItem } from "@/hooks/useToast";

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorClasses = {
  success: "border-emerald-500/40 bg-emerald-950/90 text-emerald-300",
  error: "border-red-500/40 bg-red-950/90 text-red-300",
  info: "border-blue-500/40 bg-blue-950/90 text-blue-300",
  warning: "border-amber-500/40 bg-amber-950/90 text-amber-300",
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl",
                colorClasses[toast.type]
              )}
            >
              <Icon size={18} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm flex-1">{toast.message}</span>
              <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
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
