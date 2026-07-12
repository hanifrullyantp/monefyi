import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { analyzeProject, type AnalyzeResult } from '../../../services/analyzeService';

type Props = {
  projectId: string;
};

export default function TabV2Analisa({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await analyzeProject(projectId);
        if (!cancelled) setResult(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal analisa');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!result) return null;

  return (
    <div className="bg-white rounded-2xl border p-5 space-y-3 text-sm">
      <h3 className="font-bold">Analisa AI</h3>
      {result.recommendations?.map((rec, i) => (
        <div key={i} className="p-3 bg-emerald-50 rounded-xl">
          <div className="font-semibold text-slate-800">{rec.title}</div>
          <p className="text-slate-600 mt-1">{rec.message}</p>
        </div>
      ))}
      {!result.recommendations?.length && (
        <p className="text-slate-500">Tidak ada rekomendasi saat ini.</p>
      )}
    </div>
  );
}
