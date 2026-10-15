# Lynk.id Webhook — Petunjuk Monefyi (Estimator & Finance)

Dokumen ini merangkum cara Lynk mengirim notifikasi pembayaran dan cara server Monefyi memverifikasi + memprosesnya (aktivasi paket + email Resend).

**Merchant key tidak disimpan di Git.** Simpan hanya di:

- Supabase → **Project Settings → Edge Functions → Secrets** → `LYNK_MERCHANT_KEY`
- Password manager tim (cadangan)

---

## 1. URL webhook (production)

| Produk | Edge Function | URL |
|--------|---------------|-----|
| Estimator (checkout `asfin-ai`) + Finance lama | `lynk-webhook` | `https://zzwqfmdyncxbolestkqp.supabase.co/functions/v1/lynk-webhook` |
| Estimator / Planner (store dedicated) | `planner-lynk-webhook` | `https://zzwqfmdyncxbolestkqp.supabase.co/functions/v1/planner-lynk-webhook` |

**Estimator dari landing** saat ini checkout ke store `asfin-ai` → webhook harus mengarah ke **`lynk-webhook`**. Function itu otomatis meneruskan pembelian Estimator ke handler yang sama dengan `planner-lynk-webhook` (aktivasi + email).

Di dashboard Lynk: **simpan URL webhook** → merchant key muncul (satu kali; salin ke Supabase).

---

## 2. Autentikasi (penting)

Lynk **bukan** token statis di header. Signature dihitung seperti ini:

```
signature_string = amount + refId + message_id + merchantKey
X-Lynk-Signature = SHA256(signature_string) dalam hex (huruf kecil)
```

| Field | Sumber di JSON |
|-------|----------------|
| `amount` | `data.message_data.totals.grandTotal` (angka → string, tanpa desimal) |
| `refId` | `data.message_data.refId` |
| `message_id` | `data.message_id` |
| `merchantKey` | Merchant key dari dashboard Lynk (secret `LYNK_MERCHANT_KEY` di Supabase) |

Server Monefyi memverifikasi otomatis (`_shared/lynkSignature.ts`). **Jangan** isi header Lynk dengan merchant key mentah.

---

## 3. Format request (Lynk → server)

| Item | Nilai |
|------|--------|
| Method | `POST` |
| Content-Type | `application/json` |
| Header auth | `X-Lynk-Signature` (SHA256 hex, lihat §2) |
| Response sukses | `200 OK` + JSON dari handler Monefyi |

Lynk dapat **retry** jika response bukan 2xx — pastikan handler idempotent (`lynk_webhook_events`).

### Event

| Event | Kapan | Server Monefyi |
|-------|--------|----------------|
| `payment.received` | Pelanggan selesai bayar | Proses jika `message_action` = `SUCCESS` |
| Lain / gagal | `FAILED`, `CANCELLED`, … | `200` `{ ok: true, ignored: true }` |

### Event yang diproses (Estimator / Planner)

| Event | `message_action` | Tindakan server |
|-------|------------------|-----------------|
| `payment.received` | `SUCCESS` | Aktivasi subscription + email konfirmasi (Resend) |
| Lainnya | — | `200` `{ ok: true, ignored: true }` |

### Field penting untuk signature & bisnis

| Field JSON | Path | Dipakai untuk |
|------------|------|----------------|
| `grandTotal` | `data.message_data.totals.grandTotal` | **Signature** (`amount` sebagai string) + nominal aktivasi |
| `refId` | `data.message_data.refId` | Signature + idempotency / `external_payment_id` |
| `message_id` | `data.message_id` | Signature + deduplikasi event |
| Email pembeli | `data.message_data.customer.email` | Auth user + email Resend |
| Produk | `items[].title` (+ custom fields jika ada) | Map ke Estimator Standard/Pro / Planner Pro |

`grandTotal` = net yang diterima penjual setelah fee (bukan harga item saja). Untuk signature, Lynk meng-concat **string** dari angka `grandTotal` (contoh `99000`), bukan `"99,000"`.

Payload resmi (contoh ringkas):

```json
{
  "event": "payment.received",
  "data": {
    "message_action": "SUCCESS",
    "message_code": "0",
    "message_id": "API_CALL_1744270275143115_4624014",
    "message_data": {
      "refId": "13f8d23beeb2aacbbc01c94060cc88d7",
      "customer": { "email": "pembeli@example.com", "name": "Nama", "phone": "08..." },
      "items": [{ "title": "Monefyi Estimator Standard", "qty": 1, "price": 99000 }],
      "totals": { "grandTotal": 99000 }
    }
  }
}
```

Email konfirmasi dikirim ke `customer.email`.

Contoh payload lengkap Lynk (referensi): `scripts/lynk-webhook-payload.example.json`.

### Verifikasi signature (referensi)

Urutan concatenation resmi Lynk:

