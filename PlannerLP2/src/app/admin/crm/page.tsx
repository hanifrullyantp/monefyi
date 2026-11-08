"use client";
import { useState, useEffect, useRef } from "react";
import { useLeadsStore } from "@/lib/store/leadsStore";
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  LayoutList,
  LayoutGrid,
  Settings as SettingsIcon,
  Info,
  Bell,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Mail,
  Key,
  Lock,
  Send,
  Check,
  X,
  Clock,
  RotateCcw,
  FileText,
  Wallet,
  TrendingUp,
  Copy,
  CreditCard,
} from "lucide-react";
import { FollowUpPaymentWaModal } from "@/components/admin/crm/FollowUpPaymentWaModal";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  Lead,
  LeadStatus,
  LeadSource,
  LeadEmailLog,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LEAD_SOURCE_LABELS,
} from "@/lib/types/leads";
import { getLeadPixelStage, META_PIXEL_ID } from "@/lib/analytics/metaPixel";
import { cn } from "@/lib/utils/cn";
import { EvergreenFunnelPlanner } from "@/components/admin/EvergreenFunnelPlanner";

const PIPELINE_COLUMNS: LeadStatus[] = [
  "new",
  "free_active",
  "abandoned_checkout",
  "pending_payment",
  "won",
  "contacted",
  "proposal_sent",
  "negotiating",
  "lost",
];

// Modal: Tambah Lead Manual
function AddLeadModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "activities">) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    source: "checkout" as LeadSource,
    status: "new" as LeadStatus,
    projectType: "Estimator Standard",
    estimatedValue: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...form,
      estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl overflow-hidden relative border border-slate-100">
        <h3 className="text-2xl font-black text-slate-900 mb-6">Tambah Lead Manual</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nama Lengkap (Wajib)</label>
              <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Nama lengkap" />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">No. HP / WA (Wajib)</label>
              <input required minLength={8} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="08xxxxxxxxxx" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email Aktif (Wajib)</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="email@contoh.com" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1.5">Paket / Layanan</label>
            <input required value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Estimator Free / Standard / PRO" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all cursor-pointer">Batal</button>
            <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer">Simpan Lead</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal: Trigger Manual Resend Email & Pantau Status Pengiriman
