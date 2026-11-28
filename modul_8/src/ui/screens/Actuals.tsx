import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, RotateCcw, Trash2 } from "lucide-react";
import type { ActualRecord } from "../../data/types";
import type { CalibrationReport } from "../../integration/engineClient";
import { CONFIG, PACKAGE_LABELS } from "../../data/config";
import { useEstimator, useRab } from "../context";
import { Badge, Button, Card, EmptyState, Eyebrow, Field, inputClass } from "../components";
import { ScreenTitle } from "../Shell";
import { formatDate, numberId, rupiah, shortRupiah } from "../format";
import { cn } from "../../utils/cn";

export function ActualsScreen({ projectId }: { projectId?: string }) {
  const { projects, state, engine, recordActuals, deleteActual, applyCalibration, revertCalibration, activeCalibration } = useEstimator();
  const active = projects.filter((p) => !p.archived);
  const [selected, setSelected] = useState(projectId ?? active[0]?.id ?? "");
  const project = active.find((p) => p.id === selected) ?? null;
  const { rab } = useRab(project);
  const [values, setValues] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState("");
  const [report, setReport] = useState<CalibrationReport | null>(null);

  useEffect(() => { let alive = true; engine.getCalibration().then((r) => alive && setReport(r)).catch(() => undefined); return () => { alive = false; }; }, [engine, state.actuals, state.calibrations]);
  useEffect(() => { setValues({}); setProgress(""); }, [selected]);

  const save = () => {
    if (!project || !rab) return;
    const perPaket = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Math.round(Number(v.replace(/[^\d]/g, "")))]).filter(([, v]) => Number(v) > 0));
    if (!Object.keys(perPaket).length) return;
    const record: ActualRecord = {
      id: `act-${project.id}-${Date.now()}`, projectId: project.id, tanggal: new Date().toISOString(), perPaket,
      progress: progress.trim() ? progress.split(/[,;\s]+/).map(Number).filter((n) => Number.isFinite(n)) : undefined,
      estimateAtRecord: { total: rab.total, perPaket: Object.fromEntries(rab.packages.map((p) => [p.key, Math.round(p.amount * (rab.total / Math.max(1, rab.subtotal)))])) },
      context: { finishing: project.model.finishing, location: project.model.location, area: project.model.area, floors: project.model.floors },
    };
    recordActuals(record);
    setValues({});
  };

  const records = state.actuals.slice().reverse();
  return (
    <div className="max-w-5xl">
      <ScreenTitle title="Realisasi & kalibrasi" subtitle="Masukkan biaya aktual per paket dari proyek yang sudah berjalan/selesai. Engine menghitung selisih dan mengusulkan faktor kalibrasi; tidak ada yang diterapkan tanpa persetujuanmu." />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <Field label="Proyek" htmlFor="act-project"><select id="act-project" value={selected} onChange={(e) => setSelected(e.target.value)} className={inputClass}>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          {!project || !rab ? <p className="mt-3 text-[12px] text-muted">Pilih proyek.</p> : (
            <>
              <p className="mt-3 text-[12px] text-muted">Estimasi engine sekarang: <strong className="text-ink">{rupiah(rab.total)}</strong>. Isi paket yang biayanya kamu ketahui (termasuk overhead & PPN); paket kosong diabaikan.</p>
              <div className="mt-2 space-y-1.5">
                {rab.packages.map((p) => {
                  const est = Math.round(p.amount * (rab.total / Math.max(1, rab.subtotal)));
                  const v = Number((values[p.key] ?? "").replace(/[^\d]/g, ""));
                  const diff = v > 0 ? Math.round(((v - est) / est) * 1000) / 10 : null;
                  return (
                    <div key={p.key} className="grid grid-cols-[1fr_140px] items-center gap-2">
                      <label htmlFor={`act-${p.key}`} className="text-[12px] text-[#405160]">{PACKAGE_LABELS[p.key]}<span className="block text-[10px] text-label">estimasi {shortRupiah(est)}{diff !== null && <span className={cn("ml-1 font-bold", diff > 0 ? "text-[#b45309]" : "text-accent")}>{diff > 0 ? "+" : ""}{diff}%</span>}</span></label>
                      <input id={`act-${p.key}`} inputMode="numeric" value={values[p.key] ?? ""} onChange={(e) => setValues((prev) => ({ ...prev, [p.key]: e.target.value }))} placeholder="Rp aktual" className={inputClass} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3"><Field label="Progres kumulatif per minggu (%) — opsional" hint="mis. 5, 14, 30" htmlFor="act-progress"><input id="act-progress" value={progress} onChange={(e) => setProgress(e.target.value)} className={inputClass} /></Field></div>
              <Button className="mt-3 w-full" onClick={save} disabled={!Object.values(values).some((v) => Number(v.replace(/[^\d]/g, "")) > 0)}><ClipboardList className="h-4 w-4" /> Simpan realisasi</Button>
            </>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between"><Eyebrow>Usulan kalibrasi</Eyebrow><Badge tone="neutral">{report?.sampleSize ?? 0} realisasi</Badge></div>
            {!report || report.sampleSize === 0 ? <p className="mt-2 text-[12px] text-muted">Belum ada data realisasi. Usulan muncul setelah data dimasukkan; minimal {CONFIG.calibration.minSample} sampel per kelompok, dan faktor disusutkan ke 1 bila sampel kecil.</p> : (
              <>
                <div className="mt-2 space-y-1.5">{report.proposal.details.map((d) => <div key={`${d.group}-${d.key}`} className="rounded-lg border border-line bg-[#fbfdfc] px-2.5 py-2 text-[12px]"><div className="flex justify-between"><span className="capitalize text-[#405160]">{d.group} · {d.key}</span><strong className={d.proposed === 1 ? "text-label" : "text-ink"}>× {numberId(d.proposed, 3)}</strong></div><p className="text-[10px] text-label">{d.reason}</p></div>)}</div>
                {report.proposal.details.some((d) => d.proposed !== 1) ? <Button className="mt-3 w-full" onClick={() => applyCalibration(report.proposal.factors, `${report.sampleSize} realisasi`)}><CheckCircle2 className="h-4 w-4" /> Setujui & terapkan (versi baru)</Button> : <p className="mt-2 text-[11px] text-label">Semua usulan = 1 (sampel belum cukup). Tidak ada yang bisa diterapkan.</p>}
              </>
            )}
          </Card>
          <Card className="p-4">
            <Eyebrow>Versi kalibrasi</Eyebrow>
            {state.calibrations.length === 0 ? <p className="mt-2 text-[12px] text-muted">Belum ada kalibrasi. Engine memakai faktor 1.</p> : <div className="mt-2 space-y-1.5">{state.calibrations.map((c) => <div key={c.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[12px]"><div className="min-w-0 flex-1"><p className="font-bold text-ink">{c.label} <Badge tone={c.status === "aktif" ? "green" : "neutral"}>{c.status}</Badge></p><p className="text-[10px] text-label">{c.basis} · {formatDate(c.createdAt)}</p></div>{c.id === activeCalibration?.id && <Button variant="secondary" onClick={() => revertCalibration(c.id)}><RotateCcw className="h-4 w-4" /> Batalkan</Button>}</div>)}</div>}
          </Card>
          <Card className="p-4">
            <Eyebrow>Riwayat realisasi</Eyebrow>
            {records.length === 0 ? <EmptyState compact icon={<ClipboardList className="h-5 w-5" />} title="Belum ada data realisasi" description="Data realisasi hanya berasal dari input pengguna." /> : <div className="mt-2 space-y-1.5">{records.map((r) => { const p = projects.find((x) => x.id === r.projectId); const tot = Object.values(r.perPaket).reduce((s, v) => s + v, 0); return <div key={r.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-[12px]"><div className="min-w-0 flex-1"><p className="truncate font-bold text-ink">{p?.name ?? r.projectId}</p><p className="text-[10px] text-label">{formatDate(r.tanggal)} · {Object.keys(r.perPaket).length} paket · {shortRupiah(tot)}</p></div><button aria-label="Hapus realisasi" onClick={() => deleteActual(r.id)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted hover:text-danger"><Trash2 className="h-4 w-4" /></button></div>; })}</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
