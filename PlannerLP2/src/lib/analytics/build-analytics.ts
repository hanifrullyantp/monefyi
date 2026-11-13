import { MONEFYI_PRICING } from "@/lib/engine/winningEngine";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/types/leads";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

export interface AnalyticsCrmLead {
  id?: string;
  name?: string;
  phone?: string;
  status?: string;
  planTier?: string;
  bumpTaken?: boolean;
  paymentMethod?: string;
  amount?: number;
  estimatedValue?: number;
  checkoutStep?: number;
  createdAt?: string;
  sessionId?: string;
  verifiedViaMayar?: boolean;
}

export interface AnalyticsFunnelStep {
  id: string;
  label: string;
  count: number;
  dropCount: number;
  dropOffRate: number;
  conversionFromStart: number;
}

export interface AnalyticsPlanRow {
  id: "free" | "standard" | "pro";
  name: string;
  count: number;
  amount: number;
}

export interface AnalyticsOrderLog {
  id: string;
  name: string;
  plan: string;
  status: string;
  amount: number;
  timestamp: string;
}

export interface AnalyticsSnapshot {
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
  funnelSteps: AnalyticsFunnelStep[];
  paymentDistribution: Record<string, number>;
  plans: AnalyticsPlanRow[];
  recentOrders: AnalyticsOrderLog[];
  overview: {
    totalLeads: number;
    wonCount: number;
    closingRate: string;
    revenue: number;
    monthly: Array<{ month: string; revenue: number; leads: number }>;
    statusData: Array<{ name: string; value: number }>;
    sourceData: Array<{ name: string; value: number }>;
  };
}

