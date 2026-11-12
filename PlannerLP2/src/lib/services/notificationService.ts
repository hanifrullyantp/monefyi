/**
 * Notification Service for Monefyi Admin (Desktop & Mobile)
 * Supports:
 * - Native Web Notifications (Desktop macOS/Windows, Android Chrome WebAPK, iOS 16.4+ PWA)
 * - Service Worker showNotification()
 * - Web Audio API synthesized chimes (zero external audio file dependencies)
 * - In-app floating toast alerts
 * - Local storage history
 */

export type NotificationType = "closing" | "lead" | "api_alert" | "urgent_action";

export interface AdminNotificationPayload {
  id?: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  timestamp?: number;
  read?: boolean;
}

const STORAGE_KEY = "monefyi_admin_notifications_log";
const SOUND_SETTING_KEY = "monefyi_admin_sound_enabled";

// Inisialisasi AudioContext secara aman di browser
let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * 1. Web Audio API Synthesizers: Suara notifikasi jernih & instan tanpa lag network
 */
export function playNotificationSound(type: NotificationType) {
  if (typeof window === "undefined") return;
  // Periksa apakah admin mematikan suara notifikasi
  const soundEnabled = localStorage.getItem(SOUND_SETTING_KEY) !== "false";
  if (!soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === "closing") {
      // Suara Sukses / Closing (Arpeggio naik ceria: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz))
      const tones = [523.25, 659.25, 783.99, 1046.5];
      tones.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    } else if (type === "api_alert" || type === "urgent_action") {
      // Suara Alert / Warning (Dual tone tegas: A4 (440Hz) -> D5 (587Hz) cepat)
      const freqs = [440, 587.33, 440, 587.33];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.35, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.16);
      });
    } else {
      // Suara Pesan / Lead Baru (Pops lembut: E5 (659Hz) -> A5 (880Hz))
      const freqs = [659.25, 880];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.22);
      });
    }
  } catch (err) {
    console.warn("[notificationSound] AudioContext error:", err);
  }
}

/**
 * 2. Cek apakah Web Notification didukung browser
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * 3. Ambil status permission browser saat ini
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

/**
 * 4. Minta izin notifikasi ke browser / HP
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn("[notification] Permission request failed:", err);
    return Notification.permission;
  }
}

/**
 * 5. Simpan notifikasi ke local history
 */
export function getSavedNotifications(): AdminNotificationPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotification(notif: AdminNotificationPayload) {
  if (typeof window === "undefined") return;
  try {
    const existing = getSavedNotifications();
    const updated = [notif, ...existing.filter((n) => n.id !== notif.id)].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("monefyi-notifications-changed", { detail: updated }));
  } catch (e) {
    console.warn("[saveNotification] Storage error:", e);
  }
}

export function markNotificationsAsRead() {
  if (typeof window === "undefined") return;
  try {
    const existing = getSavedNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent("monefyi-notifications-changed", { detail: existing }));
  } catch (e) {
    console.warn("[markNotificationsAsRead] Storage error:", e);
  }
}

export function clearAllNotifications() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("monefyi-notifications-changed", { detail: [] }));
  } catch (e) {
    console.warn("[clearAllNotifications] Storage error:", e);
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_SETTING_KEY) !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_SETTING_KEY, enabled ? "true" : "false");
}

/**
 * 6. Kirim Notifikasi Native ke HP & Laptop + In-App Toast
 */
export async function sendAdminNotification(payload: AdminNotificationPayload) {
  if (typeof window === "undefined") return;

  const item: AdminNotificationPayload = {
    id: payload.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    url: payload.url || "/admin",
    icon: payload.icon || "/brand/admin/icon-192.png",
    timestamp: payload.timestamp || Date.now(),
    read: false,
  };

  // 1. Simpan ke local history
  saveNotification(item);

  // 2. Mainkan suara AudioContext
  playNotificationSound(item.type);

  // 3. Picu In-App Toast visual di sudut layar
  window.dispatchEvent(new CustomEvent("admin-in-app-toast", { detail: item }));

  // 4. Kirim Native System Notification (HP / Laptop) jika izin sudah granted
  if (isNotificationSupported() && Notification.permission === "granted") {
    try {
      // Prioritaskan lewat Service Worker registration (paling stabil untuk Android PWA & Desktop)
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && "showNotification" in reg) {
          await (reg as any).showNotification(item.title, {
            body: item.body,
            icon: item.icon,
            badge: "/brand/admin/icon-192.png",
            vibrate: [200, 100, 200, 100, 200],
            tag: `monefyi-${item.type}`,
            renotify: true,
            data: {
              url: item.url,
            },
          });
          return;
        }
      }

      // Fallback ke Notification API standar
      const n = new Notification(item.title, {
        body: item.body,
        icon: item.icon,
        tag: `monefyi-${item.type}`,
      });
      n.onclick = () => {
        window.focus();
        if (item.url && window.location.pathname !== item.url) {
          window.location.href = item.url;
        }
      };
    } catch (err) {
      console.warn("[sendAdminNotification] System notification error:", err);
    }
  }
}
