/**
 * Marketing analytics — aggregate offer interaction metrics.
 * @module services/marketing-analytics
 */

/**
 * @param {object[]} interactions
 * @returns {object}
 */
export function aggregateOfferMetrics(interactions = []) {
  const viewed = interactions.filter((i) => i.action === 'viewed').length;
  const clicked = interactions.filter((i) => i.action === 'clicked').length;
  const dismissed = interactions.filter((i) => i.action === 'dismissed').length;
  const converted = interactions.filter((i) => i.action === 'converted').length;
  const notInterested = interactions.filter((i) => i.action === 'not_interested').length;
  const sent = viewed + clicked + dismissed + converted + notInterested;

  return {
    sent,
    viewed,
    clicked,
    dismissed,
    converted,
    not_interested: notInterested,
    ctr: viewed > 0 ? Math.round((clicked / viewed) * 1000) / 10 : 0,
    conversion_rate: viewed > 0 ? Math.round((converted / viewed) * 1000) / 10 : 0,
    dismiss_rate: viewed > 0 ? Math.round((dismissed / viewed) * 1000) / 10 : 0,
  };
}

/**
 * @param {object[]} interactions
 * @returns {Record<string, object>}
 */
export function metricsByOfferId(interactions = []) {
  /** @type {Record<string, object[]>} */
  const groups = {};
  for (const row of interactions) {
    const id = row.offer_id || 'unknown';
    if (!groups[id]) groups[id] = [];
    groups[id].push(row);
  }
  /** @type {Record<string, object>} */
  const out = {};
  for (const [id, rows] of Object.entries(groups)) {
    out[id] = aggregateOfferMetrics(rows);
  }
  return out;
}

/**
 * @param {object[]} interactions
 * @returns {Record<number, number>}
 */
export function metricsByHour(interactions = []) {
  /** @type {Record<number, number>} */
  const hours = {};
  for (const row of interactions) {
    if (row.action !== 'viewed' && row.action !== 'clicked') continue;
    const h = new Date(row.shown_at || Date.now()).getHours();
    hours[h] = (hours[h] || 0) + 1;
  }
  return hours;
}

/**
 * @param {object[]} interactions
 * @returns {object[]}
 */
export function buildFunnelSteps(interactions = []) {
  const m = aggregateOfferMetrics(interactions);
  return [
    { step: 'Shown', count: m.sent },
    { step: 'Viewed', count: m.viewed },
    { step: 'Clicked', count: m.clicked },
    { step: 'Converted', count: m.converted },
  ];
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {object} [opts]
 * @returns {Promise<object>}
 */
export async function loadMarketingAnalytics(client, opts = {}) {
  if (!client) {
    return { offers: [], campaigns: [], totals: aggregateOfferMetrics([]), funnel: [] };
  }

  const since = opts.since || new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: interactions, error } = await client
    .from('user_offer_interactions')
    .select('offer_id, action, shown_at, metadata')
    .gte('shown_at', since)
    .order('shown_at', { ascending: false })
    .limit(5000);

  if (error) throw error;

  const rows = interactions || [];
  const byOffer = metricsByOfferId(rows);
  const byHour = metricsByHour(rows);

  const [{ data: offers }, { data: campaigns }] = await Promise.all([
    client.from('marketing_offers').select('id, offer_type, content_json, campaign_id, active'),
    client.from('marketing_campaigns').select('id, name, status, type'),
  ]);

  const offerRows = (offers || []).map((o) => ({
    id: o.id,
    headline: o.content_json?.headline || o.offer_type,
    campaign_id: o.campaign_id,
    active: o.active,
    metrics: byOffer[o.id] || aggregateOfferMetrics([]),
  }));

  const campaignMetrics = (campaigns || []).map((c) => {
    const related = offerRows.filter((o) => o.campaign_id === c.id);
    const merged = related.reduce((acc, o) => {
      const m = o.metrics;
      return {
        sent: acc.sent + m.sent,
        viewed: acc.viewed + m.viewed,
        clicked: acc.clicked + m.clicked,
        converted: acc.converted + m.converted,
        dismissed: acc.dismissed + m.dismissed,
        not_interested: acc.not_interested + m.not_interested,
      };
    }, { sent: 0, viewed: 0, clicked: 0, converted: 0, dismissed: 0, not_interested: 0 });
    const ctr = merged.viewed > 0 ? Math.round((merged.clicked / merged.viewed) * 1000) / 10 : 0;
    return { ...c, metrics: { ...merged, ctr } };
  });

  return {
    totals: aggregateOfferMetrics(rows),
    funnel: buildFunnelSteps(rows),
    byHour,
    offers: offerRows.sort((a, b) => (b.metrics.viewed || 0) - (a.metrics.viewed || 0)),
    campaigns: campaignMetrics,
    interaction_count: rows.length,
    since,
  };
}

if (typeof window !== 'undefined') {
  window.monefyiMarketingAnalytics = {
    aggregateOfferMetrics,
    metricsByOfferId,
    loadMarketingAnalytics,
    buildFunnelSteps,
  };
}
