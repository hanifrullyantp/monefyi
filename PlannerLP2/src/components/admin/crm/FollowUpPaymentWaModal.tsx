"use client";

import { useState } from "react";
import {
  X,
  Send,
  Copy,
  Check,
  CreditCard,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Link2,
  Building,
  CheckCircle2,
} from "lucide-react";
import { Lead } from "@/lib/types/leads";
import { formatCurrency } from "@/lib/utils/format";

interface FollowUpPaymentWaModalProps {
  lead: Lead;
  onClose: () => void;
  onFollowUpSent: (leadId: string, notes: string) => void;
}

export function FollowUpPaymentWaModal({
  lead,
  onClose,
  onFollowUpSent,
}: FollowUpPaymentWaModalProps) {
  const [recipientName, setRecipientName] = useState(lead.name || "");
  const [recipientPhone, setRecipientPhone] = useState(lead.phone || "");
  const [recipientEmail, setRecipientEmail] = useState(lead.email || "");
  const [planTier, setPlanTier] = useState<"standard" | "pro" | "free">(
    lead.planTier === "pro" ? "pro" : "standard"
  );
  const [bumpTaken, setBumpTaken] = useState<boolean>(Boolean(lead.bumpTaken));
  const [paymentLinkType, setPaymentLinkType] = useState<"direct" | "lynk" | "manual">("direct");
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Normalisasi nomor HP / WA
  const cleanPhone = (recipientPhone || "").replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.startsWith("62")
    ? cleanPhone
    : cleanPhone.startsWith("0")
    ? `62${cleanPhone.slice(1)}`
    : cleanPhone
    ? `62${cleanPhone}`
    : "";

  // Kalkulasi total nominal sesuai pilihan
  const basePrice = planTier === "pro" ? 199000 : 93000;
  const bumpPrice = 49000;
  const finalAmount = lead.amount || (basePrice + (bumpTaken ? bumpPrice : 0));

  // 1. Link Checkout Otomatis (Pre-filled - Tinggal Bayar)
  const appBaseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://estimator.monefyi.com";

  const directCheckoutUrl = `${appBaseUrl}/checkout?plan=${planTier}&name=${encodeURIComponent(
    recipientName.trim()
  )}&phone=${encodeURIComponent(cleanPhone)}&email=${encodeURIComponent(
    recipientEmail.trim()
  )}&bump=${bumpTaken ? "1" : "0"}&step=5`;

  // 2. Link Lynk.id Resmi
  const lynkUrl =
    planTier === "pro" || (planTier === "standard" && bumpTaken)
      ? "http://lynk.id/asfin-ai/qynky6065k37/checkout"
      : "http://lynk.id/asfin-ai/16w36xe7z3v1/checkout";

  // URL yang aktif dipakai dalam pesan
  const activePaymentUrl = paymentLinkType === "lynk" ? lynkUrl : directCheckoutUrl;

  // Nama paket untuk teks
  const productName =
    planTier === "pro"
      ? `Monefyi Estimator PRO${bumpTaken ? " + Add-on SOP Proyek" : ""}`
      : `Monefyi Estimator Standard${bumpTaken ? " + Add-on SOP Proyek" : ""}`;

  // Konstruksi Teks Pesan WhatsApp Follow-up Konfirmasi Bayar
  const messageText = `Halo Kak ${recipientName.trim() || "Kontraktor"}! 🙌
Salam kenal, saya dari tim Monefyi Estimator.

Kami melihat Kakak sudah mengisi data pemesanan *${productName}*, namun proses pembayarannya belum sempat terselesaikan.

📋 *Ringkasan Pesanan Kakak:*
• Produk: *${productName}*
• Total Tagihan: *${formatCurrency(finalAmount)}*
• Lisensi: Aktif Seumur Hidup (Tanpa Iuran Bulanan)
• Status: Menunggu Pembayaran

⚡ *Link Pembayaran Langsung (Tinggal Bayar):*
👉 ${activePaymentUrl}

💡 *Kemudahan untuk Kakak:*
Data Kakak (*${recipientName.trim()}*, *${recipientEmail.trim() || "Email Anda"}*, *${recipientPhone}*) sudah otomatis tersimpan di sistem. 
Kakak *TIDAK PERLU* mengisi form dari awal lagi — cukup klik tautan di atas, pilih metode bayar (QRIS / Transfer Bank / VA), dan akun Estimator Kakak akan langsung aktif seketika!

💳 *Atau Pilihan Transfer Bank Manual:*
• Bank BCA: *869-093-4567* a/n Monefyi
(Cukup kirimkan bukti transfer ke chat ini untuk aktivasi instan)

Apakah ada pertanyaan atau kendala saat checkout tadi yang bisa kami bantu jelaskan? Tim kami siap mendampingi Kakak sekarang juga. Terima kasih! 🙏`;

  // Action: Kirim langsung via WhatsApp Web / App
  const handleSendViaWhatsApp = () => {
    if (!formattedPhone) {
      alert("Nomor WhatsApp belum valid (minimal 9 digit).");
      return;
    }
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, "_blank");

    onFollowUpSent(
      lead.id,
      `Follow-up konfirmasi pembayaran (Total: ${formatCurrency(finalAmount)}) via WhatsApp ke +${formattedPhone}`
    );
    onClose();
  };

  // Action: Salin Pesan Lengkap
  const handleCopyMessage = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(messageText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  // Action: Salin Link Pembayaran Saja
  const handleCopyLinkOnly = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(activePaymentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[32px] p-5 sm:p-7 w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative max-h-[94vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/25 shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                  Follow-Up Konfirmasi Bayar (1-Klik WA)
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Tinggal Bayar
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Kirim link pembayaran instan via WhatsApp sesuai data yang sudah diinput pelanggan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 no-scrollbar text-xs">
          {/* Data Pelanggan yang Sudah Dimasukkan */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Data Pesanan Pelanggan (Otomatis Terisi)
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-black">
                {formatCurrency(finalAmount)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nama</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label>
                <input
                  type="text"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Pilihan Paket & Bump */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-500">Pilihan Paket:</span>
              <button
                type="button"
                onClick={() => setPlanTier("standard")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all ${
                  planTier === "standard"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                Standard (Rp 93.000)
              </button>
              <button
                type="button"
                onClick={() => setPlanTier("pro")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all ${
                  planTier === "pro"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                PRO (Rp 199.000)
              </button>

              <label className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bumpTaken}
                  onChange={(e) => setBumpTaken(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Add-on SOP (+Rp 49.000)</span>
              </label>
            </div>
          </div>

          {/* Opsi Jenis Link Pembayaran */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Format Link Pembayaran:</span>
              </label>
              <button
                type="button"
                onClick={handleCopyLinkOnly}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? "Link Tersalin!" : "Salin Link"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentLinkType("direct")}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  paymentLinkType === "direct"
                    ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/30"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="font-extrabold text-[11px] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Checkout Otomatis (Rekomendasi)</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Nama, email, HP otomatis termuat. Pembeli langsung di tahap akhir QRIS/VA.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentLinkType("lynk")}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  paymentLinkType === "lynk"
                    ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/30"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="font-extrabold text-[11px] flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-indigo-600" />
                  <span>Lynk.id Checkout Resmi</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                  Tautan gateway Lynk.id alternatif jika pembeli lebih familiar.
                </p>
              </button>
            </div>
          </div>

          {/* Live Preview Pesan WhatsApp (Format Bubble WA) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pratinjau Pesan WhatsApp yang Akan Dikirim:</span>
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedText ? "Tersalin!" : "Salin Teks"}</span>
              </button>
            </div>

            <div className="bg-[#e5ddd5]/40 dark:bg-slate-950 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl shadow-sm text-slate-800 dark:text-slate-200 text-xs font-mono whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed border-l-4 border-emerald-500">
                {messageText}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleCopyMessage}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedText ? "Pesan Tersalin!" : "Salin Pesan"}</span>
          </button>

          <button
            type="button"
            onClick={handleSendViaWhatsApp}
            disabled={!formattedPhone}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs transition-all shadow-md shadow-emerald-950/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5 text-white" />
            <span>Kirim Follow-Up ke WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
