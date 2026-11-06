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
      alert("Iklan berhasil disimpan ke Winning Ad Bank!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewTab("generator")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors",
              viewTab === "generator"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                : "bg-slate-900 text-slate-400 hover:text-white"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Pabrik Iklan Winning AI
          </button>
          <button
            onClick={() => setViewTab("bank")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors",
              viewTab === "bank"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                : "bg-slate-900 text-slate-400 hover:text-white"
            )}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Winning Ad Bank ({adBank.length})
          </button>
        </div>

        {viewTab === "generator" && currentAd && (
          <button
            onClick={handleSaveToBank}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
            Simpan ke Ad Bank
          </button>
        )}
      </div>

      {viewTab === "generator" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>🎯 Parameter Target & Angle</span>
              </h3>

              {/* Target Niche */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">
                  Target Niche / Persona
                </label>
                <select
                  value={targetNiche}
                  onChange={(e) =>
                    setTargetNiche(e.target.value as GenerateAdParams["targetNiche"])
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-emerald-500"
                >
                  <option value="interior_kitchen">
                    Interior & Kitchen Set Custom
                  </option>
                  <option value="kontraktor_umum">
                    Kontraktor & Pemborong Bangunan
                  </option>
                  <option value="arsitek_desain">Arsitek & Studio Desain</option>
                  <option value="subkon_sipil">Subkontraktor / Spesialis Sipil</option>
                </select>
              </div>

              {/* Angle */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">
                  Angle Emosi / Trigger
                </label>
                <select
                  value={angle}
                  onChange={(e) =>
                    setAngle(e.target.value as GenerateAdParams["angle"])
                  }
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2.5 focus:border-emerald-500"
                >
                  <option value="efisiensi_rab_cepat">
                    ⚡ Kirim Penawaran Sebelum Pulang Survei
                  </option>
                  <option value="takut_rugi_proyek">
                    🛑 Takut Proyek Boncos & Tekor Nombok
                  </option>
                  <option value="kalah_tender">
                    🏆 Kalah Cepat Tender Dibanding Kompetitor
                  </option>
                  <option value="standar_profesional">
                    ✨ Branding Rapi & PDF Resmi Berlogo Sendiri
                  </option>
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">
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
                        "flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-bold gap-1 transition-all",
                        format === fmt.id
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      )}
                    >
                      <fmt.icon className="w-3.5 h-3.5" />
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Generate Formula Iklan Winning
              </button>
            </div>
          </div>

          {/* Results Output Column (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {currentAd && (
              <div className="space-y-4">
                {/* 1. Hook Penahan Scroll 3-Detik */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      5 Pilihan Hook Penahan Scroll (Thumbstop Booster)
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Target Thumbstop: &gt; 35%
                    </span>
                  </div>

                  <div className="space-y-2">
                    {currentAd.hooks.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 group hover:border-slate-700"
                      >
                        <div className="text-xs text-white font-semibold flex items-start gap-2">
                          <span className="text-emerald-400 font-bold shrink-0">
                            #{i + 1}
                          </span>
                          <span>"{h}"</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(h, `hook_${i}`)}
                          className="p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
                          title="Salin hook"
                        >
                          {copiedKey === `hook_${i}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Copywriting Frameworks */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Primary Text Copywriting (PAS / HSO / BAB)
                  </h4>

                  <div className="space-y-3">
                    {currentAd.primaryTexts.map((pt, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-extrabold text-purple-400">
                            Formula: {pt.framework} (
                            {pt.framework === "PAS"
                              ? "Problem - Agitate - Solve"
                              : pt.framework === "HSO"
                              ? "Hook - Story - Offer"
                              : "Before - After - Bridge"}
                            )
                          </span>
                          <button
                            onClick={() => copyToClipboard(pt.text, `copy_${i}`)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white"
                          >
                            {copiedKey === `copy_${i}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            Salin Copy
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {pt.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. UGC Video Reels Script */}
                {currentAd.videoScript && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5" />
                        Script Video Reels/TikTok 30 Detik (Visual + Audio)
                      </h4>
                      <button
                        onClick={() => {
                          const fullScript = currentAd
                            .videoScript!.visualBeats.map(
                              (b) =>
                                `[${b.time}]\nVisual: ${b.visual}\nVoiceover: "${b.voiceover}"\nText: ${b.onScreenText}\n`
                            )
                            .join("\n");
                          copyToClipboard(fullScript, "script_full");
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white"
                      >
                        {copiedKey === "script_full" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Salin Semua Script
                      </button>
                    </div>

                    <div className="space-y-2">
                      {currentAd.videoScript.visualBeats.map((beat, i) => (
                        <div
                          key={i}
                          className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
                            <span>{beat.time}</span>
                            <span className="text-amber-400 font-bold">
                              {beat.onScreenText}
                            </span>
                          </div>
                          <div className="text-slate-400">
                            <strong className="text-slate-300">Visual:</strong>{" "}
                            {beat.visual}
                          </div>
                          <div className="text-slate-200 italic">
                            <strong className="text-emerald-400">
                              Voiceover:
                            </strong>{" "}
                            "{beat.voiceover}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Winning Ad Bank View */
        <div className="space-y-4">
          {adBank.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Flame className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">
                Winning Ad Bank Masih Kosong
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Buat variasi formula iklan di tab "Pabrik Iklan", lalu klik
                "Simpan ke Ad Bank" untuk menyimpan koleksi siap pakai.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adBank.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400">
                        {item.title}
                      </span>
                      <button
                        onClick={() => removeAdFromBank(item.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Hapus dari bank"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs font-bold text-white">
                      Hook Utama: "{item.hooks[0]}"
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-3">
                      {item.primaryTexts[0]?.text}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Target: {item.targetNiche}</span>
                    <button
                      onClick={() => {
                        setCurrentAd(item);
                        setViewTab("generator");
                      }}
                      className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      Buka &amp; Gunakan
                      <ChevronRight className="w-3 h-3" />
                    </button>
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

