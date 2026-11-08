import { MetaCapiStatus } from '../types/marketing';

async function sha256Hash(value: string): Promise<string> {
  const clean = value.trim().toLowerCase();
  const subtle =
    (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) ||
    (typeof window !== 'undefined' && window.crypto?.subtle);
  if (subtle) {
    const msgBuffer = new TextEncoder().encode(clean);
    const hashBuffer = await subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return '';
}

export interface CapiEventPayload {
  eventName: 'PageView' | 'ViewContent' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase';
  eventSourceUrl?: string;
  userData?: {
    email?: string;
    phone?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbp?: string;
    fbc?: string;
  };
  customData?: {
    currency?: string;
    value?: number;
    contentName?: string;
    contentIds?: string[];
    orderId?: string;
    bumpTaken?: boolean;
    ltv?: number;
    predicted_ltv?: number;
  };
}

export async function sendMetaCapiEvent(
  pixelId: string,
  capiAccessToken: string,
  event: CapiEventPayload
): Promise<{ success: boolean; eventsReceived?: number; error?: string }> {
  if (!pixelId || !capiAccessToken) {
    return { success: false, error: 'Pixel ID atau CAPI Access Token belum diisi' };
  }

  try {
    const hashedEmail = event.userData?.email ? await sha256Hash(event.userData.email) : undefined;
    let cleanPhone = (event.userData?.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
    const hashedPhone = cleanPhone ? await sha256Hash(cleanPhone) : undefined;

    const body = {
      data: [
        {
          event_name: event.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: event.eventSourceUrl || (typeof window !== 'undefined' ? window.location.href : 'https://estimator.monefyi.com'),
          user_data: {
            em: hashedEmail ? [hashedEmail] : undefined,
            ph: hashedPhone ? [hashedPhone] : undefined,
            client_ip_address: event.userData?.clientIpAddress,
            client_user_agent: event.userData?.clientUserAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
            fbp: event.userData?.fbp,
            fbc: event.userData?.fbc,
          },
          custom_data: event.customData,
        },
      ],
      access_token: capiAccessToken,
    };

    const res = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || 'Gagal mengirim event CAPI' };
    }

    return { success: true, eventsReceived: data.events_received };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error CAPI' };
  }
}

export function getMockCapiStatus(pixelId: string = '1530674178146899'): MetaCapiStatus {
  return {
    connected: true,
    pixelId,
    eventMatchQuality: 8.6,
    serverEvents24h: 342,
    browserEvents24h: 310,
    redundancyRate: 98.4,
    lastEventTime: new Date(Date.now() - 1000 * 60 * 4).toLocaleTimeString('id-ID'),
  };
}

