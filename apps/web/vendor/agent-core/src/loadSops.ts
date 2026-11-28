import { readdirSync, readFileSync } from 'node:fs';
import { compileSop, type SopDefinition } from './sopSchema.ts';
import { parseYaml } from './yaml.ts';

export function loadSopDirectory(dir: string): SopDefinition[] {
  const names = readdirSync(dir).filter((name) => name.endsWith('.yaml')).sort();
  return names.map((name) => {
    const compiled = compileSop(parseYaml(readFileSync(`${dir}/${name}`, 'utf8')));
    if (!compiled.sop) throw new Error(`${name}: ${compiled.problems.join('; ')}`);
    return compiled.sop;
  });
}
