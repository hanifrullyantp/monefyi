"use client";
import { useState, useMemo } from "react";
import { useLeadsStore } from "@/lib/store/leadsStore";
import {
  Search,
  Plus,
  Filter,
  Trash2,
  ChevronDown,
  Settings,
  Info,
  ChevronRight,
  List,
  Layout,
} from "lucide-react";
import {
  Lead,
  LeadStatusLabels,
  ProjectTypeLabels,
} from "@/lib/types/leads";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export default function CrmPage() {
  const { leads, deleteLead, searchQuery, setSearchQuery, statusFilter, setStatusFilter, selectedIds, setSelectedIds } = useLeadsStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...leads];
    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.location?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, statusFilter, searchQuery]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: "TOTAL LEADS", value: leads.length, desc: "di rentang filter" },
    { label: "LEAD BARU", value: leads.filter(l => l.status === "new").length, desc: "status pipeline" },
    { label: "SUDAH FOLLOW-UP", value: leads.filter(l => l.activities.length > 0).length, desc: "min. 1x WA" },
    { label: "% DEAL", value: leads.length ? Math.round((leads.filter(l => l.status === "won").length / leads.length) * 100) : 0, desc: "0 deal", unit: "%" },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">CRM — Leads</h2>
          <p className="text-slate-500 text-sm mt-1">Kelola prospek kitchen set Intero / WOCENSA — follow-up WA & pipeline</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
            <Plus className="w-4 h-4" /> Tambah lead manual
          </button>
          <Link href="/admin/crm-template" className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
            <Settings className="w-4 h-4" /> Pengaturan CRM
          </Link>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
             <Info className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-amber-800 text-sm font-medium">Tentang otomatisasi data dari WhatsApp</span>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p>
            <p className="text-4xl font-extrabold text-slate-900 mt-2">
              {stat.value}{stat.unit}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase">{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
          <button onClick={() => setViewMode("list")} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900")}>
            <List className="w-4 h-4" /> List
          </button>
          <button onClick={() => setViewMode("kanban")} className={cn("px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", viewMode === "kanban" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900")}>
            <Layout className="w-4 h-4" /> Kanban
          </button>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
          <Filter className="w-4 h-4" /> Semua kategori <ChevronDown className="w-4 h-4" />
        </button>

        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, WA, kota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-5 pr-12 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="w-10 px-4 py-4 text-center"><input type="checkbox" className="rounded" /></th>
                {["ID", "NAMA & KONTAK", "KOTA", "KATEGORI", "STATUS", "KEBUTUHAN", "TANGGAL", "FOLLOW-UP WA", "AKSI"].map(h => (
                  <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 text-center"><input type="checkbox" className="rounded" /></td>
                  <td className="px-4 py-4">
                    <p className="text-[10px] font-mono text-blue-600 font-bold truncate max-w-[120px]">#{lead.id.substring(0, 8)}...</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs font-bold text-slate-900">{lead.name}</p>
                    <p className="text-xs text-emerald-600 font-medium">{lead.phone}</p>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-slate-600">{lead.location || "-"}</td>
                  <td className="px-4 py-4">
                    <select className="bg-slate-50 border-none text-[10px] font-bold rounded-lg px-2 py-1 text-slate-600 focus:ring-0">
                      <option>—</option>
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-900 flex items-center justify-between w-fit gap-2">
                      {LeadStatusLabels[lead.status]} <ChevronDown className="w-2.5 h-2.5" />
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-slate-600">{ProjectTypeLabels[lead.projectType]}</td>
                  <td className="px-4 py-4 text-[10px] font-medium text-slate-400 leading-tight">
                    {lead.createdAt.split("T")[0]}<br/>{lead.createdAt.split("T")[1].substring(0,5)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      {["W", "1", "2", "3", "4", "5"].map(b => (
                        <button key={b} className="w-6 h-6 rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center">
                          {b}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <Link href={`/admin/crm/${lead.id}`} className="text-[10px] font-bold text-blue-600 hover:underline">Catatan</Link>
                      <button onClick={() => setConfirmDelete(lead.id)} className="text-[10px] font-bold text-red-600 hover:underline text-left">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) deleteLead(confirmDelete); }}
        title="Hapus Lead"
        description="Apakah Anda yakin ingin menghapus lead ini?"
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}
