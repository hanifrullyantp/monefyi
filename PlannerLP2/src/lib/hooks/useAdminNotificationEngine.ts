"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AdminNotificationPayload,
  NotificationType,
  getNotificationPermission,
  requestNotificationPermission,
  getSavedNotifications,
  markNotificationsAsRead,
  clearAllNotifications,
  isSoundEnabled,
  setSoundEnabled,
  sendAdminNotification,
  playNotificationSound,
} from "@/lib/services/notificationService";

export function useAdminNotificationEngine() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [notifications, setNotifications] = useState<AdminNotificationPayload[]>([]);
  const [soundActive, setSoundActive] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  // Cache state sebelumnya untuk deteksi perubahan baru
  const knownLeadIdsRef = useRef<Set<string>>(new Set());
  const knownClosingIdsRef = useRef<Set<string>>(new Set());
  const prevHealthRef = useRef<{
    mayar: boolean;
    meta: boolean;
    wa: boolean;
  }>({ mayar: true, meta: true, wa: true });
  const isFirstRunRef = useRef<boolean>(true);

  // Sync state notifikasi dari local storage
  const syncLocalNotifications = useCallback(() => {
    const list = getSavedNotifications();
    setNotifications(list);
    setSoundActive(isSoundEnabled());
    setPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    syncLocalNotifications();

    const handleStorageChange = () => {
      syncLocalNotifications();
    };

    window.addEventListener("monefyi-notifications-changed", handleStorageChange);
    return () => {
      window.removeEventListener("monefyi-notifications-changed", handleStorageChange);
    };
  }, [syncLocalNotifications]);

  // Request permission
  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    if (perm === "granted") {
      await sendAdminNotification({
        type: "closing",
        title: "🔔 Notifikasi Berhasil Diaktifkan!",
        body: "Anda akan menerima notif instan di HP & Laptop saat ada closing, leads baru, dan alert API penting.",
        url: "/admin",
      });
    }
    return perm;
  };

  // Toggle suara notifikasi
  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
    if (next) {
      playNotificationSound("closing");
    }
  };

  // 1. Cek status Health Integrasi (API Terputus)
  const checkHealthIntegrations = async () => {
    try {
      const res = await fetch("/api/health/integrations", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const integrations = data?.integrations;
      if (!integrations) return;

      const currentMayar = Boolean(integrations.mayar?.connected);
      const currentMeta = Boolean(integrations.meta?.connected);
      const currentWa = Boolean(integrations.wa?.connected);

      // Jangan notif di startup pertama jika sudah terputus dari awal, kecuali berubah
      if (!isFirstRunRef.current) {
        // Mayar terputus
        if (prevHealthRef.current.mayar && !currentMayar) {
          sendAdminNotification({
            type: "api_alert",
            title: "⚠️ ALERT: API Mayar Terputus!",
            body: `Koneksi payment gateway Mayar gagal: ${integrations.mayar?.message || "Unauthorized"}. Pembayaran klien terganggu!`,
            url: "/admin/pricing",
          });
        }

        // Meta Ads terputus
        if (prevHealthRef.current.meta && !currentMeta) {
          sendAdminNotification({
            type: "api_alert",
            title: "⚠️ ALERT: API Meta Ads Terputus!",
            body: `Token Meta kedaluwarsa: ${integrations.meta?.message || "Invalid"}. Iklan tidak dapat dipantau!`,
            url: "/admin/marketing",
          });
        }

        // WhatsApp bot terputus
        if (prevHealthRef.current.wa && !currentWa) {
          sendAdminNotification({
            type: "api_alert",
            title: "⚠️ ALERT: Bot WhatsApp Terputus!",
            body: `Token WhatsApp tidak aktif. Pesan follow-up otomatis ke calon klien terhenti!`,
            url: "/admin/whatsapp",
          });
        }
      }

      // Update ref
      prevHealthRef.current = {
        mayar: currentMayar,
        meta: currentMeta,
        wa: currentWa,
      };
    } catch (e) {
      console.warn("[notifEngine] Health check warn:", e);
    }
  };

  // 2. Cek Leads & Closing Baru dari /api/crm/lead
  const checkCrmLeads = async () => {
    try {
      const res = await fetch("/api/crm/lead", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const leads: any[] = json?.data || [];

      if (!Array.isArray(leads) || leads.length === 0) return;

      if (isFirstRunRef.current) {
        // Seed set dengan data saat ini agar tidak spam notif semua order lama saat load
        leads.forEach((l) => {
          const lid = String(l.id || l.sessionId);
          if (l.status === "won" || l.status === "paid") {
            knownClosingIdsRef.current.add(lid);
          }
          knownLeadIdsRef.current.add(lid);
        });
        return;
      }

      for (const lead of leads) {
        const lid = String(lead.id || lead.sessionId);
        const name = lead.fullName || lead.name || "Calon Klien";
        const phone = lead.phone || lead.cleanPhone || "-";
        const amount = Number(lead.grandTotal || lead.estimatedValue || lead.amount || 0);
        const tier = lead.planTier || lead.productTitle || "Monefyi Estimator";
        const isClosing = lead.status === "won" || lead.status === "paid";

        // Deteksi Closing Masuk baru
        if (isClosing && !knownClosingIdsRef.current.has(lid)) {
          knownClosingIdsRef.current.add(lid);
          knownLeadIdsRef.current.add(lid);

          const formattedAmount = amount > 0 ? `Rp ${amount.toLocaleString("id-ID")}` : "Paket";
          sendAdminNotification({
            type: "closing",
            title: `💰 CLOSING MASUK! ${formattedAmount}`,
            body: `${name} (${phone}) telah menyelesaikan pembayaran ${tier}. Klik untuk buka CRM.`,
            url: "/admin/crm",
          });
          continue;
        }

        // Deteksi Lead Baru Masuk
        if (!isClosing && !knownLeadIdsRef.current.has(lid)) {
          knownLeadIdsRef.current.add(lid);
          sendAdminNotification({
            type: "lead",
            title: `📩 Pesan Lead Masuk: ${name}`,
            body: `No WA: ${phone}. Mengisi penawaran (${tier}) di landing page. Klik untuk segera follow-up.`,
            url: "/admin/crm",
          });
        }
      }
    } catch (e) {
      console.warn("[notifEngine] CRM check warn:", e);
    }
  };

  // Poll loop: jalankan setiap 25 detik
  useEffect(() => {
    let mounted = true;

    const runPoll = async () => {
      if (!mounted) return;
      setIsPolling(true);
      await Promise.allSettled([checkHealthIntegrations(), checkCrmLeads()]);
      isFirstRunRef.current = false;
      setIsPolling(false);
    };

    // Jalankan segera saat mount
    runPoll();

    // Recurring poll
    const interval = setInterval(runPoll, 25000);

    // Jalankan juga saat tab window kembali fokus
    const handleFocus = () => {
      runPoll();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Helper tester untuk demonstrasi & verifikasi instan
  const testClosing = async () => {
    await sendAdminNotification({
      type: "closing",
      title: "💰 [TES] CLOSING MASUK! Rp 149.000",
      body: "Budi Pratama (08123456789) baru saja membayar Paket Standard Lifetime. Transaksi Mayar Terverifikasi!",
      url: "/admin/crm",
    });
  };

  const testLead = async () => {
    await sendAdminNotification({
      type: "lead",
      title: "📩 [TES] Pesan Lead Baru: Ahmad Sanjaya",
      body: "No WA: 082198765432. Mengisi formulir survei RAB Kitchen Set di landing page.",
      url: "/admin/crm",
    });
  };

  const testApiAlert = async () => {
    await sendAdminNotification({
      type: "api_alert",
      title: "⚠️ [TES] ALERT: API Mayar Terputus!",
      body: "HTTP 401 Unauthorized: API Key Mayar tidak valid atau terputus. Klik untuk hubungkan kembali.",
      url: "/admin/pricing",
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    permission,
    requestPermission: handleRequestPermission,
    notifications,
    unreadCount,
    markAllAsRead: markNotificationsAsRead,
    clearAll: clearAllNotifications,
    soundActive,
    toggleSound,
    isPolling,
    testClosing,
    testLead,
    testApiAlert,
  };
}

