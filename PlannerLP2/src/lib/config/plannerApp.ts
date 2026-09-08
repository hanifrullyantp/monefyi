/** Public site origin (landing root). App lives at /app on same host. */
export function getPlannerAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PLANNER_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.ESTIMATOR_STANDALONE === "true") {
    return "https://estimator.monefyi.com";
  }
  return "https://planner.monefyi.com";
}

/**
 * Path ke Planner SPA (/app, /login, …).
 * Di browser: pakai path relatif agar session Supabase (localStorage) tetap
 * satu origin — landing + /app di-host sama (proxy Next → Vite).
 */
export function plannerAppPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    const configured = process.env.NEXT_PUBLIC_PLANNER_APP_URL?.replace(/\/$/, "");
    const origin = window.location.origin;

    if (!configured || configured === origin) {
      return normalized;
    }

    try {
      const cfg = new URL(configured);
      const cur = new URL(origin);
      if (
        cfg.hostname === cur.hostname &&
        cfg.port !== cur.port &&
        (cfg.port === "5173" || cfg.port === "4173" || cfg.port === "")
      ) {
        return normalized;
      }
    } catch {
      /* ignore */
    }

    return `${configured}${normalized}`;
  }

  return `${getPlannerAppOrigin()}${normalized}`;
}

/** URL redirect Lynk setelah pembayaran sukses (harus di bawah /app). */
export function plannerPaymentReturnPath(
  section: "estimator" | "app" = "estimator",
): string {
  const path = section === "app" ? "/app" : "/app/estimator";
  return plannerAppPath(`${path}?payment=success`);
}

/** Navigasi penuh ke app (reload SPA) — dipakai setelah login dari landing. */
export function navigateToPlannerApp(path = "/app"): void {
  if (typeof window === "undefined") return;
  window.location.assign(plannerAppPath(path));
}
