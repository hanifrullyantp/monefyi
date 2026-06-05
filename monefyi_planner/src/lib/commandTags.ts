/**
 * Hashtag handling for the Monefyi Assistant.
 *
 * Users can tag commands like "hutang 5jt #proyekA dari #pakBudi" to disambiguate
 * targets. Tags are extracted, resolved against known entities (projects, workers,
 * RAP items) or stored aliases, and passed as structured hints to the parser to
 * improve accuracy.
 */

export type TagEntityType = 'project' | 'worker' | 'rap' | 'other';

export interface TaggableEntity {
  type: TagEntityType;
  id?: string;
  name: string;
  /** Optional explicit alias key; defaults to a normalized form of `name`. */
  alias?: string;
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
  };
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

  const cleanText = input.replace(TAG_RE, '').replace(/\s+/g, ' ').trim();

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
    }
  }

  return { cleanText, tags, hints };
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
