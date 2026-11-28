/**
 * Observability & Monitoring untuk Agent Edge Functions.
 * Mendukung Sentry dan DataDog melalui variabel lingkungan.
 * Semua event dikirim sebagai structured JSON logs + optional remote telemetry
 * setelah disanitasi dari PII, nominal sensitif, dan teks mentah pengguna (H-AUD-11).
 */

export type MonitorLevel = "debug" | "info" | "warn" | "error" | "critical";

export interface MonitorEvent {
  level: MonitorLevel;
  message: string;
  org_id?: string;
  user_id?: string;
  run_id?: string;
  sop_id?: string;
  tier?: string;
  autonomy?: string;
  latency_ms?: number;
  tokens_used?: number;
  cost_idr?: number;
  error_code?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

const SENTRY_DSN = Deno.env.get("SENTRY_DSN");
const DD_API_KEY = Deno.env.get("DD_API_KEY");
const DD_ENV = Deno.env.get("DD_ENV") || "production";
const DD_SERVICE = Deno.env.get("DD_SERVICE") || "monefyi-agent";
const SENTRY_ENV = Deno.env.get("SENTRY_ENV") || "production";

const isSentryConfigured = Boolean(SENTRY_DSN);
const isDatadogConfigured = Boolean(DD_API_KEY);

const FORBIDDEN_PII_KEYS = new Set([
  "input",
  "rawtext",
  "raw_text",
  "text",
  "prompt",
  "note",
  "reason",
  "phone",
  "email",
  "name",
  "worker_name",
  "employee",
  "amount",
  "total",
  "salary",
]);

function scrubPiiString(value: string): string {
  return value
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[redacted_email]")
    .replace(/\b(?:\+?62|0)8[1-9][0-9]{6,10}\b/g, "[redacted_phone]")
    .replace(/\b(?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+(?:\s*(?:juta|jt|ribu|rb|miliar|m))?\b/gi, "[redacted_amount]");
}

/** Sanitasi metadata telemetri agar tidak pernah mengirim kalimat input mentah, PII, nama pekerja, atau nominal ke Sentry/log (H-AUD-11). */
export function sanitizeMonitorMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(metadata)) {
    if (FORBIDDEN_PII_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (typeof val === "string") {
      clean[key] = scrubPiiString(val).slice(0, 200);
    } else if (typeof val === "number" || typeof val === "boolean" || val === null) {
      clean[key] = val;
    }
  }
  return clean;
}

/** Parse Sentry DSN (`https://<public_key>@<host>/<project_id>`) menjadi endpoint `/api/<project_id>/envelope/` dan header `X-Sentry-Auth` (H-AUD-11). */
export function parseSentryDsn(dsn: string): { envelopeUrl: string; authHeader: string } | null {
  try {
    const parsed = new URL(dsn);
    const publicKey = parsed.username;
    const projectId = parsed.pathname.replace(/^\/+|\/+$/g, "");
    if (!publicKey || !projectId) return null;
    const basePath = parsed.pathname.split("/").slice(0, -1).join("/");
    const envelopeUrl = `${parsed.protocol}//${parsed.host}${basePath}/api/${projectId}/envelope/`;
    const authHeader = `Sentry sentry_version=7, sentry_client=monefyi-agent/1.0, sentry_key=${publicKey}`;
    return { envelopeUrl, authHeader };
  } catch {
    return null;
  }
}

/** Kirim event ke Sentry via HTTP envelope dengan DSN parser & X-Sentry-Auth yang benar. */
async function sendToSentry(event: MonitorEvent): Promise<void> {
  if (!isSentryConfigured || !SENTRY_DSN) return;
  const dsnInfo = parseSentryDsn(SENTRY_DSN);
  if (!dsnInfo) return;
  try {
    const safeMetadata = sanitizeMonitorMetadata(event.metadata);
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const envelopeHeader = JSON.stringify({
      event_id: eventId,
      sent_at: new Date().toISOString(),
      dsn: SENTRY_DSN,
    });
    const itemHeader = JSON.stringify({ type: "event" });
    const payload = JSON.stringify({
      event_id: eventId,
      timestamp: new Date().toISOString(),
      level: event.level,
      message: scrubPiiString(event.message),
      tags: {
        org_id: event.org_id ?? "unknown",
        sop_id: event.sop_id ?? "none",
        tier: event.tier ?? "none",
        autonomy: event.autonomy ?? "none",
        environment: SENTRY_ENV,
      },
      extra: {
        run_id: event.run_id,
        latency_ms: event.latency_ms,
        tokens_used: event.tokens_used,
        error_code: event.error_code,
        metadata: safeMetadata,
      },
    });
    const envelopeBody = `${envelopeHeader}\n${itemHeader}\n${payload}\n`;
    await fetch(dsnInfo.envelopeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": dsnInfo.authHeader,
      },
      body: envelopeBody,
    }).catch(() => {
      // Sentry gagal tidak boleh mengganggu alur utama
    });
  } catch {
    // swallow
  }
}