function ResendEmailModal({
  lead,
  onClose,
  onEmailSent,
}: {
  lead: Lead;
  onClose: () => void;
  onEmailSent: (log: LeadEmailLog) => void;
}) {
  const [customPassword, setCustomPassword] = useState("Estimator2026!");
  const [isSending, setIsSending] = useState(false);
  const [activeSendingType, setActiveSendingType] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [checkingEmailId, setCheckingEmailId] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<LeadEmailLog[]>(lead.emails || []);

  const handleSendEmail = async (type: "payment_confirmation" | "account_access" | "password_reset" | "followup") => {
    if (!lead.email || !lead.email.includes("@")) {
      setFeedbackMsg({ text: "Lead ini tidak memiliki alamat email valid.", isError: true });
      return;
    }

    setIsSending(true);
    setActiveSendingType(type);
    setFeedbackMsg(null);

    try {
      const res = await fetch("/api/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lead.email.trim(),
          name: lead.name,
          type,
          planTier: lead.planTier || (lead.projectType?.toLowerCase().includes("pro") ? "pro" : lead.projectType?.toLowerCase().includes("free") ? "free" : "standard"),
          amount: lead.amount || 0,
          paymentMethod: lead.paymentMethod || "QRIS",
          password: customPassword,
          leadId: lead.id,
          sessionId: lead.sessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Gagal mengirim email via Resend");
      }

      const newLog: LeadEmailLog = {
        id: `em_${Date.now()}`,
        resendId: data.emailId,
        type,
        subject: data.subject,
        to: data.to,
        status: data.status || "sent",
        sentAt: data.sentAt || new Date().toISOString(),
      };

      setEmailLogs((prev) => [newLog, ...prev]);
      onEmailSent(newLog);

      const typeLabel =
        type === "payment_confirmation"
          ? "Konfirmasi Pembayaran"
          : type === "account_access"
          ? "Akses Akun & Password"
          : type === "password_reset"
          ? "Reset Password"
          : "Follow-up";

      setFeedbackMsg({
        text: `Sukses! Email ${typeLabel} berhasil dikirim ke ${lead.email} ${data.warning ? `(${data.warning})` : ""}`,
      });
    } catch (err: any) {
      setFeedbackMsg({ text: err?.message || "Terjadi kesalahan sistem saat kirim email", isError: true });
    } finally {
      setIsSending(false);
      setActiveSendingType(null);
    }
  };

  const handleSendFullBundle = async () => {
    await handleSendEmail("payment_confirmation");
    await handleSendEmail("account_access");
  };

  const handleCheckStatus = async (emailId?: string) => {
    if (!emailId) return;
    setCheckingEmailId(emailId);
    try {
      const res = await fetch(`/api/email/resend?emailId=${encodeURIComponent(emailId)}`);
      const data = await res.json();
      if (data?.ok) {
        setEmailLogs((prev) =>
          prev.map((item) =>
            item.resendId === emailId ? { ...item, status: data.status as any } : item
          )
        );
      }
    } catch {
      // silent
    } finally {
      setCheckingEmailId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#065f46] flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">Trigger Email Resend</h3>
              <p className="text-xs text-slate-500 font-medium">
                Kirim email otomatis ke <strong>{lead.name}</strong> ({lead.email || "Tanpa Email"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1 no-scrollbar">
          {feedbackMsg && (
            <div
              className={cn(
                "p-4 rounded-2xl text-xs font-bold flex items-start gap-2.5",
                feedbackMsg.isError
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              )}
            >
              {feedbackMsg.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Trigger Action Buttons */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
              Pilih Aksi Pengiriman Email:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button 1: Konfirmasi Pembayaran */}
              <button
                disabled={isSending || !lead.email}
                onClick={() => handleSendEmail("payment_confirmation")}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 text-left transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-black text-slate-900 text-xs sm:text-sm group-hover:text-[#065f46]">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Konfirmasi Pembayaran</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kirim rincian invoice lunas, nominal {lead.amount ? formatCurrency(lead.amount) : "Rp 0"}, & paket.
                </p>
                {activeSendingType === "payment_confirmation" && (
                  <span className="text-[10px] text-emerald-700 font-bold block mt-2 animate-pulse">
                    Mengirim via Resend...
                  </span>
                )}
              </button>

              {/* Button 2: Kirim Password & Akses Akun */}
              <button
                disabled={isSending || !lead.email}
                onClick={() => handleSendEmail("account_access")}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 text-left transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-black text-slate-900 text-xs sm:text-sm group-hover:text-blue-700">
                  <Key className="w-4 h-4 text-blue-600" />
                  <span>Kirim Akun & Password</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kirim link login URL aplikasi dan password awal untuk masuk ke Estimator.
                </p>
                {activeSendingType === "account_access" && (
                  <span className="text-[10px] text-blue-700 font-bold block mt-2 animate-pulse">
                    Mengirim via Resend...
                  </span>
                )}
              </button>

              {/* Button 3: Ubah / Reset Password */}
              <button
                disabled={isSending || !lead.email}
                onClick={() => handleSendEmail("password_reset")}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-amber-600 hover:bg-amber-50/50 text-left transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-black text-slate-900 text-xs sm:text-sm group-hover:text-amber-800">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Reset / Ubah Password</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kirim password sementara baru dan panduan mengubah kata sandi akun.
                </p>
                {activeSendingType === "password_reset" && (
                  <span className="text-[10px] text-amber-700 font-bold block mt-2 animate-pulse">
                    Mengirim via Resend...
                  </span>
                )}
              </button>

              {/* Button 4: Follow-up Tertunda */}
              <button
                disabled={isSending || !lead.email}
                onClick={() => handleSendEmail("followup")}
                className="p-4 rounded-2xl border-2 border-slate-200 hover:border-purple-600 hover:bg-purple-50/50 text-left transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 font-black text-slate-900 text-xs sm:text-sm group-hover:text-purple-800">
                  <Send className="w-4 h-4 text-purple-600" />
                  <span>Follow-Up Checkout</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Kirim email pengingat untuk melanjutkan checkout yang belum selesai.
                </p>
                {activeSendingType === "followup" && (
                  <span className="text-[10px] text-purple-700 font-bold block mt-2 animate-pulse">
                    Mengirim via Resend...
                  </span>
                )}
              </button>
            </div>

            {/* Quick 1-Click Bundle */}
            <button
              disabled={isSending || !lead.email}
              onClick={handleSendFullBundle}
              className="w-full py-3.5 bg-gradient-to-r from-[#065f46] to-emerald-700 hover:from-emerald-800 hover:to-emerald-900 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-900/15 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>⚡ Kirim Paket Lengkap (Konfirmasi Lunas + Password Akun)</span>
            </button>
          </div>

          {/* Password Customizer */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Password Sementara yang Disertakan:
              </label>
              <button
                type="button"
                onClick={() => setCustomPassword(`Monefyi${Math.floor(1000 + Math.random() * 9000)}!`)}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Acak Otomatis
              </button>
            </div>
            <input
              value={customPassword}
              onChange={(e) => setCustomPassword(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800"
              placeholder="Estimator2026!"
            />
            <p className="text-[11px] text-slate-400">
              Password ini akan dicantumkan di template email &apos;Akses Akun&apos; dan &apos;Reset Password&apos;.
            </p>
          </div>

          {/* Email Monitoring / Delivery History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                Riwayat Pengiriman Email Buyer Ini:
              </label>
              <span className="text-[11px] font-bold text-slate-500">
                {emailLogs.length} Terkirim
              </span>
            </div>

            {emailLogs.length > 0 ? (
              <div className="space-y-2">
                {emailLogs.map((log) => {
                  const isDelivered = log.status === "delivered" || log.status === "sent" || log.status === "simulated";
                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-slate-800 uppercase text-[10px] bg-slate-200 px-2 py-0.5 rounded">
                            {log.type.replace("_", " ")}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1",
                              isDelivered ? "bg-emerald-100 text-[#065f46]" : "bg-rose-100 text-rose-700"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", isDelivered ? "bg-emerald-500" : "bg-rose-500")} />
                            <span>{log.status.toUpperCase()}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{log.subject}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(log.sentAt).toLocaleString("id-ID")} • ID: {log.resendId ? log.resendId.slice(0, 16) : "-"}
                        </p>
                      </div>

                      {log.resendId && !log.resendId.startsWith("sim_") && (
                        <button
                          onClick={() => handleCheckStatus(log.resendId)}
                          disabled={checkingEmailId === log.resendId}
                          className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shrink-0 cursor-pointer"
                          title="Cek Status Delivery Real-time dari Resend"
                        >
                          <RotateCcw className={cn("w-3.5 h-3.5", checkingEmailId === log.resendId && "animate-spin text-emerald-600")} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-semibold">
                Belum ada email yang dikirim ke buyer ini via Resend.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Resend REST API Integration</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal: Kirim Nama & Password Akun Pelanggan via WhatsApp
function SendAccountWaModal({
  lead,
  onClose,
  onAccountSent,
}: {
  lead: Lead;
  onClose: () => void;
  onAccountSent: (password: string) => void;
}) {
  const [password, setPassword] = useState(lead.accountPassword || "Estimator2026!");
  const [recipientName, setRecipientName] = useState(lead.name || "");
  const [recipientPhone, setRecipientPhone] = useState(lead.phone || "");
  const [recipientEmail, setRecipientEmail] = useState(lead.email || "");
  const [copied, setCopied] = useState(false);

  const cleanPhone = (recipientPhone || "").replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.startsWith("62")
    ? cleanPhone
    : cleanPhone.startsWith("0")
    ? `62${cleanPhone.slice(1)}`
    : cleanPhone
    ? `62${cleanPhone}`
    : "";

  const loginUrl = "https://estimator.monefyi.com/app/estimator";

  const messageText = `Halo Kak ${recipientName.trim()}! 🙌
Terima kasih telah memesan ${lead.projectType || "Monefyi Estimator"}.

Berikut adalah data akses login akun Estimator Kakak:
👤 *Nama*: ${recipientName.trim()}
📧 *Email / User*: ${recipientEmail.trim() || "-"}
🔑 *Password*: ${password}
🌐 *Link Login*: ${loginUrl}

💡 *Panduan Akses:*
1. Buka tautan di atas melalui browser HP atau Laptop Anda.
2. Masukkan Email dan Password di atas.
3. Setelah masuk, Kakak bisa langsung membuat estimasi RAB Proyek otomatis & mengubah kata sandi di menu profil.

Jika ada pertanyaan atau butuh bantuan teknis, tim kami siap membantu melalui chat ini ya Kak. Selamat berkarya! 🚀`;

  const handleSendViaWhatsApp = () => {
    if (!formattedPhone) {
      alert("Nomor WhatsApp belum valid.");
      return;
    }
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, "_blank");
    onAccountSent(password);
    onClose();
  };

  const handleCopyMessage = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/25">
              <Key className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">
                Kirim Akun & Password via WhatsApp
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kirim nama, user login, dan password akun Estimator langsung ke nomor WhatsApp pembeli
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1 no-scrollbar">
          {/* Form Recipient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1">
                Nama Pelanggan
              </label>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                placeholder="Nama Lengkap"
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1">
                No. WhatsApp (Tujuan)
              </label>
              <input
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-emerald-800 font-mono"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1">
                Email Pelanggan
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900"
                placeholder="nama@email.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">
                  Password Akun
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(`Monefyi${Math.floor(1000 + Math.random() * 9000)}!`)}
                  className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Acak Otomatis 🎲
                </button>
              </div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900"
                placeholder="Estimator2026!"
              />
            </div>
          </div>

          {/* Preview Box */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Preview Template Pesan WhatsApp:
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#e7f8ef]/80 border border-emerald-200/80 rounded-2xl p-4 text-xs font-medium text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner">
              {messageText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSendViaWhatsApp}
            disabled={!formattedPhone}
            className="flex-1 py-3 bg-[#065f46] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/15 transition-all active:scale-[0.98] cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Kirim via WhatsApp (+{formattedPhone || "-"})</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { MayarPayoutGuideModal } from "@/components/admin/MayarPayoutGuideModal";

export default function CRMPage() {
  const { leads, addLead, deleteLead, deleteLeads, updateLeadStatus, addActivity } = useLeadsStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "standard" | "pro">("all");
  const [view, setView] = useState<"table" | "pipeline">("table");
  const [mainTab, setMainTab] = useState<"leads" | "evergreen_funnel">("leads");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // State untuk Modal Resend Email
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Lead | null>(null);
  // State untuk Modal Kirim Akun & Password via WhatsApp
  const [selectedLeadForAccountWa, setSelectedLeadForAccountWa] = useState<Lead | null>(null);
  // State untuk Modal Follow-Up Konfirmasi Bayar (Tinggal Bayar)
  const [selectedLeadForPaymentFollowUp, setSelectedLeadForPaymentFollowUp] = useState<Lead | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mayar Financial Stats State (Saldo Akun, Lifetime Revenue, Omset Hari Ini)
  const [mayarStats, setMayarStats] = useState<{
    activeBalance: number;
    pendingBalance: number;
    totalBalance: number;
    lifetimeRevenue: number;
    totalPaidOrders: number;
    todayRevenue: number;
    pendingRevenue: number;
    isMayarConnected: boolean;
    lastUpdated: string | null;
  }>({
    activeBalance: 0,
    pendingBalance: 0,
    totalBalance: 0,
    lifetimeRevenue: 0,
    totalPaidOrders: 0,
    todayRevenue: 0,
    pendingRevenue: 0,
    isMayarConnected: false,
    lastUpdated: null,
  });
  const [isLoadingMayarStats, setIsLoadingMayarStats] = useState(false);
  const [verifyingLeadId, setVerifyingLeadId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Mayar Financial Stats & Live Balances
  const fetchMayarStats = async (verifyPending: boolean = false) => {
    try {
      setIsLoadingMayarStats(true);
      const res = await fetch(`/api/crm/mayar-stats?verifyPending=${verifyPending ? "true" : "false"}`);
      const data = await res.json();
      if (data?.ok) {
        setMayarStats({
          activeBalance: data.activeBalance || 0,
          pendingBalance: data.pendingBalance || 0,
          totalBalance: data.totalBalance || 0,
          lifetimeRevenue: data.lifetimeRevenue || 0,
          totalPaidOrders: data.totalPaidOrders || 0,
          todayRevenue: data.todayRevenue || 0,
          pendingRevenue: data.pendingRevenue || 0,
          isMayarConnected: Boolean(data.isMayarConnected),
          lastUpdated: data.lastUpdated || new Date().toISOString(),
        });

        if (data.updatedPaidCount && data.updatedPaidCount > 0) {
          showToast(`⚡ ${data.updatedPaidCount} pembayaran terkonfirmasi lunas dan status diperbarui otomatis!`);
          syncServerLeads(false);
        }
      }
    } catch (err) {
      console.warn("Could not fetch Mayar stats:", err);
    } finally {
      setIsLoadingMayarStats(false);
    }
  };

  // Verifikasi Lead Tunggal Langsung ke Mayar API (Mengatasi kasus Abe)
  const handleVerifyMayarSingle = async (lead: Lead) => {
    const payId = lead.paymentId || lead.sessionId;
    if (!payId) {
      alert("Lead ini belum memiliki ID Transaksi Mayar.");
      return;
    }

    setVerifyingLeadId(lead.id);
    try {
      const res = await fetch(`/api/checkout/mayar?id=${payId}`);
      const data = await res.json();
      if (data?.isPaid) {
        updateLeadStatus(lead.id, "won");
        showToast(`✅ Pembayaran "${lead.name}" terverifikasi LUNAS di Mayar!`);
        fetchMayarStats(false);
        syncServerLeads(false);
      } else {
        alert(`Status di Mayar: ${data?.status || "Belum Lunas"}. Belum ada konfirmasi pembayaran masuk dari Mayar.`);
      }
    } catch {
      alert("Gagal menghubungi Mayar API. Coba beberapa saat lagi.");
    } finally {
      setVerifyingLeadId(null);
    }
  };

  // Update Penggunaan Kuota Estimasi (0 s/d 3) langsung ke API & Supabase
  const handleUpdateLeadQuota = async (leadId: string, usedQuota: number) => {
    try {
      const res = await fetch("/api/crm/lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadId,
          usedEstimations: usedQuota,
          estimatorActivity: {
            usedEstimations: usedQuota,
            maxEstimations: 3,
            activityLevel: usedQuota >= 3 ? "quota_exhausted" : usedQuota > 0 ? "trying" : "not_started",
            lastActiveAt: new Date().toISOString(),
          },
        }),
      });
      if (res.ok) {
        useLeadsStore.getState().updateLead(leadId, {
          estimatorActivity: {
            usedEstimations: usedQuota,
            maxEstimations: 3,
            activityLevel: usedQuota >= 3 ? "quota_exhausted" : usedQuota > 0 ? "trying" : "not_started",
            lastActiveAt: new Date().toISOString(),
          },
        });
        showToast(`Status kuota ${usedQuota}/3 berhasil diperbarui`);
      }
    } catch (err) {
      console.warn("Could not update lead quota:", err);
    }
  };

  // Auto-sync leads dari Supabase & Server API saat mount
  const syncServerLeads = async (verifyMayar: boolean = false) => {
    try {
      setIsSyncing(true);
      const res = await fetch(`/api/crm/lead${verifyMayar ? "?verifyMayar=true" : ""}`);
      const data = await res.json();
      if (data?.ok && Array.isArray(data.leads)) {
        const store = useLeadsStore.getState();
        data.leads.forEach((remote: any) => {
          // Cocokkan HANYA berdasarkan ID unik (id, sessionId, atau paymentId)
          // JANGAN PERNAH mencocokkan berdasarkan nama/email agar lead dengan nama/email sama tidak tertukar ID-nya!
          const exists = store.leads.find(
            (l) =>
              (remote.id && l.id === remote.id) ||
              (remote.paymentId && l.paymentId === remote.paymentId) ||
              (remote.sessionId && l.sessionId === remote.sessionId)
          );

          if (!exists) {
            store.addLead({
              id: remote.id,
              name: remote.name || "Lead Checkout",
              phone: remote.phone || "-",
              email: remote.email || undefined,
              projectType: `Estimator ${(remote.planTier || "standard").toUpperCase()}`,
              source: "checkout",
              status: remote.status || "abandoned_checkout",
              sessionId: remote.sessionId,
              checkoutStep: remote.checkoutStep,
              planTier: remote.planTier,
              bumpTaken: remote.bumpTaken,
              paymentMethod: remote.paymentMethod,
              amount: remote.amount,
              estimatedValue: remote.amount ?? remote.estimatedValue,
              paymentId: remote.paymentId,
              emails: Array.isArray(remote.emails) ? remote.emails : [],
              createdAt: remote.createdAt,
              updatedAt: remote.updatedAt,
              estimatorActivity: remote.estimatorActivity,
            });
          } else {
            store.updateLead(exists.id, {
              name: remote.name && remote.name !== "Lead Checkout (Draft)" && remote.name !== "Anonim" ? remote.name : exists.name,
              phone: remote.phone && remote.phone !== "-" ? remote.phone : exists.phone,
              email: remote.email || exists.email,
              status: remote.status || exists.status,
              bumpTaken: remote.bumpTaken ?? exists.bumpTaken,
              paymentMethod: remote.paymentMethod || exists.paymentMethod,
              amount: remote.amount ?? exists.amount,
              estimatedValue: remote.amount ?? exists.estimatedValue ?? exists.amount,
              paymentId: remote.paymentId || exists.paymentId,
              checkoutStep: remote.checkoutStep ?? exists.checkoutStep,
              planTier: remote.planTier || exists.planTier,
              emails: Array.isArray(remote.emails) && remote.emails.length > 0 ? remote.emails : exists.emails,
              estimatorActivity: remote.estimatorActivity ?? exists.estimatorActivity,
            });
          }
        });
      }
    } catch (err) {
      console.warn("Could not sync server leads:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Bersihkan dan perbaiki ID duplikat / ID yang keliru sama dengan nama di localStorage
    useLeadsStore.getState().cleanDuplicateIds();
    syncServerLeads(true);
    fetchMayarStats(true);
  }, []);

  const totalLeadsCount = leads.length;
  const freeCount = leads.filter(
    (l) => l.status === "free_active" || l.status === "free_draft" || l.planTier === "free" || Number(l.amount || 0) === 0
  ).length;
  const abandonedCount = leads.filter(
    (l) => l.status === "abandoned_checkout" && l.planTier !== "free" && Number(l.amount || 0) > 0
  ).length;
  const pendingCount = leads.filter((l) => l.status === "pending_payment").length;
  const wonCount = leads.filter(
    (l) => l.status === "won" && Number(l.amount || 0) > 0 && l.planTier !== "free"
  ).length;
  const potentialRecoveryValue = leads
    .filter((l) => (l.status === "abandoned_checkout" || l.status === "pending_payment") && l.planTier !== "free")
    .reduce((sum, l) => sum + (l.amount || 99000), 0);

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.paymentId || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.productId || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.sessionId || "").toLowerCase().includes(search.toLowerCase()) ||
      l.projectType.toLowerCase().includes(search.toLowerCase()) ||
      (l.city || "").toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const matchPlan =
      planFilter === "all" ||
      l.planTier === planFilter ||
      l.projectType?.toLowerCase().includes(planFilter);

    return matchSearch && matchStatus && matchPlan;
  });

  // Checklist Selection Logic
  const isAllSelected = filtered.length > 0 && filtered.every((l) => l.id && selectedIds.has(l.id));
  const isSomeSelected = filtered.some((l) => l.id && selectedIds.has(l.id)) && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => {
          if (l.id) next.delete(l.id);
        });
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((l) => {
          if (l.id) next.add(l.id);
        });
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Hapus Single Lead (Local + Server Backend)
  const handleDeleteSingle = async (lead: Lead) => {
    if (!confirm(`Hapus lead "${lead.name}" secara permanen? Data akan dihapus dari server.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/crm/lead", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [lead.id],
          sessionIds: lead.sessionId ? [lead.sessionId] : [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Gagal menghapus lead dari server");
      }

      deleteLead(lead.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
      showToast(`Lead "${lead.name}" berhasil dihapus permanen!`);
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus lead.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Hapus Masal Terpilih (Bulk Delete - Local + Server Backend)
  const deleteSelectedLeads = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Hapus ${count} lead terpilih secara permanen? Data yang dihapus dari server tidak dapat dipulihkan.`)) return;

    setIsDeleting(true);
    try {
      const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
      const ids = selectedLeads.map((l) => l.id);
      const sessionIds = selectedLeads.map((l) => l.sessionId).filter(Boolean) as string[];

      const res = await fetch("/api/crm/lead", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, sessionIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Gagal menghapus lead secara masal dari server");
      }

      deleteLeads(ids);
      setSelectedIds(new Set());
      showToast(`${count} lead berhasil dihapus permanen dari database!`);
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus lead secara masal.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Tandai Masal Sudah Dihubungi
  const handleBulkMarkContacted = async () => {
    const selectedLeads = leads.filter((l) => selectedIds.has(l.id));
    if (selectedLeads.length === 0) return;

    for (const l of selectedLeads) {
      updateLeadStatus(l.id, "contacted");
      fetch("/api/crm/lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: l.id, sessionId: l.sessionId, status: "contacted" }),
      }).catch(() => {});
    }

    setSelectedIds(new Set());
    showToast(`${selectedLeads.length} lead ditandai sebagai 'Sudah Dihubungi'!`);
  };

  // Update Status Single Lead (Local + Server Backend)
  const handleStatusChange = async (lead: Lead, newStatus: LeadStatus) => {
    updateLeadStatus(lead.id, newStatus);
    try {
      await fetch("/api/crm/lead", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          sessionId: lead.sessionId,
          status: newStatus,
        }),
      });
      showToast(`Status ${lead.name} diubah ke ${LEAD_STATUS_LABELS[newStatus] || newStatus}`);
    } catch (err) {
      console.warn("Status patch sync error:", err);
    }
  };

  const exportCSV = () => {
    const rows = [
      ["ID", "Nama", "No WA", "Email", "Paket", "Order Bump", "Metode Bayar", "Nominal", "Status", "Email Resend Sent", "Tanggal"],
      ...filtered.map((l) => [
        l.id,
        l.name,
        l.phone,
        l.email || "",
        l.planTier || l.projectType,
        l.bumpTaken ? "Ya" : "Tidak",
        l.paymentMethod || "-",
        l.amount || 0,
        LEAD_STATUS_LABELS[l.status] || l.status,
        l.emails ? `${l.emails.length} email` : "0",
        formatDate(l.createdAt),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monefyi-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Direct WhatsApp Follow-up Link Generator
  const generateWhatsAppLink = (lead: Lead) => {
    const cleanPhone = (lead.phone || "").replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("62")
      ? cleanPhone
      : cleanPhone.startsWith("0")
      ? `62${cleanPhone.slice(1)}`
      : `62${cleanPhone}`;

    let msg = `Halo Kak ${lead.name}, salam dari tim Monefyi Estimator! 🙌\n\n`;

    if (lead.status === "abandoned_checkout") {
      msg += `Kami perhatikan Kakak sempat mengisi form pemesanan Estimator tapi belum menyelesaikan aktivasi. Apakah ada pertanyaan atau kendala yang bisa kami bantu jelaskan?`;
    } else if (lead.status === "pending_payment") {
      const amountStr = lead.amount ? `sebesar ${formatCurrency(lead.amount)}` : "";
      const methodStr = lead.paymentMethod ? `via ${lead.paymentMethod.toUpperCase()}` : "";
      msg += `Menindaklanjuti pesanan akun Estimator Kakak ${amountStr} ${methodStr}. Apakah nomor VA / QRIS-nya sudah diterima dan butuh bantuan panduan pembayaran?`;
    } else if (lead.status === "won") {
      msg += `Terima kasih! Akun Estimator Kakak sudah aktif. Apakah ada panduan atau template estimasi yang ingin kami bantu siapkan?`;
    } else {
      msg += `Terima kasih sudah tertarik dengan Monefyi Estimator. Kami siap membantu jika Kakak butuh konsultasi kebutuhan estimasi proyek Anda.`;
    }

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleWhatsAppClick = (lead: Lead) => {
    addActivity(lead.id, {
      type: "whatsapp",
      content: `Follow-up WhatsApp dikirim (Status: ${lead.status})`,
      timestamp: new Date().toISOString(),
      by: "Admin",
    });
  };

  const handleEmailSentCallback = (newLog: LeadEmailLog) => {
    if (!selectedLeadForEmail) return;

    const existingEmails = selectedLeadForEmail.emails || [];
    const updatedEmails = [newLog, ...existingEmails];

    // Update Zustand Store
    useLeadsStore.getState().updateLead(selectedLeadForEmail.id, {
      emails: updatedEmails,
    });

    addActivity(selectedLeadForEmail.id, {
      type: "email",
      content: `Email Resend terkirim: ${newLog.type} (${newLog.subject})`,
      timestamp: newLog.sentAt,
      by: "Admin",
    });

    showToast(`Email ${newLog.type.replace("_", " ")} berhasil dikirim via Resend!`);
  };

  const handleAccountWaSentCallback = (pwd: string) => {
    if (!selectedLeadForAccountWa) return;

    useLeadsStore.getState().updateLead(selectedLeadForAccountWa.id, {
      accountPassword: pwd,
    });

    addActivity(selectedLeadForAccountWa.id, {
      type: "whatsapp",
      content: `Nama & Password (${pwd}) akun Estimator dikirim ke WA (+${selectedLeadForAccountWa.phone})`,
      timestamp: new Date().toISOString(),
      by: "Admin",
    });

    fetch("/api/crm/lead", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedLeadForAccountWa.id,
        sessionId: selectedLeadForAccountWa.sessionId,
        accountPassword: pwd,
      }),
    }).catch(() => {});

    showToast(`Akun & password untuk ${selectedLeadForAccountWa.name} berhasil diarahkan ke WhatsApp!`);
  };

  const handlePaymentFollowUpSentCallback = (leadId: string, notes: string) => {
    addActivity(leadId, {
      type: "whatsapp",
      content: notes,
      timestamp: new Date().toISOString(),
      by: "Admin",
    });

    showToast("Link pembayaran (Tinggal Bayar) berhasil diarahkan ke WhatsApp pelanggan!");
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in text-xs font-extrabold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM & Email Monitor</h1>
            <span className="text-xs font-extrabold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              Resend Integrated
            </span>
            <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
              Live Auto-Sync
            </span>
          </div>
          <p className="text-slate-500 font-medium mt-1">
            Pantau status email buyer, follow-up WhatsApp 1-klik, dan trigger manual konfirmasi pembayaran / password
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#065f46] hover:bg-emerald-800 text-white px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-900/15 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Lead Manual
          </button>
          <button
            onClick={() => {
              syncServerLeads(true);
              fetchMayarStats(true);
            }}
            disabled={isSyncing || isLoadingMayarStats}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60"
            title="Sinkronkan saldo Mayar dan verifikasi status pembayaran terbaru"
          >
            <RefreshCw className={cn("w-4 h-4", (isSyncing || isLoadingMayarStats) && "animate-spin")} />
            <span>{isSyncing || isLoadingMayarStats ? "Memverifikasi..." : "Cek Mayar & Saldo"}</span>
          </button>
          <button
            onClick={() => syncServerLeads(false)}
            disabled={isSyncing}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin text-emerald-600")} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Main Mode Navigation (Daftar Leads vs Evergreen Funnel Bot) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit mb-8 border border-slate-200">
        <button
          type="button"
          onClick={() => setMainTab("leads")}
          className={cn(
            "px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
            mainTab === "leads"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <LayoutList className="w-4 h-4 text-emerald-600" />
          <span>Daftar Lead & Transaksi</span>
          <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
            {leads.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("evergreen_funnel")}
          className={cn(
            "px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2",
            mainTab === "evergreen_funnel"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>Funneling & Bot Evergreen Campaign</span>
          <span className="px-2 py-0.2 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
            {freeCount} Free
          </span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* MAYAR FINANCIAL & REVENUE HUB (SALDO & LIFETIME REVENUE) */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#064e3b] rounded-[32px] p-6 md:p-8 text-white shadow-2xl shadow-emerald-950/20 mb-8 border border-emerald-500/20 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-black tracking-tight">
                    Mayar Financial & Lifetime Revenue Hub
                  </h2>
                  <span
                    className={cn(
                      "text-[10px] font-black px-2.5 py-0.5 rounded-full border",
                      mayarStats.isMayarConnected
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-400/40"
                    )}
                  >
                    {mayarStats.isMayarConnected ? "Mayar Live Sync" : "Database Aggregate"}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Pantau saldo aktif, pencairan payout, dan total omset penjualan real-time tanpa perlu membuka dashboard Mayar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPayoutModal(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/15"
                title="Buka Panduan Penarikan Dana di Mayar"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tarik Dana (Payout)</span>
              </button>

              <button
                onClick={() => fetchMayarStats(true)}
                disabled={isLoadingMayarStats}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoadingMayarStats && "animate-spin")} />
                <span>{isLoadingMayarStats ? "Memverifikasi..." : "Update Saldo & Verifikasi Mayar"}</span>
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Saldo Siap Tarik (Active Balance) */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-emerald-400/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Saldo Siap Tarik (Active)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-2xl lg:text-3xl font-black text-emerald-400 group-hover:scale-105 transition-transform">
                {formatCurrency(mayarStats.activeBalance)}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mt-2 pt-2 border-t border-white/5">
                <span>Tersedia untuk Payout</span>
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(true)}
                  className="text-emerald-300 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  Tarik <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 2. Saldo Tertunda (Pending Balance) */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-amber-400/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Saldo Dalam Proses (Pending)
                </span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-black text-amber-300 group-hover:scale-105 transition-transform">
                {formatCurrency(mayarStats.pendingBalance)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-2 pt-2 border-t border-white/5">
                Clearing settlement bank Mayar
              </p>
            </div>

            {/* 3. Lifetime Revenue (Total Omset Kumulatif) */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-blue-400/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Lifetime Revenue (Omset)
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-black text-blue-300 group-hover:scale-105 transition-transform">
                {formatCurrency(mayarStats.lifetimeRevenue)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-2 pt-2 border-t border-white/5">
                {mayarStats.totalPaidOrders} transaksi berhasil dibayar
              </p>
            </div>

            {/* 4. Omset Hari Ini (Today's Revenue) */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-purple-400/40 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Omset Hari Ini (24 Jam)
                </span>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <p className="text-2xl lg:text-3xl font-black text-purple-300 group-hover:scale-105 transition-transform">
                {formatCurrency(mayarStats.todayRevenue)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-2 pt-2 border-t border-white/5">
                {mayarStats.lastUpdated ? `Update: ${new Date(mayarStats.lastUpdated).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB` : "Real-time"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          {
            label: "TOTAL PROSPEK",
            value: totalLeadsCount,
            sub: `${leads.length} data tersimpan`,
            color: "text-slate-900",
            bg: "bg-white",
          },
          {
            label: "CHECKOUT TERTUNDA",
            value: abandonedCount,
            sub: "Siap Difollow-up WA & Email",
            color: "text-rose-600",
            bg: "bg-rose-50/50 border-rose-200/60",
          },
          {
            label: "MENUNGGU BAYAR",
            value: pendingCount,
            sub: "Invoice / VA Terbit",
            color: "text-amber-600",
            bg: "bg-amber-50/50 border-amber-200/60",
          },
          {
            label: "DEAL / LUNAS",
            value: wonCount,
            sub: `${freeCount} akun free aktif`,
            color: "text-emerald-600",
            bg: "bg-emerald-50/50 border-emerald-200/60",
          },
        ].map((s, i) => (
          <div
            key={i}
            className={cn(
              "rounded-[28px] p-6 border shadow-sm hover:shadow-md transition-all group",
              s.bg || "bg-white border-slate-100"
            )}
          >
            <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] mb-2 uppercase">
              {s.label}
            </p>
            <p className={cn("text-4xl font-black mb-1.5 transition-transform group-hover:scale-105", s.color)}>
              {s.value}
            </p>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recovery Banner */}
      {abandonedCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-[24px] p-5 mb-8 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/20">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-base">
                Peluang Recovery: {abandonedCount} calon pelanggan tertunda di langkah checkout!
              </p>
              <p className="text-xs text-amber-100 mt-0.5">
                Estimasi potensi omset: ~{formatCurrency(potentialRecoveryValue)}. Hubungi via WhatsApp atau kirim email follow-up Resend.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter("abandoned_checkout")}
            className="px-5 py-2.5 bg-white text-amber-900 rounded-xl font-black text-xs hover:bg-amber-50 transition-all shadow-md shrink-0 cursor-pointer"
          >
            Filter Lead Tertunda →
          </button>
        </div>
      )}

      {/* Meta Pixel Live Monitor & Funnel Health Bar */}
      <div className="bg-slate-900 text-white rounded-[24px] p-5 mb-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-blue-400">
              Meta Pixel Live Tracker
            </span>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              ID: {META_PIXEL_ID}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
              🟢 Terpasang di Checkout
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Aturan: <strong className="text-emerald-400">Purchase HANYA terdata saat uang riil terbayar (&gt; Rp 0)</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Initiate Checkout (IC)</p>
            <p className="text-xl font-black text-blue-400 mt-1">{leads.length}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">User mengisi form checkout</p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Add Payment Info</p>
            <p className="text-xl font-black text-amber-400 mt-1">
              {leads.filter((l) => l.status === "pending_payment" || (l.checkoutStep && l.checkoutStep >= 4) || Boolean(l.paymentMethod)).length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Sudah checkout tapi belum bayar</p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Purchase (Lunas)</p>
            <p className="text-xl font-black text-emerald-400 mt-1">
              {leads.filter((l) => l.status === "won" && Number(l.amount || 0) > 0).length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Uang riil diterima (&gt; Rp 0)</p>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Complete Reg. (Free)</p>
            <p className="text-xl font-black text-teal-400 mt-1">
              {leads.filter((l) => l.status === "free_active" || l.planTier === "free").length}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Aktivasi gratis (Bukan Purchase)</p>
          </div>
        </div>
      </div>

      {mainTab === "leads" ? (
        <>
          {/* Main Filter & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "Semua Lead", count: totalLeadsCount },
            { id: "free_active", label: "Member Free", count: freeCount },
            { id: "abandoned_checkout", label: "Tertunda", count: abandonedCount },
            { id: "pending_payment", label: "Menunggu Bayar", count: pendingCount },
            { id: "won", label: "Deal / Paid", count: wonCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                statusFilter === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  statusFilter === tab.id ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-700 shadow-sm"
          >
            <option value="all">Semua Paket</option>
            <option value="free">Paket Free (Rp0)</option>
            <option value="standard">Paket Standard</option>
            <option value="pro">Paket PRO</option>
          </select>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, WA, email..."
              className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold w-full sm:w-[220px] focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="bg-white text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-slate-50 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={deleteSelectedLeads}
              disabled={isDeleting}
              className="bg-rose-50 text-rose-600 border border-rose-200 px-3.5 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 hover:bg-rose-100 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Hapus ({selectedIds.size})</span>
            </button>
          )}

          {/* View Toggle */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
            <button
              onClick={() => setView("table")}
              className={cn(
                "p-2 rounded-lg transition-all cursor-pointer",
                view === "table" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
              title="Table View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("pipeline")}
              className={cn(
                "p-2 rounded-lg transition-all cursor-pointer",
                view === "pipeline" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
              title="Pipeline View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-30 mb-6 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-slate-950/20 border border-slate-700 flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center text-xs font-black">
              ✓
            </span>
            <div>
              <p className="text-xs sm:text-sm font-black tracking-wide">
                {selectedIds.size} Prospek Terpilih
              </p>
              <p className="text-[10px] text-slate-400">
                Pilih aksi masal di sebelah kanan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleBulkMarkContacted}
              disabled={isDeleting}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tandai Sudah Dihubungi</span>
            </button>

            <button
              onClick={deleteSelectedLeads}
              disabled={isDeleting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Terpilih ({selectedIds.size})</span>
                </>
              )}
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Batalkan
            </button>
          </div>
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="bg-white rounded-[28px] border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-200/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-50/80 border-b border-slate-200/80">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
                  <th className="py-4 px-5 text-left w-10">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      title={isAllSelected ? "Batalkan semua pilihan" : "Pilih semua data di tabel"}
                    />
                  </th>
                  <th className="py-4 px-4 text-left">PROSPEK & KONTAK</th>
                  <th className="py-4 px-4 text-left">PAKET & BUMP</th>
                  <th className="py-4 px-4 text-left">KEAKTIFAN ESTIMATOR (3 KUOTA)</th>
                  <th className="py-4 px-4 text-left">STATUS CHECKOUT</th>
                  <th className="py-4 px-4 text-left">TOTAL & METODE</th>
                  <th className="py-4 px-4 text-left">STATUS EMAIL RESEND</th>
                  <th className="py-4 px-4 text-center">FOLLOW-UP WA</th>
                  <th className="py-4 px-4 text-center">TRIGGER EMAIL RESEND</th>
                  <th className="py-4 px-4 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((lead) => {
                  const hasWa = Boolean(lead.phone && lead.phone !== "-" && lead.phone.length > 7);
                  const hasEmail = Boolean(lead.email && lead.email.includes("@"));
                  const isFree = lead.planTier === "free" || lead.amount === 0;
                  const emailsSent = lead.emails || [];
                  const pixelInfo = getLeadPixelStage(lead);

                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        "transition-colors group",
                        selectedIds.has(lead.id)
                          ? "bg-emerald-50/70 hover:bg-emerald-50/90"
                          : "hover:bg-slate-50/90"
                      )}
                    >
                      <td className="py-4 px-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                      </td>

                      {/* Prospek & Kontak */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-extrabold text-slate-900 text-sm">{lead.name}</p>
                            {lead.paymentId && (
                              <span
                                className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100"
                                title={`Mayar Payment ID: ${lead.paymentId}`}
                              >
                                ID: {lead.paymentId.replace(/-/g, "").slice(0, 6)}
                              </span>
                            )}
                            {lead.productId && (
                              <span
                                className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded"
                                title={`Mayar Product ID: ${lead.productId}`}
                              >
                                Prod: {lead.productId}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-700 text-xs tracking-wide">
                              {lead.phone || "-"}
                            </span>
                            {hasWa && (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                  `Halo ${lead.name}, terima kasih telah memesan ${lead.projectType || "Monefyi Estimator"}!`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-emerald-600 hover:text-emerald-700 hover:scale-110 transition-transform"
                                title="Buka Chat WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4 fill-emerald-500 text-emerald-600" />
                              </a>
                            )}
                          </div>

                          {lead.email ? (
                            <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px]" title={lead.email}>
                              {lead.email}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Tanpa email</p>
                          )}
                        </div>
                      </td>

                      {/* Paket & Bump */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={cn(
                              "text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider",
                              lead.planTier === "free" || lead.projectType?.toLowerCase().includes("free")
                                ? "bg-emerald-100 text-[#065f46]"
                                : lead.planTier === "pro" || lead.projectType?.toLowerCase().includes("pro")
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            )}
                          >
                            {lead.planTier?.toUpperCase() || lead.projectType || "STANDARD"}
                          </span>
                          {lead.paymentName && (
                            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                              {lead.paymentName}
                            </span>
                          )}
                          {lead.bumpTaken && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>+Order Bump</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Keaktifan Estimator (3 Kuota) */}
                      <td className="py-4 px-4">
                        {isFree ? (
                          <div className="space-y-1.5 min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] font-black">
                              <span
                                className={cn(
                                  (lead.estimatorActivity?.usedEstimations ?? 0) >= 3
                                    ? "text-amber-800"
                                    : (lead.estimatorActivity?.usedEstimations ?? 0) > 0
                                    ? "text-blue-800"
                                    : "text-slate-600"
                                )}
                              >
                                {lead.estimatorActivity?.usedEstimations ?? 0}/3 Kuota
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {(lead.estimatorActivity?.usedEstimations ?? 0) >= 3 ? "Habis" : "Aktif"}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  (lead.estimatorActivity?.usedEstimations ?? 0) >= 3
                                    ? "bg-amber-500"
                                    : (lead.estimatorActivity?.usedEstimations ?? 0) > 0
                                    ? "bg-blue-600"
                                    : "bg-slate-300"
                                )}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round(((lead.estimatorActivity?.usedEstimations ?? 0) / 3) * 100)
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="flex items-center gap-1 pt-0.5">
                              <span className="text-[9px] text-slate-400 font-bold">Ubah:</span>
                              {[0, 1, 2, 3].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => handleUpdateLeadQuota(lead.id, val)}
                                  className={cn(
                                    "w-4 h-4 rounded text-[9px] font-black flex items-center justify-center transition-all cursor-pointer",
                                    (lead.estimatorActivity?.usedEstimations ?? 0) === val
                                      ? "bg-slate-900 text-white"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  )}
                                  title={`Set kuota ke ${val}/3`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Unlimited (Paid)
                            </span>
                            <span className="text-[9px] text-slate-400 block font-semibold">Tanpa Batas Kuota</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <select
                              value={lead.status}
                              onChange={(e) => handleStatusChange(lead, e.target.value as any)}
                              className={cn(
                                "border rounded-xl px-2.5 py-1 text-[11px] font-extrabold cursor-pointer transition-all",
                                LEAD_STATUS_COLORS[lead.status] || "bg-slate-100 text-slate-700 border-slate-200"
                              )}
                            >
                              {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                            {lead.status === "won" && (
                              <span
                                className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs inline-flex items-center gap-0.5"
                                title="Status pembayaran lunas di Mayar"
                              >
                                Paid
                              </span>
                            )}
                          </div>

                          {/* Quick 1-Click Mayar Payment Verifier (Kasus Abe) */}
                          {lead.status === "pending_payment" && (
                            <button
                              type="button"
                              onClick={() => handleVerifyMayarSingle(lead)}
                              disabled={verifyingLeadId === lead.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-emerald-50 text-amber-800 hover:text-emerald-800 border border-amber-200 hover:border-emerald-300 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer disabled:opacity-50 mt-1 shadow-2xs"
                              title="Cek apakah pembeli sudah membayar di Mayar"
                            >
                              <RefreshCw className={cn("w-2.5 h-2.5", verifyingLeadId === lead.id && "animate-spin text-emerald-600")} />
                              <span>{verifyingLeadId === lead.id ? "Memeriksa..." : "Cek Status Mayar"}</span>
                            </button>
                          )}

                          {lead.checkoutStep && (
                            <p className="text-[10px] text-slate-400 font-semibold">
                              Sampai Langkah {lead.checkoutStep}/5
                            </p>
                          )}

                          {/* Status Event Meta Pixel */}
                          <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                            <span className="text-[9px] font-bold text-slate-400">Pixel:</span>
                            <span
                              className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5",
                                pixelInfo.badgeClass
                              )}
                              title={pixelInfo.desc}
                            >
                              {pixelInfo.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Total & Metode Bayar */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <span className="font-black text-slate-900 text-sm block">
                            {isFree ? "Rp 0 (Free)" : formatCurrency(lead.amount || 99000)}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {isFree ? "GRATIS" : lead.paymentMethod || "QRIS"}
                          </span>
                        </div>
                      </td>

                      {/* Status Email Resend (Monitoring) */}
                      <td className="py-4 px-4">
                        {emailsSent.length > 0 ? (
                          <button
                            onClick={() => setSelectedLeadForEmail(lead)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-left hover:bg-emerald-100/70 transition-colors cursor-pointer group"
                            title="Klik untuk melihat riwayat pengiriman & detail Resend ID"
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <div>
                              <span className="font-extrabold text-[#065f46] text-[11px] block">
                                Terkirim ({emailsSent.length}x)
                              </span>
                              <span className="text-[9px] text-emerald-800 font-semibold block capitalize truncate max-w-[120px]">
                                {emailsSent[0].type.replace("_", " ")}
                              </span>
                            </div>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-lg">
                            <Clock className="w-3 h-3" />
                            <span>Belum ada</span>
                          </span>
                        )}
                      </td>

                      {/* Direct WhatsApp Follow-up & Kirim Akun */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col gap-1.5 items-center min-w-[125px]">
                          <button
                            type="button"
                            onClick={() => setSelectedLeadForAccountWa(lead)}
                            disabled={!hasWa}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black text-[11px] shadow-sm shadow-emerald-700/20 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                            title="Kirim nama, user email, dan password akun Estimator langsung via WhatsApp"
                          >
                            <Key className="w-3 h-3 text-amber-300" />
                            <span>Kirim Akun (WA)</span>
                          </button>
                          {hasWa ? (
                            <a
                              href={generateWhatsAppLink(lead)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleWhatsAppClick(lead)}
                              className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                              title="Buka chat WhatsApp follow-up umum"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>Follow-up WA</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tanpa nomor WA</span>
                          )}
                        </div>
                      </td>

                      {/* Trigger Manual Email Resend */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setSelectedLeadForEmail(lead)}
                          disabled={!hasEmail}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-xl font-extrabold text-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                          title={hasEmail ? "Kirim konfirmasi pembayaran, password, atau reset password" : "Lead belum mengisi email"}
                        >
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span>Trigger Email</span>
                        </button>
                      </td>

                      {/* Aksi Hapus / Detail */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/crm/${lead.id}`}
                            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            Detail
                          </Link>
                          <button
                            onClick={() => handleDeleteSingle(lead)}
                            disabled={isDeleting}
                            className="text-[11px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            title="Hapus Lead Permanen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                      Belum ada data lead yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kanban / Pipeline View */}
      {view === "pipeline" && (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-5 min-w-max">
            {PIPELINE_COLUMNS.map((status) => {
              const statusLeads = filtered.filter((l) => l.status === status);
              return (
                <div key={status} className="w-80 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className={cn("text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider", LEAD_STATUS_COLORS[status])}>
                      {LEAD_STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {statusLeads.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {statusLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            Step {lead.checkoutStep || 1}/5
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                              {lead.planTier?.toUpperCase() || "STANDARD"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(lead)}
                              disabled={isDeleting}
                              className="text-slate-300 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer disabled:opacity-40"
                              title="Hapus Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="font-black text-slate-900 text-base leading-tight">{lead.name}</p>
                          <p className="text-xs font-bold text-emerald-700 mt-0.5">{lead.phone || "-"}</p>
                          {lead.email && <p className="text-[11px] text-slate-400 truncate">{lead.email}</p>}
                        </div>

                        {/* Status Email Resend Badge */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                          <span className="text-xs font-black text-slate-900">
                            {lead.amount ? formatCurrency(lead.amount) : "Rp 0"}
                          </span>
                          {lead.emails && lead.emails.length > 0 ? (
                            <span className="text-[10px] font-bold text-[#065f46] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              {lead.emails.length} email terkirim
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Belum ada email</span>
                          )}
                        </div>

                        {/* 1-Click Mayar Status Verifier */}
                        {lead.status === "pending_payment" && (
                          <button
                            type="button"
                            onClick={() => handleVerifyMayarSingle(lead)}
                            disabled={verifyingLeadId === lead.id}
                            className="w-full py-1.5 bg-amber-50 hover:bg-emerald-50 text-amber-800 hover:text-emerald-800 border border-amber-200 hover:border-emerald-300 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <RefreshCw className={cn("w-3 h-3", verifyingLeadId === lead.id && "animate-spin text-emerald-600")} />
                            <span>{verifyingLeadId === lead.id ? "Memeriksa Mayar..." : "Cek Status Pembayaran Mayar"}</span>
                          </button>
                        )}

                        {/* Action WhatsApp & Email Buttons */}
                        <div className="pt-2 space-y-1.5">
                          {lead.phone && lead.phone !== "-" && (
                            <button
                              type="button"
                              onClick={() => setSelectedLeadForAccountWa(lead)}
                              className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-black text-[11px] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-300" />
                              <span>Kirim Akun & Password (WA)</span>
                            </button>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            {lead.phone && lead.phone !== "-" && (
                              <a
                                href={generateWhatsAppLink(lead)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleWhatsAppClick(lead)}
                                className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WA
                              </a>
                            )}
                            <button
                              onClick={() => setSelectedLeadForEmail(lead)}
                              disabled={!lead.email}
                              className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" /> Email
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {statusLeads.length === 0 && (
                      <div className="bg-slate-100/60 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs font-bold text-slate-400">
                        Kosong
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      ) : (
        <EvergreenFunnelPlanner
          leads={leads}
          onUpdateLeadQuota={handleUpdateLeadQuota}
          onRefreshData={() => {
            syncServerLeads(true);
            fetchMayarStats(true);
          }}
        />
      )}

      {/* Modal Tambah Lead */}
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdd={addLead} />}

      {/* Modal Trigger & Monitor Email Resend */}
      {selectedLeadForEmail && (
        <ResendEmailModal
          lead={selectedLeadForEmail}
          onClose={() => setSelectedLeadForEmail(null)}
          onEmailSent={handleEmailSentCallback}
        />
      )}

      {/* Modal Kirim Nama & Password Akun via WhatsApp */}
      {selectedLeadForAccountWa && (
        <SendAccountWaModal
          lead={selectedLeadForAccountWa}
          onClose={() => setSelectedLeadForAccountWa(null)}
          onAccountSent={handleAccountWaSentCallback}
        />
      )}

      {/* Modal Panduan Penarikan Saldo Mayar (Payout) */}
      {showPayoutModal && (
        <MayarPayoutGuideModal
          onClose={() => setShowPayoutModal(false)}
          activeBalance={mayarStats.activeBalance}
          pendingBalance={mayarStats.pendingBalance}
          onRefresh={() => fetchMayarStats(true)}
        />
      )}
    </div>
  );
}
