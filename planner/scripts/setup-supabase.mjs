#!/usr/bin/env node
/**
 * Monefyi Planner — Supabase Setup Script
 * 
 * Menjalankan database migration dan deploy Edge Functions.
 * 
 * Required env vars:
 *   SUPABASE_ACCESS_TOKEN  — Personal access token dari supabase.com/dashboard/account/tokens
 *   
 * Atau:
 *   SUPABASE_DB_URL — Direct database connection string
 *     Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'zzwqfmdyncxbolestkqp';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

async function main() {
  console.log('=== Monefyi Planner — Supabase Setup ===\n');

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!accessToken && !dbUrl) {
    console.error('ERROR: No credentials found.\n');
    console.error('Set one of these environment variables:');
    console.error('  SUPABASE_ACCESS_TOKEN — Get from: https://supabase.com/dashboard/account/tokens');
    console.error('  SUPABASE_DB_URL       — Get from: Supabase Dashboard > Settings > Database > Connection string\n');
    process.exit(1);
  }

  // Step 1: Run SQL Migration
  console.log('--- Step 1: Database Migration ---\n');
  const migrationFile = join(__dirname, '..', 'supabase', 'migrations', '001_planner_core_schema.sql');
  const sql = readFileSync(migrationFile, 'utf8');

  if (dbUrl) {
    console.log('Using direct database connection...');
    try {
      execSync(`psql "${dbUrl}" -f "${migrationFile}"`, { stdio: 'inherit' });
      console.log('\n✅ Migration completed via psql\n');
    } catch (err) {
      console.error('❌ psql migration failed:', err.message);
      console.log('\nTrying Management API fallback...\n');
      if (accessToken) {
        await runMigrationViaAPI(accessToken, sql);
      }
    }
  } else if (accessToken) {
    await runMigrationViaAPI(accessToken, sql);
  }

  // Step 2: Deploy Edge Functions
  console.log('--- Step 2: Deploy Edge Functions ---\n');
  if (accessToken) {
    await deployEdgeFunctions(accessToken);
  } else {
    console.log('⚠️  Edge Function deployment requires SUPABASE_ACCESS_TOKEN');
    console.log('   Set it and re-run this script.\n');
  }

  console.log('=== Setup Complete ===');
}

async function runMigrationViaAPI(token, sql) {
  console.log('Running migration via Supabase Management API...');
  
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${res.status}: ${body}`);
    }

    const data = await res.json();
    console.log('✅ Migration completed via Management API\n');
    return data;
  } catch (err) {
    console.error('❌ Management API migration failed:', err.message);
    console.log('\nAlternative: Copy the SQL from the migration file and paste it in:');
    console.log('  Supabase Dashboard > SQL Editor > New query > Paste > Run\n');
    console.log(`  File: ${join(__dirname, '..', 'supabase', 'migrations', '001_planner_core_schema.sql')}\n`);
  }
}

async function deployEdgeFunctions(token) {
  const functions = ['planner-parse-command', 'planner-analyze'];
  const supabaseDir = join(__dirname, '..', 'supabase');

  for (const fn of functions) {
    console.log(`Deploying ${fn}...`);
    try {
      execSync(
        `npx supabase functions deploy ${fn} --project-ref ${PROJECT_REF}`,
        { 
          stdio: 'inherit',
          cwd: supabaseDir,
          env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
        }
      );
      console.log(`✅ ${fn} deployed\n`);
    } catch (err) {
      console.error(`❌ Failed to deploy ${fn}:`, err.message, '\n');
    }
  }
}

main().catch(console.error);
