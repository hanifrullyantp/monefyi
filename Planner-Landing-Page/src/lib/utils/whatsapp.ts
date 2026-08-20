// WhatsApp utilities

export function buildWAUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

export function formatWAMessage(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export function openWA(phone: string, message: string): void {
  const url = buildWAUrl(phone, message);
  window.open(url, "_blank");
}
