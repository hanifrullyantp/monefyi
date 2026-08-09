/**
 * In-app marketing engine — eligibility, cooldowns, interactions.
 * @module services/marketing-engine
 */

const LS_RULES = 'monefyi_marketing_rules';
const LS_INTERACTIONS = 'monefyi_marketing_interactions';
const LS_PREFS = 'monefyi_marketing_prefs';
const LS_FIRST_LOGIN = 'monefyi_first_login_day';
const OFFERS_CACHE_TTL_MS = 5 * 60 * 1000;

/** @type {{ at: number, data: object[] }|null} */
let _offersCache = null;

/** @type {Record<string, string|number|boolean>} */
export const DEFAULT_GLOBAL_RULES = {
  max_offers_per_day: 1,
  allowed_hours_start: 9,
  allowed_hours_end: 21,
  skip_weekend: false,
  skip_when_danger: true,
  default_cooldown_hours: 24,
  cooldown_after_dismiss_days: 7,
  cooldown_after_not_interested_days: 30,
  max_dismiss_before_stop: 3,
  show_only_first_login_of_day: true,
  startup_delay_seconds: 3,
  auto_dismiss_after_seconds: 60,
  default_display_mode: 'non_blocking',
};

/**
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function supa() {
  return window.STATE?.db?.supa || window.__monefyiSupabase || null;
}

/**
 * @returns {string|null}
 */
function userId() {
  return window.STATE?.db?.user?.id || null;
}

/**
 * @param {string} key
 * @returns {string}
 */
function todayKey(key = '') {
  const d = new Date();
  const base = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return key ? `${base}:${key}` : base;
}

/**
 * @returns {Promise<Record<string, string|number|boolean>>}
 */
