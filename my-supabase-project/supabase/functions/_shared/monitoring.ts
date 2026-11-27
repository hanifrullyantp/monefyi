/**
 * Observability & Monitoring untuk Agent Edge Functions.
 * Mendukung Sentry dan DataDog melalui variabel lingkungan.
 * Semua event dikirim sebagai structured JSON logs + optional remote telemetry.
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

/** Kirim event ke Sentry via HTTP envelope (fallback jika SDK tidak tersedia). */
async function sendToSentry(event: MonitorEvent): Promise<void> {
  if (!isSentryConfigured) return;
  try {
    const envelope = JSON.stringify({
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level: event.level,
      message: event.message,
      tags: {
        org_id: event.org_id ?? "unknown",
        sop_id: event.sop_id ?? "none",
        tier: event.tier ?? "none",
        autonomy: event.autonomy ?? "none",
        environment: SENTRY_ENV,
      },
      extra: {
        user_id: event.user_id,
        run_id: event.run_id,
        latency_ms: event.latency_ms,
        tokens_used: event.tokens_used,
        cost_idr: event.cost_idr,
        error_code: event.error_code,
        metadata: event.metadata,
      },
    });
    await fetch(`${SENTRY_DSN}/api/${SENTRY_DSN.split("/").pop()}/envelope/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: envelope,
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

/** Catat event monitoring ke console (structured log) + remote telemetry. */
export function monitorEvent(event: MonitorEvent): void {
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
    cost_idr: event.cost_idr,
    error_code: event.error_code,
    error_message: event.error_message,
    message: event.message,
    metadata: event.metadata,
  };
  console.log(JSON.stringify(logEntry));

  // Fire-and-forget ke remote telemetry
  void sendToSentry(event);
  void sendToDatadog(event);
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
