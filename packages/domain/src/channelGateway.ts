import type { ActorRole } from './autonomyGovernance';
import { computeDeterministicSha256, detectPromptInjection } from './receiptExtraction';
import {
  prepareUnifiedAction,
  routeSingleDoorInput,
  type InputModality,
  type PrepareUnifiedActionResult,
  type PreparedActionStore,
  type RouteSingleDoorResult,
  type UnifiedDailyUsage,
  type UnifiedGatewayPolicy,
} from './unifiedAgentGateway';

export const CHANNEL_TYPES = [
  'telegram',
  'web_pwa',
  'whatsapp_unofficial',
  'whatsapp_official',
] as const;

export type ChannelType = (typeof CHANNEL_TYPES)[number];

export type ChannelIdentityBinding = {
  orgId: string;
  memberId: string;
  role: ActorRole;
  channelType: ChannelType;
  externalHandle: string;
  displayName?: string;
  optedOut?: boolean;
  isActive?: boolean;
};

export type ChannelMediaMetadata = {
  mediaAttachmentHash: string;
  mimeType: string;
  fileName?: string;
  fileSizeBytes?: number;
};

export type RawInboundChannelMessage = {
  channelType: ChannelType;
  externalHandle: string;
  externalMessageId: string;
  text?: string;
  modality?: InputModality;
  mediaAttachmentHash?: string;
  mimeType?: string;
  fileName?: string;
  fileSizeBytes?: number;
  media?: {
    attachmentHash?: string;
    mimeType?: string;
    fileName?: string;
    fileSizeBytes?: number;
  };
  projectHint?: string;
  receivedAtMs?: number;
  targetOrgId?: string;
};

export type OutboundChannelMessage = {
  orgId: string;
  recipientId: string;
  recipients: string[];
  channelType: ChannelType;
  content: string;
  questionKeys?: string[];
  media?: ChannelMediaMetadata;
  quickReplies?: string[];
};

export type FormattedOutboundPayload = {
  channelType: ChannelType;
  recipients: string[];
  body: string;
  media?: ChannelMediaMetadata;
  quickReplies?: string[];
  metadata: Record<string, unknown>;
};

export type ChannelSendResult =
  | {
      ok: true;
      channelType: ChannelType;
      recipients: string[];
      externalMessageId: string;
      sentAtMs: number;
    }
  | {
      ok: false;
      channelType: ChannelType;
      code:
        | 'mass_broadcast_forbidden'
        | 'empty_recipients'
        | 'media_not_supported'
        | 'transport_error';
      reason: string;
    };

export type UnofficialTosRiskDisclosure = {
  unofficialBridge: true;
  riskSummary: string;
  recommendedPilotNumberPolicy: string;
  officialMigrationTarget: 'whatsapp_official';
};

/**
 * Antarmuka pluggable saluran komunikasi (Telegram, Web/PWA, WhatsApp Non-Resmi, WhatsApp Resmi).
 * Menambah atau menukar implementasi saluran tidak mengubah logika agen maupun domain keuangan.
 */
export interface ChannelAdapter {
  readonly channelType: ChannelType;
  readonly supportsMedia: boolean;
  readonly maxRecipientsPerSend: number;
  readonly tosRiskDisclosure?: UnofficialTosRiskDisclosure;
  parseInbound(raw: unknown): RawInboundChannelMessage;
  formatOutbound(message: OutboundChannelMessage): FormattedOutboundPayload;
  send(outbound: FormattedOutboundPayload): ChannelSendResult;
}

export type ChannelTransportFn = (outbound: FormattedOutboundPayload) => {
  ok: boolean;
  externalMessageId?: string;
  error?: string;
};

export type ChannelAdapterOptions = {
  supportsMedia?: boolean;
  transport?: ChannelTransportFn;
  nowMs?: () => number;
};

function normalizeHandleDigits(raw: string): string {
  const stripped = String(raw ?? '')
    .trim()
    .replace(/@(?:c\.us|s\.whatsapp\.net)$/i, '')
    .replace(/[\s\-().+]/g, '');
  if (!stripped) return '';
  if (stripped.startsWith('08')) {
    return `62${stripped.slice(1)}`;
  }
  return stripped;
}

/**
 * Menormalkan identitas eksternal agar konsisten untuk pencocokan tenant.
 */
export function normalizeExternalHandle(channelType: ChannelType, externalHandle: string): string {
  const raw = String(externalHandle ?? '').trim();
  if (!raw) return '';
  if (channelType === 'whatsapp_unofficial' || channelType === 'whatsapp_official') {
    return normalizeHandleDigits(raw);
  }
  return raw.toLowerCase();
}

