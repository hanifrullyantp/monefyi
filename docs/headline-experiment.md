# Eksperimen headline Estimator LP

**Lingkup:** `https://estimator.monefyi.com` saja (`PlannerLP2`).  
**Status:** Fase 0 — rencana. Belum ada kode. Tunggu persetujuan.

---

## 0. Temuan stack (yang sudah ada)

| Bagian | Fakta |
|--------|--------|
| App | Next.js 16 di `PlannerLP2`, deploy Vercel region `sin1` |
| Halaman | `src/app/page.tsx` — landing client-heavy; hero **hardcoded** di `HeroSection.tsx` (`"use client"`) |
| Headline saat ini | H1 di kode: *Kirim Penawaran Sebelum Kamu Pulang Survei* (bukan H0 kontrol) |
| Admin | `/admin/*` + `AdminAuthGuard` (login yang sudah ada) |
| Tracking sekarang | `trackEvent` ke GA4/Pixel **jika** ID di settings; **tidak** ke database sendiri |
| Leads | `leadsStore` (localStorage) — **bukan** sumber eksperimen |
| DB produksi | **Supabase Postgres** sudah dipakai (`landing_content`, auth). Drizzle `DATABASE_URL` di LP **kosong/template**, tidak dipakai production |
| Middleware | Tidak ada |
| Cookie consent | **Belum ada** banner di LP Estimator. `/privacy` di-rewrite ke SPA Planner |
| Bot | Belum difilter |

**Keputusan penyimpanan (usulan, tunggu konfirmasi):** tabel eksperimen di **Supabase yang sudah ada**. Tidak menambah Neon/Vercel Postgres/layanan berbayar. Client **tidak** insert langsung; event masuk lewat Route Handler Next (`sendBeacon` → `/api/exp/event`) dengan `service_role`. Anon RLS: deny.

---

## 1. Yang diuji vs yang tidak

**Hanya** `h1` hero + `subheadline` pendampingnya. Logo, CTA, section, harga, FAQ, warna — identik.

`document.title` / OG untuk crawler **tetap** headline default (bot tidak diuji). Pengunjung manusia: HTML pertama sudah berisi H1 varian (no flicker).

---

## 2. Varian awal (config, bukan hardcoded di komponen)

Subheadline H2–H0 di bawah **usulan** — bisa diganti sebelum Fase 1.

| id | status | headline | subheadline (usulan) |
|----|--------|----------|----------------------|
| `H1` | active | Kirim Penawaran Sebelum Kamu Pulang Survei | Saring calon klien lewat WA, hitung harga di HP, kirim PDF penawaran berlogo kamu sebelum klien pindah vendor. |
| `H2` | active | Berhenti Survei Klien yang Cuma Tanya-Tanya | Saring lewat WA dulu. Yang budgetnya cocok baru disurvei — hitung di lokasi, PDF keluar sebelum pulang. |
| `H3` | active | Dari Ukur di Lokasi ke PDF Penawaran dalam 1 Menit | Input ukuran di HP, pilih material, penawaran profesional siap dikirim ke WA klien. |
| `H0` | active (kontrol) | Bisa Buat Estimasi Project Dalam 1 Menit, Mau? | Coba gratis 3 estimasi. Standard Rp 99.000 · Pro Rp 199.000 — sekali bayar. |

Field: `id`, `headline`, `subheadline`, `status` (`active` \| `paused` \| `eliminated` \| `winner`), `created_at`.

Kill switch: `HEADLINE_EXPERIMENT=off` → semua orang lihat **kontrol H0** (atau headline freeze yang dipilih admin), tanpa deploy.

---

## 3. Skema data (Supabase)

Tidak ada nama, WA, email. Hanya `visitor_id` UUID.

### `exp_headline_experiments`

Satu baris eksperimen hidup (bisa archive lalu bikin siklus baru).

- `id` uuid PK  
- `slug` text unique — default `estimator-headline-v1`  
- `status` text — `running` \| `holdout` \| `frozen` \| `halted_srm`  
- `started_at`, `holdout_until`, `frozen_at` timestamptz  
- `config` jsonb — bobot, ambang, kill switch mirror  
- `winner_variant_id` text null  

### `exp_headline_variants`

- `id` text PK per eksperimen (`H0`…) + `experiment_id`  
- `headline`, `subheadline` text  
- `status`  
- `created_at`  
- Unique `(experiment_id, id)`

