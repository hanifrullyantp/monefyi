/**
 * Shared helpers for seed / reset scripts.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const SUPABASE_DIR = path.join(__dirname, '..', 'my-supabase-project');
const CHUNK = 300;

function parseSeedArgs(argv) {
  return {
    confirm: argv.includes('--confirm'),
    dryRun: argv.includes('--dry-run'),
    viaDb: argv.includes('--via-db'),
    skipReset: argv.includes('--skip-reset'),
    withAccuracy: argv.includes('--with-accuracy'),
  };
}

function loadFixtureJson(fixtureDir, name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), 'utf8'));
}

function sqlLiteral(value) {
  if (value == null) return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function dbQuery(sql) {
  const out = execSync(`npx supabase db query --linked ${JSON.stringify(sql)}`, {
    cwd: SUPABASE_DIR,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return JSON.parse(out.slice(start, end + 1));
}

function dbExec(sql) {
  const tmp = path.join(os.tmpdir(), `monefyi-seed-${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql, 'utf8');
  try {
    execSync(`npx supabase db query --linked --file ${JSON.stringify(tmp)}`, {
      cwd: SUPABASE_DIR,
      encoding: 'utf8',
      stdio: ['inherit', 'inherit', 'inherit'],
    });
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env ${name}`);
  return String(v).trim();
}

function fmtIdr(n) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

async function rest(baseUrl, serviceKey, routePath, opts = {}) {
  const url = `${baseUrl.replace(/\/$/, '')}/rest/v1/${routePath}`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    ...(opts.headers || {}),
  };
  const { prefer, headers: _h, ...init } = opts;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${routePath} → ${res.status}: ${text.slice(0, 500)}`);
  }
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

async function resolveUserIdViaDb(email) {
  const res = dbQuery(
    `SELECT id::text AS id FROM auth.users WHERE lower(email) = lower(${sqlLiteral(email)}) LIMIT 1`,
  );
  const row = res?.rows?.[0];
  if (!row?.id) throw new Error(`User not found for email: ${email}`);
  return row.id;
}

async function resolveUserIdRest(baseUrl, serviceKey, email) {
  const url = `${baseUrl.replace(/\/$/, '')}/auth/v1/admin/users?per_page=1000`;
  const res = await fetch(url, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Auth admin list users failed: ${JSON.stringify(body)}`);
  const match = (body.users || []).find((u) => String(u.email || '').toLowerCase() === email.toLowerCase());
  if (!match) throw new Error(`User not found for email: ${email}`);
  return match.id;
}

async function resolveUserId(options = {}) {
  const email = process.env.SEED_USER_EMAIL?.trim() || 'hanif.rullyant@gmail.com';
  let userId = process.env.SEED_USER_ID?.trim();
  const useDb = options.viaDb || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (userId) return { userId, useDb, email };
  if (useDb) {
    userId = await resolveUserIdViaDb(email);
  } else {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://zzwqfmdyncxbolestkqp.supabase.co';
    userId = await resolveUserIdRest(supabaseUrl, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), email);
  }
  return { userId, useDb, email };
}

module.exports = {
  CHUNK,
  SUPABASE_DIR,
  parseSeedArgs,
  loadFixtureJson,
  sqlLiteral,
  dbQuery,
  dbExec,
  requireEnv,
  fmtIdr,
  rest,
  resolveUserId,
};
