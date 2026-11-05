import { orgToday } from '../../packages/domain/src/dates.ts';
import { structuredError, type StructuredError } from '../../packages/domain/src/errors.ts';
import {
  intakeMessage,
  redeemLinkCode,
  type ChannelIdentity,
  type ChannelRole,
  type LinkCodeRecord,
} from './channelGate.ts';

export type FieldProfile = {
  timezone: string;
  policies: { key: string; domain: string; value: number }[];
  projectLeads: { projectLabel: string; personLabel: string }[];
  roles?: { actionKey: string; approvalLimitRupiah: number }[];
};

export type FieldStage = 'selesai' | 'belum' | 'kendala';

export type OpenQuestion = {
  projectId: string;
  projectLabel: string;
  stageLabel: string;
  askedAt: number;
  reminded: boolean;
  status: 'menunggu' | 'perlu_foto' | 'siap_konfirmasi' | 'menunggu_persetujuan' | 'diingatkan';
  answer: FieldStage | null;
  note: string;
  photoPath: string | null;
};

const BUTTONS: Record<string, FieldStage> = { selesai: 'selesai', belum: 'belum', 'ada kendala': 'kendala' };

function policyValue(profile: FieldProfile, key: string): number | null {
  const match = [...profile.policies].reverse().find((item) => item.key === key && (item.domain === 'proyek' || item.domain === 'semua'));
  return match ? match.value : null;
}

export function fieldSchedule(profile: FieldProfile, projectLabel: string):
  | { ok: true; askHour: number; replyMinutes: number; personLabel: string }
  | { ok: false; questions: string[] } {
  const questions: string[] = [];
  const askHour = policyValue(profile, 'jam_tanya_progres');
  const replyMinutes = policyValue(profile, 'batas_balasan_menit');
  const lead = profile.projectLeads.find((item) => item.projectLabel === projectLabel);
  if (askHour == null) questions.push('Tanyakan ke pemilik: jam_tanya_progres');
  if (replyMinutes == null) questions.push('Tanyakan ke pemilik: batas_balasan_menit');
  if (!lead) questions.push(`Tanyakan ke pemilik: penanggung jawab ${projectLabel}`);
  if (questions.length || askHour == null || replyMinutes == null || !lead) return { ok: false, questions };
  return { ok: true, askHour, replyMinutes, personLabel: lead.personLabel };
}

export function hourInZone(timeZone: string, now: Date): number {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(now)
    .find((part) => part.type === 'hour')?.value;
  return Number(hour ?? '0');
}

export function shouldAskField(profile: FieldProfile, projectLabel: string, now: Date, askedDate: string | null):
  | { ask: true; askHour: number; personLabel: string }
  | { ask: false; questions: string[] } {
  const schedule = fieldSchedule(profile, projectLabel);
  if (!schedule.ok) return { ask: false, questions: schedule.questions };
  const ask = hourInZone(profile.timezone, now) === schedule.askHour && orgToday(profile.timezone, now) !== askedDate;
  return ask
    ? { ask: true, askHour: schedule.askHour, personLabel: schedule.personLabel }
    : { ask: false, questions: [] };
}

export function classifyFieldReply(text: string): { kind: 'button'; stage: FieldStage } | { kind: 'teks'; text: string } {
  const stage = BUTTONS[text.trim().toLowerCase()];
  if (stage) return { kind: 'button', stage };
  return { kind: 'teks', text };
}

export function progressQuestion(projectLabel: string, stageLabel: string): { text: string; buttons: ['Selesai', 'Belum', 'Ada kendala'] } {
  return { text: `Progres ${projectLabel}, tahap ${stageLabel}?`, buttons: ['Selesai', 'Belum', 'Ada kendala'] };
}

export function progressNeedsOwner(role: ChannelRole, profile: FieldProfile): boolean {
  if (role === 'owner') return false;
  const limit = profile.roles?.find((item) => item.actionKey === 'update_progress');
  return limit != null && limit.approvalLimitRupiah === 0;
}

export function applyFieldReply(question: OpenQuestion, text: string, hasPhoto: boolean, aboveAuthority: boolean): {
  question: OpenQuestion;
  next: 'tetap' | 'prepare' | 'minta_foto' | 'antrean_pemilik';
  sopId: 'minta_update_progres_lapangan';
} {
  const reply = classifyFieldReply(text);
  const sopId = 'minta_update_progres_lapangan' as const;
  if (reply.kind === 'teks') return { question: { ...question, note: reply.text }, next: 'tetap', sopId };
  if (reply.stage === 'selesai' && !hasPhoto) {
    return { question: { ...question, status: 'perlu_foto', answer: 'selesai' }, next: 'minta_foto', sopId };
  }
  const status = aboveAuthority ? 'menunggu_persetujuan' : 'siap_konfirmasi';
  return {
    question: { ...question, status, answer: reply.stage, photoPath: question.photoPath },
    next: aboveAuthority ? 'antrean_pemilik' : 'prepare',
    sopId,
  };
}

