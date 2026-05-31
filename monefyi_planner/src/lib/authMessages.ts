import type { AuthError } from '@supabase/supabase-js';

export function authUserMessage(err: AuthError | Error | null | undefined): string {
  if (!err) return 'Autentikasi gagal.';
  const msg = String('message' in err ? err.message : '');
  const code = 'code' in err ? String(err.code || '') : '';
  const status = 'status' in err ? String(err.status || '') : '';
  const low = `${msg} ${code} ${status}`.toLowerCase();

  if (low.includes('confirmation email') || low.includes('error sending confirmation')) {
    return 'Gagal mengirim email verifikasi. Coba lagi beberapa menit atau hubungi admin.';
  }
  if (low.includes('rate limit') || low.includes('over_email_send_rate_limit') || code === '429') {
    return 'Terlalu banyak permintaan email. Tunggu 5–10 menit lalu klik "Kirim ulang" atau coba lagi.';
  }
  if (low.includes('email_not_confirmed') || low.includes('email not confirmed')) {
    return 'Email belum diverifikasi. Nonaktifkan "Confirm email" di Supabase atau buka link verifikasi.';
  }
  if (
    low.includes('user_not_found') ||
    low.includes('invalid login') ||
    low.includes('invalid_credentials')
  ) {
    return `Email/password tidak cocok atau akun belum siap.${msg ? ` (${msg})` : ''}`;
  }
  if (low.includes('invalid_grant')) return `Server menolak login: ${msg || 'invalid_grant'}`;
  if (status === '400') return `Login ditolak (400): ${msg || 'bad request'}`;
  return msg || 'Autentikasi gagal.';
}
