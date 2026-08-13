// src/components/debt/DebtInputForm.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, AlertCircle } from "lucide-react";
import type { DebtItem } from "@/types";
import { DebtItem as DebtItemComponent } from "./DebtItem";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/formatters";

interface DebtInputFormProps {
  debts: DebtItem[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<DebtItem>) => void;
  onRemove: (id: string) => void;
}

export function DebtInputForm({ debts, onAdd, onUpdate, onRemove }: DebtInputFormProps) {
  const totalHutang = debts.reduce((s, d) => s + d.totalHutang, 0);
  const totalMinimum = debts.reduce((s, d) => s + d.cicilanMinimum, 0);

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-700/40">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Daftar Hutang Anda
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Semakin lengkap informasi, semakin akurat rencana pelunasan Anda
        </p>
      </div>

      <div className="p-6">
        {/* Empty state */}
        {debts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-2">
              Belum ada hutang yang diinput
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Mulai dengan menambahkan hutang pertama Anda
            </p>
            <Button onClick={onAdd} size="lg">
              <Plus size={18} />
              Tambah Hutang Pertama
            </Button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {debts.map((debt, index) => (
                <DebtItemComponent
                  key={debt.id}
                  debt={debt}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  index={index}
                />
              ))}
            </AnimatePresence>

            {/* Add button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={onAdd}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-600/50 rounded-2xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-sm font-medium"
            >
              <Plus size={18} />
              Tambah Hutang Baru
            </motion.button>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {debts.length > 0 && (
        <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700/40">
          <div className="flex flex-wrap gap-4 justify-between">
            <div>
              <p className="text-xs text-slate-500">Total Hutang</p>
              <p className="text-base font-bold text-white tabular-nums">
                {formatCurrency(totalHutang)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Jumlah Hutang</p>
              <p className="text-base font-bold text-white">
                {debts.length} hutang
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Cicilan Minimum</p>
              <p className="text-base font-bold text-amber-400 tabular-nums">
                {formatCurrency(totalMinimum)}/bulan
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
