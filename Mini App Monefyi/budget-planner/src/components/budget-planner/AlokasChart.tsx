"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import type { KategoriItem } from "@/types/budget-planner";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/cn";

const TIPE_COLORS: Record<string, string> = {
  kebutuhan: "#3b82f6",
  keinginan: "#8b5cf6",
  tabungan: "#10b981",
  investasi: "#60a5fa",
  sedekah: "#f59e0b",
  hutang: "#ef4444",
};

interface AlokasChartProps {
  kategori: KategoriItem[];
  totalPenghasilan: number;
}

interface TooltipPayload {
  payload: {
    nama: string;
    rupiahAlokasi: number;
    persentase: number;
    tipe: string;
  };
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="font-semibold text-white text-sm mb-1">{d.nama}</p>
      <p className="text-green-400 font-bold">{formatCurrency(d.rupiahAlokasi)}</p>
      <p className="text-slate-400 text-xs">{formatPercent(d.persentase)} dari penghasilan</p>
    </div>
  );
};

interface BarTooltipPayload {
  name: string;
  value: number;
  fill: string;
}

interface BarCustomTooltipProps {
  active?: boolean;
  payload?: { payload: { nama: string }; value: number; name: string; fill: string }[];
  label?: string;
}

const BarCustomTooltip = ({ active, payload, label }: BarCustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="font-semibold text-white text-sm mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs" style={{ color: p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

// Suppress unused var warning for BarTooltipPayload
void (0 as unknown as BarTooltipPayload);

export function AlokasChart({ kategori, totalPenghasilan }: AlokasChartProps) {
  const donutData = kategori.map((k) => ({
    nama: k.nama,
    tipe: k.tipe,
    rupiahAlokasi: k.rupiahAlokasi,
    persentase:
      totalPenghasilan > 0 ? (k.rupiahAlokasi / totalPenghasilan) * 100 : 0,
  }));

  const barData = kategori.map((k) => ({
    nama: k.nama.length > 12 ? k.nama.slice(0, 12) + "…" : k.nama,
    Alokasi: k.rupiahAlokasi,
    Terpakai: k.rupiahTerpakai,
    color: TIPE_COLORS[k.tipe] ?? "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      {/* Donut Chart */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
          Distribusi Alokasi
        </p>
        <div
          className="relative"
          aria-label="Grafik distribusi alokasi budget dalam bentuk donut"
          role="img"
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="rupiahAlokasi"
              >
                {donutData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={TIPE_COLORS[entry.tipe] ?? "#94a3b8"}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-sm font-bold text-white tabular-nums">
              {formatCurrency(totalPenghasilan)}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {donutData.map((d) => (
            <div key={d.nama} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: TIPE_COLORS[d.tipe] ?? "#94a3b8" }}
              />
              <span className="text-xs text-slate-400">
                {d.nama.length > 14 ? d.nama.slice(0, 14) + "…" : d.nama}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: TIPE_COLORS[d.tipe] ?? "#94a3b8" }}
              >
                {formatPercent(d.persentase, 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar Chart — Alokasi vs Terpakai */}
      {barData.some((d) => d.Terpakai > 0) && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Alokasi vs Terpakai
          </p>
          <div
            aria-label="Grafik perbandingan alokasi dan pengeluaran per kategori"
            role="img"
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={barData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="nama"
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<BarCustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
                />
                <Bar dataKey="Alokasi" fill="#1e40af" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Terpakai" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stacked progress bar */}
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
          Proporsi Keseluruhan
        </p>
        <div
          className="flex h-4 rounded-full overflow-hidden bg-slate-800"
          role="progressbar"
          aria-label="Proporsi alokasi budget"
          aria-valuenow={100}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {donutData.map((d, i) => (
            <div
              key={i}
              className="h-full transition-all duration-700"
              style={{
                width: `${d.persentase}%`,
                backgroundColor: TIPE_COLORS[d.tipe] ?? "#94a3b8",
              }}
              title={`${d.nama}: ${formatPercent(d.persentase, 0)}`}
            />
          ))}
        </div>
        <div className={cn("flex flex-wrap gap-2 mt-2")}>
          {donutData.map((d) => (
            <span key={d.nama} className="text-[10px] text-slate-500">
              {d.nama.slice(0, 10)}: {formatPercent(d.persentase, 0)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
