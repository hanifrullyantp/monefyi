import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { explainAction } from '../../../../agent-core/src/runtime';
import { useAppStore } from '../../store/appStore';
import { executeIntent } from '../../lib/intentExecutor';
import { loadWorkItems } from '../../services/workItemService';
import { showToast } from '../../store/uiStore';
import { DIVISIONS, type DivisionId } from '../../services/managerAgentService';

type Report = { report_date: string; body: string };
type ActionRow = {
  id: string;
  status: string;
  tool_name: string;
  sop_step: string;
  policy_key: string | null;
  impact: {
    text?: string;
    sop_id?: string;
    intent?: string;
    params?: Record<string, unknown>;
  } | null;
};

export default function AgentHomePanel({ orgId }: { orgId: string }) {
  const navigate = useNavigate();
  const { user, projects, refreshData, setCommandModalOpen } = useAppStore();
  const [report, setReport] = useState<Report | null>(null);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function setStatus(item: ActionRow, status: 'approved' | 'rejected') {
    setBusyId(item.id);
    try {
      if (status === 'approved' && user && (item.impact?.intent || item.impact?.params)) {
        const execRes = await executeIntent(
          {
            intent: item.impact?.intent || item.tool_name,
            params: item.impact?.params || {},
            confidence: 1,
            raw: item.impact?.text || item.tool_name,
          },
          {
            userId: user.id,
            orgId,
            projects,
            currentProject: projects[0] || null,
            workItems: [],
            onNavigate: p => navigate(p),
            onRefreshProjects: refreshData,
            loadWorkItemsForProject: loadWorkItems,
          },
        );
        if (execRes.success) {
          showToast(execRes.message, 'success');
        }
      }
      const { error } = await supabase.from('planner_agent_actions').update({ status }).eq('id', item.id);
      if (!error) {
        setActions((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-slate-800 text-sm">👔 General Manager & Tim AI</h2>
          <p className="text-xs text-slate-500">Orkestrasi 5 divisi operasional proyek</p>
        </div>
        <button
          type="button"
          onClick={() => {
            try { localStorage.setItem('monefyi_ai_mode', 'manager'); } catch { /* ignore */ }
            setCommandModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
        >
          Ngobrol & Perintah GM
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['project', 'finance', 'estimator', 'hr', 'purchasing'] as DivisionId[]).map(d => (
          <span key={d} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
            {DIVISIONS[d].emoji} {DIVISIONS[d].label}
          </span>
        ))}
      </div>

      <p className="text-sm text-slate-600">
        {report
          ? report.body
          : `Memantau ${projects.filter(p => p.status !== 'archived').length} proyek aktif. Klik "Ngobrol & Perintah GM" untuk diskusi strategi atau mendelegasikan tugas ke divisi.`}
      </p>

      <div className="space-y-2">
        {queue.length === 0 ? (
          <p className="text-xs text-slate-500">Antrean persetujuan kosong.</p>
        ) : queue.map((item) => (
          <div key={item.id} className="rounded-xl border border-amber-100 p-3 text-sm">
            <p className="font-semibold text-slate-800">{item.impact?.text || item.tool_name}</p>
            <p className="text-xs text-slate-500">Draf · {item.tool_name}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={busyId === item.id}
                className="text-xs font-semibold text-emerald-700 disabled:opacity-50"
                onClick={() => setStatus(item, 'approved')}
              >
                Setujui & Eksekusi
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                className="text-xs font-semibold text-rose-700 disabled:opacity-50"
                onClick={() => setStatus(item, 'rejected')}
              >
                Tolak
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-slate-600"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
              >
                Kenapa agen melakukan ini
              </button>
            </div>
            {openId === item.id && (
              <p className="mt-2 text-xs text-slate-600">
                {explainAction({ sopId: item.impact?.sop_id || 'sop', sopStep: item.sop_step, policyKey: item.policy_key })}
              </p>
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
