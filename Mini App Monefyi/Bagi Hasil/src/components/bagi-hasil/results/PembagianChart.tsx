"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { PembagianPihak, SkenarioResult } from "@/types/bagi-hasil";
import { formatCurrency } from "@/lib/formatters";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#14b8a6"];

interface PembagianChartProps {
  pembagian: PembagianPihak[];
  skenario: SkenarioResult[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-xl">
      {label && <p className="mb-2 text-xs font-medium text-slate-400">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { persentaseKeuntungan: number } }>;
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  if (!data) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-xl">
      <p className="text-sm font-bold text-slate-100">{data.name}</p>
      <p className="text-sm text-green-400">{formatCurrency(data.value)}</p>
      <p className="text-xs text-slate-400">{data.payload.persentaseKeuntungan.toFixed(1)}% nisbah</p>
    </div>
  );
}

export default function PembagianChart({
  pembagian,
  skenario,
}: PembagianChartProps) {
  const pieData = pembagian.map((p) => ({
    name: p.nama,
    value: p.keuntunganRupiah,
    persentaseKeuntungan: p.persentaseKeuntungan,
  }));

  // Bar chart data: one entry per skenario, one key per pihak
  const barData = skenario.map((s) => {
    const entry: Record<string, string | number> = { label: s.label };
    s.pembagianPerPihak.forEach((p) => {
      entry[p.nama] = p.nilai;
    });
    return entry;
  });

  const pihakNames = pembagian.map((p) => p.nama);

  return (
    <div className="space-y-6">
      {/* Donut Chart */}
      <div>
        <p className="mb-3 text-sm font-medium text-slate-400">Distribusi Nisbah Keuntungan</p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              animationDuration={1000}
            >
              {pieData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-slate-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart */}
      <div>
        <p className="mb-3 text-sm font-medium text-slate-400">Proyeksi per Skenario</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={barData}
            margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={{ stroke: "#475569" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={{ stroke: "#475569" }}
              tickFormatter={(v: number) => {
                if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
                return String(v);
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-slate-300">{value}</span>
              )}
            />
            {pihakNames.map((nama, i) => (
              <Bar
                key={nama}
                dataKey={nama}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
