/**
 * Hashtag handling for the Monefyi Assistant.
 *
 * Users can tag commands like "hutang 5jt #proyekA dari #pakBudi" to disambiguate
 * targets. Tags are extracted, resolved against known entities (projects, workers,
 * RAP items) or stored aliases, and passed as structured hints to the parser to
 * improve accuracy.
 */

export type TagEntityType = 'project' | 'worker' | 'rap' | 'work_item' | 'other';

export interface TaggableEntity {
  type: TagEntityType;
  id?: string;
  name: string;
  /** Optional explicit alias key; defaults to a normalized form of `name`. */
  alias?: string;
  /** Current progress % — shown in tag suggestions for work items. */
  progressPct?: number;
}

export interface ResolvedTag {
  raw: string;        // "#proyekA"
  key: string;        // "proyeka"
  type?: TagEntityType;
  id?: string;
  name?: string;      // resolved entity name
  matched: boolean;
}

export interface TagParseResult {
  cleanText: string;          // input with tags removed (for the core parser)
  tags: ResolvedTag[];
  hints: {
    projectName?: string;
    projectId?: string;
    workerName?: string;
    rapName?: string;
    workItemName?: string;
    workItemId?: string;
  };
}

/** UI label for tag type in autocomplete dropdown. */
export function tagTypeLabel(type: TagEntityType): string {
  if (type === 'work_item') return 'progress';
  return type;
}

const TAG_RE = /#([\p{L}\p{N}_]+)/gu;

/** Normalize a tag/name to a comparable key: lowercase, alnum only. */
export function tagKey(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Extract raw hashtags from input (keys only, no resolution). */
export function extractTags(input: string): Array<{ raw: string; key: string }> {
  const out: Array<{ raw: string; key: string }> = [];
  for (const m of input.matchAll(TAG_RE)) {
    out.push({ raw: m[0], key: tagKey(m[1]) });
  }
  return out;
}

/**
 * Resolve tags against known entities + aliases, strip them from the text,
 * and produce structured hints.
 */
export function resolveTags(
  input: string,
  entities: TaggableEntity[],
): TagParseResult {
  const index = new Map<string, TaggableEntity>();
  for (const e of entities) {
    index.set(e.alias ? tagKey(e.alias) : tagKey(e.name), e);
  }

  const tags: ResolvedTag[] = [];
  for (const { raw, key } of extractTags(input)) {
    const hit = index.get(key) || findPartial(key, index);
    tags.push({
      raw,
      key,
      type: hit?.type,
      id: hit?.id,
      name: hit?.name,
      matched: Boolean(hit),
    });
  }

  // Preserve newlines — required for WhatsApp batch cost parsing.
  const cleanText = input
    .replace(TAG_RE, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const hints: TagParseResult['hints'] = {};
  for (const t of tags) {
    if (!t.matched) continue;
    if (t.type === 'project') {
      hints.projectName = t.name;
      hints.projectId = t.id;
    } else if (t.type === 'worker') {
      hints.workerName = t.name;
    } else if (t.type === 'rap') {
      hints.rapName = t.name;
    } else if (t.type === 'work_item') {
      hints.workItemName = t.name;
      hints.workItemId = t.id;
    }
  }

  return { cleanText, tags, hints };
}

/** Pull a progress percentage from tag-free command text. */
export function extractProgressPercent(text: string): number | null {
  const t = String(text || '').trim();
  if (!t) return null;
  if (/selesai|done|complete/i.test(t)) return 100;

  const pct = t.match(/(\d{1,3})\s*(?:%|persen|prosen)/i);
  if (pct) return Math.min(100, Number(pct[1]));

  const bare = t.match(/^(\d{1,3})$/);
  if (bare) return Math.min(100, Number(bare[1]));

  return null;
}

/**
 * When a work-item tag is present, build or boost an update_progress parse.
 * Examples: "75% #pondasi", "#kerangka 50 persen", "#pondasi" (confirm form only).
 */
export function applyProgressTagHints(
  cleanText: string,
  hints: TagParseResult['hints'],
  parsed: { intent: string; params: Record<string, unknown>; confidence: number },
): { intent: string; params: Record<string, unknown>; confidence: number } {
  if (!hints.workItemName) return parsed;

  const progress = extractProgressPercent(cleanText);
  const wantsProgress =
    progress !== null ||
    /progress|proses|progres|update/i.test(cleanText) ||
    parsed.intent === 'update_progress';

  if (!wantsProgress && parsed.intent !== 'unknown') {
    // Work-item tag on a non-progress command — only inject workItem if missing.
    if (!parsed.params.workItem) {
      return {
        ...parsed,
        params: { ...parsed.params, workItem: hints.workItemName },
      };
    }
    return parsed;
  }

  const params: Record<string, unknown> = {
    ...parsed.params,
    workItem: hints.workItemName,
  };
  if (progress !== null) params.progress = progress;
  if (hints.projectName && !params.projectName) params.projectName = hints.projectName;

  return {
    intent: 'update_progress',
    params,
    confidence: Math.max(parsed.confidence, progress !== null ? 0.88 : 0.75),
  };
}

/** Loose containment match when there is no exact key hit. */
function findPartial(
  key: string,
  index: Map<string, TaggableEntity>,
): TaggableEntity | undefined {
  for (const [k, v] of index) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  return undefined;
}

/**
 * Suggest tag completions for the fragment after the last '#' in the input.
 * Returns null when the caret context is not an open tag.
 */
export function tagSuggestions(
  input: string,
  entities: TaggableEntity[],
  limit = 6,
): { fragment: string; matches: TaggableEntity[] } | null {
  const lastHash = input.lastIndexOf('#');
  if (lastHash === -1) return null;

  const after = input.slice(lastHash + 1);
  // Open tag only if there is no whitespace after '#'.
  if (/\s/.test(after)) return null;

  const frag = tagKey(after);
  const matches = entities
    .filter(e => {
      const k = e.alias ? tagKey(e.alias) : tagKey(e.name);
      return frag === '' ? true : k.includes(frag);
    })
    .slice(0, limit);

  return { fragment: after, matches };
}

/** Replace the open tag fragment with a chosen entity's tag. */
export function applyTagSuggestion(input: string, entity: TaggableEntity): string {
  const lastHash = input.lastIndexOf('#');
  if (lastHash === -1) return input;
  const before = input.slice(0, lastHash);
  const key = entity.alias ? tagKey(entity.alias) : tagKey(entity.name);
  return `${before}#${key} `;
}
