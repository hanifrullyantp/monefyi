import { useMemo } from "react";
import type { BuildingModel, LayoutIssue, Room } from "../data/types";
import { generateLayout } from "../geometry/layout";
import { boundingBox, centroid, polygonArea, type Polygon } from "../geometry/polygon";
import { cn } from "../utils/cn";

const roomColors = ["#E4F1E9", "#E6EEF8", "#F6EEDF", "#EEE9FA", "#FAE9F0", "#E2F0F1", "#F0F2E4", "#EDE7E1"];

export function FloorPlanView({ model, level, selectedId, onSelect, onSwap, issues = [] }: {
  model: BuildingModel;
  level: number;
  selectedId?: string;
  onSelect?: (room: Room) => void;
  onSwap?: (a: Room, b: Room) => void;
  issues?: LayoutIssue[];
}) {
  const fp: Polygon = model.levels[level]?.footprint.points ?? model.levels[0]?.footprint.points ?? [];
  const box = boundingBox(fp.length ? fp : [{ x: 0, y: 0 }, { x: 8, y: 8 }]);
  const rooms = useMemo(() => generateLayout(model).filter((room) => room.level === level), [model, level]);
  const pad = 34;
  const scale = Math.min(72, 520 / Math.max(1, box.w));
  const width = box.w * scale + pad * 2;
  const height = box.h * scale + pad * 2;
  const selected = rooms.find((room) => room.id === selectedId);
  const badIds = new Set(issues.filter((i) => i.severity === "error").flatMap((i) => i.roomIds));
  const warnIds = new Set(issues.filter((i) => i.severity === "warning" || i.severity === "saran").flatMap((i) => i.roomIds));

  const tx = (p: { x: number; y: number }) => `${((p.x - box.x) * scale).toFixed(1)},${((p.y - box.y) * scale).toFixed(1)}`;

  const handle = (room: Room) => {
    if (!onSelect) return;
    if (selectedId && selectedId !== room.id) {
      const first = rooms.find((item) => item.id === selectedId);
      if (first) onSwap?.(first, room);
      onSelect(room);
      return;
    }
    onSelect(room);
  };

  return (
    <div className="relative flex h-full min-h-[280px] w-full items-center justify-center bg-[#EEF5F1] p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full max-h-[400px] w-full" role="img" aria-label={`Denah lantai ${level + 1}, ${rooms.length} ruangan`}>
        <defs>
          <pattern id="plan-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#157F5F" strokeOpacity=".09" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="#F7FAF8" />
        <rect width={width} height={height} fill="url(#plan-grid)" />
        <g transform={`translate(${pad},${pad})`}>
          {fp.length >= 3 && <polygon points={fp.map(tx).join(" ")} fill="#ffffff" stroke="#157F5F" strokeWidth="5" strokeLinejoin="round" />}
          {rooms.map((room, index) => {
            const isSelected = selectedId === room.id;
            const bad = badIds.has(room.id);
            const warn = warnIds.has(room.id);
            const c = centroid(room.polygon);
            const area = polygonArea(room.polygon);
            return (
              <g
                key={room.id}
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                aria-label={`${room.name}, ${area.toFixed(1)} meter persegi${bad ? ", melanggar aturan" : ""}`}
                onClick={() => handle(room)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handle(room); } }}
                style={{ cursor: onSelect ? "pointer" : "default" }}
              >
                <polygon
                  points={room.polygon.map(tx).join(" ")}
                  fill={bad ? "#FDE4E4" : warn ? "#FEF3D7" : room.wet ? "#D9EAF2" : roomColors[index % roomColors.length]}
                  stroke={isSelected ? "#157F5F" : bad ? "#EF4444" : warn ? "#F59E0B" : "#5F6E67"}
                  strokeWidth={isSelected ? 3.5 : bad || warn ? 2.5 : 1.3}
                  strokeLinejoin="round"
                />
                <text x={(c.x - box.x) * scale} y={(c.y - box.y) * scale - 2} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#22382F" style={{ pointerEvents: "none" }}>{room.name}</text>
                <text x={(c.x - box.x) * scale} y={(c.y - box.y) * scale + 11} textAnchor="middle" fontSize="8.5" fill="#6C7D75" style={{ pointerEvents: "none" }}>{area.toFixed(1)} m²</text>
              </g>
            );
          })}
          <text x={(box.w * scale) / 2} y={-14} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#5B6B7A">{box.w.toFixed(1)} m</text>
          <text x={-14} y={(box.h * scale) / 2} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#5B6B7A" transform={`rotate(-90 ${-14} ${(box.h * scale) / 2})`}>{box.h.toFixed(1)} m</text>
        </g>
        <g transform={`translate(${width - 46}, 22)`} aria-hidden>
          <circle r="15" cx="0" cy="0" fill="#fff" stroke="#D7E1DC" />
          <path d="M0 -11 L4 1 L0 -2 L-4 1 Z" fill="#157F5F" />
          <text x="0" y="11" textAnchor="middle" fontSize="7" fontWeight="700" fill="#5B6B7A">U</text>
        </g>
      </svg>
      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-muted shadow-sm">
        DENAH · LANTAI {level + 1}
      </div>
      {onSelect && (
        <div className={cn("pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border bg-white/95 px-3 py-1 text-[10px] font-semibold shadow-sm", selected ? "border-[#a7d7c6] text-accent" : "border-line text-muted")}>
          {selected ? "Pilih ruangan lain untuk menukar posisi" : "Ketuk ruangan untuk lihat data & biaya"}
        </div>
      )}
    </div>
  );
}

