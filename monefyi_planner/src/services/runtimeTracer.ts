import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';

export type TraceSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface RuntimeTracePayload {
  component?: string;
  message?: string;
  stack_trace?: string;
  metadata?: Record<string, unknown>;
  tenant_id?: string;
  user_id?: string;
}

const QUEUE_KEY = 'monefyi_runtime_trace_queue';
const FLUSH_MS = 30_000;
const SESSION_KEY = 'monefyi_trace_session';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERMANENT_TRACE_CODES = new Set([
  '42501',
  '22P02',
  '23502',
  '23503',
  '23514',
  'PGRST301',
  'PGRST302',
]);

let sessionId = '';
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;
let flushing = false;

export function isValidUuid(val: unknown): val is string {
  return typeof val === 'string' && UUID_RE.test(val);
}

export function isPermanentTraceError(error: unknown, status?: number): boolean {
  if (typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return true;
  }
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: unknown; message?: unknown; status?: unknown };
  const errStatus = typeof err.status === 'number' ? err.status : undefined;
  if (typeof errStatus === 'number' && errStatus >= 400 && errStatus < 500 && errStatus !== 408 && errStatus !== 429) {
    return true;
  }
  const code = String(err.code || '').toUpperCase();
  if (PERMANENT_TRACE_CODES.has(code)) return true;
  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('row-level security')
    || msg.includes('permission denied')
    || msg.includes('insufficient_privilege')
    || msg.includes('unauthorized')
    || msg.includes('forbidden')
    || msg.includes('invalid input syntax')
    || /\b(400|401|403|404)\b/.test(msg)
  );
}

function getSessionId() {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY) || crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    sessionId = crypto.randomUUID();
  }
  return sessionId;
}

function deviceInfo() {
  return {
    ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
    lang: typeof navigator !== 'undefined' ? navigator.language : '',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}

function maskMetadata(meta: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (/email|phone|token|password|key/i.test(k)) continue;
    if (typeof v === 'string' && v.includes('@')) continue;
    out[k] = v;
  }
  return out;
}

function readQueue(): Array<Record<string, unknown>> {
  try {
    if (typeof localStorage === 'undefined') return [];
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: Array<Record<string, unknown>>) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (items.length === 0) {
      localStorage.removeItem(QUEUE_KEY);
    } else {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-100)));
    }
  } catch {
    /* ignore */
  }
}

function isRowValidForUser(item: Record<string, unknown>, sessionUserId: string): boolean {
  const rowUserId = item.user_id;
  const rowTenantId = item.tenant_id;
  if (rowUserId != null && rowUserId !== sessionUserId) return false;
  if (rowUserId != null && !isValidUuid(rowUserId)) return false;
  if (rowTenantId != null && !isValidUuid(rowTenantId)) return false;
  return true;
}

export function clearRuntimeTraceQueue(userId?: string): void {
  if (!userId) {
    writeQueue([]);
    return;
  }
  const filtered = readQueue().filter((item) => {
    if (item.user_id === userId) return false;
    if (item.user_id != null && !isValidUuid(item.user_id)) return false;
    if (item.tenant_id != null && !isValidUuid(item.tenant_id)) return false;
    return true;
  });
  writeQueue(filtered);
}

export function pruneTraceQueueForUser(userId: string): void {
  if (!isValidUuid(userId)) {
    writeQueue([]);
    return;
  }
  const filtered = readQueue().filter((item) => isRowValidForUser(item, userId));
  writeQueue(filtered);
}

