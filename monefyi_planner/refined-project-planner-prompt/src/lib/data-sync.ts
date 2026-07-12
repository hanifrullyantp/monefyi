// =====================================================
// Client-side merge: API payload → app state.data
// =====================================================

import type { APP_DATA } from "./mock-data";

type AppData = typeof APP_DATA;

/**
 * Safely merge API response into existing app data.
 * Preserves mock fallbacks when DB returns partial/empty data.
 */
export function mergeApiIntoState(
  current: AppData,
  api: {
    projects?: AppData["projects"];
    database?: Partial<AppData["database"]>;
    business?: Partial<AppData["business"]>;
  }
): AppData {
  const next = structuredClone(current);

  if (api.projects?.length) {
    next.projects = api.projects;
  }

  if (api.database?.materials?.length) {
    next.database.materials = api.database.materials;
  }
  if (api.database?.workers?.length) {
    next.database.workers = api.database.workers;
  }
  if (api.database?.tools?.length) {
    next.database.tools = api.database.tools;
  }
  if (api.database?.vendors?.length) {
    next.database.vendors = api.database.vendors;
  }
  if (api.database?.clients?.length) {
    next.database.clients = api.database.clients;
  }
  if (api.database?.templates?.length) {
    next.database.templates = api.database.templates;
  }

  if (api.business) {
    if (api.business.accounts?.length) {
      next.business.accounts = api.business.accounts;
      next.business.totalKas = api.business.accounts.reduce((s, a) => s + a.balance, 0);
    }
    const fields = [
      "name",
      "modal",
      "asetTetap",
      "totalAktiva",
      "totalHutang",
      "ekuitas",
      "labaDitahan",
      "cashflowData",
      "cashflowOut",
      "cashflowMonths",
      "operational",
      "assets",
      "hutangList",
      "piutangList",
    ] as const;
    for (const key of fields) {
      const val = api.business[key];
      if (val !== undefined && val !== null) {
        (next.business as Record<string, unknown>)[key] = val;
      }
    }
    if (api.business.totalKas) {
      next.business.totalKas = api.business.totalKas;
    }
  }

  return next;
}
