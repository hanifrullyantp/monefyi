import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { explainAction } from '../../../../agent-core/src/runtime';

type Report = { report_date: string; body: string };
type ActionRow = {
  id: string;
  status: string;
  tool_name: string;
  sop_step: string;
  policy_key: string | null;
  impact: { text?: string; sop_id?: string } | null;
};

export default function AgentHomePanel({ orgId }: { orgId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('planner_agent_reports').select('report_date, body').eq('org_id', orgId).order('report_date', { ascending: false }).limit(1),
      supabase.from('planner_agent_actions').select('id, status, tool_name, sop_step, policy_key, impact').eq('org_id', orgId).order('created_at', { ascending: false }).limit(8),
    ]).then(([reports, rows]) => {
      if (cancelled) return;
      setReport((reports.data?.[0] as Report | undefined) ?? null);
      setActions((rows.data as ActionRow[] | null) ?? []);
    }).catch(() => {
      if (!cancelled) setActions([]);
    });
    return () => { cancelled = true; };
  }, [orgId]);

  const queue = actions.filter((item) => item.status === 'draft');

  async function setStatus(id: string, status: 'approved' | 'rejected') {
    const { error } = await supabase.from('planner_agent_actions').update({ status }).eq('id', id);
    if (!error) setActions((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  return (
    <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
      <h2 className="font-bold text-slate-800 text-sm">Agen hari ini</h2>
      <p className="text-sm text-slate-600">{report ? report.body : 'Belum ada laporan pagi.'}</p>
      <div className="space-y-2">
        {queue.length === 0 ? <p className="text-xs text-slate-500">Antrean persetujuan kosong.</p> : queue.map((item) => (
          <div key={item.id} className="rounded-xl border border-amber-100 p-3 text-sm">
            <p className="font-semibold text-slate-800">{item.impact?.text || item.tool_name}</p>
            <p className="text-xs text-slate-500">Draf · {item.tool_name}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="text-xs font-semibold text-emerald-700" onClick={() => setStatus(item.id, 'approved')}>Setujui</button>
              <button type="button" className="text-xs font-semibold text-rose-700" onClick={() => setStatus(item.id, 'rejected')}>Tolak</button>
              <button type="button" className="text-xs font-semibold text-slate-600" onClick={() => setOpenId(openId === item.id ? null : item.id)}>Kenapa agen melakukan ini</button>
            </div>
            {openId === item.id && (
              <p className="mt-2 text-xs text-slate-600">{explainAction({ sopId: item.impact?.sop_id || 'sop', sopStep: item.sop_step, policyKey: item.policy_key })}</p>
            )}
          </div>
        ))}
      </div>
      {actions.length > 0 && (
        <ul className="text-xs text-slate-500 space-y-1">
          {actions.map((item) => <li key={item.id}>{item.status} · {item.tool_name}</li>)}
        </ul>
      )}
    </section>
  );
}
