import {
  isMemberOptedOut,
  memberKey,
  type ChannelAdapter,
  type ChannelGatewayState,
  type ChannelIdentityBinding,
  type ChannelType,
} from './channelGateway';
import { toRupiah } from './journal';

export const PROACTIVE_TRIGGER_TYPES = [
  'absensi_belum_masuk',
  'progres_mandek',
  'hari_kerja_melebihi_rap',
  'tagihan_jatuh_tempo',
  'stok_menipis',
  'hari_gajian',
  'todo_terlambat',
] as const;

export type ProactiveTriggerType = (typeof PROACTIVE_TRIGGER_TYPES)[number];
export type ProactiveMemberRole = 'worker' | 'mandor' | 'pm' | 'owner';
export type ProactivePriority = 'low' | 'medium' | 'high' | 'critical';

export const DEFAULT_MAX_QUESTIONS_PER_PERSON_PER_DAY = 3;
export const DEFAULT_QUIET_START_HOUR = 20;
export const DEFAULT_QUIET_END_HOUR = 7;
export const DEFAULT_MAX_IGNORE_COUNT = 2;
export const DEFAULT_UTC_OFFSET_HOURS = 7;

export type ProactiveBudgetPolicy = {
  orgId: string;
  maxQuestionsPerPersonPerDay?: number;
  quietStartHour?: number;
  quietEndHour?: number;
  maxIgnoreCount?: number;
  orgKillSwitch?: boolean;
  utcOffsetHours?: number;
};

export type ProactiveMemberProfile = {
  orgId: string;
  memberId: string;
  name: string;
  role: ProactiveMemberRole;
  preferredChannel: ChannelType;
  externalHandle: string;
  supervisorId?: string;
  userOptedOut?: boolean;
};

export type StrongGuessPrompt = {
  projectName: string;
  expectedAnswers?: [string, string];
};

export type ProactiveTriggerEvent = {
  id: string;
  orgId: string;
  recipientId: string;
  recipientRole: ProactiveMemberRole;
  triggerType: ProactiveTriggerType;
  questionKey: string;
  promptText: string;
  projectId?: string;
  projectName?: string;
  preferredChannel?: ChannelType;
  priority?: ProactivePriority;
  strongGuess?: StrongGuessPrompt;
  supervisorId?: string;
};

export type OutboundOutcome =
  | 'sent'
  | 'escalated_to_supervisor'
  | 'deferred_quiet_hours'
  | 'already_answered_or_sent'
  | 'budget_exhausted'
  | 'blocked_opt_out'
  | 'blocked_org_kill_switch'
  | 'paused_after_ignored'
  | 'missing_channel_adapter'
  | 'send_failed';

export type OutboundMessageLog = {
  orgId: string;
  recipientId: string;
  channel: ChannelType;
  sentAt: string;
  localDate: string;
  questionKeys: string[];
  content: string;
  outcome: 'sent' | 'escalated_to_supervisor' | 'send_failed';
  externalMessageId?: string;
  quickReplies?: string[];
};

export type ProactiveDecisionRecord = {
  orgId: string;
  recipientId: string;
  triggerId: string;
  triggerType: ProactiveTriggerType;
  questionKey: string;
  channel: ChannelType;
  outcome: OutboundOutcome;
  reason: string;
  deferredUntilLocal?: string;
  escalatedToId?: string;
};

export type ProactiveOrchestratorState = {
  /** key: `${orgId}::${memberId}` */
  answeredQuestionKeysByMember: Map<string, Set<string>>;
  /** key: `${orgId}::${memberId}` */
  sentQuestionKeysByMember: Map<string, Set<string>>;
  /** key: `${orgId}::${memberId}::${localDate}` */
  sentCountByMemberDate: Map<string, number>;
  /** key: `${orgId}::${memberId}` */
  ignoredStreakByMember: Map<string, number>;
  /** key: `${orgId}::${memberId}` */
  optedOutMemberKeys: Set<string>;
  /** key: `${orgId}::${memberId}::${localDate}` */
  escalatedMemberDates: Set<string>;
  outboundLogs: OutboundMessageLog[];
};

export function createProactiveOrchestratorState(): ProactiveOrchestratorState {
  return {
    answeredQuestionKeysByMember: new Map(),
    sentQuestionKeysByMember: new Map(),
    sentCountByMemberDate: new Map(),
    ignoredStreakByMember: new Map(),
    optedOutMemberKeys: new Set(),
    escalatedMemberDates: new Set(),
    outboundLogs: [],
  };
}

