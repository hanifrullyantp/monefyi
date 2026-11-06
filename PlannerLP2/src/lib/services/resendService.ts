export interface SendEmailOptions {
  to: string;
  name?: string;
  type: "payment_confirmation" | "account_access" | "password_reset" | "followup";
  subject?: string;
  planTier?: "free" | "standard" | "pro";
  amount?: number;
  paymentMethod?: string;
  password?: string;
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

// 1. Template: Konfirmasi Pembayaran
function getPaymentConfirmationTemplate(opts: SendEmailOptions) {
  const name = opts.name || "Pelanggan Monefyi";
  const plan = (opts.planTier || "standard").toUpperCase();
  const amountStr = opts.amount ? formatCurrency(opts.amount) : "Rp 0 (Akses Gratis)";
  const method = (opts.paymentMethod || "QRIS").toUpperCase();
  const loginUrl = opts.appUrl || "https://estimator.monefyi.com/app/estimator";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Konfirmasi Pembayaran Monefyi Estimator</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #065f46; padding: 32px 28px; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; background-color: #ffffff; border-radius: 12px; line-height: 44px; color: #065f46; font-size: 24px; font-weight: 900; margin-bottom: 12px;">E</div>
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Pembayaran Berhasil!</h1>
      <p style="color: #a7f3d0; margin: 6px 0 0; font-size: 14px;">Terima kasih, akun Monefyi Estimator Anda telah aktif.</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Halo <strong>${name}</strong>,<br><br>
        Pesanan lisensi Monefyi Estimator Anda telah berhasil kami terima dan diverifikasi. Berikut rincian transaksi Anda:
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
      &copy; ${new Date().getFullYear()} Monefyi Indonesia. Hak Cipta Dilindungi.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// 2. Template: Password & Akses Akun
function getAccountAccessTemplate(opts: SendEmailOptions) {
  const name = opts.name || "Pelanggan Monefyi";
  const email = opts.to;
  const password = opts.password || "Estimator2026!";
  const loginUrl = opts.appUrl || "https://estimator.monefyi.com/app/estimator";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Akses Akun & Password Monefyi Estimator</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #1e3a8a; padding: 32px 28px; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; background-color: #ffffff; border-radius: 12px; line-height: 44px; color: #1e3a8a; font-size: 24px; font-weight: 900; margin-bottom: 12px;">🔑</div>
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Akses Akun Estimator Anda</h1>
      <p style="color: #bfdbfe; margin: 6px 0 0; font-size: 14px;">Simpan informasi login berikut dengan aman.</p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Halo <strong>${name}</strong>,<br><br>
        Akun Monefyi Estimator Anda telah dibuat. Anda dapat langsung login ke aplikasi menggunakan detail berikut:
      </p>

      <!-- Credentials Box -->
      <div style="background-color: #eff6ff; border-radius: 14px; padding: 22px; margin: 24px 0; border: 2px solid #bfdbfe;">
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="color: #64748b; padding: 6px 0; width: 120px;">URL Login:</td>
            <td style="color: #1e3a8a; font-weight: 700; padding: 6px 0;">
              <a href="${loginUrl}" style="color: #2563eb; text-decoration: underline;">estimator.monefyi.com</a>
            </td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Email:</td>
            <td style="color: #0f172a; font-weight: 700; padding: 6px 0; font-family: monospace; font-size: 15px;">${email}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 6px 0;">Password:</td>
            <td style="color: #1e3a8a; font-weight: 900; padding: 6px 0; font-family: monospace; font-size: 16px; letter-spacing: 1px;">${password}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          Masuk ke Aplikasi Sekarang &rarr;
        </a>
      </div>

      <div style="background-color: #fffbeb; border-radius: 10px; padding: 12px 16px; border: 1px solid #fef3c7; font-size: 12px; color: #92400e;">
        💡 <strong>Tips Keamanan:</strong> Demi kenyamanan Anda, kami sarankan untuk mengubah password setelah berhasil masuk ke menu Pengaturan Akun.
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} Monefyi Indonesia.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// 3. Template: Reset / Ubah Password
function getPasswordResetTemplate(opts: SendEmailOptions) {
  const name = opts.name || "Pengguna Monefyi";
  const password = opts.password || "MonefyiBaru2026!";
  const loginUrl = opts.resetLink || opts.appUrl || "https://estimator.monefyi.com/app/estimator";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Password Monefyi Estimator</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header -->
    <div style="background-color: #b45309; padding: 32px 28px; text-align: center;">
      <div style="display: inline-block; width: 44px; height: 44px; background-color: #ffffff; border-radius: 12px; line-height: 44px; color: #b45309; font-size: 24px; font-weight: 900; margin-bottom: 12px;">🔒</div>
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Permintaan Ubah Password</h1>
      <p style="color: #fef3c7; margin: 6px 0 0; font-size: 14px;">Password sementara Anda telah diperbarui.</p>
    </div>

    <div style="padding: 32px 28px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
        Halo <strong>${name}</strong>,<br><br>
        Kami menerima permintaan untuk mereset password akun Monefyi Estimator Anda. Gunakan password sementara berikut untuk masuk:
      </p>

      <div style="background-color: #fefce8; border-radius: 14px; padding: 20px; margin: 24px 0; border: 2px dashed #fde047; text-align: center;">
        <span style="color: #713f12; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Password Baru Sementara:</span>
        <span style="color: #b45309; font-weight: 900; font-family: monospace; font-size: 22px; letter-spacing: 2px;">${password}</span>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="display: inline-block; background-color: #b45309; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 800; font-size: 15px;">
          Login & Ubah Password &rarr;
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
        Jika Anda tidak merasa meminta reset password, mohon segera hubungi admin kami untuk perlindungan akun Anda.
      </p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} Monefyi Indonesia.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// 4. Template: Follow-Up Checkout Tertunda
function getFollowupTemplate(opts: SendEmailOptions) {
  const name = opts.name || "Kakak";
  const checkoutUrl = "https://estimator.monefyi.com/checkout";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Lanjutkan Pendaftaran Monefyi Estimator</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #065f46; padding: 28px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800;">Ada Kendala Saat Mendaftar?</h1>
    </div>
    <div style="padding: 28px; font-size: 15px; color: #334155; line-height: 1.6;">
      <p>Halo <strong>${name}</strong>,</p>
      <p>Kami melihat Anda sempat mengisi formulir Monefyi Estimator namun proses pendaftaran belum selesai.</p>
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

// Kirim Email via Resend REST API
export async function sendResendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const now = new Date().toISOString();
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail =
    (process.env.RESEND_FROM_EMAIL || "").trim() || "Monefyi Estimator <onboarding@resend.dev>";

  let subject = opts.subject;
  let html = "";

  switch (opts.type) {
    case "payment_confirmation":
      subject = subject || `[Konfirmasi] Pembayaran Monefyi Estimator Berhasil - ${opts.name || ""}`;
      html = getPaymentConfirmationTemplate(opts);
      break;
    case "account_access":
      subject = subject || `[Akses Akun] Detail Login & Password Monefyi Estimator`;
      html = getAccountAccessTemplate(opts);
      break;
    case "password_reset":
      subject = subject || `[Reset Password] Password Sementara Akun Estimator Anda`;
      html = getPasswordResetTemplate(opts);
      break;
    case "followup":
      subject = subject || `Ada yang bisa kami bantu untuk pendaftaran Estimator Anda?`;
      html = getFollowupTemplate(opts);
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

