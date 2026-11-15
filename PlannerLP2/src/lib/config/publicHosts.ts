/** Public hosts. Legacy hosts stay recognized; generated links use the Froyek origins. */

export const PLANNER_HOST = "froyek.com";
export const ESTIMATOR_HOST = "estimator.froyek.com";
export const PLANNER_ORIGIN = `https://${PLANNER_HOST}`;
export const ESTIMATOR_ORIGIN = `https://${ESTIMATOR_HOST}`;

export const LEGACY_PLANNER_HOSTS = ["planner.monefyi.com"] as const;
export const LEGACY_ESTIMATOR_HOSTS = ["estimator.monefyi.com"] as const;

const ESTIMATOR_HOSTS = new Set<string>([ESTIMATOR_HOST, ...LEGACY_ESTIMATOR_HOSTS]);

export function isEstimatorHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ESTIMATOR_HOSTS.has(host) || host.startsWith("estimator.");
}

/** 308 rules. `/api/*` is omitted so webhooks on the old host keep their POST. */
export function legacyHostRedirects(): {
  source: string;
  host: string;
  destination: string;
  permanent: true;
}[] {
  const rules = [
    { host: LEGACY_PLANNER_HOSTS[0], origin: PLANNER_ORIGIN },
    { host: LEGACY_ESTIMATOR_HOSTS[0], origin: ESTIMATOR_ORIGIN },
  ];
  return rules.flatMap(({ host, origin }) => [
    { source: "/", host, destination: `${origin}/`, permanent: true as const },
    {
      source: "/:path((?!api/).*)",
      host,
      destination: `${origin}/:path`,
      permanent: true as const,
    },
  ]);
}