function extractMediaMeta(raw: RawInboundChannelMessage): ChannelMediaMetadata | undefined {
  const hash = String(raw.mediaAttachmentHash ?? raw.media?.attachmentHash ?? '').trim();
  const mimeType = String(raw.mimeType ?? raw.media?.mimeType ?? '').trim();
  if (!hash && !mimeType) return undefined;
  return {
    mediaAttachmentHash: hash || `sha256_meta_${computeDeterministicSha256(mimeType || 'media').slice(0, 16)}`,
    mimeType: mimeType || 'application/octet-stream',
    ...(raw.fileName ?? raw.media?.fileName ? { fileName: raw.fileName ?? raw.media?.fileName } : {}),
    ...(raw.fileSizeBytes ?? raw.media?.fileSizeBytes !== undefined
      ? { fileSizeBytes: raw.fileSizeBytes ?? raw.media?.fileSizeBytes }
      : {}),
  };
}

function inferModality(raw: RawInboundChannelMessage, media?: ChannelMediaMetadata): InputModality {
  if (raw.modality) return raw.modality;
  const mime = media?.mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('audio/') || mime.includes('ogg') || mime.includes('voice')) {
    return 'voice_transcript';
  }
  if (mime.startsWith('image/') || mime === 'application/pdf') {
    return 'photo_ocr';
  }
  return 'text';
}

function buildDefaultSend(
  channelType: ChannelType,
  supportsMedia: boolean,
  maxRecipientsPerSend: number,
  options?: ChannelAdapterOptions,
): (outbound: FormattedOutboundPayload) => ChannelSendResult {
  const nowFn = options?.nowMs ?? (() => Date.now());
  return (outbound: FormattedOutboundPayload): ChannelSendResult => {
    const recipients = (outbound.recipients ?? []).map((r) => String(r).trim()).filter(Boolean);
    if (recipients.length === 0) {
      return {
        ok: false,
        channelType,
        code: 'empty_recipients',
        reason: 'Penerima pesan keluar tidak boleh kosong.',
      };
    }
    if (recipients.length > maxRecipientsPerSend) {
      return {
        ok: false,
        channelType,
        code: 'mass_broadcast_forbidden',
        reason: `Broadcast massal ditolak pada saluran ${channelType}: maksimal ${maxRecipientsPerSend} penerima per kirim (diterima ${recipients.length}).`,
      };
    }
    if (outbound.media && !supportsMedia) {
      return {
        ok: false,
        channelType,
        code: 'media_not_supported',
        reason: `Saluran ${channelType} tidak mendukung lampiran media.`,
      };
    }
    const sentAtMs = nowFn();
    if (options?.transport) {
      const transportRes = options.transport(outbound);
      if (!transportRes.ok) {
        return {
          ok: false,
          channelType,
          code: 'transport_error',
          reason: transportRes.error || `Gagal mengirim pesan melalui transport ${channelType}.`,
        };
      }
      return {
        ok: true,
        channelType,
        recipients,
        externalMessageId:
          transportRes.externalMessageId
          || `${channelType}_msg_${computeDeterministicSha256(`${recipients.join(',')}::${outbound.body}::${sentAtMs}`).slice(0, 16)}`,
        sentAtMs,
      };
    }
    return {
      ok: true,
      channelType,
      recipients,
      externalMessageId: `${channelType}_msg_${computeDeterministicSha256(`${recipients.join(',')}::${outbound.body}::${sentAtMs}`).slice(0, 16)}`,
      sentAtMs,
    };
  };
}

/**
 * Adaptor Telegram mandiri (100% independen tanpa ketergantungan ke WhatsApp).
 */
