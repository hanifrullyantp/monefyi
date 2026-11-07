"use client";

import React, { useState } from "react";
import { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils/cn";
import {
  Users,
  Target,
  Sparkles,
  Send,
  MessageCircle,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  Sliders,
  FileText,
  Zap,
} from "lucide-react";

interface EvergreenFunnelPlannerProps {
  leads: Lead[];
  onUpdateLeadQuota: (leadId: string, usedQuota: number) => Promise<void>;
  onRefreshData: () => void;
}

export function EvergreenFunnelPlanner({
  leads,
  onUpdateLeadQuota,
  onRefreshData,
}: EvergreenFunnelPlannerProps) {
  const [selectedStage, setSelectedStage] = useState<
    "all" | "onboarding" | "exploration" | "closing" | "reengagement"
  >("all");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // Filter khusus untuk prospek berstatus Free
  const freeLeads = leads.filter(
    (l) => l.planTier === "free" || l.status === "free_active" || l.status === "free_draft" || l.amount === 0
  );

  // Pengelompokan berdasarkan keaktifan 3 kuota estimasi
  const onboardingLeads = freeLeads.filter((l) => {
    const used = l.estimatorActivity?.usedEstimations ?? 0;
    return used === 0;
  });

  const explorationLeads = freeLeads.filter((l) => {
    const used = l.estimatorActivity?.usedEstimations ?? 0;
    return used === 1 || used === 2;
  });

  const closingLeads = freeLeads.filter((l) => {
    const used = l.estimatorActivity?.usedEstimations ?? 0;
    return used >= 3;
  });

  // Ambil lead yang ditampilkan sesuai filter stage
  const displayedLeads =
    selectedStage === "onboarding"
      ? onboardingLeads
      : selectedStage === "exploration"
      ? explorationLeads
      : selectedStage === "closing"
      ? closingLeads
      : freeLeads;

  // Generator Template Pesan WhatsApp Tanpa Emotikon Sesuai Tahapan Funnel
  const getWhatsAppMessage = (lead: Lead, stageType: "onboarding" | "exploration" | "closing" | "reengagement") => {
    const name = lead.name && lead.name !== "Anonim" && lead.name !== "Lead Checkout (Draft)" ? lead.name : "Bapak/Ibu";
    const used = lead.estimatorActivity?.usedEstimations ?? 0;

    if (stageType === "onboarding") {
      return `Halo ${name}, terima kasih telah mengaktifkan akun trial Monefyi Estimator. Kami ingin memastikan apakah Anda sudah sempat mencoba kalkulator estimasi untuk proyek pertama Anda? Jika butuh panduan cepat, Anda dapat langsung login di estimator.monefyi.com atau balas pesan ini jika ada kendala saat mulai menghitung.`;
    }

    if (stageType === "exploration") {
      return `Halo ${name}, kami melihat Anda telah berhasil membuat ${used} dari 3 estimasi proyek di Monefyi Estimator. Apakah penawaran harga dan perhitungan HPP sudah sesuai dengan kebutuhan di lapangan? Anda juga dapat mengunduh format PDF penawaran resmi berlogo untuk langsung dikirimkan ke calon klien Anda.`;
    }

    if (stageType === "closing") {
      return `Halo ${name}, kuota 3 estimasi trial gratis Anda di Monefyi Estimator telah terpakai seluruhnya. Untuk melanjutkan perhitungan proyek tanpa batas kuota serta membuka fitur Proforma Invoice dan kalkulasi HPP otomatis, kami sedang membuka penawaran upgrade ke Paket Standard / PRO Sekali Bayar Selamanya. Apakah Anda ingin kami kirimkan rincian akses selamanya ini?`;
    }

    return `Halo ${name}, akun trial Monefyi Estimator Anda masih tersedia dengan 3 kuota estimasi gratis. Apakah Anda memiliki kendala teknis saat memasukkan item pekerjaan atau material? Tim kami siap membantu memandu Anda agar perhitungan proyek berjalan cepat dan akurat.`;
  };

  const handleCopyText = (text: string, templateKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateId(templateKey);
    setTimeout(() => setCopiedTemplateId(null), 3000);
  };

  const handleQuickAdjustQuota = async (leadId: string, quota: number) => {
    setUpdatingLeadId(leadId);
    try {
      await onUpdateLeadQuota(leadId, quota);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner Funneling */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 rounded-[32px] p-6 md:p-8 text-white border border-teal-500/20 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded-full text-xs font-black uppercase tracking-wider">
                  Evergreen Campaign Engine
                </span>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-black uppercase tracking-wider">
                  Monefyi Estimator
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black mt-2 tracking-tight">
                Strategi Funneling & Bot Evergreen Campaign
              </h2>
              <p className="text-slate-300 text-sm mt-1 max-w-3xl">
                Otomatisasi alur penawaran bagi pengguna akun Free berdasarkan tingkat keaktifan pemakaian 3 kuota estimasi aplikasi. Rencanakan kapan dan bagaimana penawaran upgrade disampaikan secara bertahap dan tepat sasaran.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onRefreshData}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 border border-white/15 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sinkronkan Status</span>
              </button>
            </div>
          </div>

          {/* Ringkasan Matriks Funneling 4 Tahap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Tahap 1: Onboarding */}
            <div
              onClick={() => setSelectedStage("onboarding")}
              className={cn(
                "p-5 rounded-2xl border transition-all cursor-pointer group text-left",
                selectedStage === "onboarding"
                  ? "bg-teal-500/20 border-teal-400 ring-2 ring-teal-400/30"
                  : "bg-white/5 border-white/10 hover:border-teal-400/40"
              )}
            >
              <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                <span>Tahap 1: Onboarding</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">D+0 s/d D+1</span>
              </div>
              <p className="text-3xl font-black text-teal-300 group-hover:scale-105 transition-transform">
                {onboardingLeads.length} Lead
              </p>
              <p className="text-xs text-slate-300 font-bold mt-1">Kuota: 0/3 Terpakai (Belum Mulai)</p>
              <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/10">
                Fokus: Edukasi cara hitung proyek ke-1 dan video demo 2 menit.
              </p>
            </div>

            {/* Tahap 2: Value Discovery */}
            <div
              onClick={() => setSelectedStage("exploration")}
              className={cn(
                "p-5 rounded-2xl border transition-all cursor-pointer group text-left",
                selectedStage === "exploration"
                  ? "bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/30"
                  : "bg-white/5 border-white/10 hover:border-blue-400/40"
              )}
            >
              <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                <span>Tahap 2: Discovery</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">D+2 s/d D+4</span>
              </div>
              <p className="text-3xl font-black text-blue-300 group-hover:scale-105 transition-transform">
                {explorationLeads.length} Lead
              </p>
              <p className="text-xs text-slate-300 font-bold mt-1">Kuota: 1-2/3 Terpakai (Aktif)</p>
              <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/10">
                Fokus: Tunjukkan fitur cetak PDF penawaran resmi berlogo.
              </p>
            </div>

            {/* Tahap 3: Closing Offer */}
            <div
              onClick={() => setSelectedStage("closing")}
              className={cn(
                "p-5 rounded-2xl border transition-all cursor-pointer group text-left",
                selectedStage === "closing"
                  ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30"
                  : "bg-white/5 border-white/10 hover:border-amber-400/40"
              )}
            >
              <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                <span>Tahap 3: Closing Offer</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">Saat Kuota Habis</span>
              </div>
              <p className="text-3xl font-black text-amber-300 group-hover:scale-105 transition-transform">
                {closingLeads.length} Lead
              </p>
              <p className="text-xs text-slate-300 font-bold mt-1">Kuota: 3/3 Terpakai (Siap Beli)</p>
              <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/10">
                Fokus: Penawaran Upgrade Standard/PRO Sekali Bayar Selamanya.
              </p>
            </div>

            {/* Tahap 4: Total Free Active */}
            <div
              onClick={() => setSelectedStage("all")}
              className={cn(
                "p-5 rounded-2xl border transition-all cursor-pointer group text-left",
                selectedStage === "all"
                  ? "bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/30"
                  : "bg-white/5 border-white/10 hover:border-emerald-400/40"
              )}
            >
              <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                <span>Total Member Free</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">Semua Status</span>
              </div>
              <p className="text-3xl font-black text-emerald-300 group-hover:scale-105 transition-transform">
                {freeLeads.length} Lead
              </p>
              <p className="text-xs text-slate-300 font-bold mt-1">Potensi Pipeline Konversi</p>
              <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/10">
                Klik untuk menampilkan seluruh daftar prospek Free.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Blueprint Skenario Evergreen & Panduan Eksekusi Bot */}
      <div className="bg-white rounded-[28px] p-6 md:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-600" />
              <span>Blueprint Skenario Evergreen: Kapan dan Bagaimana Memberi Penawaran</span>
            </h3>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Panduan waktu dan pendekatan komunikasi otomatis agar prospek Free terkonversi menjadi pelanggan berbayar tanpa terasa agresif
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Skenario A */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                  Tahap 1: Onboarding
                </span>
                <span className="text-xs font-bold text-slate-500">D+0 dan D+1</span>
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Aktivasi Hitung Proyek Pertama
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Kapan:</strong> 30 menit setelah registrasi dan pagi hari berikutnya (pukul 09.00 WIB) jika belum membuat estimasi sama sekali (0/3).
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Bagaimana:</strong> Kirim sapaan hangat, tanyakan proyek yang sedang dihitung, dan lampirkan link panduan cepat agar mereka segera mencapai aha-moment kalkulasi HPP.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-[11px] font-extrabold text-teal-700 block mb-1.5">Contoh Pesan Sapaan:</span>
              <p className="text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-normal">
                Halo Bapak/Ibu, terima kasih telah mengaktifkan trial Monefyi Estimator. Kami ingin memastikan apakah Anda sudah sempat mencoba kalkulator estimasi untuk proyek pertama Anda? Jika butuh panduan cepat, Anda dapat langsung login di estimator.monefyi.com.
              </p>
            </div>
          </div>

          {/* Skenario B */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Tahap 2: Value Discovery
                </span>
                <span className="text-xs font-bold text-slate-500">D+2 s/d D+4</span>
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Validasi Manfaat & Fitur PDF RAB
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Kapan:</strong> Saat user berhasil menghitung 1 atau 2 estimasi proyek.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Bagaimana:</strong> Arahkan mereka untuk mencetak dokumen penawaran PDF resmi berlogo. Tunjukkan bagaimana format RAB rapi dapat meningkatkan kepercayaan owner proyek hingga 3x lipat.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-[11px] font-extrabold text-blue-700 block mb-1.5">Contoh Pesan Discovery:</span>
              <p className="text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-normal">
                Halo Bapak/Ibu, kami melihat Anda telah berhasil membuat estimasi proyek di Monefyi Estimator. Apakah penawaran harga sudah sesuai? Anda dapat mengunduh format PDF penawaran resmi berlogo untuk langsung dikirimkan ke calon klien Anda.
              </p>
            </div>
          </div>

          {/* Skenario C */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Tahap 3: Closing Offer
                </span>
                <span className="text-xs font-bold text-slate-500">Trigger Kuota Habis</span>
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Penawaran Evergreen Sekali Bayar
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Kapan:</strong> Begitu kuota 3/3 habis terpakai. Ini adalah momen saat minat dan ketergantungan user pada aplikasi sedang di titik tertinggi.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Bagaimana:</strong> Berikan penawaran khusus Upgrade ke Paket Standard / PRO Sekali Bayar Selamanya dengan diskon terbatas dan bonus template item bahan.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <span className="text-[11px] font-extrabold text-amber-700 block mb-1.5">Contoh Pesan Closing:</span>
              <p className="text-[11px] font-mono text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-normal">
                Halo Bapak/Ibu, kuota 3 estimasi trial gratis Anda di Monefyi Estimator telah terpakai seluruhnya. Untuk melanjutkan perhitungan tanpa batas kuota serta membuka fitur Proforma Invoice, kami sedang membuka penawaran upgrade Paket Sekali Bayar Selamanya. Mau kami kirimkan rinciannya?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Interaktif Prospek Free & Keaktifan 3 Kuota */}
      <div className="bg-white rounded-[28px] border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Daftar Prospek Free & Tracking Keaktifan Estimasi ({displayedLeads.length} Lead)
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pantau jumlah kuota estimasi yang digunakan oleh setiap user dan kirim pesan follow-up personal 1-klik via WhatsApp
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Filter Tahapan:</span>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-700"
            >
              <option value="all">Semua Member Free ({freeLeads.length})</option>
              <option value="onboarding">Tahap 1: Onboarding (0/3 Kuota) ({onboardingLeads.length})</option>
              <option value="exploration">Tahap 2: Discovery (1-2/3 Kuota) ({explorationLeads.length})</option>
              <option value="closing">Tahap 3: Closing Offer (3/3 Habis) ({closingLeads.length})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-left">
                <th className="py-3.5 px-5">NAMA & KONTAK</th>
                <th className="py-3.5 px-4">TANGGAL DAFTAR</th>
                <th className="py-3.5 px-4">KEAKTIFAN KUOTA (MAX 3)</th>
                <th className="py-3.5 px-4">STATUS TAHAPAN FUNNEL</th>
                <th className="py-3.5 px-4 text-center">SIMULASI / UBAH KUOTA</th>
                <th className="py-3.5 px-5 text-center">AKSI FOLLOW-UP WHATSAPP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    Tidak ada prospek pada tahapan filter ini.
                  </td>
                </tr>
              ) : (
                displayedLeads.map((lead) => {
                  const used = lead.estimatorActivity?.usedEstimations ?? 0;
                  const max = lead.estimatorActivity?.maxEstimations ?? 3;
                  const pct = Math.min(100, Math.round((used / max) * 100));
                  const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");
                  const hasWa = cleanPhone.length >= 8;

                  // Tentukan tahapan otomatis berdasarkan pemakaian kuota
                  const currentStage: "onboarding" | "exploration" | "closing" =
                    used >= 3 ? "closing" : used > 0 ? "exploration" : "onboarding";

                  const waMessage = getWhatsAppMessage(lead, currentStage);
                  const waUrl = hasWa ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}` : "";

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Nama & Kontak */}
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{lead.name}</p>
                          <p className="font-bold text-teal-700 text-xs mt-0.5">{lead.phone || "-"}</p>
                          {lead.email && <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">{lead.email}</p>}
                        </div>
                      </td>

                      {/* Tanggal Daftar */}
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                      </td>

                      {/* Keaktifan Kuota 3 Estimasi */}
                      <td className="py-4 px-4 min-w-[200px]">
                        <div>
                          <div className="flex items-center justify-between text-xs font-black mb-1">
                            <span className={cn(
                              used >= 3 ? "text-amber-700" : used > 0 ? "text-blue-700" : "text-slate-600"
                            )}>
                              {used}/{max} Estimasi Terpakai
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{pct}%</span>
                          </div>
                          {/* Progress bar visual */}
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                used >= 3
                                  ? "bg-amber-500"
                                  : used > 0
                                  ? "bg-blue-600"
                                  : "bg-slate-300"
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                            {used >= 3 ? "Kuota Gratis Habis" : used > 0 ? `Sisa ${max - used} slot lagi` : "Belum mulai menghitung"}
                          </span>
                        </div>
                      </td>

                      {/* Status Tahapan Funnel */}
                      <td className="py-4 px-4">
                        {used >= 3 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <span>Siap Closing (3/3)</span>
                          </span>
                        ) : used > 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                            <span>Discovery (Aktif)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200 inline-flex items-center gap-1">
                            <span>Onboarding (0/3)</span>
                          </span>
                        )}
                      </td>

                      {/* Quick Adjust Quota (Simulasi Keaktifan) */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          {[0, 1, 2, 3].map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled={updatingLeadId === lead.id}
                              onClick={() => handleQuickAdjustQuota(lead.id, val)}
                              className={cn(
                                "w-6 h-6 rounded-lg text-xs font-black transition-all cursor-pointer disabled:opacity-50",
                                used === val
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : "text-slate-600 hover:bg-white"
                              )}
                              title={`Ubah penggunaan kuota ke ${val}/3`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Aksi Follow-up WhatsApp */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {hasWa ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer",
                                used >= 3
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : used > 0
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-teal-700 hover:bg-teal-800 text-white"
                              )}
                              title="Buka WhatsApp dengan draft pesan otomatis sesuai kuota lead"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{used >= 3 ? "Tawarkan Upgrade" : used > 0 ? "Follow-up Tips" : "Kirim Panduan"}</span>
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Nomor tidak valid</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyText(waMessage, lead.id)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Salin Draft Pesan Teks"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {copiedTemplateId === lead.id && (
                          <span className="text-[10px] font-extrabold text-teal-700 block mt-1">Teks disalin!</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

