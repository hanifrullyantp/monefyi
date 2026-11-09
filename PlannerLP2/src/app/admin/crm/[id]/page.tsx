"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { useLeadsStore } from "@/lib/store/leadsStore";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  DollarSign,
  Calendar,
  Plus,
  Save,
  ExternalLink,
  User,
  Hash,
  Clock,
  Key,
  Mail,
  ShieldCheck,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Layers,
  Copy,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils/format";
import {
  LeadStatus,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_SOURCE_LABELS,
} from "@/lib/types/leads";
import { openWhatsApp } from "@/lib/utils/whatsapp";
import { cn } from "@/lib/utils/cn";

const PIPELINE_COLUMNS: LeadStatus[] = [
  "new",
  "contacted",
  "survey_scheduled",
  "survey_done",
  "proposal_sent",
  "negotiating",
  "won",
  "lost",
];

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { leads, updateLead, updateLeadStatus, addActivity, deleteLead } = useLeadsStore();
  const router = useRouter();

  const lead = leads.find((l) => l.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(lead || {});
  const [newActivity, setNewActivity] = useState("");
  const [activityType, setActivityType] = useState<"note" | "call" | "whatsapp" | "meeting">("note");

  // In-app statistics & password management state
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const fetchStats = () => {
    if (!lead) return;
    setLoadingStats(true);
    const searchEmail = lead.email || "";
    fetch(`/api/crm/customer?email=${encodeURIComponent(searchEmail)}&id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) {
          setStats(d.data);
          setForm((prev: any) => ({
            ...prev,
            accountPassword: prev.accountPassword || lead.accountPassword || "Estimator2026!",
            email: prev.email || d.data.email || lead.email || "",
            planTier: (prev.planTier as any) || d.data.planTier || lead.planTier || "standard",
          }));
        }
      })
      .catch((e) => console.warn("Failed to load customer stats:", e))
      .finally(() => setLoadingStats(false));
  };

  useEffect(() => {
    fetchStats();
  }, [id, lead?.email]);

  if (!lead) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Lead tidak ditemukan</p>
        <Link href="/admin/crm" className="text-emerald-600 hover:underline">
          Kembali ke CRM
        </Link>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch("/api/crm/customer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          sessionId: lead.sessionId,
          email: lead.email,
          newEmail: form.email,
          password: form.accountPassword,
          name: form.name,
          phone: form.phone,
          planTier: form.planTier,
          status: form.status,
          notes: form.notes,
          amount: form.estimatedValue || form.amount,
          projectType: form.projectType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`Gagal menyimpan: ${data.error || "Terjadi kesalahan"}`);
      } else {
        updateLead(id, form as Partial<typeof lead>);
        setSaveSuccessMsg("Data pelanggan & password berhasil disinkronkan ke Supabase Auth!");
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        setEditing(false);
        fetchStats();
      }
    } catch (e: any) {
      alert(`Error: ${e.message || "Gagal menghubungi server"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = () => {
    if (!newActivity.trim()) return;
    addActivity(id, {
      type: activityType,
      content: newActivity,
      timestamp: new Date().toISOString(),
    });
    setNewActivity("");
  };

  const handleDelete = async () => {
    if (confirm("Hapus lead ini secara permanen dari server?")) {
      try {
        await fetch("/api/crm/lead", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: [id],
            sessionIds: lead?.sessionId ? [lead.sessionId] : [],
          }),
        });
      } catch (e) {
        console.warn("Delete server warning:", e);
      }
      deleteLead(id);
      router.push("/admin/crm");
    }
  };

  const handleSendAccountWa = () => {
    const password = form.accountPassword || lead?.accountPassword || "Estimator2026!";

    // Pastikan user & password tersinkron ke Supabase Auth
    if (lead.email && lead.email.includes("@")) {
      fetch("/api/crm/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lead.email.trim(),
          password: password.trim(),
          name: lead.name?.trim(),
          phone: lead.phone,
          planTier: lead.projectType?.toLowerCase().includes("pro") ? "pro" : "standard",
        }),
      }).catch((e) => console.warn("Provisioning error:", e));
    }

    const msg = `Halo Kak ${lead.name}! 🙌
Terima kasih telah memesan ${lead.projectType || "Monefyi Estimator"}.

Berikut adalah data akses login akun Estimator Kakak:
👤 *Nama*: ${lead.name}
📧 *Email / User*: ${lead.email || "-"}
🔑 *Password*: ${password}
🌐 *Link Login*: https://estimator.monefyi.com/app/estimator

💡 *Panduan Akses:*
1. Buka tautan di atas melalui browser HP atau Laptop Anda.
2. Masukkan Email dan Password di atas.
3. Setelah masuk, Kakak bisa langsung membuat estimasi RAB Proyek otomatis & mengubah kata sandi di menu profil.

Jika ada pertanyaan atau butuh bantuan teknis, tim kami siap membantu melalui chat ini ya Kak. Selamat berkarya! 🚀`;

    openWhatsApp(lead.phone, msg);

    addActivity(id, {
      type: "whatsapp",
      content: `Kirim nama & password akun (${password}) via WhatsApp ke ${lead.phone}`,
      timestamp: new Date().toISOString(),
      by: "Admin",
    });
  };

  const handleCopyPassword = (pwd: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(pwd);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex-wrap gap-4">
        <Link
          href="/admin/crm"
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold text-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          BACK TO PIPELINE
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={fetchStats}
            disabled={loadingStats}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            title="Refresh data keaktifan aplikasi"
          >
            <RefreshCw className={cn("w-4 h-4 text-slate-600", loadingStats && "animate-spin")} />
            <span>{loadingStats ? "MEMUAT..." : "CEK STATS"}</span>
          </button>
          <button
            onClick={handleSendAccountWa}
            className="flex items-center gap-2 bg-gradient-to-r from-[#065f46] to-emerald-700 hover:from-emerald-800 hover:to-emerald-900 text-white rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-black shadow-md shadow-emerald-900/15 transition-all active:scale-95 cursor-pointer"
            title="Kirim nama dan password akun langsung via WhatsApp"
          >
            <Key className="w-4 h-4 text-amber-300" />
            <span>KIRIM AKUN & PW (WA)</span>
          </button>
          <button
            onClick={() => openWhatsApp(lead.phone, `Halo Kak ${lead.name}, salam dari tim Monefyi Estimator! 🙌`)}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold hover:bg-emerald-100 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>CHAT WA</span>
          </button>
          {editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-2.5 rounded-2xl text-slate-600 text-sm font-bold hover:bg-slate-100 transition-all"
              >
                BATAL
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 text-white rounded-2xl px-6 py-2.5 text-sm font-bold shadow-premium hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? "MENYIMPAN..." : "SAVE & SYNC"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-slate-900 text-white rounded-2xl px-6 py-2.5 text-sm font-bold hover:bg-slate-800 transition-all"
            >
              EDIT DATA & PASS
            </button>
          )}
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 font-bold text-sm shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Profile Header */}
      <div className="bg-slate-900 text-white rounded-[40px] p-8 md:p-12 mb-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="w-32 h-32 bg-emerald-500 rounded-[32px] flex items-center justify-center text-5xl font-black shadow-glow border-4 border-white/10">
            {lead.name[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest", LEAD_STATUS_COLORS[lead.status])}>
                {LEAD_STATUS_LABELS[lead.status]}
              </span>
              <span className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border",
                (form.planTier || lead.planTier) === "pro"
                  ? "bg-amber-400 text-slate-950 border-amber-300"
                  : (form.planTier || lead.planTier) === "free"
                  ? "bg-slate-800 text-slate-300 border-slate-700"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              )}>
                PAKET {((form.planTier || lead.planTier) || "STANDARD").toUpperCase()}
              </span>
              <span className="bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-slate-300 border border-white/5">
                ID: #{lead.id.slice(-5)}
              </span>
              <span className="bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-slate-300 border border-white/5 uppercase tracking-widest">
                Source: {LEAD_SOURCE_LABELS[lead.source]}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-2">{lead.name}</h1>
            <p className="text-xl text-emerald-400 font-bold mb-6 flex items-center gap-2">
              <Hash className="w-5 h-5" />
              {lead.projectType || "Monefyi Estimator"}
            </p>
            
            <div className="flex flex-wrap gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-200">{lead.email || "No Email"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-200">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-200">{lead.city || "No Location"}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-200">{lead.estimatedValue ? formatCurrency(lead.estimatedValue) : "No Estimate"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Details & In-App Activity Stats */}
        <div className="lg:col-span-2 space-y-8">

          {/* PANEL STATISTIK KEAKTIFAN PENGGUNA (IN-APP USAGE) */}
          <div className="bg-slate-900 text-white rounded-[32px] p-7 md:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <span>STATISTIK KEAKTIFAN PENGGUNA</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      LIVE IN-APP
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    {stats?.orgName ? `Workspace: ${stats.orgName}` : "Pantau seberapa aktif user menggunakan aplikasi estimator"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchStats}
                disabled={loadingStats}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loadingStats && "animate-spin text-emerald-400")} />
                <span>{loadingStats ? "Memuat..." : "Refresh Stats"}</span>
              </button>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-850/80 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimasi</span>
                  <Layers className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {loadingStats ? "..." : (stats?.estimationsCount ?? 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">Estimasi dibuat</div>
              </div>

              <div className="bg-slate-850/80 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proyek</span>
                  <Sparkles className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {loadingStats ? "..." : (stats?.projectsCount ?? 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">Proyek aktif</div>
              </div>

              <div className="bg-slate-850/80 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Nilai</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-lg font-black text-emerald-400 truncate" title={stats?.totalEstimationValue ? formatCurrency(stats.totalEstimationValue) : "Rp 0"}>
                  {loadingStats ? "..." : (stats?.totalEstimationValue ? formatCurrency(stats.totalEstimationValue) : "Rp 0")}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">Omset estimasi</div>
              </div>

              <div className="bg-slate-850/80 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Login Terakhir</span>
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xs font-bold text-white leading-tight">
                  {loadingStats
                    ? "..."
                    : stats?.lastSignIn
                    ? formatRelativeTime(stats.lastSignIn)
                    : stats?.userCreatedAt
                    ? "Terdaftar"
                    : "Belum login"}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 truncate">
                  {stats?.lastSignIn ? new Date(stats.lastSignIn).toLocaleDateString("id-ID") : "Belum ada aktivitas"}
                </div>
              </div>
            </div>

            {/* Tim & Kolaborator dalam 1 Project */}
            {stats?.orgMembers && stats.orgMembers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-850">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300">
                      Akun Tim & Kolaborasi ({stats.orgMembers.length} Akun dalam 1 Proyek/Workspace):
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {stats.orgMembers.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="truncate mr-2">
                        <div className="font-bold text-slate-200 truncate">{m.name || m.email || "Anggota Tim"}</div>
                        <div className="text-[11px] text-slate-400 truncate">{m.email || m.phone || "-"}</div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0",
                        m.role === "owner" ? "bg-amber-400/20 text-amber-300 border border-amber-400/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      )}>
                        {m.role || "member"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estimasi Terbaru */}
            {stats?.recentEstimations && stats.recentEstimations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-850">
                <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>Daftar Estimasi Terbaru Dibuat Pengguna:</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {stats.recentEstimations.map((est: any) => (
                    <div
                      key={est.id}
                      className="bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-850 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                    >
                      <div className="truncate mr-3">
                        <span className="font-bold text-slate-200">{est.title || "Estimasi Proyek"}</span>
                        {est.client_name && <span className="text-slate-400 text-[11px]"> • Klien: {est.client_name}</span>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-emerald-400">{formatCurrency(est.grand_total || 0)}</div>
                        <div className="text-[10px] text-slate-400">{formatRelativeTime(est.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info Card / EDIT CLIENT DETAILS */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative group overflow-hidden">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                CLIENT & ACCOUNT DETAILS
              </h2>
              {editing && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  Mode Pengeditan Aktif (Auto-Sync Supabase Auth)
                </span>
              )}
            </div>

            {editing ? (
              <div className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Nama */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                      Nama Pelanggan
                    </label>
                    <input
                      value={form.name || ""}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                      Nomor WhatsApp
                    </label>
                    <input
                      value={form.phone || ""}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="08xxxxxxxx"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Email Login (Sync Supabase Auth) */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Email Login (Supabase Auth)</span>
                    </label>
                    <input
                      type="email"
                      value={form.email || ""}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="user@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Perubahan email otomatis mengupdate akun login user di Supabase Auth.
                    </p>
                  </div>

                  {/* Password Akun (Sync Supabase Auth) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Password Akun</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, accountPassword: "Estimator2026!" })}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md"
                      >
                        Set: Estimator2026!
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.accountPassword || ""}
                        onChange={(e) => setForm({ ...form, accountPassword: e.target.value })}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 pr-20 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                          title={showPassword ? "Sembunyikan" : "Tampilkan"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(form.accountPassword || "")}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                          title="Copy Password"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {copiedPassword ? "✅ Tersalin!" : "Password baru langsung aktif di Supabase Auth & bisa dipakai login."}
                    </p>
                  </div>

                  {/* Paket Akun */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span>Paket Akses Pengguna</span>
                    </label>
                    <select
                      value={form.planTier || "standard"}
                      onChange={(e) => setForm({ ...form, planTier: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      <option value="pro">⭐ PRO (Akses Lengkap + Fitur Pro)</option>
                      <option value="standard">Standard (Paket Normal Rp93.000)</option>
                      <option value="free">Free Trial (Akses Terbatas)</option>
                    </select>
                  </div>

                  {/* Status Pipeline */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                      Status Pipeline CRM
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    >
                      {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nilai Transaksi / Estimasi */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                      Nilai Transaksi (IDR)
                    </label>
                    <input
                      type="number"
                      value={form.estimatedValue || form.amount || ""}
                      onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value), amount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* Tipe Pekerjaan / Project Type */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                      Tipe Pekerjaan / Layanan
                    </label>
                    <input
                      value={form.projectType || ""}
                      onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                      placeholder="e.g. Monefyi Estimator Pro"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                {/* Catatan Internal */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Catatan Internal Tim
                  </label>
                  <textarea
                    value={form.notes || ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    placeholder="Catatan khusus pelanggan, riwayat transaksi, atau request fitur..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-5 py-2.5 rounded-2xl text-slate-600 text-sm font-bold hover:bg-slate-100 transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Menyimpan ke Supabase..." : "Simpan Perubahan"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                {/* View Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email & Password Block */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">EMAIL LOGIN</p>
                          <p className="text-sm font-black text-slate-900">{lead.email || "Belum ada email"}</p>
                        </div>
                      </div>
                      {lead.email && (
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(lead.email || "")}
                          className="text-xs text-slate-400 hover:text-slate-600 p-1"
                          title="Copy Email"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-start justify-between pt-3 border-t border-slate-200/60">
                      <div className="flex items-center gap-2.5">
                        <Key className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PASSWORD AKUN</p>
                          <p className="text-sm font-mono font-bold text-slate-900">
                            {showPassword ? (form.accountPassword || lead.accountPassword || "Estimator2026!") : "••••••••••••"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(form.accountPassword || lead.accountPassword || "Estimator2026!")}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                          title="Copy Password"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phone & Paket Block */}
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">WHATSAPP</p>
                          <p className="text-sm font-black text-slate-900">{lead.phone}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openWhatsApp(lead.phone, `Halo Kak ${lead.name} 👋`)}
                        className="text-xs text-emerald-600 font-bold hover:underline"
                      >
                        Chat
                      </button>
                    </div>

                    <div className="flex items-start justify-between pt-3 border-t border-slate-200/60">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">PAKET AKSES</p>
                          <span className={cn(
                            "inline-block px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider mt-0.5",
                            (form.planTier || lead.planTier) === "pro"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          )}>
                            {(form.planTier || lead.planTier || "STANDARD").toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                  <div className="space-y-6">
                    {[
                      { icon: MapPin, label: "LOCATION / KOTA", value: lead.city || "Not Specified", color: "text-rose-500" },
                      { icon: Hash, label: "TIPE PEKERJAAN", value: lead.projectType || "Estimator", color: "text-teal-500" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="flex items-start gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100", color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                          <p className="text-sm font-black text-slate-900">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6">
                    {[
                      { icon: DollarSign, label: "BUDGET / TRANSAKSI", value: lead.estimatedValue ? formatCurrency(lead.estimatedValue) : (lead.amount ? formatCurrency(lead.amount) : "No Quote"), color: "text-emerald-500" },
                      { icon: ExternalLink, label: "ACQUISITION CHANNEL", value: LEAD_SOURCE_LABELS[lead.source], color: "text-amber-500" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <div key={label} className="flex items-start gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-100", color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                          <p className="text-sm font-black text-slate-900">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {lead.notes && (
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">INTERNAL NOTES</p>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{lead.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activities */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                ACTIVITY FEED
            </h2>

            {/* Add Activity */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10 bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="note">Note</option>
                <option value="call">Phone Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="meeting">On-site Meeting</option>
              </select>
              <input
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
                placeholder="Log a new activity or progress update..."
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                onClick={handleAddActivity}
                className="bg-slate-900 text-white rounded-2xl px-6 py-3 font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                POST
              </button>
            </div>

            {/* Activity List */}
            <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {[...lead.activities].reverse().map((activity) => (
                <div key={activity.id} className="relative">
                  <div className={cn(
                    "absolute -left-8 w-7 h-7 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10",
                    activity.type === "status_change" ? "bg-amber-400" : "bg-emerald-500"
                  )}>
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                  <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-50 hover:bg-white hover:border-slate-100 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activity.type.replace("_", " ")}</p>
                      <p className="text-[10px] font-bold text-slate-400 italic">{formatRelativeTime(activity.timestamp)}</p>
                    </div>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{activity.content}</p>
                  </div>
                </div>
              ))}
              {lead.activities.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No activities logged yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right - Status */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4">Update Status</h3>
            <div className="space-y-2">
              {PIPELINE_COLUMNS.map((status) => (
                <button
                  key={status}
                  onClick={() => updateLeadStatus(id, status)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border",
                    lead.status === status
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-600"
                  )}
                >
                  {LEAD_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">Survei</h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={(form as typeof lead).surveyDate || ""}
                    onChange={(e) => setForm({ ...form, surveyDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Jam</label>
                  <input
                    type="time"
                    value={(form as typeof lead).surveyTime || ""}
                    onChange={(e) => setForm({ ...form, surveyTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm">
                {lead.surveyDate ? (
                  <>
                    <p className="text-slate-900 font-semibold">{formatDate(lead.surveyDate)}</p>
                    {lead.surveyTime && <p className="text-slate-500">{lead.surveyTime}</p>}
                  </>
                ) : (
                  <p className="text-slate-400">Belum dijadwalkan</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="w-full py-2.5 text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 rounded-xl hover:bg-red-50 transition-all"
          >
            Hapus Lead
          </button>
        </div>
      </div>
    </div>
  );
}