export function createTelegramAdapter(options: ChannelAdapterOptions = {}): ChannelAdapter {
  const supportsMedia = options.supportsMedia ?? true;
  const maxRecipientsPerSend = 1;

  return {
    channelType: 'telegram',
    supportsMedia,
    maxRecipientsPerSend,
    parseInbound(raw: unknown): RawInboundChannelMessage {
      const obj = (raw ?? {}) as Record<string, unknown>;
      const tgMsg = (obj.message ?? obj) as Record<string, unknown>;
      const chat = (tgMsg.chat ?? {}) as Record<string, unknown>;
      const from = (tgMsg.from ?? {}) as Record<string, unknown>;
      const handle = String(
        obj.externalHandle ?? chat.id ?? from.id ?? '',
      ).trim();
      const messageId = String(
        obj.externalMessageId ?? tgMsg.message_id ?? obj.update_id ?? '',
      ).trim();
      const text = String(obj.text ?? tgMsg.text ?? tgMsg.caption ?? '').trim();
      const media = extractMediaMeta(obj as RawInboundChannelMessage);
      return {
        channelType: 'telegram',
        externalHandle: handle,
        externalMessageId: messageId,
        text,
        ...(obj.modality ? { modality: obj.modality as InputModality } : {}),
        ...(media
          ? {
              mediaAttachmentHash: media.mediaAttachmentHash,
              mimeType: media.mimeType,
              fileName: media.fileName,
              fileSizeBytes: media.fileSizeBytes,
            }
          : {}),
        ...(obj.projectHint ? { projectHint: String(obj.projectHint) } : {}),
        ...(typeof obj.receivedAtMs === 'number' ? { receivedAtMs: obj.receivedAtMs } : {}),
        ...(obj.targetOrgId ? { targetOrgId: String(obj.targetOrgId) } : {}),
      };
    },
    formatOutbound(message: OutboundChannelMessage): FormattedOutboundPayload {
      const quickSuffix =
        message.quickReplies && message.quickReplies.length > 0
          ? `\nBalas cepat: ${message.quickReplies.join(' / ')}`
          : '';
      return {
        channelType: 'telegram',
        recipients: [...message.recipients],
        body: `${message.content}${quickSuffix}`,
        ...(message.media ? { media: message.media } : {}),
        ...(message.quickReplies ? { quickReplies: [...message.quickReplies] } : {}),
        metadata: {
          orgId: message.orgId,
          recipientId: message.recipientId,
          questionKeys: message.questionKeys ?? [],
          parseMode: 'Markdown',
        },
      };
    },
    send: buildDefaultSend('telegram', supportsMedia, maxRecipientsPerSend, options),
  };
}

/**
 * Adaptor Web / PWA mandiri (100% independen tanpa ketergantungan ke WhatsApp).
 */
export function createWebPwaAdapter(options: ChannelAdapterOptions = {}): ChannelAdapter {
  const supportsMedia = options.supportsMedia ?? true;
  const maxRecipientsPerSend = 1;

  return {
    channelType: 'web_pwa',
    supportsMedia,
    maxRecipientsPerSend,
    parseInbound(raw: unknown): RawInboundChannelMessage {
      const obj = (raw ?? {}) as Record<string, unknown>;
      const media = extractMediaMeta(obj as RawInboundChannelMessage);
      return {
        channelType: 'web_pwa',
        externalHandle: String(obj.externalHandle ?? obj.memberHandle ?? obj.userId ?? '').trim(),
        externalMessageId: String(obj.externalMessageId ?? obj.messageId ?? '').trim(),
        text: String(obj.text ?? obj.body ?? '').trim(),
        ...(obj.modality ? { modality: obj.modality as InputModality } : {}),
        ...(media
          ? {
              mediaAttachmentHash: media.mediaAttachmentHash,
              mimeType: media.mimeType,
              fileName: media.fileName,
              fileSizeBytes: media.fileSizeBytes,
            }
          : {}),
        ...(obj.projectHint ? { projectHint: String(obj.projectHint) } : {}),
        ...(typeof obj.receivedAtMs === 'number' ? { receivedAtMs: obj.receivedAtMs } : {}),
        ...(obj.targetOrgId ? { targetOrgId: String(obj.targetOrgId) } : {}),
      };
    },
    formatOutbound(message: OutboundChannelMessage): FormattedOutboundPayload {
      return {
        channelType: 'web_pwa',
        recipients: [...message.recipients],
        body: message.content,
        ...(message.media ? { media: message.media } : {}),
        ...(message.quickReplies ? { quickReplies: [...message.quickReplies] } : {}),
        metadata: {
          orgId: message.orgId,
          recipientId: message.recipientId,
          questionKeys: message.questionKeys ?? [],
          renderMode: 'in_app_card',
        },
      };
    },
    send: buildDefaultSend('web_pwa', supportsMedia, maxRecipientsPerSend, options),
  };
}

/**
 * Adaptor WhatsApp Non-Resmi di belakang antarmuka ChannelAdapter yang sama.
 * Aturan keras:
 * - Melarang keras broadcast massal (`maxRecipientsPerSend === 1`, menolak `mass_broadcast_forbidden`).
 * - Dilarang menanam kredensial, token sesi, atau QR secret di dalam kode.
 * - Menyertakan peringatan risiko ToS & rekomendasi nomor pilot khusus.
 */
