"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useContentStore } from "@/lib/store/contentStore";
import { Save, RefreshCw, ExternalLink, ShieldCheck, Users } from "lucide-react";
import type { PublicToastItem, ToastFeedSummary } from "@/lib/crm/toastFeedMapper";

const CATEGORY_BADGE: Record<PublicToastItem["category"], { label: string; className: string }> = {
  bundle: { label: "Beli 2+ Akun", className: "bg-amber-100 text-amber-800" },
  pro: { label: "PRO", className: "bg-indigo-100 text-indigo-700" },
  upgrade: { label: "Upgrade PRO", className: "bg-purple-100 text-purple-700" },
  standard: { label: "Standard", className: "bg-emerald-100 text-emerald-700" },
  free: { label: "Free", className: "bg-teal-100 text-teal-800" },
};

export default function ToastAdminPage() {
  const { content, updateSection, publishContent } = useContentStore();
  const [config, setConfig] = useState(() => ({
    ...content.toast,
    includeFree: content.toast?.includeFree !== false,
    maskCustomerName: content.toast?.maskCustomerName !== false,
    maxItems: content.toast?.maxItems || 30,
  }));
  const [saved, setSaved] = useState(false);

  const [previewItems, setPreviewItems] = useState<PublicToastItem[]>([]);
  const [summary, setSummary] = useState<ToastFeedSummary>({
    total: 0,
    standard: 0,
    pro: 0,
    bundle: 0,
    upgrade: 0,
    free: 0,
  });
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loadingFeed, setLoadingFeed] = useState(true);

  const fetchCrmPreview = useCallback(async () => {
    setLoadingFeed(true);
    try {
      const params = new URLSearchParams({
        includeFree: config.includeFree ? "true" : "false",
        maskName: config.maskCustomerName ? "true" : "false",
        limit: String(config.maxItems || 30),
        refresh: "1",
      });
      const res = await fetch(`/api/landing/toast-feed?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) {
        setPreviewItems(Array.isArray(data.items) ? data.items : []);
        if (data.summary) setSummary(data.summary);
        if (data.syncedAt) setSyncedAt(data.syncedAt);
      }
    } catch {
      // silent
    } finally {
      setLoadingFeed(false);
    }
  }, [config.includeFree, config.maskCustomerName, config.maxItems]);

  useEffect(() => {
    void fetchCrmPreview();
  }, [fetchCrmPreview]);

  const save = async () => {
    updateSection("toast", {
      ...config,
      notifications: [],
    });
    await publishContent();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Toast Notifikasi (Live CRM)</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Otomatis menampilkan transaksi &amp; aktivasi nyata dari data CRM tanpa data fiktif.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/crm"
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            <Users className="w-4 h-4" /> Buka CRM
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <button
            onClick={save}
            className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {saved ? "Tersimpan!" : "Simpan"}
          </button>
        </div>
      </div>

      {/* Pengaturan Tampilan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-slate-900 mb-4">Pengaturan Sinkronisasi CRM</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="flex items-center justify-between sm:justify-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <label className="text-sm font-semibold text-slate-700">Aktifkan Toast</label>
            <button
              type="button"
              onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${config.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                }`}
            >
              {config.enabled ? "Aktif" : "Nonaktif"}
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <label className="text-sm font-semibold text-slate-700">Tampilkan Free</label>
            <button
              type="button"
              onClick={() => setConfig((p) => ({ ...p, includeFree: !p.includeFree }))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${config.includeFree ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-600"
                }`}
            >
              {config.includeFree ? "Tampil" : "Hanya Berbayar"}
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <label className="text-sm font-semibold text-slate-700">Singkat Nama</label>
            <button
              type="button"
              onClick={() => setConfig((p) => ({ ...p, maskCustomerName: !p.maskCustomerName }))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${config.maskCustomerName
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-200 text-slate-600"
                }`}
            >
              {config.maskCustomerName ? "Aktif (Privasi)" : "Nama Lengkap"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Jeda Minimal (detik)
            </label>
            <input
              type="number"
              min={3}
              max={60}
              value={Math.round((config.intervalMin || 9000) / 1000)}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  intervalMin: Math.max(3, Number(e.target.value) || 9) * 1000,
                }))
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Jeda Maksimal (detik)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={Math.round((config.intervalMax || 22000) / 1000)}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  intervalMax: Math.max(5, Number(e.target.value) || 22) * 1000,
                }))
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">
              Maksimal Data CRM
            </label>
            <input
              type="number"
              min={5}
              max={50}
              value={config.maxItems || 30}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  maxItems: Math.min(50, Math.max(5, Number(e.target.value) || 30)),
                }))
              }
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-emerald-50/70 border border-emerald-100 rounded-xl px-3.5 py-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Email, nomor WA, nominal uang, akun testing/admin, dan checkout yang belum lunas
            otomatis disaring dan tidak pernah dikirim ke browser pengunjung.
          </span>
        </div>
      </div>

      {/* Ringkasan Fakta CRM */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-slate-400">Total Feed</p>
          <p className="text-xl font-black text-slate-900">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-emerald-600">Standard</p>
          <p className="text-xl font-black text-slate-900">{summary.standard}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-indigo-600">PRO</p>
          <p className="text-xl font-black text-slate-900">{summary.pro}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-amber-600">Beli 2+</p>
          <p className="text-xl font-black text-slate-900">{summary.bundle}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-purple-600">Upgrade</p>
          <p className="text-xl font-black text-slate-900">{summary.upgrade}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <p className="text-[11px] font-semibold text-teal-600">Free</p>
          <p className="text-xl font-black text-slate-900">{summary.free}</p>
        </div>
      </div>

      {/* Pratinjau Live Feed CRM */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-slate-900">
            Pratinjau Live dari CRM ({previewItems.length})
          </h2>
          {syncedAt && (
            <p className="text-xs text-slate-400">
              Terakhir disinkronkan:{" "}
              {new Date(syncedAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void fetchCrmPreview()}
          disabled={loadingFeed}
          className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loadingFeed ? "animate-spin" : ""}`} />
          Refresh dari CRM
        </button>
      </div>

      {loadingFeed && previewItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
          Memuat data transaksi nyata dari CRM...
        </div>
      ) : previewItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="font-semibold text-slate-700 text-sm">
            Belum ada data transaksi lunas / aktivasi Free yang memenuhi syarat di CRM.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Banner toast di landing page otomatis disembunyikan hingga ada data faktual dari CRM.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {previewItems.map((notif) => {
            const badge = CATEGORY_BADGE[notif.category] || CATEGORY_BADGE.standard;
            return (
              <div
                key={notif.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between p-3.5 gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{notif.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {notif.location && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {notif.location}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mt-0.5">
                    {notif.action}{" "}
                    <span className="text-emerald-700 font-semibold">{notif.product}</span>
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  {notif.timeAgo}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
