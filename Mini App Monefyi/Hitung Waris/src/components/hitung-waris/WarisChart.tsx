"use client";

import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart2 } from "lucide-react";
import type { HasilPembagianWaris } from "@/types/hitung-waris";
import { formatRupiah, formatPersentase } from "@/lib/formatters";
import { WARNA_CHART } from "@/lib/waris-data";

interface WarisChartProps {
  hasil: HasilPembagianWaris;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name: string; persen: number; nilai: number };
  }>;
}

function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl">
      <p className="text-sm font-semibold text-white mb-1">{item.payload.name}</p>
      <p className="text-xs text-green-400">{formatPersentase(item.payload.persen)}</p>
      <p className="text-xs text-slate-300">{formatRupiah(item.payload.nilai)}</p>
    </div>
  );
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomBarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl">
      <p className="text-sm font-semibold text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs text-green-400">
          {formatRupiah(p.value)}
        </p>
      ))}
    </div>
  );
}

export function WarisChart({ hasil }: WarisChartProps) {
  const yangMendapat = hasil.hasilPerAhliWaris.filter(
    (h) => h.status === "mendapat_bagian"
  );

  const hartaUntukWaris = Math.max(
    0,
    hasil.harta.hartaBersih - hasil.harta.nilaiWasiat
  );

  // Data untuk donut chart
  const donutData = yangMendapat.map((h) => ({
    name: h.namaDisplay,
    value: h.persentase,
    persen: h.persentase,
    nilai: h.nilaiTotal,
    fill: WARNA_CHART[h.jenis] ?? "#94a3b8",
  }));

  // Data untuk bar chart (diurutkan dari terbesar)
  const barData = [...hasil.hasilPerAhliWaris]
    .sort((a, b) => b.nilaiTotal - a.nilaiTotal)
    .map((h) => ({
      name: h.namaDisplay.replace(" (dari Anak Laki)", "").replace(" (dari Ibu)", "").replace(" (dari Ayah)", ""),
      nilai: h.nilaiTotal,
      fill:
        h.status === "terhijab_hirman"
          ? "#7f1d1d"
          : (WARNA_CHART[h.jenis] ?? "#94a3b8"),
      terhijab: h.status === "terhijab_hirman",
    }));

  // Data untuk komposisi harta
  const komposisiData = [
    {
      name: "Komposisi Harta",
      hutang: hasil.harta.hutangAlmarhum,
      jenazah: hasil.harta.biayaJenazah,
      wasiat: hasil.harta.nilaiWasiat,
      waris: hartaUntukWaris,
    },
  ];

  if (yangMendapat.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-3xl border border-slate-700 bg-slate-800/50 overflow-hidden"
    >
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
        >
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">
            Visualisasi Pembagian
          </h3>
          <p className="text-sm text-slate-400">
            Chart interaktif pembagian warisan
          </p>
        </div>
      </div>

      <div className="p-6 space-y-10">
        {/* Chart 1 — Donut */}
        <div>
          <h4 className="text-base font-semibold text-slate-300 mb-4">
            Porsi Bagian Warisan
          </h4>
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-auto" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={1000}
                    animationBegin={300}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
              {donutData.map((item) => (
                <div key={item.name} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/50">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {formatPersentase(item.persen)} — {formatRupiah(item.nilai)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-slate-500">
              Total harta dibagi:{" "}
              <span className="text-green-400 font-semibold tabular-nums">
                {formatRupiah(hartaUntukWaris)}
              </span>
            </p>
          </div>
        </div>

        {/* Chart 2 — Bar Chart */}
        <div>
          <h4 className="text-base font-semibold text-slate-300 mb-4">
            Nilai per Ahli Waris
          </h4>
          <div style={{ height: Math.max(200, barData.length * 45) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000_000
                      ? `${(v / 1_000_000_000).toFixed(1)}M`
                      : v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(0)}jt`
                      : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}rb`
                      : `${v}`
                  }
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="nilai" radius={[0, 6, 6, 0]} animationDuration={1000}>
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3 — Komposisi Harta */}
        {(hasil.harta.hutangAlmarhum > 0 ||
          hasil.harta.biayaJenazah > 0 ||
          hasil.harta.nilaiWasiat > 0) && (
          <div>
            <h4 className="text-base font-semibold text-slate-300 mb-4">
              Komposisi Penggunaan Harta
            </h4>
            <div style={{ height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={komposisiData}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={120} hide />
                  <Tooltip />
                  <Bar dataKey="hutang" stackId="a" fill="#ef4444" name="hutang" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="jenazah" stackId="a" fill="#f59e0b" name="jenazah" />
                  <Bar dataKey="wasiat" stackId="a" fill="#8b5cf6" name="wasiat" />
                  <Bar dataKey="waris" stackId="a" fill="#10b981" name="waris" radius={[0, 4, 4, 0]} />
                  <Legend
                    formatter={(value: string) => {
                      const labels: Record<string, string> = {
                        hutang: "Hutang",
                        jenazah: "Biaya Jenazah",
                        wasiat: "Wasiat",
                        waris: "Untuk Waris",
                      };
                      return (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>
                          {labels[value] ?? value}
                        </span>
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
