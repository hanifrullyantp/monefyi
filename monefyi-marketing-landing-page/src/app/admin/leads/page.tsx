import React, { useState, useMemo } from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { SectionCard } from '../../components/admin/SectionCard';
import { Badge } from '../../components/ui/Badge';
import { Search, Filter, Download, MessageCircle, Trash2, Calendar, MapPin, User } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function LeadsPage() {
  const { settings, setSettings } = useSiteSettings();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const leads = settings.leads || [];

  const filteredLeads = useMemo(() => {
    return leads.filter((l: any) => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.whatsapp.includes(search);
      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const updateStatus = (id: string, status: string) => {
    const nextLeads = leads.map((l: any) => l.id === id ? { ...l, status } : l);
    setSettings({ ...settings, leads: nextLeads });
  };

  const deleteLead = (id: string) => {
    if (confirm('Hapus lead ini?')) {
      const nextLeads = leads.filter((l: any) => l.id !== id);
      setSettings({ ...settings, leads: nextLeads });
    }
  };

  const getStatusColor = (status: string): any => {
    switch (status) {
      case 'baru': return 'slate';
      case 'dihubungi': return 'blue';
      case 'deal': return 'green';
      default: return 'slate';
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LeadStat label="Total Leads" value={leads.length} color="blue" />
        <LeadStat label="Lead Baru" value={leads.filter((l:any) => l.status === 'baru').length} color="amber" />
        <LeadStat label="Deal Rate" value={leads.length ? `${Math.round((leads.filter((l:any) => l.status === 'deal').length / leads.length) * 100)}%` : '0%'} color="green" />
      </div>

      <SectionCard>
        <div className="flex flex-col md:flex-row gap-4 justify-between mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau WhatsApp..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-green-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
             <select 
               value={statusFilter}
               onChange={e => setStatusFilter(e.target.value)}
               className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
             >
                <option value="all">Semua Status</option>
                <option value="baru">Lead Baru</option>
                <option value="dihubungi">Dihubungi</option>
                <option value="deal">Deal</option>
             </select>
             <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all border border-slate-700">
                <Download size={16} /> Export
             </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 md:-mx-8">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-y border-white/5">
                <th className="px-8 py-4">Pengguna</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Follow-up</th>
                <th className="px-8 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.map((l: any) => (
                <tr key={l.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold"><User size={16}/></div>
                      <div>
                        <p className="font-bold text-white leading-none">{l.name}</p>
                        <p className="text-xs text-slate-500 mt-1.5">{l.whatsapp}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={14} />
                      <span className="text-xs">{l.city}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <select 
                      value={l.status}
                      onChange={e => updateStatus(l.id, e.target.value)}
                      className={cn(
                        "text-[10px] font-black uppercase px-2 py-1 rounded-lg border-none bg-slate-800",
                        l.status === 'deal' ? "text-green-400" : "text-blue-400"
                      )}
                    >
                      <option value="baru">Baru</option>
                      <option value="dihubungi">Dihubungi</option>
                      <option value="deal">Deal</option>
                    </select>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center gap-2">
                       <a href={`https://wa.me/${l.whatsapp}`} target="_blank" className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500 hover:text-white transition-all"><MessageCircle size={14}/></a>
                       <button className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-all text-[10px] font-black">W</button>
                       <button className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-all text-[10px] font-black">1</button>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button onClick={() => deleteLead(l.id)} className="text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
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

function LeadStat({ label, value, color }: any) {
  const colors: any = { blue: 'text-blue-400', green: 'text-green-400', amber: 'text-amber-400' };
  return (
    <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-3xl">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <h4 className={cn("text-3xl font-black", colors[color])}>{value}</h4>
    </div>
  );
}