```
amount + refId + message_id + merchantKey  →  SHA256 → hex (lowercase)
```

Implementasi di repo:

- TypeScript (Edge): `my-supabase-project/supabase/functions/_shared/lynkSignature.ts`
- Uji lokal: `scripts/lynk-compute-signature.mjs` (output hex di stdout; debug di stderr)

---

## 4. Secret Supabase (wajib)

Set via CLI (dari folder `my-supabase-project`, token Supabase sudah login):

```bash
npx supabase secrets set \
  LYNK_MERCHANT_KEY="PASTE_MERCHANT_KEY_DARI_LYNK" \
  REQUIRE_LYNK_SIGNATURE="true" \
  REQUIRE_PURCHASE_EMAIL="true" \
  RESEND_API_KEY="re_..." \
  RESEND_FROM_EMAIL="Monefyi Estimator <noreply@support.monefyi.com>" \
  ESTIMATOR_SITE_URL="https://estimator.monefyi.com" \
  ESTIMATOR_APP_URL="https://estimator.monefyi.com/app"
```

Alias lama (masih dibaca jika belum migrasi): `LYNK_WEBHOOK_SECRET`, `LYNK_SIGNATURE_TOKEN`, `PLANNER_LYNK_SIGNATURE_TOKEN` — isi dengan **merchant key yang sama** jika perlu.

Deploy setelah ubah kode:

```bash
./scripts/deploy-planner-supabase.sh
# atau minimal:
npx supabase functions deploy lynk-webhook --no-verify-jwt
npx supabase functions deploy planner-lynk-webhook --no-verify-jwt
```

---

## 5. Alur setelah webhook sukses (Estimator)

1. Verifikasi signature ✓  
2. Idempotency (`lynk_webhook_events`) — kirim ulang webhook tetap bisa kirim email  
3. Buat/temukan user Supabase Auth  
4. Buat org + `activate_subscription` (Estimator Standard/Pro)  
5. Email Resend: **Pembayaran … berhasil** (+ link atur password untuk user baru)

---

## 6. Troubleshooting

| Gejala | Cek |
|--------|-----|
| Tidak ada email | Resend **Logs** kosong → webhook gagal sebelum kirim email |
| HTTP 401 `Invalid signature` | `LYNK_MERCHANT_KEY` di Supabase ≠ merchant key Lynk; atau `grandTotal`/`refId`/`message_id` tidak match |
| HTTP 500 `planner_org_members_profile_fk` | User baru tanpa baris `profiles` — sudah diperbaiki di handler (profile dibuat sebelum org member) |
| HTTP 500 lain | Baca body JSON `{ "error": "..." }` + log Edge Function |
| Log `Missing customer email` | Payload Lynk tanpa `customer.email` |
| Resend error 403/422 | Domain `support.monefyi.com` belum verified di Resend |
| Order lama / email hilang | **Resend webhook** dari Lynk — aktivasi idempotent, **email dikirim lagi** |
| HTTP 502 dari webhook | Email gagal — Lynk retry otomatis jika `REQUIRE_PURCHASE_EMAIL=true` |

Response sukses contoh (Estimator):

```json
{
  "ok": true,
  "email": { "sent": true, "resendId": "..." },
  "product": "estimator_standard",
  "tier": "estimator"
}
```

Log: Supabase Dashboard → **Edge Functions** → `lynk-webhook` → **Logs** (cari `purchase email sent` atau `email.sent: true` di response body).

---

## 7. Uji signature lokal

```bash
# Export merchant key dari Lynk (jangan commit)
export LYNK_MERCHANT_KEY='...'
node scripts/lynk-compute-signature.mjs \
  --refId 13f8d23beeb2aacbbc01c94060cc88d7 \
  --amount 72000 \
  --messageId API_CALL_1744270275143115_4624014
```

Salin output hex ke header `X-Lynk-Signature`, POST body contoh ke URL webhook (lihat `scripts/lynk-webhook-payload.example.json`).

---

## 8. Keamanan

- Merchant key hanya di **Supabase Secrets** (`LYNK_MERCHANT_KEY`) dan password manager — **never Git / never chat publik**.  
- Key muncul di Lynk setelah **simpan URL webhook**; simpan sekali, lalu paste ke Supabase.  
- Jika key pernah bocor, **rotate** di Lynk (simpan URL webhook lagi) dan update secret di Supabase.  
- Selalu verifikasi `X-Lynk-Signature` sebelum proses payload.  
- `REQUIRE_LYNK_SIGNATURE=true` di production.

---

## Referensi

- Email + Resend: [`LYNK_RESEND_SETUP.md`](./LYNK_RESEND_SETUP.md)  
- QA checklist: [`PLANNER_LYNK_QA_CHECKLIST.md`](./PLANNER_LYNK_QA_CHECKLIST.md)  
- Kode: `my-supabase-project/supabase/functions/_shared/lynkSignature.ts`
