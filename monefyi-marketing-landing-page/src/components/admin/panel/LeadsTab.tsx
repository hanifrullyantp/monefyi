import React, { useMemo, useState } from 'react';
import { Download, MessageCircle, Search, Trash2, User } from 'lucide-react';
import type { SiteSettings } from '../../../types';
import { SectionCard } from '../SectionCard';
import { cn } from '../../../lib/cn';

interface LeadsTabProps {
  settings: SiteSettings;
  onChange: (settings: SiteSettings) => void;
}

export function LeadsTab({ settings, onChange }: LeadsTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const leads = settings.leads || [];

  const filteredLeads = useMemo(
    () =>
      leads.filter((l: { name?: string; whatsapp?: string; status?: string }) => {
        const q = search.toLowerCase();
        const matchSearch =
          (l.name || '').toLowerCase().includes(q) || (l.whatsapp || '').includes(search);
        const matchStatus = statusFilter === 'all' || l.status === statusFilter;
        return matchSearch && matchStatus;
      }),
    [leads, search, statusFilter]
  );

  const updateStatus = (id: string, status: string) => {
    onChange({
      ...settings,
      leads: leads.map((l: { id: string; status?: string }) =>
        l.id === id ? { ...l, status } : l
      ),
    });
  };

  const deleteLead = (id: string) => {
    if (!confirm('Hapus lead ini?')) return;
    onChange({ ...settings, leads: leads.filter((l: { id: string }) => l.id !== id) });
  };

  const exportCsv = () => {
    const rows = [['name', 'whatsapp', 'city', 'status', 'source', 'createdAt']];
    leads.forEach((l: Record<string, string>) => {
      rows.push([
        l.name || '',
        l.whatsapp || '',
        l.city || '',
        l.status || '',
        l.source || '',
        l.createdAt || '',
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monefyi-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LeadStat label="Total Leads" value={leads.length} color="blue" />
        <LeadStat
          label="Lead Baru"
          value={leads.filter((l: { status?: string }) => l.status === 'baru').length}
          color="amber"
        />
        <LeadStat
          label="Deal Rate"
          value={
            leads.length
              ? `${Math.round((leads.filter((l: { status?: string }) => l.status === 'deal').length / leads.length) * 100)}%`
              : '0%'
          }
          color="green"
        />
      </div>

      <SectionCard title="CRM Leads">
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau WhatsApp..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="baru">Lead Baru</option>
              <option value="dihubungi">Dihubungi</option>
              <option value="deal">Deal</option>
            </select>
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold text-white border border-slate-700"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead>
              <tr className="text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Lokasi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Follow-up</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500 text-sm">
                    Belum ada lead. Data checkout funnel akan muncul di sini.
                  </td>
                </tr>
              )}
              {filteredLeads.map((l: Record<string, string>) => (
                <tr key={l.id} className="hover:bg-white/5">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-white">{l.name || '—'}</p>
                        <p className="text-xs text-slate-500">{l.whatsapp || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-400 text-xs">{l.city || '—'}</td>
                  <td className="px-4 py-4">
                    <select
                      value={l.status || 'baru'}
                      onChange={(e) => updateStatus(l.id, e.target.value)}
                      className="text-[10px] font-black uppercase bg-slate-800 text-blue-400 px-2 py-1 rounded-lg border-none"
                    >
                      <option value="baru">Baru</option>
                      <option value="dihubungi">Dihubungi</option>
                      <option value="deal">Deal</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {l.whatsapp ? (
                      <a
                        href={`https://wa.me/${l.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white"
                      >
                        <MessageCircle size={14} />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => deleteLead(l.id)}
                      className="text-slate-600 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function LeadStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    amber: 'text-amber-400',
  };
  return (
    <div className="p-5 bg-slate-800/40 border border-white/5 rounded-2xl">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h4 className={cn('text-2xl font-black', colors[color])}>{value}</h4>
    </div>
  );
}
