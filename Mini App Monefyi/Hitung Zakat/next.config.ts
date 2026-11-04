import type { NextConfig } from "next";

const embedPath = (process.env.BONUS_EMBED_BASEPATH || "").replace(/\/$/, "");
const isExport = process.env.BONUS_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  ...(isExport ? { output: "export" as const } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  ...(embedPath ? { basePath: embedPath, assetPrefix: `${embedPath}/` } : {}),
};

export default nextConfig;