/** Kirim metrik ke DataDog via API. */
async function sendToDatadog(event: MonitorEvent): Promise<void> {
  if (!isDatadogConfigured) return;
  try {
    const series = [
      {
        metric: "monefyi.agent.run",
        type: "count",
        points: [[Date.now() / 1000, 1]],
        tags: [
          `env:${DD_ENV}`,
          `service:${DD_SERVICE}`,
          `org_id:${event.org_id ?? "unknown"}`,
          `sop_id:${event.sop_id ?? "none"}`,
          `tier:${event.tier ?? "none"}`,
          `autonomy:${event.autonomy ?? "none"}`,
          `level:${event.level}`,
          `status:${event.error_code ? "error" : "success"}`,
        ],
      },
      ...(event.latency_ms != null
        ? [
            {
              metric: "monefyi.agent.latency_ms",
              type: "gauge",
              points: [[Date.now() / 1000, event.latency_ms]],
              tags: [
                `env:${DD_ENV}`,
                `service:${DD_SERVICE}`,
                `org_id:${event.org_id ?? "unknown"}`,
                `sop_id:${event.sop_id ?? "none"}`,
              ],
            },
          ]
        : []),
      ...(event.tokens_used != null
        ? [
            {
              metric: "monefyi.agent.tokens",
              type: "count",
              points: [[Date.now() / 1000, event.tokens_used]],
              tags: [
                `env:${DD_ENV}`,
                `service:${DD_SERVICE}`,
                `org_id:${event.org_id ?? "unknown"}`,
              ],
            },
          ]
        : []),
    ];
    await fetch("https://api.datadoghq.com/api/v1/series", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": DD_API_KEY,
      },
      body: JSON.stringify({ series }),
    }).catch(() => {
      // DataDog gagal tidak boleh mengganggu alur utama
    });
  } catch {
    // swallow
  }
}

/** Catat event monitoring ke console (structured log) + remote telemetry dengan sanitasi PII. */
export function monitorEvent(event: MonitorEvent): void {
  const safeMetadata = sanitizeMonitorMetadata(event.metadata);
  const logEntry = {
    event: "agent_monitor",
    timestamp: new Date().toISOString(),
    level: event.level,
    org_id: event.org_id,
    user_id: event.user_id,
    run_id: event.run_id,
    sop_id: event.sop_id,
    tier: event.tier,
    autonomy: event.autonomy,
    latency_ms: event.latency_ms,
    tokens_used: event.tokens_used,
    error_code: event.error_code,
    error_message: event.error_message ? scrubPiiString(event.error_message) : undefined,
    message: scrubPiiString(event.message),
    metadata: safeMetadata,
  };
  console.log(JSON.stringify(logEntry));

  // Fire-and-forget ke remote telemetry
  void sendToSentry({ ...event, metadata: safeMetadata });
  void sendToDatadog({ ...event, metadata: safeMetadata });
}

/** Catat error ke monitoring. */
export function monitorError(
  error: unknown,
  context: Partial<MonitorEvent> & { org_id?: string; user_id?: string },
): void {
  const event: MonitorEvent = {
    level: "error",
    message: error instanceof Error ? error.message : String(error),
    error_code: (error as { code?: string })?.code ?? "unknown_error",
    error_message: error instanceof Error ? error.stack ?? String(error) : String(error),
    ...context,
  };
  monitorEvent(event);
}

/** Wrapper async yang otomatis memantau eksekusi dan melaporkan error. */
export async function monitorAsync<T>(
  fn: () => Promise<T>,
  event: Partial<MonitorEvent> & { operation: string; org_id?: string; user_id?: string },
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    monitorEvent({
      level: "info",
      message: `Berhasil: ${event.operation}`,
      org_id: event.org_id,
      user_id: event.user_id,
      run_id: event.run_id,
      sop_id: event.sop_id,
      tier: event.tier,
      autonomy: event.autonomy,
      latency_ms: Date.now() - startedAt,
      metadata: { operation: event.operation, status: "success" },
    });
    return result;
  } catch (error) {
    monitorError(error, {
      org_id: event.org_id,
      user_id: event.user_id,
      run_id: event.run_id,
      sop_id: event.sop_id,
      tier: event.tier,
      autonomy: event.autonomy,
      latency_ms: Date.now() - startedAt,
      message: `Gagal: ${event.operation}`,
    });
    throw error;
  }
}

/** Cek apakah setidaknya satu penyedia observasi dikonfigurasi. */
export function isObservabilityConfigured(): boolean {
  return isSentryConfigured || isDatadogConfigured;
}

/** Dapatkan konfigurasi observasi untuk logging diagnostik. */
export function getObservabilityConfig(): {
  sentry: boolean;
  datadog: boolean;
  environment: string;
  service: string;
} {
  return {
    sentry: isSentryConfigured,
    datadog: isDatadogConfigured,
    environment: SENTRY_ENV,
    service: DD_SERVICE,
  };
}
