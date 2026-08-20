import type { NextConfig } from "next";

const plannerAppOrigin = (
  process.env.PLANNER_APP_ORIGIN || "https://planner.monefyi.com"
).replace(/\/$/, "");

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
