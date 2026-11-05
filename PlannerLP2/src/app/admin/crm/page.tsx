"use client";
import { useState, useEffect } from "react";
import { useLeadsStore } from "@/lib/store/leadsStore";
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  LayoutList,
  LayoutGrid,
  Settings as SettingsIcon,
  Info,
  Bell,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  Lead,
  LeadStatus,
  LeadSource,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_SOURCE_LABELS,
} from "@/lib/types/leads";
import { cn } from "@/lib/utils/cn";

const PIPELINE_COLUMNS: LeadStatus[] = [
  "new",
  "abandoned_checkout",
  "pending_payment",
  "won",
  "contacted",
  "proposal_sent",
  "negotiating",
  "lost",
];

function AddLeadModal({
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
    estimatedValue: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...form,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl overflow-hidden relative border border-slate-100">
        <h3 className="text-2xl font-black text-slate-900 mb-6">Tambah Lead Manual</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nama</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">No. HP / WA</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="08xxxxxxxxxx" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="email@contoh.com" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Paket / Layanan</label>
            <input required value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Estimator Free / Standard / PRO" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all cursor-pointer">Batal</button>
            <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer">Simpan Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const { leads, addLead, deleteLead, updateLeadStatus, addActivity } = useLeadsStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "standard" | "pro">("all");
  const [view, setView] = useState<"table" | "pipeline">("table");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-sync leads dari Supabase & Server API saat mount
  const syncServerLeads = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/crm/lead");
      const data = await res.json();
      if (data?.ok && Array.isArray(data.leads)) {
        const store = useLeadsStore.getState();
        data.leads.forEach((remote: any) => {
          const exists = store.leads.find(
            (l) =>
              (remote.sessionId && l.sessionId === remote.sessionId) ||
              l.id === remote.id ||
              (remote.email && l.email && l.email.toLowerCase() === remote.email.toLowerCase())
          );

          if (!exists) {
            store.addLead({
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
            });
          } else {
            store.updateLead(exists.id, {
              name: remote.name && remote.name !== "Lead Checkout (Draft)" ? remote.name : exists.name,
              phone: remote.phone && remote.phone !== "-" ? remote.phone : exists.phone,
              email: remote.email || exists.email,
              status: remote.status || exists.status,
              bumpTaken: remote.bumpTaken ?? exists.bumpTaken,
              paymentMethod: remote.paymentMethod || exists.paymentMethod,
              amount: remote.amount ?? exists.amount,
              checkoutStep: remote.checkoutStep ?? exists.checkoutStep,
              planTier: remote.planTier || exists.planTier,
            });
          }
        });
      }
    } catch (err) {
      console.warn("Could not sync server leads:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncServerLeads();
  }, []);

  const totalLeadsCount = leads.length;
  const abandonedCount = leads.filter((l) => l.status === "abandoned_checkout").length;
  const pendingCount = leads.filter((l) => l.status === "pending_payment").length;
  const wonCount = leads.filter((l) => l.status === "won").length;
  const freeCount = leads.filter((l) => l.planTier === "free" || l.projectType?.toLowerCase().includes("free")).length;
  const potentialRecoveryValue = leads
    .filter((l) => l.status === "abandoned_checkout" || l.status === "pending_payment")
    .reduce((sum, l) => sum + (l.amount || 99000), 0);

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
      l.projectType.toLowerCase().includes(search.toLowerCase()) ||
      (l.city || "").toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchPlan =
      planFilter === "all" ||
      l.planTier === planFilter ||
      l.projectType?.toLowerCase().includes(planFilter);

    return matchSearch && matchStatus && matchPlan;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelectedLeads = () => {
    if (confirm(`Hapus ${selectedIds.size} lead terpilih?`)) {
      selectedIds.forEach((id) => deleteLead(id));
      setSelectedIds(new Set());
    }
  };

  const exportCSV = () => {
    const rows = [
      ["ID", "Nama", "No WA", "Email", "Paket", "Order Bump", "Metode Bayar", "Nominal", "Status", "Step Terakhir", "Tanggal"],
      ...filtered.map((l) => [
        l.id,
        l.name,
        l.phone,
        l.email || "",
        l.planTier || l.projectType,
        l.bumpTaken ? "Ya" : "Tidak",
        l.paymentMethod || "-",
        l.amount || 0,
        LEAD_STATUS_LABELS[l.status] || l.status,
        `Step ${l.checkoutStep || 1}`,
        formatDate(l.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monefyi-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Direct WhatsApp Follow-up Link Generator
  const generateWhatsAppLink = (lead: Lead) => {
    const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("62")
      ? cleanPhone
      : cleanPhone.startsWith("0")
      ? `62${cleanPhone.slice(1)}`
      : `62${cleanPhone}`;

    let msg = `Halo Kak ${lead.name}, salam dari tim Monefyi Estimator! 🙌\n\n`;

    if (lead.status === "abandoned_checkout") {
      msg += `Kami perhatikan Kakak sempat mengisi form pemesanan Estimator tapi belum menyelesaikan aktivasi. Apakah ada pertanyaan atau kendala yang bisa kami bantu jelaskan?`;
    } else if (lead.status === "pending_payment") {
      const amountStr = lead.amount ? `sebesar ${formatCurrency(lead.amount)}` : "";
      const methodStr = lead.paymentMethod ? `via ${lead.paymentMethod.toUpperCase()}` : "";
      msg += `Menindaklanjuti pesanan akun Estimator Kakak ${amountStr} ${methodStr}. Apakah nomor VA / QRIS-nya sudah diterima dan butuh bantuan panduan pembayaran?`;
    } else if (lead.status === "won") {
      msg += `Terima kasih! Akun Estimator Kakak sudah aktif. Apakah ada panduan atau template estimasi yang ingin kami bantu siapkan?`;
    } else {
      msg += `Terima kasih sudah tertarik dengan Monefyi Estimator. Kami siap membantu jika Kakak butuh konsultasi kebutuhan estimasi proyek Anda.`;
    }

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleWhatsAppClick = (lead: Lead) => {
    addActivity(lead.id, {
      type: "whatsapp",
      content: `Follow-up WhatsApp dikirim (Status: ${lead.status})`,
      timestamp: new Date().toISOString(),
      by: "Admin",
    });
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM — Lead Checkout</h1>
            <span className="text-xs font-extrabold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              Sinkronisasi Otomatis ⚡
            </span>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            Pantau prospek dari Conversational Checkout & hubungi langsung via WhatsApp 1-klik
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#065f46] hover:bg-emerald-800 text-white px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/15 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Lead Manual
          </button>
          <button
            onClick={syncServerLeads}
            disabled={isSyncing}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin text-emerald-600")} />
            <span>{isSyncing ? "Menyinkron..." : "Refresh Data"}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            label: "TOTAL PROSPEK",
            value: totalLeadsCount,
            sub: `${leads.length} data tersimpan`,
            color: "text-slate-900",
            bg: "bg-white",
          },
          {
            label: "CHECKOUT TERTUNDA",
            value: abandonedCount,
            sub: "Siap Difollow-up WA",
            color: "text-rose-600",
            bg: "bg-rose-50/50 border-rose-200/60",
          },
          {
            label: "MENUNGGU BAYAR",
            value: pendingCount,
            sub: "Invoice / VA Terbit",
            color: "text-amber-600",
            bg: "bg-amber-50/50 border-amber-200/60",
          },
          {
            label: "DEAL / LUNAS",
            value: wonCount,
            sub: `${freeCount} akun free aktif`,
            color: "text-emerald-600",
            bg: "bg-emerald-50/50 border-emerald-200/60",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={cn(
              "rounded-[28px] p-6 border shadow-sm hover:shadow-md transition-all group",
              s.bg || "bg-white border-slate-100"
            )}
          >
            <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-2 uppercase">
              {s.label}
            </p>
            <p className={cn("text-4xl font-black mb-1.5 transition-transform group-hover:scale-105", s.color)}>
              {s.value}
            </p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recovery Banner */}
      {abandonedCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-[24px] p-5 mb-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-base">
                Peluang Recovery: {abandonedCount} calon pelanggan tertunda di langkah checkout!
              </p>
              <p className="text-xs text-amber-100 mt-0.5">
                Estimasi potensi omset tertunda: ~{formatCurrency(potentialRecoveryValue)}. Hubungi mereka langsung via tombol WA hijau di bawah.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("abandoned_checkout")}
            className="px-5 py-2.5 bg-white text-amber-900 rounded-xl font-black text-xs hover:bg-amber-50 transition-all shadow-md shrink-0 cursor-pointer"
          >
            Filter Lead Tertunda →
          </button>
        </div>
      )}

      {/* Main Filter & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "Semua Lead", count: totalLeadsCount },
            { id: "abandoned_checkout", label: "Tertunda ⚠️", count: abandonedCount },
            { id: "pending_payment", label: "Menunggu Bayar ⏳", count: pendingCount },
            { id: "won", label: "Deal / Paid ✅", count: wonCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  statusFilter === tab.id ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 shadow-sm"
          >
            <option value="all">Semua Paket</option>
            <option value="free">Paket Free (Rp0)</option>
            <option value="standard">Paket Standard</option>
            <option value="pro">Paket PRO</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, WA, email..."
              className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold w-full sm:w-[220px] focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="bg-white text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-slate-50 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={deleteSelectedLeads}
              className="bg-rose-50 text-rose-600 border border-rose-200 px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-rose-100 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus ({selectedIds.size})
            </button>
          )}

          {/* View Toggle */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
            <button
              onClick={() => setView("table")}
              className={cn(
                "p-2 rounded-lg transition-all cursor-pointer",
                view === "table" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
              title="Table View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("pipeline")}
              className={cn(
                "p-2 rounded-lg transition-all cursor-pointer",
                view === "pipeline" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
              title="Pipeline View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div className="bg-white rounded-[28px] border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-200/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  <th className="py-4 px-5 text-left w-10">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(filtered.map((l) => l.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </th>
                  <th className="py-4 px-4 text-left">PROSPEK & KONTAK</th>
                  <th className="py-4 px-4 text-left">PAKET & BUMP</th>
                  <th className="py-4 px-4 text-left">STATUS CHECKOUT</th>
                  <th className="py-4 px-4 text-left">METODE BAYAR</th>
                  <th className="py-4 px-4 text-left">TOTAL</th>
                  <th className="py-4 px-4 text-left">WAKTU</th>
                  <th className="py-4 px-4 text-center">FOLLOW-UP WHATSAPP</th>
                  <th className="py-4 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((lead) => {
                  const hasWa = Boolean(lead.phone && lead.phone !== "-" && lead.phone.length > 7);
                  const isFree = lead.planTier === "free" || lead.amount === 0;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/90 transition-colors group">
                      <td className="py-4 px-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Prospek & Kontak */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 text-sm">{lead.name}</p>
                          <p className="font-bold text-emerald-700 text-xs tracking-wide">
                            {lead.phone || "-"}
                          </p>
                          {lead.email && (
                            <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">
                              {lead.email}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Paket & Bump */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={cn(
                              "text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider",
                              lead.planTier === "free" || lead.projectType?.toLowerCase().includes("free")
                                ? "bg-emerald-100 text-[#065f46]"
                                : lead.planTier === "pro" || lead.projectType?.toLowerCase().includes("pro")
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            )}
                          >
                            {lead.planTier?.toUpperCase() || lead.projectType || "STANDARD"}
                          </span>
                          {lead.bumpTaken && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>+Order Bump</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value as any)}
                            className={cn(
                              "border rounded-xl px-2.5 py-1 text-[11px] font-extrabold cursor-pointer transition-all",
                              LEAD_STATUS_COLORS[lead.status] || "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                          {lead.checkoutStep && (
                            <p className="text-[10px] text-slate-400 font-semibold">
                              Sampai Langkah {lead.checkoutStep}/5
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Metode Bayar */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-700 uppercase text-[11px] bg-slate-100 px-2 py-1 rounded-lg">
                          {isFree ? "Gratis 100%" : lead.paymentMethod || "QRIS"}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-4 font-black text-slate-900 text-sm">
                        {isFree ? (
                          <span className="text-emerald-700 font-bold">Rp 0 (Free)</span>
                        ) : (
                          formatCurrency(lead.amount || 99000)
                        )}
                      </td>

                      {/* Waktu */}
                      <td className="py-4 px-4 text-[10px] font-semibold text-slate-400">
                        <p>{new Date(lead.createdAt).toLocaleDateString("id-ID")}</p>
                        <p>{new Date(lead.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>

                      {/* Direct WhatsApp Follow-up */}
                      <td className="py-4 px-4 text-center">
                        {hasWa ? (
                          <a
                            href={generateWhatsAppLink(lead)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleWhatsAppClick(lead)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                            title="Buka WhatsApp dengan pesan template otomatis"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Chat WA</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No WA belum ada</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/crm/${lead.id}`}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Detail
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm("Hapus lead ini?")) deleteLead(lead.id);
                            }}
                            className="text-[11px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      Belum ada data lead yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kanban / Pipeline View */}
      {view === "pipeline" && (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-5 min-w-max">
            {PIPELINE_COLUMNS.map((status) => {
              const statusLeads = filtered.filter((l) => l.status === status);
              return (
                <div key={status} className="w-80 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className={cn("text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider", LEAD_STATUS_COLORS[status])}>
                      {LEAD_STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {statusLeads.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {statusLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            Step {lead.checkoutStep || 1}/5
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                            {lead.planTier?.toUpperCase() || "STANDARD"}
                          </span>
                        </div>

                        <p className="font-black text-slate-900 text-base mb-1">{lead.name}</p>
                        <p className="text-xs font-bold text-emerald-700 mb-2">{lead.phone || "-"}</p>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">
                            {lead.amount ? formatCurrency(lead.amount) : "Rp 0"}
                          </span>
                          {lead.phone && lead.phone !== "-" && (
                            <a
                              href={generateWhatsAppLink(lead)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleWhatsAppClick(lead)}
                              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> WA
                            </a>
                          )}
                        </div>
                      </div>
                    ))}

                    {statusLeads.length === 0 && (
                      <div className="bg-slate-100/60 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs font-bold text-slate-400">
                        Kosong
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdd={addLead} />}
    </div>
  );
}
