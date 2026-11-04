const embedPath = (process.env.BONUS_EMBED_BASEPATH || "").replace(/\/$/, "");
const isExport = process.env.BONUS_STATIC_EXPORT === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isExport ? { output: "export" } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  ...(embedPath ? { basePath: embedPath, assetPrefix: `${embedPath}/` } : {}),
};

module.exports = nextConfig;

