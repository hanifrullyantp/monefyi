import { authActionEmailHtml, authActionEmailText } from "./email-templates.ts";

function moneyIDR(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Number(n || 0));
}

export type PurchaseEmailParams = {
  appUrl: string;
  name: string;
  planLabel: string;
  amount: number;
  refId: string;
  expiresLabel?: string | null;
  isNewUser: boolean;
  setupPasswordUrl?: string | null;
};

export function purchaseEmailSubject(planLabel: string): string {
  return `Pembayaran ${planLabel} berhasil — Monefyi Planner`;
}

export function purchaseEmailHtml(params: PurchaseEmailParams): string {
  const intro = params.isNewUser
    ? "Akun Anda sudah dibuat. Atur password lalu masuk ke aplikasi."
    : "Pembayaran Anda sudah diproses. Login dengan email dan password yang sama.";

  const expiryBlock = params.expiresLabel
    ? `<p><strong>Berlaku s/d:</strong> ${params.expiresLabel}</p>`
    : `<p><strong>Masa aktif:</strong> Selamanya (lisensi Estimator).</p>`;

  const setupBlock = params.isNewUser && params.setupPasswordUrl
    ? authActionEmailHtml({
      title: "Atur password & masuk",
      body: "Klik tombol di bawah untuk membuat password dan mengaktifkan akun (link berlaku 24 jam).",
      actionLabel: "Atur password & masuk",
      actionUrl: params.setupPasswordUrl,
    })
    : `<a href="${params.appUrl}/app/estimator" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">Buka Monefyi Planner</a>`;

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
  <p style="color:#6366f1;font-weight:bold;margin:0 0 8px">Monefyi Planner</p>
  <h1 style="margin:0 0 12px;font-size:22px">Konfirmasi pembayaran</h1>
  <p style="color:#475569">Halo ${params.name || ""},</p>
  <p style="color:#475569">${intro}</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0">
    <p style="margin:0 0 8px"><strong>Paket:</strong> ${params.planLabel}</p>
    <p style="margin:0 0 8px"><strong>Total:</strong> Rp ${moneyIDR(params.amount)}</p>
    <p style="margin:0 0 8px"><strong>Referensi:</strong> ${params.refId || "-"}</p>
    ${expiryBlock}
  </div>
  ${setupBlock}
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">Butuh bantuan? Balas email ini atau hubungi support via WhatsApp.</p>
</div></body></html>`;
}

export function purchaseEmailText(params: PurchaseEmailParams): string {
  const lines = [
    `Konfirmasi pembayaran — ${params.planLabel}`,
    `Total: Rp ${moneyIDR(params.amount)}`,
    `Ref: ${params.refId || "-"}`,
  ];
  if (params.expiresLabel) lines.push(`Berlaku s/d: ${params.expiresLabel}`);
  if (params.isNewUser && params.setupPasswordUrl) {
    lines.push("", "Atur password:", params.setupPasswordUrl);
  } else {
    lines.push("", `Buka aplikasi: ${params.appUrl}/app/estimator`);
  }
  return lines.join("\n");
}
