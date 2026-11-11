"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CreditCard,
  Megaphone,
  MessageSquare,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  X,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Sun,
  Moon,
  CheckCircle2,
} from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { cn } from "@/lib/utils/cn";

interface IntegrationStatus {
  connected: boolean;
  name: string;
  message: string;
}

interface HealthResponse {
  ok: boolean;
  allConnected: boolean;
  integrations: {
    mayar: IntegrationStatus;
    meta: IntegrationStatus;
    wa: IntegrationStatus;
    ai: IntegrationStatus;
    timestamp: string;
  };
}

export function AdminTopBar({
  onOpenMobileSidebar,
}: {
  onOpenMobileSidebar?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminSidebarOpen = useUIStore((s) => s.isAdminSidebarOpen);
  const toggleAdminSidebar = useUIStore((s) => s.toggleAdminSidebar);
  const adminTheme = useUIStore((s) => s.adminTheme);
  const toggleAdminTheme = useUIStore((s) => s.toggleAdminTheme);

  const [loading, setLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [healthData, setHealthData] = useState<HealthResponse["integrations"]>({
    mayar: { connected: true, name: "Mayar", message: "Memeriksa..." },
    meta: { connected: true, name: "Meta Ads", message: "Memeriksa..." },
    wa: { connected: true, name: "WhatsApp", message: "Memeriksa..." },
    ai: { connected: true, name: "AI Engine", message: "Memeriksa..." },
    timestamp: new Date().toISOString(),
  });

  // Tentukan nama halaman berdasarkan rute aktif
  const getPageTitle = (path: string): string => {
    if (path === "/admin") return "Dashboard";
    if (path.startsWith("/admin/marketing")) return "Ads Manager";
    if (path.startsWith("/admin/crm-template")) return "Template WhatsApp";
    if (path.startsWith("/admin/crm")) return "CRM";
    if (path.startsWith("/admin/analytics")) return "Page Analytic";
    if (path.startsWith("/admin/settings")) return "Page Setup";
    if (path.startsWith("/admin/whatsapp")) return "Bot WhatsApp";
    if (path.startsWith("/admin/pricing")) return "Pricing & Gateway";
    if (path.startsWith("/admin/konten")) return "Konten Landing";
    if (path.startsWith("/admin/seo")) return "SEO & Tracking";
    return "Admin";
  };

  const pageTitle = getPageTitle(pathname);

  const checkIntegrations = async (triggerAlertOnFail = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/health/integrations");
      if (res.ok) {
        const data: HealthResponse = await res.json();
        if (data && data.integrations) {
          setHealthData(data.integrations);
          if (triggerAlertOnFail && !data.allConnected) {
            setShowWarningModal(true);
          }
        }
      }
    } catch (err) {
      console.warn("Failed checking integrations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIntegrations(false);
    const interval = setInterval(() => checkIntegrations(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const hasDisconnected =
    !healthData.mayar.connected ||
    !healthData.meta.connected ||
    !healthData.wa.connected ||
    !healthData.ai.connected;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center justify-between px-3.5 py-2.5 sm:px-6">
          {/* Sisi Kiri: Sidebar Toggle & Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu button */}
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={toggleAdminSidebar}
              className="hidden lg:flex p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isAdminSidebarOpen ? "Perkecil Sidebar" : "Perluas Sidebar"}
            >
              {isAdminSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {pageTitle}
              </h1>
              <span className="hidden md:inline-block text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Monefyi Enterprise
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Status Koneksi API (Warna ON / Abu OFF), Test Koneksi, Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Indikator Status API */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              {/* Mayar */}
              <button
                type="button"
                onClick={() => {
                  if (!healthData.mayar.connected) setShowWarningModal(true);
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all group relative",
                  healthData.mayar.connected
                    ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                )}
                title={`Mayar: ${healthData.mayar.connected ? "Terhubung (ON)" : "Terputus (OFF) - " + healthData.mayar.message}`}
              >
                <CreditCard className="w-4 h-4" />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                    healthData.mayar.connected ? "bg-emerald-500" : "bg-slate-400"
                  )}
                />
              </button>

              {/* Meta Ads */}
              <button
                type="button"
                onClick={() => {
                  if (!healthData.meta.connected) setShowWarningModal(true);
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all group relative",
                  healthData.meta.connected
                    ? "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                )}
                title={`Meta Ads: ${healthData.meta.connected ? "Terhubung (ON)" : "Terputus (OFF) - " + healthData.meta.message}`}
              >
                <Megaphone className="w-4 h-4" />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                    healthData.meta.connected ? "bg-blue-500" : "bg-slate-400"
                  )}
                />
              </button>

              {/* WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  if (!healthData.wa.connected) setShowWarningModal(true);
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all group relative",
                  healthData.wa.connected
                    ? "text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                )}
                title={`WhatsApp: ${healthData.wa.connected ? "Terhubung (ON)" : "Terputus (OFF) - " + healthData.wa.message}`}
              >
                <MessageSquare className="w-4 h-4" />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                    healthData.wa.connected ? "bg-emerald-500" : "bg-slate-400"
                  )}
                />
              </button>

              {/* AI Engine */}
              <button
                type="button"
                onClick={() => {
                  if (!healthData.ai.connected) setShowWarningModal(true);
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all group relative",
                  healthData.ai.connected
                    ? "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                    : "text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                )}
                title={`AI Engine: ${healthData.ai.connected ? "Terhubung (ON)" : "Terputus (OFF) - " + healthData.ai.message}`}
              >
                <Sparkles className="w-4 h-4" />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full",
                    healthData.ai.connected ? "bg-purple-500" : "bg-slate-400"
                  )}
                />
              </button>
            </div>

            {/* Tombol Test Koneksi */}
            <button
              type="button"
              onClick={() => checkIntegrations(true)}
              disabled={loading}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer",
                hasDisconnected
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
              title="Periksa koneksi seluruh API secara instan"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              <span className="hidden sm:inline">Test Koneksi</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleAdminTheme}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={adminTheme === "dark" ? "Mode Terang" : "Mode Gelap"}
            >
              {adminTheme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* POPUP PERINGATAN DISCONNECT */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-500">
                <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Peringatan Status API
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ada koneksi integrasi yang terputus atau belum aktif
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Mayar */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border text-xs",
                  healthData.mayar.connected
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-bold">Mayar Gateway</span>
                </div>
                <span className="font-semibold">{healthData.mayar.message}</span>
              </div>

              {/* Meta */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border text-xs",
                  healthData.meta.connected
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  <span className="font-bold">Meta Ads API</span>
                </div>
                <span className="font-semibold">{healthData.meta.message}</span>
              </div>

              {/* WA */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border text-xs",
                  healthData.wa.connected
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-bold">WhatsApp Bot</span>
                </div>
                <span className="font-semibold">{healthData.wa.message}</span>
              </div>

              {/* AI */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl border text-xs",
                  healthData.ai.connected
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-bold">AI Engine</span>
                </div>
                <span className="font-semibold">{healthData.ai.message}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowWarningModal(false);
                  router.push("/admin/settings");
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>Buka Page Setup</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => checkIntegrations(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

