import type { MetadataRoute } from "next";
import { PLANNER_ORIGIN } from "@/lib/config/publicHosts";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${PLANNER_ORIGIN}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${PLANNER_ORIGIN}/pilih`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
