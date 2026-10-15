/**
 * Shared transactional email layout for all Monefyi products (Resend / Edge Functions).
 * Table-based, inline CSS — safe for Gmail, Apple Mail, Outlook (basic).
 */

export type MonefyiEmailProduct = "finance" | "planner" | "estimator";

export type MonefyiEmailBrand = {
  product: MonefyiEmailProduct;
  /** Shown in header, e.g. "Monefyi" */
  productName: string;
  /** Accent + button color */
  accent: string;
  /** Subtle header gradient end */
  accentMuted: string;
  supportHint?: string;
};

export const EMAIL_BRANDS: Record<MonefyiEmailProduct, MonefyiEmailBrand> = {
  finance: {
    product: "finance",
    productName: "Monefyi",
    accent: "#10b981",
    accentMuted: "#059669",
    supportHint: "Butuh bantuan? Gunakan “Lupa password” di aplikasi atau balas email ini.",
  },
  planner: {
    product: "planner",
    productName: "Monefyi Planner",
    accent: "#6366f1",
    accentMuted: "#4f46e5",
    supportHint: "Butuh bantuan? Balas email ini atau hubungi admin organisasi Anda.",
  },
  estimator: {
    product: "estimator",
    productName: "Monefyi Estimator",
    accent: "#059669",
    accentMuted: "#047857",
    supportHint: "Butuh bantuan? Balas email ini atau hubungi support via WhatsApp.",
  },
};

export function resolveEmailBrandFromUrl(appUrl: string): MonefyiEmailBrand {
  const u = (appUrl || "").toLowerCase();
  if (u.includes("estimator")) return EMAIL_BRANDS.estimator;
  if (u.includes("planner")) return EMAIL_BRANDS.planner;
  if (u.includes("app.monefyi") || u.includes("//app.")) return EMAIL_BRANDS.finance;
  return EMAIL_BRANDS.planner;
}

/** Prefer redirect URL (per request), then MONEFYI_EMAIL_PRODUCT, then APP_URL env. */
export function resolveEmailBrand(redirectTo?: string): MonefyiEmailBrand {
  if (redirectTo?.trim()) {
    return resolveEmailBrandFromUrl(redirectTo);
  }
  const explicit = (Deno.env.get("MONEFYI_EMAIL_PRODUCT") || "").trim().toLowerCase();
  if (explicit === "finance" || explicit === "planner" || explicit === "estimator") {
    return EMAIL_BRANDS[explicit];
  }
  return resolveEmailBrandFromUrl(Deno.env.get("APP_URL") || "");
}

/** @deprecated use resolveEmailBrand */
export function resolveEmailBrandFromEnv(): MonefyiEmailBrand {
  return resolveEmailBrand();
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(Number(amount || 0));
}

export type EmailShellParams = {
  brand: MonefyiEmailBrand;
  title: string;
  preheader?: string;
  bodyHtml: string;
  footerExtra?: string;
};

/** Full HTML document wrapper with header, card, footer. */
export function monefyiEmailShell(params: EmailShellParams): string {
  const { brand, title, preheader, bodyHtml, footerExtra } = params;
  const pre = preheader ? escapeHtml(preheader) : escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${pre}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 16px;text-align:center;">
              <div style="display:inline-block;padding:10px 18px;border-radius:999px;background:linear-gradient(135deg,${brand.accent},${brand.accentMuted});color:#fff;font-weight:700;font-size:13px;letter-spacing:0.02em;">
                ${escapeHtml(brand.productName)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(15,23,42,0.06);padding:32px 28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f172a;font-weight:700;">${escapeHtml(title)}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.5;color:#94a3b8;">
              <p style="margin:0 0 8px;">${escapeHtml(brand.supportHint || "")}</p>
              ${footerExtra ? `<p style="margin:0;">${footerExtra}</p>` : ""}
              <p style="margin:12px 0 0;">© ${new Date().getUTCFullYear()} Monefyi · Email transaksional</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">${text}</p>`;
}

export function emailGreeting(name: string): string {
  const safe = escapeHtml(name.trim() || "there");
  return emailParagraph(`Halo <strong style="color:#0f172a;">${safe}</strong>,`);
}

export function emailPrimaryButton(label: string, href: string, accent: string): string {
  const url = escapeHtml(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
  <tr>
    <td style="border-radius:10px;background:${accent};">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#94a3b8;word-break:break-all;">Jika tombol tidak berfungsi, salin link:<br/><a href="${url}" style="color:${accent};">${url}</a></p>`;
}

export type SummaryRow = { label: string; value: string };

export function emailSummaryCard(rows: SummaryRow[]): string {
  const inner = rows.map((r) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#64748b;width:40%;vertical-align:top;">${escapeHtml(r.label)}</td>
      <td style="padding:8px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;vertical-align:top;">${escapeHtml(r.value)}</td>
    </tr>`).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:4px 16px;">
    ${inner}
  </table>`;
}

export function emailNoticeBox(html: string, variant: "info" | "success" = "info"): string {
  const bg = variant === "success" ? "#ecfdf5" : "#eff6ff";
  const border = variant === "success" ? "#a7f3d0" : "#bfdbfe";
  return `<div style="margin:16px 0;padding:14px 16px;background:${bg};border:1px solid ${border};border-radius:12px;font-size:14px;line-height:1.55;color:#334155;">${html}</div>`;
}
