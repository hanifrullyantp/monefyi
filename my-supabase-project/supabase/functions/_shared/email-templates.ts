export function invitationEmailHtml(params: {
  orgName: string;
  role: string;
  inviterName: string;
  joinUrl: string;
  personalMessage?: string;
  brandColor?: string;
}): string {
  const { orgName, role, inviterName, joinUrl, personalMessage, brandColor = "#6366f1" } = params;
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <h1 style="color:${brandColor};margin:0 0 8px">${orgName}</h1>
  <p style="color:#64748b;margin:0 0 24px">Undangan bergabung di Monefyi Planner</p>
  <p><strong>${inviterName}</strong> mengundang Anda sebagai <strong>${role}</strong>.</p>
  ${personalMessage ? `<p style="background:#f1f5f9;padding:12px;border-radius:8px">${personalMessage}</p>` : ""}
  <a href="${joinUrl}" style="display:inline-block;background:${brandColor};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:24px 0">Terima Undangan</a>
  <p style="color:#94a3b8;font-size:12px">Jika tombol tidak berfungsi, salin link: ${joinUrl}</p>
</div></body></html>`;
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
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <h1 style="color:#6366f1;margin:0 0 8px">Selamat datang, Owner!</h1>
  <p>Organisasi <strong>${orgName}</strong> siap digunakan di Monefyi Planner.</p>
  <a href="${appUrl}/onboarding/owner" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Lanjutkan onboarding</a>
</div></body></html>`;
}

export function joinRequestHtml(params: {
  requesterName: string;
  requesterEmail: string;
  orgName: string;
  message?: string;
  reviewUrl: string;
}): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <h1 style="color:#6366f1;margin:0 0 8px">Permintaan bergabung</h1>
  <p><strong>${params.requesterName}</strong> (${params.requesterEmail}) ingin bergabung ke <strong>${params.orgName}</strong>.</p>
  ${params.message ? `<p style="background:#f1f5f9;padding:12px;border-radius:8px">${params.message}</p>` : ""}
  <a href="${params.reviewUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Tinjau permintaan</a>
</div></body></html>`;
}

export function authActionEmailHtml(params: {
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
}): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <p style="color:#6366f1;font-weight:bold;margin:0 0 8px">Monefyi Planner</p>
  <h1 style="margin:0 0 16px;font-size:22px">${params.title}</h1>
  <p style="color:#475569;margin:0 0 24px">${params.body}</p>
  <a href="${params.actionUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">${params.actionLabel}</a>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">Jika tombol tidak berfungsi: ${params.actionUrl}</p>
</div></body></html>`;
}

export function authActionEmailText(params: {
  title: string;
  body: string;
  actionUrl: string;
}): string {
  return `${params.title}\n\n${params.body}\n\n${params.actionUrl}`;
}

export function roleChangedHtml(params: { orgName: string; newRole: string }): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px">
<h1>Peran diperbarui</h1>
<p>Peran Anda di ${params.orgName} diubah menjadi <strong>${params.newRole}</strong>.</p>
</body></html>`;
}

export function requestStatusHtml(params: { orgName: string; approved: boolean; reason?: string }): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px">
<h1>${params.approved ? "Permintaan disetujui" : "Permintaan ditolak"}</h1>
<p>Permintaan bergabung ke ${params.orgName} ${params.approved ? "disetujui" : "ditolak"}.</p>
${params.reason ? `<p>Alasan: ${params.reason}</p>` : ""}
</body></html>`;
}

export function memberRemovedHtml(orgName: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px">
<h1>Akses dihapus</h1>
<p>Anda telah dihapus dari ${orgName}.</p>
</body></html>`;
}

export function welcomeMemberHtml(orgName: string, appUrl: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <h1 style="color:#6366f1;margin:0 0 8px">Selamat datang!</h1>
  <p>Anda bergabung dengan <strong>${orgName}</strong>.</p>
  <a href="${appUrl}/login" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Masuk ke Monefyi</a>
</div></body></html>`;
}
