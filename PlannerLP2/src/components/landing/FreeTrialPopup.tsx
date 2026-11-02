"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShoppingCart, Sparkles, X } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { useUIStore } from "@/lib/store/uiStore";
import { ownsEstimator } from "@/lib/permissions";
import { trackEvent } from "@/lib/analytics/events";
import { plannerAppPath } from "@/lib/config/plannerApp";
import { useContentStore } from "@/lib/store/contentStore";
import { useLandingCta } from "@/lib/hooks/useLandingCta";

const STORAGE_KEY = "estimator_free_trial_popup_v1";
const SUPPRESS_MS = 24 * 60 * 60 * 1000;

type Trigger = "exit_intent" | "back_button" | "idle";

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readStore(), ...patch }));
  } catch {
    // Storage may be unavailable in private browsing; popup still works for this visit.
  }
}

function isSuppressed(): boolean {
  const state = readStore();
  if (state.convertedAt) return true;
  return Boolean(state.dismissedAt && Date.now() - state.dismissedAt < SUPPRESS_MS);
}

/** Popup relink: tawarkan akses gratis dan checkout Standard saat pengunjung hendak pergi. */
export function FreeTrialPopup() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { isAdmin, isEditMode } = useLandingAdmin();
  const isLoginModalOpen = useUIStore((s) => s.isLoginModalOpen);
  const config = useContentStore((s) => s.content.relinkPopup);
  const { startCheckout } = useLandingCta();

  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const shownRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);

  const eligible =
    config.enabled &&
    hydrated &&
    !isAuthenticated &&
    !isAdmin &&
    !isEditMode &&
    !ownsEstimator(user) &&
    !isLoginModalOpen;

  const tryOpen = useCallback(
    (reason: Trigger) => {
      if (!eligible || shownRef.current || isSuppressed()) return false;
      shownRef.current = true;
      setTrigger(reason);
      setOpen(true);
      trackEvent("free_trial_popup_view", { source: reason });
      return true;
    },
    [eligible],
  );

  const dismiss = useCallback(() => {
    setOpen(false);
    writeStore({ dismissedAt: Date.now() });
    trackEvent("free_trial_popup_dismiss", { source: trigger ?? "unknown" });
  }, [trigger]);

  const tryFreeApp = () => {
    writeStore({ convertedAt: Date.now() });
    trackEvent("free_trial_popup_cta", { source: trigger ?? "unknown" });
    trackEvent("free_signup", { source: `popup_${trigger ?? "unknown"}` });
    window.location.href = plannerAppPath("/app/estimator?plan=free");
  };

  const buyStandard = () => {
    writeStore({ convertedAt: Date.now() });
    trackEvent("free_trial_popup_cta", { source: `purchase_${trigger ?? "unknown"}` });
    void startCheckout("estimator-standard");
  };

  useEffect(() => {
    if (!eligible) return;

    const onMouseOut = (event: MouseEvent) => {
      if (event.clientY > 12 || event.relatedTarget != null) return;
      tryOpen("exit_intent");
    };

    const armIdleTimer = () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      const minutes = Math.max(1, Math.min(120, Number(config.idleMinutes) || 10));
      idleTimerRef.current = window.setTimeout(() => tryOpen("idle"), minutes * 60_000);
    };

    const onBack = () => {
      if (tryOpen("back_button")) {
        // Restore an entry so the first back action opens the relink prompt, not a new page.
        window.history.pushState({ relinkPrompt: true }, "", window.location.href);
      }
    };

    window.history.pushState({ relinkPrompt: true }, "", window.location.href);
    window.addEventListener("popstate", onBack);
    document.addEventListener("mouseout", onMouseOut);
    ["pointerdown", "keydown", "touchstart", "scroll"].forEach((eventName) => {
      window.addEventListener(eventName, armIdleTimer, { passive: true });
    });
    armIdleTimer();

    return () => {
      window.removeEventListener("popstate", onBack);
      document.removeEventListener("mouseout", onMouseOut);
      ["pointerdown", "keydown", "touchstart", "scroll"].forEach((eventName) => {
        window.removeEventListener(eventName, armIdleTimer);
      });
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
    };
  }, [config.idleMinutes, eligible, tryOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
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
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--surface-alt)] bg-white shadow-2xl"
          >
            <div className="h-1.5 w-full" style={{ background: "var(--brand-gradient)" }} aria-hidden />
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-3 top-3 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--surface-soft)]"
              aria-label="Tutup popup"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-6 pt-5">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--surface-alt)] bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--brand-600)]">
                <Sparkles className="h-3.5 w-3.5" /> Coba gratis
              </div>
              <h2 id="free-trial-title" className="pr-8 text-xl font-extrabold leading-snug tracking-tight text-[var(--ink)] md:text-2xl">
                {config.title}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{config.body}</p>
              <button
                type="button"
                onClick={tryFreeApp}
                className="btn-brand mt-6 inline-flex min-h-[48px] w-full items-center justify-center gap-2 text-base"
              >
                {config.freeCtaText}<ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={buyStandard}
                className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-extrabold text-amber-950 transition hover:bg-amber-100"
              >
                <ShoppingCart className="h-4 w-4" />{config.purchaseCtaText}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="mt-2 min-h-[44px] w-full text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
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
