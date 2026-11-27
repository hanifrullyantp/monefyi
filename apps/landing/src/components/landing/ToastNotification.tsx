"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import type { ToastNotification as ToastItem } from "@/lib/types/content";
import {
  formatToastCustomerName,
  formatToastRelativeTime,
  type ToastCategory,
} from "@/lib/crm/toastFeedMapper";

const CATEGORY_STYLES: Record<
  ToastCategory,
  { avatar: string; productText: string; badge?: { label: string; className: string } }
> = {
  bundle: {
    avatar: "from-amber-500 to-orange-600 shadow-amber-500/20",
    productText: "text-amber-700",
    badge: { label: "2+ Akun", className: "bg-amber-100 text-amber-800" },
  },
  pro: {
    avatar: "from-indigo-500 to-purple-600 shadow-indigo-500/20",
    productText: "text-indigo-700",
    badge: { label: "PRO", className: "bg-indigo-100 text-indigo-700" },
  },
  upgrade: {
    avatar: "from-purple-500 to-emerald-600 shadow-purple-500/20",
    productText: "text-purple-700",
    badge: { label: "Upgrade", className: "bg-purple-100 text-purple-700" },
  },
  standard: {
    avatar: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
    productText: "text-emerald-700",
  },
  free: {
    avatar: "from-teal-500 to-cyan-600 shadow-teal-500/20",
    productText: "text-teal-700",
    badge: { label: "Free", className: "bg-teal-100 text-teal-800" },
  },
};

export function ToastNotification() {
  const { content } = useContentStore();
  const toastConfig = content.toast;
  const isEnabled = toastConfig?.enabled !== false;
  const includeFree = toastConfig?.includeFree !== false;
  const maskCustomerName = toastConfig?.maskCustomerName !== false;
  const maxItems = toastConfig?.maxItems || 30;

  const [crmItems, setCrmItems] = useState<ToastItem[]>([]);
  const [extraItems, setExtraItems] = useState<ToastItem[]>([]);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextScheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveItems = useMemo(() => {
    const seen = new Set<string>();
    const combined: ToastItem[] = [];
    for (const item of [...extraItems, ...crmItems]) {
      const key = item.id || `${item.name}|${item.product}|${item.occurredAt || item.timeAgo}`;
      if (seen.has(key)) continue;
      seen.add(key);
      combined.push(item);
    }
    return combined;
  }, [extraItems, crmItems]);

  // Ambil data transaksi & aktivasi nyata dari CRM (/api/landing/toast-feed)
  useEffect(() => {
    if (!isEnabled) {
      setCrmItems([]);
      return;
    }

    let cancelled = false;
    const fetchFeed = async () => {
      try {
        const params = new URLSearchParams({
          includeFree: includeFree ? "true" : "false",
          maskName: maskCustomerName ? "true" : "false",
          limit: String(maxItems),
        });
        const res = await fetch(`/api/landing/toast-feed?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json?.ok && Array.isArray(json.items)) {
          setCrmItems(json.items);
        }
      } catch {
        // Jika gagal memuat CRM, tetap kosong (jangan tampilkan data fiktif)
      }
    };

    void fetchFeed();
    const refreshInterval = setInterval(fetchFeed, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
    };
  }, [isEnabled, includeFree, maskCustomerName, maxItems]);

  // Tangkap event registrasi / pembelian live dari FreeTrialPopup atau Checkout sesi ini
  useEffect(() => {
    const onUserEvent = (e: Event) => {
      const custom = e as CustomEvent<ToastItem>;
      if (!custom.detail) return;
      const detail = custom.detail;
      const sanitized: ToastItem = {
        ...detail,
        name: formatToastCustomerName(detail.name || "", maskCustomerName) || "Pengguna",
        location:
          detail.location && detail.location.toLowerCase() !== "baru saja"
            ? detail.location
            : "",
        occurredAt: detail.occurredAt || new Date().toISOString(),
        timeAgo: detail.timeAgo || "Baru saja",
      };
      setExtraItems((prev) => [sanitized, ...prev].slice(0, 10));
      setCurrentIndex(0);
      setVisible(true);
      if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
      displayTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 7000);
    };
    window.addEventListener("monefyi_user_toast", onUserEvent);
    return () => window.removeEventListener("monefyi_user_toast", onUserEvent);
  }, [maskCustomerName]);

  const clearAllTimers = useCallback(() => {
    if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
    if (nextScheduleTimerRef.current) clearTimeout(nextScheduleTimerRef.current);
  }, []);

  const getRandomInterval = useCallback(() => {
    const min = toastConfig?.intervalMin || 9000;
    const max = toastConfig?.intervalMax || 22000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }, [toastConfig?.intervalMin, toastConfig?.intervalMax]);

  const scheduleNext = useCallback(
    (delayMs: number) => {
      clearAllTimers();
      nextScheduleTimerRef.current = setTimeout(() => {
        if (!liveItems.length) return;

        setCurrentIndex((prev) => (prev + 1) % liveItems.length);
        setVisible(true);

        const autoDismiss = toastConfig?.autoDismiss || 6000;
        displayTimerRef.current = setTimeout(() => {
          setVisible(false);
          scheduleNext(getRandomInterval());
        }, autoDismiss);
      }, delayMs);
    },
    [clearAllTimers, getRandomInterval, liveItems.length, toastConfig?.autoDismiss],
  );

  useEffect(() => {
    if (!isEnabled || liveItems.length === 0) {
      setVisible(false);
      clearAllTimers();
      return;
    }

    const initialDelay = Math.floor(Math.random() * 3000) + 3500;
    scheduleNext(initialDelay);

    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers, isEnabled, liveItems.length, scheduleNext]);

  const close = () => {
    setVisible(false);
    clearAllTimers();
    scheduleNext(25000);
  };

  if (!isEnabled || liveItems.length === 0) return null;

  const notification = liveItems[currentIndex % liveItems.length] || liveItems[0];
  if (!notification) return null;

  const initials = notification.name
    .replace(/\./g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const category: ToastCategory = notification.category || "standard";
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.standard;
  const displayTime = notification.occurredAt
    ? formatToastRelativeTime(notification.occurredAt)
    : notification.timeAgo;
  const displayLocation =
    notification.location && notification.location.toLowerCase() !== "baru saja"
      ? notification.location
      : "";

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[90] w-[calc(100%-32px)] max-w-[340px] pointer-events-none">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={notification.id || currentIndex}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 sm:p-4 relative hover:shadow-emerald-900/10 transition-shadow"
          >
            <button
              type="button"
              onClick={close}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 pr-5">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.avatar} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-slate-900 text-[13px] leading-tight">
                    {notification.name}
                  </p>
                  {style.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${style.badge.className}`}
                    >
                      {category === "bundle" && notification.quantity && notification.quantity >= 2
                        ? `${notification.quantity}x Akun`
                        : style.badge.label}
                    </span>
                  )}
                  {displayLocation && (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {displayLocation}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[12px] leading-snug mt-1">
                  {notification.action}{" "}
                  <span className={`font-semibold ${style.productText}`}>
                    {notification.product}
                  </span>
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{displayTime}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
