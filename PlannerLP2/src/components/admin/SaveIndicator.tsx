"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, CloudUpload } from "lucide-react";

interface SaveIndicatorProps {
  isDirty: boolean;
  lastSaved: string | null;
}

export function SaveIndicator({ isDirty, lastSaved }: SaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isDirty && lastSaved) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isDirty, lastSaved]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 shadow-inner">
      <AnimatePresence mode="wait">
        {isDirty ? (
          <motion.div
            key="unsaved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 text-amber-600"
          >
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Unsaved Changes</span>
          </motion.div>
        ) : (
          <motion.div
            key="saved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2 text-emerald-600"
          >
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {showSaved ? "All Changes Saved" : "System Synchronized"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
