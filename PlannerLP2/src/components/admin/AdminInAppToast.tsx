"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AdminNotificationPayload,
  NotificationType,
} from "@/lib/services/notificationService";
import {
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  X,
  ExternalLink,
  DollarSign,
} from "lucide-react";

export function AdminInAppToast() {
  const router = useRouter();
  const [activeToasts, setActiveToasts] = useState<AdminNotificationPayload[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: any) => {
      const item: AdminNotificationPayload = e.detail;
      if (!item) return;

      setActiveToasts((prev) => [item, ...prev].slice(0, 3));

      // Auto dismiss after 7 seconds
      setTimeout(() => {
        setActiveToasts((prev) => prev.filter((t) => t.id !== item.id));
      }, 7000);
    };

    window.addEventListener("admin-in-app-toast", handleToastEvent);
    return () => {
      window.removeEventListener("admin-in-app-toast", handleToastEvent);
    };
  }, []);

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {activeToasts.map((toast) => {
        const isClosing = toast.type === "closing";
        const isAlert = toast.type === "api_alert" || toast.type === "urgent_action";
        const isLead = toast.type === "lead";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-2xl border backdrop-blur-md transition-all duration-300 animate-slide-in-right ${
              isClosing
                ? "bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-500/10"
                : isAlert
                ? "bg-slate-900/95 border-amber-500/50 text-white shadow-amber-500/10"
                : "bg-slate-900/95 border-indigo-500/50 text-white shadow-indigo-500/10"
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isClosing
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : isAlert
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                }`}
              >
                {isClosing && <DollarSign className="w-5 h-5 font-black" />}
                {isAlert && <AlertTriangle className="w-5 h-5" />}
                {isLead && <MessageSquare className="w-5 h-5" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-xs leading-snug line-clamp-1 text-white">
                    {toast.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id))
                    }
                    className="text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {toast.body}
                </p>

                {toast.url && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id));
                      router.push(toast.url!);
                    }}
                    className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    <span>Lihat di Panel</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

