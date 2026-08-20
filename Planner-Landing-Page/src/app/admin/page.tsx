"use client";
import { useLeadsStore } from "@/lib/store/leadsStore";
import { useContentStore } from "@/lib/store/contentStore";
import { PageHeader } from "@/components/admin/PageHeader";
import { Users, TrendingUp, FileText, Eye, ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils/format";
import { LeadStatusLabels } from "@/lib/types/leads";

export default function AdminDashboardPage() {
  const { leads } = useLeadsStore();
  const { content } = useContentStore();

  // Stats
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const totalValue = leads.filter((l) => l.status === "won").reduce((sum, l) => sum + l.estimatedValue, 0);
  const newLeads = leads.filter((l) => l.status === "new").length;

  const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const stats = [
    { label: "Total Lead", value: totalLeads, icon: Users, color: "bg-blue-50 text-blue-600", change: `${newLeads} baru` },
    { label: "Deal Berhasil", value: wonLeads, icon: TrendingUp, color: "bg-emerald-50 text-emerald-600", change: `${totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0}% closing rate` },
    { label: "Revenue (Deal)", value: formatRupiah(totalValue), icon: FileText, color: "bg-amber-50 text-amber-600", change: "Dari semua deal" },
    { label: "Landing Page", value: "Live", icon: Eye, color: "bg-purple-50 text-purple-600", change: "Semua section aktif" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Selamat datang kembali di Monefyi Planner Admin"
        actions={
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Lihat Landing Page
          </a>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              <p className="text-xs text-slate-400 mt-1">{stat.change}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900">Lead Terbaru</h3>
            <Link href="/admin/crm" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1">
              Lihat semua <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{lead.name}</p>
                  <p className="text-xs text-slate-500">{lead.projectType} · {formatRupiah(lead.estimatedValue)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600`}>
                  {LeadStatusLabels[lead.status]}
                </span>
              </div>
            ))}
            {recentLeads.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada lead</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-5">Aksi Cepat</h3>
          <div className="space-y-2">
            {[
              { href: "/admin/konten", label: "Edit Landing Page", desc: "Ubah konten hero, pricing, FAQ" },
              { href: "/admin/crm", label: "Kelola CRM", desc: "Lihat dan update status lead" },
              { href: "/admin/pricing", label: "Edit Pricing", desc: "Update harga dan paket" },
              { href: "/admin/testimonial", label: "Edit Testimonial", desc: "Ubah cerita pengguna" },
              { href: "/admin/seo", label: "SEO & Analytics", desc: "Kelola meta tags dan pixel" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