### `exp_headline_assignments`

Sticky first-touch. Satu baris per visitor per eksperimen.

- `visitor_id` uuid PK (bersama `experiment_id`)  
- `variant_id` text — **tidak diubah** walau cookie hilang (lookup by visitor_id baru = visitor baru)  
- `assigned_at`  
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` text null  
- `referrer_host` text null (bukan URL penuh)  
- `device` text — `mobile` \| `desktop` \| `tablet`  
- `hour_local` smallint 0–23 (WIB)  
- `is_internal` bool  
- `is_bot` bool — bot **tidak** diinsert  

Cookie `exp_headline` (30 hari, first-party, `Secure; SameSite=Lax`):  
`{ v: "H1", id: "<uuid>", exp: "estimator-headline-v1" }`

Jika cookie hilang: visitor baru + assignment baru. Jika `visitor_id` lama masih ada di body event tapi cookie beda varian → **kebocoran**: event tetap ke varian **pertama** di tabel assignment; counter leak +1.

### `exp_headline_events`

Append-only, tanpa PII.

- `id` bigserial  
- `visitor_id`, `variant_id`, `session_id` (uuid sesi, cookie `exp_sid` session)  
- `name` text — lihat metrik  
- `props` jsonb — `{ pos: "hero"|"sticky"|"harga" }` untuk CTA; **tanpa** nomor WA  
- `created_at`  
- Unique parsial: satu `exposure` per `(visitor_id, experiment_id)`  
- Index `(experiment_id, variant_id, name, created_at)`

### `exp_headline_daily`

Snapshot harian (job), untuk grafik tanpa scan event mentah.

- tanggal, variant_id, counts: exposure, engaged, deep_read, micro, lead, sale  
- `p_best`, `expected_loss`, `alloc_pct`  
- `srm_p_value` null di baris varian; SRM global di `exp_headline_quality`

### `exp_headline_quality`

- `as_of` date  
- `srm_p`, `srm_flag`  
- `bots_filtered`, `leak_count`, `novelty_flag`  
- `notes` text

### `exp_headline_decisions`

Log: `eliminated` / `winner` / `manual_winner` / `pause` / `reset` / `kill_switch`.  
`actor` = `system` atau email admin. `reason` text.

**Retensi:** event 180 hari; daily + decisions simpan.

---

## 4. Definisi metrik

Event browser (`sendBeacon` → API), **bukan** PII:

| Event | Syarat |
|-------|--------|
| `exposure` | H1 di viewport ≥ 50% selama ≥ 1 detik. Satu per visitor. |
| `scroll_25/50/75/90` | Sekali per sesi |
| `time_engaged_15/30/60` | Tab terlihat + ada interaksi/scroll; idle > 10 dtk pause |
| `section_view` | `#tiga-step`, `#kalkulator`, `#harga`, `#faq` |
| `cta_click` | Hero / sticky / harga |
| `calc_start`, `calc_complete`, `lead_submit` | Sudah ada di LP; **jangan** simpan nomor |
| `free_signup`, `checkout_start`, `purchase` | Funnel yang sudah ada |

Turunan (per visitor, first-touch 14 hari):

- **Engaged visit** = scroll ≥ 50% **dan** waktu aktif ≥ 30 dtk  
- **Deep read** = scroll ≥ 75% **dan** waktu aktif ≥ 60 dtk  
- **Micro-conversion** = `cta_click` **atau** `calc_start`  
- **Lead** = `lead_submit` **atau** `free_signup`  
- **Sale** = `purchase`  

Rate = jumlah visitor yang memenuhi / jumlah **exposure** (bukan pageview).  
Atribusi lead/sale: varian assignment **pertama**, jika event ≤ 14 hari setelah assign.

---

## 5. Rumus alokasi (Thompson Sampling)

Model **Beta-Bernoulli** per varian, posterior `Beta(α, β)`:

- Prior: `α₀ = 1`, `β₀ = 1` (non-informatif).  
- Sukses `s` = jumlah visitor yang memenuhi metrik gabungan (lihat skor).  
- Gagal `f` = exposure − s.  
- Posterior: `α = 1 + s`, `β = 1 + f`.

### Skor gabungan (tahap Belajar)

