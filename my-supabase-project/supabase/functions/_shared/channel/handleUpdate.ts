import { orgToday } from "../domain/dates.ts";
import { allowMessage, maySend, openSecret, redactSecrets, sha256Hex } from "./channelGate.ts";
import { acknowledgeCallback, downloadTelegramFile, telegramSend, type ParsedUpdate } from "./channelProvider.ts";
import {
  confirmationCard,
  interpretInbound,
  profileFromDocument,
  progressNeedsOwner,
  type OpenQuestion,
} from "./fieldProgress.ts";

type Admin = {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
  storage: { from: (bucket: string) => { upload: (path: string, body: Blob, options?: Record<string, unknown>) => Promise<unknown> } };
};

const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

function summaryOf(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

async function orgToken(admin: Admin, orgId: string, secrets: string[]): Promise<string | null> {
  const key = Deno.env.get("CHANNEL_SECRET_KEY") ?? "";
  if (!key) return null;
  const { data } = await admin.from("planner_channel_secrets").select("ciphertext").eq("org_id", orgId).maybeSingle();
  if (!data?.ciphertext) return null;
  const token = await openSecret(String(data.ciphertext), key);
  secrets.push(token);
  return token;
}

function asQuestion(row: Record<string, unknown>): OpenQuestion {
  return {
    projectId: String(row.project_id),
    projectLabel: String(row.project_label),
    stageLabel: String(row.stage_label),
    askedAt: Date.parse(String(row.asked_at)),
    reminded: Boolean(row.reminded),
    status: String(row.status) as OpenQuestion["status"],
    answer: row.answer ? String(row.answer) as OpenQuestion["answer"] : null,
    note: String(row.note ?? ""),
    photoPath: row.photo_path ? String(row.photo_path) : null,
  };
}

async function logMessage(admin: Admin, input: {
  orgId: string | null;
  telegramUserId: string;
  messageType: string;
  summary: string;
  status: string;
  runId?: string | null;
}) {
  await admin.from("planner_channel_messages").insert({
    org_id: input.orgId,
    telegram_user_id: input.telegramUserId,
    direction: "inbound",
    message_type: input.messageType,
    summary: input.summary,
    run_id: input.runId ?? null,
    status: input.status,
  });
}

export async function handleUpdate(admin: Admin, update: ParsedUpdate): Promise<void> {
  const secrets: string[] = [];
  try {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recent = await admin
      .from("planner_channel_messages")
      .select("created_at")
      .eq("telegram_user_id", update.telegramUserId)
      .gte("created_at", since);
    const stamps = ((recent.data ?? []) as { created_at: string }[]).map((row) => Date.parse(row.created_at));
    if (!allowMessage(stamps, Date.now())) {
      await logMessage(admin, {
        orgId: null,
        telegramUserId: update.telegramUserId,
        messageType: update.type,
        summary: "batas laju",
        status: "rate_limited",
      });
      return;
    }

    const identityRes = await admin
      .from("planner_channel_identities")
      .select("org_id, user_id, role, telegram_user_id, verified_at")
      .eq("telegram_user_id", update.telegramUserId)
      .maybeSingle();
    const row = identityRes.data as { org_id: string; user_id: string; role: "worker" | "manager" | "owner"; verified_at: string } | null;

    if (!row && CODE_PATTERN.test(update.text.trim())) {
      const hash = await sha256Hex(update.text.trim());
      const redeemed = await admin.rpc("planner_channel_redeem", {
        p_hash: hash,
        p_telegram_user_id: update.telegramUserId,
        p_chat_id: update.chatId,
      });
      const linked = Array.isArray(redeemed.data) ? redeemed.data[0] as { org_id?: string } | undefined : null;
      await logMessage(admin, {
        orgId: linked?.org_id ?? null,
        telegramUserId: update.telegramUserId,
        messageType: "text",
        summary: "kode tautan",
        status: linked?.org_id ? "linked" : "ignored",
      });
      return;
    }

    if (!row) {
      await logMessage(admin, {
        orgId: null,
        telegramUserId: update.telegramUserId,
        messageType: update.type,
        summary: summaryOf(update.text || update.type),
        status: "ignored",
      });
      return;
    }

    const token = await orgToken(admin, row.org_id, secrets);
    if (update.callbackId && token) await acknowledgeCallback(token, update.callbackId);

    const openRes = await admin
      .from("planner_channel_questions")
      .select("id, project_id, project_label, stage_label, asked_at, reminded, status, answer, note, photo_path")
      .eq("telegram_user_id", update.telegramUserId)
      .in("status", ["menunggu", "perlu_foto"])
      .order("asked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const openRow = openRes.data as Record<string, unknown> | null;
    const orgRes = await admin.from("planner_organizations").select("timezone").eq("id", row.org_id).maybeSingle();
    const profileRes = await admin.from("planner_company_profiles").select("document").eq("org_id", row.org_id).maybeSingle();
    const fieldProfile = profileFromDocument(profileRes.data?.document, String(orgRes.data?.timezone || "Asia/Jakarta"));
    let text = update.text;
    let hasPhoto = update.type === "photo" || Boolean(openRow?.photo_path);
    let photoPath = openRow?.photo_path ? String(openRow.photo_path) : null;
    const date = orgToday(fieldProfile.timezone);

    if (update.fileId && token && openRow) {
      const bytes = await downloadTelegramFile(token, update.fileId);
      if (bytes) {
        const folder = update.type === "voice" ? "voice" : "photo";
        const path = `${row.org_id}/projects/${openRow.project_id}/${date}/${folder}-${update.updateId}`;
        const contentType = update.type === "voice" ? "audio/ogg" : "image/jpeg";
        await admin.storage.from("planner-field-media").upload(path, new Blob([bytes], { type: contentType }), { upsert: true, contentType });
        photoPath = path;
        if (update.type === "photo") hasPhoto = true;
        if (update.type === "voice") {
          const transcript = await transcribe(bytes);
          if (transcript) text = transcript;
        }
      }
    }

    const inbound = await interpretInbound({
      identity: {
        telegramUserId: update.telegramUserId,
        userId: row.user_id,
        orgId: row.org_id,
        role: row.role,
        verifiedAt: Date.parse(row.verified_at),
      },
      text,
      openCode: null,
      telegramUserId: update.telegramUserId,
      now: Date.now(),
      openQuestion: openRow ? { ...asQuestion(openRow), photoPath } : null,
      hasPhoto,
      aboveAuthority: progressNeedsOwner(row.role, fieldProfile),
    });

    if (inbound.kind !== "reply" || !openRow) {
      await logMessage(admin, {
        orgId: row.org_id,
        telegramUserId: update.telegramUserId,
        messageType: update.type,
        summary: inbound.kind === "ignore" ? inbound.summary : summaryOf(text || update.type),
        status: "ignored",
      });
      return;
    }

    const next = inbound.result.question;
    await admin.from("planner_channel_questions").update({
      status: next.status,
      answer: next.answer,
      note: next.note.slice(0, 500),
      photo_path: next.photoPath,
    }).eq("id", openRow.id);

    let runId: string | null = null;
    if (inbound.result.next === "prepare" || inbound.result.next === "antrean_pemilik") {
      const card = confirmationCard(next);
      const run = await admin.from("planner_agent_runs").insert({
        org_id: row.org_id,
        user_id: row.user_id,
        sop_id: card.sopId,
        tier: "rendah",
        autonomy: "L1",
        status: "active",
      }).select("id").single();
      runId = run.data?.id ? String(run.data.id) : null;
      if (runId) {
        await admin.from("planner_agent_actions").insert({
          run_id: runId,
          org_id: row.org_id,
          tool_name: card.tool,
          status: "draft",
          impact: { text: card.text, sop_id: card.sopId },
          sop_step: "siapkan_progres",
          policy_key: inbound.result.next === "antrean_pemilik" ? "update_progress" : null,
        });
      }
    }

    if (inbound.result.next === "minta_foto" && token) {
      const settings = await admin.from("planner_agent_settings").select("kill_switch").eq("org_id", row.org_id).maybeSingle();
      const allowed = maySend({ verified: true, killSwitch: Boolean(settings.data?.kill_switch), purpose: "ask_photo" });
      if (allowed.ok) await telegramSend(token, { chatId: update.chatId, text: "Tahap selesai wajib foto bukti." });
    }

    await logMessage(admin, {
      orgId: row.org_id,
      telegramUserId: update.telegramUserId,
      messageType: update.type,
      summary: summaryOf(text || next.answer || update.type),
      status: "received",
      runId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "galat kanal";
    console.error(redactSecrets(message, secrets));
  }
}

async function transcribe(bytes: Uint8Array): Promise<string> {
  const url = Deno.env.get("TRANSCRIBE_URL");
  if (!url) return "";
  const response = await fetch(url, { method: "POST", body: bytes });
  if (!response.ok) return "";
  const body = await response.json() as { text?: string };
  return typeof body.text === "string" ? body.text : "";
}
