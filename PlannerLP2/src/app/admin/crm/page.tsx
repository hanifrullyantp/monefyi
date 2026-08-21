"use client";
import { useState } from "react";
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
  "contacted",
  "survey_scheduled",
  "survey_done",
  "proposal_sent",
  "negotiating",
  "won",
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
    source: "whatsapp" as LeadSource,
    status: "new" as LeadStatus,
    projectType: "",
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
        <h3 className="text-2xl font-black text-slate-900 mb-6">Tambah Lead Baru</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nama</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">No. HP</label>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="08xxxxxxxxxx" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Jenis Proyek</label>
            <input required value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Renovasi, Kitchen Set, dll" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all">Batal</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Simpan Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const { leads, addLead, deleteLead, updateLeadStatus } = useLeadsStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [view, setView] = useState<"table" | "pipeline">("table");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalLeadsCount = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'new').length;
  const followedUpCount = leads.filter(l => l.activities.some(a => a.type === 'whatsapp')).length;
  const wonCount = leads.filter(l => l.status === 'won').length;
  const dealRate = totalLeadsCount > 0 ? Math.round((wonCount / totalLeadsCount) * 100) : 0;

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.projectType.toLowerCase().includes(search.toLowerCase()) ||
      (l.city || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
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
    if (confirm(`Hapus ${selectedIds.size} lead?`)) {
      selectedIds.forEach((id) => deleteLead(id));
      setSelectedIds(new Set());
    }
  };

  const exportCSV = () => {
    const rows = [
      ["ID", "Nama", "HP", "Kota", "Status", "Kebutuhan", "Tanggal"],
      ...filtered.map((l) => [
        l.id,
        l.name,
        l.phone,
        l.city || "",
        LEAD_STATUS_LABELS[l.status],
        l.projectType,
        formatDate(l.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-export.csv";
    a.click();
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM — Leads</h1>
          <p className="text-slate-500 font-medium mt-1">Kelola prospek Monefyi Estimator — follow-up WA & pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> Tambah lead manual
          </button>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-orange-500/20 transition-all active:scale-95">
            <SettingsIcon className="w-5 h-5" /> Pengaturan CRM
          </button>
          <button className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm">
            <Bell className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-[24px] p-5 mb-10 flex items-center justify-between group cursor-pointer hover:bg-amber-100 transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200">
            <Info className="w-5 h-5" />
          </div>
          <p className="text-sm font-black text-amber-900 uppercase tracking-widest">Tentang otomatisasi data dari WhatsApp</p>
        </div>
        <ChevronRight className="w-6 h-6 text-amber-400 group-hover:translate-x-1 transition-transform" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: "TOTAL LEADS", value: totalLeadsCount, sub: "di rentang filter" },
          { label: "LEAD BARU", value: newLeadsCount, sub: "status pipeline", highlight: "text-orange-500" },
          { label: "SUDAH FOLLOW-UP", value: followedUpCount, sub: "min. 1x WA" },
          { label: "% DEAL", value: `${dealRate}%`, sub: `${wonCount} deal`, highlight: "text-emerald-500" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-3 uppercase">{s.label}</p>
            <p className={cn("text-5xl font-black text-slate-900 mb-2 transition-transform group-hover:scale-110", s.highlight)}>{s.value}</p>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/10">
            <RefreshCw className="w-4 h-4" /> Muat ulang
          </button>
          <button onClick={exportCSV} className="bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-slate-50 shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
          {selectedIds.size > 0 && (
             <button onClick={deleteSelectedLeads} className="bg-rose-50 text-rose-600 px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 border border-rose-100 transition-all">
                <Trash2 className="w-4 h-4" /> Hapus ({selectedIds.size})
             </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setView("table")}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all", view === "table" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutList className="w-4 h-4" /> LIST
            </button>
            <button 
              onClick={() => setView("pipeline")}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all", view === "pipeline" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="w-4 h-4" /> KANBAN
            </button>
          </div>

          <select className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 min-w-[180px] shadow-sm">
            <option>Semua kategori</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, WA, kota..." 
              className="bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold w-full md:w-[260px] focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
            />
          </div>

          <select className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm">
            <option>Periode 30 hari</option>
          </select>
        </div>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-5 px-6 text-left w-10">
                    <input
                      type="checkbox"
                      className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(new Set(filtered.map((l) => l.id)));
                        else setSelectedIds(new Set());
                      }}
                    />
                  </th>
                  <th className="py-5 px-4 text-left">ID</th>
                  <th className="py-5 px-4 text-left">NAMA & KONTAK</th>
                  <th className="py-5 px-4 text-left">KOTA</th>
                  <th className="py-5 px-4 text-left">KATEGORI</th>
                  <th className="py-5 px-4 text-left">STATUS</th>
                  <th className="py-5 px-4 text-left">KEBUTUHAN</th>
                  <th className="py-5 px-4 text-left">TANGGAL</th>
                  <th className="py-5 px-4 text-center">FOLLOW-UP WA</th>
                  <th className="py-5 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-6 px-6">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-6 px-4">
                      <Link href={`/admin/crm/${lead.id}`} className="text-[11px] font-black text-blue-600 hover:text-blue-800 break-all max-w-[140px] block transition-colors">
                        #{lead.id}
                      </Link>
                    </td>
                    <td className="py-6 px-4">
                      <p className="text-sm font-black text-slate-800 leading-tight mb-1">{lead.name}</p>
                      <p className="text-[11px] font-bold text-emerald-600 tracking-wider">{lead.phone}</p>
                    </td>
                    <td className="py-6 px-4 text-xs font-bold text-slate-500">{lead.city || "-"}</td>
                    <td className="py-6 px-4">
                      <select className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10">
                        <option>—</option>
                        <option>Interior</option>
                        <option>Renovasi</option>
                      </select>
                    </td>
                    <td className="py-6 px-4">
                      <select 
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-slate-700 focus:ring-4 focus:ring-blue-500/10"
                      >
                        {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-6 px-4 text-[11px] font-bold text-slate-600 max-w-[180px] truncate">
                      {lead.projectType}
                    </td>
                    <td className="py-6 px-4 text-[10px] font-black text-slate-400">
                      <p>{new Date(lead.createdAt).toLocaleDateString('id-ID')}</p>
                      <p className="mt-1">{new Date(lead.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all border border-slate-100 shadow-sm">W</button>
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all border border-slate-100 shadow-sm">{n}</button>
                        ))}
                      </div>
                    </td>
                    <td className="py-6 px-4">
                      <div className="flex flex-col items-center gap-2">
                        <Link href={`/admin/crm/${lead.id}`} className="text-[11px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-all">Catatan</Link>
                        <button 
                          onClick={() => { if (confirm("Hapus lead?")) deleteLead(lead.id); }}
                          className="text-[11px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg transition-all"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kanban / Pipeline View */}
      {view === "pipeline" && (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-6 min-w-max">
            {PIPELINE_COLUMNS.map((status) => {
              const statusLeads = leads.filter((l) => l.status === status);
              return (
                <div key={status} className="w-80 flex-shrink-0">
                  <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <span className={cn("text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest", LEAD_STATUS_COLORS[status])}>
                      {LEAD_STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs font-black text-slate-400 bg-slate-50 w-6 h-6 rounded-full flex items-center justify-center border border-slate-100">{statusLeads.length}</span>
                  </div>
                  <div className="space-y-4">
                    {statusLeads.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/admin/crm/${lead.id}`}
                        className="block bg-white rounded-3xl p-6 border border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-[40px] -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors" />
                        <p className="text-[10px] font-black text-blue-600 mb-2 uppercase tracking-widest">ID #{lead.id.slice(-6)}</p>
                        <p className="font-black text-slate-900 text-lg mb-1 leading-tight group-hover:text-blue-600 transition-colors">{lead.name}</p>
                        <p className="text-xs font-bold text-slate-400 mb-4">{lead.projectType}</p>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                           <span className="text-[10px] font-black text-slate-400">{formatDate(lead.createdAt)}</span>
                           <div className="flex -space-x-2">
                             <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">?</div>
                           </div>
                        </div>
                      </Link>
                    ))}
                    {statusLeads.length === 0 && (
                      <div className="bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-[32px] p-10 text-center">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Kosong</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onAdd={addLead}
        />
      )}
    </div>
  );
}
