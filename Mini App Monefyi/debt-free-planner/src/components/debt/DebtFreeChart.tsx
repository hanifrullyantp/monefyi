// src/components/debt/DebtFreeChart.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PayoffResult } from "@/types";
import { formatCurrencyCompact } from "@/lib/formatters";

interface DebtFreeChartProps {
  strategyResult: PayoffResult;
  minimumResult: PayoffResult;
}

interface Point {
  x: number;
  y: number;
}

function buildPoints(
  jadwal: PayoffResult["jadwal"],
  totalHutangAwal: number,
  width: number,
  height: number,
  maxMonths: number,
  paddingX: number,
  paddingY: number
): Point[] {
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points: Point[] = [
    { x: paddingX, y: paddingY },
  ];

  jadwal.forEach((m) => {
    const x = paddingX + (m.bulanKe / maxMonths) * chartWidth;
    const y = paddingY + chartHeight - (m.totalSisaHutang / totalHutangAwal) * chartHeight;
    points.push({ x, y });
  });

  // End point: 0 hutang
  const lastX = paddingX + chartWidth;
  points.push({ x: lastX, y: paddingY + chartHeight });

  return points;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function pointsToArea(points: Point[], height: number, paddingY: number): string {
  if (points.length < 2) return "";
  const bottom = height - paddingY;
  const first = points[0];
  const last = points[points.length - 1];
  return (
    pointsToPath(points) +
    ` L ${last.x.toFixed(1)} ${bottom} L ${first.x.toFixed(1)} ${bottom} Z`
  );
}

export function DebtFreeChart({
  strategyResult,
  minimumResult,
}: DebtFreeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 250 });
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: 260,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const { width, height } = size;
  const paddingX = 60;
  const paddingY = 20;

  const maxMonths = Math.max(
    minimumResult.bulanUntukLunas,
    strategyResult.bulanUntukLunas,
    1
  );
  const totalHutangAwal = strategyResult.totalHutangAwal;

  const minPoints = buildPoints(
    minimumResult.jadwal,
    totalHutangAwal,
    width,
    height,
    maxMonths,
    paddingX,
    paddingY
  );
  const stratPoints = buildPoints(
    strategyResult.jadwal,
    totalHutangAwal,
    width,
    height,
    maxMonths,
    paddingX,
    paddingY
  );

  const minPath = pointsToPath(minPoints);
  const stratPath = pointsToPath(stratPoints);
  const stratArea = pointsToArea(stratPoints, height, paddingY);

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: totalHutangAwal * ratio,
    y: paddingY + (height - paddingY * 2) * (1 - ratio),
  }));

  // X-axis labels
  const xLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    month: Math.round(maxMonths * ratio),
    x: paddingX + (width - paddingX * 2) * ratio,
  }));

  // Milestone dots on strategy line
  const milestonePoints = strategyResult.jadwal
    .filter((m) => m.hutangLunasBulanIni.length > 0)
    .slice(0, 8)
    .map((m) => {
      const x =
        paddingX + (m.bulanKe / maxMonths) * (width - paddingX * 2);
      const y =
        paddingY +
        (height - paddingY * 2) -
        (m.totalSisaHutang / totalHutangAwal) * (height - paddingY * 2);
      return { x, y, label: m.hutangLunasBulanIni[0], tanggal: m.tanggal };
    });

  // Path length for animation
  const pathLength = 2000;

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-700/40">
        <h3 className="text-base font-bold text-white">Proyeksi Pelunasan Hutang</h3>
        <p className="text-sm text-slate-400 mt-1">
          Perbandingan strategi vs bayar minimum saja
        </p>
      </div>

      <div className="p-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded-full bg-red-500" />
            <span className="text-xs text-slate-400">Bayar Minimum Saja</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">
              Strategi {strategyResult.strategy === "snowball" ? "Snowball" : strategyResult.strategy === "avalanche" ? "Avalanche" : "Custom"}
            </span>
          </div>
        </div>

        {/* SVG Chart */}
        <div ref={containerRef} className="w-full">
          <svg
            width={width}
            height={height}
            className="overflow-visible"
            style={{ maxWidth: "100%" }}
          >
            <defs>
              <linearGradient id="stratGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
              <clipPath id="chartClip">
                <rect x={paddingX} y={paddingY} width={width - paddingX * 2} height={height - paddingY} />
              </clipPath>
            </defs>

            {/* Grid lines */}
            {yLabels.map((label) => (
              <g key={label.value}>
                <line
                  x1={paddingX}
                  y1={label.y}
                  x2={width - paddingX}
                  y2={label.y}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 6}
                  y={label.y + 4}
                  fill="#475569"
                  fontSize="10"
                  textAnchor="end"
                >
                  {formatCurrencyCompact(label.value)}
                </text>
              </g>
            ))}

            {/* X-axis labels */}
            {xLabels.map((label) => (
              <text
                key={label.month}
                x={label.x}
                y={height - 2}
                fill="#475569"
                fontSize="10"
                textAnchor="middle"
              >
                {label.month > 0 ? `${label.month}bl` : ""}
              </text>
            ))}

            {/* Strategy area fill */}
            <path
              d={stratArea}
              fill="url(#stratGrad)"
              clipPath="url(#chartClip)"
            />

            {/* Minimum line (red) */}
            <motion.path
              d={minPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray={pathLength}
              strokeDashoffset={animated ? 0 : pathLength}
              style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
              clipPath="url(#chartClip)"
            />

            {/* Strategy line (green) */}
            <motion.path
              d={stratPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray={pathLength}
              strokeDashoffset={animated ? 0 : pathLength}
              style={{ transition: "stroke-dashoffset 1.8s ease-out 0.3s" }}
              clipPath="url(#chartClip)"
            />

            {/* Milestone dots */}
            {milestonePoints.map((m, i) => (
              <g key={i}>
                <circle
                  cx={m.x}
                  cy={m.y}
                  r="5"
                  fill="#10b981"
                  stroke="#064e3b"
                  strokeWidth="2"
                />
                <title>{`${m.label} LUNAS — ${m.tanggal}`}</title>
              </g>
            ))}
          </svg>
        </div>

        {/* Savings callout */}
        {strategyResult.hematBunga && strategyResult.hematBunga > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-400">
              Anda hemat{" "}
              <span className="font-bold text-emerald-400 tabular-nums">
                {formatCurrencyCompact(strategyResult.hematBunga)}
              </span>{" "}
              bunga selama perjalanan ini
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
