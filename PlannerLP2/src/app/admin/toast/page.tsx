"use client";
import { useState } from "react";
import { useContentStore } from "@/lib/store/contentStore";
import { Save, Plus, Trash2 } from "lucide-react";
import type { ToastNotification } from "@/lib/types/content";

export default function ToastAdminPage() {
  const { content, updateSection, markSaved } = useContentStore();
  const [config, setConfig] = useState(content.toast);
  const [saved, setSaved] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const save = () => {
    updateSection("toast", config);
    markSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addNotification = () => {
    const newNotif: ToastNotification = {
      name: "Nama Pengguna",
      action: "baru saja beli",
      product: "Estimator Lifetime",
      location: "Jakarta",
      timeAgo: "5 menit lalu",
    };
    setConfig((prev) => ({
      ...prev,
      notifications: [...prev.notifications, newNotif],
    }));
    setEditingIdx(config.notifications.length);
  };

  const updateNotif = (idx: number, updates: Partial<ToastNotification>) => {
    setConfig((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n, i) => (i === idx ? { ...n, ...updates } : n)),
    }));
  };

  const deleteNotif = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Toast Notifikasi</h1>
        <button onClick={save} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700">
          <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-slate-900 mb-4">Pengaturan</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">Aktifkan Toast</label>
            <button
              onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${config.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
            >
              {config.enabled ? "Aktif" : "Nonaktif"}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">Suara</label>
            <button
              onClick={() => setConfig((p) => ({ ...p, sound: !p.sound }))}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${config.sound ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
            >
              {config.sound ? "Aktif" : "Nonaktif"}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-slate-900">Notifikasi ({config.notifications.length})</h2>
        <button onClick={addNotification} className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-50">
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      <div className="space-y-2">
        {config.notifications.map((notif, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {editingIdx === idx ? (
              <div className="p-4 grid grid-cols-2 gap-3">
                {(["name", "action", "product", "location", "timeAgo"] as const).map((key) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-slate-500 block mb-1 capitalize">{key}</label>
                    <input
                      value={notif[key]}
                      onChange={(e) => updateNotif(idx, { [key]: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => setEditingIdx(null)} className="flex-1 bg-emerald-600 text-white rounded-xl py-2 text-sm font-semibold">Selesai</button>
                  <button onClick={() => deleteNotif(idx)} className="p-2 text-red-500 border border-red-200 rounded-xl hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3">
                <div>
                  <span className="font-semibold text-sm text-slate-900">{notif.name}</span>
                  <span className="text-slate-500 text-sm"> {notif.action} </span>
                  <span className="text-emerald-600 text-sm font-medium">{notif.product}</span>
                  <p className="text-xs text-slate-400">{notif.location} · {notif.timeAgo}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditingIdx(idx)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteNotif(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
