"use client";

import { useEffect, useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import {
  MapPin,
  Users,
  Smartphone,
  Award,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Rocket,
  Layers,
  AlertCircle,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function MetaAdsDeepInsights() {
  const {
    insightsData,
    isLoadingInsights,
    refreshInsights,
    isLiveMeta,
    datePreset,
    setDatePreset,
    createWinningCampaignDraft,
  } = useMarketingStore();

  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    refreshInsights();
  }, [datePreset]);

  const formatIDR = (val: number) => `Rp ${Math.round(val || 0).toLocaleString("id-ID")}`;

  const rec = insightsData?.recommendation;
  const ageGender = insightsData?.ageGender || [];
  const regions = insightsData?.regions || [];
  const placements = insightsData?.placements || [];

  const handleLaunchWinningDraft = async () => {
    setIsCreatingDraft(true);
    setDraftFeedback(null);
    try {
      const draftName = `[WINNING INSIGHT] Usia ${rec?.bestAge || "25-44"} (${
        rec?.bestGender || "All"
      }) - ${(rec?.bestRegions || "Indonesia").slice(0, 25)}`;
      const res = await createWinningCampaignDraft({
        name: draftName,
        dailyBudget: 150000,
        objective: "OUTCOME_SALES",
        actor: "ai_danu",
      });

      if (res.ok) {
        setDraftFeedback({
          ok: true,
          message: `Draft Kampanye "${draftName}" berhasil dibuat di Meta Ads Manager (ID: ${res.createdId}, Status: PAUSED).`,
        });
      } else {
        setDraftFeedback({
          ok: false,
          message: res.error || "Gagal membuat draft kampanye di Meta Ads.",
        });
      }
    } finally {
      setIsCreatingDraft(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Ads Insight &amp; Analisa Demografi Winning
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Meta Breakdown API
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bedah performa iklan berdasarkan Kelompok Umur, Jenis Kelamin, Lokasi Provinsi, dan Placement terbaik langsung dari Meta Graph API.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="data_maximum">Semua Waktu (Lifetime)</option>
            <option value="last_90d">90 Hari Terakhir</option>
            <option value="last_30d">30 Hari Terakhir</option>
            <option value="last_7d">7 Hari Terakhir</option>
            <option value="today">Hari Ini</option>
          </select>

          <button
            type="button"
            onClick={() => refreshInsights()}
            disabled={isLoadingInsights}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoadingInsights && "animate-spin")} />
            <span>{isLoadingInsights ? "Memuat Insight..." : "Sinkronkan Breakdown"}</span>
          </button>
        </div>
      </div>

      {/* Blueprint Rekomendasi Targeting Winning Ads */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-emerald-800/50 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-emerald-800/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Award className="w-4 h-4" />
              <span>Rekomendasi Master Targeting Winning Ads (AI Media Buyer)</span>
            </div>
            <h3 className="text-lg font-black text-white">
              {rec?.expertHeadline ||
                "Hubungkan dan jalankan kampanye untuk membaca pola demografi pemenang."}
            </h3>
          </div>

          <button
            type="button"
            onClick={handleLaunchWinningDraft}
            disabled={isCreatingDraft || !isLiveMeta}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0 shadow-lg shadow-emerald-950/50"
          >
            <Rocket className="w-4 h-4" />
            <span>
              {isCreatingDraft
                ? "Mencetak Draft ke Meta..."
                : "Buat Draft Winning Campaign di Meta Ads"}
            </span>
          </button>
        </div>

        {draftFeedback && (
          <div
            className={cn(
              "p-3 rounded-xl border text-xs font-bold flex items-center gap-2",
              draftFeedback.ok
                ? "bg-emerald-900/50 border-emerald-500/50 text-emerald-200"
                : "bg-rose-900/50 border-rose-500/50 text-rose-200"
            )}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{draftFeedback.message}</span>
          </div>
        )}

        {/* 4 Pilar Winning Segment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold">
              <span>KELOMPOK UMUR TERBAIK</span>
              <Users className="w-4 h-4" />
            </div>
            <p className="text-lg font-black text-white">{rec?.bestAge || "25-44"} Tahun</p>
            <p className="text-[11px] text-slate-300">
              Rasio klik dan konversi paling efisien di akun Anda
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-blue-400 text-[11px] font-bold">
              <span>JENIS KELAMIN DOMINAN</span>
              <Users className="w-4 h-4" />
            </div>
            <p className="text-lg font-black text-white">
              {rec?.bestGender || "Laki-laki & Perempuan"}
            </p>
            <p className="text-[11px] text-slate-300">
              Segmen gender dengan biaya per hasil termurah
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold">
              <span>LOKASI / PROVINSI WINNING</span>
              <MapPin className="w-4 h-4" />
            </div>
            <p className="text-sm font-black text-white line-clamp-1">
              {rec?.bestRegions || "DKI Jakarta, Jawa Barat"}
            </p>
            <p className="text-[11px] text-slate-300">
              Wilayah dengan daya beli &amp; CTR tertinggi
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-purple-400 text-[11px] font-bold">
              <span>PLACEMENT PALING KONVERSI</span>
              <Smartphone className="w-4 h-4" />
            </div>
            <p className="text-sm font-black text-white line-clamp-1">
              {rec?.bestPlacements || "Instagram Reels & Feed"}
            </p>
            <p className="text-[11px] text-slate-300">
              Penempatan iklan dengan retensi audiens terkuat
            </p>
          </div>
        </div>

        {/* Langkah Eksekusi Taktis */}
        {Array.isArray(rec?.expertActionPlan) && rec.expertActionPlan.length > 0 && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">
              Panduan Eksekusi Media Buying untuk Kampanye Berikutnya:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {rec.expertActionPlan.map((step: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid 3 Tabel Breakdown Riil: Umur+Gender, Lokasi Provinsi, Placement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Breakdown Umur & Jenis Kelamin */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Breakdown Umur &amp; Jenis Kelamin (Age &amp; Gender)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {ageGender.length} Segmen
            </span>
          </div>

          {ageGender.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <AlertCircle className="w-6 h-6 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Belum ada data breakdown Umur &amp; Gender pada rentang waktu ini.
              </p>
              <p>Pastikan akun Meta Ads terhubung dan pilih rentang waktu Semua Waktu (Lifetime).</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold">
                    <th className="py-3 px-4">Umur &amp; Gender</th>
                    <th className="py-3 px-3 text-right">Amount Spent</th>
                    <th className="py-3 px-3 text-right">Results</th>
                    <th className="py-3 px-3 text-right">Cost / Result</th>
                    <th className="py-3 px-3 text-right">CTR</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {ageGender.map((row: any) => (
                    <tr
                      key={row.key}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div>
                          <span>Usia {row.age}</span>
                          <span className="ml-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            ({row.genderLabel})
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, row.shareOfSpendPct || 5)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatIDR(row.spend)}
                        <div className="text-[10px] text-slate-400">{row.shareOfSpendPct}%</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {row.results}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {row.cpa > 0 ? formatIDR(row.cpa) : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.ctr}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.isWinningSegment ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <TrendingUp className="w-3 h-3" />
                            WINNING
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Standar</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 2. Breakdown Lokasi / Provinsi (Region) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Breakdown Lokasi &amp; Wilayah (Top Regions)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {regions.length} Wilayah
            </span>
          </div>

          {regions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <AlertCircle className="w-6 h-6 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Belum ada data breakdown Lokasi pada rentang waktu ini.
              </p>
              <p>Pastikan akun Meta Ads terhubung dan pilih rentang waktu Semua Waktu (Lifetime).</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 z-10">
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold">
                    <th className="py-3 px-4">Lokasi / Provinsi</th>
                    <th className="py-3 px-3 text-right">Amount Spent</th>
                    <th className="py-3 px-3 text-right">Results</th>
                    <th className="py-3 px-3 text-right">Cost / Result</th>
                    <th className="py-3 px-3 text-right">CTR</th>
                    <th className="py-3 px-4 text-center">Potensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {regions.map((row: any) => (
                    <tr
                      key={row.key}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div>{row.region}</div>
                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${Math.min(100, row.shareOfSpendPct || 5)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {formatIDR(row.spend)}
                        <div className="text-[10px] text-slate-400">{row.shareOfSpendPct}%</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {row.results}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {row.cpa > 0 ? formatIDR(row.cpa) : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {row.ctr}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.isWinningSegment ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            TOP LOKASI
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sekunder</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Breakdown Placement & Platform */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Breakdown Placement &amp; Posisi Iklan (Instagram Reels, Feed, Stories, Facebook)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {placements.length} Placement
          </span>
        </div>

        {placements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Belum ada data breakdown Placement pada rentang waktu ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold">
                  <th className="py-3 px-4">Platform &amp; Posisi Placement</th>
                  <th className="py-3 px-3 text-right">Amount Spent</th>
                  <th className="py-3 px-3 text-right">Impressions</th>
                  <th className="py-3 px-3 text-right">Clicks</th>
                  <th className="py-3 px-3 text-right">Results</th>
                  <th className="py-3 px-3 text-right">Cost / Result</th>
                  <th className="py-3 px-3 text-right">CTR</th>
                  <th className="py-3 px-4 text-center">Rekomendasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {placements.map((row: any) => (
                  <tr
                    key={row.key}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {row.placementLabel}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatIDR(row.spend)} ({row.shareOfSpendPct}%)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {Number(row.impressions || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {Number(row.clicks || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {row.results}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {row.cpa > 0 ? formatIDR(row.cpa) : "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {row.ctr}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.isWinningSegment ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          PRIORITAS UTAMA
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Pelengkap</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

