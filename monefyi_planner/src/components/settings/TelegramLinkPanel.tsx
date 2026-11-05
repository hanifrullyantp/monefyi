import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { emptyProfile, policyProblems, type CompanyProfile, type Policy } from '../../../../agent-core/src/profile';

type Status = { bot_configured: boolean; links: number; kill_switch: boolean; my_linked: boolean };

function parseLeads(text: string): { projectLabel: string; personLabel: string }[] | null {
  const rows = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const leads = [];
  for (const line of rows) {
    const [projectLabel, personLabel] = line.split('=').map((part) => part.trim());
    if (!projectLabel || !personLabel || line.split('=').length !== 2) return null;
    leads.push({ projectLabel, personLabel });
  }
  return leads;
}

export default function TelegramLinkPanel({ orgId, isOwner }: { orgId: string; isOwner: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [expires, setExpires] = useState('');
  const [token, setToken] = useState('');
  const [hour, setHour] = useState('');
  const [minutes, setMinutes] = useState('');
  const [leads, setLeads] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase.rpc('planner_channel_status', { p_org_id: orgId });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) setNote('Kanal belum siap di server.');
    else setStatus(row as Status);
    const { data: profile } = await supabase.from('planner_company_profiles').select('document').eq('org_id', orgId).maybeSingle();
    const document = (profile?.document ?? {}) as Partial<CompanyProfile>;
    const policies = document.policies ?? [];
    setHour(String(policies.find((item) => item.key === 'jam_tanya_progres')?.value ?? ''));
    setMinutes(String(policies.find((item) => item.key === 'batas_balasan_menit')?.value ?? ''));
    setLeads((document.projectLeads ?? []).map((item) => `${item.projectLabel} = ${item.personLabel}`).join('\n'));
  }

  useEffect(() => { load().catch(() => setNote('Kanal belum siap di server.')); }, [orgId]);

  async function link() {
    setBusy(true);
    setLinkCode('');
    try {
      const { data, error } = await supabase.functions.invoke('tg-link', { body: { org_id: orgId } });
      if (error || !data?.link_code) {
        setNote('Kode tautan belum bisa dibuat.');
        return;
      }
      setLinkCode(String(data.link_code));
      setExpires(String(data.expires_at || ''));
      setNote('Kirim kode ini ke bot. Berlaku 10 menit dan hanya sekali.');
    } finally {
      setBusy(false);
    }
  }

  async function saveToken() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('tg-secret', { body: { org_id: orgId, token } });
      setToken('');
      if (error || !data?.ok) {
        setNote(data?.fix_hint || 'Token belum tersimpan.');
        return;
      }
      setNote(data.webhook ? 'Token tersimpan dan webhook terpasang.' : 'Token tersimpan. Webhook menyusul setelah secret server dipasang.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveSchedule() {
    const askHour = Number(hour);
    const replyMinutes = Number(minutes);
    const projectLeads = parseLeads(leads);
    if (!Number.isInteger(askHour) || !Number.isInteger(replyMinutes) || !projectLeads) {
      setNote('Isi jam 0-23, batas menit, dan baris Proyek = Nama.');
      return;
    }
    const { data: current } = await supabase.from('planner_company_profiles').select('version, document').eq('org_id', orgId).maybeSingle();
    const base = { ...emptyProfile(), ...((current?.document ?? {}) as CompanyProfile) };
    const policies: Policy[] = (base.policies ?? []).filter((item) => item.key !== 'jam_tanya_progres' && item.key !== 'batas_balasan_menit');
    policies.push({ key: 'jam_tanya_progres', domain: 'proyek', value: askHour, min: 0, max: 23 });
    policies.push({ key: 'batas_balasan_menit', domain: 'proyek', value: replyMinutes, min: 15, max: 1440 });
    const problems = policyProblems(policies);
    if (problems.length) {
      setNote(problems[0].fix_hint);
      return;
    }
    const version = current?.version ? Number(current.version) + 1 : 1;
    const document = { ...base, version, policies, projectLeads };
    const versionInsert = await supabase.from('planner_company_profile_versions').insert({ org_id: orgId, version, document });
    if (versionInsert.error) {
      setNote('Versi profil belum tersimpan.');
      return;
    }
    const saved = await supabase.from('planner_company_profiles').upsert({ org_id: orgId, version, document, updated_at: new Date().toISOString() });
    setNote(saved.error ? 'Profil belum tersimpan.' : 'Jadwal lapangan tersimpan di profil perusahaan.');
  }

  async function toggleKill() {
    if (!status) return;
    const next = !status.kill_switch;
    const { error } = await supabase.from('planner_agent_settings').upsert({ org_id: orgId, kill_switch: next });
    if (error) {
      setNote('Saklar agen belum berubah.');
      return;
    }
    setStatus({ ...status, kill_switch: next });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
      <div>
        <h3 className="font-bold text-slate-800">Telegram lapangan</h3>
        <p className="text-xs text-slate-500">Bot {status?.bot_configured ? 'tersimpan di server' : 'belum dipasang'}. Tautan Anda {status?.my_linked ? 'aktif' : 'belum ada'}. {status?.links ?? 0} akun tertaut.</p>
      </div>
      <button type="button" onClick={link} disabled={busy} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">Hubungkan Telegram</button>
      {linkCode && <p className="font-mono text-lg text-slate-900">{linkCode}</p>}
      {expires && <p className="text-xs text-slate-500">Berlaku sampai {new Date(expires).toLocaleString('id-ID')}</p>}
      {note && <p className="text-sm text-slate-600">{note}</p>}
      <p className="text-xs text-slate-500">Agen {status?.kill_switch ? 'dimatikan' : 'aktif'} untuk organisasi ini.</p>
      {isOwner && (
        <div className="space-y-3">
          <button type="button" onClick={toggleKill} className="text-sm font-semibold text-slate-700 underline">{status?.kill_switch ? 'Nyalakan agen' : 'Matikan agen'}</button>
          <label className="block text-xs font-semibold text-slate-500">Token bot
            <input type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
          </label>
          <button type="button" onClick={saveToken} disabled={busy || token.length < 20} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50">Simpan token bot</button>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-500">Jam tanya progres
              <input value={hour} onChange={(event) => setHour(event.target.value)} inputMode="numeric" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </label>
            <label className="text-xs font-semibold text-slate-500">Batas balasan (menit)
              <input value={minutes} onChange={(event) => setMinutes(event.target.value)} inputMode="numeric" className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-500">Penanggung jawab per proyek
            <textarea value={leads} onChange={(event) => setLeads(event.target.value)} rows={3} placeholder={'Rumah Bu Ana = Budi'} className="mt-1 w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm" />
          </label>
          <button type="button" onClick={saveSchedule} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold">Simpan jadwal</button>
        </div>
      )}
    </div>
  );
}
