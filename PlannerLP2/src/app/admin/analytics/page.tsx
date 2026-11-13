"use client";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils/format";
import { buildAnalytics, type AnalyticsSnapshot } from "@/lib/analytics/build-analytics";
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
import { Sparkles, AlertTriangle, RefreshCw, Clock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const COLORS = ["#059669", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#10b981", "#6366f1"];
const PLAN_COLORS: Record<string, string> = {
  free: "bg-emerald-500",
  standard: "bg-blue-600",
  pro: "bg-purple-600",
};

interface MayarRevenue {
  lifetimeRevenue: number;
  isMayarConnected: boolean;
}

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"funnel" | "overview">("funnel");
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [mayar, setMayar] = useState<MayarRevenue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [leadRes, mayarRes] = await Promise.all([
        fetch("/api/crm/lead?limit=500&verifyMayar=true"),
        fetch("/api/crm/mayar-stats"),
      ]);
      const leadData = await leadRes.json().catch(() => null);
      if (!leadRes.ok || !leadData?.ok || !Array.isArray(leadData.leads)) {
        throw new Error(leadData?.error || "Pesanan CRM tidak bisa dimuat");
      }
      setSnapshot(buildAnalytics(leadData.leads));

      const mayarData = await mayarRes.json().catch(() => null);
      if (mayarRes.ok && mayarData?.ok) {
        setMayar({
          lifetimeRevenue: Number(mayarData.lifetimeRevenue ?? 0),
          isMayarConnected: Boolean(mayarData.isMayarConnected),
        });
      } else {
        setMayar(null);
      }
    } catch (err) {
      console.error("Analytics load failed:", err);
      setError(err instanceof Error ? err.message : "Pesanan CRM tidak bisa dimuat");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const paymentMethodsChartData = snapshot
    ? Object.entries(snapshot.paymentDistribution).map(([method, count]) => ({
        name: method.toUpperCase(),
        value: count,
      }))
    : [];
  const planTotal = snapshot ? snapshot.plans.reduce((sum, plan) => sum + plan.count, 0) : 0;
  const hasLeads = Boolean(snapshot && snapshot.totalVisitors > 0);

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics & Funnel</h1>
            <span className="text-xs font-black px-2.5 py-0.5 bg-emerald-100 text-[#065f46] rounded-full border border-emerald-200">
              Data CRM
            </span>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            Funnel, paket, dan pendapatan dari pesanan CRM serta omzet Mayar
          </p>
        </div>

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
            onClick={loadAnalytics}
            disabled={isLoading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-2xl text-slate-600 shadow-sm transition-all cursor-pointer"
            title="Refresh Analisa"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-emerald-600")} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-[24px] p-5 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {isLoading && !snapshot && (
        <div className="bg-white rounded-[28px] border border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">
          Memuat pesanan CRM...
        </div>
      )}

      {!isLoading && snapshot && !hasLeads && (
        <div className="bg-white rounded-[28px] border border-slate-200 p-10 text-center text-sm font-semibold text-slate-500">
          Belum ada pesanan tersimpan di CRM.
        </div>
      )}

      {activeTab === "funnel" && snapshot && hasLeads && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-2">
                TOTAL PENGUNJUNG CHECKOUT
              </p>
              <p className="text-4xl font-black text-slate-900 mb-1">{snapshot.totalVisitors}</p>
              <p className="text-xs text-slate-500 font-bold">Kunjungan yang tersimpan di CRM</p>
            </div>

            <div className="bg-emerald-50/60 rounded-[28px] p-6 border border-emerald-200/70 shadow-sm hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-emerald-700 tracking-[0.2em] uppercase mb-2">
                WHATSAPP CAPTURED
              </p>
              <p className="text-4xl font-black text-emerald-800 mb-1">
                {snapshot.metrics.whatsappCaptureRate}
              </p>
              <p className="text-xs text-emerald-700 font-bold">Nomor tersimpan atau sampai langkah 3</p>
            </div>

            <div className="bg-amber-50/60 rounded-[28px] p-6 border border-amber-200/70 shadow-sm hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-amber-700 tracking-[0.2em] uppercase mb-2">
                ORDER BUMP ATTACH RATE
              </p>
              <p className="text-4xl font-black text-amber-800 mb-1">
                {snapshot.metrics.bumpAttachRate}
              </p>
              <p className="text-xs text-amber-700 font-bold">
                {snapshot.metrics.bumpTakersCount} pembeli ambil bump
              </p>
            </div>

            <div className="bg-blue-50/60 rounded-[28px] p-6 border border-blue-200/70 shadow-sm hover:shadow-md transition-all">
              <p className="text-[10px] font-black text-blue-700 tracking-[0.2em] uppercase mb-2">
                FINAL CONVERSION RATE
              </p>
              <p className="text-4xl font-black text-blue-900 mb-1">
                {snapshot.metrics.overallConversionRate}
              </p>
              <p className="text-xs text-blue-700 font-bold">Lunas / Akun Free Aktif</p>
            </div>
          </div>

          {snapshot.metrics.highestDropOffStep !== "-" && (
            <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-slate-900 text-sm">
                  Titik Drop-Off Terbesar Terdeteksi di:{" "}
                  <span className="text-rose-600 underline">
                    {snapshot.metrics.highestDropOffStep}
                  </span>{" "}
                  (Drop {snapshot.metrics.highestDropOffRate})
                </p>
                <p className="text-xs text-slate-600">
                  Saran Optimasi CRO: Pengunjung paling banyak berhenti di tahap ini. Anda dapat mengaktifkan{" "}
                  <strong>Mode Edit Teks</strong> di checkout untuk menyederhanakan teks, memberi jaminan privasi WA, atau menegaskan manfaat Order Bump.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[32px] border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-5">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Diagram Corong Konversi (Funnel Steps)</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Dihitung dari langkah checkout yang tersimpan di pesanan CRM
                </p>
              </div>
              <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start">
                Total {snapshot.funnelSteps.length} Tahap Pelacakan
              </span>
            </div>

            <div className="space-y-4">
              {snapshot.funnelSteps.map((step, idx) => {
                const isWorstDrop = step.dropOffRate > 25 && idx > 0;
                const isLast = idx === snapshot.funnelSteps.length - 1;

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Distribusi Metode Pembayaran</span>
                </h4>
                <span className="text-xs font-bold text-slate-400">Dari pesanan CRM</span>
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

            <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Sebaran Pilihan Paket Estimator</span>
                </h4>
                <span className="text-xs font-bold text-slate-400">Harga jual resmi</span>
              </div>

              <div className="space-y-3 pt-2">
                {snapshot.plans.map((tier) => {
                  const pct = planTotal > 0 ? Math.round((tier.count / planTotal) * 100) : 0;
                  return (
                    <div key={tier.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold gap-3">
                        <span className="text-slate-800">{tier.name}</span>
                        <span className="text-slate-500 text-right">
                          {tier.count} orang ({pct}%) · {formatCurrency(tier.amount)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", PLAN_COLORS[tier.id])}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[28px] border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Pesanan CRM Terbaru</span>
              </h4>
              <span className="text-xs font-bold text-slate-400">30 pesanan terakhir</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-left border-b border-slate-100 pb-2">
                    <th className="py-2.5 px-3">Waktu</th>
                    <th className="py-2.5 px-3">Nama</th>
                    <th className="py-2.5 px-3">Paket</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshot.recentOrders.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 font-semibold text-slate-700">
                      <td className="py-2.5 px-3 text-[11px] text-slate-400">{formatLogTime(log.timestamp)}</td>
                      <td className="py-2.5 px-3">{log.name}</td>
                      <td className="py-2.5 px-3 uppercase text-[11px]">{log.plan}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-black">
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{formatCurrency(log.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "overview" && snapshot && hasLeads && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              [
                { label: "Total Lead", value: String(snapshot.overview.totalLeads), hint: undefined },
                { label: "Closing Rate", value: `${snapshot.overview.closingRate}%`, hint: undefined },
                {
                  label: "Revenue (Deal)",
                  value: formatCurrency(snapshot.overview.revenue),
                  hint: mayar?.isMayarConnected
                    ? `Omzet Mayar ${formatCurrency(mayar.lifetimeRevenue)}`
                    : undefined,
                },
                { label: "Lead Won", value: String(snapshot.overview.wonCount), hint: undefined },
              ] as Array<{ label: string; value: string; hint?: string }>
            ).map((item) => (
              <div key={item.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <p className="text-2xl font-extrabold text-slate-900">{item.value}</p>
                <p className="text-sm text-slate-500 mt-1">{item.label}</p>
                {item.hint && <p className="text-xs font-semibold text-emerald-700 mt-1">{item.hint}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">Revenue 6 Bulan Terakhir</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={snapshot.overview.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(value) => `${value / 1000000}jt`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">Distribusi Status Lead</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={snapshot.overview.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {snapshot.overview.statusData.map((row, index) => (
                      <Cell key={row.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 mb-4">Lead per Sumber</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={snapshot.overview.sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" fontSize={12} allowDecimals={false} />
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
