// src/components/layout/Header.tsx
"use client";

import { useState } from "react";
import { Award, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface HeaderProps {
  onReset: () => void;
  hasData: boolean;
}

export function Header({ onReset, hasData }: HeaderProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Award size={18} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">
                Debt Freedom Planner
              </h1>
              <p className="text-xs text-slate-500 leading-none mt-0.5">
                Extra Bonus Monefyi · Versi Lite · Gratis
              </p>
            </div>
          </div>

          {/* Reset button */}
          {hasData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm(true)}
              leftIcon={<RotateCcw size={14} />}
              className="text-slate-500 hover:text-red-400"
            >
              Reset Data
            </Button>
          )}
        </div>
      </header>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={onReset}
        title="Reset Semua Data?"
        message="Semua data hutang, penghasilan, dan hasil perhitungan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Ya, Hapus Semua"
        danger
      />
    </>
  );
}
