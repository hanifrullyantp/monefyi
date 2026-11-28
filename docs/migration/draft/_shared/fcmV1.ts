import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface FcmNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getFcmAccessToken(sa: FcmServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${claimSet}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(`OAuth2 FCM gagal: ${tokenJson.error_description || tokenJson.error || tokenRes.status}`);
  }
  return String(tokenJson.access_token);
}

function isUnregisteredError(errorBody: any): boolean {
  const details = Array.isArray(errorBody?.error?.details) ? errorBody.error.details : [];
  const hasUnregisteredCode = details.some(
    (d: any) => d?.errorCode === "UNREGISTERED" || d?.errorCode === "INVALID_ARGUMENT",
  );
  const status = String(errorBody?.error?.status || "");
  return hasUnregisteredCode || status === "NOT_FOUND";
}

export async function sendFcmV1Batch(
  supabase: SupabaseClient,
  sa: FcmServiceAccount,
  tokens: { id: string; token: string }[],
  payload: FcmNotificationPayload,
): Promise<{ sent: number; failed: number; removed: number }> {
  if (tokens.length === 0) return { sent: 0, failed: 0, removed: 0 };

  const accessToken = await getFcmAccessToken(sa);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  let sent = 0;
  let failed = 0;
  let removed = 0;

  for (const row of tokens) {
    const messagePayload = {
      message: {
        token: row.token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          url: payload.url || "/",
          ...(payload.tag ? { tag: payload.tag } : {}),
          ...(payload.data || {}),
        },
        android: {
          priority: "high",
          notification: {
            channel_id: "froyek_high_priority",
            sound: "default",
            default_vibrate_timings: true,
            ...(payload.tag ? { tag: payload.tag } : {}),
          },
        },
      },
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      });

      if (res.ok) {
        sent += 1;
        continue;
      }

      failed += 1;
      const errBody = await res.json().catch(() => ({}));
      if (isUnregisteredError(errBody)) {
        await supabase.from("froyek_fcm_tokens").delete().eq("id", row.id);
        removed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return { sent, failed, removed };
}