export async function loadGlobalRules() {
  const client = supa();
  if (client) {
    try {
      const { data, error } = await client.from('marketing_global_rules').select('key, value, data_type');
      if (!error && data?.length) {
        /** @type {Record<string, string|number|boolean>} */
        const map = { ...DEFAULT_GLOBAL_RULES };
        for (const row of data) {
          const v = String(row.value ?? '');
          if (row.data_type === 'number') map[row.key] = Number(v);
          else if (row.data_type === 'boolean') map[row.key] = v === 'true';
          else map[row.key] = v;
        }
        localStorage.setItem(LS_RULES, JSON.stringify(map));
        return map;
      }
    } catch (e) {
      console.warn('[marketing] loadGlobalRules', e);
    }
  }
  try {
    const raw = localStorage.getItem(LS_RULES);
    if (raw) return { ...DEFAULT_GLOBAL_RULES, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_GLOBAL_RULES };
}

/**
 * @returns {Promise<object>}
 */
export async function loadUserPreferences() {
  const uid = userId();
  const client = supa();
  if (uid && client) {
    try {
      const { data } = await client
        .from('user_marketing_preferences')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (data) {
        localStorage.setItem(LS_PREFS, JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn('[marketing] loadUserPreferences', e);
    }
  }
  try {
    const raw = localStorage.getItem(LS_PREFS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    marketing_enabled: true,
    milestone_enabled: true,
    educational_enabled: true,
    frequency: 'normal',
  };
}

/**
 * @param {object} patch
 * @returns {Promise<object>}
 */
export async function saveUserMarketingPreferences(patch) {
  const uid = userId();
  const client = supa();
  const current = await loadUserPreferences();
  const merged = { ...current, ...patch };

  if (uid && client) {
    try {
      await client.from('user_marketing_preferences').upsert({
        user_id: uid,
        marketing_enabled: merged.marketing_enabled !== false,
        milestone_enabled: merged.milestone_enabled !== false,
        educational_enabled: merged.educational_enabled !== false,
        frequency: merged.frequency || 'normal',
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[marketing] saveUserMarketingPreferences', e);
    }
  }

  localStorage.setItem(LS_PREFS, JSON.stringify(merged));
  return merged;
}

/** Priority tier for conflict resolution (higher wins). */
const OFFER_TYPE_PRIORITY = {
  subscription_expiring: 100,
  payment_issue: 100,
  feature_blocker: 90,
  trial_to_paid: 80,
  couple_not_activated: 75,
  milestone: 60,
  contextual_upsell: 50,
  trial_to_paid_context: 50,
  couple_not_activated_context: 50,
  feature_discovery_neraca: 30,
  feature_discovery: 25,
};

/**
 * @param {object} offer
 * @returns {number}
 */
function offerPriorityScore(offer) {
  const typeScore = OFFER_TYPE_PRIORITY[offer.offer_type] || 40;
  return typeScore + (Number(offer.priority) || 0);
}

/**
 * @param {object} offer
 * @param {object} prefs
 * @returns {boolean}
 */
function passesOfferTypePrefs(offer, prefs) {
  const type = String(offer.offer_type || '');
  if (type.includes('milestone') && prefs.milestone_enabled === false) return false;
  if ((type.includes('feature_discovery') || type.includes('discovery')) && prefs.educational_enabled === false) {
    return false;
  }
  if (prefs.frequency === 'minimal') {
    const critical = ['subscription_expiring', 'payment_issue', 'trial_to_paid', 'couple_not_activated', 'feature_blocker'];
    if (!critical.some((c) => type.includes(c))) return false;
  }
  return true;
}

/**
 * @returns {Promise<object[]>}
 */
async function loadActiveOffers() {
  if (_offersCache && Date.now() - _offersCache.at < OFFERS_CACHE_TTL_MS) {
    return _offersCache.data;
  }

  const client = supa();
  if (client) {
    try {
      const { data, error } = await client
        .from('marketing_offers')
        .select('*, marketing_campaigns(status, type)')
        .eq('active', true)
        .order('priority', { ascending: false });
      if (!error && data?.length) {
        const filtered = data.filter((o) => o.marketing_campaigns?.status === 'active' || !o.campaign_id);
        _offersCache = { at: Date.now(), data: filtered };
        return filtered;
      }
    } catch (e) {
      console.warn('[marketing] loadActiveOffers', e);
    }
  }
  const fallback = getFallbackOffers();
  _offersCache = { at: Date.now(), data: fallback };
  return fallback;
}

/**
 * @returns {Promise<object|null>}
 */
async function consumeTestOffer() {
  const uid = userId();
  const client = supa();
  if (!uid || !client) return null;

  try {
    const { data, error } = await client
      .from('marketing_test_offers')
      .select('id, offer_id, marketing_offers(*)')
      .eq('user_id', uid)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.marketing_offers) return null;

    await client.from('marketing_test_offers').update({
      consumed_at: new Date().toISOString(),
    }).eq('id', data.id);

    return finalizeOffer(data.marketing_offers);
  } catch (e) {
    console.warn('[marketing] consumeTestOffer', e);
    return null;
  }
}

/**
 * Queue test offer for a user (admin).
 * @param {string} targetUserId
 * @param {string} offerId
 * @returns {Promise<void>}
 */
export async function queueTestOffer(targetUserId, offerId) {
  const client = supa();
  const adminId = userId();
  if (!client || !targetUserId || !offerId) throw new Error('Invalid params');

  const { error } = await client.from('marketing_test_offers').insert({
    user_id: targetUserId,
    offer_id: offerId,
    created_by: adminId,
  });
  if (error) throw error;
}

/**
 * @returns {object[]}
 */
function getFallbackOffers() {
  return [
    {
      id: 'local-trial',
      offer_type: 'trial_to_paid',
      priority: 8,
      max_shows_per_user: 5,
      cooldown_days: 1,
      content_json: {
        headline: 'Lanjutkan perjalanan keuanganmu',
        body: 'Aktifkan Monefyi sekali bayar — budget & transaksi kamu tetap aman.',
        cta_text: 'Lihat Paket',
        cta_url: '#paket',
        display_format: 'modal',
        dismiss_label: 'Nanti Saja',
      },
      target_audience_json: { plans: ['trial'], min_days_since_registration: 3 },
      display_rules_json: { trigger: 'app_startup' },
    },
    {
      id: 'local-couple-banner',
      offer_type: 'couple_not_activated',
      priority: 9,
      max_shows_per_user: 3,
      cooldown_days: 10,
      content_json: {
        headline: 'Pasangan belum diundang',
        body: 'Kamu sudah beli Couple Pack — undang pasangan sekarang agar bisa kelola keuangan bersama.',
        cta_text: 'Undang Pasangan',
        cta_action: 'open_settings_household',
        display_format: 'banner',
        dismiss_label: 'Nanti',
      },
      target_audience_json: { household_status: 'couple_inactive' },
      display_rules_json: { trigger: 'app_startup' },
    },
  ];
}

/**
 * @returns {Promise<object[]>}
 */
async function loadUserInteractions() {
  const uid = userId();
  const client = supa();
  if (uid && client) {
    try {
      const { data } = await client
        .from('user_offer_interactions')
        .select('*')
        .eq('user_id', uid)
        .order('shown_at', { ascending: false })
        .limit(200);
      if (data) return data;
    } catch (e) {
      console.warn('[marketing] loadUserInteractions', e);
    }
  }
  try {
    const raw = localStorage.getItem(LS_INTERACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * @param {object} state
 * @returns {object}
 */
export function buildUserContext(state = window.STATE || {}) {
  const profile = state.db?.profile || {};
  const plan = profile.plan_type || state.db?.plan?.plan_type || 'none';
  const created = profile.created_at || state.db?.user?.created_at;
  const daysSinceReg = created
    ? Math.floor((Date.now() - new Date(created).getTime()) / 86400000)
    : 0;

  let householdStatus = 'solo';
  try {
    const hh = JSON.parse(localStorage.getItem('monefyi_household') || 'null');
    if (hh?.members?.length > 1) householdStatus = 'couple_active';
    else if (hh?.invite_code) householdStatus = 'couple_inactive';
  } catch { /* ignore */ }

  const fin = state.financialCondition?.level || state.ui?.financialCondition || 'safe';

  return {
    plan,
    days_since_registration: daysSinceReg,
    household_status: householdStatus,
    financial_status: fin,
    transaction_count: (state.transactions || []).length,
    has_used_neraca: !!localStorage.getItem('monefyi_neraca_opened'),
    has_used_ocr: Number(localStorage.getItem('monefyi_ocr_count') || 0) > 0,
  };
}

/**
 * @param {object} offer
 * @param {object} ctx
 * @returns {boolean}
 */
function matchesAudience(offer, ctx) {
  const aud = offer.target_audience_json || {};
  if (aud.plans?.length && !aud.plans.includes(ctx.plan)) return false;
  if (aud.min_days_since_registration != null && ctx.days_since_registration < aud.min_days_since_registration) return false;
  if (aud.household_status && aud.household_status !== ctx.household_status) return false;
  if (aud.hasnt_used_features?.includes('neraca') && ctx.has_used_neraca) return false;
  if (aud.hasnt_used_features?.includes('ocr') && ctx.has_used_ocr) return false;
  if (aud.financial_status?.length && !aud.financial_status.includes(ctx.financial_status)) return false;
  return true;
}

/**
 * @param {object} offer
 * @param {object[]} interactions
 * @param {Record<string, string|number|boolean>} rules
 * @returns {boolean}
 */
function passesCooldown(offer, interactions, rules) {
  const mine = interactions.filter((i) => i.offer_id === offer.id);
  const shows = mine.filter((i) => i.action === 'viewed' || i.action === 'clicked' || i.action === 'dismissed');
  if (shows.length >= (offer.max_shows_per_user || 3)) return false;

  const dismisses = mine.filter((i) => i.action === 'dismissed');
  if (dismisses.length >= Number(rules.max_dismiss_before_stop || 3)) {
    const last = dismisses[0]?.shown_at;
    if (last) {
      const days = (Date.now() - new Date(last).getTime()) / 86400000;
      if (days < Number(rules.cooldown_after_not_interested_days || 30)) return false;
    }
  }

  const notInterested = mine.find((i) => i.action === 'not_interested');
  if (notInterested) {
    const days = (Date.now() - new Date(notInterested.shown_at).getTime()) / 86400000;
    if (days < Number(rules.cooldown_after_not_interested_days || 30)) return false;
  }

  const last = mine[0];
  if (last?.shown_at) {
    const days = (Date.now() - new Date(last.shown_at).getTime()) / 86400000;
    if (days < (offer.cooldown_days || 7)) return false;
  }

  return true;
}

/**
 * @param {Record<string, string|number|boolean>} rules
 * @param {object[]} interactions
 * @returns {boolean}
 */
function passesGlobalRules(rules, interactions) {
  const hour = new Date().getHours();
  if (hour < Number(rules.allowed_hours_start || 9) || hour >= Number(rules.allowed_hours_end || 21)) return false;

  if (rules.skip_weekend) {
    const dow = new Date().getDay();
    if (dow === 0 || dow === 6) return false;
  }

  const today = todayKey();
  const shownToday = interactions.filter((i) => {
    const d = String(i.shown_at || '').slice(0, 10);
    return d === today && (i.action === 'viewed' || i.action === 'dismissed' || i.action === 'clicked');
  });
  if (shownToday.length >= Number(rules.max_offers_per_day || 1)) return false;

  if (rules.show_only_first_login_of_day) {
    const key = `${LS_FIRST_LOGIN}:${userId() || 'anon'}:${today}`;
    if (sessionStorage.getItem(key) === 'shown') return false;
  }

  return true;
}

/**
 * @param {object} [opts]
 * @returns {Promise<object|null>}
 */
export async function getEligibleOffers(opts = {}) {
  const prefs = await loadUserPreferences();
  const skipMarketingPrefs = opts.skipMarketingPrefs === true;
  if (!skipMarketingPrefs && (prefs.frequency === 'off' || prefs.marketing_enabled === false)) {
    return null;
  }

  try {
    const { isEmergencyModeActive } = await import('./emergency-mode.js');
    if (isEmergencyModeActive()) return null;
  } catch { /* ignore */ }

  const rules = await loadGlobalRules();
  const ctx = buildUserContext(opts.state || window.STATE);

  if (rules.skip_when_danger && ctx.financial_status === 'danger') return null;

  const interactions = await loadUserInteractions();
  if (!opts.skipGlobalRules && !passesGlobalRules(rules, interactions)) return null;

  const offers = await loadActiveOffers();
  const trigger = opts.trigger || 'app_startup';
  const formatFilter = opts.formatFilter || null;

  const eligible = offers
    .filter((o) => !formatFilter || (o.content_json?.display_format || 'modal') === formatFilter)
    .filter((o) => matchesAudience(o, ctx))
    .filter((o) => {
      if (!skipMarketingPrefs) return passesOfferTypePrefs(o, prefs);
      return o.offer_type === 'couple_not_activated';
    })
    .filter((o) => passesCooldown(o, interactions, rules))
    .filter((o) => {
      const t = o.display_rules_json?.trigger || 'app_startup';
      if (trigger === 'any') return true;
      return t === trigger;
    })
    .sort((a, b) => offerPriorityScore(b) - offerPriorityScore(a));

  const picked = eligible[0] || null;
  return picked ? finalizeOffer(picked) : null;
}

/**
 * Apply A/B variant to resolved offer.
 * @param {object|null} offer
 * @returns {Promise<object|null>}
 */
async function finalizeOffer(offer) {
  if (!offer?.id) return offer;
  const client = supa();
  if (!client) return offer;
  try {
    const { loadOfferVariants, resolveOfferForUser } = await import('./marketing-ab.js');
    const variants = await loadOfferVariants(client, offer.id);
    return resolveOfferForUser(offer, variants);
  } catch (e) {
    console.warn('[marketing] finalizeOffer', e);
    return offer;
  }
}

/**
 * Persistent dashboard banner (e.g. couple not activated).
 * @param {object} [opts]
 * @returns {Promise<object|null>}
 */
export async function getDashboardBannerOffer(opts = {}) {
  const dismissedKey = `mk_banner_dismiss_${todayKey()}`;
  if (sessionStorage.getItem(dismissedKey) === '1' && !opts.ignoreSessionDismiss) return null;

  const offer = await getEligibleOffers({
    ...opts,
    trigger: opts.trigger || 'app_startup',
    formatFilter: 'banner',
    skipGlobalRules: true,
    skipMarketingPrefs: true,
  });
  return offer;
}

/**
 * Mount marketing banner at top of home dashboard.
 * @param {HTMLElement} container
 * @param {object} [opts]
 * @returns {Promise<HTMLElement|null>}
 */
export async function mountHomeMarketingBanner(container, opts = {}) {
  if (!container) return null;

  const existing = container.querySelector('.marketing-dashboard-banner');
  if (existing) existing.remove();

  const offer = await getDashboardBannerOffer(opts);
  if (!offer) return null;

  const { renderDashboardBanner } = await import('../components/marketing-offer-ui.js');
  const el = renderDashboardBanner(offer, {
    onAction: async (action) => {
      await recordOfferInteraction(offer.id, action);
      if (action === 'dismissed' || action === 'not_interested') {
        sessionStorage.setItem(`mk_banner_dismiss_${todayKey()}`, '1');
        el.remove();
      }
    },
  });

  container.prepend(el);
  await recordOfferInteraction(offer.id, 'viewed');
  return el;
}

/**
 * @param {string} offerId
 * @param {string} action
 * @param {object} [metadata]
 * @returns {Promise<void>}
 */
export async function recordOfferInteraction(offerId, action, metadata = {}) {
  const uid = userId();
  const row = {
    offer_id: offerId,
    action,
    shown_at: new Date().toISOString(),
    session_id: metadata.session_id || `s_${Date.now()}`,
    metadata,
  };

  const client = supa();
  if (uid && client) {
    try {
      await client.from('user_offer_interactions').insert({ ...row, user_id: uid });
      return;
    } catch (e) {
      console.warn('[marketing] recordOfferInteraction', e);
    }
  }

  try {
    const list = JSON.parse(localStorage.getItem(LS_INTERACTIONS) || '[]');
    list.unshift({ ...row, offer_id: offerId, user_id: uid || 'local' });
    localStorage.setItem(LS_INTERACTIONS, JSON.stringify(list.slice(0, 100)));
  } catch { /* ignore */ }
}

/**
 * Mark first login offer shown today.
 */
export function markFirstLoginOfferShown() {
  const key = `${LS_FIRST_LOGIN}:${userId() || 'anon'}:${todayKey()}`;
  sessionStorage.setItem(key, 'shown');
}

/**
 * @param {object} [opts]
 * @returns {Promise<object|null>}
 */
export async function handleAppStartup(opts = {}) {
  try {
    const { isFeatureEnabled } = await import('./feature-flag-store.js');
    if (!isFeatureEnabled('in_app_marketing', userId())) return null;
  } catch { /* ignore */ }

  const testOffer = await consumeTestOffer();
  if (testOffer) {
    const { showMarketingOffer } = await import('../components/marketing-offer-ui.js');
    await showMarketingOffer(testOffer, {
      onAction: (action) => recordOfferInteraction(testOffer.id, action, { test: true }),
    });
    await recordOfferInteraction(testOffer.id, 'viewed', { test: true });
    return testOffer;
  }

  const rules = await loadGlobalRules();
  const delayMs = Number(rules.startup_delay_seconds || 3) * 1000;

  await new Promise((r) => setTimeout(r, delayMs));

  const offer = await getEligibleOffers({ trigger: 'app_startup', state: opts.state });
  if (!offer) return null;

  const { showMarketingOffer } = await import('../components/marketing-offer-ui.js');
  const meta = { variant_id: offer._variant_id, variant_key: offer._variant_key };
  await showMarketingOffer(offer, {
    autoDismissMs: Number(rules.auto_dismiss_after_seconds || 60) * 1000,
    onAction: (action) => recordOfferInteraction(offer.id, action, meta),
  });

  markFirstLoginOfferShown();
  await recordOfferInteraction(offer.id, 'viewed');
  return offer;
}

/**
 * @param {string} event
 * @param {object} [data]
 * @returns {Promise<object|null>}
 */
export async function contextualTrigger(event, data = {}) {
  const offer = await getEligibleOffers({ trigger: event, state: data.state || window.STATE });
  if (!offer) return null;

  const content = offer.content_json || {};
  const format = content.display_format || 'sheet';

  const { showMarketingOffer } = await import('../components/marketing-offer-ui.js');
  const meta = { variant_id: offer._variant_id, variant_key: offer._variant_key };
  await showMarketingOffer({ ...offer, content_json: { ...content, display_format: format } }, {
    onAction: (action) => recordOfferInteraction(offer.id, action, meta),
  });
  await recordOfferInteraction(offer.id, 'viewed');
  return offer;
}

/**
 * @param {Record<string, string|number|boolean>} patch
 * @returns {Promise<void>}
 */
export async function saveGlobalRules(patch) {
  const client = supa();
  if (client && window.STATE?.db?.profile?.role === 'admin') {
    for (const [key, val] of Object.entries(patch)) {
      await client.from('marketing_global_rules').upsert({
        key,
        value: String(val),
        data_type: typeof val === 'boolean' ? 'boolean' : typeof val === 'number' ? 'number' : 'string',
        updated_at: new Date().toISOString(),
      });
    }
  }
  const current = await loadGlobalRules();
  localStorage.setItem(LS_RULES, JSON.stringify({ ...current, ...patch }));
}

/**
 * Boot marketing engine after auth.
 * @param {object} [opts]
 */
export async function initMarketingEngine(opts = {}) {
  if (opts.skip || !userId()) return;
  try {
    const { isFeatureEnabled } = await import('./feature-flag-store.js');
    if (!isFeatureEnabled('in_app_marketing', userId())) return;
  } catch { /* ignore */ }
  try {
    await handleAppStartup(opts);
    if (typeof document !== 'undefined') {
      const home = document.querySelector('#homePageRoot .home-page, #homePageRoot');
      if (home) mountHomeMarketingBanner(home, opts).catch(() => {});
    }
  } catch (e) {
    console.warn('[marketing] init failed', e);
  }
}

/**
 * Fire contextual marketing event (non-blocking).
 * @param {string} event
 * @param {object} [data]
 */
export function fireMarketingEvent(event, data = {}) {
  contextualTrigger(event, data).catch((e) => console.warn('[marketing] event', event, e));
}

if (typeof window !== 'undefined') {
  window.monefyiMarketing = {
    loadGlobalRules,
    loadUserPreferences,
    saveUserMarketingPreferences,
    getEligibleOffers,
    getDashboardBannerOffer,
    mountHomeMarketingBanner,
    recordOfferInteraction,
    handleAppStartup,
    contextualTrigger,
    fireMarketingEvent,
    initMarketingEngine,
    buildUserContext,
    saveGlobalRules,
    queueTestOffer,
  };
}
