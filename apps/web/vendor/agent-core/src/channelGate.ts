import { structuredError, type StructuredError } from '../../packages/domain/src/errors.ts';

export type ChannelRole = 'worker' | 'manager' | 'owner';

export type LinkCodeRecord = {
  hash: string;
  userId: string;
  orgId: string;
  role: ChannelRole;
  expiresAt: number;
  used: boolean;
};

export type ChannelIdentity = {
  telegramUserId: string;
  userId: string;
  orgId: string;
  role: ChannelRole;
  verifiedAt: number;
};

export const LINK_TTL_MS = 10 * 60 * 1000;
export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 10 * 60 * 1000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const OUTBOUND_PURPOSES = ['send_progress_question', 'remind_progress', 'notify_owner', 'ask_photo'] as const;
export type OutboundPurpose = (typeof OUTBOUND_PURPOSES)[number];

function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function secretsMatch(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let diff = a.length === b.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return diff === 0;
}

export function guardWebhook(headerSecret: string | null, expectedSecret: string): { status: 200 | 401 } {
  if (!expectedSecret || !headerSecret || !secretsMatch(headerSecret, expectedSecret)) return { status: 401 };
  return { status: 200 };
}

export function receiveWebhook(input: {
  headerSecret: string | null;
  expectedSecret: string;
  readBody: () => { updateId: number | null };
  seen: ReadonlySet<number>;
}): { status: 200 | 401; enqueue: boolean } {
  const guard = guardWebhook(input.headerSecret, input.expectedSecret);
  if (guard.status === 401) return { status: 401, enqueue: false };
  const body = input.readBody();
  if (body.updateId == null || input.seen.has(body.updateId)) return { status: 200, enqueue: false };
  return { status: 200, enqueue: true };
}

export async function issueLinkCode(input: {
  userId: string;
  orgId: string;
  role: ChannelRole;
  now: number;
}): Promise<{ code: string; record: LinkCodeRecord }> {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return {
    code,
    record: {
      hash: await sha256Hex(code),
      userId: input.userId,
      orgId: input.orgId,
      role: input.role,
      expiresAt: input.now + LINK_TTL_MS,
      used: false,
    },
  };
}

export async function redeemLinkCode(
  record: LinkCodeRecord,
  code: string,
  telegramUserId: string,
  now: number,
): Promise<{ ok: true; identity: ChannelIdentity; record: LinkCodeRecord } | { ok: false; error: StructuredError }> {
  const hash = await sha256Hex(code.trim());
  if (record.used || !secretsMatch(hash, record.hash)) {
    return { ok: false, error: structuredError('kode_tidak_berlaku', 'Minta kode baru di aplikasi.', []) };
  }
  if (now > record.expiresAt) {
    return { ok: false, error: structuredError('kode_kedaluwarsa', 'Kode berlaku 10 menit. Minta kode baru.', []) };
  }
  return {
    ok: true,
    record: { ...record, used: true },
    identity: {
      telegramUserId,
      userId: record.userId,
      orgId: record.orgId,
      role: record.role,
      verifiedAt: now,
    },
  };
}

export function intakeMessage(identity: ChannelIdentity | null, text: string):
  | { action: 'ignore'; summary: string; reachedAgent: false }
  | { action: 'data'; orgId: string; role: ChannelRole; text: string; reachedAgent: true } {
  const summary = text.replace(/\s+/g, ' ').trim().slice(0, 160);
  if (!identity) return { action: 'ignore', summary, reachedAgent: false };
  return { action: 'data', orgId: identity.orgId, role: identity.role, text, reachedAgent: true };
}

export function maySend(input: {
  verified: boolean;
  killSwitch: boolean;
  purpose: string;
}): { ok: true } | { ok: false; error: StructuredError } {
  if (input.killSwitch) return { ok: false, error: structuredError('agen_dimatikan', 'Pemilik mematikan agen organisasi ini.', []) };
  if (!input.verified) return { ok: false, error: structuredError('akun_belum_tertaut', 'Pesan hanya ke akun yang menautkan diri.', []) };
  if (!OUTBOUND_PURPOSES.includes(input.purpose as OutboundPurpose)) {
    return { ok: false, error: structuredError('di_luar_sop', 'Agen hanya mengirim pesan yang ada di SOP.', [...OUTBOUND_PURPOSES]) };
  }
  return { ok: true };
}

export function allowMessage(timestamps: number[], now: number, limit = RATE_LIMIT, windowMs = RATE_WINDOW_MS): boolean {
  const recent = timestamps.filter((stamp) => now - stamp >= 0 && now - stamp < windowMs).length;
  return recent < limit;
}

export async function sealSecret(plain: string, key: string): Promise<string> {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const cryptoKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(plain));
  return `${bytesToB64(iv)}.${bytesToB64(new Uint8Array(cipher))}`;
}

export async function openSecret(sealed: string, key: string): Promise<string> {
  const [ivPart, cipherPart] = sealed.split('.');
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const cryptoKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(ivPart) as unknown as BufferSource },
    cryptoKey,
    b64ToBytes(cipherPart) as unknown as BufferSource
  );
  return new TextDecoder().decode(plain);
}

export function redactSecrets(text: string, secrets: string[]): string {
  let output = text;
  for (const secret of secrets) {
    if (secret.length >= 8) output = output.split(secret).join('[rahasia]');
  }
  return output;
}

export function commitFromChat(): { ok: false; error: StructuredError } {
  return { ok: false, error: structuredError('perlu_persetujuan_aplikasi', 'Setujui di aplikasi. Chat tidak menyimpan perubahan.', []) };
}
