import type { NextConfig } from "next";

/**
 * Build statis untuk disalin ke PlannerLP2/public/bonus/mini/{slug}/
 * Env: BONUS_EMBED_BASEPATH=/bonus/mini/salary BONUS_STATIC_EXPORT=true
 */
export function bonusEmbedNextConfig(extra: NextConfig = {}): NextConfig {
  const embedPath = (process.env.BONUS_EMBED_BASEPATH || "").replace(/\/$/, "");
  const isExport = process.env.BONUS_STATIC_EXPORT === "true";

  return {
    ...extra,
    ...(isExport ? { output: "export" as const } : {}),
    trailingSlash: true,
    images: { unoptimized: true },
    ...(embedPath
      ? {
          basePath: embedPath,
          assetPrefix: `${embedPath}/`,
        }
      : {}),
  };
}
