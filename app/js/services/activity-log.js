/**
 * Local activity history — last 100 actions in IndexedDB.
 * @module services/activity-log
 */

import { getDb } from './offline-db.js';

const MAX_ENTRIES = 100;

/**
 * @param {object} entry
 * @param {string} entry.action
 * @param {string} [entry.entityType]
 * @param {string} [entry.entityId]
 * @param {string} [entry.summary]
 * @param {object} [entry.meta]
 */
export async function logActivity(entry) {
  try {
    const db = await getDb();
    if (!db.activity_log) return;

    await db.activity_log.add({
      action: entry.action,
      entityType: entry.entityType || 'transaction',
      entityId: entry.entityId || null,
      summary: entry.summary || '',
      meta: entry.meta || {},
      createdAt: new Date().toISOString(),
    });

    const count = await db.activity_log.count();
    if (count > MAX_ENTRIES) {
      const excess = count - MAX_ENTRIES;
      const oldest = await db.activity_log.orderBy('id').limit(excess).toArray();
      await db.activity_log.bulkDelete(oldest.map((e) => e.id));
    }

    window.dispatchEvent(new CustomEvent('monefyi-activity-change'));
  } catch (e) {
    console.warn('[activity] log failed:', e.message);
  }
}

/**
 * @param {number} [limit]
 * @returns {Promise<object[]>}
 */
export async function getActivityLog(limit = MAX_ENTRIES) {
  try {
    const db = await getDb();
    if (!db.activity_log) return [];
    const items = await db.activity_log.orderBy('id').reverse().limit(limit).toArray();
    return items;
  } catch {
    return [];
  }
}

if (typeof window !== 'undefined') {
  window.monefyiActivity = { logActivity, getActivityLog };
}
