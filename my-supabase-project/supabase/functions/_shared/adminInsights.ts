/**
 * Rule-based sales/ops insights for admin analytics (no LLM).
 */

export type AdminInsight = {
  id: string;
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  body: string;
  expected_impact?: string;
  action_label?: string;
  action_tab?: string;
};

export function buildAdminInsights(ctx: {
  funnel: Record<string, number>;
  revenueThisPeriod: number;
  revenuePrevPeriod: number;
  convRate: number;
  convRatePrev: number;
  coupleTakeRate?: number;
  pendingRefunds?: number;
  trialToPaidRate?: number;
}): AdminInsight[] {
  const insights: AdminInsight[] = [];
  const lv = ctx.funnel.landing_views || 0;
  const cta = ctx.funnel.cta_clicks || 0;
  const payments = ctx.funnel.payments || 0;

  if (lv > 50 && cta / Math.max(lv, 1) < 0.25) {
    insights.push({
      id: "hero-ctr",
      priority: "high",
      category: "funnel",
      title: "Optimasi Landing Hero",
      body: `Drop-off Page→CTA tinggi (${Math.round((1 - cta / lv) * 100)}%). Headline atau social proof di above-the-fold perlu diperkuat.`,
      expected_impact: "+15–25% CTR",
      action_label: "Edit Landing",
      action_tab: "landing",
    });
  }

  if ((ctx.pendingRefunds || 0) > 0) {
    insights.push({
      id: "refunds-pending",
      priority: "high",
      category: "ops",
      title: `${ctx.pendingRefunds} refund pending`,
      body: "Tinjau permintaan refund dalam 7 hari garansi.",
      action_label: "Lihat Refunds",
      action_tab: "refunds",
    });
  }

  if (ctx.revenuePrevPeriod > 0) {
    const revDelta = ((ctx.revenueThisPeriod - ctx.revenuePrevPeriod) / ctx.revenuePrevPeriod) * 100;
    if (revDelta >= 10) {
      insights.push({
        id: "revenue-up",
        priority: "low",
        category: "revenue",
        title: "Revenue naik vs periode lalu",
        body: `Pendapatan periode ini ↗ ${Math.round(revDelta)}% dibanding periode sebelumnya.`,
      });
    } else if (revDelta <= -10) {
      insights.push({
        id: "revenue-down",
        priority: "medium",
        category: "revenue",
        title: "Revenue turun vs periode lalu",
        body: `Pendapatan ↘ ${Math.abs(Math.round(revDelta))}%. Review funnel dan campaign aktif.`,
        action_label: "Marketing",
        action_tab: "marketing",
      });
    }
  }

  if (ctx.coupleTakeRate != null && ctx.coupleTakeRate < 0.2 && payments > 5) {
    insights.push({
      id: "couple-bump",
      priority: "medium",
      category: "pricing",
      title: "Couple Pack take rate rendah",
      body: `Take rate ${Math.round(ctx.coupleTakeRate * 100)}% (benchmark 25–35%). Uji harga bump atau copy positioning.`,
      expected_impact: "+5–10% take rate",
      action_label: "Edit Plans",
      action_tab: "plans",
    });
  }

  if (ctx.convRatePrev > 0 && ctx.convRate < ctx.convRatePrev - 0.5) {
    insights.push({
      id: "conv-drop",
      priority: "medium",
      category: "funnel",
      title: "Conversion rate turun",
      body: `Conv rate ${ctx.convRate}% vs ${ctx.convRatePrev}% periode lalu. Audit checkout mobile.`,
      action_label: "Marketing",
      action_tab: "marketing",
    });
  }

  if (ctx.trialToPaidRate != null && ctx.trialToPaidRate < 8 && (ctx.funnel.trial_starts || 0) > 10) {
    insights.push({
      id: "trial-conv",
      priority: "medium",
      category: "conversion",
      title: "Trial→Paid rendah",
      body: `Konversi trial ~${ctx.trialToPaidRate}%. Pertimbangkan trigger berbasis behavior (mis. setelah 10 transaksi).`,
      action_label: "Campaigns",
      action_tab: "marketing",
    });
  }

  return insights.slice(0, 8);
}