Per visitor, “sukses skor” = 1 jika lulus undian berbobot **atau** (lebih sederhana & stabil, **usulan**):

Pakai **satu Bernoulli gabungan** dengan probabilitas efektif per visitor:

`y = 0.6 * I(lead) + 0.3 * I(micro) + 0.1 * I(engaged)`  
lalu `s_eff = Σ y`, `n = exposures`, update Beta dengan **pseudo-count**:  
`α = 1 + s_eff`, `β = 1 + (n − s_eff)`  
(`n − s_eff` ≥ 0 karena y ∈ [0,1]).

Bobot di `config.weights`: `{ lead: 0.6, micro: 0.3, engaged: 0.1 }`.  
Sale **tidak** masuk skor sampai **≥ 20 sale total**; tetap ditampilkan terpisah.

### Sampling

Untuk visitor baru, tiap varian **active**: tarik `θ ~ Beta(α, β)`. Tampilkan `argmax θ`.  
Posterior dihitung ulang: cron **15 menit** **atau** tiap **100 exposure** baru (yang lebih dulu).

### Tahap

1. **Eksplorasi** sampai tiap varian active ≥ **300** exposure: bagi **rata** (25% × 4), kecuali `eliminated`/`paused`.  
2. **Belajar**: Thompson + guardrail.  
3. **Winner + holdout** (Fase 4).

### Guardrail alokasi

- Varian active ≥ **10%** sampai eliminated.  
- Kontrol **H0 ≥ 10%** sampai eksperimen selesai (termasuk holdout).  
- Perubahan alokasi **maks ±15 pp** per siklus vs alokasi sebelumnya.  
- Segment mobile/desktop & ads vs organik: **laporan saja**, bukan eksperimen terpisah.

Implementasi guardrail setelah raw Thompson: clip ke min 10%, H0 min 10%, lalu cap delta 15 pp, renormalisasi.

---

## 6. Peluang terbaik & expected loss (bahasa dashboard)

**Peluang menjadi terbaik** = dari 20.000 undian Monte Carlo: proporsi sampel di mana `θ_i` tertinggi.

Teks: *“Varian H1 punya peluang 91% menjadi yang terbaik.”*

**Expected loss** (relatif terhadap leader): rata-rata `max(0, θ_best − θ_i) / θ_best` di sampel.  
Teks: *“Jika kita salah pilih, kerugian perkiraan 0,3% relatif terhadap yang terbaik.”*

**Estimasi sisa sampel** (kasar, di dashboard):  
lanjutkan laju exposure 7 hari terakhir; hitung hari sampai P(best) ≥ 95% dengan simulasi maju. Tampilkan *“Perlu ±N hari / ±M pengunjung lagi.”*

Keputusan winner/eliminasi **hanya job harian 03:00 WIB** (anti-peeking). Alokasi Thompson boleh 15 menit; status `winner`/`eliminated` tidak.

---

## 7. Eliminasi, winner, holdout

Semua ambang di `config` (default di bawah).

**Eliminasi otomatis** jika **semua**:

- P(best) < **5%**  
- exposure ≥ **500**  
- umur eksperimen ≥ **5 hari**  
- bukan satu-satunya active selain H0  

Status `eliminated`; trafik dibagi ke sisa (tetap hormati min 10% & H0).

**Winner** jika **semua**:

- P(best) ≥ **95%**  
- exposure ≥ **1.000** per varian tersisa **atau** ≥ **3.000** total, **dan** ≥ **7 hari** kalender penuh  
- expected loss < **0,5%** relatif  
- SRM tidak flag (`p ≥ 0.001`)  
- tidak ada anomali (bot spike, leak > 5% assignment)  
- guardrail bisnis: sale-per-lead dan refund **tidak** lebih buruk dari H0 pada uji satu sisi kasar (atau sale masih < 20 → skip tes sale, jangan block winner lead-based; **usulan**: winner boleh dari lead jika sale < 20, dengan catatan “sale belum cukup”)  

Setelah winner:

1. 14 hari: **90%** winner, **10%** H0 holdout.  
2. Jika holdout tidak memburuk (lead rate winner ≥ H0 − 1 pp absolut): **freeze 100%** winner.  
3. Notifikasi: log `exp_headline_decisions` + email `support@monefyi.com` (Resend yang sudah ada) — **bukan** WA nomor klien.

