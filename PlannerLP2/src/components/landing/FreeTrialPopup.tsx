"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { useUIStore } from "@/lib/store/uiStore";
import { ownsEstimator } from "@/lib/permissions";
import { trackEvent } from "@/lib/analytics/events";
import { plannerAppPath } from "@/lib/config/plannerApp";

const STORAGE_KEY = "estimator_free_trial_popup_v1";
const MIN_ENGAGE_MS = 8_000;
const IDLE_MS = 45_000;
const SUPPRESS_MS = 24 * 60 * 60 * 1000;

type Trigger =
  | "exit_intent"
  | "return_to_page"
  | "scroll_bottom"
  | "idle_engaged";

type StoredState = {
  dismissedAt?: number;
  convertedAt?: number;
};

function readStore(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredState;
  } catch {
    return {};
  }
}

function writeStore(patch: StoredState) {
  try {
    const next = { ...readStore(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function isSuppressed(): boolean {
  const s = readStore();
  if (s.convertedAt) return true;
  if (s.dismissedAt && Date.now() - s.dismissedAt < SUPPRESS_MS) return true;
  return false;
}

/**
 * Popup retensi: dorong coba gratis Estimator tanpa menyebut kuota.
 * Trigger: exit intent, kembali ke tab, scroll bawah, idle setelah membaca.
 */
export function FreeTrialPopup() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { isAdmin, isEditMode } = useLandingAdmin();
  const isLoginModalOpen = useUIStore((s) => s.isLoginModalOpen);

  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<Trigger | null>(null);

  const shownRef = useRef(false);
  const engagedAt = useRef(0);
  const leftTabRef = useRef(false);
  const scrolledRef = useRef(0);
  const idleTimer = useRef<number | null>(null);

  const eligible =
    hydrated &&
    !isAuthenticated &&
    !isAdmin &&
    !isEditMode &&
    !ownsEstimator(user) &&
    !isLoginModalOpen;

  const tryOpen = useCallback(
    (reason: Trigger) => {
      if (!eligible || shownRef.current || open) return;
      if (typeof window === "undefined") return;
      if (isSuppressed()) return;
      if (Date.now() - engagedAt.current < MIN_ENGAGE_MS) return;

      shownRef.current = true;
      setTrigger(reason);
      setOpen(true);
      trackEvent("free_trial_popup_view", { source: reason });
    },
    [eligible, open],
  );

  const dismiss = useCallback(() => {
    setOpen(false);
    writeStore({ dismissedAt: Date.now() });
    trackEvent("free_trial_popup_dismiss", { source: trigger ?? "unknown" });
  }, [trigger]);

  const cta = () => {
    writeStore({ convertedAt: Date.now() });
    trackEvent("free_trial_popup_cta", { source: trigger ?? "unknown" });
    trackEvent("free_signup", { source: `popup_${trigger ?? "unknown"}` });
    window.location.href = plannerAppPath("/app/estimator?plan=free");
  };

  useEffect(() => {
    if (!eligible) return;
    engagedAt.current = Date.now();

    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY > 12) return;
      if (e.relatedTarget != null) return;
      tryOpen("exit_intent");
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        leftTabRef.current = true;
        return;
      }
      if (leftTabRef.current && document.visibilityState === "visible") {
        leftTabRef.current = false;
        window.setTimeout(() => tryOpen("return_to_page"), 400);
      }
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = (window.scrollY / max) * 100;
      scrolledRef.current = Math.max(scrolledRef.current, pct);
      if (pct >= 88) tryOpen("scroll_bottom");
      bumpIdle();
    };

    const bumpIdle = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        if (scrolledRef.current >= 18) tryOpen("idle_engaged");
      }, IDLE_MS);
    };

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.setTimeout(() => tryOpen("return_to_page"), 300);
    };

    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pointerdown", bumpIdle, { passive: true });
    bumpIdle();

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pointerdown", bumpIdle);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [eligible, tryOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, dismiss]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-trial-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Tutup"
            onClick={dismiss}
          />

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[var(--surface-alt)] overflow-hidden"
          >
            <div
              className="h-1.5 w-full"
              style={{ background: "var(--brand-gradient)" }}
              aria-hidden
            />

            <button
              type="button"
              onClick={dismiss}
              className="absolute top-3 right-3 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-soft)]"
              aria-label="Tutup popup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pt-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-soft)] border border-[var(--surface-alt)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-600)] mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Coba gratis
              </div>

              <h2
                id="free-trial-title"
                className="text-xl md:text-2xl font-extrabold text-[var(--ink)] tracking-tight leading-snug pr-8"
              >
                Belum siap bayar? Coba Estimator dulu.
              </h2>
              <p className="mt-3 text-[15px] text-[var(--muted)] leading-relaxed">
                Hitung harga di HP, lihat hasilnya, lalu kirim PDF — tanpa kartu kredit.
                Kalau cocok, baru upgrade.
              </p>

              <button
                type="button"
                onClick={cta}
                className="mt-6 w-full btn-brand inline-flex items-center justify-center gap-2 min-h-[48px] text-base"
              >
                Coba Gratis Sekarang
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={dismiss}
                className="mt-3 w-full text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px]"
              >
                Nanti saja
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
