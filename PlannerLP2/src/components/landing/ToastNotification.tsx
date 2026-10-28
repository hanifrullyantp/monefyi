"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import type { ToastNotification as ToastItem } from "@/lib/types/content";

const SESSION_KEY = "monefyi_lp_purchase_toast_shown";
const INITIAL_DELAY_MS = 8000;

function livePurchaseNotifications(items: ToastItem[]): ToastItem[] {
  return items.filter((n) => n.source === "live_purchase");
}

export function ToastNotification() {
  const { content } = useContentStore();
  const { toast: toastConfig } = content;
  const liveItems = livePurchaseNotifications(toastConfig.notifications);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showOnce = useCallback(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;
    if (!toastConfig.enabled || liveItems.length === 0) return;

    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(true);
    dismissTimerRef.current = setTimeout(() => setVisible(false), toastConfig.autoDismiss || 6000);
  }, [liveItems.length, toastConfig.autoDismiss, toastConfig.enabled]);

  useEffect(() => {
    if (!toastConfig.enabled || liveItems.length === 0) return;
    const t = setTimeout(showOnce, INITIAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [liveItems.length, showOnce, toastConfig.enabled]);

  const close = () => {
    setVisible(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  };

  if (!toastConfig.enabled || liveItems.length === 0) return null;

  const notification = liveItems[currentIndex];
  if (!notification) return null;

  const initials = notification.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="fixed bottom-4 right-4 z-[90] w-[calc(100%-32px)] max-w-[320px] sm:w-[320px] pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 relative"
          >
            <button
              type="button"
              onClick={close}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-[14px]">{notification.name}</p>
                <p className="text-slate-600 text-[13px] leading-snug">
                  {notification.action}{" "}
                  <span className="font-medium text-emerald-600">{notification.product}</span>
                </p>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  {notification.timeAgo}
                  {notification.location ? ` · ${notification.location}` : ""}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
