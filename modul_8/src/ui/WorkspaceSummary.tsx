import { useState } from 'react';
import { ArrowUpRight, BookOpen, ChartPie, ChevronRight, Database, FolderInput, Layers3 } from 'lucide-react';
import type { Project, RabResult } from '../data/types';
import { useEstimator, type ScreenName } from './context';
import { Modal } from './components';
import { rupiah } from './format';

const shortcuts: { label: string; hint: string; screen: ScreenName; icon: typeof Database; color: string }[] = [
  { label: 'Database harga', hint: 'Komponen dan analisis biaya', screen: 'prices', icon: Database, color: 'green' },
  { label: 'Impor & ekspor', hint: 'Dataset dan cadangan proyek', screen: 'transfer', icon: FolderInput, color: 'blue' },
  { label: 'Pelajaran AI', hint: 'Tinjau pola dari koreksi', screen: 'lessons', icon: BookOpen, color: 'violet' },
];

export function WorkspaceSummary({ projects, estimates, unavailable = false }: { projects: Project[]; estimates: Record<string, RabResult>; unavailable?: boolean }) {
  const { engine, navigate } = useEstimator();
  const [details, setDetails] = useState(false);
  const active = projects.filter(p => !p.archived);
  const loaded = active.every(p => estimates[p.id]);
  const rollup = loaded ? engine.summarizePortfolio(active.map(p => estimates[p.id].rap)) : null;
  const parts = rollup ? [
    { label: 'Modal proyek (RAP)', value: rollup.rap, color: '#237f62' },
    { label: 'Margin sebelum PPN', value: rollup.margin, color: '#9ec5ab' },
    { label: 'PPN', value: rollup.ppn, color: '#e8b963' },
  ] : [];
  return <aside className="workspace-aside">
    <section className="portfolio-summary">
      <div className="aside-section-heading"><ChartPie size={17} strokeWidth={1.75}/><h3>Ikhtisar anggaran</h3></div>
      <p className="portfolio-label">Total RAB seluruh proyek</p>
      <strong className="portfolio-total">{rollup ? rupiah(rollup.total) : unavailable ? 'Estimasi belum tersedia' : active.length ? 'Memuat estimasi…' : 'Belum ada proyek'}</strong>
      {rollup && <>
        <div className="portfolio-bar" aria-label="Komposisi modal, margin, dan PPN">{parts.map(i => <span key={i.label} style={{ width: `${rollup.total ? i.value / rollup.total * 100 : 0}%`, background: i.color }} />)}</div>
        <dl className="portfolio-lines">{parts.map(i => <div key={i.label}><dt><i style={{ background: i.color }}/>{i.label}</dt><dd>{rupiah(i.value)}</dd></div>)}</dl>
        <button className="summary-link" onClick={() => setDetails(true)}>Lihat rekap anggaran <ArrowUpRight size={14}/></button>
      </>}
    </section>
    <section className="workspace-shortcuts">
      <div className="aside-section-heading"><Layers3 size={17} strokeWidth={1.75}/><h3>Akses cepat</h3></div>
      {shortcuts.map(({ label, hint, screen, icon: Icon, color }) => <button key={screen} onClick={() => navigate({ name: screen })}>
        <span className={`shortcut-symbol ${color}`}><Icon size={18} strokeWidth={1.6}/></span><span><b>{label}</b><small>{hint}</small></span><ChevronRight size={15}/>
      </button>)}
    </section>
    <Modal open={details} onClose={() => setDetails(false)} title="Rekap anggaran proyek" description="Akumulasi proyek aktif. Harga jual dan margin tidak termasuk PPN.">
      <div className="space-y-3">{active.map(p => { const r = estimates[p.id]; return r ? <button key={p.id} onClick={() => { setDetails(false); navigate({ name: 'rab', projectId: p.id }); }} className="block w-full rounded-xl border border-line p-4 text-left">
        <span className="flex justify-between text-sm font-bold">{p.name}<ArrowUpRight size={16}/></span>
        <dl className="mt-3 space-y-1.5 text-xs">{[['RAP', r.rap.rap], ['Margin', r.rap.margin], ['Harga sebelum PPN', r.rap.sellingPrice], ['PPN', r.ppn], ['Total pembeli', r.total]].map(([label, amount]) => <div key={label} className="flex justify-between gap-2"><dt className="text-muted">{label}</dt><dd className="font-semibold">{rupiah(Number(amount))}</dd></div>)}</dl>
      </button> : null; })}</div>
    </Modal>
  </aside>;
}