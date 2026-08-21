"use client";
import { MessageCircle } from "lucide-react";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { openWhatsApp } from "@/lib/utils/whatsapp";

export function WhatsAppFloat() {
  const { settings } = useSettingsStore();

  if (!settings.waFloatEnabled) return null;

  const waNumber = settings.waNumber || "6281234567890";
  const message = settings.waDefaultMessage || "Halo, saya tertarik dengan Monefyi Estimator. Boleh minta info lebih lanjut?";

  return (
    <button
      onClick={() => openWhatsApp(waNumber, message)}
      className="fixed bottom-6 left-6 z-40 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110"
      aria-label="Chat WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
}
