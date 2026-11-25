import type { SupabaseClient } from "@supabase/supabase-js";

interface CapacitorFirebaseMessagingPlugin {
  requestPermissions: () => Promise<{ receive: string }>;
  getToken: () => Promise<{ token: string }>;
  createChannel?: (opts: {
    id: string;
    name: string;
    description?: string;
    importance?: number;
    visibility?: number;
  }) => Promise<void>;
  addListener?: (
    event: string,
    cb: (data: any) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
}

function getOrCreateDeviceId(): string {
  const key = "froyek_android_device_id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, next);
    return next;
  } catch {
    return "android-default-device";
  }
}

let registeredForUser: string | null = null;

/**
 * Inisialisasi FCM native hanya saat berjalan di dalam APK Capacitor Android.
 * Tidak mengubah perilaku web desktop / iOS PWA sama sekali.
 */
export async function initFcmNativePush(
  userId: string | null | undefined,
  supabase: SupabaseClient | null,
): Promise<void> {
  if (typeof window === "undefined" || !userId || !supabase) return;
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== "android") return;
  if (registeredForUser === userId) return;

  const fm: CapacitorFirebaseMessagingPlugin | undefined =
    cap.Plugins?.FirebaseMessaging;
  if (!fm) return;

  registeredForUser = userId;
  const deviceId = getOrCreateDeviceId();

  const upsertToken = async (token: string) => {
    if (!token) return;
    await supabase
      .from("froyek_fcm_tokens")
      .upsert(
        {
          user_id: userId,
          device_id: deviceId,
          token,
          platform: "android",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,device_id" },
      )
      .then(() => undefined, () => undefined);
  };

  try {
    const perm = await fm.requestPermissions();
    if (perm?.receive !== "granted") return;

    await fm
      .createChannel?.({
        id: "froyek_high_priority",
        name: "Notifikasi Penting Froyek",
        description: "Notifikasi real-time Froyek",
        importance: 4,
        visibility: 1,
      })
      .catch(() => undefined);

    const { token } = await fm.getToken();
    if (token) await upsertToken(token);

    fm.addListener?.("tokenReceived", (ev: { token?: string }) => {
      if (ev?.token) void upsertToken(ev.token);
    }).catch(() => undefined);

    fm.addListener?.("notificationActionPerformed", (ev: any) => {
      const targetUrl = ev?.notification?.data?.url;
      if (typeof targetUrl === "string" && targetUrl.startsWith("/")) {
        window.location.assign(targetUrl);
      }
    }).catch(() => undefined);
  } catch {
    // Abaikan kegagalan inisialisasi agar tidak mengganggu alur login
  }
}

