import { supabase } from '../lib/supabase';
import { signOutGlobal } from './authService';

const SESSION_TOKEN_KEY = 'monefyi_active_device_session_v1';
const KICKOUT_REASON_KEY = 'monefyi_logout_reason';

/**
 * Mendapatkan atau membuat token sesi unik untuk perangkat saat ini di browser ini.
 */
export function getLocalDeviceSessionToken(): string {
  let token = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Daftarkan sesi perangkat saat ini ke profiles.settings di Supabase.
 * Menggantikan sesi perangkat sebelumnya (jika ada).
 */
export async function registerActiveDeviceSession(userId: string): Promise<string> {
  const currentToken = getLocalDeviceSessionToken();
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', userId)
      .maybeSingle();

    const existingSettings = (profile?.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...existingSettings,
      active_device_session: currentToken,
      last_device_login_at: new Date().toISOString(),
      last_device_info: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 120) : 'Web Client',
    };

    await supabase
      .from('profiles')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return currentToken;
  } catch (err) {
    console.warn('[SingleDeviceSession] Register error:', err);
    return currentToken;
  }
}

/**
 * Memulai pengawasan aktif (watcher) agar 1 akun hanya login di 1 perangkat.
 * Jika perangkat lain login, perangkat ini akan otomatis mendeteksi dan logout.
 */
export function startSingleDeviceWatcher(
  userId: string,
  onConflictDetected: (message: string) => void
): () => void {
  const localToken = getLocalDeviceSessionToken();
  let isStopped = false;

  const checkRemoteSession = async () => {
    if (isStopped) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .maybeSingle();

      const remoteSettings = profile?.settings as Record<string, any> | undefined;
      const remoteToken = remoteSettings?.active_device_session;

      // Jika remote token ada dan berbeda dari token lokal perangkat ini, berarti ada login baru di perangkat lain
      if (remoteToken && remoteToken !== localToken) {
        handleConflict();
      }
    } catch (e) {
      // Ignore network hiccup
    }
  };

  const handleConflict = async () => {
    if (isStopped) return;
    isStopped = true;

    // Simpan tanda bahwa logout terjadi karena perangkat lain login
    try {
      sessionStorage.setItem(KICKOUT_REASON_KEY, 'single_device_conflict');
    } catch {
      // Ignore storage error
    }

    const message = 'Akun Anda sedang aktif di perangkat lain. Sistem hanya mengizinkan 1 perangkat aktif pada satu waktu demi keamanan.';
    onConflictDetected(message);

    try {
      await signOutGlobal();
    } catch {
      // Ignore signout error
    }

    if (typeof window !== 'undefined') {
      window.location.href = '/login?reason=other_device';
    }
  };

  // 1. Pengecekan berkala (Heartbeat setiap 20 detik)
  const intervalId = window.setInterval(checkRemoteSession, 20_000);

  // 2. Pengecekan saat tab kembali aktif (focus)
  const handleFocus = () => {
    void checkRemoteSession();
  };
  window.addEventListener('focus', handleFocus);

  // 3. Realtime subscription Supabase jika database mendukung
  const channel = supabase
    .channel(`single_device_${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const newSettings = (payload.new as any)?.settings;
        const newRemoteToken = newSettings?.active_device_session;
        if (newRemoteToken && newRemoteToken !== localToken) {
          handleConflict();
        }
      }
    )
    .subscribe();

  // Cleanup handler
  return () => {
    isStopped = true;
    window.clearInterval(intervalId);
    window.removeEventListener('focus', handleFocus);
    void supabase.removeChannel(channel);
  };
}

/**
 * Cek apakah user baru saja di-logout karena konflik perangkat.
 */
export function checkAndClearDeviceKickoutReason(): boolean {
  if (typeof window === 'undefined') return false;
  const reason = sessionStorage.getItem(KICKOUT_REASON_KEY);
  if (reason === 'single_device_conflict') {
    sessionStorage.removeItem(KICKOUT_REASON_KEY);
    return true;
  }
  return false;
}

