# Froyek & Monefyi Workspace

Repositori ini menaungi produk **froyek** (*Agent for your project*) beserta aplikasi legacy **Monefyi**. Pemisahan struktur monorepo ini memungkinkan pengembangan independen antara web application Froyek, landing page & marketing engine, core agent autonomous, serta layanan perbankan/pembukuan personal Monefyi.

---

## 1. Struktur Monorepo

| Direktori | Deskripsi | Stack Utama | Target Domain / Deploy |
|---|---|---|---|
| **[`apps/web`](apps/web/)** | Aplikasi utama Froyek (dulu `monefyi_planner`). Antarmuka agentik, task flow, estimasi & project management. | React 18, Vite, Tailwind CSS, Zustand | `froyek.com` (Vercel) |
| **[`apps/landing`](apps/landing/)** | Landing page Froyek & Estimator Proyek (dulu `PlannerLP2`). Memuat winning ads engine, CRM, dynamic pricing. | Next.js 15 (App Router), Tailwind CSS, Lucide | `estimator.froyek.com` / `froyek.com` (Vercel) |
| **[`packages/domain`](packages/domain/)** | Domain core types, business logic, entitas kalkulasi biaya & durasi proyek. | TypeScript | Shared package |
| **[`agent-core`](agent-core/)** | Otomasi agen AI, context builder, prompt management, dan multi-provider orchestration. | TypeScript | Shared core |
| **[`evals`](evals/)** | Rangkaian skenario evaluasi kualitas & akurasi keluaran agen AI. | TypeScript, Vitest | CI / Test bench |
| **[`remotion`](remotion/)** | Generator motion graphic video promosi otomatis berbasis script dan audio. | Remotion, React | Video renderer |
| **[`config/brand`](config/brand/)** | Single Source of Truth (SSOT) identitas merek Froyek: token warna (`#0A3A2E`, `#FFFFFF`), SVG/PNG logo, favicon, og-image. | TypeScript, Assets | Shared config ([Panduan Brand](config/brand/BRAND.md)) |
| **[`docs/migration`](docs/migration/)** | Dokumentasi lengkap proses audit, baseline keamanan, verifikasi, dan prosedur cutover rilis. | Markdown | Dokumentasi migrasi |

### Aplikasi Monefyi (Legacy / Shared Core)
- **`app/`**: PWA Monefyi Personal Finance (HTML/CSS/JS).
- **`landing/`**: Landing page utama `monefyi.com`.
- **`STAY/`**: Modul manajemen penginapan Monefyi STAY.
- **`Mini App Monefyi/`**: Kumpulan mini-app Telegram/Web pendukung.
- **`my-supabase-project/`**: Database migrations, policies, dan Supabase Edge Functions.

---

## 2. Brand Guidelines Froyek

Pedoman visual dan identitas merek Froyek didefinisikan secara terpusat di **[`config/brand/BRAND.md`](config/brand/BRAND.md)**:

- **Nama Produk:** `froyek` (huruf kecil)
- **Tagline:** *"Agent for your project"*
- **Warna Utama:**
  - Dark Slate / Forest: `#0A3A2E`
  - Crisp White: `#FFFFFF`
  - Deep Dark (Surface): `#081C15`
  - Soft Neutral (Light Surface): `#F7F9F8`
- **Aset Logo:**
  - Origami Mark (`config/brand/froyek-mark.svg`)
  - Full Wordmark (`config/brand/froyek-logo.svg`)
  - Icon PWA & Favicon (`apps/web/public/` & `apps/landing/public/`)

---

## 3. Menjalankan Secara Lokal (Quickstart)

Pastikan dependensi telah terinstal:

```bash
npm install
```

### Script Utama Froyek:

```bash
# Menjalankan aplikasi web Froyek (port 5173)
npm run dev:web

# Menjalankan landing page & Estimator Froyek (port 3000)
npm run dev:landing-froyek

# Build bundle aplikasi web Froyek
npm run build:web

# Menjalankan unit test aplikasi web Froyek (Vitest)
npm run test:web

# Menjalankan pengujian & skenario engine landing Froyek
npm run test:landing

# Menjalankan gerbang verifikasi rebrand & deteksi pelanggaran teks
npm run gate:rebrand
```

### Script Aplikasi Monefyi:

```bash
npm run dev          # Aplikasi PWA Monefyi
npm run dev:landing  # Landing page Monefyi
npm run dev:stay     # Aplikasi STAY
```

---

## 4. Keamanan & Kredensial

- **Jangan pernah melakukan commit API Key / Secret ke repositori.**
- Seluruh kredensial Supabase (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dikonfigurasikan melalui Environment Variables atau GitHub Secrets.
- Sebelum melakukan merge atau deployment ke produksi, ikuti panduan **[`docs/migration/04-cutover.md`](docs/migration/04-cutover.md)** untuk rotasi kredensial.

---

## 5. Dokumentasi Terkait

- [Inventaris Pemisahan (00-inventory.md)](docs/migration/00-inventory.md)
- [Audit Rebrand & Lokasi Rahasia (01-rebrand-audit.md)](docs/migration/01-rebrand-audit.md)
- [Baseline Supabase Advisor (02-supabase-advisor-baseline.md)](docs/migration/02-supabase-advisor-baseline.md)
- [Laporan Verifikasi Tahap 5 (03-verification.md)](docs/migration/03-verification.md)
- [Panduan Cutover Produksi (04-cutover.md)](docs/migration/04-cutover.md)
