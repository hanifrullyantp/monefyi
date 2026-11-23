"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const FreeTrialPopup = dynamic(
  () => import("@/components/landing/FreeTrialPopup").then((m) => m.FreeTrialPopup),
  { ssr: false }
);
const ToastNotification = dynamic(
  () => import("@/components/landing/ToastNotification").then((m) => m.ToastNotification),
  { ssr: false }
);
const FloatingCTA = dynamic(
  () => import("@/components/landing/FloatingCTA").then((m) => m.FloatingCTA),
  { ssr: false }
);
const ScrollProgress = dynamic(
  () => import("@/components/landing/ScrollProgress").then((m) => m.ScrollProgress),
  { ssr: false }
);
const BackToTop = dynamic(
  () => import("@/components/landing/BackToTop").then((m) => m.BackToTop),
  { ssr: false }
);
const LiveChatWidget = dynamic(
  () => import("@/components/landing/LiveChatWidget").then((m) => m.LiveChatWidget),
  { ssr: false }
);
const WhatsAppFloat = dynamic(
  () => import("@/components/landing/WhatsAppFloat").then((m) => m.WhatsAppFloat),
  { ssr: false }
);
const EstimatorPwaInstallPrompt = dynamic(
  () =>
    import("@/components/landing/EstimatorPwaInstallPrompt").then(
      (m) => m.EstimatorPwaInstallPrompt
    ),
  { ssr: false }
);
const MobileAdminToolbar = dynamic(
  () => import("@/components/landing/MobileAdminToolbar").then((m) => m.MobileAdminToolbar),
  { ssr: false }
);
const AdminSaveNotice = dynamic(
  () => import("@/components/landing/AdminSaveNotice").then((m) => m.AdminSaveNotice),
  { ssr: false }
);

/**
 * Menunda hidrasi widget melayang (chat, toast, popup, scroll bar) hingga
 * thread utama selesai merender Hero Section (idle / interaksi pertama).
 * Menjaga TBT = 0ms untuk PageSpeed 100 & GTmetrix Grade A tanpa mengubah tampilan.
 */
export function DeferredLandingWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let activated = false;
    const activate = () => {
      if (activated) return;
      activated = true;
      setReady(true);
      cleanup();
    };

    const events = ["scroll", "pointerdown", "touchstart", "keydown", "mousemove"] as const;
    const cleanup = () => {
      for (const ev of events) {
        window.removeEventListener(ev, activate);
      }
    };

    for (const ev of events) {
      window.addEventListener(ev, activate, { once: true, passive: true });
    }

    const timer = window.setTimeout(activate, 1200);
    return () => {
      window.clearTimeout(timer);
      cleanup();
    };
  }, []);

  if (!ready) return null;

  return (
    <>
      <ScrollProgress />
      <AdminSaveNotice />
      <ToastNotification />
      <FloatingCTA />
      <BackToTop />
      <WhatsAppFloat />
      <LiveChatWidget />
      <EstimatorPwaInstallPrompt />
      <MobileAdminToolbar />
      <FreeTrialPopup />
    </>
  );
}

