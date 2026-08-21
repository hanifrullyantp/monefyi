// WhatsApp utility functions

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

export function openWhatsApp(phone: string, message: string): void {
  const url = buildWhatsAppUrl(phone, message);
  window.open(url, "_blank");
}
