export type OutboundMessage = {
  chatId: string;
  text: string;
  buttons?: string[];
};

export type ParsedUpdate = {
  updateId: number;
  telegramUserId: string;
  chatId: string;
  type: 'text' | 'button' | 'photo' | 'voice';
  text: string;
  fileId: string | null;
  callbackId: string | null;
};

export type Transport = (message: OutboundMessage) => Promise<{ ok: true } | { ok: false; error: string }>;

export interface ChannelProvider {
  id: 'telegram' | 'whatsapp_cloud' | 'mock';
  send(message: OutboundMessage): Promise<{ ok: true } | { ok: false; error: string }>;
  parseUpdate(body: unknown): ParsedUpdate | null;
  status(): { provider: string; configured: boolean };
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseTelegramUpdate(body: unknown): ParsedUpdate | null {
  const root = record(body);
  if (!root || typeof root.update_id !== 'number') return null;
  const callback = record(root.callback_query);
  if (callback) {
    const from = record(callback.from);
    const message = record(callback.message);
    const chat = record(message?.chat);
    if (!from || typeof from.id !== 'number' || !chat || typeof chat.id !== 'number') return null;
    return {
      updateId: root.update_id,
      telegramUserId: String(from.id),
      chatId: String(chat.id),
      type: 'button',
      text: typeof callback.data === 'string' ? callback.data : '',
      fileId: null,
      callbackId: typeof callback.id === 'string' ? callback.id : null,
    };
  }
  const message = record(root.message);
  if (!message) return null;
  const from = record(message.from);
  const chat = record(message.chat);
  if (!from || typeof from.id !== 'number' || !chat || typeof chat.id !== 'number') return null;
  const base = {
    updateId: root.update_id,
    telegramUserId: String(from.id),
    chatId: String(chat.id),
    callbackId: null,
  };
  const photos = Array.isArray(message.photo) ? message.photo : [];
  const photo = record(photos[photos.length - 1]);
  if (photo && typeof photo.file_id === 'string') {
    return { ...base, type: 'photo', text: typeof message.caption === 'string' ? message.caption : '', fileId: photo.file_id };
  }
  const voice = record(message.voice);
  if (voice && typeof voice.file_id === 'string') {
    return { ...base, type: 'voice', text: '', fileId: voice.file_id };
  }
  return { ...base, type: 'text', text: typeof message.text === 'string' ? message.text : '', fileId: null };
}

export function createTelegramProvider(input: { configured: boolean; transport: Transport }): ChannelProvider {
  return {
    id: 'telegram',
    send: (message) => input.transport(message),
    parseUpdate: parseTelegramUpdate,
    status: () => ({ provider: 'telegram', configured: input.configured }),
  };
}

export function createMockProvider(sent: OutboundMessage[] = []): ChannelProvider {
  return {
    id: 'mock',
    async send(message) {
      sent.push(message);
      return { ok: true };
    },
    parseUpdate: parseTelegramUpdate,
    status: () => ({ provider: 'mock', configured: true }),
  };
}

export function createChannelProvider(kind: 'telegram' | 'mock', input: { configured: boolean; transport: Transport; sent?: OutboundMessage[] }): ChannelProvider {
  if (kind === 'mock') return createMockProvider(input.sent);
  return createTelegramProvider(input);
}

export async function deliver(provider: ChannelProvider, message: OutboundMessage) {
  return provider.send(message);
}

export async function downloadTelegramFile(token: string, fileId: string, fetchImpl: typeof fetch = fetch): Promise<Uint8Array | null> {
  try {
    const metaRes = await fetchImpl(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
    if (!metaRes.ok) return null;
    const meta = await metaRes.json() as { ok?: boolean; result?: { file_path?: string } };
    const filePath = meta.result?.file_path;
    if (!meta.ok || !filePath) return null;
    const fileRes = await fetchImpl(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!fileRes.ok) return null;
    return new Uint8Array(await fileRes.arrayBuffer());
  } catch {
    return null;
  }
}

export async function telegramSend(token: string, message: OutboundMessage, fetchImpl: typeof fetch = fetch): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chatId,
        text: message.text,
        reply_markup: message.buttons
          ? { inline_keyboard: [message.buttons.map((label) => ({ text: label, callback_data: label }))] }
          : undefined,
      }),
    });
    if (!res.ok) return { ok: false, error: 'kirim_gagal' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'kirim_gagal' };
  }
}

export async function connectWebhook(token: string, webhookUrl: string, secret: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ['message', 'callback_query'],
      }),
    });
    if (!res.ok) return false;
    const body = await res.json() as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  }
}

export async function acknowledgeCallback(token: string, callbackId: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  try {
    await fetchImpl(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId }),
    });
  } catch {
    // Tombol tetap tercatat dari callback yang sudah diterima.
  }
}
