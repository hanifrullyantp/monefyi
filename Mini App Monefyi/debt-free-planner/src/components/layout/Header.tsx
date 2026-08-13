// src/components/layout/Header.tsx
"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
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
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-end">
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
