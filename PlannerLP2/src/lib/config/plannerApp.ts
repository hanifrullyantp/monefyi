/** Public site origin (landing root). App lives at /app on same host. */
export function getPlannerAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_PLANNER_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://planner.monefyi.com";
}

export function plannerAppPath(path: string): string {
  const base = getPlannerAppOrigin();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