export async function flushQueue(): Promise<void> {
  if (flushing) return;
  const store = useAppStore.getState();
  if (store.isDemoMode || store.tenant?.id === 'demo') return;

  const queue = readQueue();
  if (!queue.length) return;

  flushing = true;
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    const sessionUserId = sessionData?.session?.user?.id;
    if (sessionErr || !isValidUuid(sessionUserId)) {
      // Hapus item non-UUID/demo sambil menunggu sesi valid; jangan POST tanpa JWT.
      const sanitized = queue.filter(
        (item) =>
          (item.user_id == null || isValidUuid(item.user_id))
          && (item.tenant_id == null || isValidUuid(item.tenant_id)),
      );
      if (sanitized.length !== queue.length) writeQueue(sanitized);
      return;
    }

    const validQueue = queue.filter((item) => isRowValidForUser(item, sessionUserId));
    if (validQueue.length !== queue.length) {
      writeQueue(validQueue);
    }
    if (!validQueue.length) return;

    const batch = validQueue.slice(0, 20);
    const rest = validQueue.slice(20);
    writeQueue(rest);

    const { error, status } = await supabase.from('runtime_traces').insert(batch);
    if (error) {
      if (!isPermanentTraceError(error, status)) {
        writeQueue([...batch, ...readQueue()].slice(-100));
      }
    }
  } catch {
    /* ignore transient flush errors */
  } finally {
    flushing = false;
  }
}

export function logTrace(
  eventType: string,
  payload: RuntimeTracePayload = {},
  severity: TraceSeverity = 'info',
) {
  const store = useAppStore.getState();
  if (store.isDemoMode || store.tenant?.id === 'demo') return;

  const rawTenantId = payload.tenant_id ?? store.tenant?.id ?? null;
  const rawUserId = payload.user_id ?? store.user?.id ?? null;
  if (rawTenantId === 'demo' || rawUserId === 'demo') return;
  if (rawUserId != null && !isValidUuid(rawUserId)) return;
  if (!rawUserId && !store.isAuthenticated) return;

  const safeTenantId = isValidUuid(rawTenantId) ? rawTenantId : null;
  const safeUserId = isValidUuid(rawUserId) ? rawUserId : null;

  const row = {
    tenant_id: safeTenantId,
    user_id: safeUserId,
    event_type: eventType,
    severity,
    component: payload.component,
    message: payload.message?.slice(0, 2000),
    stack_trace: payload.stack_trace?.slice(0, 8000),
    metadata: maskMetadata(payload.metadata || {}),
    device_info: deviceInfo(),
    session_id: getSessionId(),
  };

  const queue = readQueue();
  queue.push(row);
  writeQueue(queue);

  if (severity === 'critical') void flushQueue();
}

export function logSessionExpired(wasManual: boolean) {
  logTrace('session_expired', {
    component: 'useBootstrap',
    message: wasManual ? 'User signed out manually' : 'Session expired or signed out',
    metadata: { was_manual: wasManual },
  }, wasManual ? 'info' : 'warning');
}

export function initRuntimeTracer() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', ev => {
    logTrace('uncaught_error', {
      component: 'window',
      message: ev.message,
      stack_trace: ev.error?.stack,
      metadata: { filename: ev.filename, lineno: ev.lineno },
    }, 'error');
  });

  window.addEventListener('unhandledrejection', ev => {
    const reason = ev.reason;
    logTrace('unhandled_rejection', {
      component: 'window',
      message: reason instanceof Error ? reason.message : String(reason),
      stack_trace: reason instanceof Error ? reason.stack : undefined,
    }, 'error');
  });

  flushTimer = setInterval(() => void flushQueue(), FLUSH_MS);
  void flushQueue();
}

export function destroyRuntimeTracer() {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  void flushQueue();
}

export interface RuntimeTraceRow {
  id: string;
  tenant_id?: string | null;
  user_id?: string | null;
  event_type: string;
  severity: TraceSeverity;
  component?: string | null;
  message?: string | null;
  stack_trace?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export async function fetchRuntimeTraces(opts?: {
  limit?: number;
  severity?: TraceSeverity;
  event_type?: string;
  hours?: number;
}): Promise<RuntimeTraceRow[]> {
  const store = useAppStore.getState();
  if (store.isDemoMode || store.tenant?.id === 'demo') return [];
  const since = new Date(Date.now() - (opts?.hours ?? 24) * 3600000).toISOString();
  let q = supabase
    .from('runtime_traces')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100);

  if (opts?.severity) q = q.eq('severity', opts.severity);
  if (opts?.event_type) q = q.eq('event_type', opts.event_type);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as RuntimeTraceRow[];
}
