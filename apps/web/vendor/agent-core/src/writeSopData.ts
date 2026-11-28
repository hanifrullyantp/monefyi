import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadSopDirectory } from './loadSops.ts';

const dir = fileURLToPath(new URL('../sop/', import.meta.url));
const catalog = loadSopDirectory(dir);
const body = `import type { SopDefinition } from './sopSchema.ts';

/** Dihasilkan dari agent-core/sop/*.yaml. Jangan disunting tangan. */
export const SOP_CATALOG: SopDefinition[] = ${JSON.stringify(catalog, null, 2)};
`;
writeFileSync(new URL('./sopData.ts', import.meta.url), body);
console.log(`sop ${catalog.length}`);
