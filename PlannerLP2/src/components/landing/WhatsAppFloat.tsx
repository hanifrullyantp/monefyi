"use client";
import { MessageCircle } from "lucide-react";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { useLandingAdmin } from "@/lib/hooks/useLandingAdmin";
import { openWhatsApp } from "@/lib/utils/whatsapp";
import { cn } from "@/lib/utils/cn";

export function WhatsAppFloat() {
  const { settings } = useSettingsStore();
  const { isAdmin } = useLandingAdmin();

  if (!settings.waFloatEnabled) return null;

  const waNumber = settings.waNumber || "6281234567890";
  const message = settings.waDefaultMessage || "Halo, saya tertarik dengan Monefyi Estimator. Boleh minta info lebih lanjut?";

  return (
    <button
      onClick={() => openWhatsApp(waNumber, message)}
      className={cn(
        "fixed left-6 z-40 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 touch-manipulation",
        isAdmin ? "bottom-24 md:bottom-6" : "bottom-6",
      )}
      aria-label="Chat WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
}
