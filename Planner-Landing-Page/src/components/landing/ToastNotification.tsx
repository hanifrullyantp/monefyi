"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useContentStore } from "@/lib/store/contentStore";
import type { ToastNotification as ToastNotificationData } from "@/lib/types/content";

function ToastCard({
  notification,
  onDismiss,
}: {
  notification: ToastNotificationData;
  onDismiss: () => void;
}) {
  const initial = notification.name.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 max-w-sm w-full",
        "animate-slideInRight"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 relative">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
          {initial}
        </div>

        {/* Content */}
        <div className="flex-1 pr-6">
          <p className="font-semibold text-slate-900 text-sm">{notification.name}</p>
          <p className="text-slate-600 text-sm">
            {notification.action}{" "}
            <span className="font-medium text-emerald-600">{notification.product}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {notification.timeAgo} · {notification.location}
          </p>
        </div>

        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-0 right-0 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastNotification() {
  const { content } = useContentStore();
  const { toast } = content;
  const [currentNotification, setCurrentNotification] = useState<ToastNotificationData | null>(null);
  const [visible, setVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(0);

  const playSound = useCallback(() => {
    if (!toast.sound || !toast.soundUrl) return;
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(toast.soundUrl);
        audioRef.current.volume = toast.volume;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {
      // Audio not available
    }
  }, [toast.sound, toast.soundUrl, toast.volume]);

  const showNext = useCallback(() => {
    if (!toast.enabled || !toast.notifications.length) return;

    const notification = toast.notifications[currentIndexRef.current % toast.notifications.length];
    currentIndexRef.current++;

    setCurrentNotification(notification);
    setVisible(true);
    playSound();

    // Auto dismiss
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setCurrentNotification(null), 300);
    }, toast.autoDismiss);
  }, [toast.enabled, toast.notifications, toast.autoDismiss, playSound]);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setCurrentNotification(null), 300);
  }, []);

  useEffect(() => {
    if (!toast.enabled || !toast.notifications.length) return;

    // First show after initial delay
    const initialTimer = setTimeout(() => {
      showNext();

      // Then repeat at random intervals
      const scheduleNext = () => {
        const delay =
          toast.intervalMin +
          Math.random() * (toast.intervalMax - toast.intervalMin);
        intervalRef.current = setTimeout(() => {
          showNext();
          scheduleNext();
        }, delay);
      };
      scheduleNext();
    }, toast.initialDelay);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearTimeout(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.enabled, toast.notifications.length, toast.initialDelay, toast.intervalMin, toast.intervalMax, showNext]);

  if (!currentNotification) return null;

  return (
    <div
      className={cn(
        "fixed z-[100] transition-all duration-300",
        "bottom-4 right-4",
        "max-sm:bottom-2 max-sm:left-2 max-sm:right-2",
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
      )}
    >
      <ToastCard notification={currentNotification} onDismiss={dismiss} />
    </div>
  );
}
