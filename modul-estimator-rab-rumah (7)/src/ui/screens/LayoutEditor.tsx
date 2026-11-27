import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Grid3x3,
  Maximize2,
  Move,
  Plus,
  Redo2,
  RefreshCw,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  WandSparkles,
  Zap,
} from "lucide-react";
import type { LayoutAlternative, LayoutIssue, Level, Project, Room, RoomFunction } from "../../data/types";
import { ROOM_MIN, neighborSummary } from "../../geometry/solver";
import {
  boundingBox,
  centroid,
  polygonArea,
  round2,
  type Pt,
  type Rect,
} from "../../geometry/polygon";
import {
  reflowAddRoom,
  reflowExpandFootprint,
  reflowMoveRoom,
  reflowMoveSharedVertex,
  reflowRemoveRoom,
  reflowResize,
  reflowSetRoomSize,
  reflowShiftRoom,
  reflowSwapRooms,
} from "../../geometry/reflow";
import { copyLevel, rotateRoom } from "../../geometry/layout";
import { useEstimator, useRab } from "../context";
import { Badge, Button, Card, Eyebrow, Modal, inputClass } from "../components";
import { ScreenTitle } from "../Shell";
import { numberId, rupiah } from "../format";
import { cn } from "../../utils/cn";

const ROOM_PALETTE: { fungsi: RoomFunction; label: string }[] = [
  { fungsi: "kamar_tidur", label: "Kamar tidur" },
  { fungsi: "kamar_utama", label: "Kamar utama" },
  { fungsi: "kamar_mandi", label: "Kamar mandi" },
  { fungsi: "dapur", label: "Dapur" },
  { fungsi: "ruang_tamu", label: "Ruang tamu" },
  { fungsi: "ruang_makan", label: "Ruang makan" },
  { fungsi: "ruang_keluarga", label: "Ruang keluarga" },
  { fungsi: "cuci", label: "Ruang cuci" },
  { fungsi: "gudang", label: "Gudang" },
  { fungsi: "kerja", label: "Ruang kerja" },
  { fungsi: "teras", label: "Teras" },
  { fungsi: "carport", label: "Carport" },
];

interface Draft {
  rooms: Room[];
  levels: Level[];
  seed?: number;
  typology?: LayoutAlternative["typology"];
}

const cloneDraft = (d: Draft): Draft => ({
  rooms: d.rooms.map((r) => ({ ...r, polygon: r.polygon.map((p) => ({ ...p })) })),
  levels: d.levels.map((l) => ({
    ...l,
    footprint: { ...l.footprint, points: l.footprint.points.map((p) => ({ ...p })) },
  })),
  seed: d.seed,
  typology: d.typology,
});