export function createUnofficialWhatsAppAdapter(
  options: ChannelAdapterOptions = {},
): ChannelAdapter {
  const supportsMedia = options.supportsMedia ?? true;
  const maxRecipientsPerSend = 1;

  return {
    channelType: 'whatsapp_unofficial',
    supportsMedia,
    maxRecipientsPerSend,
    tosRiskDisclosure: {
      unofficialBridge: true,
      riskSummary:
        'Jalur WhatsApp non-resmi berisiko melanggar Ketentuan Layanan (ToS) Meta/WhatsApp, pemblokiran nomor, putus sesi QR, dan perubahan protokol mendadak.',
      recommendedPilotNumberPolicy:
        'Wajib gunakan nomor pilot terdedikasi (bukan nomor utama bisnis/pribadi pemilik), batasi 1-ke-1 tanpa broadcast massal, dan migrasikan ke WhatsApp Business API resmi.',
      officialMigrationTarget: 'whatsapp_official',
    },
    parseInbound(raw: unknown): RawInboundChannelMessage {
      const obj = (raw ?? {}) as Record<string, unknown>;
      const media = extractMediaMeta(obj as RawInboundChannelMessage);
      return {
        channelType: 'whatsapp_unofficial',
        externalHandle: String(obj.externalHandle ?? obj.from ?? obj.senderPhone ?? '').trim(),
        externalMessageId: String(obj.externalMessageId ?? obj.id ?? obj.messageId ?? '').trim(),
        text: String(obj.text ?? obj.body ?? '').trim(),
        ...(obj.modality ? { modality: obj.modality as InputModality } : {}),
        ...(media
          ? {
              mediaAttachmentHash: media.mediaAttachmentHash,
              mimeType: media.mimeType,
              fileName: media.fileName,
              fileSizeBytes: media.fileSizeBytes,
            }
          : {}),
        ...(obj.projectHint ? { projectHint: String(obj.projectHint) } : {}),
        ...(typeof obj.receivedAtMs === 'number' ? { receivedAtMs: obj.receivedAtMs } : {}),
        ...(obj.targetOrgId ? { targetOrgId: String(obj.targetOrgId) } : {}),
      };
    },
    formatOutbound(message: OutboundChannelMessage): FormattedOutboundPayload {
      const quickSuffix =
        message.quickReplies && message.quickReplies.length > 0
          ? `\nJawab cepat: ${message.quickReplies.join(' / ')}`
          : '';
      return {
        channelType: 'whatsapp_unofficial',
        recipients: [...message.recipients],
        body: `${message.content}${quickSuffix}`,
        ...(message.media ? { media: message.media } : {}),
        ...(message.quickReplies ? { quickReplies: [...message.quickReplies] } : {}),
        metadata: {
          orgId: message.orgId,
          recipientId: message.recipientId,
          questionKeys: message.questionKeys ?? [],
          unofficialBridgeWarning: true,
        },
      };
    },
    send: buildDefaultSend('whatsapp_unofficial', supportsMedia, maxRecipientsPerSend, options),
  };
}

/**
 * Adaptor WhatsApp Business API Resmi di belakang antarmuka ChannelAdapter yang sama.
 * Mengganti adaptor non-resmi ke resmi hanya mengganti instance adaptor pada registry.
 */
