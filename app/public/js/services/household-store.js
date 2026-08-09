/**
 * Household Supabase store — create, invite, join.
 * Falls back to localStorage via household-mode.js when offline.
 * @module services/household-store
 */

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
 * @param {string} name
 * @returns {Promise<object|null>}
 */
export async function createHouseholdRemote(name) {
  const client = supa();
  const uid = userId();
  if (!client || !uid) return null;

  const { data, error } = await client.rpc('create_household', { p_name: name || 'Keluarga' });
  if (error) throw error;

  return fetchHouseholdSummary(data);
}

/**
 * @param {string} householdId
 * @returns {Promise<string|null>}
 */
export async function createInviteRemote(householdId) {
  const client = supa();
  if (!client || !householdId) return null;

  const { data, error } = await client.rpc('create_household_invite', { p_household_id: householdId });
  if (error) throw error;
  return data;
}

/**
 * @param {string} code
 * @returns {Promise<object|null>}
 */
export async function joinHouseholdRemote(code) {
  const client = supa();
  if (!client) return null;

  const { data, error } = await client.rpc('join_household_by_code', { p_code: code });
  if (error) throw error;

  return fetchHouseholdSummary(data);
}

/**
 * @returns {Promise<object|null>}
 */
export async function fetchMyHousehold() {
  const client = supa();
  const uid = userId();
  if (!client || !uid) return null;

  const { data: members, error } = await client
    .from('household_members')
    .select('household_id, role, status, households(id, name, owner_user_id, max_members, subscription_type, created_at)')
    .eq('user_id', uid)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !members?.households) return null;
  return fetchHouseholdSummary(members.household_id);
}

/**
 * @param {string} householdId
 * @returns {Promise<object|null>}
 */
async function fetchHouseholdSummary(householdId) {
  const client = supa();
  if (!client || !householdId) return null;

  const [{ data: hh }, { data: mems }, { data: invites }] = await Promise.all([
    client.from('households').select('*').eq('id', householdId).maybeSingle(),
    client.from('household_members').select('user_id, role, status, joined_at').eq('household_id', householdId).eq('status', 'active'),
    client.from('household_invitations').select('invite_code, expires_at, used_by').eq('household_id', householdId).is('used_by', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1),
  ]);

  if (!hh) return null;

  const invite = invites?.[0];
  return {
    id: hh.id,
    name: hh.name,
    owner_user_id: hh.owner_user_id,
    max_members: hh.max_members,
    subscription_type: hh.subscription_type,
    invite_code: invite?.invite_code || null,
    invite_expires_at: invite?.expires_at || null,
    members: (mems || []).map((m, i) => ({
      id: m.user_id,
      user_id: m.user_id,
      role: m.role,
      name: m.user_id === userId() ? (window.STATE?.db?.profile?.name || 'Saya') : `Member ${i + 1}`,
    })),
    created_at: hh.created_at,
    remote: true,
  };
}

/**
 * Sync remote household to localStorage cache for offline UI.
 * @param {object|null} hh
 */
export function cacheHouseholdLocally(hh) {
  if (!hh) {
    localStorage.removeItem('monefyi_household');
    return;
  }
  localStorage.setItem('monefyi_household', JSON.stringify(hh));
}

/**
 * Hydrate household from Supabase on boot.
 * @returns {Promise<object|null>}
 */
export async function syncHouseholdFromRemote() {
  try {
    const remote = await fetchMyHousehold();
    if (remote) {
      cacheHouseholdLocally(remote);
      return remote;
    }
  } catch (e) {
    console.warn('[household-store] sync failed', e);
  }
  return null;
}

if (typeof window !== 'undefined') {
  window.monefyiHouseholdStore = {
    createHouseholdRemote,
    createInviteRemote,
    joinHouseholdRemote,
    fetchMyHousehold,
    syncHouseholdFromRemote,
    cacheHouseholdLocally,
  };
}
