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
  /** Full SPA base incl. /app — e.g. https://estimator.monefyi.com/app */
  appBaseUrl?: string;
  name: string;
  planLabel: string;
  amount: number;
  refId: string;
  expiresLabel?: string | null;
  isNewUser: boolean;
  setupPasswordUrl?: string | null;
};

export function purchaseEmailSubject(planLabel: string): string {
  return `Pembayaran ${planLabel} berhasil — Monefyi Estimator`;
}

export function purchaseEmailHtml(params: PurchaseEmailParams): string {
  const brand = EMAIL_BRANDS.estimator;
  const appBase = (params.appBaseUrl || `${params.appUrl.replace(/\/$/, "")}/app`).replace(/\/$/, "");
  const estimatorUrl = `${appBase}/estimator`;

  const intro = params.isNewUser
    ? "Akun Anda sudah dibuat. Atur password lalu masuk ke aplikasi Estimator."
    : "Pembayaran Anda sudah diproses. Login dengan email dan password yang sama.";

  const expiryRow = params.expiresLabel
    ? { label: "Berlaku s/d", value: params.expiresLabel }
    : { label: "Masa aktif", value: "Selamanya (lisensi Estimator)" };

  const ctaBlock = params.isNewUser && params.setupPasswordUrl
    ? emailNoticeBox(
      "<strong>Langkah berikutnya:</strong> buat password Anda (link sekali pakai, jangan dibagikan).",
      "success",
    ) + emailPrimaryButton("Atur password & masuk", params.setupPasswordUrl, brand.accent)
    : emailPrimaryButton("Buka Monefyi Estimator", estimatorUrl, brand.accent);

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
  const appBase = (params.appBaseUrl || `${params.appUrl.replace(/\/$/, "")}/app`).replace(/\/$/, "");
  const estimatorUrl = `${appBase}/estimator`;
  const lines = [
    `Konfirmasi pembayaran — ${params.planLabel}`,
    `Total: Rp ${formatIdr(params.amount)}`,
    `Ref: ${params.refId || "-"}`,
  ];
  if (params.expiresLabel) lines.push(`Berlaku s/d: ${params.expiresLabel}`);
  if (params.isNewUser && params.setupPasswordUrl) {
    lines.push("", "Atur password:", params.setupPasswordUrl);
  } else {
    lines.push("", `Buka aplikasi: ${estimatorUrl}`);
  }
  return lines.join("\n");
}

/** Re-export for invitation / password CTA blocks in other templates */
export {
  emailPrimaryButton,
  emailParagraph,
  monefyiEmailShell,
} from "./monefyi-email-layout.ts";
