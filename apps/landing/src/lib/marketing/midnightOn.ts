/** Jadwal menyalakan kampanye pada jam 12 malam (00:00 WIB). */

export interface MidnightOnSchedule {
  runAt: string;
  campaignIds: string[];
  names: Record<string, string>;
  createdAt: string;
  status: "pending" | "done";
  lastError?: string;
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** 00:00 WIB berikutnya. Jam 12 malam hari ini jika belum lewat, kalau sudah lewat maka besok. */
export function nextMidnightWib(now: Date = new Date()): Date {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const startToday = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - WIB_OFFSET_MS;
  const next = now.getTime() < startToday + 60_000 ? startToday : startToday + 24 * 60 * 60 * 1000;
  return new Date(next);
}

export function formatMidnightWib(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "00:00 WIB";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date) + " WIB";
}

export function parseMidnightOn(raw: unknown): MidnightOnSchedule | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const campaignIds = Array.isArray(row.campaignIds)
    ? row.campaignIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  if (!campaignIds.length || typeof row.runAt !== "string") return null;
  const names: Record<string, string> = {};
  if (row.names && typeof row.names === "object" && !Array.isArray(row.names)) {
    for (const [id, name] of Object.entries(row.names as Record<string, unknown>)) {
      if (name) names[id] = String(name);
    }
  }
  return {
    runAt: row.runAt,
    campaignIds,
    names,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.runAt,
    status: row.status === "done" ? "done" : "pending",
    lastError: row.lastError ? String(row.lastError) : undefined,
  };
}