export function createOfficialWhatsAppAdapter(
  options: ChannelAdapterOptions = {},
): ChannelAdapter {
  const supportsMedia = options.supportsMedia ?? true;
  const maxRecipientsPerSend = 1;

  return {
    channelType: 'whatsapp_official',
    supportsMedia,
    maxRecipientsPerSend,
    parseInbound(raw: unknown): RawInboundChannelMessage {
      const obj = (raw ?? {}) as Record<string, unknown>;
      const media = extractMediaMeta(obj as RawInboundChannelMessage);
      return {
        channelType: 'whatsapp_official',
        externalHandle: String(obj.externalHandle ?? obj.from ?? '').trim(),
        externalMessageId: String(obj.externalMessageId ?? obj.id ?? '').trim(),
        text: String(obj.text ?? obj.body ?? '').trim(),
        ...(obj.modality ? { modality: obj.modality as InputModality } : {}),
        ...(media
          ? {
              mediaAttachmentHash: media.mediaAttachmentHash,
              mimeType: media.mimeType,
              fileName: media.fileName,
              fileSizeBytes: media.fileSizeBytes,
            }
          : {}),
        ...(obj.projectHint ? { projectHint: String(obj.projectHint) } : {}),
        ...(typeof obj.receivedAtMs === 'number' ? { receivedAtMs: obj.receivedAtMs } : {}),
        ...(obj.targetOrgId ? { targetOrgId: String(obj.targetOrgId) } : {}),
      };
    },
    formatOutbound(message: OutboundChannelMessage): FormattedOutboundPayload {
      return {
        channelType: 'whatsapp_official',
        recipients: [...message.recipients],
        body: message.content,
        ...(message.media ? { media: message.media } : {}),
        ...(message.quickReplies ? { quickReplies: [...message.quickReplies] } : {}),
        metadata: {
          orgId: message.orgId,
          recipientId: message.recipientId,
          questionKeys: message.questionKeys ?? [],
          officialCloudApi: true,
        },
      };
    },
    send: buildDefaultSend('whatsapp_official', supportsMedia, maxRecipientsPerSend, options),
  };
}

export function createChannelAdapterRegistry(
  adapters: readonly ChannelAdapter[],
): Map<ChannelType, ChannelAdapter> {
  const registry = new Map<ChannelType, ChannelAdapter>();
  for (const adapter of adapters) {
    registry.set(adapter.channelType, adapter);
  }
  return registry;
}

export type ResolveChannelIdentityResult =
  | {
      ok: true;
      binding: ChannelIdentityBinding;
      normalizedHandle: string;
    }
  | {
      ok: false;
      code: 'invalid_handle' | 'identity_not_bound' | 'identity_inactive' | 'cross_tenant_forbidden';
      reason: string;
    };

/**
 * Menautkan identitas saluran (nomor HP / chatId / handle PWA) ke `(orgId, memberId, role)`
 * dengan isolasi lintas-tenant yang ketat.
 */
export function resolveChannelIdentity(
  channelType: ChannelType,
  externalHandle: string,
  bindings: readonly ChannelIdentityBinding[],
  expectedOrgId?: string,
): ResolveChannelIdentityResult {
  const normalizedHandle = normalizeExternalHandle(channelType, externalHandle);
  if (!normalizedHandle) {
    return {
      ok: false,
      code: 'invalid_handle',
      reason: 'externalHandle tidak boleh kosong.',
    };
  }

  const matchedAll = bindings.filter(
    (b) =>
      b.channelType === channelType
      && normalizeExternalHandle(channelType, b.externalHandle) === normalizedHandle,
  );

  if (matchedAll.length === 0) {
    return {
      ok: false,
      code: 'identity_not_bound',
      reason: `Identitas saluran ${channelType} (${normalizedHandle}) belum ditautkan ke anggota organisasi mana pun.`,
    };
  }

  const activeMatches = matchedAll.filter((b) => b.isActive !== false);
  if (activeMatches.length === 0) {
    return {
      ok: false,
      code: 'identity_inactive',
      reason: `Tautan identitas ${channelType} (${normalizedHandle}) sedang nonaktif.`,
    };
  }

  const distinctOrgs = new Set(activeMatches.map((b) => b.orgId));
  if (distinctOrgs.size > 1) {
    return {
      ok: false,
      code: 'cross_tenant_forbidden',
      reason: `Konflik isolasi lintas-tenant: handle ${normalizedHandle} tertaut ke lebih dari satu organisasi.`,
    };
  }

  const binding = activeMatches[0];
  const expected = expectedOrgId?.trim();
  if (expected && binding.orgId !== expected) {
    return {
      ok: false,
      code: 'cross_tenant_forbidden',
      reason: `Akses lintas-tenant ditolak: identitas milik org '${binding.orgId}' mencoba masuk ke org '${expected}'.`,
    };
  }

  return {
    ok: true,
    binding,
    normalizedHandle,
  };
}

export type ChannelGatewayState = {
  processedMessageKeys: Set<string>;
  rateLimitBuckets: Map<string, number[]>;
  optedOutMemberKeys: Set<string>;
  preparedStore: PreparedActionStore;
  dailyUsageByOrg: Map<string, UnifiedDailyUsage>;
  mediaAuditLogs: Array<{
    orgId: string;
    memberId: string;
    channelType: ChannelType;
    externalMessageId: string;
    mediaAttachmentHash: string;
    mimeType: string;
    recordedAtMs: number;
  }>;
};

