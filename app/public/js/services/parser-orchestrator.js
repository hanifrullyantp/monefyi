/**
 * Parser Orchestrator: Local First, AI Last, Queue Never Rejects.
 * @module services/parser-orchestrator
 */

import { normalizeInput } from '../parsers/normalize.js';
import { L2_applyRules } from '../parsers/rules.js';
import { queryLocalMemory } from './memory.js';

const THRESHOLDS = {
  MEMORY: 0.9,
  RULES: 0.75,
  LOCAL_AI: 0.7,
  SERVER_AI: 0.65,
};

/**
 * @returns {boolean}
 */
function isOnline() {
  if (typeof window !== 'undefined' && window.monefyiConnectivity?.isOnline) {
    return window.monefyiConnectivity.isOnline();
  }
  return navigator.onLine;
}

/**
 * @returns {string}
 */
function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * @param {string} source
 * @param {object} transaction
 * @param {number} startTime
 * @param {number} [confidence]
 */
function successResult(source, transaction, startTime, confidence) {
  return {
    status: 'parsed',
    source,
    confidence: confidence ?? transaction.confidence ?? transaction.meta?.confidence,
    latency: Date.now() - startTime,
    transaction,
  };
}

/**
 * Build transaction object from pipeline hit using app helpers when available.
 * @param {string} text
 * @param {object} result
 * @param {string} provider
 */
function buildTxFromPipelineResult(text, result, provider) {
  const helpers = typeof window !== 'undefined' ? window.monefyiParseHelpers : null;
  if (helpers?.buildTxFromPipelineResult) {
    return helpers.buildTxFromPipelineResult(text, result, provider);
  }

  const now = new Date().toISOString();
  const parsedAmount = Number(result.amount);

  return {
    id: newId(),
    date: result.date || todayISO(),
    type: result.type || 'expense',
    amount: parsedAmount > 0 ? parsedAmount : 0,
    currency: 'IDR',
    category: result.category || 'Lainnya',
    subcategory: '',
    account: result.account || 'Cash',
    merchant: result.merchant || '',
    payment_method: result.account || 'Cash',
    notes: result.notes || '',
    rawInput: text,
    original: text,
    created_at: now,
    updated_at: now,
    meta: {
      source: 'quick',
      parsed: true,
      provider,
      confidence: result.confidence ?? 0.8,
      matchedRules: result.matchedRules ?? [],
      pipelineFlags: result.flags ?? [],
    },
  };
}

/**
 * @param {string} rawText
 */
async function tryLocalAI(rawText) {
  if (typeof window === 'undefined' || typeof window.ai?.languageModel === 'undefined') {
    return null;
  }

  const cap = await window.ai.languageModel.capabilities();
  if (cap.available !== 'readily') return null;

  const session = await window.ai.languageModel.create({
    systemPrompt:
      'Parse Indonesian financial transaction. Reply ONLY JSON: {type,amount,category,account,merchant,confidence}',
  });

  const result = await session.prompt(`Parse: "${rawText}"`);
  session.destroy();

  const parsed = JSON.parse(result);
  return { ...parsed, confidence: parsed.confidence || 0.75 };
}

/**
 * Server AI parse — exported for pending queue reprocessing.
 * @param {string} rawText
 * @param {string|null} [userId]
 */
export async function tryServerAI(rawText, userId) {
  const helpers = typeof window !== 'undefined' ? window.monefyiParseHelpers : null;
  if (helpers?.fetchServerAI) {
    const tx = await helpers.fetchServerAI(rawText, 'text');
    return tx;
  }

  const sb = window.__monefyiSupabase;
  const cfg = window.MONEFYI_CONFIG || {};
  const fnName = cfg.fnParse || 'asfin-parse-transaction';
  const supabaseUrl = String(cfg.supabaseUrl || '').replace(/\/+$/, '');

  if (!sb || !isOnline()) return null;

  const session = window.STATE?.db?.session;
  const token = session?.access_token;
  if (!token) return null;

  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: rawText, user_id: userId }),
  });

  if (!res.ok) return null;

  const obj = await res.json();
  const now = new Date().toISOString();

  return {
    id: newId(),
    date: obj.date || todayISO(),
    type: obj.type || 'expense',
    amount: Number(obj.amount || 0),
    currency: obj.currency || 'IDR',
    category: obj.category || 'Lainnya',
    subcategory: '',
    account: obj.account || obj.payment_method || 'Cash',
    merchant: obj.merchant || '',
    payment_method: obj.payment_method || obj.account || 'Cash',
    notes: obj.notes || rawText.trim(),
    rawInput: rawText,
    original: rawText,
    created_at: now,
    updated_at: now,
    meta: {
      source: 'quick',
      parsed: true,
      provider: 'supabase_edge',
      confidence: Number(obj.confidence ?? 0.85),
    },
  };
}

