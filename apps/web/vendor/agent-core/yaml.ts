/** Parser YAML kecil untuk berkas SOP. Mendukung peta, daftar, skalar, dan daftar kosong. */

type Line = { indent: number; text: string };
type Scalar = string | number | boolean | null | unknown[];

function scalar(text: string): Scalar {
  if (text === '[]') return [];
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null') return null;
  if (/^-?\d+$/.test(text)) return Number(text);
  return text;
}

function linesOf(source: string): Line[] {
  const lines: Line[] = [];
  for (const raw of source.split('\n')) {
    const cut = raw.replace(/\s+$/, '');
    if (!cut.trim() || cut.trim().startsWith('#')) continue;
    const indent = cut.match(/^ */)?.[0].length ?? 0;
    lines.push({ indent, text: cut.trim() });
  }
  return lines;
}

function parseMap(lines: Line[], cursor: { i: number }, indent: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  while (cursor.i < lines.length && lines[cursor.i].indent === indent && !lines[cursor.i].text.startsWith('- ')) {
    const line = lines[cursor.i];
    const colon = line.text.indexOf(':');
    if (colon <= 0) break;
    const key = line.text.slice(0, colon).trim();
    const rest = line.text.slice(colon + 1).trim();
    cursor.i += 1;
    if (!rest) {
      if (cursor.i < lines.length && lines[cursor.i].indent > indent) {
        obj[key] = lines[cursor.i].text.startsWith('- ')
          ? parseList(lines, cursor, lines[cursor.i].indent)
          : parseMap(lines, cursor, lines[cursor.i].indent);
      } else {
        obj[key] = null;
      }
    } else {
      obj[key] = scalar(rest);
    }
  }
  return obj;
}

function parseList(lines: Line[], cursor: { i: number }, indent: number): unknown[] {
  const arr: unknown[] = [];
  while (cursor.i < lines.length && lines[cursor.i].indent === indent && lines[cursor.i].text.startsWith('- ')) {
    const rest = lines[cursor.i].text.slice(2).trim();
    cursor.i += 1;
    if (rest.includes(':')) {
      const colon = rest.indexOf(':');
      const key = rest.slice(0, colon).trim();
      const inline = rest.slice(colon + 1).trim();
      const item: Record<string, unknown> = {};
      if (inline) item[key] = scalar(inline);
      else if (cursor.i < lines.length && lines[cursor.i].indent > indent) {
        item[key] = lines[cursor.i].text.startsWith('- ')
          ? parseList(lines, cursor, lines[cursor.i].indent)
          : parseMap(lines, cursor, lines[cursor.i].indent);
      } else item[key] = null;
      const keyIndent = indent + 2;
      while (
        cursor.i < lines.length
        && lines[cursor.i].indent === keyIndent
        && !lines[cursor.i].text.startsWith('- ')
      ) {
        const next = lines[cursor.i];
        const cut = next.text.indexOf(':');
        if (cut <= 0) break;
        const childKey = next.text.slice(0, cut).trim();
        const childRest = next.text.slice(cut + 1).trim();
        cursor.i += 1;
        if (!childRest) {
          if (cursor.i < lines.length && lines[cursor.i].indent > keyIndent) {
            item[childKey] = lines[cursor.i].text.startsWith('- ')
              ? parseList(lines, cursor, lines[cursor.i].indent)
              : parseMap(lines, cursor, lines[cursor.i].indent);
          } else item[childKey] = null;
        } else item[childKey] = scalar(childRest);
      }
      arr.push(item);
    } else {
      arr.push(scalar(rest));
    }
  }
  return arr;
}

export function parseYaml(source: string): unknown {
  const lines = linesOf(source);
  if (!lines.length) return {};
  const cursor = { i: 0 };
  if (lines[0].text.startsWith('- ')) return parseList(lines, cursor, lines[0].indent);
  return parseMap(lines, cursor, lines[0].indent);
}