export function createChannelGatewayState(): ChannelGatewayState {
  return {
    processedMessageKeys: new Set<string>(),
    rateLimitBuckets: new Map<string, number[]>(),
    optedOutMemberKeys: new Set<string>(),
    preparedStore: new Map(),
    dailyUsageByOrg: new Map(),
    mediaAuditLogs: [],
  };
}

export function memberKey(orgId: string, memberId: string): string {
  return `${orgId}::${memberId}`;
}

export function isMemberOptedOut(
  orgId: string,
  memberId: string,
  bindings: readonly ChannelIdentityBinding[],
  state?: Pick<ChannelGatewayState, 'optedOutMemberKeys'>,
): boolean {
  if (state?.optedOutMemberKeys.has(memberKey(orgId, memberId))) {
    return true;
  }
  return bindings.some(
    (b) => b.orgId === orgId && b.memberId === memberId && b.optedOut === true,
  );
}

export type SingleOrgChannelGatewayPolicy = {
  orgId: string;
  rateLimitPerMinute?: number;
  gatewayPolicy: UnifiedGatewayPolicy;
  dailyUsage?: UnifiedDailyUsage;
};

export type MultiOrgChannelGatewayPolicy = {
  rateLimitPerMinute?: number;
  policiesByOrg: Record<string, UnifiedGatewayPolicy>;
  dailyUsageByOrg?: Record<string, UnifiedDailyUsage>;
};

export type ChannelGatewayPolicy =
  | SingleOrgChannelGatewayPolicy
  | MultiOrgChannelGatewayPolicy;

function resolveOrgPolicyForBinding(
  orgId: string,
  policy: ChannelGatewayPolicy,
): {
  ok: true;
  gatewayPolicy: UnifiedGatewayPolicy;
  dailyUsage?: UnifiedDailyUsage;
  rateLimitPerMinute: number;
} | {
  ok: false;
  code: 'cross_tenant_forbidden';
  reason: string;
} {
  const rateLimitPerMinute = Math.max(1, policy.rateLimitPerMinute ?? 10);
  if ('policiesByOrg' in policy) {
    const found = policy.policiesByOrg[orgId];
    if (!found || found.orgId !== orgId) {
      return {
        ok: false,
        code: 'cross_tenant_forbidden',
        reason: `Kebijakan gateway untuk organisasi '${orgId}' tidak terdaftar.`,
      };
    }
    return {
      ok: true,
      gatewayPolicy: found,
      dailyUsage: policy.dailyUsageByOrg?.[orgId],
      rateLimitPerMinute,
    };
  }

  if (policy.orgId !== orgId || policy.gatewayPolicy.orgId !== orgId) {
    return {
      ok: false,
      code: 'cross_tenant_forbidden',
      reason: `Akses lintas-tenant ditolak: organisasi pesan (${orgId}) tidak cocok dengan organisasi gateway (${policy.orgId}).`,
    };
  }

  return {
    ok: true,
    gatewayPolicy: policy.gatewayPolicy,
    dailyUsage: policy.dailyUsage,
    rateLimitPerMinute,
  };
}

export function isOptOutCommand(text: string): boolean {
  const trimmed = String(text ?? '').trim();
  return /^(?:STOP|BERHENTI|STOP\s+NOTIF|BERHENTI\s+NOTIF)$/i.test(trimmed);
}

export type ProcessInboundRejectedResult = {
  ok: false;
  writeExecuted: false;
  code:
    | 'invalid_handle'
    | 'identity_not_bound'
    | 'identity_inactive'
    | 'cross_tenant_forbidden'
    | 'invalid_message_id'
    | 'duplicate_inbound_ignored'
    | 'rate_limited'
    | 'prompt_injection_rejected';
  reason: string;
  orgId?: string;
  memberId?: string;
  injectionHits?: string[];
};

export type ProcessInboundSuccessResult =
  | {
      ok: true;
      kind: 'opt_out_recorded';
      writeExecuted: false;
      userOptedOut: true;
      orgId: string;
      memberId: string;
      role: ActorRole;
      channelType: ChannelType;
      externalMessageId: string;
      replyText: string;
      preparedResults: [];
    }
  | {
      ok: true;
      kind: 'no_action_reply';
      writeExecuted: false;
      userOptedOut: boolean;
      orgId: string;
      memberId: string;
      role: ActorRole;
      channelType: ChannelType;
      externalMessageId: string;
      mediaMetadata?: ChannelMediaMetadata;
      routeResult: RouteSingleDoorResult;
      replyText: string;
      preparedResults: [];
    }
  | {
      ok: true;
      kind: 'actions_prepared';
      writeExecuted: false;
      userOptedOut: boolean;
      orgId: string;
      memberId: string;
      role: ActorRole;
      channelType: ChannelType;
      externalMessageId: string;
      mediaMetadata?: ChannelMediaMetadata;
      routeResult: Extract<RouteSingleDoorResult, { ok: true }>;
      preparedResults: PrepareUnifiedActionResult[];
      replyText: string;
    };

