#!/usr/bin/env node
/**
 * Run Planner migration via Supabase Management API
 * 
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxxx node planner/scripts/migrate-via-api.mjs
 * 
 * Get your access token from:
 *   https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'zzwqfmdyncxbolestkqp';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Set SUPABASE_ACCESS_TOKEN environment variable');
  console.error('Get it from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const sqlFile = join(__dirname, '..', 'supabase', 'migrations', '001_planner_core_schema.sql');
const sql = readFileSync(sqlFile, 'utf8');

console.log('Running migration against project:', PROJECT_REF);
console.log('SQL file:', sqlFile, `(${sql.length} chars)\n`);

// Split SQL into statements to handle potential issues with large batches
// Remove comments and empty lines, execute as single batch
const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`Migration failed (${res.status}):`, text);
  process.exit(1);
}

const data = await res.json();
console.log('Migration result:', JSON.stringify(data, null, 2));
console.log('\n✅ Migration completed successfully!');