function moneyOf(lead: AnalyticsCrmLead): number {
  const value = Number(lead.amount ?? lead.estimatedValue ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function stepOf(lead: AnalyticsCrmLead): number {
  const step = Number(lead.checkoutStep ?? 0);
  return Number.isFinite(step) ? step : 0;
}

function reachedPayment(lead: AnalyticsCrmLead): boolean {
  return (
    stepOf(lead) >= 5 ||
    lead.status === "pending_payment" ||
    lead.status === "won" ||
    lead.status === "free_active"
  );
}

function isCompleted(lead: AnalyticsCrmLead): boolean {
  return lead.status === "won" || lead.status === "free_active";
}

function hasPhone(lead: AnalyticsCrmLead): boolean {
  const phone = (lead.phone || "").trim();
  return phone.length > 0 && phone !== "-";
}

function planIdOf(lead: AnalyticsCrmLead): "free" | "standard" | "pro" {
  if (lead.planTier === "free" || lead.planTier === "pro") return lead.planTier;
  return "standard";
}

function formatRp(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function rate(part: number, whole: number): string {
  if (whole <= 0) return "0";
  return ((part / whole) * 100).toFixed(1);
}

function statusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status as LeadStatus] || status || "Tanpa status";
}

/**
 * Susun angka analytics dari lead CRM.
 * Langkah pertama adalah kunjungan yang tersimpan, bukan setiap pageview checkout.
 */
export function buildAnalytics(leads: AnalyticsCrmLead[], now = new Date()): AnalyticsSnapshot {
  const total = leads.length;
  const step1 = leads.filter((lead) => stepOf(lead) >= 1).length;
  const step2 = leads.filter((lead) => stepOf(lead) >= 2).length;
  const step3 = leads.filter((lead) => stepOf(lead) >= 3).length;
  const step4 = leads.filter((lead) => stepOf(lead) >= 4).length;
  const step5 = leads.filter(reachedPayment).length;
  const completed = leads.filter(isCompleted).length;
  const whatsappCaptured = leads.filter((lead) => stepOf(lead) >= 3 || hasPhone(lead)).length;
  const bumpTakers = leads.filter((lead) => lead.bumpTaken).length;

  const rawSteps = [
    { id: "stored_visit", label: "Kunjungan tersimpan", count: total },
    { id: "step1_name", label: "Langkah 1: Nama Lengkap", count: step1 },
    { id: "step2_email", label: "Langkah 2: Alamat Email", count: step2 },
    { id: "step3_whatsapp", label: "Langkah 3: No. WhatsApp", count: step3 },
    { id: "step4_bump", label: "Langkah 4: Evaluasi Order Bump", count: step4 },
    { id: "step5_payment", label: "Langkah 5: Review & Bayar", count: step5 },
    { id: "completed", label: "Aktivasi / Pembayaran Berhasil", count: completed },
  ];

  let highestDropOff = { step: "-", dropCount: 0, dropRate: 0 };
  const funnelSteps = rawSteps.map((step, index) => {
    const prevCount = index === 0 ? total : rawSteps[index - 1].count;
    const dropCount = Math.max(0, prevCount - step.count);
    const dropOffRate = prevCount > 0 ? Math.round((dropCount / prevCount) * 100) : 0;
    const conversionFromStart = total > 0 ? Math.round((step.count / total) * 100) : 0;
    if (index > 0 && dropCount > highestDropOff.dropCount) {
      highestDropOff = { step: step.label, dropCount, dropRate: dropOffRate };
    }
    return { ...step, dropCount, dropOffRate, conversionFromStart };
  });

  const paymentDistribution: Record<string, number> = {};
  for (const lead of leads) {
    const method = (lead.paymentMethod || "").trim();
    if (!method) continue;
    paymentDistribution[method] = (paymentDistribution[method] || 0) + 1;
  }

  const planTotals: Record<"free" | "standard" | "pro", { count: number; amount: number }> = {
    free: { count: 0, amount: 0 },
    standard: { count: 0, amount: 0 },
    pro: { count: 0, amount: 0 },
  };
  for (const lead of leads) {
    const plan = planIdOf(lead);
    planTotals[plan].count += 1;
    planTotals[plan].amount += moneyOf(lead);
  }

  const plans: AnalyticsPlanRow[] = [
    { id: "free", name: `Paket Free (${formatRp(0)})`, ...planTotals.free },
    {
      id: "standard",
      name: `Paket Standard (${formatRp(MONEFYI_PRICING.standardPrice)})`,
      ...planTotals.standard,
    },
    { id: "pro", name: `Paket PRO (${formatRp(MONEFYI_PRICING.proPrice)})`, ...planTotals.pro },
  ];

  const timeOf = (lead: AnalyticsCrmLead) => {
    const time = Date.parse(lead.createdAt || "");
    return Number.isFinite(time) ? time : 0;
  };
  const recentOrders = [...leads]
    .sort((a, b) => timeOf(b) - timeOf(a))
    .slice(0, 30)
    .map((lead, index) => ({
      id: lead.id || lead.sessionId || `lead-${index}`,
      name: (lead.name || "").trim() || "Tanpa nama",
      plan: planIdOf(lead),
      status: statusLabel(lead.status || ""),
      amount: moneyOf(lead),
      timestamp: lead.createdAt || "",
    }));

  const wonLeads = leads.filter((lead) => lead.status === "won");
  const revenue = wonLeads.reduce((sum, lead) => sum + moneyOf(lead), 0);

  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      month: MONTH_LABELS[date.getMonth()],
      revenue: 0,
      leads: 0,
      key: `${date.getFullYear()}-${date.getMonth()}`,
    };
  });
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const lead of leads) {
    const created = new Date(lead.createdAt || "");
    if (Number.isNaN(created.getTime())) continue;
    const bucket = bucketMap.get(`${created.getFullYear()}-${created.getMonth()}`);
    if (!bucket) continue;
    bucket.leads += 1;
    if (lead.status === "won") bucket.revenue += moneyOf(lead);
  }

  const statusCounts: Record<string, number> = {};
  const sourceCounts = { Checkout: 0, Mayar: 0 };
  for (const lead of leads) {
    const label = statusLabel(lead.status || "");
    statusCounts[label] = (statusCounts[label] || 0) + 1;
    if (lead.verifiedViaMayar) sourceCounts.Mayar += 1;
    else sourceCounts.Checkout += 1;
  }

  return {
    totalVisitors: total,
    metrics: {
      overallConversionRate: `${rate(completed, total)}%`,
      bumpAttachRate: `${rate(bumpTakers, step4)}%`,
      whatsappCaptureRate: `${rate(whatsappCaptured, total)}%`,
      bumpTakersCount: bumpTakers,
      abandonedLeadsCount: Math.max(0, whatsappCaptured - completed),
      highestDropOffStep: highestDropOff.step,
      highestDropOffRate: `${highestDropOff.dropRate}%`,
    },
    funnelSteps,
    paymentDistribution,
    plans,
    recentOrders,
    overview: {
      totalLeads: total,
      wonCount: wonLeads.length,
      closingRate: rate(wonLeads.length, total),
      revenue,
      monthly: buckets.map(({ month, revenue: monthRevenue, leads: count }) => ({
        month,
        revenue: monthRevenue,
        leads: count,
      })),
      statusData: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
      sourceData: [
        { name: "Checkout", value: sourceCounts.Checkout },
        { name: "Mayar", value: sourceCounts.Mayar },
      ],
    },
  };
}
