/**
 * Community challenge sync + referral/buddy Supabase (Growth Sprint 15-18).
 * @module services/community-store
 */

const LS_SYNCED = 'monefyi_community_last_sync';

function supa() {
  return typeof window !== 'undefined' ? window.STATE?.db?.supa : null;
}

function userId() {
  return typeof window !== 'undefined' ? window.STATE?.db?.user?.id : null;
}

/**
 * @param {object} entry from joinChallenge
 * @returns {Promise<void>}
 */
export async function syncChallengeJoin(entry) {
  const uid = userId();
  const client = supa();
  if (!uid || !client || !entry || navigator.onLine === false) return;

  try {
    await client.from('community_challenge_participation').upsert({
      user_id: uid,
      challenge_id: entry.id,
      title: entry.title,
      joined_at: entry.joined_at,
      ends_at: entry.ends_at,
      streak_days: entry.streak_days || 0,
      last_checkin: entry.last_checkin || null,
      success_rate: entry.success_rate ?? 100,
    }, { onConflict: 'user_id,challenge_id' });
  } catch (e) {
    console.warn('[community-store] sync join', e);
  }
}

/**
 * @param {object} entry
 * @returns {Promise<void>}
 */
export async function syncChallengeCheckin(entry) {
  if (!entry) return;
  await syncChallengeJoin(entry);
}

/**
 * @param {object} profile from loadReferralProfile
 * @returns {Promise<void>}
 */
export async function syncReferralProfile(profile) {
  const uid = userId();
  const client = supa();
  if (!uid || !client || !profile?.code || navigator.onLine === false) return;

  try {
    await client.from('referral_profiles').upsert({
      user_id: uid,
      code: profile.code,
      link: profile.link,
      credits_total: profile.credits_total || 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[community-store] sync referral', e);
  }
}

/**
 * @param {object} buddy from matchBuddy
 * @returns {Promise<string|null>} pair id
 */
export async function syncBuddyPair(buddy) {
  const uid = userId();
  const client = supa();
  if (!uid || !client || !buddy || navigator.onLine === false) return null;

  try {
    const { data, error } = await client.from('buddy_pairs').upsert({
      user_id: uid,
      buddy_user_id: buddy.buddy_user_id || null,
      buddy_label: buddy.label || buddy.buddy_label || 'Buddy',
      goal: buddy.goal || 'emergency_fund',
      on_track_pct: buddy.on_track || buddy.on_track_pct || 50,
      matched_at: buddy.matched_at || new Date().toISOString(),
      active: true,
    }, { onConflict: 'user_id' }).select('id').single();
    if (!error && data?.id) return data.id;
  } catch (e) {
    console.warn('[community-store] sync buddy', e);
  }
  return null;
}

/**
 * @param {string} pairId
 * @param {string} message
 * @returns {Promise<object|null>}
 */
export async function syncBuddyMessage(pairId, message) {
  const uid = userId();
  const client = supa();
  if (!uid || !client || !pairId || navigator.onLine === false) return null;

  try {
    const { data, error } = await client.from('buddy_messages').insert({
      pair_id: pairId,
      sender_user_id: uid,
      body: String(message).slice(0, 240),
    }).select('*').single();
    if (!error) return data;
  } catch (e) {
    console.warn('[community-store] sync message', e);
  }
  return null;
}

/**
 * Load buddy chat thread from Supabase (sent + received).
 * @param {string} pairId
 * @returns {Promise<object[]>}
 */
export async function loadBuddyThreadMessages(pairId) {
  const uid = userId();
  const client = supa();
  if (!uid || !client || !pairId || navigator.onLine === false) return [];

  try {
    const { data: mine } = await client
      .from('buddy_messages')
      .select('id, body, sender_user_id, sent_at, pair_id')
      .eq('pair_id', pairId)
      .order('sent_at', { ascending: true })
      .limit(40);

    const { data: inboundPairs } = await client
      .from('buddy_pairs')
      .select('id')
      .eq('buddy_user_id', uid);

    const inboundIds = (inboundPairs || []).map((p) => p.id).filter((id) => id !== pairId);
    let inbound = [];
    if (inboundIds.length) {
      const { data } = await client
        .from('buddy_messages')
        .select('id, body, sender_user_id, sent_at, pair_id')
        .in('pair_id', inboundIds)
        .order('sent_at', { ascending: true })
        .limit(40);
      inbound = data || [];
    }

    const merged = [...(mine || []), ...inbound]
      .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at))
      .slice(-40);

    return merged.map((row) => ({
      id: row.id,
      body: row.body,
      from: row.sender_user_id === uid ? 'me' : 'buddy',
      sent_at: row.sent_at,
      remote: true,
    }));
  } catch (e) {
    console.warn('[community-store] load messages', e);
    return [];
  }
}

/**
 * @param {object} payload
 * @returns {Promise<void>}
 */
export async function reportForumContent(payload) {
  const uid = userId();
  const client = supa();
  if (!uid || !client || navigator.onLine === false) return;

  try {
    await client.from('community_content_reports').insert({
      reporter_user_id: uid,
      content_type: payload.content_type,
      content_id: String(payload.content_id),
      reason: String(payload.reason || 'spam').slice(0, 300),
    });
  } catch (e) {
    console.warn('[community-store] report', e);
  }
}

/**
 * Pull remote challenge participation into local cache.
 * @returns {Promise<object[]>}
 */
export async function pullRemoteChallenges() {
  const uid = userId();
  const client = supa();
  if (!uid || !client || navigator.onLine === false) return [];

  try {
    const { data } = await client
      .from('community_challenge_participation')
      .select('*')
      .eq('user_id', uid)
      .order('joined_at', { ascending: false })
      .limit(5);
    if (Array.isArray(data) && data.length && typeof localStorage !== 'undefined') {
      const mapped = data.map((r) => ({
        id: r.challenge_id,
        title: r.title,
        joined_at: r.joined_at,
        ends_at: r.ends_at,
        streak_days: r.streak_days,
        last_checkin: r.last_checkin,
        success_rate: r.success_rate,
      }));
      localStorage.setItem('monefyi_community_challenges', JSON.stringify(mapped));
      localStorage.setItem(LS_SYNCED, String(Date.now()));
      return mapped;
    }
  } catch (e) {
    console.warn('[community-store] pull challenges', e);
  }
  return [];
}

if (typeof window !== 'undefined') {
  window.monefyiCommunityStore = {
    syncChallengeJoin,
    syncChallengeCheckin,
    syncReferralProfile,
    syncBuddyPair,
    syncBuddyMessage,
    loadBuddyThreadMessages,
    reportForumContent,
    pullRemoteChallenges,
  };
}
