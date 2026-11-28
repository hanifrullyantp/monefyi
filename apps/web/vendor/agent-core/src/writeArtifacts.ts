import { writeFileSync } from 'node:fs';
import { agentManual, fixtures, functionSchema, mcpTools } from './generate.ts';
import { TOOLS } from './registry.ts';

writeFileSync(new URL('../../docs/agent/AGENT_MANUAL.md', import.meta.url), agentManual());
writeFileSync(new URL('../fixtures.json', import.meta.url), `${JSON.stringify(fixtures(), null, 2)}\n`);
writeFileSync(new URL('../mcp.json', import.meta.url), `${JSON.stringify(mcpTools(), null, 2)}\n`);
writeFileSync(new URL('../functions.json', import.meta.url), `${JSON.stringify(TOOLS.map(functionSchema), null, 2)}\n`);
