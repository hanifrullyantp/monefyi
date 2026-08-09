/**
 * Marketing A/B variant selection.
 * @module services/marketing-ab
 */

/**
 * Deterministic bucket 0–99 from user + offer id.
 * @param {string} userId
 * @param {string} offerId
 * @returns {number}
 */
export function getVariantBucket(userId, offerId) {
  const str = `${userId || 'anon'}:${offerId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

/**
 * @param {object[]} variants
 * @param {string} userId
 * @param {string} offerId
 * @returns {object|null}
 */
export function pickOfferVariant(variants, userId, offerId) {
  const active = (variants || []).filter((v) => v.active !== false);
  if (!active.length) return null;

  const total = active.reduce((s, v) => s + (Number(v.weight) || 0), 0) || active.length;
  const bucket = getVariantBucket(userId, offerId);
  let cursor = 0;

  for (const v of active) {
    const w = total > 0 ? (Number(v.weight) || 1) / total * 100 : 100 / active.length;
    cursor += w;
    if (bucket < cursor) return v;
  }
  return active[0];
}

/**
 * Merge variant content into offer for display.
 * @param {object} offer
 * @param {object|null} variant
 * @returns {object}
 */
export function applyVariantToOffer(offer, variant) {
  if (!variant?.content_json) return offer;
  return {
    ...offer,
    content_json: { ...offer.content_json, ...variant.content_json },
    _variant_id: variant.id,
    _variant_key: variant.variant_key,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} offerId
 * @returns {Promise<object[]>}
 */
export async function loadOfferVariants(client, offerId) {
  if (!client || !offerId) return [];
  const { data, error } = await client
    .from('marketing_offer_variants')
    .select('*')
    .eq('offer_id', offerId)
    .eq('active', true)
    .order('variant_key');
  if (error) {
    console.warn('[marketing-ab] load variants', error);
    return [];
  }
  return data || [];
}

/**
 * Resolve offer with A/B variant for current user.
 * @param {object} offer
 * @param {object[]} [variants]
 * @returns {object}
 */
export function resolveOfferForUser(offer, variants = []) {
  const uid = typeof window !== 'undefined' ? window.STATE?.db?.user?.id : null;
  if (!variants.length) return offer;
  const picked = pickOfferVariant(variants, uid, offer.id);
  return applyVariantToOffer(offer, picked);
}

if (typeof window !== 'undefined') {
  window.monefyiMarketingAb = {
    getVariantBucket,
    pickOfferVariant,
    applyVariantToOffer,
    loadOfferVariants,
    resolveOfferForUser,
  };
}
