"use client";

import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/lib/store/uiStore";
import { plannerAppPath } from "@/lib/config/plannerApp";

export function UpsellModal() {
  const { isUpsellModalOpen, upsellMessage, setUpsellModalOpen } = useUiStore();

  return (
    <Dialog open={isUpsellModalOpen} onOpenChange={setUpsellModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Sparkles className="h-7 w-7" />
          </div>
          <DialogTitle className="text-center">Buka Potensi Penuh Monefyi Planner</DialogTitle>
          <DialogDescription className="text-center">
            {upsellMessage ||
              "Kelola proyek tanpa batas, lacak pengeluaran, dan kolaborasi dengan tim."}
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li>✓ Proyek aktif unlimited</li>
          <li>✓ Catat pengeluaran & invoice termin</li>
          <li>✓ Tim & client portal</li>
        </ul>

        <a
          href={plannerAppPath("/signup/owner")}
          className="mt-6 block w-full rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
        >
          Upgrade ke Planner Lifetime — Rp 199.000
        </a>
      </DialogContent>
    </Dialog>
  );
}
