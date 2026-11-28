import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initFcmNativePush, resetFcmNativeRegistrationForTests } from './fcmNative';

describe('fcmNative (Capacitor Android guard)', () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;

  beforeEach(() => {
    resetFcmNativeRegistrationForTests();
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
  });

  afterEach(() => {
    (globalThis as any).window = originalWindow;
    (globalThis as any).localStorage = originalLocalStorage;
  });

  it('tidak mengaktifkan FirebaseMessaging di browser web biasa (non-native)', async () => {
    const requestPermissions = vi.fn();
    const upsert = vi.fn();
    (globalThis as any).window = {
      Capacitor: {
        isNativePlatform: () => false,
        getPlatform: () => 'web',
        Plugins: {
          FirebaseMessaging: { requestPermissions },
        },
      },
    };

    const fakeSupabase = {
      from: () => ({ upsert }),
    } as any;

    await initFcmNativePush('user-web-1', fakeSupabase);

    expect(requestPermissions).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('mengaktifkan FirebaseMessaging dan menyimpan token hanya pada Capacitor Android native', async () => {
    const requestPermissions = vi.fn(async () => ({ receive: 'granted' }));
    const createChannel = vi.fn(async () => undefined);
    const getToken = vi.fn(async () => ({ token: 'fcm-token-android-123' }));
    const addListener = vi.fn(async () => ({ remove: async () => undefined }));
    const upsert = vi.fn(async () => ({ error: null }));
    const from = vi.fn(() => ({ upsert }));

    (globalThis as any).window = {
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => 'android',
        Plugins: {
          FirebaseMessaging: {
            requestPermissions,
            createChannel,
            getToken,
            addListener,
          },
        },
      },
    };

    await initFcmNativePush('user-android-1', { from } as any);

    expect(requestPermissions).toHaveBeenCalledTimes(1);
    expect(createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'froyek_high_priority', importance: 4 }),
    );
    expect(getToken).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('froyek_fcm_tokens');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-android-1',
        token: 'fcm-token-android-123',
        platform: 'android',
      }),
      { onConflict: 'user_id,device_id' },
    );
  });
});

