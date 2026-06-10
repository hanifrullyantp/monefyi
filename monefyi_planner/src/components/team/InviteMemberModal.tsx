import { useState } from 'react';
import { X, Link2, Mail, Hash, Copy, Share2, UserRoundPlus, Send } from 'lucide-react';
import {
  createInvitation,
  sendInvitationEmails,
  listInvitations,
  revokeInvitation,
  directCreateMembers,
} from '../../services/invitationService';
import { parseEmailList } from '../../lib/validators';
import { showToast } from '../../store/uiStore';
import type { InvitationRecord, MemberRole } from '../../types/onboarding';

interface Props {
  orgId: string;
  actorRole: string;
  onClose: () => void;
  onCreated?: () => void;
}

type Tab = 'link' | 'email' | 'code' | 'direct';

type DirectItem = {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: MemberRole;
};

type DirectResult = {
  ok: boolean;
  member_id?: string;
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  error?: string;
  password?: string;
};

export default function InviteMemberModal({ orgId, actorRole, onClose, onCreated }: Props) {
  const [tab, setTab] = useState<Tab>('link');
  const [role, setRole] = useState<MemberRole>('worker');
  const [expiry, setExpiry] = useState('7d');
  const [maxUses, setMaxUses] = useState('1');
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ join_url?: string; code?: string; invitation?: InvitationRecord } | null>(null);
  const [codes, setCodes] = useState<InvitationRecord[]>([]);
  const [csvPreview, setCsvPreview] = useState<{ email: string; role: string }[]>([]);
  const [directInput, setDirectInput] = useState('');
  const [directRows, setDirectRows] = useState<DirectItem[]>([]);
  const [directResults, setDirectResults] = useState<DirectResult[]>([]);

  const canInviteManager = actorRole === 'owner';
  const canDirectCreate = actorRole === 'owner';

  const loadCodes = async () => {
    const list = await listInvitations(orgId);
    setCodes(list.filter(i => i.type === 'code'));
  };

  const handleCreateLink = async () => {
    setLoading(true);
    try {
      const res = await createInvitation({ org_id: orgId, type: 'link', role, expiry, max_uses: maxUses });
      setResult(res);
      showToast('Link undangan dibuat', 'success');
      onCreated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    const emails = parseEmailList(emailInput);
    if (!emails.length) {
      showToast('Masukkan email valid', 'error');
      return;
    }
    setLoading(true);
    try {
      const created = await createInvitation({ org_id: orgId, type: 'email', role, expiry, max_uses: '1', personal_message: message });
      const sendRes = await sendInvitationEmails(created.invitation.id, emails);
      const ok = sendRes.results.filter(r => r.ok).length;
      showToast(`${ok}/${emails.length} email terkirim`, ok ? 'success' : 'error');
      onCreated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    setLoading(true);
    try {
      const res = await createInvitation({ org_id: orgId, type: 'code', role, expiry, max_uses: maxUses });
      setResult(res);
      await loadCodes();
      showToast('Kode dibuat', 'success');
      onCreated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Disalin', 'success');
  };

  const shareWa = (url: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Gabung tim kami: ${url}`)}`, '_blank');
  };

  const toWaPhone = (phone?: string) => (phone || '').replace(/[^\d]/g, '');

  const loginMessage = (row: { name?: string; email?: string; password?: string }) =>
    [
      `Halo ${row.name || 'Tim'},`,
      '',
      'Akun Anda sudah dibuat di Monefyi Planner.',
      `Link login: ${window.location.origin}/login`,
      `Email: ${row.email || '-'}`,
      `Password: ${row.password || '-'}`,
      '',
      'Silakan login dan segera ganti password setelah masuk.',
    ].join('\n');

  const sendDirectWa = (row: { name?: string; email?: string; password?: string; phone?: string }) => {
    const phone = toWaPhone(row.phone);
    if (!phone) {
      showToast('Nomor HP kosong / tidak valid', 'error');
      return;
    }
    const text = loginMessage(row);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result).split('\n').slice(1);
      const rows = lines
        .map(l => l.split(',').map(c => c.trim()))
        .filter(r => r[0])
        .slice(0, 50)
        .map(r => ({ email: r[0], role: r[1] || 'worker' }));
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  };

  const sendCsvBatch = async () => {
    setLoading(true);
    let ok = 0;
    for (const row of csvPreview.slice(0, 10)) {
      try {
        const created = await createInvitation({
          org_id: orgId,
          type: 'email',
          role: row.role as MemberRole,
          expiry: '7d',
          email: row.email,
        });
        await sendInvitationEmails(created.invitation.id, [row.email]);
        ok++;
      } catch {
        /* continue */
      }
    }
    showToast(`${ok}/${Math.min(csvPreview.length, 10)} terkirim`, ok ? 'success' : 'error');
    setLoading(false);
    onCreated?.();
  };

  const parseDirectRows = () => {
    const lines = directInput
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 50);

    const rows = lines
      .map(line => line.split(',').map(v => v.trim()))
      .map(parts => ({
        name: parts[0] || '',
        email: parts[1] || '',
        password: parts[2] || '',
        phone: parts[3] || '',
        role,
      }))
      .filter(r => r.name && r.email && r.password);

    setDirectRows(rows);
    setDirectResults([]);
    showToast(`${rows.length} baris siap diproses`, rows.length ? 'success' : 'error');
  };

  const handleDirectCreate = async () => {
    if (!directRows.length) {
      showToast('Tidak ada data valid. Klik Parse dulu.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await directCreateMembers({
        org_id: orgId,
        items: directRows.map(r => ({
          name: r.name,
          email: r.email,
          password: r.password,
          phone: r.phone,
          role: r.role,
        })),
      });

      const byEmail = new Map(directRows.map(r => [r.email.toLowerCase(), r]));
      const merged = (res.results || []).map(item => {
        const src = byEmail.get((item.email || '').toLowerCase());
        return {
          ...item,
          password: src?.password || '',
        };
      });
      setDirectResults(merged);
      showToast(`${res.created}/${directRows.length} akun berhasil dibuat`, res.created ? 'success' : 'error');
      onCreated?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal create akun', 'error');
    } finally {
      setLoading(false);
    }
  };

  const qrUrl = result?.join_url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.join_url)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Undang Anggota</h2>
          <button type="button" onClick={onClose} aria-label="Tutup"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="flex border-b border-slate-100">
          {([
            { id: 'link', icon: Link2, label: 'Link' },
            { id: 'email', icon: Mail, label: 'Email' },
            { id: 'code', icon: Hash, label: 'Kode' },
            ...(canDirectCreate ? [{ id: 'direct', icon: UserRoundPlus, label: 'Direct' }] : []),
          ] as const).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); if (t.id === 'code') loadCodes(); setResult(null); }}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1 ${tab === t.id ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as MemberRole)} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                <option value="worker">Worker</option>
                {canInviteManager && <option value="manager">Manager</option>}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Kedaluwarsa</label>
              <select value={expiry} onChange={e => setExpiry(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                <option value="1d">1 hari</option>
                <option value="7d">7 hari</option>
                <option value="30d">30 hari</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>

          {tab === 'link' && (
            <>
              <div>
                <label className="text-xs text-slate-500">Max uses</label>
                <select value={maxUses} onChange={e => setMaxUses(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm">
                  <option value="1">1</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>
              {!result ? (
                <button type="button" onClick={handleCreateLink} disabled={loading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-60">
                  Generate Link
                </button>
              ) : (
                <div className="space-y-3">
                  <input readOnly value={result.join_url || ''} className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-50" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => copyText(result.join_url || '')} className="flex-1 py-2 border rounded-lg text-sm flex items-center justify-center gap-1"><Copy className="w-4 h-4" /> Copy</button>
                    <button type="button" onClick={() => shareWa(result.join_url || '')} className="flex-1 py-2 border rounded-lg text-sm flex items-center justify-center gap-1"><Share2 className="w-4 h-4" /> WA</button>
                  </div>
                  {qrUrl && <img src={qrUrl} alt="QR Code" className="mx-auto w-40 h-40 border rounded-lg" />}
                </div>
              )}
            </>
          )}

          {tab === 'email' && (
            <>
              <textarea value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="Email (pisah koma/newline, max 10)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm h-24" />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Pesan personal (opsional)" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm h-16" />
              <button type="button" onClick={handleSendEmail} disabled={loading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">Kirim Undangan</button>
              <div className="border-t pt-3">
                <p className="text-xs text-slate-500 mb-2">Bulk CSV (email,role,name,position)</p>
                <input type="file" accept=".csv" onChange={e => e.target.files?.[0] && handleCsv(e.target.files[0])} className="text-xs" />
                {csvPreview.length > 0 && (
                  <>
                    <p className="text-xs mt-2">{csvPreview.length} baris — preview {Math.min(10, csvPreview.length)} pertama akan dikirim</p>
                    <button type="button" onClick={sendCsvBatch} disabled={loading} className="mt-2 w-full py-2 border rounded-lg text-sm font-semibold">Kirim batch CSV</button>
                  </>
                )}
              </div>
            </>
          )}

          {tab === 'code' && (
            <>
              {!result ? (
                <button type="button" onClick={handleCreateCode} disabled={loading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">Buat Kode</button>
              ) : (
                <div className="text-center py-4">
                  <div className="text-4xl font-black tracking-widest text-emerald-600">{result.code}</div>
                  <button type="button" onClick={() => copyText(result.code || '')} className="mt-3 text-sm text-emerald-600 font-semibold">Salin kode</button>
                </div>
              )}
              {codes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Kode aktif</p>
                  {codes.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-50 text-sm">
                      <span className="font-mono font-bold">{c.code}</span>
                      <button type="button" onClick={async () => { await revokeInvitation(c.id); loadCodes(); showToast('Dicabut', 'success'); }} className="text-rose-600 text-xs">Revoke</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'direct' && canDirectCreate && (
            <>
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
                <p className="text-xs text-slate-600 font-semibold">Format per baris:</p>
                <p className="text-xs text-slate-500 mt-1">nama,email,password,no_hp</p>
              </div>
              <textarea
                value={directInput}
                onChange={e => setDirectInput(e.target.value)}
                placeholder={'Budi Santoso,budi@contoh.com,Budi#2026,628123456789\nSari Dewi,sari@contoh.com,Sari#2026,628987654321'}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm h-32"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={parseDirectRows}
                  className="flex-1 py-2 border rounded-lg text-sm font-semibold"
                >
                  Parse List
                </button>
                <button
                  type="button"
                  onClick={handleDirectCreate}
                  disabled={loading || !directRows.length}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold disabled:opacity-60"
                >
                  Buat Akun
                </button>
              </div>

              {directRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Preview ({directRows.length})</p>
                  <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                    {directRows.map((r, idx) => (
                      <div key={`${r.email}-${idx}`} className="px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{r.name}</div>
                          <div className="text-slate-500 truncate">{r.email} · {r.phone || '-'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendDirectWa(r)}
                          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 border rounded-md text-emerald-600"
                        >
                          <Send className="w-3 h-3" /> Direct WA
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {directResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Hasil pembuatan akun</p>
                  <div className="max-h-52 overflow-y-auto border rounded-lg divide-y">
                    {directResults.map((r, idx) => (
                      <div key={`${r.email}-${idx}`} className="px-3 py-2 text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className={`font-semibold truncate ${r.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {r.ok ? 'Berhasil' : 'Gagal'} · {r.name || r.email || `Baris ${idx + 1}`}
                          </div>
                          <div className="text-slate-500 truncate">
                            {r.email} {r.error ? `· ${r.error}` : ''}
                          </div>
                        </div>
                        {r.ok && (
                          <button
                            type="button"
                            onClick={() => sendDirectWa(r)}
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 border rounded-md text-emerald-600"
                          >
                            <Send className="w-3 h-3" /> Direct WA
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
