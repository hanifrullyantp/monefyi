"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useLeadsStore } from "@/lib/store/leadsStore";
import { useContentStore } from "@/lib/store/contentStore";
import {
  Users,
  CheckCircle2,
  Plus,
  Search,
  MessageCircle,
  Wallet,
  Clock,
  Sparkles,
  Phone,
  Mail,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  DollarSign,
  BarChart3,
  X,
  FileText,
  ShieldAlert,
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
import { MayarPayoutGuideModal } from "@/components/admin/MayarPayoutGuideModal";
import { isTestAdminLead } from "@/lib/config/admin";
import { cn } from "@/lib/utils/cn";

// Filter Waktu Preset
type TimeFilterPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "maximum"
  | "custom";

// Template Pesan WA Cepat
const WA_TEMPLATES = [
  {
    id: "followup_pending",
    label: "Follow-up Pembayaran",
    desc: "Tanyakan kendala transaksi & kirim link Mayar",
    text: (name: string, amt?: number) =>
      `Halo Kak ${name}, terima kasih telah memesan Estimator Monefyi. Kami melihat tagihan sebesar ${
        amt ? formatCurrency(amt) : "pesanan Anda"
      } masih menunggu pembayaran. Apakah ada kendala pada metode pembayaran atau ada yang bisa kami bantu?`,
  },
  {
    id: "diskon_khusus",
    label: "Penawaran Diskon Spesial",
    desc: "Beri voucher potongan agar segera deal",
    text: (name: string) =>
      `Halo Kak ${name}! Khusus hari ini kami sediakan potongan diskon spesial untuk aktivasi akun Estimator Monefyi Anda. Boleh kami bantu proseskan aktivasi hari ini?`,
  },
  {
    id: "konfirmasi_akses",
    label: "Konfirmasi Akses Akun",
    desc: "Kirim panduan login & data akun estimator",
    text: (name: string) =>
      `Halo Kak ${name}, selamat! Pembayaran Estimator Monefyi Anda telah kami terima dengan sukses. Akun Anda sudah aktif dan siap digunakan untuk menyusun RAB & estimasi proyek. Silakan login di https://monefyi.com/login. Jika butuh panduan, tim kami siap membantu.`,
  },
  {
    id: "bantuan_kendala",
    label: "Bantuan Kendala Teknis",
    desc: "Cek kendala pengisian data / RAB",
    text: (name: string) =>
      `Halo Kak ${name}, ini tim support Monefyi. Apakah ada pertanyaan atau kendala teknis saat mencoba fitur Estimator? Tim kami siap mendampingi Kakak.`,
  },
  {
    id: "chat_manual",
    label: "Chat Manual Langsung",
    desc: "Buka WhatsApp kosong tanpa template",
    text: () => "",
  },
];

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
      source: form.source,
      status: form.status,
      projectType: form.projectType,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : 0,
      notes: form.notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Tambah Lead Baru</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Input prospek atau pembeli manual</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Pelanggan *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Contoh: Pak Budi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-emerald-500 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nomor WhatsApp / HP *
            </label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08123456789 atau 628..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-emerald-500 outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nama@email.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-emerald-500 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                placeholder="298000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-emerald-500 outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Awal</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-emerald-500 outline-none font-medium"
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
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
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

  // State CRM Dashboard
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [timePreset, setTimePreset] = useState<TimeFilterPreset>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showTestAdminLeads, setShowTestAdminLeads] = useState(false); // Mata: default hide test admin
  const [activeWaDropdownLeadId, setActiveWaDropdownLeadId] = useState<string | null>(null);

  // Mayar Stats Realtime
  const [mayarStats, setMayarStats] = useState({
    activeBalance: 0,
    pendingBalance: 0,
    lifetimeRevenue: 0,
    todayRevenue: 0,
    totalPaidOrders: 0,
    pendingRevenue: 0,
    isMayarConnected: false,
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
          activeBalance: Number(data.activeBalance ?? 0),
          pendingBalance: Number(data.pendingBalance ?? 0),
          lifetimeRevenue: Number(data.lifetimeRevenue ?? 0),
          todayRevenue: Number(data.todayRevenue ?? 0),
          totalPaidOrders: Number(data.totalPaidOrders ?? 0),
          pendingRevenue: Number(data.pendingRevenue ?? 0),
          isMayarConnected: !!data.isMayarConnected,
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
              name:
                remote.name && remote.name !== "Lead Checkout (Draft)" && remote.name !== "Anonim"
                  ? remote.name
                  : exists.name,
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
              emails:
                Array.isArray(remote.emails) && remote.emails.length > 0
                  ? remote.emails
                  : exists.emails,
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

  const handleOpenWaWithTemplate = (lead: Lead, templateText: string) => {
    setActiveWaDropdownLeadId(null);
    if (!lead.phone) return;
    const cleanPhone = formatPhoneForWA(lead.phone);
    const textParam = templateText ? `?text=${encodeURIComponent(templateText)}` : "";
    window.open(`https://wa.me/${cleanPhone}${textParam}`, "_blank");
  };

  // Cek apakah tanggal adalah hari ini
  const isDateToday = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  // Helper Rentang Waktu
  const isInTimePreset = (dateStr?: string, preset: TimeFilterPreset = timePreset): boolean => {
    if (!dateStr) return false;
    if (preset === "maximum") return true;

    const target = new Date(dateStr).getTime();
    const now = new Date();

    if (preset === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return target >= start;
    }

    if (preset === "yesterday") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return target >= start && target < end;
    }

    if (preset === "this_week") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
      return target >= start;
    }

    if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return target >= start;
    }

    if (preset === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return target >= start && target < end;
    }

    if (preset === "custom" && customStartDate) {
      const start = new Date(customStartDate).getTime();
      const end = customEndDate
        ? new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000
        : now.getTime();
      return target >= start && target <= end;
    }

    return true;
  };

  // Bersihkan lead: abaikan super admin / test leads dari statistik & tabel default
  const validRealLeads = useMemo(() => {
    return leads.filter((l) => {
      if (showTestAdminLeads) return true;
      return !isTestAdminLead({
        email: l.email,
        name: l.name,
        phone: l.phone,
        tags: l.tags,
      });
    });
  }, [leads, showTestAdminLeads]);

  // Statistik Realtime Berdasarkan Filter Waktu & Leads Riil
  const leadsInSelectedPeriod = useMemo(() => {
    return validRealLeads.filter((l) => isInTimePreset(l.createdAt, timePreset));
  }, [validRealLeads, timePreset, customStartDate, customEndDate]);

  // Big Numbers
  const leadsToday = useMemo(() => {
    return validRealLeads.filter((l) => isDateToday(l.createdAt));
  }, [validRealLeads]);

  const paidToday = leadsToday.filter((l) => l.status === "won");
  const saldoHariIni = paidToday.reduce(
    (sum, l) => sum + (l.amount || l.estimatedValue || 0),
    0
  );

  const totalWonLeadsInPeriod = leadsInSelectedPeriod.filter((l) => l.status === "won").length;
  const totalLeadsInPeriod = leadsInSelectedPeriod.length;

  const pendingLeadsInPeriod = leadsInSelectedPeriod.filter(
    (l) => l.status === "pending_payment" || l.status === "abandoned_checkout"
  );
  const pendingAmountInPeriod = pendingLeadsInPeriod.reduce(
    (sum, l) => sum + (l.amount || l.estimatedValue || 0),
    0
  );

  const totalSaldoMayarLive = mayarStats.activeBalance;
  const totalSaldoKumulatif = mayarStats.lifetimeRevenue;

  // Filtered Leads untuk Table
  const filteredTableLeads = useMemo(() => {
    return validRealLeads
      .filter((lead) => {
        // Filter Status
        if (statusFilter !== "all" && lead.status !== statusFilter) return false;
        // Filter Waktu
        if (!isInTimePreset(lead.createdAt, timePreset)) return false;
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            lead.name?.toLowerCase().includes(q) ||
            lead.phone?.toLowerCase().includes(q) ||
            lead.email?.toLowerCase().includes(q) ||
            lead.id?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [validRealLeads, statusFilter, timePreset, search, customStartDate, customEndDate]);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-5">
      {/* CARD 1: TOP HERO CARD SESUAI DESAIN INSTRUKSI USER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-5 sm:p-7 border border-slate-700/60 shadow-xl relative overflow-hidden transition-all">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Baris Atas Hero: Title & Dropdown Filter Waktu */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <h2 className="text-sm font-extrabold text-emerald-400 uppercase tracking-widest leading-none">
                Monefyi Executive CRM
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring Penjualan Real-Time &amp; Pembayaran Mayar
              </p>
            </div>
          </div>

          {/* Atas Kanan: Dropdown Filter Waktu */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                value={timePreset}
                onChange={(e) => setTimePreset(e.target.value as TimeFilterPreset)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
              >
                <option value="today" className="bg-slate-900 text-white">Hari Ini (Default)</option>
                <option value="yesterday" className="bg-slate-900 text-white">Kemarin</option>
                <option value="this_week" className="bg-slate-900 text-white">Minggu Ini</option>
                <option value="this_month" className="bg-slate-900 text-white">Bulan Ini</option>
                <option value="last_month" className="bg-slate-900 text-white">Bulan Lalu</option>
                <option value="maximum" className="bg-slate-900 text-white">Maksimum (Semua)</option>
                <option value="custom" className="bg-slate-900 text-white">Rentang Waktu...</option>
              </select>
            </div>

            {timePreset === "custom" && (
              <div className="flex items-center gap-1 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                />
                <span>-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bagian Big Numbers di Card 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-5 relative z-10">
          {/* Big Number 1: Saldo Hari Ini / Total Saldo */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Saldo Hari Ini / Total Saldo
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {formatCurrency(saldoHariIni || mayarStats.todayRevenue)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                / {formatCurrency(totalSaldoMayarLive || totalSaldoKumulatif)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Live Saldo Mayar: <strong className="text-white">{formatCurrency(totalSaldoMayarLive)}</strong>
            </p>
          </div>

          {/* Big Number 2: Berhasil Bayar / Total Leads */}
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 backdrop-blur-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Berhasil Bayar / Total Leads
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {totalWonLeadsInPeriod}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-400">
                / {totalLeadsInPeriod} Leads
              </span>
              {totalLeadsInPeriod > 0 && (
                <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  {((totalWonLeadsInPeriod / totalLeadsInPeriod) * 100).toFixed(0)}% Deal
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Periode: {timePreset === "today" ? "Hari Ini" : timePreset}
            </p>
          </div>

          {/* Big Number 3: Warning Menunggu Bayar */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 backdrop-blur-xs md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1.5 text-amber-400 mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Warning Menunggu Bayar
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400">
              {pendingLeadsInPeriod.length} Tagihan
            </div>
            <p className="text-xs font-semibold text-amber-200/90 mt-1">
              Potensi Omset: {formatCurrency(pendingAmountInPeriod || mayarStats.pendingRevenue)}
            </p>
          </div>
        </div>

        {/* 7 Action Icons di Card 1 (Refresh, + Lead, Dompet, Mata, CRM, Ringkasan, Template WA) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-wrap relative z-10">
          {/* 1. Refresh */}
          <button
            type="button"
            onClick={() => {
              syncServerLeads(true);
              fetchMayarStats();
            }}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Refresh database & Mayar"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-400", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* 2. + Lead Baru */}
          <button
            type="button"
            onClick={() => setShowAddLeadModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
            title="Input lead baru manual"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lead Baru</span>
          </button>

          {/* 3. Dompet (Payout) */}
          <button
            type="button"
            onClick={() => setShowPayoutModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-xs active:scale-95"
            title="Buka panduan tarik saldo Mayar"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Dompet Mayar</span>
          </button>

          {/* 4. Mata (Toggle Test Super Admin Leads) */}
          <button
            type="button"
            onClick={() => setShowTestAdminLeads(!showTestAdminLeads)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-xs active:scale-95",
              showTestAdminLeads
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700"
            )}
            title={showTestAdminLeads ? "Sembunyikan test super admin" : "Tampilkan test super admin"}
          >
            {showTestAdminLeads ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              {showTestAdminLeads ? "Test Admin: ON" : "Test Admin: OFF"}
            </span>
          </button>

          {/* 5. CRM */}
          <Link
            href="/admin/crm"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700"
            title="Buka Halaman CRM Penuh"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">CRM Penuh</span>
          </Link>

          {/* 6. Ringkasan */}
          <Link
            href="/admin/analytics"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700"
            title="Buka Ringkasan Analytics"
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Ringkasan</span>
          </Link>

          {/* 7. Template WA */}
          <Link
            href="/admin/crm-template"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
            title="Atur Template WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Template WA</span>
          </Link>
        </div>
      </div>

      {/* CARD 2: 4 KARTU METRIK SEBARIS (TOTAL LEAD, BAYAR, MENUNGGU, SALDO) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Lead */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Lead
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalLeadsInPeriod}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            Periode: {timePreset === "today" ? "Hari ini" : timePreset}
          </p>
        </div>

        {/* Bayar (Berhasil Bayar) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Bayar (Deal)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {totalWonLeadsInPeriod}
          </div>
          <p className="text-[10px] text-emerald-600/80 font-bold mt-0.5 truncate">
            {formatCurrency(
              leadsInSelectedPeriod
                .filter((l) => l.status === "won")
                .reduce((s, l) => s + (l.amount || l.estimatedValue || 0), 0)
            )}
          </p>
        </div>

        {/* Menunggu (Pending / Abandoned) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Menunggu Bayar
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {pendingLeadsInPeriod.length}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {formatCurrency(pendingAmountInPeriod)}
          </p>
        </div>

        {/* Saldo (Mayar Active Balance) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saldo Mayar
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white truncate">
            {formatCurrency(totalSaldoMayarLive)}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
            <span>T+1: {formatCurrency(mayarStats.pendingBalance)}</span>
            <button
              type="button"
              onClick={() => setShowPayoutModal(true)}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Tarik
            </button>
          </div>
        </div>
      </div>

      {/* DASHBOARD TABLE: SEMUA DATA MUNCUL DENGAN HIGHLIGHT HARI INI & BORDER NEON BERHASIL BAYAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs transition-colors">
        {/* Table Filter & Search Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Data Transaksi &amp; Leads</span>
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredTableLeads.length} Baris
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, WA, email..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:border-emerald-500 outline-none text-slate-900 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { key: "all", label: "Semua" },
                { key: "won", label: "Berhasil Bayar" },
                { key: "pending_payment", label: "Menunggu" },
                { key: "abandoned_checkout", label: "Abandoned" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key as LeadStatus | "all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer",
                    statusFilter === item.key
                      ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List of Leads / Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2 sm:p-3 space-y-2">
          {filteredTableLeads.map((lead) => {
            const isToday = isDateToday(lead.createdAt);
            const isWon = lead.status === "won";
            const isDropdownOpen = activeWaDropdownLeadId === lead.id;

            return (
              <div
                key={lead.id}
                className={cn(
                  "p-3.5 sm:p-4 rounded-2xl transition-all relative flex flex-col md:flex-row md:items-center justify-between gap-3",
                  // 4. Highlight Khusus Berhasil Bayar: BORDER BERCAHAYA NEON
                  isWon
                    ? "ring-2 ring-emerald-400 dark:ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.35)] border-emerald-400/80 bg-emerald-50/40 dark:bg-emerald-950/20"
                    : "border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-850",
                  // Highlight Tambahan jika Transaksi Masuk Hari Ini
                  isToday && !isWon && "border-l-4 border-l-blue-500 bg-blue-50/20 dark:bg-blue-950/10"
                )}
              >
                {/* Identitas Lead */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs",
                      isWon
                        ? "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-emerald-500/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    {lead.name ? lead.name[0].toUpperCase() : "U"}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/crm/${lead.id}`}
                        className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                      >
                        {lead.name}
                      </Link>

                      {/* Badge Hari Ini */}
                      {isToday && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 animate-pulse">
                          Hari Ini
                        </span>
                      )}

                      {/* Status Badge */}
                      <span
                        className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                          isWon
                            ? "bg-emerald-500 text-slate-950 shadow-xs font-black"
                            : LEAD_STATUS_COLORS[lead.status] || "bg-slate-100 text-slate-700"
                        )}
                      >
                        {LEAD_STATUS_LABELS[lead.status] || lead.status}
                      </span>

                      {/* Plan Tier / Amount */}
                      {(lead.amount || lead.estimatedValue) ? (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          {formatCurrency(lead.amount || lead.estimatedValue || 0)}
                        </span>
                      ) : null}

                      {lead.planTier && (
                        <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                          {lead.planTier}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {lead.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{lead.phone}</span>
                        </span>
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

                {/* Sisi Kanan: Tombol Chat WA dengan Dropdown Template Pesan */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 relative">
                  {/* TOMBOL CHAT WA DENGAN DROPDOWN TEMPLATE */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveWaDropdownLeadId(isDropdownOpen ? null : lead.id)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                      title="Klik untuk memilih template chat WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Chat WA</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isDropdownOpen && "rotate-180")} />
                    </button>

                    {/* DROPDOWN MENU PILIHAN TEMPLATE PESAN WA */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                        <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                          Pilih Template Chat ke {lead.name}
                        </div>

                        {WA_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() =>
                              handleOpenWaWithTemplate(
                                lead,
                                tpl.text(lead.name, lead.amount || lead.estimatedValue)
                              )
                            }
                            className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors flex flex-col group cursor-pointer"
                          >
                            <span className="font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {tpl.label}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {tpl.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="won">Won (Deal)</option>
                    <option value="pending_payment">Pending</option>
                    <option value="abandoned_checkout">Abandoned</option>
                    <option value="new">Lead Baru</option>
                    <option value="lost">Lost</option>
                  </select>

                  <Link
                    href={`/admin/crm/${lead.id}`}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Buka detail lead"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}

          {filteredTableLeads.length === 0 && (
            <div className="p-10 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Tidak ada data pada periode ini
              </p>
              <p className="text-xs text-slate-400">
                Coba ubah filter waktu ke "Maksimum" atau ubah status pencarian.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
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
