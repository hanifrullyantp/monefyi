/**
 * Wallet & bank sync registry — connection metadata (Fase 7.2).
 * @module services/wallet-sync-registry
 */

const LS_CONNECTIONS = 'monefyi_wallet_connections';

/** @type {object[]} */
export const WALLET_PROVIDERS = [
  { id: 'bca', name: 'BCA', category: 'bank', methods: ['email'], apiStatus: 'planned', icon: '🏦' },
  { id: 'mandiri', name: 'Mandiri', category: 'bank', methods: ['email'], apiStatus: 'planned', icon: '🏦' },
  { id: 'bni', name: 'BNI', category: 'bank', methods: ['email'], apiStatus: 'planned', icon: '🏦' },
  { id: 'bri', name: 'BRI', category: 'bank', methods: ['email'], apiStatus: 'planned', icon: '🏦' },
  { id: 'gopay', name: 'GoPay', category: 'ewallet', methods: ['email'], apiStatus: 'exploring', icon: '💚' },
  { id: 'ovo', name: 'OVO', category: 'ewallet', methods: ['email'], apiStatus: 'exploring', icon: '💜' },
  { id: 'dana', name: 'DANA', category: 'ewallet', methods: ['email'], apiStatus: 'exploring', icon: '💙' },
  { id: 'shopeepay', name: 'ShopeePay', category: 'ewallet', methods: ['email'], apiStatus: 'exploring', icon: '🧡' },
  { id: 'linkaja', name: 'LinkAja', category: 'ewallet', methods: ['email'], apiStatus: 'exploring', icon: '🔴' },
  { id: 'kredivo', name: 'Kredivo', category: 'paylater', methods: ['email', 'manual'], apiStatus: 'manual', icon: '💳' },
  { id: 'akulaku', name: 'Akulaku', category: 'paylater', methods: ['email', 'manual'], apiStatus: 'manual', icon: '💳' },
];

/**
 * @returns {Record<string, object>}
 */
export function loadWalletConnections() {
  try {
    return JSON.parse(localStorage.getItem(LS_CONNECTIONS) || '{}');
  } catch {
    return {};
  }
}

/**
 * @param {string} providerId
 * @param {object} data
 */
export function saveWalletConnection(providerId, data) {
  const all = loadWalletConnections();
  all[providerId] = {
    provider_id: providerId,
    method: data.method || 'email',
    account_label: data.account_label || '',
    linked_at: data.linked_at || new Date().toISOString(),
    last_sync_at: data.last_sync_at || null,
    status: data.status || 'active',
  };
  localStorage.setItem(LS_CONNECTIONS, JSON.stringify(all));
  return all[providerId];
}

/**
 * @param {string} providerId
 */
export function removeWalletConnection(providerId) {
  const all = loadWalletConnections();
  delete all[providerId];
  localStorage.setItem(LS_CONNECTIONS, JSON.stringify(all));
}

/**
 * @returns {object}
 */
export function getIntegrationSummary() {
  const connections = loadWalletConnections();
  const linked = Object.values(connections).filter((c) => c.status === 'active');
  const emailLinked = linked.filter((c) => c.method === 'email').length;
  const manualLinked = linked.filter((c) => c.method === 'manual').length;

  return {
    total_providers: WALLET_PROVIDERS.length,
    linked_count: linked.length,
    email_linked: emailLinked,
    manual_linked: manualLinked,
    api_coming: WALLET_PROVIDERS.filter((p) => p.apiStatus === 'planned' || p.apiStatus === 'exploring').length,
    providers: WALLET_PROVIDERS.map((p) => ({
      ...p,
      connection: connections[p.id] || null,
      is_linked: !!connections[p.id],
    })),
  };
}

/**
 * Mark sync timestamp for a provider (e.g. after email import confirm).
 * @param {string} providerId
 */
export function touchWalletSync(providerId) {
  const all = loadWalletConnections();
  if (!all[providerId]) return;
  all[providerId].last_sync_at = new Date().toISOString();
  localStorage.setItem(LS_CONNECTIONS, JSON.stringify(all));
}

if (typeof window !== 'undefined') {
  window.monefyiWalletSync = {
    WALLET_PROVIDERS,
    loadWalletConnections,
    saveWalletConnection,
    removeWalletConnection,
    getIntegrationSummary,
    touchWalletSync,
  };
}
