"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaveIndicator } from "@/components/admin/SaveIndicator";
import { Save, Plus, Trash2 } from "lucide-react";
import type { ToastNotification } from "@/lib/types/content";
import { useAdminContentSave, type SaveStatus } from "@/lib/hooks/useAdminContentSave";

export default function ToastPage() {
  const { content } = useContentStore();
  const { persistSection } = useAdminContentSave();
  const [toast, setToast] = useState(content.toast);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleSave = () => {
    persistSection("toast", toast, setSaveStatus);
  };

  const updateNotification = (index: number, patch: Partial<ToastNotification>) => {
    setToast({
      ...toast,
      notifications: toast.notifications.map((n, i) => (i === index ? { ...n, ...patch } : n)),
    });
  };

  const addNotification = () => {
    const id = Date.now();
    setToast({
      ...toast,
      notifications: [
        ...toast.notifications,
        {
          id,
          name: "Nama Klien",
          action: "baru saja beli",
          product: "Estimator Pro",
          location: "Jakarta",
          timeAgo: "baru saja",
        },
      ],
    });
  };

  const removeNotification = (index: number) => {
    setToast({
      ...toast,
      notifications: toast.notifications.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="max-w-4xl pb-20">
      <PageHeader
        title="Notifikasi Toast"
        description="Data yang sama dipakai komponen toast di landing page"
        actions={
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <button
              type="button"
              onClick={addNotification}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold"
            >
              <Save className="w-4 h-4" /> Simpan
            </button>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={toast.enabled}
            onChange={(e) => setToast({ ...toast, enabled: e.target.checked })}
            className="w-5 h-5"
          />
          <span className="text-sm font-bold text-slate-700">Aktifkan toast di landing</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Delay awal (ms)</span>
            <input
              type="number"
              value={toast.initialDelay}
              onChange={(e) => setToast({ ...toast, initialDelay: Number(e.target.value) })}
              className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Auto dismiss (ms)</span>
            <input
              type="number"
              value={toast.autoDismiss}
              onChange={(e) => setToast({ ...toast, autoDismiss: Number(e.target.value) })}
              className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Interval min (ms)</span>
            <input
              type="number"
              value={toast.intervalMin}
              onChange={(e) => setToast({ ...toast, intervalMin: Number(e.target.value) })}
              className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Interval max (ms)</span>
            <input
              type="number"
              value={toast.intervalMax}
              onChange={(e) => setToast({ ...toast, intervalMax: Number(e.target.value) })}
              className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {toast.notifications.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200">
            Belum ada notifikasi. Tambah manual atau biarkan kosong (toast nonaktif).
          </p>
        )}
        {toast.notifications.map((n, i) => (
          <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-slate-400 uppercase">Notifikasi #{i + 1}</p>
              <button type="button" onClick={() => removeNotification(i)} className="text-red-500 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {(["name", "action", "product", "location", "timeAgo"] as const).map((field) => (
                <label key={field} className="block">
                  <span className="text-xs font-semibold text-slate-500 capitalize">{field}</span>
                  <input
                    value={n[field]}
                    onChange={(e) => updateNotification(i, { [field]: e.target.value })}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