export function confirmationCard(question: OpenQuestion): { text: string; sopId: string; tool: 'prepare_progress_update' } {
  return {
    text: `${question.stageLabel} di ${question.projectLabel}: ${question.answer ?? 'catatan'}. Konfirmasi di aplikasi.`,
    sopId: 'minta_update_progres_lapangan',
    tool: 'prepare_progress_update',
  };
}

export function fieldFollowUp(question: OpenQuestion, now: number, replyMinutes: number): 'wait' | 'remind' | 'notify_owner' {
  if (question.status !== 'menunggu' && question.status !== 'perlu_foto') return 'wait';
  if (now < question.askedAt + replyMinutes * 60 * 1000) return 'wait';
  return question.reminded ? 'notify_owner' : 'remind';
}

export function followUpFor(question: OpenQuestion, profile: FieldProfile, now: number): 'wait' | 'remind' | 'notify_owner' | 'tanya_pemilik' {
  const schedule = fieldSchedule(profile, question.projectLabel);
  if (!schedule.ok) return 'tanya_pemilik';
  return fieldFollowUp(question, now, schedule.replyMinutes);
}

export type StoredMedia = {
  kind: 'photo' | 'voice';
  storagePath: string;
  projectId: string;
  date: string;
  transcript: string | null;
};

export function mediaPath(projectId: string, date: string, fileName: string): string {
  return `projects/${projectId}/${date}/${fileName}`;
}

export function ingestPhoto(projectId: string, date: string, fileName: string): StoredMedia {
  return { kind: 'photo', storagePath: mediaPath(projectId, date, fileName), projectId, date, transcript: null };
}

export async function ingestVoice(
  bytes: Uint8Array,
  transcriber: (payload: Uint8Array) => Promise<string>,
  projectId: string,
  date: string,
  fileName: string,
): Promise<StoredMedia> {
  const transcript = await transcriber(bytes);
  return { kind: 'voice', storagePath: mediaPath(projectId, date, fileName), projectId, date, transcript };
}

export function profileFromDocument(document: unknown, timezone: string): FieldProfile {
  const body = document && typeof document === 'object' ? document as Record<string, unknown> : {};
  const policies = Array.isArray(body.policies)
    ? body.policies.flatMap((item) => {
      const row = item && typeof item === 'object' ? item as Record<string, unknown> : null;
      if (!row || typeof row.key !== 'string' || typeof row.domain !== 'string' || typeof row.value !== 'number') return [];
      return [{ key: row.key, domain: row.domain, value: row.value }];
    })
    : [];
  const projectLeads = Array.isArray(body.projectLeads)
    ? body.projectLeads.flatMap((item) => {
      const row = item && typeof item === 'object' ? item as Record<string, unknown> : null;
      if (!row || typeof row.projectLabel !== 'string' || typeof row.personLabel !== 'string') return [];
      return [{ projectLabel: row.projectLabel, personLabel: row.personLabel }];
    })
    : [];
  const roles = Array.isArray(body.roles)
    ? body.roles.flatMap((item) => {
      const row = item && typeof item === 'object' ? item as Record<string, unknown> : null;
      if (!row || typeof row.actionKey !== 'string' || typeof row.approvalLimitRupiah !== 'number') return [];
      return [{ actionKey: row.actionKey, approvalLimitRupiah: row.approvalLimitRupiah }];
    })
    : [];
  return { timezone: typeof body.timezone === 'string' ? body.timezone : timezone, policies, projectLeads, roles };
}

const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export async function interpretInbound(input: {
  identity: ChannelIdentity | null;
  text: string;
  openCode: LinkCodeRecord | null;
  telegramUserId: string;
  now: number;
  openQuestion: OpenQuestion | null;
  hasPhoto: boolean;
  aboveAuthority: boolean;
}): Promise<
  | { kind: 'linked'; identity: ChannelIdentity; reachedAgent: false }
  | { kind: 'ignore'; summary: string; orgId: string | null; reachedAgent: false }
  | { kind: 'code_error'; error: StructuredError; reachedAgent: false }
  | { kind: 'reply'; result: ReturnType<typeof applyFieldReply>; orgId: string; role: ChannelRole; reachedAgent: true }
> {
  if (!input.identity) {
    if (input.openCode && CODE_PATTERN.test(input.text.trim())) {
      const redeemed = await redeemLinkCode(input.openCode, input.text, input.telegramUserId, input.now);
      if (!redeemed.ok) return { kind: 'code_error', error: redeemed.error, reachedAgent: false };
      return { kind: 'linked', identity: redeemed.identity, reachedAgent: false };
    }
    const ignored = intakeMessage(null, input.text);
    return { kind: 'ignore', summary: ignored.summary, orgId: null, reachedAgent: false };
  }
  if (!input.openQuestion) {
    const logged = intakeMessage(input.identity, input.text);
    const summary = logged.action === 'data' ? logged.text.replace(/\s+/g, ' ').trim().slice(0, 160) : logged.summary;
    return { kind: 'ignore', summary, orgId: input.identity.orgId, reachedAgent: false };
  }
  return {
    kind: 'reply',
    result: applyFieldReply(input.openQuestion, input.text, input.hasPhoto, input.aboveAuthority),
    orgId: input.identity.orgId,
    role: input.identity.role,
    reachedAgent: true,
  };
}