function getOrCreateSet(map: Map<string, Set<string>>, key: string): Set<string> {
  let set = map.get(key);
  if (!set) {
    set = new Set<string>();
    map.set(key, set);
  }
  return set;
}

export function getMemberSentCountForDate(
  state: ProactiveOrchestratorState,
  orgId: string,
  memberId: string,
  localDate: string,
): number {
  return state.sentCountByMemberDate.get(`${orgId}::${memberId}::${localDate}`) ?? 0;
}

/**
 * Mencatat jawaban pengguna untuk `questionKey` sehingga tidak pernah ditanyakan ulang
 * dan mereset `ignoredStreak` menjadi 0.
 */
export function markProactiveQuestionAnswered(
  state: ProactiveOrchestratorState,
  orgId: string,
  memberId: string,
  questionKey: string,
): void {
  const mKey = memberKey(orgId, memberId);
  getOrCreateSet(state.answeredQuestionKeysByMember, mKey).add(questionKey);
  state.ignoredStreakByMember.set(mKey, 0);
}

/**
 * Menambah jumlah pengabaian berturut-turut untuk anggota bila pesan tidak dibalas.
 */
export function recordProactiveIgnore(
  state: ProactiveOrchestratorState,
  orgId: string,
  memberId: string,
  increment = 1,
): number {
  const mKey = memberKey(orgId, memberId);
  const next = (state.ignoredStreakByMember.get(mKey) ?? 0) + Math.max(1, Math.trunc(increment));
  state.ignoredStreakByMember.set(mKey, next);
  return next;
}

/**
 * Menghitung waktu lokal deterministik dari `nowMs` + `utcOffsetHours` (default +7 WIB)
 * agar tidak bergantung pada zona waktu server/mesin CI.
 */
