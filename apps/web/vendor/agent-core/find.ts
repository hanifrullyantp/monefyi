/** Pencarian id. Tidak pernah mengarang id di luar daftar yang diberikan. */

export type FindRow = { id: string; label: string };

export type FindHit = { id: string; label: string; score: number };

export type FindResult =
  | { status: 'chosen'; id: string; label: string; score: number }
  | { status: 'needs_choice'; candidates: FindHit[] }
  | { status: 'none' };

const MAX_CANDIDATES = 5;

function scoreLabel(query: string, label: string): number {
  const q = query.trim().toLowerCase();
  const text = label.trim().toLowerCase();
  if (!q || !text) return 0;
  if (q === text) return 1;
  if (text.startsWith(q)) return 0.92;
  if (text.includes(q)) return 0.78;
  const parts = q.split(/\s+/).filter(Boolean);
  const hits = parts.filter((part) => text.includes(part)).length;
  if (!parts.length || hits === 0) return 0;
  return 0.5 + (0.2 * hits) / parts.length;
}

/** Paling banyak lima kandidat. Skor yang berdekatan menjadi needs_choice. */
export function findMatches(query: string, rows: FindRow[]): FindResult {
  const ranked = rows
    .map((row) => ({ id: row.id, label: row.label, score: scoreLabel(query, row.label) }))
    .filter((row) => row.score >= 0.5)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, MAX_CANDIDATES);

  if (!ranked.length) return { status: 'none' };
  const [best, second] = ranked;
  if (best.score >= 0.9 && (!second || best.score - second.score >= 0.15)) {
    return { status: 'chosen', id: best.id, label: best.label, score: best.score };
  }
  return { status: 'needs_choice', candidates: ranked };
}
