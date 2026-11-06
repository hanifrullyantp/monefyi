"use client";

import { useState } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import {
  auditVideoAdContent,
  VideoAuditInput,
} from "@/lib/services/marketingAgentService";
import { VideoAuditReport } from "@/lib/types/marketing";
import {
  Video,
  Sparkles,
  Play,
  Upload,
  Link as LinkIcon,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function VideoAdAuditor() {
  const { addChatMessage } = useMarketingStore();

  const [title, setTitle] = useState("Iklan Reels - Edukasi RAB Cepat");
  const [targetNiche, setTargetNiche] = useState("Interior & Kitchen Set");
  const [currentIssue, setCurrentIssue] = useState("CTR rendah (< 1%) & jempol orang cepat scroll");
  const [videoUrl, setVideoUrl] = useState("");
  const [scriptText, setScriptText] = useState(
    "Detik 0-3: Halo teman-teman, hari ini saya mau sharing cara saya bikin RAB kitchen set.\nDetik 4-15: Biasanya saya buka laptop, buka file Excel rumus lama, lalu ketik satu per satu bahan multiplek dan HPL.\nDetik 16-25: Kadang makan waktu lama dan sering salah hitung harga bahan yang naik.\nDetik 26-30: Makanya sekarang saya pakai Monefyi Estimator biar lebih gampang. Yuk download sekarang."
  );

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<VideoAuditReport | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const report = auditVideoAdContent({
        title,
        targetNiche,
        videoUrl,
        scriptOrDescription: scriptText,
        currentMetricsIssue: currentIssue,
      });
      setAuditReport(report);
      setIsAuditing(false);
    }, 800);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendToWarRoom = () => {
    if (!auditReport) return;
    addChatMessage({
      id: `audit_msg_${Date.now()}`,
      sender: "copywriter",
      text: `🎬 **Hasil Audit Video Iklan: "${auditReport.videoTitle}"**\n\n• Skor Efektivitas: **${auditReport.overallScore}/100**\n• Thumbstop Score: **${auditReport.breakdown.thumbstopScore}/100**\n• Diagnosa Hook: ${auditReport.keyFindings.hookVerdict}\n\n👉 **Saran Perbaikan Segera:**\n1. Ganti pembuka dengan Hook: *"${auditReport.recommendedFixes.newHooks[0]}"*\n2. Sisipkan B-Roll: *${auditReport.recommendedFixes.bRollSuggestions[0]}*\n3. Perbaiki Call to Action sesuai naskah revisi di tab Video Auditor!`,
      timestamp: new Date().toISOString(),
    });
    alert("Ringkasan audit video berhasil dikirim ke War Room Marketing!");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                AI VIDEO AD DOCTOR
              </span>
              <span className="text-xs text-slate-400">
                Audit Hook 3-Detik &amp; Pacing Retensi
              </span>
            </div>
            <h2 className="text-lg font-black text-white">
              Review Konten Video Iklan &amp; Dapatkan Arahan Perbaikan
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Punya video iklan yang sedang tayang tapi boncos atau ingin menguji video baru?
              Agen AI (Sinta &amp; Bima) akan membedah naskah, visual hook, dan tempo video Anda
              agar thumbstop rate tembus di atas 35%.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Input Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Video className="w-4 h-4 text-purple-400" />
              <span>Input Data Konten Video</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Judul / Konsep Video
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Target Audiens
                </label>
                <select
                  value={targetNiche}
                  onChange={(e) => setTargetNiche(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-purple-500"
                >
                  <option value="Interior & Kitchen Set">Interior &amp; Kitchen Set</option>
                  <option value="Kontraktor Umum">Kontraktor &amp; Pemborong</option>
                  <option value="Arsitek Desain">Arsitek &amp; Desainer</option>
                  <option value="Subkon Sipil">Subkontraktor Sipil</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Keluhan Performa
                </label>
                <select
                  value={currentIssue}
                  onChange={(e) => setCurrentIssue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:border-purple-500"
                >
                  <option value="CTR rendah (< 1%) & jempol orang cepat scroll">
                    CTR Rendah &amp; Langsung Di-skip
                  </option>
                  <option value="Banyak yang nonton awal tapi drop di tengah">
                    Drop-off di Tengah Video
                  </option>
                  <option value="CTR tinggi tapi tidak ada yang beli (CPA mahal)">
                    CTR Tinggi Tapi Boncos
                  </option>
                  <option value="Video baru sebelum launching iklan">
                    Review Pre-Launch Video
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Link Video (Opsional untuk Preview)
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Link Google Drive, YouTube, Instagram, atau MP4 URL..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-3 py-2.5 focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Naskah / Alur Cerita Video Saat Ini
              </label>
              <textarea
                rows={6}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Tuliskan kata-kata pembuka, isi video, dan ajakan di akhir video..."
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-3 focus:border-purple-500 resize-none font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                *Semakin jelas rincian detik atau kalimat pembukanya, semakin akurat diagnosa agen AI.
              </p>
            </div>

            <button
              onClick={handleRunAudit}
              disabled={isAuditing || !scriptText.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Sparkles className={cn("w-4 h-4", isAuditing && "animate-spin")} />
              {isAuditing ? "Agen AI Sedang Membedah Video..." : "🔍 Audit & Bedah Video Iklan Sekarang"}
            </button>
          </div>
        </div>

        {/* Results Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {!auditReport ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Video className="w-12 h-12 text-slate-700 mx-auto" />
              <h4 className="text-base font-bold text-white">
                Siap Membedah Konten Video Iklan Anda
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Masukkan naskah atau alur video yang sedang berjalan di sebelah kiri,
                lalu klik "Audit &amp; Bedah Video" untuk melihat skor dan arahan perbaikannya.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in">
              {/* Score Header Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-black text-purple-400 tracking-wider">
                      Laporan Audit Agen AI
                    </span>
                    <h3 className="text-sm font-black text-white mt-0.5">
                      {auditReport.videoTitle}
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-400">
                      {auditReport.overallScore}/100
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      Skor Winning Potential
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Bars */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Thumbstop Hook</div>
                    <div className="text-sm font-black text-amber-400 mt-0.5">
                      {auditReport.breakdown.thumbstopScore}%
                    </div>
                    <div className="text-[9px] text-slate-500">Detik 0-3</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Pacing Retensi</div>
                    <div className="text-sm font-black text-blue-400 mt-0.5">
                      {auditReport.breakdown.retentionScore}%
                    </div>
                    <div className="text-[9px] text-slate-500">Detik 3-15</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Kejelasan Demo</div>
                    <div className="text-sm font-black text-purple-400 mt-0.5">
                      {auditReport.breakdown.clarityScore}%
                    </div>
                    <div className="text-[9px] text-slate-500">Solusi Produk</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Kekuatan CTA</div>
                    <div className="text-sm font-black text-emerald-400 mt-0.5">
                      {auditReport.breakdown.offerScore}%
                    </div>
                    <div className="text-[9px] text-slate-500">Call to Action</div>
                  </div>
                </div>
              </div>

              {/* Diagnosis Verdicts */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Titik Kebocoran &amp; Diagnosa Masalah
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <strong className="text-amber-400">1. Evaluasi Hook Pembuka (Detik 0-3):</strong>
                    <p className="text-slate-300 leading-relaxed">{auditReport.keyFindings.hookVerdict}</p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <strong className="text-rose-400">2. Titik Drop-Off Penonton:</strong>
                    <p className="text-slate-300 leading-relaxed">{auditReport.keyFindings.dropOffWarning}</p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <strong className="text-blue-400">3. Bukti &amp; Demo Produk:</strong>
                    <p className="text-slate-300 leading-relaxed">{auditReport.keyFindings.proofVerdict}</p>
                  </div>
                </div>
              </div>

              {/* Actionable Fixes Prescriptions */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Arahan Perbaikan Taktis dari Agen (Siap Pakai)
                </h4>

                {/* 3 Replacement Hooks */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    3 Pilihan Hook Pengganti di Detik 0:
                  </span>
                  {auditReport.recommendedFixes.newHooks.map((h, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-200 font-semibold">
                        <strong className="text-emerald-400">#{i + 1}</strong> "{h}"
                      </span>
                      <button
                        onClick={() => copyToClipboard(h, `h_fix_${i}`)}
                        className="p-1 text-slate-500 hover:text-white"
                        title="Salin hook"
                      >
                        {copiedKey === `h_fix_${i}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Revised Voiceover */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      Naskah Voiceover Baru yang Dioptimasi:
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          auditReport.recommendedFixes.revisedVoiceover,
                          "vo_fix"
                        )
                      }
                      className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      {copiedKey === "vo_fix" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Salin Voiceover
                    </button>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                    {auditReport.recommendedFixes.revisedVoiceover}
                  </div>
                </div>

                {/* B-Roll & On-screen text fixes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <strong className="text-purple-300">Saran Visual B-Roll:</strong>
                    <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                      {auditReport.recommendedFixes.bRollSuggestions.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <strong className="text-teal-300">Revisi Teks di Layar:</strong>
                    <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                      {auditReport.recommendedFixes.onScreenTextFixes.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    onClick={handleSendToWarRoom}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-900/30"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Kirim Hasil Audit ke War Room Chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

