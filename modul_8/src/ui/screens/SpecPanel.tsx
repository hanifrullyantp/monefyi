import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Project, SpecGroupKey, SpecLevel } from "../../data/types";
import { SPEC_GROUPS, SPEC_LABEL, SPEC_ORDER, defaultSpec, specIndex } from "../../data/spec";
import { useEstimator } from "../context";
import { Badge, Button, Card, Eyebrow } from "../components";
import { shortRupiah } from "../format";
import { cn } from "../../utils/cn";

type Deltas = Record<SpecGroupKey, { current: number; options: { level: SpecLevel; delta: number; blocked?: string }[] }>;

/** Bar geser spesifikasi: realtime, keyboard-friendly, dengan selisih Rp per kelompok. */
export function SpecPanel({ project, onOpenPlanner }: { project: Project; onOpenPlanner?: () => void }) {
  const { engine, setSpec, toast } = useEstimator();
  const spec = project.spec ?? defaultSpec({ floors: project.model.floors, soil: project.model.soil });
  const [deltas, setDeltas] = useState<Deltas | null>(null);
  const [blocked, setBlocked] = useState<{ group: SpecGroupKey; reason: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      void engine.specDeltas(project).then((d) => alive && setDeltas(d as Deltas)).catch(() => undefined);
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [engine, project]);

  const change = (group: SpecGroupKey, index: number) => {
    const level = SPEC_ORDER[Math.max(0, Math.min(SPEC_ORDER.length - 1, index))];
    const option = deltas?.[group]?.options.find((o) => o.level === level);
    if (option?.blocked) {
      setBlocked({ group, reason: option.blocked });
      return;
    }
    setBlocked(null);
    setSpec(project.id, { ...spec, [group]: level });
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2F0] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E9F6F0] text-accent"><SlidersHorizontal className="h-4 w-4" /></span>
          <div>
            <Eyebrow>Spesifikasi</Eyebrow>
            <p className="text-[12px] font-bold text-ink">Geser untuk melihat dampaknya</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setSpec(project.id, defaultSpec({ floors: project.model.floors, soil: project.model.soil }))}><RotateCcw className="h-3.5 w-3.5" /> Reset</Button>
          {onOpenPlanner && <Button variant="secondary" size="sm" onClick={onOpenPlanner}>Planner harga</Button>}
        </div>
      </div>

      {blocked && (
        <p className="mx-4 mt-3 flex items-start gap-1.5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-2 text-[11px] leading-4 text-[#92400E]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {blocked.reason}
        </p>
      )}

      <div className="divide-y divide-[#F1F4F2]">
        {SPEC_GROUPS.map((group) => {
          const level = spec[group.key];
          const info = deltas?.[group.key];
          const option = info?.options.find((o) => o.level === level);
          return (
            <div key={group.key} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`spec-${group.key}`} className="text-[12.5px] font-extrabold text-ink">{group.label}</label>
                <span className="shrink-0 text-[11px] font-bold text-accent">{SPEC_LABEL[level]}</span>
              </div>
              <p className="text-[10.5px] leading-4 text-label">{group.hint}{info ? ` · biaya ${shortRupiah(info.current)}` : ""}</p>
              <input
                id={`spec-${group.key}`}
                type="range"
                min={0}
                max={SPEC_ORDER.length - 1}
                step={1}
                value={specIndex(level)}
                onChange={(e) => change(group.key, Number(e.target.value))}
                aria-label={`Tingkat ${group.label}`}
                aria-valuetext={SPEC_LABEL[level]}
                className="mt-2 h-2 w-full accent-[#157F5F]"
              />
              <div className="mt-1 flex justify-between text-[9.5px] font-semibold text-label">
                {SPEC_ORDER.map((l) => {
                  const opt = info?.options.find((o) => o.level === l);
                  return <span key={l} className={cn(l === level && "text-ink", opt?.blocked && "line-through opacity-60")}>{SPEC_LABEL[l]}</span>;
                })}
              </div>
              {option && option.delta !== 0 && (
                <p className={cn("mt-1 text-[11px] font-bold", option.delta > 0 ? "text-[#B45309]" : "text-accent")}>
                  {option.delta > 0 ? "+" : "−"}{shortRupiah(Math.abs(option.delta))} dibanding tingkat sebelumnya
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-[#EEF2F0] bg-[#FBFDFC] px-4 py-2.5">
        <p className="text-[10.5px] leading-4 text-label">Setiap tingkat memetakan ke item pekerjaan + analisis. Aturan struktur & dependensi memblokir kombinasi yang tidak aman, dengan alasan tertulis.</p>
        <button onClick={() => toast("Definisi", "Ekonomis → Premium mengubah komponen bahan pada paket terkait; struktur tidak bisa di bawah aturan minimum.", "info")} className="mt-1 text-[10.5px] font-bold text-accent underline">Apa arti tingkat ini?</button>
      </div>
      <Badge className="sr-only">panel spesifikasi</Badge>
    </Card>
  );
}
