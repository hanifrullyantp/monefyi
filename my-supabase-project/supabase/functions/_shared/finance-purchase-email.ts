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

export type FinancePurchaseEmailParams = {
  appUrl: string;
  name: string;
  planLabel: string;
  planType: "monthly" | "lifetime";
  qty: number;
  amount: number;
  refId: string;
  startLabel?: string | null;
  endLabel?: string | null;
  isNewUser: boolean;
  setupPasswordUrl?: string | null;
};

export function financePurchaseEmailSubject(): string {
  return "Pembayaran Monefyi berhasil — akun Anda aktif";
}

export function financePurchaseEmailHtml(params: FinancePurchaseEmailParams): string {
  const brand = EMAIL_BRANDS.finance;
  const appUrl = params.appUrl.replace(/\/$/, "");

  const intro = params.isNewUser
    ? "Terima kasih sudah berlangganan. Akun Anda sudah dibuat — atur password lewat tombol di bawah, lalu masuk ke aplikasi."
    : "Terima kasih sudah melakukan pembayaran. Paket Anda sudah diperbarui; login dengan email dan password yang sama.";

  const periodValue = params.planType === "lifetime"
    ? "Lifetime (selama layanan berjalan)"
    : params.endLabel
      ? `${params.startLabel || "-"} s/d ${params.endLabel}`
      : "Bulanan";

  const bodyHtml = [
    emailGreeting(params.name),
    emailParagraph(intro),
    emailSummaryCard([
      { label: "Paket", value: params.planLabel },
      ...(params.planType === "monthly"
        ? [{ label: "Durasi", value: `${params.qty} bulan` }]
        : []),
      { label: "Masa aktif", value: periodValue },
      { label: "Total", value: `Rp ${formatIdr(params.amount)}` },
      { label: "Referensi", value: params.refId || "—" },
    ]),
    params.isNewUser && params.setupPasswordUrl
      ? emailNoticeBox(
        "<strong>Langkah berikutnya:</strong> klik tombol untuk membuat password. Link sekali pakai dan kedaluwarsa — jangan bagikan ke orang lain.",
        "success",
      ) + emailPrimaryButton("Atur password & masuk", params.setupPasswordUrl, brand.accent)
      : emailPrimaryButton("Buka Monefyi", appUrl, brand.accent),
    !params.isNewUser
      ? emailParagraph("Password Anda <strong>tidak berubah</strong>. Jika lupa, gunakan <strong>Lupa password</strong> di halaman login.")
      : "",
  ].join("");

  return monefyiEmailShell({
    brand,
    title: "Konfirmasi pembayaran",
    preheader: `Paket ${params.planLabel} aktif · Rp ${formatIdr(params.amount)}`,
    bodyHtml,
  });
}

export function financePurchaseEmailText(params: FinancePurchaseEmailParams): string {
  const lines = [
    financePurchaseEmailSubject(),
    "",
    `Paket: ${params.planLabel}`,
    `Total: Rp ${formatIdr(params.amount)}`,
    `Ref: ${params.refId || "-"}`,
  ];
  if (params.isNewUser && params.setupPasswordUrl) {
    lines.push("", "Atur password:", params.setupPasswordUrl);
  } else {
    lines.push("", `Buka aplikasi: ${params.appUrl.replace(/\/$/, "")}`);
  }
  return lines.join("\n");
}
