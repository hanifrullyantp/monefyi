import { useRef, useState } from "react";
import { AlertTriangle, BarChart3, Loader2, Play, ShieldCheck, Upload } from "lucide-react";
import type { BacktestResult } from "../../integration/engineClient";
import { useEstimator } from "../context";
import { Badge, Button, Card, EmptyState, Eyebrow } from "../components";
import { ScreenTitle } from "../Shell";
import { numberId } from "../format";
import { StatusNote } from "./parts";

const SAMPLE = `area,finishing,floors,location,rab_final,realisasi,aktual_struktur,aktual_lantai
45,menengah,1,Yogyakarta,245000000,238000000,,
70,standar,2,Bandung,330000000,345000000,,
`;

export function BacktestScreen() {
  const { engine, applyCalibration } = useEstimator();
  const [csv, setCsv] = useState(SAMPLE);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    setRunning(true);
    try {
      const r = await engine.runBacktest(csv);
      setResult(r.result);
      setErrors(r.errors);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Back-test gagal."]);
    } finally {
      setRunning(false);
    }
  };

  const usable = result?.proposals.filter((p) => p.proposed !== 1) ?? [];

  return (
    <div className="max-w-4xl">
      <ScreenTitle title="Back-test" subtitle="Engine menghitung tiap baris hanya dari parameter (tanpa melihat jawaban), lalu dibandingkan dengan realisasi. CSV contoh di bawah hanya format — ganti dengan data proyekmu." right={<Badge tone="green"><ShieldCheck className="h-3 w-3" /> blind-run</Badge>} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between"><Eyebrow>CSV parameter + realisasi</Eyebrow><button onClick={() => fileRef.current?.click()} className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-line px-3 text-[12px] font-bold text-muted"><Upload className="h-4 w-4" /> Berkas</button></div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Unggah CSV back-test" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
          <label htmlFor="bt-csv" className="mb-1 block text-[11px] text-label">Wajib: area, finishing, floors, rab_final, realisasi. Opsional: location, aktual_&lt;paket&gt; (mis. aktual_struktur) untuk error per paket.</label>
          <textarea id="bt-csv" value={csv} onChange={(e) => setCsv(e.target.value)} rows={10} spellCheck={false} className="w-full rounded-xl border border-line bg-[#fbfdfc] px-3 py-2 font-mono text-[11px] leading-5 outline-none focus:border-[#a7d7c6]" />
          {errors.length > 0 && <p role="alert" className="mt-2 rounded-lg bg-[#fef2f2] px-3 py-2 text-[11px] text-[#991b1b]"><AlertTriangle className="mr-1 inline h-3 w-3" />{errors.join(" ")}</p>}
          <Button className="mt-2" onClick={() => void run()} disabled={running || !csv.trim()}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Jalankan back-test</Button>
        </Card>
        <div className="space-y-3">
          {!result ? <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="Belum ada hasil" description="Jalankan back-test untuk melihat MAPE, median, P90, dan bias." /> : (
            <>
              <Card className="p-4">
                <p className="text-[13px] font-extrabold text-ink">Hasil {result.rows} proyek</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[["MAPE", result.mape], ["Median error", result.medianError], ["P90 error", result.p90Error], ["Bias", result.bias]].map(([l, v]) => <div key={String(l)} className="rounded-xl border border-line bg-[#fbfdfc] p-2.5"><p className="text-[10px] font-bold uppercase text-label">{l}</p><p className="text-[17px] font-extrabold text-ink">{l === "Bias" && Number(v) > 0 ? "+" : ""}{numberId(Number(v), 1)}%</p></div>)}
                </div>
                <p className="mt-2 rounded-xl bg-[#f4fbf7] px-3 py-2 text-[12px] font-semibold text-[#28604b]">{result.underYPercent}% proyek error di bawah {result.underYTarget}%.</p>
                {result.rows < 5 && <StatusNote>Sampel {result.rows} proyek terlalu kecil untuk menyimpulkan akurasi.</StatusNote>}
              </Card>
              <Card className="p-4">
                <Eyebrow>Error per paket</Eyebrow>
                {result.packageErrors ? <div className="mt-2 space-y-1.5">{result.packageErrors.map((p) => <div key={p.key} className="flex justify-between text-[12px]"><span className="text-muted">{p.label} <span className="text-label">(n={p.n})</span></span><strong>{numberId(p.mape, 1)}%</strong></div>)}</div> : <p className="mt-2 text-[12px] text-muted">Perlu data per paket — tambahkan kolom <code>aktual_&lt;paket&gt;</code> pada CSV.</p>}
              </Card>
              <Card className="p-4">
                <Eyebrow>Usulan faktor finishing</Eyebrow>
                <div className="mt-2 space-y-1.5">{result.proposals.map((p) => <p key={p.key} className="text-[12px] text-muted"><strong className="capitalize text-ink">{p.key}</strong>: faktor {p.proposed} — {p.reason}</p>)}</div>
                {usable.length > 0 ? <Button className="mt-2" onClick={() => applyCalibration({ finishing: Object.fromEntries(usable.map((p) => [p.key, p.proposed])), wilayah: {}, produktivitas: 1 }, `Back-test ${result.rows} proyek`)}>Setujui & terapkan sebagai versi kalibrasi</Button> : <p className="mt-2 text-[11px] text-label">Tidak ada usulan yang berbeda dari 1 (sampel kurang atau rasio netral).</p>}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
