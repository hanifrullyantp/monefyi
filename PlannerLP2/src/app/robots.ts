import type { MetadataRoute } from "next";
import { PLANNER_ORIGIN } from "@/lib/config/publicHosts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: `${PLANNER_ORIGIN}/sitemap.xml`,
  };
}
