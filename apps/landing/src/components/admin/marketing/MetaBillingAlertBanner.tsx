"use client";

import { useState, useEffect, useMemo } from "react";
import { useMarketingStore } from "@/lib/store/marketingStore";
import { sendAdminNotification } from "@/lib/services/notificationService";
import { authedFetch } from "@/lib/auth/authedFetch";
import {
  classifyMetaBilling,
  daysUntilDate,
  nextMonthlyBillDate,
  type MetaBillKind,
} from "@/lib/marketing/metaBillingAlert";
import {
  CreditCard,
  Clock,
  Settings2,
  ExternalLink,
  ShieldCheck,
  Bell,
  X,
} from "lucide-react";

interface MetaBillingAlertBannerProps {
  totalSpendToday?: number;
}

export function MetaBillingAlertBanner({ totalSpendToday = 0 }: MetaBillingAlertBannerProps) {
  const { accountBilling, metaAccountName } = useMarketingStore();

  // Pengaturan Banner Dismissed per Sesi (SessionStorage)
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("monefyi_billing_banner_dismissed") === "true";
    }
    return false;
  });

  // Pengaturan Batas Tagihan & Waktu Peringatan (Ikuti threshold Meta secara dinamis; fallback manual opsional)
  const [billingThreshold, setBillingThreshold] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = Number(localStorage.getItem("monefyi_billing_threshold") || 0);
      return Number.isFinite(saved) && saved > 0 ? saved : 0;
    }
    return 0;
  });

  const [alertHours, setAlertHours] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("monefyi_billing_alert_hours");
      return saved ? Number(saved) : 6;
    }
    return 6;
  });

  const [billDay, setBillDay] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = Number(localStorage.getItem("monefyi_billing_day") || 0);
      return saved >= 1 && saved <= 28 ? saved : 0;
    }
    return 0;
  });
  const [leadDays, setLeadDays] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = Number(localStorage.getItem("monefyi_billing_lead_days") || 2);
      return saved >= 0 ? saved : 2;
    }
    return 2;
  });
  const [alertEmail, setAlertEmail] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("monefyi_billing_alert_email") || "";
    return "";
  });
  const [channelNote, setChannelNote] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(billingThreshold);
  const [tempAlertHours, setTempAlertHours] = useState(alertHours);
  const [tempBillDay, setTempBillDay] = useState(billDay);
  const [tempLeadDays, setTempLeadDays] = useState(leadDays);
  const [tempEmail, setTempEmail] = useState(alertEmail);

  const currentBill = accountBilling?.balance && accountBilling.balance > 0 ? accountBilling.balance : 0;
  const metaThreshold = accountBilling?.thresholdAmount && accountBilling.thresholdAmount > 0
    ? accountBilling.thresholdAmount
    : 0;
  const activeThreshold = metaThreshold || billingThreshold;

  // Sinkronkan threshold dinamis dari Meta ke localStorage agar notifikasi & popup selalu mengikuti nilai terbaru Meta
  useEffect(() => {
    if (metaThreshold > 0 && typeof window !== "undefined") {
      localStorage.setItem("monefyi_billing_threshold", String(metaThreshold));
      setTempThreshold(metaThreshold);
    }
  }, [metaThreshold]);
  const cardName = accountBilling?.fundingSource || "kartu belum terbaca";
  const paymentFailed = Boolean(accountBilling?.paymentFailed);

  // Hitung burn rate per jam
  const hourlyBurnRate = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const activeHours = Math.max(1, currentHour);
    if (totalSpendToday > 0) {
      return Math.round(totalSpendToday / activeHours);
    }
    return 0;
  }, [totalSpendToday]);

  // Sisa nominal menuju batas penagihan
  const remainingToThreshold = Math.max(0, activeThreshold - currentBill);

  const estimatedHoursLeft = useMemo(() => {
    if (totalSpendToday <= 0 || remainingToThreshold <= 0 || hourlyBurnRate <= 0) return null;
    const hrs = remainingToThreshold / hourlyBurnRate;
    return Math.max(0.1, Math.round(hrs * 10) / 10);
  }, [remainingToThreshold, hourlyBurnRate, totalSpendToday]);

  const progressPercent = activeThreshold > 0
    ? Math.min(100, Math.round((currentBill / activeThreshold) * 100))
    : 0;

  const nextBill = useMemo(() => nextMonthlyBillDate(billDay), [billDay]);
  const daysLeft = nextBill ? daysUntilDate(nextBill) : null;
  const kind: MetaBillKind = classifyMetaBilling({
    balance: currentBill,
    threshold: activeThreshold,
    daysUntilBill: daysLeft,
    leadDays,
    paymentFailed,
  });
  const isUrgent = kind !== "ok";

  const alertCopy = useMemo(() => {
    const bill = `Rp ${currentBill.toLocaleString("id-ID")}`;
    const limit = activeThreshold > 0 ? `Rp ${activeThreshold.toLocaleString("id-ID")}` : "ambang Meta (otomatis)";
    const when = nextBill
      ? nextBill.toLocaleDateString("id-ID", { day: "numeric", month: "long" })
      : "tanggal penagihan";
    if (kind === "payment_failed") {
      return {
        title: "Pembayaran Meta gagal",
        body: `Tagihan berjalan ${bill}. Ini bukan karena ambang ${limit} belum tercapai. Meta menarik pada tanggal penagihan dan kartu ${cardName} ditolak. Isi saldo sebelum Meta menagih ulang, supaya iklan tidak dimatikan.`,
      };
    }
    if (kind === "date_soon") {
      return {
        title: daysLeft === 0 ? "Meta menagih hari ini" : `Tanggal penagihan Meta H-${daysLeft}`,
        body: `Pada ${when} Meta menarik tagihan berjalan ${bill} meski masih di bawah ambang ${limit}. Siapkan saldo di ${cardName}.`,
      };
    }
    if (kind === "threshold_soon") {
      return {
        title: "Tagihan Meta mendekati ambang",
        body: `Tagihan ${bill} sudah melewati 85% ambang ${limit}. Meta bisa menarik dana sebelum tanggal ${when}. Siapkan saldo di ${cardName}.`,
      };
    }
    return {
      title: "Pembayaran Meta aman",
      body: activeThreshold > 0
        ? `Tagihan ${bill} dari ambang ${limit}. Penarikan mengikuti ambang dinamis Meta atau tanggal ${when}, mana yang lebih dulu.`
        : `Tagihan berjalan ${bill}. Ambang penarikan mengikuti pengaturan pembayaran Meta secara dinamis (atau tanggal ${when}).`,
    };
  }, [kind, currentBill, activeThreshold, nextBill, daysLeft, cardName]);

  useEffect(() => {
    if (kind === "ok" || typeof window === "undefined") return;
    const dayKey = new Date().toISOString().slice(0, 10);
    const stampKey = `monefyi_billing_notify_${kind}_${dayKey}`;
    if (localStorage.getItem(stampKey) === "1") return;
    localStorage.setItem(stampKey, "1");

    sendAdminNotification({
      type: "api_alert",
      title: alertCopy.title,
      body: alertCopy.body,
      url: "/admin/marketing",
    });

    authedFetch("/api/admin/meta-billing-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title: alertCopy.title,
        message: alertCopy.body,
        email: alertEmail,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const parts = [
          data?.telegram?.sent ? "Telegram terkirim" : data?.telegram?.message,
          data?.whatsapp?.sent ? "WhatsApp terkirim" : data?.whatsapp?.message,
          data?.email?.sent ? "Email terkirim" : data?.email?.message,
        ].filter(Boolean);
        setChannelNote(parts.join(" · "));
      })
      .catch(() => setChannelNote("Notifikasi browser terkirim. Saluran email/WA/Telegram gagal dihubungi."));
  }, [kind, alertCopy.title, alertCopy.body, alertEmail]);

  const handleSaveSettings = () => {
    setBillingThreshold(tempThreshold);
    setAlertHours(tempAlertHours);
    setBillDay(tempBillDay);
    setLeadDays(tempLeadDays);
    setAlertEmail(tempEmail.trim());
    if (typeof window !== "undefined") {
      localStorage.setItem("monefyi_billing_threshold", String(tempThreshold));
      localStorage.setItem("monefyi_billing_alert_hours", String(tempAlertHours));
      localStorage.setItem("monefyi_billing_day", String(tempBillDay));
      localStorage.setItem("monefyi_billing_lead_days", String(tempLeadDays));
      localStorage.setItem("monefyi_billing_alert_email", tempEmail.trim());
    }
    setIsModalOpen(false);
  };

  const handleManualTestAlert = () => {
    sendAdminNotification({
      type: "api_alert",
      title: "[SIMULASI] Tanggal penagihan Meta sudah dekat",
      body: alertCopy.body,
      url: "/admin/marketing",
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("monefyi_billing_banner_dismissed", "true");
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <div
        className={`rounded-2xl p-3.5 transition-all duration-300 border shadow-xs ${
          isUrgent
            ? "bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/60 border-rose-500/40 text-white"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sisi Kiri: Status Kartu & Tagihan */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isUrgent
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              }`}
            >
              <CreditCard className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm tracking-tight">
                  Status Pembayaran {metaAccountName || "Meta Ads"}:{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    {cardName}
                  </span>
                </span>
                {kind === "payment_failed" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    GAGAL BAYAR
                  </span>
                ) : kind === "date_soon" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    TANGGAL PENAGIHAN DEKAT
                  </span>
                ) : kind === "threshold_soon" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    MENDEKATI AMBANG
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Aman
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>
                  Tagihan Saat Ini:{" "}
                  <strong className="text-slate-900 dark:text-white font-black">
                    Rp {currentBill.toLocaleString("id-ID")}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Ambang:{" "}
                  <strong className="text-slate-900 dark:text-white font-black">
                    {activeThreshold > 0
                      ? `Rp ${activeThreshold.toLocaleString("id-ID")}`
                      : "Otomatis Meta (belum terbaca)"}
                  </strong>
                  {metaThreshold > 0 ? " (sinkron Meta)" : activeThreshold > 0 ? " (manual)" : ""}
                  {" · "}
                  Tanggal:{" "}
                  <strong className="text-slate-900 dark:text-white font-black">
                    {nextBill
                      ? `${nextBill.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} (H-${daysLeft})`
                      : "belum diatur"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Estimasi Waktu Penarikan & Aksi */}
          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {kind === "payment_failed"
                    ? "Kartu ditolak"
                    : kind === "date_soon"
                    ? daysLeft === 0
                      ? "Ditarik hari ini"
                      : `Ditarik ${daysLeft} hari lagi`
                    : estimatedHoursLeft == null
                    ? "Menunggu tanggal atau ambang"
                    : `Ambang ~${estimatedHoursLeft} jam lagi`}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 max-w-[220px]">
                {alertCopy.body}
              </div>
            </div>

            {/* Tombol Pengaturan Alert */}
            <button
              type="button"
              onClick={() => {
                setTempThreshold(metaThreshold || billingThreshold);
                setTempAlertHours(alertHours);
                setTempBillDay(billDay);
                setTempLeadDays(leadDays);
                setTempEmail(alertEmail);
                setIsModalOpen(true);
              }}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Atur Batas Tagihan & Waktu Alert"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Tombol Test Alert */}
            <button
              type="button"
              onClick={handleManualTestAlert}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-500/20 transition-all cursor-pointer flex items-center gap-1"
              title="Kirim notifikasi uji coba ke HP & Laptop"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Uji Notif</span>
            </button>

            {/* Link ke Meta Ads Manager Billing */}
            <a
              href="https://adsmanager.facebook.com/billing_hub"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>Bayar di Meta</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Tombol Silang (Dismiss untuk Sesi Ini) */}
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Tutup notifikasi status pembayaran untuk sesi ini"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar Batas Penagihan */}
        <div className="mt-2.5">
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progressPercent >= 85
                  ? "bg-rose-500 animate-pulse"
                  : progressPercent >= 60
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
            <span>
              {progressPercent}% menuju ambang (sisa Rp {remainingToThreshold.toLocaleString("id-ID")})
            </span>
            <span>
              {channelNote || `Pengingat tanggal: H-${leadDays}. Ambang hanya jika terisi 85%.`}
            </span>
          </div>
        </div>
      </div>

      {/* MODAL PENGATURAN BILLING ALERT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Pengaturan Alert Tagihan Meta Ads
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Batas Penagihan Meta (Billing Threshold)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  {metaThreshold > 0
                    ? `Otomatis mengikuti ambang Meta saat ini: Rp ${metaThreshold.toLocaleString("id-ID")} (berubah dinamis sesuai Pengaturan Pembayaran Meta).`
                    : "Otomatis mengikuti Pengaturan Pembayaran Meta. Jika belum terbaca (misal akun prabayar), Anda dapat mengisi fallback manual di bawah."}
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(Number(e.target.value))}
                    step="50000"
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 mt-1.5">
                  {[250000, 500000, 1000000, 2500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTempThreshold(val)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                        tempThreshold === val
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          : "border-slate-200 dark:border-slate-700 text-slate-500"
                      }`}
                    >
                      Rp {(val / 1000).toLocaleString("id-ID")}k
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Tanggal penagihan bulanan Meta
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Meta menarik dana pada tanggal ini walaupun tagihan belum menyentuh ambang. Isi tanggal yang sama dengan Billing di Ads Manager.
                </p>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={tempBillDay || ""}
                  onChange={(e) => setTempBillDay(Number(e.target.value))}
                  placeholder="Mis. 15"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Ingatkan sebelum tanggal penagihan
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTempLeadDays(d)}
                      className={`py-2 rounded-xl font-bold text-xs border text-center ${
                        tempLeadDays === d
                          ? "bg-emerald-500 text-slate-950 border-emerald-500"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      H-{d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Email pengingat
                </label>
                <input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Notifikasi browser, Telegram, dan WhatsApp ikut terkirim bila tokennya sudah terpasang di Winning Engine.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Perkiraan jam menuju ambang (opsional)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  Notifikasi ke HP & Laptop akan berbunyi ketika estimasi waktu penarikan mencapai batas ini untuk memastikan saldo kartu debit sudah terisi.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 12].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setTempAlertHours(hrs)}
                      className={`py-2 rounded-xl font-bold text-xs border text-center transition-all ${
                        tempAlertHours === hrs
                          ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {hrs} Jam {hrs === 6 ? "(Default)" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Mencegah Akun Iklan Terblokir</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Meta menagih pada ambang nominal atau pada tanggal bulanan, mana yang lebih dulu. Peringatan gagal bayar hanya muncul jika Meta benar-benar menolak kartu. Tanggal dekat memberi tahu H-{tempLeadDays} supaya saldo kartu siap.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-sm"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

