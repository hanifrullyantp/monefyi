// Edge Function: rab-api
// Menangani GET/POST/PUT/DELETE /api/rab/* untuk fitur RAB.
// Akses ditegakkan di SERVER: hanya super admin (hanif.rullyant@gmail.com) yang boleh.
// Deploy: supabase functions deploy rab-api
// Env server (tidak dikirim ke browser): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAB_SUPERADMIN_EMAILS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPER_ADMIN_EMAIL = 'hanif.rullyant@gmail.com';

function normEmail(email?: string | null): string {
  return String(email || '').trim().toLowerCase();
}

function corsHeaders(extra: Record<string, string> = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...extra,
  };
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(headers) },
  });
}

// Tabel RAB yang diizinkan (whitelist). Tidak ada tabel lain yang boleh disentuh.
const RAB_TABLES = new Set([
  'rab_projects',
  'rab_project_versions',
  'rab_scenarios',
  'rab_catalog_components',
  'rab_catalog_analyses',
  'rab_catalog_jobs',
  'rab_catalog_prices',
  'rab_catalog_indices',
  'rab_catalog_versions',
  'rab_corrections',
  'rab_actuals',
  'rab_calibrations',
  'rab_audit_log',
]);

function parseRabPath(pathname: string): { table: string; id: string | null } | null {
  const base = '/functions/v1/rab-api';
  let rest = pathname;
  if (rest.startsWith(base)) rest = rest.slice(base.length);
  if (!rest.startsWith('/rab/')) return null;
  const segments = rest.slice(1).split('/'); // ['rab', table, id?]
  if (segments.length < 2 || segments[0] !== 'rab') return null;
  const table = segments[1];
  const id = segments.length >= 3 ? segments[2] : null;
  if (!RAB_TABLES.has(table)) return null;
  return { table, id };
}

function superAdminEmails(): string[] {
  const env = Deno.env.get('RAB_SUPERADMIN_EMAILS') || '';
  const list = env.split(',').map(normEmail).filter(Boolean);
  list.push(normEmail(SUPER_ADMIN_EMAIL));
  return list;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(req.url);
  const parsed = parseRabPath(url.pathname);
  if (!parsed) {
    return json({ error: 'Not found' }, 404);
  }

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'Missing bearer token' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server not configured' }, 500);
  }

  // 1. Verifikasi sesi pengguna + ambil email dari JWT (server-side enforcement)
  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return json({ error: 'Invalid session' }, 401);
  }

  const email = normEmail(user.email);
  const emailVerified =
    !!user.email_confirmed_at || user.app_metadata?.email_verified === true;

  const allowed = superAdminEmails().includes(email);
  if (!allowed || !emailVerified) {
    return json({ error: 'Forbidden: RAB hanya untuk super admin terverifikasi' }, 403);
  }

  // 2. Klien service role untuk operasi DB (RLS diabaikan server sisa; penegakan di sini)
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { table, id } = parsed;

  try {
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await serviceClient
          .from(table)
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      const { data, error } = await serviceClient.from(table).select('*').order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ data: data || [] });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const actor = { created_by: user.id, actor_email: user.email };
      const payload = { ...body, ...actor };
      const { data, error } = await serviceClient.from(table).insert(payload).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data }, 201);
    }

    if (req.method === 'PUT') {
      if (!id) return json({ error: 'ID diperlukan' }, 400);
      const body = await req.json();
      const { data, error } = await serviceClient
        .from(table)
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (req.method === 'DELETE') {
      if (!id) return json({ error: 'ID diperlukan' }, 400);
      const { error } = await serviceClient.from(table).delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
