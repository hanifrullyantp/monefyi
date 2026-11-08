"use client";

import { useState, useMemo, useEffect } from "react";
import { useLeadsStore } from "@/lib/store/leadsStore";
import { useContentStore } from "@/lib/store/contentStore";
import {
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Save,
  Eye,
  Plus,
  Search,
  MessageCircle,
  ExternalLink,
  Wallet,
  Clock,
  Sparkles,
  Phone,
  Mail,
  ChevronRight,
  Filter,
  Megaphone,
  Smartphone,
  Download,
  AlertCircle,
  X,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatRelativeTime } from "@/lib/utils/format";
import {
  Lead,
  LeadStatus,
  LeadSource,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
} from "@/lib/types/leads";
import { getLeadPixelStage, META_PIXEL_ID } from "@/lib/analytics/metaPixel";
import { MayarPayoutGuideModal } from "@/components/admin/MayarPayoutGuideModal";
import { cn } from "@/lib/utils/cn";

// Modal Cepat: Tambah Lead Baru
function QuickAddLeadModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "activities">) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    source: "checkout" as LeadSource,
    status: "new" as LeadStatus,
    projectType: "Estimator Standard",
    estimatedValue: "298000",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;

    onAdd({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      city: form.city.trim() || undefined,
      source: form.source,
      status: form.status,
      projectType: form.projectType,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : 0,
      notes: form.notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-900 animate-slide-up">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Tambah Lead Baru</h3>
              <p className="text-xs text-slate-500">Input prospek atau pembeli manual</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nama Pelanggan / Klien *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Pak Budi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Nomor WhatsApp / HP *</label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08123456789 atau 628..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-xs font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                placeholder="298000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-xs font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Status Awal</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none text-xs font-medium bg-white"
            >
              <option value="won">Berhasil Bayar (Won)</option>
              <option value="pending_payment">Menunggu Pembayaran</option>
              <option value="new">Lead Baru</option>
              <option value="contacted">Sudah Dihubungi</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md active:scale-95"
            >
              Simpan Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { leads, addLead, updateLeadStatus } = useLeadsStore();
  const { content, lastSaved, isDirty, isSaving, publishContent } = useContentStore();

  // State CRM Dashboard
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"crm" | "website">("crm");

  // Mayar Stats Realtime
  const [mayarStats, setMayarStats] = useState({
    activeBalance: 0,
    pendingBalance: 0,
    lifetimeRevenue: 0,
    paidTransactionsCount: 0,
    isConfigured: false,
    loading: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchMayarStats = async () => {
    try {
      setMayarStats((prev) => ({ ...prev, loading: true }));
      const res = await fetch("/api/crm/mayar-stats");
      if (res.ok) {
        const data = await res.json();
        setMayarStats({
          activeBalance: data.activeBalance || 0,
          pendingBalance: data.pendingBalance || 0,
          lifetimeRevenue: data.lifetimeRevenue || 0,
          paidTransactionsCount: data.paidTransactionsCount || 0,
          isConfigured: !!data.isConfigured,
          loading: false,
        });
      }
    } catch {
      setMayarStats((prev) => ({ ...prev, loading: false }));
    }
  };

  const syncServerLeads = async (verifyMayar: boolean = false) => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/crm/lead${verifyMayar ? "?verifyMayar=true" : ""}`);
      const data = await res.json();
      if (data?.ok && Array.isArray(data.leads)) {
        const store = useLeadsStore.getState();
        data.leads.forEach((remote: any) => {
          const exists = store.leads.find(
            (l) =>
              (remote.id && l.id === remote.id) ||
              (remote.paymentId && l.paymentId === remote.paymentId) ||
              (remote.sessionId && l.sessionId === remote.sessionId)
          );

          if (!exists) {
            store.addLead({
              id: remote.id,
              name: remote.name || "Lead Checkout",
              phone: remote.phone || "-",
              email: remote.email || undefined,
              projectType: `Estimator ${(remote.planTier || "standard").toUpperCase()}`,
              source: "checkout",
              status: remote.status || "abandoned_checkout",
              sessionId: remote.sessionId,
              checkoutStep: remote.checkoutStep,
              planTier: remote.planTier,
              bumpTaken: remote.bumpTaken,
              paymentMethod: remote.paymentMethod,
              amount: remote.amount,
              estimatedValue: remote.amount ?? remote.estimatedValue,
              paymentId: remote.paymentId,
              emails: Array.isArray(remote.emails) ? remote.emails : [],
              createdAt: remote.createdAt,
              updatedAt: remote.updatedAt,
            });
          } else {
            store.updateLead(exists.id, {
              name: remote.name && remote.name !== "Lead Checkout (Draft)" && remote.name !== "Anonim" ? remote.name : exists.name,
              phone: remote.phone && remote.phone !== "-" ? remote.phone : exists.phone,
              email: remote.email || exists.email,
              status: remote.status || exists.status,
              bumpTaken: remote.bumpTaken ?? exists.bumpTaken,
              paymentMethod: remote.paymentMethod || exists.paymentMethod,
              amount: remote.amount ?? exists.amount,
              estimatedValue: remote.amount ?? exists.estimatedValue ?? exists.amount,
              paymentId: remote.paymentId || exists.paymentId,
              checkoutStep: remote.checkoutStep ?? exists.checkoutStep,
              planTier: remote.planTier || exists.planTier,
              emails: Array.isArray(remote.emails) && remote.emails.length > 0 ? remote.emails : exists.emails,
            });
          }
        });
      }
    } catch (err) {
      console.warn("Could not sync server leads in dashboard:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    useLeadsStore.getState().cleanDuplicateIds();
    syncServerLeads(true);
    fetchMayarStats();
  }, []);

  // Format WhatsApp Link
  const formatPhoneForWA = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
    return cleaned;
  };

  // Metrics
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const pendingLeads = leads.filter((l) => l.status === "pending_payment" || l.status === "abandoned_checkout").length;
  const closingRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0";
  const totalRevenue = leads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + (l.amount || l.estimatedValue || 0), 0);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (statusFilter !== "all" && lead.status !== statusFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          lead.name?.toLowerCase().includes(q) ||
          lead.phone?.toLowerCase().includes(q) ||
          lead.email?.toLowerCase().includes(q) ||
          lead.id?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, statusFilter, search]);

  const quickLinks = [
    { href: "/admin/crm", label: "Kelola CRM Lengkap", icon: Users, desc: "Tabel, Pipeline, Export CSV" },
    { href: "/admin/marketing", label: "Marketing AI & Meta Ads", icon: Megaphone, desc: "Pixel, Conversion API, CAPI" },
    { href: "/admin/crm-template", label: "Template Pesan WA", icon: MessageCircle, desc: "Follow-up & Konfirmasi Otomatis" },
    { href: "/admin/konten", label: "Edit Visual Landing", icon: BarChart3, desc: "Kustomisasi Teks & Gambar" },
  ];

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner - Responsive & Mobile First */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 sm:p-8 border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
                Monefyi Executive CRM Hub
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-blue-400 px-2 py-0.5 rounded border border-slate-700">
                Meta Pixel: {META_PIXEL_ID} (🟢 Aktif)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              Dashboard Admin &amp; CRM
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
              Pantau leads, transaksi Mayar, dan status landing page langsung dari HP atau desktop.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                syncServerLeads(true);
                fetchMayarStats();
              }}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              title="Sinkronkan database dengan transaksi Mayar terbaru"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-400", isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Sinkron..." : "Update Live"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddLeadModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Lead Baru</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPayoutModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-emerald-400 border border-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Tarik Saldo</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all border border-slate-700"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lihat Web</span>
            </Link>

            {isDirty && (
              <button
                type="button"
                onClick={() => void publishContent()}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Menyimpan…" : "Publish"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher: CRM Utama vs Pengaturan Web */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("crm")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer",
              activeTab === "crm"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <Users className="w-4 h-4" />
            <span>CRM &amp; Transaksi (Utama)</span>
            <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-full">
              {leads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("website")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer",
              activeTab === "website"
                ? "bg-emerald-500 text-slate-950 font-black shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Ringkasan Landing &amp; Konten</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: CRM SEBAGAI DEFAULT UTAMA PALING ATAS */}
      {activeTab === "crm" && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Metrics Grid - 2 cols on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Leads */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Leads</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalLeads}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Masuk via checkout &amp; form</p>
            </div>

            {/* Deal / Pembayaran Berhasil */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Berhasil Bayar</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">{wonLeads}</p>
              <p className="text-[11px] text-emerald-700/80 font-semibold mt-1">
                {formatCurrency(totalRevenue)}
              </p>
            </div>

            {/* Menunggu Pembayaran / Abandoned */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Bayar</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600">{pendingLeads}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Butuh follow-up WA</p>
            </div>

            {/* Saldo Siap Tarik (Mayar) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saldo Mayar</span>
                <button
                  type="button"
                  onClick={fetchMayarStats}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                  title="Refresh Saldo"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", mayarStats.loading && "animate-spin text-emerald-600")} />
                </button>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                {formatCurrency(mayarStats.activeBalance)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-400">T+1: {formatCurrency(mayarStats.pendingBalance)}</span>
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(true)}
                  className="text-[10px] font-bold text-emerald-600 hover:underline"
                >
                  Tarik
                </button>
              </div>
            </div>
          </div>

          {/* CRM Leads Live Stream & Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Action Bar & Filter */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>Daftar Lead &amp; Transaksi Masuk</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik nomor untuk langsung chat WhatsApp ke pembeli.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => syncServerLeads(true)}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  title="Perbarui daftar lead dari database dan Mayar"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-600", isSyncing && "animate-spin")} />
                  <span>{isSyncing ? "Menyinkronkan..." : "Perbarui"}</span>
                </button>
                <Link
                  href="/admin/crm"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  <span>Buka CRM Penuh</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/admin/crm-template"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Template WA</span>
                </Link>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, WhatsApp, email..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0 text-xs font-bold">
                {[
                  { key: "all", label: "Semua" },
                  { key: "won", label: "Berhasil Bayar" },
                  { key: "pending_payment", label: "Menunggu Bayar" },
                  { key: "abandoned_checkout", label: "Abandoned" },
                  { key: "new", label: "Lead Baru" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatusFilter(item.key as LeadStatus | "all")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer text-xs",
                      statusFilter === item.key
                        ? "bg-slate-900 text-white shadow-sm font-black"
                        : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200/80"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List / Cards for Mobile & Responsive */}
            <div className="divide-y divide-slate-100">
              {filteredLeads.slice(0, 8).map((lead) => {
                const waUrl = lead.phone
                  ? `https://wa.me/${formatPhoneForWA(lead.phone)}?text=${encodeURIComponent(
                      `Halo ${lead.name}, terima kasih telah memesan Estimator. Apakah ada kendala dalam proses pembayaran?`
                    )}`
                  : null;

                return (
                  <div
                    key={lead.id}
                    className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left: Lead Identity */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black flex items-center justify-center flex-shrink-0 text-sm shadow-sm">
                        {lead.name ? lead.name[0].toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/crm/${lead.id}`}
                            className="font-bold text-slate-900 text-sm hover:text-emerald-600 transition-colors truncate"
                          >
                            {lead.name}
                          </Link>
                          <span
                            className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                              LEAD_STATUS_COLORS[lead.status] || "bg-slate-100 text-slate-700"
                            )}
                          >
                            {LEAD_STATUS_LABELS[lead.status] || lead.status}
                          </span>
                          {(lead.planTier || lead.projectType) && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md uppercase">
                              {lead.planTier || lead.projectType}
                            </span>
                          )}
                          {(lead.amount || lead.estimatedValue) ? (
                            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {formatCurrency(lead.amount || lead.estimatedValue || 0)}
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded border inline-flex items-center",
                              getLeadPixelStage(lead).badgeClass
                            )}
                            title={getLeadPixelStage(lead).desc}
                          >
                            Pixel: {getLeadPixelStage(lead).label}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="flex items-center gap-1 hover:text-slate-800"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{lead.phone}</span>
                            </a>
                          )}
                          {lead.email && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{lead.email}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatRelativeTime(lead.createdAt)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat WA</span>
                        </a>
                      )}

                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 outline-none cursor-pointer"
                      >
                        <option value="won">Won (Lunas)</option>
                        <option value="pending_payment">Pending</option>
                        <option value="abandoned_checkout">Abandoned</option>
                        <option value="new">New Lead</option>
                        <option value="lost">Lost</option>
                      </select>

                      <Link
                        href={`/admin/crm/${lead.id}`}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title="Buka Detail Lead"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {filteredLeads.length === 0 && (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Belum ada lead yang cocok</p>
                  <p className="text-xs text-slate-400">
                    Lead yang mengisi formulir checkout atau pembayaran Mayar otomatis muncul di sini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddLeadModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Input Lead Pertama</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer View All */}
            {filteredLeads.length > 8 && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  href="/admin/crm"
                  className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Lihat Seluruh {filteredLeads.length} Leads di Halaman CRM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: KONTEN LANDING PAGE & PENGATURAN */}
      {activeTab === "website" && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Action Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-600 flex items-center justify-center mb-3 transition-colors">
                    <link.icon className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {link.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{link.desc}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <span>Buka Editor</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>

          {/* Section Visibility Management */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h2 className="font-black text-base text-slate-900 mb-1">Status Bagian Landing Page</h2>
            <p className="text-xs text-slate-500 mb-4">
              Visibilitas section yang sedang aktif di website publik Monefyi Estimator.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(content.sectionVisibility).map(([key, visible]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <span className="font-bold text-slate-700 capitalize">{key}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full",
                      visible
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-600"
                    )}
                  >
                    {visible ? "Aktif" : "Disembunyikan"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddLeadModal && (
        <QuickAddLeadModal
          onClose={() => setShowAddLeadModal(false)}
          onAdd={(data) => addLead(data)}
        />
      )}

      {showPayoutModal && (
        <MayarPayoutGuideModal
          onClose={() => setShowPayoutModal(false)}
          activeBalance={mayarStats.activeBalance}
          pendingBalance={mayarStats.pendingBalance}
          onRefresh={fetchMayarStats}
        />
      )}
    </div>
  );
}
