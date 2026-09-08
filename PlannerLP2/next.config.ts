import type { NextConfig } from "next";

function resolveOrigin(
  envKey: string,
  fallback: string,
): string {
  const raw = process.env[envKey]?.trim() || fallback;
  const normalized = raw.replace(/\/$/, "");
  if (!normalized || normalized.includes("SENSITIVE")) return fallback;
  return normalized.startsWith("http") ? normalized : `https://${normalized}`;
}

/** SPA backend (Vercel project monefyi-planner) — proxied as /app on public domain */
const plannerAppOrigin = resolveOrigin(
  "PLANNER_APP_ORIGIN",
  "https://monefyi-planner.vercel.app",
);

/** Landing v1 backend — proxied as /lp2 (skipped when ESTIMATOR_STANDALONE=true) */
const plannerLandingOrigin = resolveOrigin(
  "PLANNER_LANDING_ORIGIN",
  "https://planner-landing-henna.vercel.app",
);

const isEstimatorStandalone = process.env.ESTIMATOR_STANDALONE === "true";

const publicPlannerUrl =
  process.env.NEXT_PUBLIC_PLANNER_APP_URL?.trim()?.replace(/\/$/, "") ||
  (isEstimatorStandalone ? "https://estimator.monefyi.com" : "https://planner.monefyi.com");

const landingBasePath = (process.env.PLANNER_LANDING_BASE_PATH || "/lp2").replace(/\/$/, "") || "/lp2";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_PLANNER_APP_URL: publicPlannerUrl,
  },
  async rewrites() {
    const lp = landingBasePath;
    const spaRewrites = [
      { source: "/icons/:path*", destination: `${plannerAppOrigin}/icons/:path*` },
      { source: "/manifest.webmanifest", destination: `${plannerAppOrigin}/manifest.webmanifest` },
      { source: "/sw.js", destination: `${plannerAppOrigin}/sw.js` },
      { source: "/app", destination: `${plannerAppOrigin}/app` },
      { source: "/app/:path*", destination: `${plannerAppOrigin}/app/:path*` },
      { source: "/login", destination: `${plannerAppOrigin}/login` },
      { source: "/signup", destination: `${plannerAppOrigin}/signup` },
      { source: "/signup/:path*", destination: `${plannerAppOrigin}/signup/:path*` },
      { source: "/verify-email", destination: `${plannerAppOrigin}/verify-email` },
      { source: "/join", destination: `${plannerAppOrigin}/join` },
      { source: "/join-by-code", destination: `${plannerAppOrigin}/join-by-code` },
      { source: "/find-company", destination: `${plannerAppOrigin}/find-company` },
      { source: "/onboarding/:path*", destination: `${plannerAppOrigin}/onboarding/:path*` },
      { source: "/privacy", destination: `${plannerAppOrigin}/privacy` },
      { source: "/terms", destination: `${plannerAppOrigin}/terms` },
      { source: "/contact", destination: `${plannerAppOrigin}/contact` },
    ];
    if (isEstimatorStandalone) {
      return spaRewrites;
    }
    return [
      { source: lp, destination: `${plannerLandingOrigin}${lp}` },
      { source: `${lp}/:path*`, destination: `${plannerLandingOrigin}${lp}/:path*` },
      ...spaRewrites,
    ];
  },
};

export default nextConfig;
