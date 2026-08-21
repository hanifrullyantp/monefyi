"use client";
import { useMemo } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { useLeadsStore } from "@/lib/store/leadsStore";
import { formatRupiah } from "@/lib/utils/format";
import { LeadStatusLabels } from "@/lib/types/leads";
import { Users, Target, TrendingUp, BarChart3 } from "lucide-react";

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AnalyticsPage() {
  const { leads } = useLeadsStore();

  const stats = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((l) => l.status === "won");
    const wonCount = won.length;
    const revenue = won.reduce((s, l) => s + l.estimatedValue, 0);
    const closingRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;
    return { total, wonCount, revenue, closingRate };
  }, [leads]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { leads: number; won: number; revenue: number }>();
    for (const lead of leads) {
      const key = monthKey(lead.createdAt);
      const row = map.get(key) ?? { leads: 0, won: 0, revenue: 0 };
      row.leads += 1;
      if (lead.status === "won") {
        row.won += 1;
        row.revenue += lead.estimatedValue;
      }
      map.set(key, row);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => ({
        name: key,
        leads: v.leads,
        won: v.won,
        revenue: Math.round(v.revenue / 1_000_000),
      }));
  }, [leads]);

  const cards = [
    { label: "Total Lead", value: String(stats.total), icon: Users, color: "text-blue-600" },
    { label: "Deal Menang", value: String(stats.wonCount), icon: Target, color: "text-emerald-600" },
    { label: "Closing Rate", value: `${stats.closingRate}%`, icon: BarChart3, color: "text-amber-600" },
    { label: "Revenue Deal", value: formatRupiah(stats.revenue), icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Data real dari CRM leads (localStorage) — bukan mock chart"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200">
            <div className={`p-2 rounded-xl bg-slate-50 w-fit mb-4 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">Lead per bulan</h3>
        {byMonth.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">Belum ada data lead. Tambah lead di CRM.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-2">Bulan</th>
                  <th className="py-2">Lead</th>
                  <th className="py-2">Menang</th>
                  <th className="py-2">Revenue (jt)</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map((row) => (
                  <tr key={row.name} className="border-b border-slate-50">
                    <td className="py-2 font-medium">{row.name}</td>
                    <td className="py-2">{row.leads}</td>
                    <td className="py-2">{row.won}</td>
                    <td className="py-2">{row.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">Breakdown status</h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(LeadStatusLabels).map(([status, label]) => {
            const count = leads.filter((l) => l.status === status).length;
            return (
              <div key={status} className="px-4 py-2 rounded-xl bg-slate-50 text-sm">
                <span className="font-semibold text-slate-800">{label}</span>
                <span className="text-slate-500 ml-2">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