**Timeout 45 hari:** tidak ada winner → laporan “belum jelas”; tampilkan varian expected loss terendah sebagai **sementara**; sarankan headline baru. Tidak auto-freeze.

Siklus berikutnya: winner jadi H0 baru; varian baru dari dashboard **tanpa** deploy.

---

## 8. Kualitas data

- **SRM:** χ² exposure aktual vs alokasi yang **direncanakan** siklus itu. `p < 0.001` → `halted_srm`, hentikan keputusan otomatis.  
- **Dedupe:** 1 exposure / visitor. Refresh diabaikan.  
- **Internal:** cookie `internal=1` atau ENV IP/email staf → tidak dihitung.  
- **Bot:** UA crawler/headless/prefetch/WhatsApp/Facebook/Slack preview → no assign, no event.  
- **Novelty:** lead rate hari 1–3 vs hari 4+ per varian; flag jika beda > 2×.  
- **Sumber:** ads (`utm_medium` cpc/paid/paidsocial) vs organik; flag jika argmax P(best) beda.  
- **Device:** mobile vs desktop, laporan terpisah.

Debug `?h=H2`: hanya jika `HEADLINE_DEBUG=1` atau admin session. **Tidak** menulis assignment/event.

---

## 9. Alur halaman (no flicker)

```
Request
  → (bot?) render H1 default, no cookie write, no DB
  → cookie exp_headline ada? pakai variant_id sticky
  → else: baca posterior cache → Thompson / equal split → Set-Cookie 30 hari
  → HTML: <h1> teks varian </h1> sudah di server (bukan ganti JS)
Cache-Control: private, no-store
Vary: Cookie
```

`HeroSection` terima `headline` + `subheadline` dari server. Jangan baca CMS `defaultContent.hero` untuk H1 selama eksperimen `running`.

Client tracker (~< 5 KB gzip, async): IntersectionObserver, scroll, idle; `sendBeacon`. Tidak mengubah DOM headline.

CDN/Vercel: halaman LP **jangan** di-cache publik (`s-maxage=0`).

---

## 10. Dashboard `/admin/experiments`

Login admin yang sama. Tabel varian + P(best) + expected loss + alokasi.  
Grafik: P(best)/hari, alokasi/hari, lead rate kumulatif.  
Panel: SRM, bot, leak, novelty.  
Tombol: pause/resume, tambah varian, paksa winner (alasan wajib), reset, CSV, kill switch.  
Ringkasan otomatis bahasa awam + log keputusan.

---

## 11. Privasi

Cookie first-party `exp_headline` + `exp_sid`: ID acak, 30 hari / sesi, untuk uji headline. Bukan iklan pihak ketiga.  
Fase 8: paragraf di halaman privasi Planner yang di-rewrite dari `/privacy`.  
Tidak ada banner consent terpisah di Fase 0–1 kecuali diminta (cookie fungsional + analitik first-party, tanpa PII).

---

## 12. Pengujian (Fase 7, nanti)

Unit: Beta sample, P(best), expected loss, eliminasi/winner, SRM, first-touch.  
Simulasi 1.000 run: true rates H1 7% / H2 5% / H3 5% / H0 4% lead; salah pilih winner < 5%.  
E2E: sticky, HTML awal = H1 varian, bot skip, cookie hilang, cache tidak bocor.  
Perf: ΔLCP ≤ 50 ms.

---

## 13. Yang perlu keputusanmu sebelum Fase 1

1. **DB:** setuju pakai **Supabase existing** (bukan Drizzle `DATABASE_URL` baru)?  
2. **Subheadline** H2, H3, H0 — setuju usulan di tabel varian?  
3. **Winner tanpa 20 sale:** boleh menang dari lead + catatan, atau wajib nunggu sale?  
4. **Freeze default setelah holdout:** 100% winner otomatis, atau konfirmasi manual?  
5. **Ambang** (300 / 500 / 1000 / 7 hari / 45 hari / bobot 0.6·0.3·0.1) — pakai default?  
6. **Kill switch default:** eksperimen **on** begitu Fase 1 deploy, atau mulai `off` sampai kamu nyalakan?  
7. **Email notifikasi winner:** `support@monefyi.com` cukup?

Setelah kamu setuju (atau koreksi poin di atas), baru Fase 1: assignment server-side + cookie + no-flicker.
