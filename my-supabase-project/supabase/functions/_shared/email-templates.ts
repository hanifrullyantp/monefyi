import {
  EMAIL_BRANDS,
  emailGreeting,
  emailParagraph,
  emailPrimaryButton,
  monefyiEmailShell,
  type MonefyiEmailBrand,
} from "./monefyi-email-layout.ts";

export function invitationEmailHtml(params: {
  orgName: string;
  role: string;
  inviterName: string;
  joinUrl: string;
  personalMessage?: string;
  brandColor?: string;
}): string {
  const brand: MonefyiEmailBrand = {
    ...EMAIL_BRANDS.planner,
    accent: params.brandColor || EMAIL_BRANDS.planner.accent,
    accentMuted: params.brandColor || EMAIL_BRANDS.planner.accentMuted,
  };
  const bodyHtml = [
    emailParagraph(`<strong>${params.inviterName}</strong> mengundang Anda bergabung ke <strong>${params.orgName}</strong> sebagai <strong>${params.role}</strong>.`),
    params.personalMessage
      ? `<div style="margin:16px 0;padding:14px;background:#f1f5f9;border-radius:12px;font-size:14px;color:#475569;">${params.personalMessage}</div>`
      : "",
    emailPrimaryButton("Terima undangan", params.joinUrl, brand.accent),
  ].join("");
  return monefyiEmailShell({
    brand,
    title: params.orgName,
    preheader: `Undangan ${params.role} · Monefyi Planner`,
    bodyHtml,
  });
}

export function invitationEmailText(params: {
  orgName: string;
  role: string;
  inviterName: string;
  joinUrl: string;
  personalMessage?: string;
}): string {
  return `${params.inviterName} mengundang Anda bergabung ${params.orgName} sebagai ${params.role}.\n\n${params.personalMessage || ""}\n\nTerima undangan: ${params.joinUrl}`;
}

export function welcomeOwnerHtml(orgName: string, appUrl: string): string {
  const brand = EMAIL_BRANDS.planner;
  const bodyHtml = [
    emailParagraph(`Organisasi <strong>${orgName}</strong> siap digunakan.`),
    emailPrimaryButton("Lanjutkan onboarding", `${appUrl.replace(/\/$/, "")}/onboarding/owner`, brand.accent),
  ].join("");
  return monefyiEmailShell({
    brand,
    title: "Selamat datang, Owner!",
    preheader: "Setup organisasi Anda",
    bodyHtml,
  });
}

export function joinRequestHtml(params: {
  requesterName: string;
  requesterEmail: string;
  orgName: string;
  message?: string;
  reviewUrl: string;
}): string {
  const brand = EMAIL_BRANDS.planner;
  const bodyHtml = [
    emailParagraph(`<strong>${params.requesterName}</strong> (${params.requesterEmail}) ingin bergabung ke <strong>${params.orgName}</strong>.`),
    params.message
      ? `<div style="margin:16px 0;padding:14px;background:#f1f5f9;border-radius:12px;">${params.message}</div>`
      : "",
    emailPrimaryButton("Tinjau permintaan", params.reviewUrl, brand.accent),
  ].join("");
  return monefyiEmailShell({
    brand,
    title: "Permintaan bergabung",
    bodyHtml,
  });
}

export function authActionEmailHtml(params: {
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  brand?: MonefyiEmailBrand;
}): string {
  const brand = params.brand || EMAIL_BRANDS.planner;
  const bodyHtml = [
    emailParagraph(params.body),
    emailPrimaryButton(params.actionLabel, params.actionUrl, brand.accent),
  ].join("");
  return monefyiEmailShell({
    brand,
    title: params.title,
    bodyHtml,
  });
}

export function authActionEmailText(params: {
  title: string;
  body: string;
  actionUrl: string;
}): string {
  return `${params.title}\n\n${params.body}\n\n${params.actionUrl}`;
}

export function roleChangedHtml(params: { orgName: string; newRole: string }): string {
  const brand = EMAIL_BRANDS.planner;
  return monefyiEmailShell({
    brand,
    title: "Peran diperbarui",
    bodyHtml: emailParagraph(`Peran Anda di <strong>${params.orgName}</strong> diubah menjadi <strong>${params.newRole}</strong>.`),
  });
}

export function requestStatusHtml(params: { orgName: string; approved: boolean; reason?: string }): string {
  const brand = EMAIL_BRANDS.planner;
  return monefyiEmailShell({
    brand,
    title: params.approved ? "Permintaan disetujui" : "Permintaan ditolak",
    bodyHtml: [
      emailParagraph(`Permintaan bergabung ke <strong>${params.orgName}</strong> ${params.approved ? "disetujui" : "ditolak"}.`),
      params.reason ? emailParagraph(`Alasan: ${params.reason}`) : "",
    ].join(""),
  });
}

export function memberRemovedHtml(orgName: string): string {
  const brand = EMAIL_BRANDS.planner;
  return monefyiEmailShell({
    brand,
    title: "Akses dihapus",
    bodyHtml: emailParagraph(`Anda telah dihapus dari <strong>${orgName}</strong>.`),
  });
}

export function welcomeMemberHtml(orgName: string, appUrl: string): string {
  const brand = EMAIL_BRANDS.planner;
  const bodyHtml = [
    emailParagraph(`Anda bergabung dengan <strong>${orgName}</strong>.`),
    emailPrimaryButton("Masuk ke Monefyi Planner", `${appUrl.replace(/\/$/, "")}/login`, brand.accent),
  ].join("");
  return monefyiEmailShell({
    brand,
    title: "Selamat datang!",
    bodyHtml,
  });
}
