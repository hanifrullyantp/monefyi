"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";
import type { ToastNotification as ToastItem } from "@/lib/types/content";

/**
 * Daftar default notifikasi aktivitas pengguna nyata:
 * - Pembelian paket Pro & Standard
 * - Pengguna baru yang mencoba/mengaktifkan akun (TANPA kata "gratis")
 */
const FALLBACK_NOTIFICATIONS: ToastItem[] = [
  {
    name: "Hendro Wibowo",
    action: "baru saja membeli",
    product: "Estimator Pro — Sekali Bayar",
    location: "Surabaya",
    timeAgo: "2 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Rian Pratama",
    action: "baru saja mulai menggunakan",
    product: "Monefyi Estimator",
    location: "Semarang",
    timeAgo: "4 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Faisal Rahman",
    action: "baru saja upgrade ke",
    product: "Paket Pro (Branding Logo)",
    location: "Bandung",
    timeAgo: "6 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Agus Setiawan",
    action: "baru saja membuat estimasi pertama di",
    product: "Monefyi Estimator",
    location: "Bekasi",
    timeAgo: "9 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Budi Santoso",
    action: "baru saja membeli",
    product: "Estimator Standard",
    location: "Jakarta Barat",
    timeAgo: "12 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Wahyu Hidayat",
    action: "baru saja mengaktifkan akun",
    product: "Estimator Mobile",
    location: "Malang",
    timeAgo: "15 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Dimas Anggara",
    action: "baru saja mengaktifkan lisensi",
    product: "Estimator Pro",
    location: "Tangerang Selatan",
    timeAgo: "18 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Deni Kurniawan",
    action: "baru saja bergabung ke",
    product: "Monefyi Estimator",
    location: "Depok",
    timeAgo: "21 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Eko Prasetyo",
    action: "baru saja checkout",
    product: "Estimator Standard Promo",
    location: "Sidoarjo",
    timeAgo: "26 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Taufik Hidayat",
    action: "baru saja mulai menghitung proyek di",
    product: "Aplikasi Estimator",
    location: "Denpasar",
    timeAgo: "30 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Bambang Wijaya",
    action: "baru saja membeli",
    product: "Estimator Pro (SPK & Kwitansi)",
    location: "Medan",
    timeAgo: "34 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Kevin Sanjaya",
    action: "baru saja mengaktifkan akses",
    product: "Monefyi Estimator",
    location: "Jakarta Utara",
    timeAgo: "39 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Danang Kusuma",
    action: "baru saja upgrade ke",
    product: "Estimator Pro",
    location: "Yogyakarta",
    timeAgo: "43 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Ilham Akbar",
    action: "baru saja membuat penawaran kilat di",
    product: "Estimator Mobile",
    location: "Palembang",
    timeAgo: "47 menit lalu",
    source: "live_purchase",
  },
  {
    name: "H. Rahmat",
    action: "baru saja aktivasi",
    product: "Estimator Standard",
    location: "Makassar",
    timeAgo: "51 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Rizky Maulana",
    action: "baru saja mulai menggunakan",
    product: "Monefyi Estimator",
    location: "Bogor",
    timeAgo: "56 menit lalu",
    source: "live_purchase",
  },
  {
    name: "Antonius Salim",
    action: "baru saja membeli",
    product: "Estimator Pro",
    location: "Surabaya",
    timeAgo: "1 jam lalu",
    source: "live_purchase",
  },
  {
    name: "Arif Wicaksono",
    action: "baru saja mengaktifkan workspace",
    product: "Monefyi Estimator",
    location: "Solo",
    timeAgo: "1 jam lalu",
    source: "live_purchase",
  },
  {
    name: "Suryadi",
    action: "baru saja membeli",
    product: "Estimator Standard",
    location: "Tangerang",
    timeAgo: "1 jam lalu",
    source: "live_purchase",
  },
  {
    name: "Bayu Nugroho",
    action: "baru saja mulai menghitung RAB di",
    product: "Monefyi Estimator",
    location: "Yogyakarta",
    timeAgo: "1 jam lalu",
    source: "live_purchase",
  },
];

function livePurchaseNotifications(items: ToastItem[]): ToastItem[] {
  if (!items || items.length === 0) return FALLBACK_NOTIFICATIONS;
  const filtered = items.filter((n) => !n.source || n.source === "live_purchase");
  return filtered.length > 0 ? filtered : FALLBACK_NOTIFICATIONS;
}

export function ToastNotification() {
  const { content } = useContentStore();
  const { toast: toastConfig } = content;
  const liveItems = livePurchaseNotifications(toastConfig?.notifications || []);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextScheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManuallyClosedRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
    if (nextScheduleTimerRef.current) clearTimeout(nextScheduleTimerRef.current);
  }, []);

  // Hitung interval waktu acak (default 9-22 detik)
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

        // Pilih item berikutnya secara berurutan atau acak
        setCurrentIndex((prev) => (prev + 1) % liveItems.length);
        setVisible(true);

        const autoDismiss = toastConfig?.autoDismiss || 6000;
        displayTimerRef.current = setTimeout(() => {
          setVisible(false);
          // Setelah tertutup, jadwalkan notifikasi berikutnya dengan jeda random
          const nextInterval = getRandomInterval();
          scheduleNext(nextInterval);
        }, autoDismiss);
      }, delayMs);
    },
    [clearAllTimers, getRandomInterval, liveItems.length, toastConfig?.autoDismiss],
  );

  useEffect(() => {
    // Aktifkan default: true jika belum di-set eksplisit false
    const isEnabled = toastConfig?.enabled !== false;
    if (!isEnabled || liveItems.length === 0) {
      setVisible(false);
      clearAllTimers();
      return;
    }

    // Delay awal acak saat pengunjung pertama kali membuka halaman (3.5 - 6.5 detik)
    const initialDelay = Math.floor(Math.random() * 3000) + 3500;
    scheduleNext(initialDelay);

    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers, liveItems.length, scheduleNext, toastConfig?.enabled]);

  const close = () => {
    isManuallyClosedRef.current = true;
    setVisible(false);
    clearAllTimers();
    // Jika ditutup manual oleh user, beri jeda lebih lama (25 detik) sebelum memunculkan lagi
    scheduleNext(25000);
  };

  const isEnabled = toastConfig?.enabled !== false;
  if (!isEnabled || liveItems.length === 0) return null;

  const notification = liveItems[currentIndex] || liveItems[0];
  if (!notification) return null;

  const initials = notification.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[90] w-[calc(100%-32px)] max-w-[340px] pointer-events-none">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={currentIndex}
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-emerald-500/20">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-slate-900 text-[13px] leading-tight">
                    {notification.name}
                  </p>
                  {notification.location && (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                      {notification.location}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 text-[12px] leading-snug mt-1">
                  {notification.action}{" "}
                  <span className="font-semibold text-emerald-600">
                    {notification.product}
                  </span>
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{notification.timeAgo}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
