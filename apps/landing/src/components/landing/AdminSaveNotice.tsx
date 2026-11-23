"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/lib/store/uiStore";

export function AdminSaveNotice() {
  const saveNotice = useUIStore((s) => s.saveNotice);
  const setSaveNotice = useUIStore((s) => s.setSaveNotice);

  useEffect(() => {
    if (!saveNotice) return;
    const id = window.setTimeout(() => setSaveNotice(null), 6000);
    return () => window.clearTimeout(id);
  }, [saveNotice, setSaveNotice]);

  const isError =
    saveNotice != null &&
    /gagal|error|login|belum/i.test(saveNotice);

  return (
    <AnimatePresence>
      {saveNotice && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed top-[calc(var(--header-h-mobile)+8px)] lg:top-[calc(var(--header-h-desktop)+8px)] left-1/2 -translate-x-1/2 z-[120] max-w-[min(100%,420px)] px-4"
          role="status"
        >
          <p
            className={`text-sm font-semibold rounded-xl px-4 py-3 shadow-lg border ${
              isError
                ? "bg-red-50 text-red-900 border-red-200"
                : "bg-emerald-50 text-emerald-900 border-emerald-200"
            }`}
          >
            {saveNotice}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
