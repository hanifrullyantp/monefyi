"use client";
import { useState, useEffect } from "react";
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
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  Eye,
  CreditCard,
  QrCode,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

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

interface FunnelStep {
  id: string;
  label: string;
  count: number;
  dropCount: number;
  dropOffRate: number;
  conversionFromStart: number;
}

interface FunnelData {
  totalVisitors: number;
  metrics: {
    overallConversionRate: string;
    bumpAttachRate: string;
    whatsappCaptureRate: string;
    bumpTakersCount: number;
    abandonedLeadsCount: number;
    highestDropOffStep: string;
    highestDropOffRate: string;
  };
  funnelSteps: FunnelStep[];
  paymentDistribution: Record<string, number>;
  planBreakdown: { free: number; standard: number; pro: number };
  recentLogs: Array<{
    sessionId: string;
    event: string;
    plan: string;
    bumpTaken?: boolean;
    paymentMethod?: string;
    timestamp: string;
  }>;
}

export default function AnalyticsPage() {
  const { leads } = useLeadsStore();
  const [activeTab, setActiveTab] = useState<"funnel" | "overview">("funnel");
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [isLoadingFunnel, setIsLoadingFunnel] = useState(false);

  // Fetch real-time funnel data from API
  const fetchFunnelStats = async () => {
    try {
      setIsLoadingFunnel(true);
      const res = await fetch("/api/analytics/funnel");
      const data = await res.json();
      if (data?.ok) {
        setFunnelData(data);
      }
    } catch (err) {
      console.warn("Failed to load funnel stats:", err);
    } finally {
      setIsLoadingFunnel(false);
    }
  };

  useEffect(() => {
    fetchFunnelStats();
  }, []);

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

  const closingRate =
    leads.length > 0
      ? ((leads.filter((l) => l.status === "won").length / leads.length) * 100).toFixed(1)
      : "0";

  // Payment methods chart data
  const paymentMethodsChartData = funnelData
    ? Object.entries(funnelData.paymentDistribution).map(([method, count]) => ({
        name: method.toUpperCase(),
        value: count,
      }))
    : [];

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics & Funnel</h1>
            <span className="text-xs font-black px-2.5 py-0.5 bg-emerald-100 text-[#065f46] rounded-full border border-emerald-200">
              Live Tracker 🎯
            </span>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            Analisa drop-off langkah checkout, konversi WhatsApp, dan efektivitas Order Bump
          </p>
        </div>

        {/* Tab Switcher & Refresh Button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab("funnel")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                activeTab === "funnel"
                  ? "bg-[#065f46] text-white shadow-md shadow-emerald-900/15"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Funnel Checkout
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                activeTab === "overview"
                  ? "bg-[#065f46] text-white shadow-md shadow-emerald-900/15"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              Ringkasan Umum
            </button>
          </div>

          <button
            onClick={fetchFunnelStats}
            disabled={isLoadingFunnel}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-600 shadow-sm transition-all cursor-pointer"
            title="Refresh Analisa"
          >
            <RefreshCw className={cn("w-4 h-4", isLoadingFunnel && "animate-spin text-emerald-600")} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FUNNEL CHECKOUT (ANALISA DROP-OFF & CONVERSION LENGKAP) */}
      {/* ========================================================================= */}
      {activeTab === "funnel" && funnelData && (
        <div className="space-y-8">
          {/* Key Funnel KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-2">
                TOTAL PENGUNJUNG CHECKOUT
              </p>
              <p className="text-4xl font-black text-slate-900 mb-1">{funnelData.totalVisitors}</p>
              <p className="text-xs text-slate-500 font-bold">100% Top of Funnel</p>
            </div>

            <div className="bg-emerald-50/60 rounded-[28px] p-6 border border-emerald-200/70 shadow-sm hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-emerald-700 tracking-[0.2em] uppercase mb-2">
                WHATSAPP CAPTURED
              </p>
              <p className="text-4xl font-black text-emerald-800 mb-1">
                {funnelData.metrics.whatsappCaptureRate}
              </p>
              <p className="text-xs text-emerald-700 font-bold">Lolos sampai Langkah 3</p>
            </div>

            <div className="bg-amber-50/60 rounded-[28px] p-6 border border-amber-200/70 shadow-sm hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-amber-700 tracking-[0.2em] uppercase mb-2">
                ORDER BUMP ATTACH RATE
              </p>
              <p className="text-4xl font-black text-amber-800 mb-1">
                {funnelData.metrics.bumpAttachRate}
              </p>
              <p className="text-xs text-amber-700 font-bold">
                {funnelData.metrics.bumpTakersCount} pembeli ambil bump
              </p>
            </div>

            <div className="bg-blue-50/60 rounded-[28px] p-6 border border-blue-200/70 shadow-sm hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-blue-700 tracking-[0.2em] uppercase mb-2">
                FINAL CONVERSION RATE
              </p>
              <p className="text-4xl font-black text-blue-900 mb-1">
                {funnelData.metrics.overallConversionRate}
              </p>
              <p className="text-xs text-blue-700 font-bold">Lunas / Akun Free Aktif</p>
            </div>
          </div>

          {/* Highest Drop-Off Alert */}
          {funnelData.metrics.highestDropOffStep !== "-" && (
            <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-slate-900 text-sm">
                  Titik Drop-Off Terbesar Terdeteksi di:{" "}
                  <span className="text-rose-600 underline">
                    {funnelData.metrics.highestDropOffStep}
                  </span>{" "}
                  (Drop {funnelData.metrics.highestDropOffRate})
                </p>
                <p className="text-xs text-slate-600">
                  Saran Optimasi CRO: Pengunjung paling banyak berhenti di tahap ini. Anda dapat mengaktifkan{" "}
                  <strong>Mode Edit Teks</strong> di checkout untuk menyederhanakan teks, memberi jaminan privasi WA, atau menegaskan manfaat Order Bump.
                </p>
              </div>
            </div>
          )}

          {/* Visual Funnel Progression Diagram */}
          <div className="bg-white rounded-[32px] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-5">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Diagram Corong Konversi (Funnel Steps)</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Persentase pengunjung yang melanjutkan di setiap langkah beserta tingkat drop-off
                </p>
              </div>
              <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start">
                Total {funnelData.funnelSteps.length} Tahap Pelacakan
              </span>
            </div>

            <div className="space-y-4">
              {funnelData.funnelSteps.map((step, idx) => {
                const isWorstDrop = step.dropOffRate > 25 && idx > 0;
                const isLast = idx === funnelData.funnelSteps.length - 1;

                return (
                  <div key={step.id} className="group">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black">
                          {idx + 1}
                        </span>
                        <span className="text-slate-800 text-sm font-extrabold">{step.label}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-slate-900 font-black">{step.count} orang</span>
                        <span className="text-xs font-bold text-slate-400">
                          ({step.conversionFromStart}% dari awal)
                        </span>

                        {idx > 0 && (
                          <span
                            className={cn(
                              "text-[11px] font-black px-2 py-0.5 rounded-md",
                              isWorstDrop
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            Drop: {step.dropOffRate}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Visual */}
                    <div className="w-full bg-slate-100 h-6 rounded-xl overflow-hidden p-1 flex items-center">
                      <div
                        className={cn(
                          "h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2",
                          isLast
                            ? "bg-gradient-to-r from-emerald-500 to-[#065f46]"
                            : idx >= 3
                            ? "bg-gradient-to-r from-teal-500 to-emerald-500"
                            : "bg-gradient-to-r from-blue-500 to-teal-500"
                        )}
                        style={{ width: `${Math.max(step.conversionFromStart, 6)}%` }}
                      >
                        <span className="text-[10px] font-black text-white drop-shadow-xs">
                          {step.conversionFromStart}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown: Metode Pembayaran & Distribusi Paket */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Method Distribution */}
            <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Distribusi Metode Pembayaran</span>
                </h4>
                <span className="text-xs font-bold text-slate-400">Transaksi Terpilih</span>
              </div>

              {paymentMethodsChartData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentMethodsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis allowDecimals={false} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#065f46" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                  Belum ada data transaksi metode pembayaran.
                </div>
              )}
            </div>

            {/* Plan Tier Breakdown */}
            <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Sebaran Pilihan Paket Estimator</span>
                </h4>
                <span className="text-xs font-bold text-slate-400">Total Minat</span>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    name: "Paket Free (Rp0)",
                    count: funnelData.planBreakdown.free,
                    color: "bg-emerald-500",
                    badge: "Free Tier",
                  },
                  {
                    name: "Paket Standard (Rp99.000)",
                    count: funnelData.planBreakdown.standard,
                    color: "bg-blue-600",
                    badge: "Populer",
                  },
                  {
                    name: "Paket PRO (Rp199.000)",
                    count: funnelData.planBreakdown.pro,
                    color: "bg-purple-600",
                    badge: "Bisnis",
                  },
                ].map((tier) => {
                  const total =
                    funnelData.planBreakdown.free +
                    funnelData.planBreakdown.standard +
                    funnelData.planBreakdown.pro;
                  const pct = total > 0 ? Math.round((tier.count / total) * 100) : 0;

                  return (
                    <div key={tier.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">{tier.name}</span>
                        <span className="text-slate-500">
                          {tier.count} sesi ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", tier.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real-time Event Logs */}
          <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Log Aktivitas Funnel Terakhir (Live Stream)</span>
              </h4>
              <span className="text-xs font-bold text-slate-400">30 Event Terkini</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-left border-b border-slate-100 pb-2">
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Session ID</th>
                    <th className="py-2.5 px-3">Event Funnel</th>
                    <th className="py-2.5 px-3">Paket</th>
                    <th className="py-2.5 px-3">Bump</th>
                    <th className="py-2.5 px-3">Metode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {funnelData.recentLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 font-semibold text-slate-700">
                      <td className="py-2.5 px-3 text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-blue-600">
                        #{log.sessionId.slice(-8)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-black uppercase">
                          {log.event.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[11px]">{log.plan}</td>
                      <td className="py-2.5 px-3">
                        {log.bumpTaken ? (
                          <span className="text-amber-600 font-bold">✔ Ambil</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[11px] text-slate-500">
                        {log.paymentMethod || "-"}
                      </td>
                    </tr>
                  ))}

                  {funnelData.recentLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada aktivitas tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RINGKASAN UMUM BISNIS & REVENUE */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      )}
    </div>
  );
}
