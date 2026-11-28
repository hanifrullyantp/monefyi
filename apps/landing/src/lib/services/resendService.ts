export interface SendEmailOptions {
  to: string;
  name?: string;
  type: "payment_confirmation" | "account_access" | "password_reset" | "followup" | "froyek_help" | "froyek_access";
  subject?: string;
  planTier?: "free" | "standard" | "pro";
  amount?: number;
  paymentMethod?: string;
  resetLink?: string;
  appUrl?: string;
}

export interface SendEmailResult {
  ok: boolean;
  emailId?: string;
  status: "sent" | "delivered" | "failed" | "simulated";
  to: string;
  subject: string;
  sentAt: string;
  error?: string;
  warning?: string;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);
}

function escapeHtml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// 1. Template: Konfirmasi Pembayaran
function getPaymentConfirmationTemplate(opts: SendEmailOptions) {
  const name = escapeHtml(opts.name || "Pelanggan Froyek");
  const plan = escapeHtml((opts.planTier || "standard").toUpperCase());
  const amountStr = opts.amount ? formatCurrency(opts.amount) : "Rp 0 (Akses Gratis)";
  const method = escapeHtml((opts.paymentMethod || "QRIS").toUpperCase());
  const loginUrl = escapeHtml(opts.appUrl || "https://estimator.froyek.com/app/estimator");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Konfirmasi Pembayaran Froyek</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #065f46; padding: 32px 28px; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; background-color: #ffffff; border-radius: 12px; line-height: 44px; color: #065f46; font-size: 24px; font-weight: 900; margin-bottom: 12px;">F</div>
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Pembayaran Berhasil!</h1>
      <p style="color: #a7f3d0; margin: 6px 0 0; font-size: 14px;">Terima kasih, akun Froyek Anda telah aktif.</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Halo <strong>${name}</strong>,<br><br>
        Pesanan lisensi Froyek Anda telah berhasil kami terima dan diverifikasi. Berikut rincian transaksi Anda:
      </p>

      <!-- Invoice Box -->
      <div style="background-color: #f1f5f9; border-radius: 14px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Paket Layanan:</td>
            <td style="color: #0f172a; font-weight: 700; text-align: right; padding: 6px 0;">Estimator ${plan}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Metode Pembayaran:</td>
            <td style="color: #0f172a; font-weight: 700; text-align: right; padding: 6px 0;">${method}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Status Transaksi:</td>
            <td style="color: #059669; font-weight: 800; text-align: right; padding: 6px 0;">LUNAS / AKTIF ✔</td>
          </tr>
          <tr style="border-top: 1px dashed #cbd5e1;">
            <td style="color: #0f172a; font-weight: 800; padding: 12px 0 0; font-size: 15px;">Total Pembayaran:</td>
            <td style="color: #065f46; font-weight: 900; text-align: right; padding: 12px 0 0; font-size: 18px;">${amountStr}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #065f46; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(6, 95, 70, 0.25);">
          Buka Estimator & Mulai Proyek &rarr;
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-bottom: 0;">
        Jika Anda membutuhkan panduan penggunaan atau bantuan teknis, Anda dapat membalas email ini atau menghubungi WhatsApp Support kami kapan saja.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} Froyek. Hak Cipta Dilindungi.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// 2. Template: Aktivasi & Akses Akun (tanpa password)
