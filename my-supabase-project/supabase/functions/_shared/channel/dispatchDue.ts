import { orgToday } from "../domain/dates.ts";
import { maySend, openSecret, redactSecrets } from "./channelGate.ts";
import { telegramSend } from "./channelProvider.ts";
import {
  followUpFor,
  profileFromDocument,
  progressQuestion,
  shouldAskField,
  type FieldProfile,
  type OpenQuestion,
} from "./fieldProgress.ts";

type Admin = { from: (table: string) => any };

type Project = { id: string; org_id: string; name: string };
type Stage = { id: string; project_id: string; name: string };
type Identity = { org_id: string; user_id: string; telegram_user_id: string; chat_id: string; role: "worker" | "manager" | "owner" };
type QuestionRow = {
  id: string;
  org_id: string;
  project_id: string;
  work_item_id: string | null;
  project_label: string;
  stage_label: string;
  telegram_user_id: string | null;
  chat_id: string | null;
  asked_at: string;
  asked_on: string;
  reminded: boolean;
  status: OpenQuestion["status"];
  answer: string | null;
  note: string;
  photo_path: string | null;
};

function asQuestion(row: QuestionRow): OpenQuestion {
  return {
    projectId: row.project_id,
    projectLabel: row.project_label,
    stageLabel: row.stage_label,
    askedAt: Date.parse(row.asked_at),
    reminded: row.reminded,
    status: row.status,
    answer: row.answer as OpenQuestion["answer"],
    note: row.note,
    photoPath: row.photo_path,
  };
}

async function tokenFor(admin: Admin, orgId: string, secrets: string[]): Promise<string | null> {
  const key = Deno.env.get("CHANNEL_SECRET_KEY") ?? "";
  if (!key) return null;
  const { data } = await admin.from("planner_channel_secrets").select("ciphertext").eq("org_id", orgId).maybeSingle();
  if (!data?.ciphertext) return null;
  const token = await openSecret(String(data.ciphertext), key);
  secrets.push(token);
  return token;
}

async function notifyOwner(admin: Admin, orgId: string, projectId: string, message: string) {
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
  const { data: prior } = await admin.from("planner_notifications").select("id").eq("project_id", projectId).eq("type", "channel_field").eq("message", message).gte("created_at", since).limit(1);
  if (prior?.length) return;
  const { data: owners } = await admin.from("planner_org_members").select("user_id").eq("org_id", orgId).eq("role", "owner").eq("status", "active");
  for (const owner of (owners ?? []) as { user_id: string }[]) {
    await admin.from("planner_notifications").insert({
      user_id: owner.user_id,
      org_id: orgId,
      project_id: projectId,
      type: "channel_field",
      title: "Progres lapangan",
      message,
      data: {},
    });
  }
}

