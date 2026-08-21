import type { NextConfig } from "next";

/** Landing v1 — served at planner.monefyi.com/lp2 via planner-lp2 rewrites. */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/lp2").replace(/\/$/, "") || "/lp2";

function resolvePlannerAppOrigin(): string {
  const raw =
    process.env.PLANNER_APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_PLANNER_APP_URL?.trim() ||
    "https://monefyi-planner.vercel.app";
  const normalized = raw.replace(/\/$/, "");
  if (normalized.includes("SENSITIVE")) return "https://monefyi-planner.vercel.app";
  return normalized.startsWith("http") ? normalized : `https://${normalized}`;
}

const plannerAppOrigin = resolvePlannerAppOrigin();
const publicPlannerUrl =
  process.env.NEXT_PUBLIC_PLANNER_APP_URL?.trim()?.replace(/\/$/, "") ||
  "https://planner.monefyi.com";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_PLANNER_APP_URL: publicPlannerUrl,
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  async rewrites() {
    return [
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
