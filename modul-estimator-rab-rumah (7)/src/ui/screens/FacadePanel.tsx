import { useState } from "react";
import { Loader2, Palette, Sparkles, WandSparkles } from "lucide-react";
import type { FacadeSpec, Project } from "../../data/types";
import { FACADE_PALETTES, FACADE_STYLES, defaultFacade, facadeCostElements } from "../../data/spec";
import { useEstimator } from "../context";
import { Badge, Button, Card, Chip, Eyebrow, inputClass } from "../components";
import { cn } from "../../utils/cn";

/** Generator & editor tampak depan. AI hanya mengubah teks → FacadeSpec tervalidasi. */
export function FacadePanel({ project }: { project: Project }) {
  const { engine, setFacade, toast } = useEstimator();
  const facade = project.facade ?? defaultFacade("minimalis", project.model.floors);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [variations, setVariations] = useState<FacadeSpec[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await engine.facadeFromText(text, project.model);
      setFacade(project.id, res.spec);
      setVariations(res.variations);
      toast("Spesifikasi tampak diperbarui", "Model 3D dan item pekerjaan tampak ikut berubah.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Perlu input manual.");
      setVariations([]);
    } finally {
      setBusy(false);
    }
  };

  const patch = (p: Partial<FacadeSpec>) => setFacade(project.id, { ...facade, ...p });
  const elements = facadeCostElements(facade);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#EEF2F0] px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F3FF] text-[#6D28D9]"><WandSparkles className="h-4 w-4" /></span>
        <div>
          <Eyebrow tone="ai">Tampak depan</Eyebrow>
          <p className="text-[12px] font-bold text-ink">Model 3D parametrik, bukan gambar</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <form onSubmit={(e) => { e.preventDefault(); void generate(); }}>
          <label htmlFor="facade-text" className="mb-1 block text-[11px] font-bold text-[#405160]">Ceritakan tampak yang kamu mau</label>
          <div className="flex gap-1.5">
            <input id="facade-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="minimalis tropis 2 lantai, jendela panjang, atap pelana asimetris" className={inputClass} />
            <Button type="submit" disabled={busy || !text.trim()} aria-label="Buat spesifikasi tampak">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}</Button>
          </div>
          <p className="mt-1 text-[10.5px] leading-4 text-label">AI menerjemahkan kalimat menjadi parameter tervalidasi. Geometri & biaya tetap dari engine.</p>
        </form>

        {error && <p role="alert" className="rounded-lg border border-[#FECACA] bg-[#FEF6F6] px-2.5 py-2 text-[11px] text-[#991B1B]">{error}</p>}

        {variations.length > 1 && (
          <div>
            <p className="mb-1 text-[11px] font-bold text-[#405160]">Variasi</p>
            <div className="flex flex-wrap gap-1.5">
              {variations.map((v, i) => (
                <Chip key={i} active={JSON.stringify(v) === JSON.stringify(facade)} onClick={() => setFacade(project.id, v)}>
                  {FACADE_STYLES.find((s) => s.id === v.style)?.label} · {v.roofType} · {v.windows.replace("_", " ")}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1 text-[11px] font-bold text-[#405160]">Gaya</p>
          <div className="flex flex-wrap gap-1.5">
            {FACADE_STYLES.map((s) => (
              <Chip key={s.id} active={facade.style === s.id} onClick={() => setFacade(project.id, { ...defaultFacade(s.id, project.model.floors), palette: facade.palette, carport: facade.carport })}>{s.label}</Chip>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Tipe atap">
            <select value={facade.roofType} onChange={(e) => patch({ roofType: e.target.value as FacadeSpec["roofType"] })} className={inputClass} aria-label="Tipe atap">
              {["pelana", "perisai", "limasan", "datar"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label={`Kemiringan ${facade.roofPitch}°`}>
            <input type="range" min={0} max={45} value={facade.roofPitch} onChange={(e) => patch({ roofPitch: Number(e.target.value) })} className="h-2 w-full accent-[#7C3AED]" aria-label="Kemiringan atap" />
          </Field>
          <Field label={`Overhang ${facade.overhang.toFixed(1)} m`}>
            <input type="range" min={0} max={1.6} step={0.1} value={facade.overhang} onChange={(e) => patch({ overhang: Number(e.target.value) })} className="h-2 w-full accent-[#7C3AED]" aria-label="Overhang atap" />
          </Field>
          <Field label="Bukaan depan">
            <select value={facade.windows} onChange={(e) => patch({ windows: e.target.value as FacadeSpec["windows"] })} className={inputClass} aria-label="Jenis bukaan depan">
              <option value="standar">Standar</option><option value="panjang">Jendela panjang</option><option value="kaca_mati">Kaca mati</option>
            </select>
          </Field>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-bold text-[#405160]">Elemen (menambah biaya)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([["canopy", "Kanopi"], ["balcony", "Balkon"], ["secondarySkin", "Secondary skin"], ["louvre", "Roster/louvre"], ["accentWall", "Dinding aksen"], ["planter", "Planter"], ["fence", "Pagar"], ["frontStairs", "Tangga depan"]] as const).map(([key, label]) => (
              <label key={key} className={cn("flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 text-[11.5px] font-semibold", facade[key] ? "border-[#C4B5FD] bg-[#F8F6FF] text-[#5B21B6]" : "border-line text-muted")}>
                {label}
                <input type="checkbox" checked={Boolean(facade[key])} onChange={(e) => patch({ [key]: e.target.checked } as Partial<FacadeSpec>)} className="h-5 w-5 accent-[#7C3AED]" aria-label={label} />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold text-[#405160]"><Palette className="h-3.5 w-3.5" /> Palet material</p>
          <div className="flex flex-wrap gap-1.5">
            {FACADE_PALETTES.map((p) => (
              <button key={p.id} onClick={() => patch({ palette: p.id })} aria-label={`Palet ${p.label}`} aria-pressed={facade.palette === p.id}
                className={cn("flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2 text-[11px] font-semibold", facade.palette === p.id ? "border-accent bg-[#EEF8F2] text-accent" : "border-line text-muted")}>
                <span className="flex gap-0.5">
                  {[p.wall, p.accent, p.roof].map((c) => <span key={c} className="h-4 w-4 rounded-sm border border-black/10" style={{ background: c }} />)}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-[#FBFDFC] p-2.5">
          <p className="text-[11px] font-bold text-ink">Item pekerjaan tampak ({elements.length})</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {elements.map((el) => <Badge key={el.key} tone="violet">{el.label} · {el.qty} {el.satuan}</Badge>)}
            {!elements.length && <span className="text-[11px] text-muted">Tidak ada elemen tambahan.</span>}
          </div>
          <p className="mt-1.5 text-[10.5px] leading-4 text-label">Elemen ini menjadi baris BOQ di paket "Elemen tampak depan" sehingga RAB ikut berubah.</p>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold text-[#405160]">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
