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

let sessionId = '';
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

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
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(items: Array<Record<string, unknown>>) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-100)));
  } catch {
    /* ignore */
  }
}

async function flushQueue() {
  const queue = readQueue();
  if (!queue.length) return;

  const batch = queue.splice(0, 20);
  writeQueue(queue);

  const { error } = await supabase.from('runtime_traces').insert(batch);
  if (error) {
    writeQueue([...batch, ...readQueue()].slice(-100));
  }
}

export function logTrace(
  eventType: string,
  payload: RuntimeTracePayload = {},
  severity: TraceSeverity = 'info',
) {
  const store = useAppStore.getState();
  const row = {
    tenant_id: payload.tenant_id ?? store.tenant?.id ?? null,
    user_id: payload.user_id ?? store.user?.id ?? null,
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
