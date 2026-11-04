export type OrgRole = 'worker' | 'manager' | 'owner';
export type Specialist = 'manager' | 'project' | 'finance' | 'purchasing' | 'hr';
export type ToolRisk = 'read' | 'prepare' | 'commit';

export type ToolArg = {
  name: string;
  type: 'string' | 'integer';
  required: boolean;
  enum?: string[];
  description: string;
};

export type ToolDef = {
  name: string;
  description: string;
  risk: ToolRisk;
  minRole: OrgRole;
  specialists: Specialist[];
  args: ToolArg[];
};

const ROLE_RANK: Record<OrgRole, number> = { worker: 1, manager: 2, owner: 3 };

export const TOOLS: ToolDef[] = [
  {
    name: 'find_project',
    description: 'Cari proyek. Mengembalikan paling banyak 5 kandidat beserta skor, atau needs_choice.',
    risk: 'read',
    minRole: 'worker',
    specialists: ['manager', 'project', 'finance', 'purchasing', 'hr'],
    args: [{ name: 'query', type: 'string', required: true, description: 'Nama proyek yang disebut pengguna.' }],
  },
  {
    name: 'find_party',
    description: 'Cari pihak (supplier atau pelanggan) di organisasi. Tidak mengarang id.',
    risk: 'read',
    minRole: 'worker',
    specialists: ['manager', 'finance', 'purchasing'],
    args: [{ name: 'query', type: 'string', required: true, description: 'Nama pihak.' }],
  },
  {
    name: 'find_wallet',
    description: 'Cari dompet kas, termasuk kas proyek.',
    risk: 'read',
    minRole: 'worker',
    specialists: ['manager', 'finance'],
    args: [
      { name: 'query', type: 'string', required: true, description: 'Nama dompet.' },
      { name: 'project_id', type: 'string', required: false, description: 'Id proyek dari find_project.' },
    ],
  },
  {
    name: 'get_project_cash',
    description: 'Saldo kas satu proyek dari buku besar.',
    risk: 'read',
    minRole: 'worker',
    specialists: ['manager', 'project', 'finance'],
    args: [{ name: 'project_id', type: 'string', required: true, description: 'Id proyek dari find_project.' }],
  },
  {
    name: 'get_party_debt',
    description: 'Hutang satu pihak, bisa dipecah per proyek.',
    risk: 'read',
    minRole: 'worker',
    specialists: ['manager', 'finance', 'purchasing'],
    args: [
      { name: 'party_id', type: 'string', required: true, description: 'Id pihak dari find_party.' },
      { name: 'project_id', type: 'string', required: false, description: 'Batasi ke satu proyek.' },
    ],
  },
  {
    name: 'prepare_record_cost',
    description: 'Kunci nominal dan tanggal biaya selama 10 menit. Belum menulis database.',
    risk: 'prepare',
    minRole: 'worker',
    specialists: ['manager', 'project', 'finance', 'purchasing'],
    args: [
      { name: 'project_id', type: 'string', required: true, description: 'Id proyek dari find_project.' },
      { name: 'item', type: 'string', required: true, description: 'Nama barang atau pekerjaan.' },
      { name: 'total', type: 'integer', required: true, description: 'Total rupiah bulat.' },
      { name: 'qty', type: 'integer', required: false, description: 'Jumlah, jika ada.' },
      { name: 'unit', type: 'string', required: false, description: 'Satuan tertutup dari daftar satuan biaya.' },
      { name: 'entry_date', type: 'string', required: true, description: 'Tanggal YYYY-MM-DD di zona organisasi.' },
    ],
  },
  {
    name: 'commit_record_cost',
    description: 'Simpan biaya yang sudah disiapkan. Nominal dan tanggal tidak dikirim lagi.',
    risk: 'commit',
    minRole: 'worker',
    specialists: ['manager', 'project', 'finance', 'purchasing'],
    args: [
      { name: 'prepare_token', type: 'string', required: true, description: 'Token dari prepare_record_cost.' },
      { name: 'idempotency_key', type: 'string', required: true, description: 'Kunci yang sama saat mencoba ulang.' },
    ],
  },
  {
    name: 'propose_notification',
    description: 'Usulkan pemberitahuan. Belum mengirim.',
    risk: 'prepare',
    minRole: 'manager',
    specialists: ['manager', 'project', 'finance', 'purchasing', 'hr'],
    args: [
      { name: 'project_id', type: 'string', required: true, description: 'Id proyek dari find_project.' },
      {
        name: 'audience',
        type: 'string',
        required: true,
        enum: ['owner', 'manager', 'project_workers'],
        description: 'Penerima.',
      },
      { name: 'message_id', type: 'string', required: true, description: 'Kode pesan, bukan kalimat bebas.' },
    ],
  },
];

export function toolsFor(specialist: Specialist, role: OrgRole): ToolDef[] {
  const rank = ROLE_RANK[role];
  return TOOLS.filter((tool) => tool.specialists.includes(specialist) && ROLE_RANK[tool.minRole] <= rank);
}

export function assertRegistry(): string[] {
  const problems: string[] = [];
  const names = new Set<string>();
  for (const tool of TOOLS) {
    if (names.has(tool.name)) problems.push(`nama ganda ${tool.name}`);
    names.add(tool.name);
    if (tool.args.length > 6) problems.push(`${tool.name} lebih dari 6 argumen`);
    for (const arg of tool.args) {
      if (arg.name === 'org_id' || arg.name === 'user_id' || arg.name === 'role') {
        problems.push(`${tool.name} mengirim ${arg.name}`);
      }
      if (arg.name === 'audience' && !arg.enum?.length) problems.push(`${tool.name} audience tanpa enum`);
    }
    if (tool.name.startsWith('commit_') && tool.args.some((arg) => arg.name === 'total' || arg.name === 'entry_date')) {
      problems.push(`${tool.name} mengirim ulang nominal atau tanggal`);
    }
  }
  for (const specialist of ['manager', 'project', 'finance', 'purchasing', 'hr'] as Specialist[]) {
    for (const role of ['worker', 'manager', 'owner'] as OrgRole[]) {
      const count = toolsFor(specialist, role).length;
      if (count > 8) problems.push(`${specialist}/${role} melihat ${count} tool`);
    }
  }
  return problems;
}
