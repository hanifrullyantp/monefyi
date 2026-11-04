import type { NextConfig } from "next";

/** Deploy di subpath, mis. NEXT_PUBLIC_BASE_PATH=/bonus/budget */
export function withBonusBasePath(config: NextConfig = {}): NextConfig {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  if (!basePath) return config;
  return {
    ...config,
    basePath,
    assetPrefix: `${basePath}/`,
  };
}
