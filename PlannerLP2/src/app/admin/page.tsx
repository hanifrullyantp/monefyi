"use client";
import { useLeadsStore } from "@/lib/store/leadsStore";
import { useContentStore } from "@/lib/store/contentStore";
import {
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Clock,
  Save,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatRelativeTime } from "@/lib/utils/format";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/types/leads";

export default function AdminDashboard() {
  const { leads } = useLeadsStore();
  const { content, lastSaved, isDirty, isSaving, publishContent } = useContentStore();

  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const closingRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0";
  const totalRevenue = leads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

  const recentLeads = [...leads]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    {
      label: "Total Lead",
      value: totalLeads,
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Closing Rate",
      value: `${closingRate}%`,
      icon: TrendingUp,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Revenue (Deal)",
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: "bg-amber-100 text-amber-600",
    },
    {
      label: "Proyek Deal",
      value: wonLeads,
      icon: CheckCircle2,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const quickLinks = [
    { href: "/admin/konten", label: "Edit Konten Landing Page", icon: BarChart3 },
    { href: "/admin/crm", label: "Kelola CRM & Leads", icon: Users },
    { href: "/admin/pricing", label: "Edit Harga", icon: DollarSign },
    { href: "/admin/faq", label: "Edit FAQ", icon: CheckCircle2 },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">System Online</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 font-medium mt-2">
            Selamat datang kembali di <span className="text-slate-900 font-bold">Monefyi Hub</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 rounded-2xl px-6 py-3.5 font-bold text-sm hover:bg-slate-50 transition-all"
          >
            <Eye className="w-4 h-4" />
            VIEW SITE
          </Link>
          {isDirty && (
            <button
              type="button"
              onClick={() => void publishContent()}
              disabled={isSaving}
              className="flex items-center gap-2 bg-slate-900 text-white rounded-2xl px-8 py-3.5 font-bold text-sm shadow-2xl hover:bg-slate-800 transition-all active:scale-95 group disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              {isSaving ? "MENYIMPAN…" : "PUBLISH CHANGES"}
            </button>
          )}
        </div>
      </div>

      {/* Stats - Premium Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group"
          >
            <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-4xl font-black text-slate-900 mb-1">{stat.value}</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900">Lead Terbaru</h2>
            <Link
              href="/admin/crm"
              className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
            >
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/crm/${lead.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {lead.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{lead.name}</p>
                    <p className="text-xs text-slate-500">{lead.projectType}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      LEAD_STATUS_COLORS[lead.status]
                    }`}
                  >
                    {LEAD_STATUS_LABELS[lead.status]}
                  </span>
                  {lead.estimatedValue && (
                    <span className="text-xs text-slate-500 hidden sm:block">
                      {formatCurrency(lead.estimatedValue)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
            {recentLeads.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">
                Belum ada lead
              </p>
            )}
          </div>
        </div>

        {/* Quick Links + Site Status */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Aksi Cepat</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-100 transition-all group"
                >
                  <link.icon className="w-5 h-5 text-slate-500 group-hover:text-emerald-600" />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700 leading-tight">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4">Status Konten</h2>
            <div className="space-y-2">
              {Object.entries(content.sectionVisibility).map(([key, visible]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 capitalize">{key}</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      visible
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {visible ? "Aktif" : "Disembunyikan"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
