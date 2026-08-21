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

/** SPA backend (Vercel project monefyi-planner) — proxied as planner.monefyi.com/app */
const plannerAppOrigin = resolveOrigin(
  "PLANNER_APP_ORIGIN",
  "https://monefyi-planner.vercel.app",
);

/** Landing v1 backend — proxied as planner.monefyi.com/lp2 */
const plannerLandingOrigin = resolveOrigin(
  "PLANNER_LANDING_ORIGIN",
  "https://planner-landing-henna.vercel.app",
);

const publicPlannerUrl =
  process.env.NEXT_PUBLIC_PLANNER_APP_URL?.trim()?.replace(/\/$/, "") ||
  "https://planner.monefyi.com";

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
    return [
      { source: lp, destination: `${plannerLandingOrigin}${lp}` },
      { source: `${lp}/:path*`, destination: `${plannerLandingOrigin}${lp}/:path*` },
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
  },
};

export default nextConfig;
