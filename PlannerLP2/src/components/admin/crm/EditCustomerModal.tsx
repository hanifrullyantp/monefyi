"use client";

import { useEffect, useState } from "react";
import {
  X,
  Save,
  Key,
  Mail,
  User,
  Phone,
  ShieldCheck,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/types/leads";
import { LEAD_STATUS_LABELS } from "@/lib/types/leads";
import { formatCurrency, formatRelativeTime } from "@/lib/utils/format";

interface Props {
  lead: Lead;
  onClose: () => void;
  onUpdated: (updates: Partial<Lead>) => void;
}

export function EditCustomerModal({ lead, onClose, onUpdated }: Props) {
  const [name, setName] = useState(lead.name || "");
  const [email, setEmail] = useState(lead.email || "");
  const [password, setPassword] = useState(lead.accountPassword || "Estimator2026!");
  const [phone, setPhone] = useState(lead.phone || "");
  const [planTier, setPlanTier] = useState<"pro" | "standard" | "free">(
    (lead.planTier as any) ||
      (lead.projectType?.toLowerCase().includes("pro") ? "pro" : "standard")
  );
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes || "");
  const [projectType, setProjectType] = useState(lead.projectType || "Monefyi Estimator");
  const [estimatedValue, setEstimatedValue] = useState<number>(lead.estimatedValue || lead.amount || 0);

  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load live statistics
  const fetchStats = () => {
    setLoadingStats(true);
    fetch(`/api/crm/customer?email=${encodeURIComponent(lead.email || "")}&id=${encodeURIComponent(lead.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) {
          setStats(d.data);
          if (!email && d.data.email) setEmail(d.data.email);
          if (d.data.planTier && !lead.planTier) {
            setPlanTier(d.data.planTier === "pro" ? "pro" : d.data.planTier === "free" ? "free" : "standard");
          }
        }
      })
      .catch((e) => console.warn("Fetch stats error:", e))
      .finally(() => setLoadingStats(false));
  };

  useEffect(() => {
    fetchStats();
  }, [lead.id, lead.email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/crm/customer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          sessionId: lead.sessionId,
          email: lead.email,
          newEmail: email.trim(),
          password: password.trim(),
          name: name.trim(),
          phone: phone.trim(),
          planTier,
          status,
          notes: notes.trim(),
          amount: estimatedValue,
          projectType: projectType.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal menyimpan perubahan");
      }

      const updates: Partial<Lead> = {
        name: name.trim(),
        email: email.trim(),
        accountPassword: password.trim(),
        phone: phone.trim(),
        planTier,
        status,
        notes: notes.trim(),
        projectType: projectType.trim(),
        estimatedValue,
        amount: estimatedValue,
        updatedAt: new Date().toISOString(),
      };

      onUpdated(updates);
      setSuccessMsg("Data berhasil disimpan & disinkronkan ke Supabase Auth!");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Edit Pelanggan & Akun</h3>
              <p className="text-xs text-slate-500 font-medium">
                Ubah password, email, paket, dan pantau keaktifan penggunaan aplikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="overflow-y-auto flex-1 py-4 space-y-6 pr-1">
          {/* Section: Live Statistics & In-App Activity */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg border border-slate-700 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Statistik Keaktifan di Aplikasi Estimator
                </h4>
              </div>
              <button
                type="button"
                onClick={fetchStats}
                disabled={loadingStats}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-200 transition-all cursor-pointer"
                title="Refresh data dari server"
              >
                <RefreshCw className={`w-3 h-3 ${loadingStats ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Estimasi Dibuat */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimasi Dibuat</p>
                <p className="text-xl font-black text-white mt-1">
                  {stats?.totalEstimations ?? 0}
                  <span className="text-xs font-normal text-slate-300 ml-1">estimasi</span>
                </p>
                <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
                  {(stats?.totalEstimations ?? 0) > 0 ? "🔥 Aktif Membuat" : "Belum buat"}
                </p>
              </div>

              {/* Proyek Aktif */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proyek Aktif</p>
                <p className="text-xl font-black text-white mt-1">
                  {stats?.totalProjects ?? 0}
                  <span className="text-xs font-normal text-slate-300 ml-1">proyek</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Dalam 1 workspace</p>
              </div>

              {/* Total Nilai Penawaran */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Omset Penawaran</p>
                <p className="text-sm font-black text-amber-300 mt-1.5 truncate">
                  {stats?.totalEstValue ? formatCurrency(stats.totalEstValue) : "Rp 0"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {stats?.sentViaWa ?? 0} terkirim via WA
                </p>
              </div>

              {/* Terakhir Aktif */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Terakhir Aktif</p>
                <p className="text-xs font-bold text-slate-200 mt-1 truncate">
                  {stats?.lastActiveAt ? formatRelativeTime(stats.lastActiveAt) : "Belum login"}
                </p>
                <p className="text-[10px] text-emerald-300 mt-1 font-mono">
                  {stats?.existsInAuth ? "✅ Akun Siap" : "⚠️ Belum ada auth"}
                </p>
              </div>
            </div>

            {/* Tim / Akun yang Terhubung (1 Project / Multi-User) */}
            {stats?.teamMembers && stats.teamMembers.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-[11px] font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Akun Terhubung dalam 1 Project ({stats.teamMembers.length} Akun):</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {stats.teamMembers.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-2.5 py-1 rounded-lg text-xs"
                    >
                      <span className="font-semibold text-white">{m.email}</span>
                      <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Edit */}
          <form id="edit-customer-form" onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Pelanggan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nama Pelanggan</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Nama Lengkap"
                />
              </div>

              {/* No. WhatsApp */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nomor WhatsApp</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  placeholder="0812xxxx atau 62812xxxx"
                />
              </div>

              {/* Email Akun Login */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Email Akun Login</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  placeholder="email@pelanggan.com"
                />
              </div>

              {/* Password Akun */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span>Kata Sandi / Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPassword("Estimator2026!")}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold"
                  >
                    Pakai Estimator2026!
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                    placeholder="Minimal 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  *Otomatis sinkron ke database login Supabase Auth saat disimpan
                </p>
              </div>

              {/* Paket Akun */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pilihan Paket Akun</span>
                </label>
                <select
                  value={planTier}
                  onChange={(e) => setPlanTier(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="pro">Estimator PRO (Akses Lengkap / Lifetime)</option>
                  <option value="standard">Estimator Standard (Rp 93.000)</option>
                  <option value="free">Free Trial (Aktivasi Gratis 3 Estimasi)</option>
                </select>
              </div>

              {/* Status Pipeline */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Status Pipeline CRM</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                >
                  <option value="won">Deal / Lunas (Won)</option>
                  <option value="pending_payment">Menunggu Pembayaran (Pending)</option>
                  <option value="abandoned_checkout">Checkout Tertunda (Abandoned)</option>
                  <option value="free_active">Member Free Aktif</option>
                  <option value="contacted">Sudah Dihubungi</option>
                  <option value="negotiating">Negosiasi</option>
                  <option value="lost">Tidak Jadi / Batal</option>
                </select>
              </div>

              {/* Nominal Pembayaran */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nominal Transaksi (IDR)</span>
                </label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                  placeholder="Rp 93000"
                />
              </div>

              {/* Tipe Proyek / Usaha */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Jenis Usaha / Proyek</span>
                </label>
                <input
                  type="text"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="Kontraktor / Interior / Kitchen Set"
                />
              </div>
            </div>

            {/* Catatan Internal */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Catatan Khusus Admin
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                placeholder="Tambahkan catatan khusus follow-up, riwayat pembayaran, atau permintaan pelanggan..."
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
          <button
            type="submit"
            form="edit-customer-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-xl shadow-md shadow-emerald-700/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Supabase...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

