/**
 * Opens WhatsApp with a pre-filled message for guest CRM.
 */
export function openWhatsAppMessage(phone: string, message: string): void {
  const normalized = phone.replace(/\D/g, '');
  const intl = normalized.startsWith('0') ? `62${normalized.slice(1)}` : normalized;
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function buildSurveyMessage(
  guestName: string,
  bookingCode: string,
  surveyUrl: string
): string {
  return `Halo ${guestName}! Terima kasih sudah menginap di properti kami. Kode booking: ${bookingCode}. Lengkapi data Anda di sini untuk dapat DISKON 10%: ${surveyUrl}`;
}

export function buildBookingConfirmationMessage(
  guestName: string,
  bookingCode: string,
  checkIn: string,
  roomNumber: string
): string {
  return `Halo ${guestName}! Booking Anda ${bookingCode} telah dikonfirmasi. Check-in: ${checkIn}, Kamar ${roomNumber}. Sampai jumpa!`;
}