function getAccountAccessTemplate(opts: SendEmailOptions) {
  const name = escapeHtml(opts.name || "Pelanggan Froyek");
  const email = escapeHtml(opts.to);
  const setupUrl = escapeHtml(opts.resetLink || opts.appUrl || "https://estimator.froyek.com/app/estimator");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aktivasi Akun Froyek</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #1e3a8a; padding: 32px 28px; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; background-color: #ffffff; border-radius: 12px; line-height: 44px; color: #1e3a8a; font-size: 24px; font-weight: 900; margin-bottom: 12px;">🔑</div>
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Aktivasi Akun Estimator Anda</h1>
      <p style="color: #bfdbfe; margin: 6px 0 0; font-size: 14px;">Atur kata sandi pribadi Anda melalui tautan aman di bawah ini.</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Halo <strong>${name}</strong>,<br><br>
        Akun Froyek Anda telah disiapkan untuk email <strong>${email}</strong>. Klik tombol berikut untuk mengatur kata sandi dan masuk ke aplikasi:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${setupUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          Atur Kata Sandi & Masuk ke Aplikasi &rarr;
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px;">
        Jika tombol tidak berfungsi, salin dan buka tautan berikut di browser Anda:<br>
        <a href="${setupUrl}" style="color: #2563eb; word-break: break-all; text-decoration: underline; font-size: 12px;">${setupUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} Froyek.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// 3. Template: Reset / Ubah Password
function getPasswordResetTemplate(opts: SendEmailOptions) {
  const name = escapeHtml(opts.name || "Pengguna Froyek");
  const loginUrl = escapeHtml(opts.resetLink || opts.appUrl || "https://froyek.com/reset-password");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Password Froyek</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #065f46; padding: 32px 28px; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; background-color: #ffffff; border-radius: 12px; line-height: 44px; color: #065f46; font-size: 24px; font-weight: 900; margin-bottom: 12px;">F</div>
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Reset Password</h1>
      <p style="color: #a7f3d0; margin: 6px 0 0; font-size: 14px;">Permintaan ubah password akun Froyek.</p>
    </div>

    <div style="padding: 32px 28px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Halo <strong>${name}</strong>,<br><br>
        Kami menerima permintaan reset password untuk akun Froyek Anda. Klik tombol di bawah untuk membuat password baru:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
          Reset Password
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.6; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px;">
        Jika tombol tidak berfungsi, salin dan buka link berikut di browser Anda:<br>
        <a href="${loginUrl}" style="color: #059669; word-break: break-all; text-decoration: underline; font-size: 12px;">${loginUrl}</a>
      </p>

      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 20px;">
        Jika Anda tidak merasa meminta reset password, Anda dapat mengabaikan email ini dengan aman.
      </p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} Froyek.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// 4. Template: Follow-Up Checkout Tertunda
function getFollowupTemplate(opts: SendEmailOptions) {
  const name = escapeHtml(opts.name || "Kakak");
  const checkoutUrl = "https://estimator.froyek.com/checkout";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lanjutkan Pendaftaran Froyek</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #065f46; padding: 28px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Ada Kendala Saat Mendaftar?</h1>
    </div>
    <div style="padding: 28px; font-size: 15px; color: #334155; line-height: 1.6;">
      <p>Halo <strong>${name}</strong>,</p>
      <p>Kami melihat Anda sempat mengisi formulir Froyek namun proses pendaftaran belum selesai.</p>
      <p>Jika ada pertanyaan seputar fitur, lisensi seumur hidup, atau metode pembayaran, tim kami siap membantu Anda.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${checkoutUrl}" style="display: inline-block; background-color: #065f46; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800;">
          Lanjutkan Pendaftaran &rarr;
        </a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function froyekHelpHtml(name: string, continueUrl: string): string {
  return `<p>Halo ${escapeHtml(name)},</p><p>Kamu sempat mengisi pemilihan paket froyek dan meminta satu pengingat. Tidak ada diskon di pesan ini.</p><p><a href="${escapeHtml(continueUrl)}">Lanjutkan pemilihan</a></p>`;
}

function froyekAccessHtml(name: string, setupUrl: string): string {
  return `<p>Halo ${escapeHtml(name)},</p><p>Pembayaran froyek sudah tercatat. Atur kata sandi lewat tautan berikut, lalu selesaikan akun di aplikasi.</p><p><a href="${escapeHtml(setupUrl)}">Atur kata sandi</a></p>`;
}

// Kirim Email via Resend REST API
export async function sendResendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const now = new Date().toISOString();
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail =
    (process.env.RESEND_FROM_EMAIL || "").trim() || "froyek <noreply@froyek.com>";

  let subject = opts.subject;
  let html = "";

  switch (opts.type) {
    case "payment_confirmation":
      subject = subject || `[Konfirmasi] Pembayaran Froyek Berhasil - ${opts.name || ""}`;
      html = getPaymentConfirmationTemplate(opts);
      break;
    case "account_access":
      subject = subject || `[Akses Akun] Detail Login & Password Froyek`;
      html = getAccountAccessTemplate(opts);
      break;
    case "password_reset":
      subject = subject || `[Froyek] Permintaan Reset Password Akun Anda`;
      html = getPasswordResetTemplate(opts);
      break;
    case "followup":
      subject = subject || `Ada yang bisa kami bantu untuk pendaftaran Estimator Anda?`;
      html = getFollowupTemplate(opts);
      break;
    case "froyek_help":
      subject = subject || "Perlu bantuan menyelesaikan pemilihan paket froyek?";
      html = froyekHelpHtml(opts.name || "Pengunjung", opts.resetLink || "https://froyek.com/pilih");
      break;
    case "froyek_access":
      subject = subject || "Atur kata sandi untuk masuk ke froyek";
      html = froyekAccessHtml(opts.name || "Pengunjung", opts.resetLink || "https://froyek.com/login");
      break;
  }

  // Jika RESEND_API_KEY belum dikonfigurasi, simulasikan pengiriman agar dev/testing tetap jalan mulus
  if (!apiKey) {
    const simId = `sim_resend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.info(`[Resend Simulated] Sent ${opts.type} to ${opts.to} (ID: ${simId})`);
    return {
      ok: true,
      emailId: simId,
      status: "simulated",
      to: opts.to,
      subject,
      sentAt: now,
      warning: "RESEND_API_KEY belum dikonfigurasi di env. Email disimulasikan sebagai terkirim.",
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [opts.to],
        subject,
        html,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        status: "failed",
        to: opts.to,
        subject,
        sentAt: now,
        error: json?.message || json?.error || "Gagal mengirim email via Resend",
      };
    }

    return {
      ok: true,
      emailId: json?.id,
      status: "sent",
      to: opts.to,
      subject,
      sentAt: now,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: "failed",
      to: opts.to,
      subject,
      sentAt: now,
      error: err?.message || "Kesalahan jaringan saat memanggil Resend API",
    };
  }
}

// Cek Status Pengiriman Email dari Resend
export async function checkResendEmailStatus(emailId: string): Promise<{
  ok: boolean;
  status: string;
  id: string;
  data?: any;
}> {
  if (!emailId || emailId.startsWith("sim_resend_")) {
    return {
      ok: true,
      status: "delivered",
      id: emailId,
    };
  }

  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) {
    return {
      ok: true,
      status: "sent",
      id: emailId,
    };
  }

  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: "unknown", id: emailId };
    }

    return {
      ok: true,
      status: json?.last_event || json?.status || "delivered",
      id: emailId,
      data: json,
    };
  } catch {
    return { ok: false, status: "unknown", id: emailId };
  }
}

