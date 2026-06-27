/**
 * @file js/services/metrics.js
 * @description Non-blocking parse metrics logging to Supabase `parse_events` table.
 *
 * Uses the app's existing Supabase client (`window.STATE.db.supa`) when available.
 * Injectable via `_setSupabaseClient` and `_setSessionStorage` for Deno tests.
 */

/** @typedef {'memory'|'rule'|'fuzzy'|'ai'|'manual'|'error'} ParserLayer */

/**
 * @typedef {Object} ParseMetricsSummary
 * @property {number} total
 * @property {{ memory: number, rule: number, ai: number, manual: number }} byLayer
 * @property {number} avgLatency
 * @property {string} zeroEditRate - Percentage string e.g. "85.0"
 * @property {string} memoryHitRate
 * @property {string} aiUsageRate
 */

/**
 * @typedef {Object} LogParseEventInput
 * @property {string} userId
 * @property {string} input - Raw user text
 * @property {Object} result - Parsed transaction or ParseResult
 * @property {number} latency - Elapsed ms since parse started
 * @property {'new'|'legacy'} [pipeline] - Pipeline variant used
 */

const SESSION_STORAGE_KEY = 'monefyi_session_id';

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
let _supabaseClient = null;

/** @type {Storage|null} */
let _sessionStorage = typeof sessionStorage !== 'undefined' ? sessionStorage : null;

/**
 * Overrides the Supabase client used for metrics queries.
 * @param {import('@supabase/supabase-js').SupabaseClient|null} client
 */
export function _setSupabaseClient(client) {
  _supabaseClient = client;
}

/**
 * Overrides sessionStorage (for Deno tests / SSR).
 * @param {Storage|null} storage
 */
export function _setSessionStorage(storage) {
  _sessionStorage = storage;
}

/**
 * Resolves the Supabase client from injection hook or global app state.
 * @returns {import('@supabase/supabase-js').SupabaseClient|null}
 */
function resolveSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;

  if (typeof window !== 'undefined') {
    const fromState = window.STATE?.db?.supa;
    if (fromState) return fromState;

    const cfg = window.MONEFYI_CONFIG || {};
    const url = String(cfg.supabaseUrl || '').trim();
    const key = String(cfg.supabaseAnonKey || '').trim();
    if (url && key && window.supabase?.createClient) {
      return window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
    }
  }

  return null;
}

/**
 * Returns or creates a session-scoped UUID persisted in sessionStorage.
 * Second call within the same session returns the same value.
 * @returns {string} UUID v4 string
 */
