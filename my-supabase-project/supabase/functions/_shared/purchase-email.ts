import {
  EMAIL_BRANDS,
  emailGreeting,
  emailNoticeBox,
  emailParagraph,
  emailPrimaryButton,
  emailSummaryCard,
  formatIdr,
  monefyiEmailShell,
} from "./monefyi-email-layout.ts";

export type PurchaseEmailParams = {
  appUrl: string;
  /** Full SPA base incl. /app — e.g. https://estimator.froyek.com/app */
  appBaseUrl?: string;
  name: string;
  planLabel: string;
  amount: number;
  refId: string;
  expiresLabel?: string | null;
  isNewUser: boolean;
  setupPasswordUrl?: string | null;
  /** False for non-Estimator Froyek Pro subscriptions; defaults true for legacy callers. */
  isEstimator?: boolean;
};

export function purchaseEmailSubject(planLabel: string): string {
  return `Pembayaran ${planLabel} berhasil — Froyek`;
}

export function purchaseEmailHtml(params: PurchaseEmailParams): string {
  const isEstimator = params.isEstimator ?? !params.expiresLabel;
  const brand = isEstimator ? EMAIL_BRANDS.estimator : EMAIL_BRANDS.planner;
  const appBase = (params.appBaseUrl || `${params.appUrl.replace(/\/$/, "")}/app`).replace(/\/$/, "");
  const targetUrl = isEstimator ? `${appBase}/estimator` : appBase;

  const intro = params.isNewUser
    ? (isEstimator
      ? "Akun Anda sudah dibuat. Atur password lalu masuk ke aplikasi Estimator."
      : "Akun Anda sudah dibuat. Atur password lalu masuk ke aplikasi Froyek.")
    : "Pembayaran Anda sudah diproses. Login dengan email dan password yang sama.";

  const expiryRow = params.expiresLabel
    ? { label: "Berlaku s/d", value: params.expiresLabel }
    : { label: "Masa aktif", value: "Selamanya (lisensi Estimator)" };

  const ctaBlock = params.isNewUser && params.setupPasswordUrl
    ? emailNoticeBox(
      "<strong>Langkah berikutnya:</strong> buat password Anda (link sekali pakai, jangan dibagikan).",
      "success",
    ) + emailPrimaryButton("Atur password & masuk", params.setupPasswordUrl, brand.accent)
    : emailPrimaryButton("Buka Froyek", targetUrl, brand.accent);

  const bodyHtml = [
    emailGreeting(params.name),
    emailParagraph(intro),
    emailSummaryCard([
      { label: "Paket", value: params.planLabel },
      { label: "Total", value: `Rp ${formatIdr(params.amount)}` },
      { label: "Referensi", value: params.refId || "—" },
      expiryRow,
    ]),
    ctaBlock,
  ].join("");

  return monefyiEmailShell({
    brand,
    title: "Konfirmasi pembayaran",
    preheader: `${params.planLabel} · Rp ${formatIdr(params.amount)}`,
    bodyHtml,
  });
}

export function purchaseEmailText(params: PurchaseEmailParams): string {
  const isEstimator = params.isEstimator ?? !params.expiresLabel;
  const appBase = (params.appBaseUrl || `${params.appUrl.replace(/\/$/, "")}/app`).replace(/\/$/, "");
  const targetUrl = isEstimator ? `${appBase}/estimator` : appBase;
  const lines = [
    `Konfirmasi pembayaran — ${params.planLabel}`,
    `Total: Rp ${formatIdr(params.amount)}`,
    `Ref: ${params.refId || "-"}`,
  ];
  if (params.expiresLabel) lines.push(`Berlaku s/d: ${params.expiresLabel}`);
  if (params.isNewUser && params.setupPasswordUrl) {
    lines.push("", "Atur password:", params.setupPasswordUrl);
  } else {
    lines.push("", `Buka aplikasi: ${targetUrl}`);
  }
  return lines.join("\n");
}

/** Re-export for invitation / password CTA blocks in other templates */
export {
  emailPrimaryButton,
  emailParagraph,
  monefyiEmailShell,
} from "./monefyi-email-layout.ts";