export type ProcessInboundChannelResult =
  | ProcessInboundRejectedResult
  | ProcessInboundSuccessResult;

/**
 * Memproses pesan masuk dari saluran mana pun secara deterministik:
 * 1) Penautan identitas & isolasi lintas-tenant ketat.
 * 2) Deduplikasi `externalMessageId` (`duplicate_inbound_ignored`).
 * 3) Batas laju `rateLimitPerMinute` (`rate_limited`).
 * 4) Simpan metadata media (`mediaAttachmentHash`, `mimeType`) tanpa kredensial sesi di kode.
 * 5) Deteksi prompt injection (`prompt_injection_rejected`).
 * 6) Hormati opt-out (`"STOP"` / `"BERHENTI"` -> `userOptedOut = true`).
 * 7) Teruskan pesan sah ke `routeSingleDoorInput` + `prepareUnifiedAction` (0 tulis langsung tanpa `prepare`/`commit`).
 */
export function processInboundChannelMessage(
  rawMsg: RawInboundChannelMessage,
  bindings: readonly ChannelIdentityBinding[],
  state: ChannelGatewayState,
  policy: ChannelGatewayPolicy,
): ProcessInboundChannelResult {
  const expectedOrgId =
    rawMsg.targetOrgId ?? ('orgId' in policy ? policy.orgId : undefined);
  const identity = resolveChannelIdentity(
    rawMsg.channelType,
    rawMsg.externalHandle,
    bindings,
    expectedOrgId,
  );
  if (!identity.ok) {
    return {
      ok: false,
      writeExecuted: false,
      code: identity.code,
      reason: identity.reason,
    };
  }

  const { binding } = identity;
  const orgPolicyRes = resolveOrgPolicyForBinding(binding.orgId, policy);
  if (!orgPolicyRes.ok) {
    return {
      ok: false,
      writeExecuted: false,
      code: orgPolicyRes.code,
      reason: orgPolicyRes.reason,
      orgId: binding.orgId,
      memberId: binding.memberId,
    };
  }

  const externalMessageId = String(rawMsg.externalMessageId ?? '').trim();
  if (!externalMessageId) {
    return {
      ok: false,
      writeExecuted: false,
      code: 'invalid_message_id',
      reason: 'externalMessageId wajib diisi untuk deduplikasi pesan masuk.',
      orgId: binding.orgId,
      memberId: binding.memberId,
    };
  }

  const dedupeKey = `${binding.orgId}::${rawMsg.channelType}::${externalMessageId}`;
  if (state.processedMessageKeys.has(dedupeKey)) {
    return {
      ok: false,
      writeExecuted: false,
      code: 'duplicate_inbound_ignored',
      reason: `Pesan masuk duplikat (${externalMessageId}) diabaikan secara idempoten.`,
      orgId: binding.orgId,
      memberId: binding.memberId,
    };
  }

  const nowMs = rawMsg.receivedAtMs ?? Date.now();
  const bucketKey = `${binding.orgId}::${rawMsg.channelType}::${binding.memberId}`;
  const recentTimestamps = (state.rateLimitBuckets.get(bucketKey) ?? []).filter(
    (ts) => nowMs - ts < 60_000,
  );
  if (recentTimestamps.length >= orgPolicyRes.rateLimitPerMinute) {
    state.rateLimitBuckets.set(bucketKey, recentTimestamps);
    return {
      ok: false,
      writeExecuted: false,
      code: 'rate_limited',
      reason: `Batas laju tercapai (${orgPolicyRes.rateLimitPerMinute} pesan/menit) untuk ${binding.memberId} pada ${rawMsg.channelType}.`,
      orgId: binding.orgId,
      memberId: binding.memberId,
    };
  }

  state.processedMessageKeys.add(dedupeKey);
  recentTimestamps.push(nowMs);
  state.rateLimitBuckets.set(bucketKey, recentTimestamps);

  const mediaMetadata = extractMediaMeta(rawMsg);
  if (mediaMetadata) {
    state.mediaAuditLogs.push({
      orgId: binding.orgId,
      memberId: binding.memberId,
      channelType: rawMsg.channelType,
      externalMessageId,
      mediaAttachmentHash: mediaMetadata.mediaAttachmentHash,
      mimeType: mediaMetadata.mimeType,
      recordedAtMs: nowMs,
    });
  }

  const text = String(rawMsg.text ?? '').trim();
  const injectionHits = detectPromptInjection(text);
  if (injectionHits.length > 0) {
    return {
      ok: false,
      writeExecuted: false,
      code: 'prompt_injection_rejected',
      reason: `Pesan masuk ditolak karena terdeteksi prompt injection (${injectionHits[0]}).`,
      orgId: binding.orgId,
      memberId: binding.memberId,
      injectionHits,
    };
  }

  if (isOptOutCommand(text)) {
    state.optedOutMemberKeys.add(memberKey(binding.orgId, binding.memberId));
    binding.optedOut = true;
    return {
      ok: true,
      kind: 'opt_out_recorded',
      writeExecuted: false,
      userOptedOut: true,
      orgId: binding.orgId,
      memberId: binding.memberId,
      role: binding.role,
      channelType: rawMsg.channelType,
      externalMessageId,
      replyText:
        'Pengiriman pesan proaktif telah dihentikan (opt-out aktif). Anda tetap bisa mengirim perintah kapan saja.',
      preparedResults: [],
    };
  }

  const modality = inferModality(rawMsg, mediaMetadata);
  const routeResult = routeSingleDoorInput({
    modality,
    rawText: text,
    orgId: binding.orgId,
    actorId: binding.memberId,
    actorRole: binding.role,
    ...(mediaMetadata ? { attachmentHash: mediaMetadata.mediaAttachmentHash } : {}),
    ...(rawMsg.projectHint ? { projectHint: rawMsg.projectHint } : {}),
    nowMs,
  });

  if (!routeResult.ok) {
    if (routeResult.code === 'prompt_injection_detected') {
      return {
        ok: false,
        writeExecuted: false,
        code: 'prompt_injection_rejected',
        reason: routeResult.reason,
        orgId: binding.orgId,
        memberId: binding.memberId,
        injectionHits: routeResult.injectionHits,
      };
    }

    return {
      ok: true,
      kind: 'no_action_reply',
      writeExecuted: false,
      userOptedOut: isMemberOptedOut(binding.orgId, binding.memberId, bindings, state),
      orgId: binding.orgId,
      memberId: binding.memberId,
      role: binding.role,
      channelType: rawMsg.channelType,
      externalMessageId,
      ...(mediaMetadata ? { mediaMetadata } : {}),
      routeResult,
      replyText:
        'Pesan diterima tanpa aksi tulis data. Sertakan detail biaya, progres, atau absensi bila ingin menyiapkan draf.',
      preparedResults: [],
    };
  }

  const dailyUsage: UnifiedDailyUsage =
    orgPolicyRes.dailyUsage
    ?? state.dailyUsageByOrg.get(binding.orgId)
    ?? { committedRupiahToday: 0, tokensUsedToday: 0, costRupiahToday: 0 };
  state.dailyUsageByOrg.set(binding.orgId, dailyUsage);

  const preparedResults = routeResult.candidates.map((candidate) =>
    prepareUnifiedAction(
      candidate,
      orgPolicyRes.gatewayPolicy,
      dailyUsage,
      state.preparedStore,
    ),
  );

  const summaries = preparedResults
    .filter((r): r is Extract<PrepareUnifiedActionResult, { ok: true }> => r.ok)
    .map((r) => `- ${r.summary} (token: ${r.prepareToken})`);

  return {
    ok: true,
    kind: 'actions_prepared',
    writeExecuted: false,
    userOptedOut: isMemberOptedOut(binding.orgId, binding.memberId, bindings, state),
    orgId: binding.orgId,
    memberId: binding.memberId,
    role: binding.role,
    channelType: rawMsg.channelType,
    externalMessageId,
    ...(mediaMetadata ? { mediaMetadata } : {}),
    routeResult,
    preparedResults,
    replyText:
      summaries.length > 0
        ? `Draf disiapkan (belum disimpan ke buku besar sebelum konfirmasi):\n${summaries.join('\n')}`
        : 'Permintaan diproses ke tahap prepare tanpa penulisan langsung.',
  };
}
