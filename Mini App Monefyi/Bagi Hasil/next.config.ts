import type { NextConfig } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "/bonus/bagi-hasil").replace(/\/$/, "");

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: `${basePath}/`,
};

export default nextConfig;
