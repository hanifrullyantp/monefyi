"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useContentStore } from "@/lib/store/contentStore";

export function ToastNotification() {
  const { content } = useContentStore();
  const { toast: toastConfig } = content;
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showNext = useCallback(() => {
    if (!toastConfig.enabled || toastConfig.notifications.length === 0) return;
    const next = (currentIndex + 1) % toastConfig.notifications.length;
    setCurrentIndex(next);
    setVisible(true);

    // Play sound
    if (toastConfig.sound && audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    }

    // Auto dismiss
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, toastConfig.autoDismiss);
  }, [currentIndex, toastConfig]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Menggunakan audio ting premium dari CDN publik yang andal
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");

    // Initial delay
    const initial = setTimeout(() => {
      showNext();
    }, 5000);

    return () => clearTimeout(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toastConfig.enabled || isPaused) return;

    const interval =
      toastConfig.intervalMin +
      Math.random() * (toastConfig.intervalMax - toastConfig.intervalMin);

    timerRef.current = setTimeout(() => {
      if (!visible) showNext();
    }, interval);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, isPaused, toastConfig, showNext]);

  const close = () => {
    setVisible(false);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
  };

  if (!toastConfig.enabled || toastConfig.notifications.length === 0) return null;

  const notification = toastConfig.notifications[currentIndex];
  if (!notification) return null;

  const initials = notification.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm w-full sm:w-auto">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 200 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 relative"
          >
            <button
              onClick={close}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">
                  {notification.name}
                </p>
                <p className="text-slate-600 text-sm">
                  {notification.action}{" "}
                  <span className="font-medium text-emerald-600">
                    {notification.product}
                  </span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {notification.timeAgo} · {notification.location}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