export function resolveLocalClock(
  nowMs: number,
  utcOffsetHours = DEFAULT_UTC_OFFSET_HOURS,
): {
  localDate: string;
  localHour: number;
  localMinute: number;
  isoUtc: string;
} {
  const shifted = new Date(nowMs + utcOffsetHours * 3_600_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return {
    localDate: `${y}-${m}-${d}`,
    localHour: shifted.getUTCHours(),
    localMinute: shifted.getUTCMinutes(),
    isoUtc: new Date(nowMs).toISOString(),
  };
}

export function isWithinQuietHours(
  localHour: number,
  quietStartHour = DEFAULT_QUIET_START_HOUR,
  quietEndHour = DEFAULT_QUIET_END_HOUR,
): boolean {
  const start = ((quietStartHour % 24) + 24) % 24;
  const end = ((quietEndHour % 24) + 24) % 24;
  const hour = ((localHour % 24) + 24) % 24;
  if (start === end) return false;
  if (start > end) {
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

function computeNextMorningLocalLabel(
  nowMs: number,
  utcOffsetHours: number,
  quietStartHour: number,
  quietEndHour: number,
): string {
  const clock = resolveLocalClock(nowMs, utcOffsetHours);
  const endHourStr = `${String(quietEndHour).padStart(2, '0')}:00`;
  if (quietStartHour > quietEndHour && clock.localHour >= quietStartHour) {
    const tomorrow = resolveLocalClock(nowMs + 86_400_000, utcOffsetHours);
    return `${tomorrow.localDate}T${endHourStr}`;
  }
  return `${clock.localDate}T${endHourStr}`;
}

function priorityScore(priority?: ProactivePriority): number {
  switch (priority) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}

export function formatStrongGuessPrompt(
  projectName: string,
  expectedAnswers: [string, string] = ['ya', 'bukan'],
): string {
  const safeProject = String(projectName ?? '').replace(/[\r\n]+/g, ' ').trim();
  return `Di proyek ${safeProject} hari ini? Jawab: ${expectedAnswers[0]} / ${expectedAnswers[1]}`;
}

function formatTriggerLine(trigger: ProactiveTriggerEvent): {
  line: string;
  quickReplies?: string[];
} {
  if (trigger.strongGuess?.projectName) {
    const answers = trigger.strongGuess.expectedAnswers ?? ['ya', 'bukan'];
    return {
      line: formatStrongGuessPrompt(trigger.strongGuess.projectName, answers),
      quickReplies: [...answers],
    };
  }
  return {
    line: String(trigger.promptText ?? '').replace(/[\r\n]+/g, ' ').trim(),
  };
}

function resolveEffectiveOptOut(
  orgId: string,
  member: ProactiveMemberProfile | undefined,
  state: ProactiveOrchestratorState,
  gatewayState?: ChannelGatewayState,
  bindings: readonly ChannelIdentityBinding[] = [],
): boolean {
  if (!member) return false;
  if (member.userOptedOut) return true;
  if (state.optedOutMemberKeys.has(memberKey(orgId, member.memberId))) return true;
  if (isMemberOptedOut(orgId, member.memberId, bindings, gatewayState)) return true;
  return false;
}

function resolveSupervisor(
  orgId: string,
  member: ProactiveMemberProfile | undefined,
  triggers: readonly ProactiveTriggerEvent[],
  memberMap: Map<string, ProactiveMemberProfile>,
): ProactiveMemberProfile | undefined {
  const explicitSupId =
    member?.supervisorId
    ?? triggers.find((t) => Boolean(t.supervisorId))?.supervisorId;
  if (explicitSupId) {
    const sup = memberMap.get(memberKey(orgId, explicitSupId));
    if (sup) return sup;
  }

  const orgMembers = [...memberMap.values()].filter((m) => m.orgId === orgId);
  if (member?.role === 'worker') {
    return (
      orgMembers.find((m) => m.role === 'mandor')
      ?? orgMembers.find((m) => m.role === 'pm')
      ?? orgMembers.find((m) => m.role === 'owner')
    );
  }
  if (member?.role === 'mandor') {
    return (
      orgMembers.find((m) => m.role === 'pm')
      ?? orgMembers.find((m) => m.role === 'owner')
    );
  }
  if (member?.role === 'pm') {
    return orgMembers.find((m) => m.role === 'owner');
  }
  return undefined;
}

export type RunProactiveDispatchInput = {
  nowMs: number;
  policy: ProactiveBudgetPolicy;
  triggers: readonly ProactiveTriggerEvent[];
  members: readonly ProactiveMemberProfile[];
  adapters: ReadonlyMap<ChannelType, ChannelAdapter>;
  state: ProactiveOrchestratorState;
  gatewayState?: ChannelGatewayState;
  bindings?: readonly ChannelIdentityBinding[];
};

export type RunProactiveDispatchResult = {
  orgId: string;
  localDate: string;
  localHour: number;
  inQuietHours: boolean;
  sentMessages: OutboundMessageLog[];
  escalations: OutboundMessageLog[];
  deferred: ProactiveDecisionRecord[];
  decisions: ProactiveDecisionRecord[];
};

/**
 * Menjalankan satu siklus orkestrator proaktif dengan Anggaran Gangguan ketat:
 * - Kill switch organisasi (`orgKillSwitch`) & opt-out per orang (`userOptedOut`).
 * - Jam tenang (`quietHours`, default 20:00–07:00) menunda pengiriman ke pagi hari (`deferred_quiet_hours`).
 * - 0 pertanyaan ganda (`answeredQuestionKeys` & `sentQuestionKeys` -> `already_answered_or_sent`).
 * - Berhenti bila diabaikan (`ignoredStreak >= maxIgnoreCount`, default 2) & eskalasi 1 ringkasan ke atasan.
 * - Pengelompokan (bundling) seluruh pemicu slot yang sama menjadi 1 ringkasan terpadu.
 * - Jaminan mutlak: pesan dikirim ke setiap orang pada setiap hari <= `maxQuestionsPerPersonPerDay` (default 3).
 * - Jejak `OutboundMessageLog` wajib untuk setiap pesan keluar.
 */
export function runProactiveDispatchCycle(
  input: RunProactiveDispatchInput,
): RunProactiveDispatchResult {
  const {
    nowMs,
    policy,
    triggers,
    members,
    adapters,
    state,
    gatewayState,
    bindings = [],
  } = input;

  const orgId = String(policy.orgId ?? '').trim();
  const maxPerDay = Math.max(
    0,
    Math.trunc(policy.maxQuestionsPerPersonPerDay ?? DEFAULT_MAX_QUESTIONS_PER_PERSON_PER_DAY),
  );
  const quietStartHour = policy.quietStartHour ?? DEFAULT_QUIET_START_HOUR;
  const quietEndHour = policy.quietEndHour ?? DEFAULT_QUIET_END_HOUR;
  const maxIgnoreCount = Math.max(1, Math.trunc(policy.maxIgnoreCount ?? DEFAULT_MAX_IGNORE_COUNT));
  const utcOffsetHours = policy.utcOffsetHours ?? DEFAULT_UTC_OFFSET_HOURS;

  const clock = resolveLocalClock(nowMs, utcOffsetHours);
  const inQuietHours = isWithinQuietHours(clock.localHour, quietStartHour, quietEndHour);

  const memberMap = new Map<string, ProactiveMemberProfile>();
  for (const m of members) {
    if (m.orgId === orgId) {
      memberMap.set(memberKey(m.orgId, m.memberId), m);
    }
  }

  const sentMessages: OutboundMessageLog[] = [];
  const escalations: OutboundMessageLog[] = [];
  const deferred: ProactiveDecisionRecord[] = [];
  const decisions: ProactiveDecisionRecord[] = [];

  const orgTriggers = triggers
    .filter((t) => t.orgId === orgId)
    .sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority));

  // Kelompokkan per penerima
  const byRecipient = new Map<string, ProactiveTriggerEvent[]>();
  for (const t of orgTriggers) {
    const list = byRecipient.get(t.recipientId) ?? [];
    list.push(t);
    byRecipient.set(t.recipientId, list);
  }

  const pendingEscalations = new Map<
    string,
    { supervisor: ProactiveMemberProfile; pausedMembers: Map<string, ProactiveTriggerEvent[]> }
  >();

  for (const [recipientId, recipientTriggers] of byRecipient.entries()) {
    const member = memberMap.get(memberKey(orgId, recipientId));
    const defaultChannel: ChannelType =
      member?.preferredChannel ?? recipientTriggers[0]?.preferredChannel ?? 'web_pwa';

    // 1. Kill switch organisasi memblokir instan
    if (policy.orgKillSwitch) {
      for (const t of recipientTriggers) {
        decisions.push({
          orgId,
          recipientId,
          triggerId: t.id,
          triggerType: t.triggerType,
          questionKey: t.questionKey,
          channel: t.preferredChannel ?? defaultChannel,
          outcome: 'blocked_org_kill_switch',
          reason: `Kill switch proaktif organisasi ${orgId} sedang aktif.`,
        });
      }
      continue;
    }

    // 2. Opt-out per orang memblokir instan
    if (resolveEffectiveOptOut(orgId, member, state, gatewayState, bindings)) {
      for (const t of recipientTriggers) {
        decisions.push({
          orgId,
          recipientId,
          triggerId: t.id,
          triggerType: t.triggerType,
          questionKey: t.questionKey,
          channel: t.preferredChannel ?? defaultChannel,
          outcome: 'blocked_opt_out',
          reason: `Anggota ${recipientId} telah melakukan opt-out (STOP).`,
        });
      }
      continue;
    }

    // 3. Jam tenang menunda seluruh pesan ke pagi berikutnya
    if (inQuietHours) {
      const nextMorning = computeNextMorningLocalLabel(
        nowMs,
        utcOffsetHours,
        quietStartHour,
        quietEndHour,
      );
      for (const t of recipientTriggers) {
        const rec: ProactiveDecisionRecord = {
          orgId,
          recipientId,
          triggerId: t.id,
          triggerType: t.triggerType,
          questionKey: t.questionKey,
          channel: t.preferredChannel ?? defaultChannel,
          outcome: 'deferred_quiet_hours',
          reason: `Jam tenang (${quietStartHour}:00–${String(quietEndHour).padStart(2, '0')}:00): ditunda ke ${nextMorning}.`,
          deferredUntilLocal: nextMorning,
        };
        deferred.push(rec);
        decisions.push(rec);
      }
      continue;
    }

    const mKey = memberKey(orgId, recipientId);
    const answeredSet = getOrCreateSet(state.answeredQuestionKeysByMember, mKey);
    const sentSet = getOrCreateSet(state.sentQuestionKeysByMember, mKey);
    const seenInBatch = new Set<string>();

    // 4. Filter 0 pertanyaan ganda
    const eligible: ProactiveTriggerEvent[] = [];
    for (const t of recipientTriggers) {
      if (answeredSet.has(t.questionKey) || sentSet.has(t.questionKey) || seenInBatch.has(t.questionKey)) {
        decisions.push({
          orgId,
          recipientId,
          triggerId: t.id,
          triggerType: t.triggerType,
          questionKey: t.questionKey,
          channel: t.preferredChannel ?? defaultChannel,
          outcome: 'already_answered_or_sent',
          reason: `Pertanyaan '${t.questionKey}' sudah dijawab atau sudah ditanyakan sebelumnya.`,
        });
        continue;
      }
      seenInBatch.add(t.questionKey);
      eligible.push(t);
    }

    if (eligible.length === 0) continue;

    // 5. Berhenti bila diabaikan >= maxIgnoreCount & antrekan eskalasi ke atasan
    const ignoredStreak = state.ignoredStreakByMember.get(mKey) ?? 0;
    if (ignoredStreak >= maxIgnoreCount) {
      const escDateKey = `${orgId}::${recipientId}::${clock.localDate}`;
      const supervisor = resolveSupervisor(orgId, member, eligible, memberMap);
      for (const t of eligible) {
        decisions.push({
          orgId,
          recipientId,
          triggerId: t.id,
          triggerType: t.triggerType,
          questionKey: t.questionKey,
          channel: defaultChannel,
          outcome: 'paused_after_ignored',
          reason: `Pengiriman dihentikan karena diabaikan ${ignoredStreak}x berturut-turut (batas ${maxIgnoreCount}x).`,
          ...(supervisor ? { escalatedToId: supervisor.memberId } : {}),
        });
      }
      if (supervisor && !state.escalatedMemberDates.has(escDateKey)) {
        state.escalatedMemberDates.add(escDateKey);
        const existingEsc = pendingEscalations.get(supervisor.memberId) ?? {
          supervisor,
          pausedMembers: new Map<string, ProactiveTriggerEvent[]>(),
        };
        existingEsc.pausedMembers.set(
          member?.name ?? recipientId,
          eligible,
        );
        pendingEscalations.set(supervisor.memberId, existingEsc);
      }
      continue;
    }

    // 6. Cek anggaran gangguan harian (<= maxQuestionsPerPersonPerDay)
    const countKey = `${orgId}::${recipientId}::${clock.localDate}`;
    const sentToday = state.sentCountByMemberDate.get(countKey) ?? 0;
    if (sentToday >= maxPerDay) {
      for (const t of eligible) {
        decisions.push({
          orgId,
          recipientId,
          triggerId: t.id,
          triggerType: t.triggerType,
          questionKey: t.questionKey,
          channel: defaultChannel,
          outcome: 'budget_exhausted',
          reason: `Anggaran gangguan harian tercapai (${sentToday}/${maxPerDay}) untuk ${recipientId} pada ${clock.localDate}.`,
        });
      }
      continue;
    }

    // 7. Bundling seluruh pemicu slot ini menjadi 1 pesan terpadu
    const channel = member?.preferredChannel ?? eligible[0].preferredChannel ?? defaultChannel;
    const adapter = adapters.get(channel);
    if (!adapter) {
      for (const t of eligible) {
        decisions.push({
          orgId,
          recipientId,
          triggerId: t.id,
          triggerType: t.triggerType,
          questionKey: t.questionKey,
          channel,
          outcome: 'missing_channel_adapter',
          reason: `Adaptor saluran '${channel}' tidak terdaftar.`,
        });
      }
      continue;
    }

    const formattedLines: string[] = [];
    const quickReplies = new Set<string>();
    for (const t of eligible) {
      const fl = formatTriggerLine(t);
      formattedLines.push(fl.line);
      if (fl.quickReplies) {
        for (const qr of fl.quickReplies) quickReplies.add(qr);
      }
    }

    const bundleHeader =
      formattedLines.length > 1
        ? `Ringkasan (${formattedLines.length} hal butuh info):`
        : '';
    const content = bundleHeader
      ? `${bundleHeader}\n${formattedLines.map((l, idx) => `${idx + 1}. ${l}`).join('\n')}`
      : formattedLines[0];

    const questionKeys = eligible.map((t) => t.questionKey);
    const recipientHandle = member?.externalHandle ?? recipientId;

    const formattedOutbound = adapter.formatOutbound({
      orgId,
      recipientId,
      recipients: [recipientHandle],
      channelType: channel,
      content,
      questionKeys,
      ...(quickReplies.size > 0 ? { quickReplies: [...quickReplies] } : {}),
    });

    const sendRes = adapter.send(formattedOutbound);
    if (!sendRes.ok) {
      const failLog: OutboundMessageLog = {
        orgId,
        recipientId,
        channel,
        sentAt: clock.isoUtc,
        localDate: clock.localDate,
        questionKeys,
        content: formattedOutbound.body,
        outcome: 'send_failed',
      };
      state.outboundLogs.push(failLog);
      for (const t of eligible) {
        decisions.push({
          orgId,
          recipientId,
          triggerId: t.id,
          triggerType: t.triggerType,
          questionKey: t.questionKey,
          channel,
          outcome: 'send_failed',
          reason: sendRes.reason,
        });
      }
      continue;
    }

    // Berhasil dikirim: tandai sentQuestionKeys & naikkan sentCount hari ini (+1 bundle)
    for (const qk of questionKeys) {
      sentSet.add(qk);
    }
    state.sentCountByMemberDate.set(countKey, sentToday + 1);

    const logEntry: OutboundMessageLog = {
      orgId,
      recipientId,
      channel,
      sentAt: clock.isoUtc,
      localDate: clock.localDate,
      questionKeys,
      content: formattedOutbound.body,
      outcome: 'sent',
      externalMessageId: sendRes.externalMessageId,
      ...(quickReplies.size > 0 ? { quickReplies: [...quickReplies] } : {}),
    };
    state.outboundLogs.push(logEntry);
    sentMessages.push(logEntry);

    for (const t of eligible) {
      decisions.push({
        orgId,
        recipientId,
        triggerId: t.id,
        triggerType: t.triggerType,
        questionKey: t.questionKey,
        channel,
        outcome: 'sent',
        reason: `Terkirim sebagai ringkasan terpadu (${questionKeys.length} item) via ${channel}.`,
      });
    }
  }

  // 8. Kirim eskalasi ke atasan (juga wajib tunduk pada anggaran gangguan atasan!)
  if (!policy.orgKillSwitch && !inQuietHours) {
    for (const { supervisor, pausedMembers } of pendingEscalations.values()) {
      if (resolveEffectiveOptOut(orgId, supervisor, state, gatewayState, bindings)) {
        continue;
      }
      const supCountKey = `${orgId}::${supervisor.memberId}::${clock.localDate}`;
      const supSentToday = state.sentCountByMemberDate.get(supCountKey) ?? 0;
      if (supSentToday >= maxPerDay) {
        continue;
      }
      const supAdapter = adapters.get(supervisor.preferredChannel);
      if (!supAdapter) continue;

      const escLines: string[] = [];
      const escQuestionKeys: string[] = [];
      for (const [memberLabel, items] of pausedMembers.entries()) {
        escLines.push(
          `- ${memberLabel} belum merespons (${items.map((i) => i.triggerType).join(', ')})`,
        );
        for (const i of items) {
          escQuestionKeys.push(`esc:${i.questionKey}`);
        }
      }

      const escContent = `Eskalasi Atasan (${pausedMembers.size} anggota tidak merespons):\n${escLines.join('\n')}`;
      const formattedEsc = supAdapter.formatOutbound({
        orgId,
        recipientId: supervisor.memberId,
        recipients: [supervisor.externalHandle],
        channelType: supervisor.preferredChannel,
        content: escContent,
        questionKeys: escQuestionKeys,
      });

      const escSend = supAdapter.send(formattedEsc);
      if (escSend.ok) {
        state.sentCountByMemberDate.set(supCountKey, supSentToday + 1);
        const escLog: OutboundMessageLog = {
          orgId,
          recipientId: supervisor.memberId,
          channel: supervisor.preferredChannel,
          sentAt: clock.isoUtc,
          localDate: clock.localDate,
          questionKeys: escQuestionKeys,
          content: formattedEsc.body,
          outcome: 'escalated_to_supervisor',
          externalMessageId: escSend.externalMessageId,
        };
        state.outboundLogs.push(escLog);
        escalations.push(escLog);
      }
    }
  }

  return {
    orgId,
    localDate: clock.localDate,
    localHour: clock.localHour,
    inQuietHours,
    sentMessages,
    escalations,
    deferred,
    decisions,
  };
}

// ============================================================================
// Ringkasan Harian Pemilik <= 5 Baris (Deterministik & Ber-Provenance)
// ============================================================================

export type OwnerDailySummaryInput = {
  orgId: string;
  asOfDate: string;
  source: string;
  cashBalanceRupiah: number;
  cashInTodayRupiah: number;
  cashOutTodayRupiah: number;
  presentWorkers: number;
  expectedWorkers: number;
  avgProgressPct: number;
  plannedProgressPct: number;
  pendingApprovalsCount: number;
  pendingApprovalTopItem?: string;
  riskAlertCount: number;
  topRiskAlert?: string;
};

export type OwnerDailySummaryResult = {
  orgId: string;
  asOfDate: string;
  lines: [string, string, string, string, string];
  text: string;
  lineCount: number;
  metrics: {
    cashBalanceRupiah: number;
    cashInTodayRupiah: number;
    cashOutTodayRupiah: number;
    presentWorkers: number;
    expectedWorkers: number;
    avgProgressPct: number;
    plannedProgressPct: number;
    pendingApprovalsCount: number;
    riskAlertCount: number;
  };
  provenance: {
    source: string;
    asOfDate: string;
    deterministic: true;
    ledgerBacked: true;
  };
};

function fmtRp(amount: number): string {
  const integer = toRupiah(amount);
  const formatted = Math.abs(integer)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return integer < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

function cleanSingleLine(value: string | undefined, fallback: string): string {
  const cleaned = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  return cleaned || fallback;
}

/**
 * Menyusun Ringkasan Harian Pemilik tepat <= 5 baris deterministik dari angka buku besar & lapangan:
 * (1) Kas, (2) Kehadiran, (3) Progres, (4) Keputusan, (5) Risiko/Peringatan.
 */
export function buildOwnerDailySummary5Lines(
  input: OwnerDailySummaryInput,
): OwnerDailySummaryResult {
  const cashBalanceRupiah = toRupiah(input.cashBalanceRupiah);
  const cashInTodayRupiah = toRupiah(input.cashInTodayRupiah);
  const cashOutTodayRupiah = toRupiah(input.cashOutTodayRupiah);
  const presentWorkers = Math.max(0, Math.trunc(input.presentWorkers));
  const expectedWorkers = Math.max(0, Math.trunc(input.expectedWorkers));
  const avgProgressPct = Math.max(0, Math.min(100, Math.round(input.avgProgressPct)));
  const plannedProgressPct = Math.max(0, Math.min(100, Math.round(input.plannedProgressPct)));
  const pendingApprovalsCount = Math.max(0, Math.trunc(input.pendingApprovalsCount));
  const riskAlertCount = Math.max(0, Math.trunc(input.riskAlertCount));

  const line1 = `1. Kas: Saldo ${fmtRp(cashBalanceRupiah)} (Masuk ${fmtRp(cashInTodayRupiah)}, Keluar ${fmtRp(cashOutTodayRupiah)})`;
  const line2 = `2. Kehadiran: ${presentWorkers}/${expectedWorkers} personel hadir`;
  const line3 = `3. Progres: Rata-rata ${avgProgressPct}% (rencana ${plannedProgressPct}%)`;
  const line4 =
    pendingApprovalsCount > 0
      ? `4. Keputusan: ${pendingApprovalsCount} menunggu persetujuan (${cleanSingleLine(input.pendingApprovalTopItem, 'tinjau draf')})`
      : '4. Keputusan: 0 tertunda';
  const line5 =
    riskAlertCount > 0
      ? `5. Risiko: ${riskAlertCount} peringatan (${cleanSingleLine(input.topRiskAlert, 'perlu perhatian')})`
      : '5. Risiko: 0 peringatan kritis';

  const lines: [string, string, string, string, string] = [
    line1,
    line2,
    line3,
    line4,
    line5,
  ];
  const text = lines.join('\n');

  return {
    orgId: String(input.orgId ?? '').trim(),
    asOfDate: String(input.asOfDate ?? '').trim(),
    lines,
    text,
    lineCount: lines.length,
    metrics: {
      cashBalanceRupiah,
      cashInTodayRupiah,
      cashOutTodayRupiah,
      presentWorkers,
      expectedWorkers,
      avgProgressPct,
      plannedProgressPct,
      pendingApprovalsCount,
      riskAlertCount,
    },
    provenance: {
      source: cleanSingleLine(input.source, 'buku_besar_froyek'),
      asOfDate: String(input.asOfDate ?? '').trim(),
      deterministic: true,
      ledgerBacked: true,
    },
  };
}
