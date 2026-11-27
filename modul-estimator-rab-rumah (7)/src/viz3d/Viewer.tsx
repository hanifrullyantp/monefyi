import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Camera, Download, Layers, Map, Ruler, Sparkles, Sun, X } from "lucide-react";
import type { BuildingModel, FacadeSpec, LayoutIssue, RabResult, Room, SpecState } from "../data/types";
import { House3D, type CameraPreset, type SelectedPart } from "./House3D";
import { FloorPlanView, SectionView } from "./FloorPlanView";
import { isometricSvg } from "../geometry/svg";
import { polygonArea } from "../geometry/polygon";
import { renderThumbnail, thumbnailKey } from "./thumbnail";
import { shortRupiah, numberId } from "../ui/format";
import { cn } from "../utils/cn";
import { Badge } from "../ui/components";

export function MiniHouse({ model, facade, spec, className, badge = true, thumbnail, thumbnailKey: storedKey, onRendered }: {
  model: BuildingModel; facade?: FacadeSpec; spec?: SpecState; className?: string; badge?: boolean; thumbnail?: string; thumbnailKey?: string; onRendered?: (key: string, url: string) => void;
}) {
  const key = thumbnailKey(model, facade, spec);
  const [url, setUrl] = useState<string | null>(storedKey === key && thumbnail ? thumbnail : null);
  const [failed, setFailed] = useState(false);
  const svg = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(isometricSvg(model, 520))}`, [model]);
  useEffect(() => {
    if (storedKey === key && thumbnail) { setUrl(thumbnail); return; }
    let alive = true;
    renderThumbnail(model, facade, spec).then((result) => {
      if (!alive) return;
      if (result) { setUrl(result); onRendered?.(key, result); } else setFailed(true);
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const is3d = Boolean(url) && !failed;
  return (
    <div className={cn("relative overflow-hidden bg-[#E7F0EA]", className)}>
      {is3d ? <img src={url!} alt={`Render 3D ${model.name}, ${model.area} m², ${model.floors} lantai`} className="h-full w-full object-cover" />
        : failed ? <img src={svg} alt={`Ilustrasi isometrik ${model.name}`} className="h-full w-full object-cover" />
        : <div className="skeleton h-full w-full" aria-label="Memuat render 3D" />}
      {badge && (is3d || failed) && (
        <div className="absolute bottom-2 left-3 flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-[#33534A] shadow-sm">
          <Box className="h-3 w-3" /> {is3d ? "RENDER 3D" : "ILUSTRASI (bukan 3D)"}
        </div>
      )}
    </div>
  );
}

type ViewMode = "3d" | "denah" | "potongan";

export function ModelViewer({ model, rab, facade, spec, onSwap, compact = false, issues = [] }: {
  model: BuildingModel;
  rab: RabResult;
  facade?: FacadeSpec;
  spec?: SpecState;
  onSwap?: (a: string, b: string) => void;
  compact?: boolean;
  issues?: LayoutIssue[];
}) {
  const [mode, setMode] = useState<ViewMode>("3d");
  const [level, setLevel] = useState(0);
  const [exploded, setExploded] = useState(false);
  const [preset, setPreset] = useState<CameraPreset>("isometrik");
  const [quality, setQuality] = useState<"hemat" | "standar" | "tinggi">("standar");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const tabs: { id: ViewMode; label: string; icon: typeof Box }[] = [
    { id: "3d", label: "3D", icon: Box },
    { id: "denah", label: "Denah", icon: Map },
    { id: "potongan", label: "Potongan", icon: Ruler },
  ];

  const part = selectedRoom
    ? { kind: "room" as const, name: selectedRoom.name, level: selectedRoom.level, area: Math.round(polygonArea(selectedRoom.polygon) * 10) / 10, wet: selectedRoom.wet, roomId: selectedRoom.id }
    : selectedPart;

  const related = useMemo(() => relatedFromBoq(part, rab), [part, rab]);

  const handleSelectRoom = (room: Room) => {
    if (selectedRoom && selectedRoom.id !== room.id) {
      onSwap?.(selectedRoom.id, room.id);
      setSelectedRoom(room);
      return;
    }
    setSelectedRoom(room);
    setSelectedPart(null);
  };

  const exportPng = () => {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${model.name.replace(/\s+/g, "-").toLowerCase()}-${preset}.png`;
    link.href = (canvas as HTMLCanvasElement).toDataURL("image/png");
    link.click();
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-card soft-shadow">
      <div className="flex items-center justify-between gap-2 border-b border-[#EEF2F0] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E9F6F0] text-accent"><Layers className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-extrabold text-ink">Model 3D & denah</p>
            <p className="text-[10px] font-medium text-label">{model.floors} lantai · {numberId(model.area, 1)} m² · {facade?.style ?? "minimalis"}</p>
          </div>
        </div>
        <div className="flex rounded-lg border border-line bg-[#F6F9F7] p-0.5" role="tablist" aria-label="Tampilan model">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} role="tab" aria-selected={mode === tab.id} onClick={() => setMode(tab.id)} className={cn("flex min-h-[44px] items-center gap-1 rounded-md px-2.5 text-[11px] font-bold transition-colors", mode === tab.id ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}>
                <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={canvasWrapRef} className={cn("relative w-full bg-gradient-to-b from-[#E6F1EA] via-[#EDF5F0] to-[#DAEADF]", compact ? "h-[262px]" : "h-[300px] sm:h-[380px]")}>
        {mode === "3d" && <House3D model={model} facade={facade} spec={spec} exploded={exploded} preset={preset} quality={quality} onSelect={(p) => { setSelectedRoom(null); setSelectedPart(p); }} onWarnings={setWarnings} />}
        {mode === "denah" && <FloorPlanView model={model} level={Math.min(level, model.levels.length - 1)} selectedId={selectedRoom?.id} onSelect={handleSelectRoom} onSwap={(a, b) => onSwap?.(a.id, b.id)} issues={issues} />}
        {mode === "potongan" && <SectionView model={model} level={Math.min(level, model.levels.length - 1)} />}

        {mode === "3d" && (
          <>
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-[#3C5F53] shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> LIVE · seret untuk putar
            </div>
            <div className="absolute right-3 top-3 flex flex-col gap-1.5">
              <button onClick={exportPng} aria-label="Unduh gambar tampilan ini (PNG)" className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/70 bg-white/90 text-[#4B635A] shadow-sm hover:text-ink"><Download className="h-4 w-4" /></button>
              <button onClick={() => setQuality((q) => (q === "hemat" ? "standar" : q === "standar" ? "tinggi" : "hemat"))} aria-label={`Kualitas render: ${quality}. Ketuk untuk mengubah.`} className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/70 bg-white/90 text-[#4B635A] shadow-sm hover:text-ink"><Sun className="h-4 w-4" /></button>
            </div>
            {warnings.length > 0 && (
              <p className="absolute bottom-3 left-3 right-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB]/95 px-2.5 py-1.5 text-[10px] font-semibold leading-4 text-[#92400E]">{warnings[0]}</p>
            )}
          </>
        )}
        {mode !== "3d" && model.levels.length > 1 && (
          <div className="absolute right-3 top-3 flex gap-1 rounded-lg border border-white/80 bg-white/90 p-0.5 shadow-sm">
            {model.levels.map((_, index) => (
              <button key={index} onClick={() => setLevel(index)} className={cn("min-h-[44px] rounded-md px-3 text-[11px] font-bold", level === index ? "bg-ink text-white" : "text-muted hover:bg-[#EEF3F0]")}>L{index + 1}</button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-[#EEF2F0] px-3.5 py-2.5">
        {mode === "3d" ? (
          <>
            <div className="flex items-center gap-1 rounded-lg border border-line bg-[#F6F9F7] p-0.5" role="group" aria-label="Sudut kamera">
              <Camera className="ml-1.5 h-3.5 w-3.5 text-label" aria-hidden />
              {(["depan", "samping", "isometrik", "atas"] as CameraPreset[]).map((p) => (
                <button key={p} onClick={() => setPreset(p)} aria-pressed={preset === p} className={cn("min-h-[38px] rounded-md px-2 text-[10.5px] font-bold capitalize", preset === p ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}>{p}</button>
              ))}
            </div>
            {model.floors > 1 && (
              <button onClick={() => setExploded((v) => !v)} aria-pressed={exploded} className={cn("flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold", exploded ? "border-[#A7D7C6] bg-[#E9F6F0] text-accent" : "border-line bg-white text-muted")}>
                <Layers className="h-3.5 w-3.5" /> {exploded ? "Tutup lantai" : "Buka lantai atas"}
              </button>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-label"><Sparkles className="h-3 w-3 text-[#7C3AED]" /> Kualitas {quality}</span>
          </>
        ) : (
          <span className="text-[10.5px] font-semibold text-label">{mode === "denah" ? "Ketuk 2 ruangan untuk tukar posisi" : "Potongan skematik dari model"}</span>
        )}
      </div>

      {part && (
        <div className="pop-in flex items-center gap-3 border-t border-[#DCEEE5] bg-[#F3FBF7] px-3.5 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-accent"><Box className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-[12px] font-extrabold text-ink">{part.name}</p>
              <Badge tone="green">{part.kind === "room" ? "ruangan" : part.kind}</Badge>
            </div>
            <p className="text-[10.5px] font-medium text-muted">
              {part.area ? `${numberId(part.area, 1)} m²` : "elemen bangunan"} · {related.amount > 0 ? <>biaya terkait {shortRupiah(related.amount)} <span className="text-label">dari {related.lines.join(", ")}</span></> : "tidak ada baris BOQ yang berelasi"}
            </p>
          </div>
          <button aria-label="Tutup detail elemen" onClick={() => { setSelectedPart(null); setSelectedRoom(null); }} className="flex h-11 w-11 items-center justify-center rounded-lg text-label hover:bg-white hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

/** Biaya bagian = porsi baris BOQ yang berelasi (bukan perM2 × faktor). */
export function relatedFromBoq(part: { kind: string; area?: number; wet?: boolean; level?: number } | null, rab: RabResult) {
  if (!part) return { amount: 0, lines: [] as string[] };
  const items = rab.items;
  const byRel = (rel: string) => items.filter((i) => i.relasi === rel);
  const volumeOf = (id: string) => items.find((i) => i.workItemId === id)?.volume ?? 0;
  let amount = 0;
  const lines: string[] = [];
  const share = (rel: string, ratio: number) => {
    for (const item of byRel(rel)) {
      if (ratio <= 0) continue;
      amount += item.amount * Math.min(1, ratio);
      lines.push(item.uraian);
    }
  };
  if (part.kind === "room" || part.kind === "floor") {
    const totalFloor = volumeOf("lantai.keramik") || 1;
    share("lantai", (part.area ?? 0) / totalFloor);
    share("plafon", (part.area ?? 0) / totalFloor);
    if (part.wet) share("basah", (part.area ?? 0) / Math.max(1, items.find((i) => i.workItemId === "dinding.waterproof")?.variables.luas_basah ?? 1));
  } else if (part.kind === "roof") {
    share("atap", 1);
  } else if (part.kind === "wall") {
    share("dinding", (part.area ?? 0) / Math.max(1, volumeOf("dinding.pasangan")));
  }
  return { amount: Math.round(amount), lines: [...new Set(lines)].slice(0, 3) };
}
