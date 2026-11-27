import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, GitCompareArrows, Lock, LockOpen, RotateCcw, Save, Search, Sparkles, Target, Trash2, TrendingDown } from "lucide-react";
import type { EfficiencyRow, OptimizerResult, PricingScenario, Project, SpecGroupKey, SpecLevel, SpecState } from "../../data/types";
import { SPEC_GROUPS, SPEC_LABEL, SPEC_ORDER, defaultSpec } from "../../data/spec";
import { useEstimator, useRab } from "../context";
import { Badge, Button, Card, Eyebrow, Modal, inputClass } from "../components";
import { ScreenTitle } from "../Shell";
import { numberId, rupiah, shortRupiah } from "../format";
import { cn } from "../../utils/cn";

type LockKey = "sellingPrice" | "margin" | "rap" | null;

export function PlannerScreen({ project }: { project: Project }) {
  const { engine, applyScenario, saveScenario, deleteScenario, scenarios, undoLastVersion, navigate, toast } = useEstimator();
  const { rab } = useRab(project);
  const baseSpec = useMemo(() => project.spec ?? defaultSpec(project.model), [project.spec, project.model]);
  const [draftSpec, setDraftSpec] = useState<SpecState | null>(null);
  const [scope, setScope] = useState(() => project.scope ?? { carport: project.model.carport, canopy: true, balcony: project.model.floors > 1, secondarySkin: false });
  const [targets, setTargets] = useState<{ sellingPrice: string; margin: string; rap: string }>({ sellingPrice: "", margin: "", rap: "" });
  const [targetError, setTargetError] = useState('');
  const [targetBusy, setTargetBusy] = useState(false);
  const targetSequence = useRef(0);
  const [lock, setLock] = useState<LockKey>(null);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [rows, setRows] = useState<(EfficiencyRow & { specAtFloor: SpecState })[]>([]);
  const [portions, setPortions] = useState<Partial<Record<SpecGroupKey, number>>>({});
  const [busy, setBusy] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [compare, setCompare] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");

  const draftProject = useMemo<Project>(() => ({ ...project, spec: draftSpec ?? project.spec, scope }), [project, draftSpec, scope]);
  const { rab: draftRab } = useRab(draftProject);
  const dirty = useMemo(() => JSON.stringify(draftSpec ?? project.spec) !== JSON.stringify(project.spec) || JSON.stringify(scope) !== JSON.stringify(project.scope ?? {}), [draftSpec, project.spec, scope, project.scope]);

  const goal = useMemo(() => ({
    targetRap: !targetBusy && !targetError && targets.rap ? Number(targets.rap) : null,
    floorPerGroup: {} as Partial<Record<SpecGroupKey, SpecLevel>>,
  }), [targets.rap, targetBusy, targetError]);

  const loadEfficiency = useCallback(async () => {
    setBusy(true);
    try {
      setRows(await engine.efficiency(draftProject, goal));
    } finally {
      setBusy(false);
    }
  }, [draftProject, engine, goal]);

  useEffect(() => { void loadEfficiency(); }, [loadEfficiency]);

  const editTarget = async (key: Exclude<LockKey, null>, raw: string) => {
    const seq = ++targetSequence.current;
    const value = raw.replace(/[^0-9]/g, '');
    setTargetError('');
    if (!value) { setTargets({ sellingPrice: '', margin: '', rap: '' }); setTargetBusy(false); return; }
    setTargets(t => ({ ...t, [key]: value }));
    setTargetBusy(true);
    const asBasis = (k: Exclude<LockKey, null>) => k === 'sellingPrice' ? 'total' : k;
    try {
      const plan = await engine.planTarget(project, { amount: Number(value), basis: asBasis(key),
        lock: lock && lock !== key && targets[lock] ? { basis: asBasis(lock), amount: Number(targets[lock]) } : undefined });
      if (seq === targetSequence.current) setTargets({ sellingPrice: String(plan.total), margin: String(plan.margin), rap: String(plan.rap), [key]: value });
    } catch (e) {
      if (seq === targetSequence.current) setTargetError(e instanceof Error ? e.message : 'Target tidak tersedia.');
    } finally { if (seq === targetSequence.current) setTargetBusy(false); }
  };

  const runOptimizer = async () => {
    setBusy(true);
    try {
      const r = await engine.optimize(draftProject, goal);
      setResult(r);
      setDraftSpec(r.spec);
      if (!r.reachedTarget && goal.targetRap !== null) setDecisionOpen(true);
      else if (r.steps.some((s) => s.impact === "tinggi")) setDecisionOpen(true);
      else toast("Kombinasi ditemukan", `${r.steps.length} langkah penyesuaian.`);
    } catch (e) {
      toast("Optimizer gagal", e instanceof Error ? e.message : "Coba lagi.", "danger");
    } finally {
      setBusy(false);
    }
  };

  const applyPortion = async (group: SpecGroupKey, value: number) => {
    const next = { ...portions, [group]: value };
    setPortions(next);
    setBusy(true);
    try {
      const spec = await engine.applyEfficiency(draftProject, next, goal);
      setDraftSpec(spec);
    } finally {
      setBusy(false);
    }
  };

  const current = draftRab ?? rab;
  const scenario: PricingScenario | null = current ? {
    id: `sc-${Date.now()}`,
    projectId: project.id,
    name: scenarioName.trim() || `Skenario ${new Date().toLocaleDateString("id-ID")}`,
    createdAt: new Date().toISOString(),
    spec: draftSpec ?? project.spec ?? baseSpec,
    scope,
    rap: current.rap.rap,
    sellingPrice: current.rap.sellingPrice,
    total: current.total, ppn: current.ppn,
    margin: current.rap.margin,
    marginPercent: current.rap.marginPercent,
  } : null;

  const compareScenario = scenarios.find((s) => s.id === compare) ?? null;

  return (
    <div className="pb-4">
      <ScreenTitle
        title="Planner harga"
        subtitle="Bekerja pada salinan draf. Proyek tidak berubah sampai kamu menekan Terapkan. Semua angka dihitung engine; AI hanya menjelaskan."
        backLabel="Proyek"
        right={<>
          <Button variant="ghost" onClick={() => { setDraftSpec(null); setScope(project.scope ?? scope); setPortions({}); setResult(null); }} disabled={!dirty}><RotateCcw className="h-4 w-4" /> Buang draf</Button>
          <Button variant="secondary" onClick={() => scenario && saveScenario(scenario)} disabled={!scenario}><Save className="h-4 w-4" /> Simpan skenario</Button>
          <Button onClick={() => scenario && applyScenario(project.id, scenario)} disabled={!dirty || !scenario}><Check className="h-4 w-4" /> Terapkan ke proyek</Button>
        </>}
      />

      {current && (
        <section className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#064E3B,#047857,#059669)] p-4 text-white sm:p-5">
          <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <div className="relative grid gap-3 sm:grid-cols-4">
            <Metric label="Total dibayar pembeli" value={rupiah(current.total)} note={current.ppn > 0 ? `termasuk PPN ${rupiah(current.ppn)}` : "tanpa PPN"} />
            <Metric label="RAP (modal)" value={rupiah(current.rap.rap)} note={`langsung ${shortRupiah(current.rap.direct)} + tak langsung + kontingensi`} />
            <Metric label="Margin" value={rupiah(current.rap.margin)} note={`${current.rap.marginPercent}% dari harga jual`} />
            <Metric label="Selisih ke target" value={goal.targetRap !== null ? `${current.rap.rap > goal.targetRap ? "+" : "−"}${shortRupiah(Math.abs(current.rap.rap - goal.targetRap))}` : "—"} note={goal.targetRap !== null ? `target modal ${shortRupiah(goal.targetRap)}` : "belum ada target"} tone={goal.targetRap !== null && current.rap.rap > goal.targetRap ? "warn" : "ok"} />
          </div>
        </section>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div><Eyebrow>Target</Eyebrow><p className="mt-1 text-[13px] font-extrabold text-ink">Harga jual · margin · modal</p></div>
              <Badge tone="neutral"><Target className="h-3 w-3" /> ketiganya terkait</Badge>
            </div>
            <p className="mb-3 text-[11px] leading-4 text-muted">Total pembeli mencakup PPN bila aktif. Margin adalah selisih harga jual sebelum PPN dan RAP. Kunci satu variabel agar tidak ikut berubah.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {([["sellingPrice", "Target total pembeli"], ["margin", "Target margin"], ["rap", "Target modal (RAP)"]] as const).map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`t-${key}`} className="mb-1 flex items-center justify-between text-[11px] font-bold text-[#405160]">
                    {label}
                    <button disabled={!targets[key]} onClick={() => setLock(lock === key ? null : key)} aria-label={lock === key ? `Buka kunci ${label}` : `Kunci ${label}`} className={cn("flex h-8 w-8 items-center justify-center rounded-md", lock === key ? "bg-[#EEF8F2] text-accent" : "text-label hover:text-ink")}>
                      {lock === key ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                    </button>
                  </label>
                  <input id={`t-${key}`} value={targets[key]} disabled={lock === key} onChange={(e) => void editTarget(key, e.target.value)} inputMode="numeric" placeholder="Rp" className={cn(inputClass, lock === key && "border-accent bg-[#F6FBF8]")} />
                  <input type="range" min={0} max={key === "margin" ? 300_000_000 : 2_000_000_000} step={key === "margin" ? 5_000_000 : 25_000_000}
                    value={Number(targets[key].replace(/[^\d]/g, "")) || 0}
                    disabled={lock === key} onChange={(e) => void editTarget(key, e.target.value)}
                    aria-label={`Geser ${label}`} className="mt-1.5 h-2 w-full accent-[#157F5F]" />
                </div>
              ))}
            </div>
            {targetError && <p role="alert" className="mt-2 text-sm text-red-700">{targetError}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void runOptimizer()} disabled={busy || goal.targetRap === null}><Search className="h-4 w-4" /> {busy ? "Menghitung…" : "Cari kombinasi terbaik"}</Button>
              <Button variant="secondary" onClick={() => void loadEfficiency()} disabled={busy}>Muat rencana efisiensi</Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div><Eyebrow>Rencana efisiensi</Eyebrow><p className="mt-1 text-[13px] font-extrabold text-ink">Porsi per kelompok</p></div>
              <span className="text-[11px] font-semibold text-muted">Total hemat {rab && current ? shortRupiah(rab.rap.rap - current.rap.rap) : "Belum dihitung"}</span>
            </div>
            <p className="mb-2 text-[11px] leading-4 text-muted">0 = jangan disentuh, 100 = efisienkan semaksimal yang aman. Kelompok yang sudah di batas aturan tidak bisa digeser.</p>
            <div className="space-y-2.5">
              {rows.map((row) => (
                <div key={row.group}>
                  <div className="flex items-baseline justify-between gap-2 text-[12px]">
                    <span className="font-bold text-ink">{row.label}</span>
                    <span className="text-label">biaya {shortRupiah(row.currentCost)} · hemat maks {shortRupiah(row.maxSaving)} · dampak {row.impact}</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5} value={portions[row.group] ?? 0}
                    disabled={Boolean(row.blockedReason)}
                    onChange={(e) => void applyPortion(row.group, Number(e.target.value))}
                    aria-label={`Porsi efisiensi ${row.label}`}
                    className="mt-1 h-2 w-full accent-[#157F5F] disabled:opacity-40"
                  />
                  {row.blockedReason && <p className="text-[10px] font-semibold text-[#92400E]">{row.blockedReason}</p>}
                </div>
              ))}
              {!rows.length && <p className="text-[12px] text-muted">{busy ? "Menghitung potensi efisiensi…" : "Belum ada data."}</p>}
            </div>
          </Card>

          {result && (
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div><Eyebrow>Hasil optimizer</Eyebrow><p className="mt-1 text-[13px] font-extrabold text-ink">{result.steps.length} langkah · {result.reachedTarget ? "target tercapai" : "target belum tercapai"}</p></div>
                <Badge tone={result.reachedTarget ? "green" : "amber"}>{result.elapsedMs} ms</Badge>
              </div>
              <div className="mt-2 space-y-1.5">
                {result.steps.map((step, i) => (
                  <div key={`${step.group}-${i}`} className="flex items-start gap-2 rounded-lg border border-line bg-[#FBFDFC] px-2.5 py-2">
                    <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", step.impact === "tinggi" ? "bg-danger" : step.impact === "sedang" ? "bg-warning" : "bg-success")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-ink">{step.label}: {SPEC_LABEL[step.from]} → {SPEC_LABEL[step.to]} <span className="text-accent">hemat {shortRupiah(step.saving)}</span></p>
                      <p className="text-[10.5px] leading-4 text-muted">{step.reason} · dampak kualitas {step.impact}</p>
                    </div>
                  </div>
                ))}
                {!result.steps.length && <p className="text-[12px] text-muted">Tidak ada langkah yang perlu diambil.</p>}
              </div>
              {result.notes.map((n) => <p key={n} className="mt-2 text-[11px] text-[#92400E]">{n}</p>)}
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <Card className="p-3.5">
            <Eyebrow>Lingkup opsional</Eyebrow>
            <div className="mt-2 space-y-1.5">
              {([["carport", "Carport"], ["canopy", "Kanopi"], ["balcony", "Balkon"], ["secondarySkin", "Secondary skin"]] as const).map(([key, label]) => (
                <label key={key} className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-lg border border-line px-2.5 text-[12px] font-semibold text-ink">
                  {label}
                  <input type="checkbox" checked={scope[key]} onChange={(e) => setScope((s) => ({ ...s, [key]: e.target.checked }))} className="h-5 w-5 accent-[#157F5F]" aria-label={`Sertakan ${label}`} />
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-3.5">
            <div className="flex items-center justify-between"><Eyebrow>Skenario tersimpan</Eyebrow><Badge tone="neutral">{scenarios.filter((s) => s.projectId === project.id).length}</Badge></div>
            <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="Nama skenario baru" aria-label="Nama skenario" className={cn(inputClass, "mt-2 h-10")} />
            <div className="mt-2 space-y-1.5">
              {scenarios.filter((s) => s.projectId === project.id).map((s) => (
                <div key={s.id} className="rounded-lg border border-line px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[12px] font-bold text-ink">{s.name}</p>
                    <div className="flex shrink-0 gap-1">
                      <button aria-label={`Bandingkan ${s.name}`} onClick={() => setCompare(compare === s.id ? null : s.id)} className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted hover:text-accent"><GitCompareArrows className="h-3.5 w-3.5" /></button>
                      <button aria-label={`Hapus ${s.name}`} onClick={() => deleteScenario(s.id)} className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-label">Jual {shortRupiah(s.sellingPrice)} · RAP {shortRupiah(s.rap)} · margin {s.marginPercent}%</p>
                </div>
              ))}
              {!scenarios.filter((s) => s.projectId === project.id).length && <p className="text-[11px] text-muted">Belum ada skenario. Simpan draf untuk membandingkan.</p>}
            </div>
          </Card>

          {compareScenario && current && (
            <Card className="p-3.5">
              <Eyebrow>Perbandingan</Eyebrow>
              <div className="mt-2 space-y-1 text-[12px]">
                <Cmp label="Harga jual" a={current.rap.sellingPrice} b={compareScenario.sellingPrice} />
                <Cmp label="RAP" a={current.rap.rap} b={compareScenario.rap} />
                <Cmp label="Margin" a={current.rap.margin} b={compareScenario.margin} />
              </div>
              <p className="mt-1.5 text-[10px] text-label">Kiri: draf sekarang · kanan: {compareScenario.name}</p>
            </Card>
          )}

          <Card className="p-3.5">
            <Eyebrow>Spesifikasi draf</Eyebrow>
            <div className="mt-2 space-y-1 text-[11px]">
              {SPEC_GROUPS.map((g) => {
                const from = project.spec?.[g.key];
                const to = (draftSpec ?? project.spec)?.[g.key];
                if (!from || !to) return null;
                return (
                  <div key={g.key} className="flex items-center justify-between gap-2">
                    <span className="text-muted">{g.label}</span>
                    <span className={cn("font-bold", from !== to ? "text-accent" : "text-ink")}>{SPEC_LABEL[from]}{from !== to && ` → ${SPEC_LABEL[to]}`}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Button variant="secondary" className="w-full" onClick={() => { undoLastVersion(project.id); navigate({ name: "project", projectId: project.id }); }}>
            <RotateCcw className="h-4 w-4" /> Kembalikan versi sebelumnya
          </Button>
        </div>
      </div>

      <Modal
        open={decisionOpen}
        onClose={() => setDecisionOpen(false)}
        title="Perlu keputusanmu"
        description="Optimizer tidak menerapkan apa pun secara otomatis."
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => setDecisionOpen(false)}>Batal</Button>
            {result && !result.reachedTarget && (
              <Button onClick={() => { setDraftSpec(result.spec); setDecisionOpen(false); toast("Batas aman diterima", "RAP terendah yang aman diterapkan ke draf."); }}>
                Terima batas aman ({shortRupiah(result.safeFloorRap)})
              </Button>
            )}
          </div>
        }
      >
        {result && (
          <div className="space-y-3 text-[12px]">
            {!result.reachedTarget && goal.targetRap !== null && (
              <div className="rounded-xl border border-[#FECACA] bg-[#FEF6F6] p-3 text-[#991B1B]">
                <p className="font-bold">Target {shortRupiah(goal.targetRap)} tidak bisa dicapai tanpa melanggar aturan minimum.</p>
                <p className="mt-1">RAP terendah yang aman: <strong>{rupiah(result.safeFloorRap)}</strong>. Selisih {shortRupiah(result.shortfall)}.</p>
              </div>
            )}
            {result.steps.some((s) => s.impact === "tinggi") && (
              <p className="flex items-start gap-1.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[#92400E]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Ada langkah berdampak tinggi pada kualitas yang terlihat penghuni: {result.steps.filter((s) => s.impact === "tinggi").map((s) => s.label).join(", ")}.</p>
            )}
            {result.scopeOptions.length > 0 && (
              <div>
                <p className="mb-1 font-bold text-ink">Pilihan kurangi lingkup:</p>
                <div className="space-y-1.5">
                  {result.scopeOptions.map((opt) => (
                    <button key={opt.key} onClick={() => { setScope((s) => ({ ...s, [opt.key]: false })); setDecisionOpen(false); toast("Lingkup dikurangi", `${opt.label} · hemat ${shortRupiah(opt.saving)}`); }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2 text-left hover:border-[#A7D7C6] hover:bg-[#F7FCF9]">
                      <span><span className="block font-bold text-ink">{opt.label}</span><span className="text-[10.5px] text-label">{opt.note}</span></span>
                      <span className="shrink-0 font-extrabold text-accent">−{shortRupiah(opt.saving)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { setLock("margin"); setDecisionOpen(false); }} className="flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-line px-2.5 text-left hover:bg-[#F7FCF9]">
              <TrendingDown className="h-4 w-4 text-muted" /> <span><span className="block font-bold text-ink">Turunkan margin</span><span className="text-[10.5px] text-label">Kunci margin lalu sesuaikan target.</span></span>
            </button>
          </div>
        )}
      </Modal>
      <span className="sr-only" aria-live="polite">{busy ? "Menghitung" : "Siap"}</span>
    </div>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "warn" | "ok" }) {
  return (
    <div className="rounded-[14px] border border-white/20 bg-white/10 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-white">{label}</p>
      <p className="mt-1 text-[19px] font-extrabold leading-tight tracking-[-0.03em] text-white">{value}</p>
      <p className={cn("mt-0.5 text-[10.5px] leading-4", tone === "warn" ? "text-[#FFE0B2]" : "text-white/85")}>{note}</p>
    </div>
  );
}

function Cmp({ label, a, b }: { label: string; a: number; b: number }) {
  const diff = a - b;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="font-bold text-ink">{shortRupiah(a)} <span className={cn("ml-1", diff > 0 ? "text-[#B45309]" : diff < 0 ? "text-accent" : "text-label")}>{diff === 0 ? "=" : `${diff > 0 ? "+" : "−"}${shortRupiah(Math.abs(diff))}`}</span></span>
    </div>
  );
}

export { SPEC_ORDER, Sparkles, numberId };