export function getSessionId() {
  try {
    if (!_sessionStorage) {
      return crypto.randomUUID();
    }

    let sessionId = _sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      _sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch (err) {
    console.error('[metrics] getSessionId failed:', err);
    return crypto.randomUUID();
  }
}

/**
 * Maps a parse result object to a valid `parser_layer` enum value.
 * @param {Object} result
 * @returns {ParserLayer}
 */
function resolveParserLayer(result) {
  const source = result?.source ?? result?.meta?.provider ?? 'manual';

  const map = {
    memory: 'memory',
    rule: 'rule',
    fuzzy: 'fuzzy',
    ai: 'ai',
    manual: 'manual',
    error: 'error',
    supabase_edge: 'ai',
    heuristic: 'manual',
  };

  return /** @type {ParserLayer} */ (map[source] ?? 'manual');
}

/**
 * Extracts confidence from a transaction or ParseResult shape.
 * @param {Object} result
 * @returns {number|null}
 */
function resolveConfidence(result) {
  const raw = result?.confidence ?? result?.meta?.confidence;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : null;
}

/**
 * Extracts flags array from result.
 * @param {Object} result
 * @returns {string[]}
 */
function resolveFlags(result) {
  if (Array.isArray(result?.flags)) return result.flags;
  if (Array.isArray(result?.meta?.pipelineFlags)) return result.meta.pipelineFlags;
  return [];
}

/**
 * Validates minimum required fields for a log event.
 * @param {LogParseEventInput} event
 * @returns {boolean}
 */
function isValidLogEvent(event) {
  return Boolean(
    event &&
    typeof event.userId === 'string' &&
    event.userId.length > 0 &&
    typeof event.input === 'string' &&
    event.result &&
    typeof event.result === 'object',
  );
}

/**
 * Builds the database row payload from a log event.
 * @param {LogParseEventInput} event
 * @returns {Object}
 */
function buildInsertRow(event) {
  const result = event.result;
  const parsedJson = {
    ...result,
    _pipeline: event.pipeline ?? null,
  };

  return {
    user_id: event.userId,
    raw_input: event.input,
    input_channel: 'text',
    parser_layer: resolveParserLayer(result),
    confidence: resolveConfidence(result),
    parsed_json: parsedJson,
    latency_ms: Math.round(Number(event.latency) || 0),
    ai_tokens: Number(result._aiTokens ?? result.meta?._aiTokens ?? 0) || 0,
    flags: resolveFlags(result),
    session_id: getSessionId(),
  };
}

/**
 * Internal async insert — errors are caught by the public wrapper.
 * @param {LogParseEventInput} event
 * @returns {Promise<void>}
 */
async function logParseEventAsync(event) {
  if (!isValidLogEvent(event)) return;

  const supabase = resolveSupabaseClient();
  if (!supabase) return;

  const row = buildInsertRow(event);
  const { error } = await supabase.from('parse_events').insert(row);

  if (error) {
    console.error('[metrics] Failed to log parse event:', error.message);
  }
}

/**
 * Logs a parse event to `parse_events` (fire-and-forget).
 * Never throws — failures are logged to console.error only.
 *
 * @param {LogParseEventInput} event
 * @returns {Promise<void>} Resolves silently even on failure
 *
 * @example
 * logParseEvent({
 *   userId: 'uuid-here',
 *   input: 'kopi 25rb gopay',
 *   result: { source: 'rule', confidence: 0.85, type: 'expense', amount: 25000 },
 *   latency: 42,
 *   pipeline: 'new',
 * });
 */
export function logParseEvent(event) {
  return logParseEventAsync(event).catch((err) => {
    console.error('[metrics] logParseEvent error:', err);
  });
}

/**
 * Formats a ratio as a percentage string with one decimal place.
 * @param {number} numerator
 * @param {number} denominator
 * @returns {string}
 */
function formatRate(numerator, denominator) {
  if (!denominator) return '0.0';
  return ((numerator / denominator) * 100).toFixed(1);
}

/**
 * Fetches parse metrics for a user over the last N days.
 * @param {string} userId
 * @param {number} [days=30]
 * @returns {Promise<ParseMetricsSummary|null>}
 *
 * @example
 * const stats = await getParseMetrics(userId, 7);
 * console.log(stats?.memoryHitRate); // "42.5"
 */
export async function getParseMetrics(userId, days = 30) {
  if (!userId) return null;

  const supabase = resolveSupabaseClient();
  if (!supabase) {
    console.error('[metrics] getParseMetrics: Supabase client unavailable');
    return null;
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('parse_events')
      .select('parser_layer, confidence, latency_ms, edited_fields')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString());

    if (error) {
      console.error('[metrics] getParseMetrics failed:', error.message);
      return null;
    }

    const rows = data ?? [];
    const total = rows.length;

    /** @type {{ memory: number, rule: number, ai: number, manual: number }} */
    const byLayer = { memory: 0, rule: 0, ai: 0, manual: 0 };

    let totalLatency = 0;
    let zeroEditCount = 0;

    for (const row of rows) {
      const layer = row.parser_layer;
      if (layer in byLayer) {
        byLayer[/** @type {keyof typeof byLayer} */ (layer)] += 1;
      } else if (layer === 'fuzzy') {
        byLayer.rule += 1;
      } else if (layer === 'error') {
        byLayer.manual += 1;
      }

      totalLatency += Number(row.latency_ms) || 0;

      if (!row.edited_fields || row.edited_fields.length === 0) {
        zeroEditCount += 1;
      }
    }

    return {
      total,
      byLayer,
      avgLatency: total ? Math.round(totalLatency / total) : 0,
      zeroEditRate: formatRate(zeroEditCount, total),
      memoryHitRate: formatRate(byLayer.memory, total),
      aiUsageRate: formatRate(byLayer.ai, total),
    };
  } catch (err) {
    console.error('[metrics] getParseMetrics error:', err);
    return null;
  }
}

/** @internal Exported for unit tests */
export const _internal = {
  isValidLogEvent,
  buildInsertRow,
  resolveParserLayer,
  resolveConfidence,
  resolveFlags,
  SESSION_STORAGE_KEY,
};