export async function dispatchDue(admin: Admin, now = new Date()): Promise<{ asked: number; reminded: number }> {
  const secrets: string[] = [];
  let asked = 0;
  let reminded = 0;
  try {
    const [{ data: projects }, { data: orgs }, { data: docs }, { data: settings }, { data: identities }, { data: stages }, { data: questions }] = await Promise.all([
      admin.from("planner_projects").select("id, org_id, name").eq("status", "active"),
      admin.from("planner_organizations").select("id, timezone"),
      admin.from("planner_company_profiles").select("org_id, document"),
      admin.from("planner_agent_settings").select("org_id, kill_switch"),
      admin.from("planner_channel_identities").select("org_id, user_id, telegram_user_id, chat_id, role"),
      admin.from("planner_work_items").select("id, project_id, name, parent_id, status").is("parent_id", null).in("status", ["pending", "in_progress"]),
      admin.from("planner_channel_questions").select("id, org_id, project_id, work_item_id, project_label, stage_label, telegram_user_id, chat_id, asked_at, asked_on, reminded, status, answer, note, photo_path").gte("asked_at", new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()),
    ]);
    const identityRows = (identities ?? []) as Identity[];
    const peopleIds = identityRows.map((item) => item.user_id);
    const people = peopleIds.length
      ? ((await admin.from("profiles").select("id, name").in("id", peopleIds)).data ?? []) as { id: string; name: string | null }[]
      : [];
    const killed = new Set(((settings ?? []) as { org_id: string; kill_switch: boolean }[]).filter((item) => item.kill_switch).map((item) => item.org_id));
    const zone = new Map(((orgs ?? []) as { id: string; timezone: string | null }[]).map((item) => [item.id, item.timezone || "Asia/Jakarta"]));
    const profileOf = new Map<string, FieldProfile>();
    for (const doc of (docs ?? []) as { org_id: string; document: unknown }[]) {
      profileOf.set(doc.org_id, profileFromDocument(doc.document, zone.get(doc.org_id) || "Asia/Jakarta"));
    }
    const questionRows = (questions ?? []) as QuestionRow[];
    const stageRows = (stages ?? []) as (Stage & { parent_id: string | null })[];

    for (const project of (projects ?? []) as Project[]) {
      if (killed.has(project.org_id)) continue;
      const profile = profileOf.get(project.org_id) ?? profileFromDocument(null, zone.get(project.org_id) || "Asia/Jakarta");
      const today = orgToday(profile.timezone, now);
      const projectStages = stageRows.filter((item) => item.project_id === project.id).slice(0, 5);
      const targets = projectStages.length ? projectStages : [{ id: "", project_id: project.id, name: "progres keseluruhan" }];
      let sentForProject = 0;
      for (const stage of targets) {
        if (sentForProject >= 5) break;
        const existing = questionRows.find((item) => item.project_id === project.id && (item.work_item_id ?? "") === stage.id && item.asked_on === today);
        if (existing?.status === "siap_kirim" && existing.chat_id) {
          const token = await tokenFor(admin, project.org_id, secrets);
          const prompt = progressQuestion(project.name, stage.name);
          if (token) {
            const sent = await telegramSend(token, { chatId: existing.chat_id, text: prompt.text, buttons: [...prompt.buttons] });
            if (sent.ok) await admin.from("planner_channel_questions").update({ status: "menunggu" }).eq("id", existing.id);
          }
          continue;
        }
        const decision = shouldAskField(profile, project.name, now, existing ? today : null);
        if (!decision.ask) {
          if (decision.questions.length) await notifyOwner(admin, project.org_id, project.id, decision.questions.join(" "));
          continue;
        }
        const person = people.find((item) => item.name === decision.personLabel);
        const identity = identityRows.find((item) => item.org_id === project.org_id && item.user_id === person?.id);
        if (!identity) {
          await notifyOwner(admin, project.org_id, project.id, `Penanggung jawab ${decision.personLabel} belum menautkan Telegram.`);
          continue;
        }
        const allowed = maySend({ verified: true, killSwitch: false, purpose: "send_progress_question" });
        if (!allowed.ok) continue;
        const token = await tokenFor(admin, project.org_id, secrets);
        if (!token) continue;
        const prompt = progressQuestion(project.name, stage.name);
        const inserted = await admin.from("planner_channel_questions").insert({
          org_id: project.org_id,
          project_id: project.id,
          work_item_id: stage.id || null,
          project_label: project.name,
          stage_label: stage.name,
          telegram_user_id: identity.telegram_user_id,
          chat_id: identity.chat_id,
          asked_on: today,
          status: "siap_kirim",
        }).select("id").single();
        if (!inserted.data?.id) continue;
        const sent = await telegramSend(token, { chatId: identity.chat_id, text: prompt.text, buttons: [...prompt.buttons] });
        if (!sent.ok) continue;
        await admin.from("planner_channel_questions").update({ status: "menunggu" }).eq("id", inserted.data.id);
        await admin.from("planner_channel_messages").insert({
          org_id: project.org_id,
          telegram_user_id: identity.telegram_user_id,
          direction: "outbound",
          message_type: "button",
          summary: prompt.text,
          status: "sent",
        });
        asked += 1;
        sentForProject += 1;
      }
    }

    for (const row of questionRows) {
      if (killed.has(row.org_id) || !row.chat_id || !row.telegram_user_id) continue;
      const profile = profileOf.get(row.org_id) ?? profileFromDocument(null, zone.get(row.org_id) || "Asia/Jakarta");
      const follow = followUpFor(asQuestion(row), profile, now.getTime());
      if (follow === "wait") continue;
      if (follow === "tanya_pemilik") {
        await notifyOwner(admin, row.org_id, row.project_id, "Batas balasan progres belum diisi di profil perusahaan.");
        continue;
      }
      if (follow === "notify_owner") {
        await notifyOwner(admin, row.org_id, row.project_id, `${row.stage_label} di ${row.project_label} belum dijawab.`);
        await admin.from("planner_channel_questions").update({ status: "diingatkan" }).eq("id", row.id);
        reminded += 1;
        continue;
      }
      const allowed = maySend({ verified: true, killSwitch: false, purpose: "remind_progress" });
      const token = await tokenFor(admin, row.org_id, secrets);
      if (!allowed.ok || !token) continue;
      const sent = await telegramSend(token, { chatId: row.chat_id, text: `Pengingat: progres ${row.project_label}, tahap ${row.stage_label}?` });
      if (!sent.ok) continue;
      await admin.from("planner_channel_questions").update({ reminded: true }).eq("id", row.id);
      reminded += 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "galat jadwal";
    console.error(redactSecrets(message, secrets));
  }
  return { asked, reminded };
}