export function LayoutEditorScreen({ project }: { project: Project }) {
  const { engine, applyLayout, navigate, toast } = useEstimator();
  const { rab } = useRab(project);

  const [draft, setDraft] = useState<Draft>(() => ({
    rooms: project.model.rooms.map((r) => ({ ...r, polygon: r.polygon.map((p) => ({ ...p })) })),
    levels: project.model.levels,
    seed: project.model.layoutSeed,
    typology: project.model.layoutTypology,
  }));

  const [past, setPast] = useState<Draft[]>([]);
  const [future, setFuture] = useState<Draft[]>([]);
  const [level, setLevel] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapGrid, setSnapGrid] = useState(true);
  const [vertexMode, setVertexMode] = useState(false);

  // Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Generator & Validasi
  const [alternatives, setAlternatives] = useState<LayoutAlternative[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [issues, setIssues] = useState<LayoutIssue[]>([]);
  const [ignoredIssues, setIgnoredIssues] = useState<Set<string>>(new Set());
  const [expandWarnings, setExpandWarnings] = useState(false);

  // Dialog & Modal
  const [addOpen, setAddOpen] = useState(false);
  const [expandFpOpen, setExpandFpOpen] = useState(false);
  const [fpDelta, setFpDelta] = useState({ dx: 1.0, dy: 1.0 });
  const [confirmApply, setConfirmApply] = useState(false);
  const [popoverCollapsed, setPopoverCollapsed] = useState(false);

  // Visual Guides & Real-time Ghost
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    roomId: string;
    zone: "tengah" | "kiri" | "kanan" | "atas" | "bawah";
  } | null>(null);
  const [ghostBox, setGhostBox] = useState<Rect | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Gesture Tracker Ref
  const gesture = useRef<{
    active: boolean;
    hasMoved: boolean;
    mode: "move" | "resize" | "vertex" | "pan";
    id?: string;
    side?: "kanan" | "kiri" | "atas" | "bawah";
    vertexIdx?: number;
    startScreen: { x: number; y: number };
    startWorld: Pt;
    startPan: { x: number; y: number };
    originDraft: Draft;
  }>({
    active: false,
    hasMoved: false,
    mode: "pan",
    startScreen: { x: 0, y: 0 },
    startWorld: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
    originDraft: draft,
  });

  const fp = draft.levels[level]?.footprint.points ?? draft.levels[0]?.footprint.points ?? [];
  const box = boundingBox(fp.length ? fp : [{ x: 0, y: 0 }, { x: 8, y: 8 }]);
  const rooms = draft.rooms.filter((r) => r.level === level);
  const selected = rooms.find((r) => r.id === selectedId) ?? null;
  const dirty = useMemo(
    () => JSON.stringify(draft.rooms) !== JSON.stringify(project.model.rooms),
    [draft.rooms, project.model.rooms]
  );

  // Undo / Redo Stacks (Limit 100)
  const pushDraft = useCallback(
    (next: Draft) => {
      setPast((p) => [...p.slice(-99), cloneDraft(draft)]);
      setFuture([]);
      setDraft(next);
    },
    [draft]
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [cloneDraft(draft), ...f].slice(-99));
      setDraft(prev);
      return p.slice(0, -1);
    });
  }, [draft]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setPast((p) => [...p.slice(-99), cloneDraft(draft)]);
      setDraft(next);
      return f.slice(1);
    });
  }, [draft]);

  // Keyboard Navigation: panah untuk geser, +/- resize, Delete hapus (U9, U10)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (!selected) return;

      const step = e.shiftKey ? 0.5 : 0.1;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        pushDraft({
          ...draft,
          rooms: reflowShiftRoom(draft.rooms, fp, level, selected.id, step, 0).rooms,
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        pushDraft({
          ...draft,
          rooms: reflowShiftRoom(draft.rooms, fp, level, selected.id, -step, 0).rooms,
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        pushDraft({
          ...draft,
          rooms: reflowShiftRoom(draft.rooms, fp, level, selected.id, 0, step).rooms,
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        pushDraft({
          ...draft,
          rooms: reflowShiftRoom(draft.rooms, fp, level, selected.id, 0, -step).rooms,
        });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        pushDraft({
          ...draft,
          rooms: reflowRemoveRoom(draft.rooms, fp, level, selected.id).rooms,
        });
        setSelectedId(null);
        toast("Ruangan dihapus", "Ruangan sekitar mengisi kekosongan (tanpa celah).");
      } else if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom((z) => Math.min(2.5, z + 0.2));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(0.6, z - 0.2));
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        pushDraft({
          ...draft,
          rooms: rotateRoom(draft.rooms, selected.id),
        });
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [draft, fp, level, selected, undo, redo, pushDraft, toast]);

  // Validasi sinkron debounced 150 ms (U11)
  useEffect(() => {
    const timer = setTimeout(() => {
      const model = { ...project.model, rooms: draft.rooms, levels: draft.levels };
      void engine.validateLayout(model, draft.rooms).then((r) => setIssues(r.issues));
    }, 150);
    return () => clearTimeout(timer);
  }, [draft, engine, project.model]);

  // Generator otomatis awal
  const runGenerator = useCallback(
    async (newSeed: boolean) => {
      setGenLoading(true);
      try {
        const seed = newSeed ? Math.floor(Math.random() * 100000) : project.model.layoutSeed ?? 45;
        const alts = await engine.generateLayouts(
          {
            area: project.model.area,
            floors: project.model.floors,
            bedrooms: project.model.bedrooms,
            bathrooms: project.model.bathrooms,
            roadDirection: project.model.roadDirection ?? 0,
            typologyHint: null,
            seed,
          },
          3
        );
        setAlternatives(alts);
      } catch (e) {
        toast("Generator gagal", e instanceof Error ? e.message : "Coba lagi.", "danger");
      } finally {
        setGenLoading(false);
      }
    },
    [engine, project.model, toast]
  );

  useEffect(() => {
    void runGenerator(false);
  }, [runGenerator]);

  /* =====================================================================
     U1: Transformasi Koordinat Akurat via svg.getScreenCTM().inverse()
     ===================================================================== */
  const screenToWorld = useCallback((screenX: number, screenY: number): Pt => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    if (typeof svg.createSVGPoint === "function" && typeof svg.getScreenCTM === "function") {
      const pt = svg.createSVGPoint();
      pt.x = screenX;
      pt.y = screenY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const transformed = pt.matrixTransform(ctm.inverse());
        return {
          x: round2(transformed.x),
          y: round2(transformed.y),
        };
      }
    }
    // Fallback jika createSVGPoint / CTM tidak didukung (mis. di lingkungan test jsdom)
    const rect = svg.getBoundingClientRect();
    const vx = box.x - 1.5 - pan.x;
    const vy = box.y - 1.5 - pan.y;
    const vw = (box.w + 3) / zoom;
    const vh = (box.h + 3) / zoom;
    const relX = rect.width > 0 ? (screenX - rect.left) / rect.width : 0;
    const relY = rect.height > 0 ? (screenY - rect.top) / rect.height : 0;
    return { x: round2(vx + relX * vw), y: round2(vy + relY * vh) };
  }, [box.x, box.y, box.w, box.h, pan.x, pan.y, zoom]);

  /* =====================================================================
     U5: Snap Magnetik ke Grid (0.1 m) & Tepi Tetangga (Ambang 0.15 m)
     ===================================================================== */
  const applySnap = useCallback(
    (pt: Pt, excludeRoomId?: string): { snapped: Pt; guides: { x?: number; y?: number } } => {
      let sx = pt.x;
      let sy = pt.y;
      const guides: { x?: number; y?: number } = {};

      if (!snapGrid) return { snapped: pt, guides };

      // 1. Grid 0.1 m
      sx = Math.round(sx * 10) / 10;
      sy = Math.round(sy * 10) / 10;

      // 2. Snap magnetik ke tepi tetangga (threshold 0.15 m)
      const threshold = 0.15;
      for (const r of rooms) {
        if (r.id === excludeRoomId) continue;
        const b = boundingBox(r.polygon);
        const xTargets = [b.x, b.x + b.w];
        const yTargets = [b.y, b.y + b.h];

        for (const xt of xTargets) {
          if (Math.abs(sx - xt) <= threshold) {
            sx = xt;
            guides.x = xt;
            break;
          }
        }
        for (const yt of yTargets) {
          if (Math.abs(sy - yt) <= threshold) {
            sy = yt;
            guides.y = yt;
            break;
          }
        }
      }

      return { snapped: { x: round2(sx), y: round2(sy) }, guides };
    },
    [rooms, snapGrid]
  );

  /* =====================================================================
     U2: Pointer Events (Touch, Drag Threshold 4 px, PointerCapture)
     ===================================================================== */
  const handlePointerDown = (
    e: React.PointerEvent,
    mode: "move" | "resize" | "vertex" | "pan",
    roomId?: string,
    side?: "kanan" | "kiri" | "atas" | "bawah",
    vertexIdx?: number
  ) => {
    // Abaikan klik kanan
    if (e.button !== 0) return;

    const el = e.currentTarget as HTMLElement | SVGElement;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // Abaikan bila setPointerCapture tidak didukung di lingkungan test
    }

    const world = screenToWorld(e.clientX, e.clientY);
    gesture.current = {
      active: true,
      hasMoved: false,
      mode,
      id: roomId,
      side,
      vertexIdx,
      startScreen: { x: e.clientX, y: e.clientY },
      startWorld: world,
      startPan: { ...pan },
      originDraft: cloneDraft(draft),
    };

    if (roomId && mode !== "pan") {
      setSelectedId(roomId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.active) return;

    const distScreen = Math.hypot(e.clientX - g.startScreen.x, e.clientY - g.startScreen.y);
    if (!g.hasMoved && distScreen < 4) {
      // Masih dalam ambang 4 px (dianggap tap/klik)
      return;
    }
    g.hasMoved = true;

    if (g.mode === "pan") {
      // Pan kanvas: konversi piksel layar → meter world via getScreenCTM, bukan konstanta sembarang
      const curWorld = screenToWorld(e.clientX, e.clientY);
      setPan({
        x: g.startPan.x - (curWorld.x - g.startWorld.x),
        y: g.startPan.y - (curWorld.y - g.startWorld.y),
      });
      return;
    }

    const curWorld = screenToWorld(e.clientX, e.clientY);
    const { snapped, guides } = applySnap(curWorld, g.id);
    setSnapGuides(guides);

    if (g.mode === "move" && g.id) {
      // Tampilkan ghost yang mengikuti kursor
      const draggingRoom = g.originDraft.rooms.find((r) => r.id === g.id);
      if (draggingRoom) {
        const b = boundingBox(draggingRoom.polygon);
        const dx = snapped.x - g.startWorld.x;
        const dy = snapped.y - g.startWorld.y;
        setGhostBox({ x: b.x + dx, y: b.y + dy, w: b.w, h: b.h });

        // Deteksi kandidat drop target (tengah = swap, tepi = insert)
        const target = rooms.find((r) => {
          if (r.id === g.id) return false;
          const tb = boundingBox(r.polygon);
          return (
            snapped.x >= tb.x &&
            snapped.x <= tb.x + tb.w &&
            snapped.y >= tb.y &&
            snapped.y <= tb.y + tb.h
          );
        });

        if (target) {
          const tb = boundingBox(target.polygon);
          const rx = (snapped.x - tb.x) / tb.w;
          const ry = (snapped.y - tb.y) / tb.h;
          if (rx >= 0.25 && rx <= 0.75 && ry >= 0.25 && ry <= 0.75) {
            setDropTarget({ roomId: target.id, zone: "tengah" });
          } else {
            const dL = rx;
            const dR = 1 - rx;
            const dT = ry;
            const dB = 1 - ry;
            const min = Math.min(dL, dR, dT, dB);
            const zone = min === dL ? "kiri" : min === dR ? "kanan" : min === dT ? "atas" : "bawah";
            setDropTarget({ roomId: target.id, zone });
          }
        } else {
          setDropTarget(null);
        }
      }
    } else if (g.mode === "resize" && g.id && g.side) {
      // Reflow Realtime saat resize (U6, U11)
      const dx = snapped.x - g.startWorld.x;
      const dy = snapped.y - g.startWorld.y;
      const delta = g.side === "kanan" ? dx : g.side === "kiri" ? -dx : g.side === "bawah" ? dy : -dy;

      const res = reflowResize(g.originDraft.rooms, fp, level, g.id, g.side, delta, {
        allowExpandFootprint: false,
      });
      setDraft((prev) => ({ ...prev, rooms: res.rooms }));
    } else if (g.mode === "vertex" && g.id && g.vertexIdx !== undefined) {
      // Edit Sudut Realtime (M3 shared vertex)
      const res = reflowMoveSharedVertex(
        g.originDraft.rooms,
        fp,
        level,
        g.id,
        g.vertexIdx,
        snapped
      );
      setDraft((prev) => ({ ...prev, rooms: res.rooms }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.active) return;
    g.active = false;

    setSnapGuides(null);
    setGhostBox(null);
    setDropTarget(null);

    if (!g.hasMoved) {
      // Hanya tap / klik: sudah memilih ruangan di pointerDown
      return;
    }

    if (g.mode === "move" && g.id) {
      const curWorld = screenToWorld(e.clientX, e.clientY);
      const { snapped } = applySnap(curWorld, g.id);
      // Titik akhir sama dengan ghost yang ditampilkan selama drag (snap)
      const res = reflowMoveRoom(g.originDraft.rooms, fp, level, g.id, snapped);
      pushDraft({ ...draft, rooms: res.rooms });
    } else if (g.mode === "resize" || g.mode === "vertex") {
      // Simpan perubahan ke riwayat undo (U10: 1 drag = 1 history entry)
      setPast((p) => [...p.slice(-99), g.originDraft]);
      setFuture([]);
    }
  };

  /* =====================================================================
     Aksi Cepat & Saran Peringatan (U7)
     ===================================================================== */
  const handleApplySuggestion = (issue: LayoutIssue) => {
    if (issue.actionType === "expand-room" && issue.roomIds[0]) {
      // Lebarkan ruangan sebesar +0.4 m
      const r = reflowResize(draft.rooms, fp, level, issue.roomIds[0], "kanan", 0.4);
      pushDraft({ ...draft, rooms: r.rooms });
      toast("Ruangan diperlebar", "Tetangga di sekitarnya menyerap pergeseran.");
    } else if (issue.actionType === "expand-footprint") {
      // Buka dialog perluas bangunan
      setExpandFpOpen(true);
    } else if (issue.actionType === "group-plumbing" && issue.roomIds[0]) {
      // Dekatkan ke dapur/KM
      const otherWet = rooms.find((r) => r.wet && r.id !== issue.roomIds[0]);
      if (otherWet) {
        const res = reflowSwapRooms(draft.rooms, fp, level, issue.roomIds[0], otherWet.id);
        pushDraft({ ...draft, rooms: res.rooms });
        toast("Area basah dikelompokkan", "Posisi didekatkan.");
      }
    } else if (issue.actionType === "shift-exterior" && issue.roomIds[0]) {
      // Geser ke tepi footprint
      const res = reflowResize(draft.rooms, fp, level, issue.roomIds[0], "kanan", 0.3);
      pushDraft({ ...draft, rooms: res.rooms });
    }
  };

  const handleIgnoreIssue = (issue: LayoutIssue) => {
    setIgnoredIssues((prev) => new Set([...prev, issue.code]));
  };

  // Filter peringatan (maks 3 terlihat)
  const activeIssues = issues.filter((i) => !ignoredIssues.has(i.code));
  const visibleIssues = activeIssues.slice(0, 3);
  const hiddenIssuesCount = activeIssues.length - visibleIssues.length;

  /* =====================================================================
     Perluas Footprint (M4)
     ===================================================================== */
  const handleApplyExpandFootprint = () => {
    const res = reflowExpandFootprint(project.model, draft.rooms, fpDelta.dx, fpDelta.dy);
    pushDraft({
      ...draft,
      rooms: res.rooms,
      levels: res.model.levels,
    });
    setExpandFpOpen(false);
    toast("Bangunan diperluas", `Luas bertambah ${res.areaDelta > 0 ? "+" : ""}${res.areaDelta} m².`);
  };

  return (
    <div className="pb-6">
      <ScreenTitle
        title="Editor Denah"
        subtitle="Denah selalu konsisten secara geometri. Drag & resize selalu berhasil dengan tetangga menyesuaikan otomatis."
        backLabel="Proyek"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={undo}
              disabled={!past.length}
              aria-label="Undo (Ctrl+Z)"
              className="h-10 min-h-[40px] px-3"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={redo}
              disabled={!future.length}
              aria-label="Redo (Ctrl+Y)"
              className="h-10 min-h-[40px] px-3"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmApply(true)}
              disabled={!dirty}
              className="h-10 min-h-[40px] px-4"
            >
              <Save className="h-4 w-4" /> Terapkan ke Proyek
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Kolom Kiri: Kanvas Denah & Generator */}
        <div className="min-w-0 space-y-3">
          <Card className="overflow-hidden">
            {/* Toolbar Kanvas */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#EEF2F0] px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Level Tabs */}
                <div className="flex rounded-lg border border-line bg-[#F6F9F7] p-0.5">
                  {draft.levels.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setLevel(i)}
                      aria-pressed={level === i}
                      className={cn(
                        "min-h-[38px] rounded-md px-3 text-[11px] font-bold transition-colors",
                        level === i ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                      )}
                    >
                      Lantai {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSnapGrid((v) => !v)}
                  aria-pressed={snapGrid}
                  className={cn(
                    "flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition-colors",
                    snapGrid ? "border-[#A7D7C6] bg-[#E9F6F0] text-accent" : "border-line text-muted"
                  )}
                  title="Snap 0.1m & Tepi Tetangga"
                >
                  <Grid3x3 className="h-3.5 w-3.5" /> Magnet Snap
                </button>

                <button
                  onClick={() => setVertexMode((v) => !v)}
                  aria-pressed={vertexMode}
                  className={cn(
                    "flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition-colors",
                    vertexMode ? "border-[#C4B5FD] bg-[#F5F3FF] text-[#6D28D9]" : "border-line text-muted"
                  )}
                  title="Edit Sudut Poligon Kreatif"
                >
                  <Zap className="h-3.5 w-3.5" /> Edit Sudut
                </button>
              </div>

              {/* Zoom & Pan Controls (U3) */}
              <div className="flex items-center gap-1">
                <button
                  aria-label="Perkecil Zoom"
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-base font-bold text-muted hover:text-ink"
                >
                  −
                </button>
                <span className="w-10 text-center text-[10.5px] font-bold text-muted">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  aria-label="Perbesar Zoom"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-base font-bold text-muted hover:text-ink"
                >
                  +
                </button>
                <button
                  aria-label="Pas Layar"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="flex h-10 min-h-[40px] items-center gap-1 rounded-lg border border-line px-2 text-[10.5px] font-bold text-muted hover:text-ink"
                  title="Reset Posisi & Zoom"
                >
                  <Maximize2 className="h-3.5 w-3.5" /> Pas Layar
                </button>
              </div>
            </div>

            {/* Area Kanvas SVG Utama */}
            <div
              ref={containerRef}
              className="relative min-h-[380px] w-full select-none overflow-hidden bg-[#EEF5F1] sm:min-h-[440px]"
              onPointerDown={(e) => handlePointerDown(e, "pan")}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: "none" }}
            >
              <svg
                ref={svgRef}
                viewBox={`${box.x - 1.5 - pan.x} ${box.y - 1.5 - pan.y} ${(box.w + 3) / zoom} ${(box.h + 3) / zoom}`}
                className="h-full w-full"
                role="application"
                aria-label="Denah interaktif. Seret untuk memindahkan atau tarik tepi untuk mengubah ukuran."
              >
                <defs>
                  {/* Grid 1m dan sub-grid 0.1m */}
                  <pattern id="grid-sub" width="0.1" height="0.1" patternUnits="userSpaceOnUse">
                    <path d="M 0.1 0 L 0 0 0 0.1" fill="none" stroke="#157F5F" strokeOpacity=".04" strokeWidth="0.01" />
                  </pattern>
                  <pattern id="grid-main" width="1.0" height="1.0" patternUnits="userSpaceOnUse">
                    <rect width="1.0" height="1.0" fill="url(#grid-sub)" />
                    <path d="M 1.0 0 L 0 0 0 1.0" fill="none" stroke="#157F5F" strokeOpacity=".12" strokeWidth="0.03" />
                  </pattern>
                </defs>

                <rect
                  x={box.x - 20}
                  y={box.y - 20}
                  width={box.w + 40}
                  height={box.h + 40}
                  fill="#F8FAF9"
                />
                <rect
                  x={box.x - 20}
                  y={box.y - 20}
                  width={box.w + 40}
                  height={box.h + 40}
                  fill="url(#grid-main)"
                />

                {/* Garis Batas Footprint Bangunan */}
                {fp.length >= 3 && (
                  <polygon
                    points={fp.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="#FFFFFF"
                    stroke="#157F5F"
                    strokeWidth="0.16"
                    strokeLinejoin="round"
                  />
                )}

                {/* Ruangan-ruangan Denah */}
                {rooms.map((room) => {
                  const isSel = room.id === selectedId;
                  const c = centroid(room.polygon);
                  const rb = boundingBox(room.polygon);
                  const area = polygonArea(room.polygon);

                  return (
                    <g
                      key={room.id}
                      role="button"
                      tabIndex={0}
                      style={{ outline: "none", cursor: "grab" }}
                      aria-label={`${room.name}, luas ${area.toFixed(1)} m²`}
                      onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, "move", room.id) }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(room.id);
                      }}
                    >
                      <polygon
                        points={room.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill={isSel ? "#E3F7EC" : room.wet ? "#DCEEF6" : "#F0F4F2"}
                        stroke={isSel ? "#157F5F" : "#5F7068"}
                        strokeWidth={isSel ? 0.12 : 0.05}
                        strokeLinejoin="round"
                      />

                      {/* Teks Label Ruangan */}
                      <text
                        x={c.x}
                        y={c.y - 0.15}
                        textAnchor="middle"
                        fontSize="0.32"
                        fontWeight="700"
                        fill="#1E332A"
                        style={{ pointerEvents: "none" }}
                      >
                        {room.name}
                      </text>
                      <text
                        x={c.x}
                        y={c.y + 0.25}
                        textAnchor="middle"
                        fontSize="0.24"
                        fill="#52635B"
                        style={{ pointerEvents: "none" }}
                      >
                        {area.toFixed(1)} m²
                      </text>

                      {/* U4: Resize Handles Sisi & Sudut (Touch target >= 44px layar) */}
                      {isSel && !vertexMode && (
                        <>
                          {(["kanan", "kiri", "atas", "bawah"] as const).map((side) => {
                            const hx =
                              side === "kanan"
                                ? rb.x + rb.w
                                : side === "kiri"
                                ? rb.x
                                : rb.x + rb.w / 2;
                            const hy =
                              side === "bawah"
                                ? rb.y + rb.h
                                : side === "atas"
                                ? rb.y
                                : rb.y + rb.h / 2;

                            return (
                              <g
                                key={side}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  handlePointerDown(e, "resize", room.id, side)
                                }}
                                style={{
                                  cursor:
                                    side === "kanan" || side === "kiri" ? "ew-resize" : "ns-resize",
                                }}
                              >
                                {/* Invisible touch target (besar) */}
                                <circle cx={hx} cy={hy} r="0.6" fill="transparent" />
                                {/* Visible handle dot */}
                                <circle
                                  cx={hx}
                                  cy={hy}
                                  r="0.14"
                                  fill="#FFFFFF"
                                  stroke="#157F5F"
                                  strokeWidth="0.06"
                                />
                              </g>
                            );
                          })}
                        </>
                      )}

                      {/* Mode Edit Sudut (M3 Vertex Mode) */}
                      {isSel &&
                        vertexMode &&
                        room.polygon.map((p, i) => (
                          <g
                            key={i}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              handlePointerDown(e, "vertex", room.id, undefined, i)
                            }}
                            style={{ cursor: "move" }}
                          >
                            <circle cx={p.x} cy={p.y} r="0.45" fill="transparent" />
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="0.16"
                              fill="#7C3AED"
                              stroke="#FFFFFF"
                              strokeWidth="0.06"
                            />
                          </g>
                        ))}
                    </g>
                  );
                })}

                {/* Candidate Drop Target Indicator */}
                {dropTarget && (
                  <rect
                    x={
                      dropTarget.zone === "kiri"
                        ? boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).x
                        : dropTarget.zone === "kanan"
                        ? boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).x +
                          boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).w * 0.6
                        : boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).x
                    }
                    y={
                      dropTarget.zone === "atas"
                        ? boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).y
                        : dropTarget.zone === "bawah"
                        ? boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).y +
                          boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).h * 0.6
                        : boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).y
                    }
                    width={
                      dropTarget.zone === "kiri" || dropTarget.zone === "kanan"
                        ? boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).w * 0.4
                        : boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).w
                    }
                    height={
                      dropTarget.zone === "atas" || dropTarget.zone === "bawah"
                        ? boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).h * 0.4
                        : boundingBox(rooms.find((r) => r.id === dropTarget.roomId)!.polygon).h
                    }
                    fill="#157F5F"
                    fillOpacity="0.25"
                    stroke="#157F5F"
                    strokeWidth="0.06"
                    strokeDasharray="0.1 0.1"
                  />
                )}

                {/* Ghost Box saat drag */}
                {ghostBox && (
                  <rect
                    x={ghostBox.x}
                    y={ghostBox.y}
                    width={ghostBox.w}
                    height={ghostBox.h}
                    fill="#157F5F"
                    fillOpacity="0.15"
                    stroke="#157F5F"
                    strokeWidth="0.08"
                    strokeDasharray="0.15 0.1"
                  />
                )}

                {/* U5: Garis Bantu Magnetik Hijau */}
                {snapGuides?.x !== undefined && (
                  <line
                    x1={snapGuides.x}
                    y1={box.y - 10}
                    x2={snapGuides.x}
                    y2={box.y + box.h + 10}
                    stroke="#10B981"
                    strokeWidth="0.04"
                    strokeDasharray="0.15 0.15"
                  />
                )}
                {snapGuides?.y !== undefined && (
                  <line
                    x1={box.x - 10}
                    y1={snapGuides.y}
                    x2={box.x + box.w + 10}
                    y2={snapGuides.y}
                    stroke="#10B981"
                    strokeWidth="0.04"
                    strokeDasharray="0.15 0.15"
                  />
                )}
              </svg>
            </div>

            {/* Action Bar Bawah Kanvas */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F0] px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" /> Tambah Ruangan
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setExpandFpOpen(true)}>
                  Perluas Bangunan
                </Button>
                {draft.levels.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => pushDraft({ ...draft, rooms: copyLevel(draft.rooms, 0, 1) })}
                  >
                    <Copy className="h-4 w-4" /> Salin L1 ke L2
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDraft({
                      rooms: project.model.rooms,
                      levels: project.model.levels,
                      seed: project.model.layoutSeed,
                      typology: project.model.layoutTypology,
                    });
                    setPast([]);
                    setFuture([]);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reset ke Proyek
                </Button>
              </div>
            </div>
          </Card>

          {/* Generator 3 Alternatif Berbeda Tipologi */}
          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Eyebrow>Generator Denah</Eyebrow>
                <p className="text-[13px] font-extrabold text-ink">
                  3 Alternatif Berbeda Tipologi (Tanpa Drop Ruangan)
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void runGenerator(true)}
                disabled={genLoading}
              >
                <WandSparkles className="h-4 w-4" />{" "}
                {genLoading ? "Menyusun Denah…" : "Buat Alternatif Lain"}
              </Button>
            </div>
            <p className="mb-3 text-[11.5px] text-muted">
              Solver deterministik menghasilkan denah dengan semua kebutuhan ruang terpasang utuh.
            </p>

            <div className="grid gap-2 sm:grid-cols-3">
              {alternatives.map((alt) => (
                <button
                  key={alt.id}
                  onClick={() => {
                    pushDraft({
                      rooms: alt.rooms,
                      levels: alt.levels,
                      seed: alt.seed,
                      typology: alt.typology,
                    });
                    setSelectedId(null);
                    toast(`Denah ${alt.typology} dipilih`, "Tekan 'Terapkan' untuk menyimpan ke proyek.");
                  }}
                  className="group flex flex-col rounded-xl border border-line bg-white p-2.5 text-left transition-all hover:border-[#A7D7C6] hover:bg-[#F7FCF9]"
                >
                  <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg bg-[#F5F8F6]">
                    <svg
                      viewBox={`0 0 100 80`}
                      className="h-full w-full"
                    >
                      {alt.levels[0]?.footprint.points && (
                        <polygon
                          points={alt.levels[0].footprint.points
                            .map((p) => `${p.x * 6 + 10},${p.y * 6 + 10}`)
                            .join(" ")}
                          fill="#FFFFFF"
                          stroke="#157F5F"
                          strokeWidth="1.5"
                        />
                      )}
                      {alt.rooms
                        .filter((r) => r.level === 0)
                        .map((r) => (
                          <polygon
                            key={r.id}
                            points={r.polygon.map((p) => `${p.x * 6 + 10},${p.y * 6 + 10}`).join(" ")}
                            fill={r.wet ? "#DCEEF6" : "#EAF4EE"}
                            stroke="#5F7068"
                            strokeWidth="0.8"
                          />
                        ))}
                    </svg>
                    <span className="absolute bottom-1 right-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-ink">
                      Skor {alt.score.total}
                    </span>
                  </div>

                  <p className="font-extrabold capitalize text-ink group-hover:text-accent">
                    Tipologi {alt.typology}
                  </p>
                  <p className="mt-0.5 text-[11px] text-label">{alt.label}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                    <Badge tone="neutral">{alt.rooms.length} Ruang</Badge>
                    <Badge tone="neutral">{numberId(alt.area, 1)} m²</Badge>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Kolom Kanan: Peringatan Solutif & Panel Ruangan */}
        <div className="space-y-3">
          {/* U7: Panel Peringatan Solutif (Maks 3 Tampil) */}
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Eyebrow>Peringatan & Saran</Eyebrow>
                {activeIssues.length > 0 && (
                  <Badge tone="amber">{activeIssues.length}</Badge>
                )}
              </div>
              <span className="text-[10.5px] font-semibold text-muted">
                {activeIssues.length === 0 ? "Denah Sempurna" : "Bisa Diperbaiki"}
              </span>
            </div>

            <div className="mt-2.5 space-y-2">
              {activeIssues.length === 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-[#F0FDF4] p-3 text-[12px] text-[#166534]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>Semua ruangan memenuhi rekomendasi, sirkulasi lancar, dan kedap air.</span>
                </div>
              )}

              {visibleIssues.map((issue, idx) => (
                <div
                  key={`${issue.code}-${idx}`}
                  className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[11.5px]"
                >
                  <div className="flex items-start gap-1.5 font-bold text-[#92400E]">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{issue.message}</span>
                  </div>
                  {issue.suggestion && (
                    <p className="mt-1 text-[11px] leading-4 text-[#78350F]">
                      {issue.suggestion}
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {issue.actionLabel && (
                      <button
                        onClick={() => handleApplySuggestion(issue)}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-[#D97706] px-2.5 text-[10.5px] font-bold text-white hover:bg-[#B45309]"
                      >
                        {issue.actionLabel}
                      </button>
                    )}
                    {issue.roomIds.length > 0 && (
                      <button
                        onClick={() => setSelectedId(issue.roomIds[0])}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-line bg-white px-2 text-[10.5px] font-semibold text-ink hover:text-accent"
                      >
                        Pilih Ruangan
                      </button>
                    )}
                    <button
                      onClick={() => handleIgnoreIssue(issue)}
                      className="inline-flex min-h-[32px] items-center px-1.5 text-[10.5px] text-muted hover:text-ink"
                    >
                      Abaikan
                    </button>
                  </div>
                </div>
              ))}

              {/* N Lainnya (A4) */}
              {hiddenIssuesCount > 0 && (
                <button
                  onClick={() => setExpandWarnings((v) => !v)}
                  className="flex min-h-[36px] w-full items-center justify-between rounded-lg border border-line px-3 text-[11px] font-bold text-muted hover:text-ink"
                >
                  <span>{hiddenIssuesCount} saran lainnya</span>
                  {expandWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}

              {expandWarnings &&
                activeIssues.slice(3).map((issue, idx) => (
                  <div
                    key={`hidden-${idx}`}
                    className="rounded-xl border border-line bg-white p-2.5 text-[11px]"
                  >
                    <p className="font-semibold text-ink">{issue.message}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      {issue.actionLabel && (
                        <button
                          onClick={() => handleApplySuggestion(issue)}
                          className="text-[10px] font-bold text-accent underline"
                        >
                          {issue.actionLabel}
                        </button>
                      )}
                      <button
                        onClick={() => handleIgnoreIssue(issue)}
                        className="text-[10px] text-muted underline"
                      >
                        Abaikan
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* U9: Panel / Bottom Sheet Ruangan Terpilih */}
          {selected && (
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13.5px] font-extrabold text-ink">{selected.name}</p>
                  <p className="text-[11px] text-label">
                    Luas: {polygonArea(selected.polygon).toFixed(1)} m²
                  </p>
                </div>
                <button
                  onClick={() => setPopoverCollapsed((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-ink"
                  aria-label="Ciutkan Panel"
                >
                  {popoverCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>

              {!popoverCollapsed && (
                <div className="mt-3 space-y-3">
                  {/* Form Ukuran Panjang x Lebar */}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10.5px] font-bold text-[#405160]">
                      Lebar (m)
                      <input
                        type="number"
                        step="0.1"
                        value={round2(boundingBox(selected.polygon).w)}
                        onChange={(e) => {
                          const w = Number(e.target.value);
                          if (w > 0) {
                            const res = reflowSetRoomSize(
                              draft.rooms,
                              fp,
                              level,
                              selected.id,
                              w,
                              boundingBox(selected.polygon).h
                            );
                            pushDraft({ ...draft, rooms: res.rooms });
                          }
                        }}
                        className={cn(inputClass, "mt-1 h-10")}
                      />
                    </label>

                    <label className="text-[10.5px] font-bold text-[#405160]">
                      Panjang (m)
                      <input
                        type="number"
                        step="0.1"
                        value={round2(boundingBox(selected.polygon).h)}
                        onChange={(e) => {
                          const h = Number(e.target.value);
                          if (h > 0) {
                            const res = reflowSetRoomSize(
                              draft.rooms,
                              fp,
                              level,
                              selected.id,
                              boundingBox(selected.polygon).w,
                              h
                            );
                            pushDraft({ ...draft, rooms: res.rooms });
                          }
                        }}
                        className={cn(inputClass, "mt-1 h-10")}
                      />
                    </label>
                  </div>

                  {/* Operasi Cepat: Putar, Pindahkan, Hapus */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        pushDraft({ ...draft, rooms: rotateRoom(draft.rooms, selected.id) })
                      }
                      className="h-10 text-[11px]"
                    >
                      <RotateCw className="h-3.5 w-3.5" /> Putar 90°
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const target = rooms.find((r) => r.id !== selected.id);
                        if (target) {
                          const res = reflowSwapRooms(draft.rooms, fp, level, selected.id, target.id);
                          pushDraft({ ...draft, rooms: res.rooms });
                          toast("Posisi ditukar", `Dengan ${target.name}.`);
                        }
                      }}
                      className="h-10 text-[11px]"
                    >
                      <Move className="h-3.5 w-3.5" /> Tukar Posisi
                    </Button>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const res = reflowRemoveRoom(draft.rooms, fp, level, selected.id);
                      pushDraft({ ...draft, rooms: res.rooms });
                      setSelectedId(null);
                      toast("Ruangan dihapus", "Ruangan sekitar mengisi kekosongan.");
                    }}
                    className="h-10 w-full text-[11px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus Ruangan
                  </Button>

                  {/* Tetangga */}
                  <p className="text-[10.5px] leading-4 text-label">
                    Tetangga: {neighborSummary(draft.rooms, selected.id).join(", ") || "—"}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Info Status Keseluruhan */}
          <Card className="p-3.5">
            <Eyebrow>Ringkasan Draf Denah</Eyebrow>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted">Total Ruangan:</span>
                <span className="font-bold text-ink">{draft.rooms.length} ruang</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Luas Draf Total:</span>
                <span className="font-bold text-ink">
                  {draft.rooms.reduce((s, r) => s + polygonArea(r.polygon), 0).toFixed(1)} m²
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Perkiraan Biaya RAB:</span>
                <span className="font-bold text-ink">{rab ? rupiah(rab.total) : "—"}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal Tambah Ruangan */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tambah Ruangan Baru"
        description="Ruangan akan disisipkan ke area yang fleksibel tanpa membuat celah."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROOM_PALETTE.map((p) => (
            <button
              key={p.fungsi}
              onClick={() => {
                const res = reflowAddRoom(draft.rooms, fp, level, p.fungsi, p.label);
                pushDraft({ ...draft, rooms: res.rooms });
                setAddOpen(false);
                toast("Ruangan ditambahkan", p.label);
              }}
              className="flex min-h-[48px] flex-col items-start justify-center rounded-xl border border-line bg-white p-2.5 text-left transition-colors hover:border-[#A7D7C6] hover:bg-[#F7FCF9]"
            >
              <span className="text-[12px] font-bold text-ink">{p.label}</span>
              <span className="text-[10px] text-label">
                Rekomendasi {ROOM_MIN[p.fungsi]?.area ?? 3} m²
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Modal Perluas Bangunan (M4) */}
      <Modal
        open={expandFpOpen}
        onClose={() => setExpandFpOpen(false)}
        title="Perluas atau Perkecil Bangunan"
        description="Perubahan footprint akan didistribusikan ke seluruh ruangan secara proporsional."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setExpandFpOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleApplyExpandFootprint}>
              Terapkan Perluasan
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-[#405160]">
              Tambah Lebar (dx meter)
              <input
                type="number"
                step="0.5"
                value={fpDelta.dx}
                onChange={(e) => setFpDelta((d) => ({ ...d, dx: Number(e.target.value) }))}
                className={cn(inputClass, "mt-1")}
              />
            </label>
            <label className="text-[11px] font-bold text-[#405160]">
              Tambah Panjang (dy meter)
              <input
                type="number"
                step="0.5"
                value={fpDelta.dy}
                onChange={(e) => setFpDelta((d) => ({ ...d, dy: Number(e.target.value) }))}
                className={cn(inputClass, "mt-1")}
              />
            </label>
          </div>

          <div className="rounded-xl bg-[#F6FAF8] p-3 text-[11px]">
            <p className="font-semibold text-ink">Perkiraan Dampak:</p>
            <p className="mt-1 text-muted">
              Luas sekarang: {project.model.area} m² → Perkiraan:{" "}
              {round2(
                (boundingBox(fp).w + fpDelta.dx) * (boundingBox(fp).h + fpDelta.dy) * draft.levels.length
              )}{" "}
              m²
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Terapkan */}
      <Modal
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        title="Terapkan Denah ke Proyek?"
        description="Model 3D, perhitungan volume, dan RAB akan diperbarui seketika dari denah ini."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmApply(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                applyLayout(project.id, draft.rooms, draft.levels, {
                  seed: draft.seed,
                  typology: draft.typology,
                });
                setConfirmApply(false);
                toast("Denah berhasil diterapkan", "RAB dan 3D telah diperbarui.");
                navigate({ name: "project", projectId: project.id });
              }}
            >
              <Check className="h-4 w-4" /> Ya, Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-[12px] text-muted">
          <p>
            Total {draft.rooms.length} ruangan di {draft.levels.length} lantai akan disimpan.
          </p>
          {activeIssues.length > 0 && (
            <p className="text-[#92400E]">
              Catatan: Masih ada {activeIssues.length} saran tata letak yang belum diterapkan. Denah tetap
              sah dan dapat digunakan.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
