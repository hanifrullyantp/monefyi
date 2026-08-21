import type { NextConfig } from "next";

function resolvePlannerAppOrigin(): string {
  const raw =
    process.env.PLANNER_APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_PLANNER_APP_URL?.trim() ||
    "https://app.planner.monefyi.com";
  const withoutTrailing = raw.replace(/\/$/, "");
  if (withoutTrailing.startsWith("http://") || withoutTrailing.startsWith("https://")) {
    return withoutTrailing;
  }
  if (!withoutTrailing || withoutTrailing.includes("SENSITIVE")) {
    return "https://app.planner.monefyi.com";
  }
  return `https://${withoutTrailing}`;
}

const plannerAppOrigin = resolvePlannerAppOrigin();

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  env: {
    NEXT_PUBLIC_PLANNER_APP_URL: plannerAppOrigin,
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
