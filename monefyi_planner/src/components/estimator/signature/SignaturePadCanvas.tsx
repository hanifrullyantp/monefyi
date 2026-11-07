import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, RotateCcw, Palette } from 'lucide-react';

interface Props {
  initialDataUri?: string | null;
  penColor?: string;
  onStrokeChange?: (isEmpty: boolean) => void;
  height?: number;
  className?: string;
  label?: string;
}

export interface SignaturePadHandle {
  getDataUri: () => string | null;
  clear: () => void;
  undo: () => void;
  isEmpty: () => boolean;
}

interface Point {
  x: number;
  y: number;
}

type Stroke = Point[];

export const SignaturePadCanvas = React.forwardRef<SignaturePadHandle, Props>(
  function SignaturePadCanvas(
    {
      initialDataUri,
      penColor: defaultPenColor = '#0f172a',
      onStrokeChange,
      height = 180,
      className = '',
      label = 'Tanda Tangan di Sini',
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState(defaultPenColor);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [hasExistingImage, setHasExistingImage] = useState(Boolean(initialDataUri));

    const currentStrokeRef = useRef<Stroke>([]);
    const lastPointRef = useRef<Point | null>(null);

    // Redraw strokes from state
    const redrawAll = useCallback(
      (strokeList: Stroke[], color = penColor) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const stroke of strokeList) {
          if (stroke.length === 0) continue;
          if (stroke.length === 1) {
            ctx.beginPath();
            ctx.arc(stroke[0].x, stroke[0].y, 1.3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            continue;
          }

          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            const p1 = stroke[i - 1];
            const p2 = stroke[i];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
          }
          ctx.stroke();
        }
      },
      [penColor],
    );

    // Setup canvas size with DPI awareness
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const displayWidth = Math.max(260, Math.floor(rect.width));
      const displayHeight = height;

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      redrawAll(strokes);
    }, [height, redrawAll, strokes]);

    useEffect(() => {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      return () => window.removeEventListener('resize', resizeCanvas);
    }, [resizeCanvas]);

    // Handle initial image if provided
    useEffect(() => {
      if (initialDataUri && strokes.length === 0) {
        setHasExistingImage(true);
      }
    }, [initialDataUri, strokes.length]);

    const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      // Hanya tangani klik tombol utama atau sentuhan
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      const pt = getCanvasPoint(e);
      setIsDrawing(true);
      setHasExistingImage(false);

      currentStrokeRef.current = [pt];
      lastPointRef.current = pt;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = penColor;
        ctx.fillStyle = penColor;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      e.preventDefault();

      const pt = getCanvasPoint(e);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const last = lastPointRef.current;

      if (ctx && last) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        const midX = (last.x + pt.x) / 2;
        const midY = (last.y + pt.y) / 2;
        ctx.quadraticCurveTo(last.x, last.y, midX, midY);
        ctx.stroke();
      }

      currentStrokeRef.current.push(pt);
      lastPointRef.current = pt;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      e.preventDefault();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      setIsDrawing(false);
      lastPointRef.current = null;

      if (currentStrokeRef.current.length > 0) {
        const next = [...strokes, [...currentStrokeRef.current]];
        setStrokes(next);
        currentStrokeRef.current = [];
        if (onStrokeChange) onStrokeChange(false);
      }
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      setStrokes([]);
      setHasExistingImage(false);
      currentStrokeRef.current = [];
      lastPointRef.current = null;
      if (onStrokeChange) onStrokeChange(true);
    };

    const handleUndo = () => {
      if (strokes.length === 0) return;
      const next = strokes.slice(0, -1);
      setStrokes(next);
      redrawAll(next);
      if (onStrokeChange) onStrokeChange(next.length === 0);
    };

    const getDataUri = (): string | null => {
      if (hasExistingImage && initialDataUri) {
        return initialDataUri;
      }
      if (strokes.length === 0) return null;
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    };

    React.useImperativeHandle(ref, () => ({
      getDataUri,
      clear: handleClear,
      undo: handleUndo,
      isEmpty: () => strokes.length === 0 && !hasExistingImage,
    }));

    return (
      <div className={`space-y-2 select-none ${className}`}>
        {/* Canvas Toolbar */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <span>{label}</span>
            <span className="text-[10px] font-normal text-slate-400">(Sentuh & gores layar)</span>
          </span>

          <div className="flex items-center gap-1.5">
            {/* Pen Color Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setPenColor('#0f172a');
                  redrawAll(strokes, '#0f172a');
                }}
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  penColor === '#0f172a' ? 'ring-2 ring-slate-800 scale-110' : 'opacity-70'
                }`}
                style={{ backgroundColor: '#0f172a' }}
                title="Tinta Hitam"
                aria-label="Tinta Hitam"
              />
              <button
                type="button"
                onClick={() => {
                  setPenColor('#1d4ed8');
                  redrawAll(strokes, '#1d4ed8');
                }}
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  penColor === '#1d4ed8' ? 'ring-2 ring-blue-600 scale-110' : 'opacity-70'
                }`}
                style={{ backgroundColor: '#1d4ed8' }}
                title="Tinta Biru"
                aria-label="Tinta Biru"
              />
            </div>

            {/* Undo Button */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition"
              title="Undo"
              aria-label="Undo goresan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-semibold transition"
              title="Hapus"
            >
              <Eraser className="w-3 h-3" />
              <span>Hapus</span>
            </button>
          </div>
        </div>

        {/* Canvas Touch Area */}
        <div
          ref={containerRef}
          className="relative w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:bg-white focus-within:border-emerald-500 focus-within:bg-white overflow-hidden transition-all shadow-inner"
          style={{ height }}
        >
          {/* Garis bantu tanda tangan */}
          <div className="absolute inset-x-8 bottom-8 pointer-events-none border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Tanda Tangan Digital
            </span>
            <span className="text-[10px] text-slate-300">✕</span>
          </div>

          {/* Tampilan gambar tersimpan sebelumnya */}
          {hasExistingImage && initialDataUri && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
              <img
                src={initialDataUri}
                alt="Tanda tangan tersimpan"
                className="max-h-24 object-contain filter drop-shadow-sm"
              />
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 bg-emerald-50/90 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Tanda tangan tersimpan (Sentuh untuk menggambar ulang)
              </span>
            </div>
          )}

          {/* Canvas Utama dengan touch-action: none */}
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: 'none' }}
            className="w-full h-full cursor-crosshair relative z-10"
          />
        </div>
      </div>
    );
  },
);
