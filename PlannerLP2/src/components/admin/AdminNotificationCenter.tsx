"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminNotificationEngine } from "@/lib/hooks/useAdminNotificationEngine";
import {
  Bell,
  Volume2,
  VolumeX,
  CheckCheck,
  Trash2,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Laptop,
} from "lucide-react";

export function AdminNotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const {
    permission,
    requestPermission,
    notifications,
    unreadCount,
    markAllAsRead,
    clearAll,
    soundActive,
    toggleSound,
    isPolling,
    testClosing,
    testLead,
    testApiAlert,
    testBillingAlert,
  } = useAdminNotificationEngine();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenPanel = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const isGranted = permission === "granted";

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleOpenPanel}
        aria-label="Pusat Notifikasi Admin"
        className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        title="Pusat Notifikasi HP & Laptop"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-slate-950 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 text-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Notifikasi Admin</span>
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-400">
                <Laptop className="w-3 h-3" />
                <Smartphone className="w-3 h-3" />
                {isGranted ? "Aktif" : "Mati"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title={soundActive ? "Matikan Suara Notif" : "Aktifkan Suara Notif"}
              >
                {soundActive ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Clear All */}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Hapus Semua Riwayat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Banner Izin Browser jika belum aktif */}
          {!isGranted && (
            <div className="p-3 bg-gradient-to-r from-amber-950/50 via-slate-900 to-indigo-950/50 border-b border-amber-500/20 text-xs">
              <div className="flex items-start gap-2 text-amber-300">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <div className="space-y-1.5">
                  <p className="font-semibold text-white">Aktifkan Notifikasi HP & Laptop</p>
                  <p className="text-[11px] text-slate-300">
                    Dapatkan alert instan saat ada closing masuk, pesan leads, dan jika API Mayar/Meta terputus.
                  </p>
                  <button
                    type="button"
                    onClick={requestPermission}
                    className="mt-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] transition-all cursor-pointer shadow-sm"
                  >
                    Izinkan Notifikasi Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Test Action Bar */}
          <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">Uji Coba Notif:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={testClosing}
                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                title="Simulasi Closing Baru Masuk"
              >
                + Closing
              </button>
              <button
                type="button"
                onClick={testLead}
                className="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold border border-indigo-500/30 transition-colors cursor-pointer"
                title="Simulasi Lead Baru Masuk"
              >
                + Lead
              </button>
              <button
                type="button"
                onClick={testApiAlert}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                title="Simulasi Alert API Terputus"
              >
                + Alert API
              </button>
              <button
                type="button"
                onClick={testBillingAlert}
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 transition-colors cursor-pointer"
                title="Simulasi Alert Penarikan Tagihan Meta Ads"
              >
                + Tagihan
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs space-y-1">
                <Bell className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                <p className="font-semibold text-slate-400">Belum ada notifikasi baru</p>
                <p className="text-[11px] text-slate-500">
                  Sistem sedang memantau transaksi, leads, dan status API.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isClosing = item.type === "closing";
                const isAlert = item.type === "api_alert" || item.type === "urgent_action";
                const isLead = item.type === "lead";

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.url) {
                        setIsOpen(false);
                        router.push(item.url);
                      }
                    }}
                    className={`p-3 text-xs hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start gap-2.5 ${
                      !item.read ? "bg-slate-800/20" : ""
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isClosing
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isAlert
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      }`}
                    >
                      {isClosing && <DollarSign className="w-4 h-4 font-black" />}
                      {isAlert && <AlertTriangle className="w-4 h-4" />}
                      {isLead && <MessageSquare className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white truncate">{item.title}</span>
                        {item.timestamp && (
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {new Date(item.timestamp).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-[11px] mt-0.5 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                      {item.url && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-400">
                          <span>Buka halaman</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-center">
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tandai Semua Sudah Dibaca</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

