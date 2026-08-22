"use client";
import { useLeadsStore } from "@/lib/store/leadsStore";
import { formatCurrency } from "@/lib/utils/format";
import { LEAD_STATUS_LABELS } from "@/lib/types/leads";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#059669", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#10b981", "#6366f1"];

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

function buildMonthlyLeadStats(leads: { createdAt: string; status: string; estimatedValue?: number }[]) {
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: MONTH_LABELS[d.getMonth()],
      revenue: 0,
      leads: 0,
      key: `${d.getFullYear()}-${d.getMonth()}`,
    };
  });

  const bucketMap = new Map(buckets.map((b) => [b.key, b]));

  for (const lead of leads) {
    const created = new Date(lead.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const bucket = bucketMap.get(key);
    if (!bucket) continue;
    bucket.leads += 1;
    if (lead.status === "won") {
      bucket.revenue += lead.estimatedValue || 0;
    }
  }

  return buckets.map(({ month, revenue, leads: count }) => ({ month, revenue, leads: count }));
}

export default function AnalyticsPage() {
  const { leads } = useLeadsStore();

  const monthlyData = buildMonthlyLeadStats(leads);

  // Status distribution
  const statusData = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({
    name: LEAD_STATUS_LABELS[status as keyof typeof LEAD_STATUS_LABELS] || status,
    value: count,
  }));

  // Source distribution
  const sourceData = Object.entries(
    leads.reduce<Record<string, number>>((acc, l) => {
      acc[l.source] = (acc[l.source] || 0) + 1;
      return acc;
    }, {})
  ).map(([source, count]) => ({ name: source, value: count }));

  const totalRevenue = leads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

  const closingRate = leads.length > 0
    ? ((leads.filter((l) => l.status === "won").length / leads.length) * 100).toFixed(1)
    : "0";

  return (
    <div className="p-6 md:p-8">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">Analytics</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Lead", value: leads.length },
          { label: "Closing Rate", value: `${closingRate}%` },
          { label: "Revenue (Deal)", value: formatCurrency(totalRevenue) },
          { label: "Lead Won", value: leads.filter((l) => l.status === "won").length },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4">Revenue 6 Bulan Terakhir</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${v / 1000000}jt`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4">Distribusi Status Lead</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"

              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Source Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 mb-4">Lead per Sumber</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sourceData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" fontSize={12} />
            <YAxis dataKey="name" type="category" fontSize={12} width={80} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
