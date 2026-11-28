import { findMatches } from './find.ts';
import { commitRecordCost, prepareRecordCost } from './prepare.ts';
import { TOOLS, type ToolDef } from './registry.ts';

export function functionSchema(tool: ToolDef) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const arg of tool.args) {
    properties[arg.name] = {
      type: arg.type === 'integer' ? 'integer' : 'string',
      description: arg.description,
      ...(arg.enum ? { enum: arg.enum } : {}),
    };
    if (arg.required) required.push(arg.name);
  }
  return {
    name: tool.name,
    description: tool.description,
    parameters: { type: 'object', additionalProperties: false, properties, required },
  };
}

export function mcpTools() {
  return {
    tools: TOOLS.map((tool) => {
      const schema = functionSchema(tool);
      return { name: tool.name, description: tool.description, inputSchema: schema.parameters };
    }),
  };
}

export function agentManual(): string {
  const lines = [
    '# Panduan agen',
    '',
    'Dokumen ini dihasilkan dari registry. Jangan disunting tangan.',
    '',
    'Agen tidak menulis database. Agen memanggil tool. Id hanya dari find_*. Commit tidak mengirim ulang nominal.',
    '',
  ];
  for (const tool of TOOLS) {
    lines.push(`## ${tool.name}`);
    lines.push('');
    lines.push(tool.description);
    lines.push('');
    lines.push(`Risiko: ${tool.risk}. Peran minimum: ${tool.minRole}.`);
    lines.push('');
    for (const arg of tool.args) {
      const choice = arg.enum ? ` Pilihan: ${arg.enum.join(', ')}.` : '';
      lines.push(`- \`${arg.name}\` (${arg.type}${arg.required ? ', wajib' : ''}): ${arg.description}${choice}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function fixtures() {
  const projects = [
    { id: 'p-rumah', label: 'Rumah Bu Ana' },
    { id: 'p-ruko', label: 'Ruko Bu Ana' },
  ];
  const found = findMatches('Bu Ana', projects);
  const exact = findMatches('Rumah Bu Ana', projects);
  const now = Date.parse('2026-11-04T01:00:00.000Z');
  const prepared = prepareRecordCost({
    projectId: 'p-rumah',
    item: 'semen',
    total: 650000,
    qty: 10,
    unit: 'sak',
    unitPrice: 65000,
    entryDate: '2026-11-04',
    now,
  });
  const committed = prepared.ok
    ? commitRecordCost({ prepareToken: prepared.token, idempotencyKey: 'key-1', now })
    : null;
  return [
    { tool: 'find_project', name: 'ambigu', input: { query: 'Bu Ana' }, output: found },
    { tool: 'find_project', name: 'tepat', input: { query: 'Rumah Bu Ana' }, output: exact },
    {
      tool: 'prepare_record_cost',
      name: 'semen',
      input: { project_id: 'p-rumah', item: 'semen', total: 650000, entry_date: '2026-11-04' },
      output: prepared.ok ? { ok: true, impact: prepared.impact, total: prepared.cost.total } : prepared,
    },
    {
      tool: 'commit_record_cost',
      name: 'tanpa nominal',
      input: { prepare_token: prepared.ok ? prepared.token : '', idempotency_key: 'key-1' },
      output: committed && committed.ok ? { ok: true, total: committed.cost.total } : committed,
    },
  ];
}
