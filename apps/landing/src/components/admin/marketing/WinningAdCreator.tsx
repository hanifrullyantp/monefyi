"use client";

import { useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import {
  generateWinningAdLocally,
  GenerateAdParams,
} from "@/lib/services/marketingAgentService";
import { WinningAdTemplate } from "@/lib/types/marketing";
import {
  Sparkles,
  Flame,
  Copy,
  Check,
  BookmarkPlus,
  Trash2,
  Video,
  FileText,
  Smartphone,
  ChevronRight,
  Target,
  Zap,
  ShieldAlert,
  Award,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function WinningAdCreator() {
  const { adBank, saveAdToBank, removeAdFromBank } = useMarketingStore();

  const [targetNiche, setTargetNiche] =
    useState<GenerateAdParams["targetNiche"]>("interior_kitchen");
  const [angle, setAngle] =
    useState<GenerateAdParams["angle"]>("efisiensi_rab_cepat");
  const [format, setFormat] =
    useState<GenerateAdParams["format"]>("reels_ugc_9_16");

  const [currentAd, setCurrentAd] = useState<WinningAdTemplate | null>(() =>
    generateWinningAdLocally({
      targetNiche: "interior_kitchen",
      angle: "efisiensi_rab_cepat",
      format: "reels_ugc_9_16",
    })
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<"generator" | "bank">("generator");
  const [saveToast, setSaveToast] = useState(false);

  const handleGenerate = () => {
    const newAd = generateWinningAdLocally({ targetNiche, angle, format });
    setCurrentAd(newAd);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveToBank = () => {
    if (currentAd) {
      saveAdToBank(currentAd);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setViewTab("generator")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              viewTab === "generator"
                ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-white" />
            <span>Pabrik Iklan Winning AI</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab("bank")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              viewTab === "bank"
                ? "bg-slate-900 dark:bg-emerald-600 text-white border-slate-900 dark:border-emerald-600 shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
            <span>Ad Bank Tersimpan ({adBank.length})</span>
          </button>
        </div>

        {viewTab === "generator" && currentAd && (
          <button
            type="button"
            onClick={handleSaveToBank}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Simpan ke Ad Bank</span>
          </button>
        )}
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Iklan berhasil disimpan ke Bank Materi Iklan!</span>
        </div>
      )}

      {viewTab === "generator" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-xs transition-colors">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Parameter Target &amp; Angle</span>
              </h3>

              {/* Target Niche */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Target Niche / Persona
                </label>
                <select
                  value={targetNiche}
                  onChange={(e) =>
                    setTargetNiche(e.target.value as GenerateAdParams["targetNiche"])
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="interior_kitchen">Interior &amp; Kitchen Set Custom</option>
                  <option value="kontraktor_umum">Kontraktor &amp; Pemborong Bangunan</option>
                  <option value="arsitek_desain">Arsitek &amp; Studio Desain</option>
                  <option value="subkon_sipil">Subkontraktor / Spesialis Sipil</option>
                </select>
              </div>

              {/* Angle */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Angle Emosi / Trigger
                </label>
                <select
                  value={angle}
                  onChange={(e) =>
                    setAngle(e.target.value as GenerateAdParams["angle"])
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="efisiensi_rab_cepat">Kirim Penawaran Sebelum Pulang Survei</option>
                  <option value="takut_rugi_proyek">Takut Proyek Boncos &amp; Tekor Nombok</option>
                  <option value="kalah_tender">Kalah Cepat Tender Dibanding Kompetitor</option>
                  <option value="standar_profesional">Branding Rapi &amp; PDF Resmi Berlogo Sendiri</option>
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Format Materi Iklan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "reels_ugc_9_16", label: "Reels 9:16", icon: Video },
                    { id: "feed_carousel_1_1", label: "Carousel 1:1", icon: Smartphone },
                    { id: "single_image_banner", label: "Banner 1:1", icon: FileText },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() =>
                        setFormat(fmt.id as GenerateAdParams["format"])
                      }
                      className={cn(
                        "flex flex-col items-center justify-center p-2.5 rounded-xl border text-[11px] font-bold transition-all",
                        format === fmt.id
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      <fmt.icon className="w-4 h-4 mb-1" />
                      <span>{fmt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Iklan Winning Baru</span>
              </button>
            </div>
          </div>

          {/* Results Column (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {currentAd && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-xs transition-colors">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Hasil Rekomendasi Creative AI
                  </span>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {currentAd.title}
                  </h2>
                </div>

                {/* 5 Hooks 3-Detik */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>5 Variasi Hook Penahan Scroll (3-Detik Pertama)</span>
                  </h4>
                  <div className="space-y-2">
                    {currentAd.hooks.map((hook, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-medium group"
                      >
                        <span className="pr-3 leading-relaxed">
                          {idx + 1}. &ldquo;{hook}&rdquo;
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(hook, `hook_${idx}`)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg shrink-0"
                          title="Salin Hook"
                        >
                          {copiedKey === `hook_${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copywriting Frameworks */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Naskah Teks Iklan (Framework PAS / HSO / BAB)</span>
                  </h4>
                  <div className="space-y-3">
                    {currentAd.primaryTexts.map((pt, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                            Model Formula: {pt.framework}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(pt.text, `copy_${idx}`)}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            {copiedKey === `copy_${idx}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedKey === `copy_${idx}` ? "Tersalin" : "Salin Teks"}</span>
                          </button>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
                          {pt.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Winning Ad Bank */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-emerald-500" />
              <span>Daftar Iklan Winning Tersimpan ({adBank.length})</span>
            </h3>
          </div>

          {adBank.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada materi iklan yang disimpan ke bank. Generate materi iklan lalu klik &quot;Simpan ke Ad Bank&quot;.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {adBank.map((ad) => (
                <div
                  key={ad.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {ad.title}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Disimpan: {new Date(ad.createdAt).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAdFromBank(ad.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Hapus dari bank"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3">
                    {ad.primaryTexts[0]?.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