export function SectionView({ model, level }: { model: BuildingModel; level: number }) {
  const fp: Polygon = model.levels[level]?.footprint.points ?? model.levels[0]?.footprint.points ?? [];
  const box = boundingBox(fp.length ? fp : [{ x: 0, y: 0 }, { x: 8, y: 6 }]);
  const floorH = model.levels[level]?.height ?? 3.2;
  const width = 560;
  const baseY = 250;
  const pxPerM = Math.min(46, 300 / Math.max(1, box.h));
  const wallTop = baseY - floorH * pxPerM;
  const pitch = (model.roof.pitch * Math.PI) / 180;
  const rise = Math.tan(pitch) * (box.h / 2 + model.roof.overhang) * 0.75;
  const roofTop = wallTop - rise * pxPerM;
  const left = 150;
  const right = left + box.h * pxPerM;
  const center = (left + right) / 2;
  const ground = baseY + 32;
  return (
    <div className="relative flex h-full min-h-[280px] w-full items-center justify-center bg-[#F2F6F3] p-3">
      <svg viewBox={`0 0 ${width} 330`} className="h-full max-h-[380px] w-full" role="img" aria-label={`Potongan rumah lantai ${level + 1}`}>
        <defs>
          <pattern id="section-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#A9BBB2" strokeWidth="2" /></pattern>
        </defs>
        <rect width={width} height="330" fill="#F7FAF8" />
        <rect x="0" y={ground} width={width} height={330 - ground} fill="#DCE9E0" />
        <path d={`M${left - 30} ${baseY + 40} L${left - 30} ${baseY + 6} L${left + 18} ${baseY + 6} L${left + 18} ${baseY - 28} L${right - 18} ${baseY - 28} L${right - 18} ${baseY + 6} L${right + 30} ${baseY + 6} L${right + 30} ${baseY + 40} Z`} fill="url(#section-hatch)" stroke="#7E9188" strokeWidth="2" />
        <rect x={left} y={wallTop} width={box.h * pxPerM} height={floorH * pxPerM} fill="#FDFBF5" stroke="#56685F" strokeWidth="2" />
        <rect x={left} y={baseY - 8} width={box.h * pxPerM} height={8} fill="#BCB1A2" stroke="#56685F" strokeWidth="1" />
        <rect x={left + box.h * pxPerM * 0.16} y={wallTop + floorH * pxPerM * 0.34} width={box.h * pxPerM * 0.18} height={floorH * pxPerM * 0.26} fill="#CFE7F0" stroke="#718B80" />
        <rect x={left + box.h * pxPerM * 0.58} y={wallTop + floorH * pxPerM * 0.38} width={box.h * pxPerM * 0.16} height={floorH * pxPerM * 0.27} fill="#EDE4D2" stroke="#718B80" />
        <line x1={left + 8} y1={wallTop + 8} x2={right - 8} y2={wallTop + 8} stroke="#C9C2B2" strokeWidth="3" />
        <path d={`M${left - 30} ${wallTop} L${center} ${roofTop} L${right + 30} ${wallTop}`} fill="none" stroke="#8A4C3A" strokeWidth="9" strokeLinejoin="round" />
        <path d={`M${left - 30} ${wallTop} L${center} ${roofTop} L${right + 30} ${wallTop}`} fill="none" stroke="#D2A08D" strokeWidth="3" strokeLinejoin="round" />
        <text x={center} y={roofTop - 12} textAnchor="middle" fontSize="10" fontWeight="700" fill="#5B6B7A">ATAP {model.roof.type.toUpperCase()} · {model.roof.pitch}°</text>
        <line x1={right + 55} y1={wallTop} x2={right + 55} y2={baseY} stroke="#5B6B7A" />
        <text x={right + 61} y={(wallTop + baseY) / 2} fontSize="9" fontWeight="700" fill="#5B6B7A">{floorH.toFixed(1)} m</text>
        <line x1={left} y1={baseY + 20} x2={right} y2={baseY + 20} stroke="#5B6B7A" />
        <text x={center} y={baseY + 32} textAnchor="middle" fontSize="9" fontWeight="700" fill="#5B6B7A">{box.h.toFixed(1)} m</text>
        <text x={left} y={baseY + 58} fontSize="8" fill="#7A8B83">Pondasi {model.foundation.replace("_", " ")} · tanah {model.soil}</text>
        <text x={right + 30} y={ground + 18} textAnchor="end" fontSize="8" fill="#7A8B83">Potongan skematik — bukan gambar kerja</text>
      </svg>
      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-bold text-muted shadow-sm">POTONGAN A–A · LANTAI {level + 1}</div>
    </div>
  );
}
