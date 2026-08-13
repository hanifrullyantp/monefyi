"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  PiggyBank,
  AlertTriangle,
  Compass,
  Shield,
  TrendingUp,
  ChevronDown,
} from "lucide-react";
import { TIPS_KEUANGAN } from "@/lib/budget-data";
import { cn } from "@/lib/cn";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Rocket,
  PiggyBank,
  AlertTriangle,
  Compass,
  Shield,
  TrendingUp,
};

export function TipsKeuangan() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section
      className="rounded-3xl border border-slate-700 bg-slate-800/30 p-6 md:p-8 space-y-5"
      aria-label="Tips Keuangan"
    >
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">
          Tips Keuangan
        </h2>
        <p className="text-sm text-slate-400">
          Panduan praktis untuk mengelola keuangan lebih baik
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {TIPS_KEUANGAN.map((tip, i) => {
          const Icon = ICON_MAP[tip.icon] ?? TrendingUp;
          const isExpanded = expandedId === tip.id;

          return (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-slate-700 bg-slate-800/50 overflow-hidden"
            >
              <button
                onClick={() => toggle(tip.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
                aria-expanded={isExpanded}
                aria-label={tip.kategori}
              >
                <div className="w-9 h-9 rounded-xl bg-green-900/30 border border-green-800/40 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-green-400" />
                </div>
                <p className="font-medium text-white text-sm flex-1">
                  {tip.kategori}
                </p>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-slate-400 transition-transform duration-200 shrink-0",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <ul className="px-4 pb-4 space-y-2 border-t border-slate-700 pt-3">
                      {tip.tips.map((t, j) => (
                        <li
                          key={j}
                          className="flex items-start gap-2 text-sm text-slate-300"
                        >
                          <span className="text-green-400 mt-0.5 shrink-0 text-xs">
                            ✦
                          </span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
