// WhatsApp utility functions

export function formatWhatsAppPhone(phone: string): string {
  const clean = (phone || "").replace(/[^0-9]/g, "");
  if (!clean) return "";
  if (clean.startsWith("62")) return clean;
  if (clean.startsWith("0")) return `62${clean.slice(1)}`;
  return `62${clean}`;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export function openWhatsApp(phone: string, message: string): void {
  const url = buildWhatsAppUrl(phone, message);
  if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}