/**
 * @param {string} rawText
 * @param {object} [options]
 */
export async function parseTransaction(rawText, options = {}) {
  const start = Date.now();
  const userId = options.userId || window.STATE?.db?.user?.id || null;

  if (!rawText?.trim()) {
    return { status: 'error', error: 'Input kosong' };
  }

  let processedText = rawText;
  try {
    const { applyLearntPatterns } = await import('./correction-learner.js');
    processedText = await applyLearntPatterns(rawText);
  } catch {
    processedText = rawText;
  }

  const normalized = normalizeInput(processedText);

  try {
    const memHit = await queryLocalMemory(normalized);
    if (memHit?.confidence >= THRESHOLDS.MEMORY) {
      const tx = buildTxFromPipelineResult(rawText, memHit, 'memory');
      if (tx.amount > 0) return successResult('memory', tx, start, memHit.confidence);
    }
  } catch (e) {
    console.warn('[parser] Memory:', e.message);
  }

  try {
    const ruleHit = L2_applyRules(normalized);
    if (ruleHit?.confidence >= THRESHOLDS.RULES) {
      const tx = buildTxFromPipelineResult(rawText, ruleHit, 'rule');
      if (tx.amount > 0) return successResult('rules', tx, start, ruleHit.confidence);
    }
  } catch (e) {
    console.warn('[parser] Rules:', e.message);
  }

  if (options.tryLocalAI !== false) {
    try {
      const localHit = await tryLocalAI(rawText);
      if (localHit?.confidence >= THRESHOLDS.LOCAL_AI && Number(localHit.amount) > 0) {
        const tx = buildTxFromPipelineResult(rawText, localHit, 'local_ai');
        return successResult('local_ai', tx, start, localHit.confidence);
      }
    } catch (e) {
      console.warn('[parser] Local AI:', e.message);
    }
  }

  if (isOnline() && options.tryServerAI !== false) {
    try {
      const serverHit = await tryServerAI(rawText, userId);
      if (serverHit?.amount > 0 && (serverHit.meta?.confidence ?? 0.85) >= THRESHOLDS.SERVER_AI) {
        return successResult('server_ai', serverHit, start, serverHit.meta?.confidence);
      }
      if (serverHit?.amount > 0) {
        return successResult('server_ai', serverHit, start, serverHit.meta?.confidence);
      }
    } catch (e) {
      console.warn('[parser] Server AI:', e.message);
    }
  }

  const helpers = typeof window !== 'undefined' ? window.monefyiParseHelpers : null;
  if (helpers?.buildHeuristicTx) {
    const heuristic = helpers.buildHeuristicTx(rawText, { source: 'quick' });
    if (heuristic?.amount > 0) {
      return successResult('heuristic', heuristic, start, 0.6);
    }
  }

  const { addToPendingQueue } = await import('./pending-queue.js');
  const pendingId = await addToPendingQueue({
    rawText,
    normalized: normalized.text || String(normalized),
    userId,
    reason: isOnline() ? 'low_confidence' : 'offline',
  });

  const message = isOnline()
    ? 'Diproses di background...'
    : 'Tersimpan, akan diproses saat online';

  return {
    status: 'pending',
    source: 'queue',
    pendingId,
    latency: Date.now() - start,
    message,
    transaction: {
      id: newId(),
      type: 'expense',
      amount: 0,
      date: todayISO(),
      merchant: rawText.slice(0, 50),
      category: 'Belum dikategorikan',
      notes: `Draft: ${rawText}`,
      rawInput: rawText,
      original: rawText,
      currency: 'IDR',
      account: 'Cash',
      payment_method: 'Cash',
      meta: { source: 'quick', provider: 'pending', parsed: false },
      _isPending: true,
      _pendingId: pendingId,
    },
  };
}

if (typeof window !== 'undefined') {
  window.monefyiParser = { parseTransaction, tryServerAI };
}
