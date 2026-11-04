import type { NextConfig } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/bonus/debt-free").replace(/\/$/, "");

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: `${basePath}/`,
};

export default nextConfig;
