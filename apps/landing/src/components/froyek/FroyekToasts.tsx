"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useFroyekStore } from "@/lib/froyek/store";
import { trackFroyek } from "@/lib/froyek/track";
import type { ToastRule } from "@/lib/froyek/schema";

const STORAGE = "froyek_toast_counts";

function readCounts(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function FroyekToasts() {
  const pathname = usePathname();
  const rules = useFroyekStore((state) => state.content.toasts);
  const [current, setCurrent] = useState<ToastRule | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/pilih")) return undefined;
    const onToast = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: string }>).detail?.trigger;
      if (!trigger || current) return;
      const rule = rules.find((item) => item.trigger === trigger);
      if (!rule) return;
      const counts = readCounts();
      if ((counts[rule.id] || 0) >= rule.maxShows) return;
      counts[rule.id] = (counts[rule.id] || 0) + 1;
      localStorage.setItem(STORAGE, JSON.stringify(counts));
      setCurrent(rule);
      trackFroyek("toast_shown", { id: rule.id, trigger });
    };
    window.addEventListener("froyek-toast", onToast);
    return () => window.removeEventListener("froyek-toast", onToast);
  }, [pathname, rules, current]);

  if (!current || pathname.startsWith("/pilih")) return null;
  const place = current.placement === "top" ? "top-4" : "bottom-4";
  return (
    <div className={`fixed inset-x-4 z-50 mx-auto max-w-md ${place}`} role="status" aria-live="polite">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-lg">
        <p className="flex-1">{current.message}</p>
        {current.href ? (
          <a
            className="font-semibold text-emerald-700"
            href={current.href}
            onClick={() => trackFroyek("toast_clicked", { id: current.id })}
          >
            Lanjut
          </a>
        ) : null}
        <button
          type="button"
          className="text-slate-500"
          onClick={() => {
            trackFroyek("toast_dismissed", { id: current.id });
            setCurrent(null);
          }}
        >
          Tutup
        </button>
      </div>
    </div>
  );
}

export function emitFroyekToast(trigger: ToastRule["trigger"]): void {
  window.dispatchEvent(new CustomEvent("froyek-toast", { detail: { trigger } }));
}
