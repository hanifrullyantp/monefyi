# Cursor Master Prompt — Monefyi Planner Estimator Upgrade

**File:** `ESTIMATOR_UPGRADE_MASTER_PROMPT.md`
**Untuk:** Cursor AI (dijalankan bertahap per phase)
**Konteks:** Upgrade modul Estimator agar siap dijual sebagai hook product Rp99.000

---

## INSTRUKSI UNTUK CURSOR

Dokumen ini berisi **6 phase** upgrade. Kerjakan **per phase** — jangan skip atau gabungkan tanpa persetujuan user. Setelah menyelesaikan satu phase, laporkan hasil dan tunggu instruksi untuk lanjut ke phase berikutnya.

**Prinsip yang HARUS diikuti di semua phase:**

1. **Responsive-first** — semua UI harus bagus di desktop (>1280px), tablet (768-1279px), dan mobile (<768px). Test dengan Chrome DevTools responsive mode di semua breakpoint utama.
2. **Bahasa Indonesia** — semua label, tombol, empty state, error message dalam bahasa Indonesia yang natural.
3. **Design system konsisten** — gunakan token/warna yang sudah ada di aplikasi. Jangan buat variasi warna baru tanpa alasan kuat.
4. **Jangan hapus fitur yang sudah ada** — hanya perbaiki, tambah, atau rearrange. Jika ada fitur yang harus dihapus, konfirmasi dulu.
5. **Tidak buat landing page publik** di phase manapun. Fokus internal aplikasi.
6. **Pembayaran diarahkan ke `checkout.monefyi.com`** — jangan buat halaman checkout internal. Estimator tinggal generate order dan redirect ke checkout.monefyi.com dengan parameter yang sesuai.
7. **Migrasi database** — jika phase butuh perubahan schema, buatkan file migrasi Supabase di `supabase/migrations/` dengan naming convention yang konsisten.
8. **Commit per phase** — setelah phase selesai, sarankan message commit yang jelas.

---

## KONTEKS PRODUK (BACA DULU)

Monefyi Planner adalah aplikasi manajemen proyek untuk kontraktor Indonesia. Modul **Estimator** akan dijadikan **hook product** dengan harga Rp99.000 (sekali bayar, lifetime access). Pembelian Estimator otomatis memberi user:
- Akses penuh Estimator (pricelist, quotation builder, PDF, WA share)
- **Free trial Planner** dengan 1 proyek aktif
- Estimasi yang diterima klien bisa langsung di-convert jadi Proyek + RAP

Model upsell: saat user mau buat proyek ke-2, sistem mendorong upgrade ke Planner Pro (Rp199K/bulan), dengan Rp99K Estimator jadi credit potongan bulan pertama.

**Tier user:**
- `free` — belum beli apa-apa, tidak bisa akses Estimator
- `estimator` — beli Rp99K, akses Estimator + 1 proyek aktif
- `pro` — Rp199K/bln, 10 proyek + Finance + tim 5 member
- `enterprise` — Rp499K/bln, unlimited

**File referensi produk:**
- `APA_ITU_MONEFYI_PLANNER.md` — penjelasan produk
- `MONEFYI_PLANNER_MASTER.md` — dokumen teknis lengkap

---

# PHASE 1 — UI/UX POLISH ESTIMATOR

**Goal:** Estimator terlihat profesional dan polished. Semua bug visual diperbaiki. Responsive di semua device.
**Estimasi:** 4-6 hari kerja
**Dependency:** Tidak ada

## 1.1 Redesign Halaman Daftar Estimasi (`/app/estimator`)

### Masalah saat ini
- Nama customer tidak jelas dibedakan dari judul estimasi
- Semua badge status terlihat sama (tidak ada warna berbeda)
- Format tanggal ada dash sisa: "— · 18 Agustus 2026"
- Card tidak clickable sebagai keseluruhan (harus klik icon edit)
- Tidak ada info profit — data paling penting hilang
- Tidak ada sorting
- Empty state tidak mendidik untuk user baru

### Requirements

**A. Card Estimasi (redesign):**

Layout mobile (< 768px) — stacked vertical:
```
┌─────────────────────────────────────┐
│ EST-2026-033      [● Draft]         │
│                                     │
│ Rudi kc — Renovasi Dapur            │  ← judul (bold, main)
│ Klien: Rudi · 0812-xxxx-xxxx        │  ← klien (gray, small)
│ 18 Agu 2026                         │  ← tanggal
│                                     │
│ Rp 22.156.000                       │  ← total (large, bold)
│ Profit: Rp 3.541.000                │  ← profit (green, small)
│                                     │
│ [✏️ Edit] [📄 Duplikat] [🗑️]        │
└─────────────────────────────────────┘
```

Layout desktop (≥ 768px) — horizontal dengan alokasi kolom:
```
┌───────────────────────────────────────────────────────────────────────┐
│ EST-2026-033 [● Draft]  Rudi kc — Renovasi Dapur     Rp 22.156.000    │
│                         Klien: Rudi · 0812-xxxx      Profit: Rp 3.5jt │
│                         18 Agu 2026                  [✏] [📄] [🗑]     │
└───────────────────────────────────────────────────────────────────────┘
```

**B. Status Badge Warna:**

Buat komponen `<StatusBadge status={...} />` yang dipakai di list dan builder:

| Status | Background | Text | Label |
|--------|-----------|------|-------|
| `draft` | `bg-slate-100` | `text-slate-700` | "Draft" |
| `sent` | `bg-blue-100` | `text-blue-700` | "Terkirim" |
| `accepted` | `bg-emerald-100` | `text-emerald-700` | "Diterima" |
| `rejected` | `bg-red-100` | `text-red-700` | "Ditolak" |
| `converted` | `bg-teal-100` | `text-teal-700` | "Jadi Proyek" |

Prefix dot berwarna (●) di depan label untuk aksesibilitas warna.

**C. Card seluruhnya clickable:**
- Klik area card apa saja (kecuali action icons) → navigate ke `/app/estimator/:id`
- Action icons harus punya `e.stopPropagation()`
- Hover state: subtle background tint + shadow lift

**D. Fix format tanggal:**
- Hapus pattern "— ·" di depan tanggal
- Format konsisten: "18 Agu 2026" (menggunakan `date-fns` locale `id`)

**E. Tambah info Profit:**
- Hitung dari data estimasi: `total_penawaran - total_hpp - overhead`
- Format: "Profit: Rp X.XXX.XXX" dengan warna emerald-600
- Jika profit negatif: warna merah dengan icon warning kecil

**F. Sorting dropdown:**
Di kanan atas (sebelah tombol "+ Estimasi Baru"), tambah dropdown:
- Terbaru (default)
- Terlama
- Nilai Tertinggi
- Nilai Terendah
- Profit Tertinggi

**G. Empty state (belum ada estimasi):**
```
        [Icon dokumen dengan sparkle]

    Buat penawaran pertama Anda

    Dari pricelist ke PDF profesional dalam 5 menit.
    Hitung margin, kirim via WhatsApp, langsung dapat jawaban.

        [+ Buat Estimasi Baru]

    ─── atau setup pricelist dulu ───

        [Setup Pricelist →]
```

**H. Bulk action (nice to have jika waktu cukup):**
- Long press di mobile atau checkbox multi-select di desktop
- Bulk delete untuk draft yang tidak terpakai

### File yang kemungkinan diedit
- Halaman list estimator (`app/estimator/page.tsx` atau equivalent)
- Card component estimasi
- Buat baru: `components/estimator/StatusBadge.tsx`
- Buat baru: `components/estimator/EstimationCard.tsx`
- Utility date formatter di `lib/utils/date.ts`

## 1.2 Redesign Halaman Builder Estimasi (`/app/estimator/:id` & `/app/estimator/new`)

### Masalah saat ini
- Header ambigu — "Rudi kc" itu klien atau judul?
- "Detail & Customer" tersembunyi di dropdown
- Kolom tabel terpotong di viewport medium
- Profit estimasi tidak terlihat tanpa scroll
- Floating mini PDF preview di pojok kanan bawah terlihat seperti bug
- Tidak ada auto-save

### Requirements

**A. Redesign Header Estimasi:**

Layout mobile (< 768px):
```
┌────────────────────────────────────┐
│ ← Kembali                          │
│                                    │
│ EST-2026-033  [● Draft ▾]          │
│                                    │
│ [Judul estimasi — editable inline] │
│                                    │
│ 👤 Rudi · 📱 0812-xxx-xxx          │
│ 📅 18 Agu 2026                     │
│                                    │
│           [💾 Simpan] [⋮ Aksi]     │
└────────────────────────────────────┘
```

Layout desktop:
```
┌──────────────────────────────────────────────────────────────────┐
│ ← EST-2026-033 [● Draft ▾]                    [💾 Simpan] [⋮]    │
│                                                                  │
│ [Judul estimasi — editable inline, teks besar bold]              │
│                                                                  │
│ 👤 Klien: Rudi · 📱 0812-xxxx-xxxx · 📅 18 Agu 2026              │
└──────────────────────────────────────────────────────────────────┘
```

- Judul estimasi: input inline yang terlihat seperti heading. Placeholder: "Judul estimasi *". Font besar (text-2xl / text-3xl).
- Status badge = dropdown untuk transition (implementasi transisi ada di Phase 2)
- Menu "⋮ Aksi" berisi: Duplikat, Hapus, (nanti: Jadikan Proyek — Phase 3)
- Nomor telepon klien clickable dengan `href="tel:..."` dan `href="https://wa.me/..."`

**B. Section Klien tidak lagi tersembunyi:**

Ganti dropdown "Detail & Customer" dengan collapsible section:
- Default **terbuka** saat estimasi baru (belum ada nama klien)
- Default **collapsed** saat editing (sudah ada data)
- Header collapsible: "Detail Klien ▾" / "Detail Klien ▸"
- Fields: Nama klien, No. WhatsApp, Email, Catatan kebutuhan

**C. Panel Ringkasan (sidebar kanan) — restructure:**

Reorder agar PROFIT selalu terlihat tanpa scroll:

```
┌─ RINGKASAN ────────────────┐
│                            │
│ ┌─ TOTAL PENAWARAN ──────┐ │  ← Card hijau, existing
│ │  Rp 22.156.000         │ │
│ └────────────────────────┘ │
│                            │
│ ┌─ PROFIT ESTIMASI ──────┐ │  ← Card baru, warna emerald
│ │  Rp 3.541.000          │ │     PENTING: harus visible tanpa scroll
│ │  Margin: 16.2%         │ │
│ └────────────────────────┘ │
│                            │
│ ─── Breakdown ───          │
│ Subtotal HPP: 18.564.800   │
│ Diskon per item: -6.765K   │
│ Subtotal jual: 22.156.000  │
│ Overhead 10%: 2.215.600    │
│ PPN 11%: 2.681K            │
│ ─────────────              │
│ Grand Total: 27.052K       │
│                            │
│ 3 item · 1 tidak dihitung  │
└────────────────────────────┘
```

- Panel harus `position: sticky` dengan `top: 80px` di desktop
- Di mobile: panel jadi bottom sheet yang bisa di-swipe up (atau collapsible di atas tabel)
- Card Profit menggunakan warna emerald yang beda dari card Total (biar tidak monoton hijau)

**D. Tabel Rincian Item — Responsive:**

Breakpoint behavior:
- Desktop (≥ 1280px): semua kolom tampil (✓, #, ITEM, KAT, SAT, QTY, JUAL/UNIT, MARGIN%, HPP/UNIT)
- Tablet (768-1279px): sembunyikan KAT column, jadikan tooltip di item name
- Mobile (< 768px): **redesign jadi card view**, bukan tabel

Card view mobile per item:
```
┌────────────────────────────────────┐
│ ☑ #1  Kabinet Atas — Kitchen Set   │
│      🏷️ Borongan · m               │
│                                    │
│ Qty: 5,55    Jual/unit: 2.900.000  │
│ Margin: 40%  HPP/unit: 1.740.000   │
│                                    │
│ Subtotal: Rp 16.095.000            │
│                                    │
│ [Edit] [Hapus]                     │
└────────────────────────────────────┘
```

**PENTING:** kolom HPP TIDAK boleh terpotong di viewport manapun. Ini data kritis.

**E. Auto-save:**

- Debounced auto-save setiap 30 detik setelah perubahan terakhir
- Indicator status di sebelah tombol "Simpan":
  - `Menyimpan...` (spinner abu-abu) saat proses
  - `Tersimpan ✓` (hijau) setelah sukses
  - `Gagal simpan` (merah) + tombol retry jika error
- Tombol "Simpan" manual tetap ada untuk immediate save
- Simpan indicator harus subtle, jangan mengganggu

**F. Hapus floating mini PDF preview:**

- Hapus komponen mini preview yang muncul di pojok kanan bawah
- Ganti dengan: tombol "Preview PDF" di footer action bar membuka **modal full-screen**
- Modal berisi: PDF preview yang bisa di-scroll + tombol [Download] [WhatsApp] [Tutup] di header

**G. Empty state builder (belum ada item):**

Redesign yang sekarang cuma "Belum ada item estimasi." — bikin lebih actionable:
```
       [Icon: keranjang belanja atau kalkulator]

        Belum ada item

  Tambah item dari 3 cara:

  ┌──────────────┐ ┌──────────────┐ ┌──────────┐
  │ ⚡ Smart     │ │ 📋 Dari      │ │ + Manual │
  │    Input     │ │   Pricelist  │ │          │
  │              │ │              │ │          │
  │ Ketik natural│ │ Pilih dari   │ │ Isi baris│
  │ (paling cpt) │ │ harga master │ │ satu-satu│
  └──────────────┘ └──────────────┘ └──────────┘
```

### File yang kemungkinan diedit
- Halaman builder estimator
- Header component
- Summary panel component (extract jadi komponen sendiri)
- Line items table/card component
- Buat baru: `components/estimator/PDFPreviewModal.tsx`
- Auto-save hook: `hooks/useAutoSave.ts`

## 1.3 Redesign Halaman Pricelist (`/app/estimator/pricelist`)

### Masalah saat ini
- Tabel flat tanpa grouping
- Kolom "PRODUK" membingungkan
- Angka HPP raw tanpa format Rp
- Tidak ada bulk edit
- Tidak ada sort
- Tidak ada info total item

### Requirements

**A. Header info:**
Di bawah judul "Pricelist", tampilkan: "47 item · 5 kategori"

**B. Grouping by kategori (default):**

Layout desktop — tabel dengan sub-header per grup:
```
┌ Borongan Kerja (12 item) ▾ ─────────────────────────────┐
│ Item          Produk       Satuan  Jual/Sat  Margin% ... │
│ Backsplash    Kitchen Set  m       500.000   60          │
│ Kabinet Atas  Kitchen Set  m       2.900.000 40          │
│ ...                                                       │
└──────────────────────────────────────────────────────────┘

┌ Material (18 item) ▾ ────────────────────────────────────┐
│ ...                                                       │
└──────────────────────────────────────────────────────────┘
```

- Setiap grup collapsible (default: expanded)
- Klik header grup → toggle
- Filter kategori dari dropdown "Semua kategori" tetap berfungsi (menyembunyikan grup yang tidak sesuai)

Layout mobile — card view per item:
```
┌────────────────────────────────────┐
│ Backsplash                    [☑]  │
│ Kitchen Set · Borongan · m         │
│                                    │
│ Jual/Sat:  Rp 500.000              │
│ Margin:    60%                     │
│ Est. HPP:  Rp 200.000              │
│                                    │
│ [Edit] [Duplikat] [Hapus]          │
└────────────────────────────────────┘
```

Group header di mobile jadi section header collapsible.

**C. Format angka konsisten:**
- Input harga jual: accept raw number, tapi display saat blur harus formatted
- Est. HPP: SELALU format "Rp 2.071.429" (bukan raw "2071429")
- Gunakan utility formatter yang sama dengan seluruh app

**D. Sort per kolom:**
- Klik header kolom → sort ascending
- Klik lagi → descending
- Icon arrow (↑ / ↓) di header aktif
- Sort options: Nama, Harga Jual, Margin%

**E. Bulk action:**

- Checkbox column paling kiri (mobile: checkbox di card corner)
- "Select all in group" checkbox di header grup
- Saat ada ≥1 item terpilih, tampilkan floating action bar di bawah:
  ```
  ┌─────────────────────────────────────────┐
  │ 3 item dipilih                          │
  │ [Ubah Margin%] [Ubah Kategori] [Hapus]  │
  │                              [Batal]    │
  └─────────────────────────────────────────┘
  ```
- "Ubah Margin%" → modal small: input margin baru → apply ke semua terpilih
- "Ubah Kategori" → modal dropdown: pilih kategori baru → apply
- "Hapus" → confirmation dialog

**F. Duplikat item:**
- Icon duplikat (copy) di sebelah icon hapus per row
- Klik → item terduplikat dengan nama "(Copy)" appended, harga sama

**G. Empty state pricelist:**
Ini kritis untuk onboarding. Implementasi detail ada di Phase 4 (Starter Templates). Untuk sekarang buat placeholder:
```
       [Icon: dokumen dengan tag]

        Belum ada item di pricelist

  Setup harga sekali, pakai berkali-kali.

  [+ Tambah Item Manual]
  [📤 Import CSV]
  [🎁 Mulai dari Template →]  (disabled — coming in Phase 4)
```

### File yang kemungkinan diedit
- Halaman pricelist
- Grouped table component (buat baru)
- Bulk action bar component (buat baru)
- Modal ubah margin/kategori (buat baru)
- Number formatter utility (pastikan konsisten)

## 1.4 Perbaikan Halaman Settings Estimator (`/app/estimator/settings`)

### Masalah saat ini
- "URL Logo (company-assets)" — user harus punya URL hosting sendiri (BLOCKER besar)
- Tidak ada preview PDF hasil settings
- Field rekening bank, tanda tangan, template PDF belum terlihat lengkap
- Tidak ada progress indicator

### Requirements

**A. Ganti URL Logo dengan File Upload:**

Komponen upload zone:
- Drag & drop area + tombol "Pilih File"
- Accepted: JPG, PNG, WebP
- Max size: 2MB (client-side check)
- Kompresi otomatis: max 400x400px, quality 0.8 (gunakan `browser-image-compression` atau canvas manual)
- Upload ke Supabase Storage: bucket `company-logos`, path `{org_id}/logo-{timestamp}.{ext}`
- Simpan URL/path hasilnya ke settings

State:
- Belum ada logo: tampilkan upload zone
- Sudah ada logo: tampilkan preview thumbnail (100x100) + tombol "Ganti Logo" + "Hapus"

**B. Live Preview PDF:**

Di desktop, layout split: form di kiri, preview di kanan (sticky).
Di mobile: preview di atas atau di bawah form.

Preview NUKAN full PDF render — cukup HTML card yang meniru header PDF:
```
┌─────────────────────────────────────────┐
│ [Logo]  Intero                          │
│         1x Buat, Pakai Selamanya        │
│                                         │
│ Jln. Parit bugis Gg bahwan no 7A        │
│ 📱 081617323231 · 🌐 Intero.id           │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ (Preview area — where quotation appears)│
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Rekening: BCA 1234567890 a.n. Intero    │
│                                         │
│         [Tanda tangan/cap]              │
│         (nama), (jabatan)               │
└─────────────────────────────────────────┘
```

Preview update real-time saat user edit form (debounce 300ms).

**C. Lengkapi semua field:**

Section-section dalam settings:

1. **Identitas Perusahaan** (existing, tambah upload logo)
2. **Rekening Bank** (pastikan ada):
   - Nama bank
   - Nomor rekening
   - Atas nama
3. **Tanda Tangan Digital** (tambah jika belum):
   - Nama penandatangan
   - Jabatan
   - Upload gambar tanda tangan (bucket `company-signatures`, format & flow sama dengan logo tapi max 300x150px)
4. **Template PDF Default:**
   - Radio/card selection: Modern | Classic | Minimal | Bold
   - Setiap template tampilkan thumbnail mini preview
   - Selected template jadi default untuk estimasi baru
5. **Warna Brand:**
   - Color picker (native `<input type="color">` atau library)
   - Preview color chip
   - Warna dipakai di accents PDF (garis header, borders)
6. **Template Pesan WhatsApp:**
   - Textarea untuk template pesan default saat share WA
   - Placeholder variables: `{nama_klien}`, `{kode_est}`, `{total}`, `{nama_perusahaan}`
   - Preview: tampilkan hasil template setelah variable diganti

**D. Progress indicator:**
Di atas form: "Profil perusahaan: 5/9 lengkap"
Field yang dihitung: nama, telepon, alamat, logo, bank, tanda tangan, template, warna, WA template.
Visual progress bar (segmented atau linear).

**E. First-time prompt:**
Jika settings kosong (nama perusahaan blank), tampilkan banner di atas:
> ⚠️ Setup identitas perusahaan Anda agar penawaran terlihat profesional. Mulai dari nama dan logo.

### Supabase Storage Setup

Buat migration untuk bucket dan RLS:
```sql
-- Bucket: company-logos
insert into storage.buckets (id, name, public) 
values ('company-logos', 'company-logos', false);

-- Bucket: company-signatures
insert into storage.buckets (id, name, public) 
values ('company-signatures', 'company-signatures', false);

-- RLS: hanya org member bisa upload/read logo org-nya
create policy "org members can manage company logos"
on storage.objects for all 
using (
  bucket_id = 'company-logos' 
  and (storage.foldername(name))[1] = (
    select org_id::text from user_orgs where user_id = auth.uid()
  )
);
-- Repeat untuk company-signatures
```

### File yang kemungkinan diedit
- Halaman settings estimator
- Buat baru: `components/estimator/LogoUpload.tsx`
- Buat baru: `components/estimator/SignatureUpload.tsx`
- Buat baru: `components/estimator/PDFPreviewCard.tsx`
- Buat baru: `components/estimator/ProgressChecklist.tsx`
- Utility image compression: `lib/utils/image-compression.ts`
- Migration: `supabase/migrations/{timestamp}_estimator_storage_buckets.sql`

## 1.5 Konsistensi Design System

**A. Icon Estimator di sidebar:**
Icon saat ini (tabel spreadsheet) tidak intuitif. Ganti dengan icon kalkulator atau receipt/quote. Gunakan Lucide/Heroicons: `Calculator`, `Receipt`, atau `FileText`.

**B. Breadcrumb navigation:**
Di halaman detail (builder, pricelist, settings), tambahkan breadcrumb di header area:
- `Estimator > EST-2026-033` (untuk builder)
- `Estimator > Pricelist` (untuk pricelist)
- `Estimator > Pengaturan` (untuk settings)

Setiap segmen clickable ke parent.

**C. Konsistensi tombol Simpan:**
Semua halaman edit (builder, pricelist, settings) — tombol "Simpan" di posisi yang sama: kanan atas header.

**D. Mobile bottom safe area:**
Semua footer action bar (Batal, WhatsApp, Preview PDF, Download PDF) di builder — pastikan tidak terpotong iOS safe area. Gunakan `env(safe-area-inset-bottom)`.

## Checkpoint Phase 1

Setelah Phase 1 selesai, verify:
- [ ] List estimasi jelas membedakan judul, klien, tanggal, total, profit
- [ ] Status badge berwarna berbeda per status
- [ ] Card estimasi clickable seluruhnya
- [ ] Builder header jelas: kode, judul, klien terlihat langsung
- [ ] Profit estimasi terlihat tanpa scroll
- [ ] Tabel item responsive: card view di mobile, kolom sesuai di tablet/desktop
- [ ] Auto-save berfungsi + indicator
- [ ] Pricelist ter-group per kategori + bulk action
- [ ] Logo bisa di-upload (bukan URL)
- [ ] Preview PDF live di settings
- [ ] Semua halaman responsive di 375px, 768px, 1024px, 1440px

**Suggested commit message:**
```
feat(estimator): phase 1 - ui/ux polish

- Redesign list, builder, pricelist, settings pages
- Add status badges with color coding
- Add profit estimation to list and summary panel
- Replace logo URL input with file upload
- Add live PDF preview in settings
- Make all pages responsive (mobile/tablet/desktop)
- Fix date format, remove floating PDF mini preview
- Add auto-save with indicator
```

---

# PHASE 2 — STATUS TRANSITION & PIPELINE

**Goal:** User bisa kelola pipeline estimasi (Draft → Terkirim → Diterima/Ditolak).
**Estimasi:** 2-3 hari
**Dependency:** Phase 1 selesai

## 2.1 Database Migration

Tambahkan kolom timestamp status ke tabel `estimations`:

```sql
-- File: supabase/migrations/{timestamp}_estimation_status_timestamps.sql

alter table estimations 
  add column if not exists sent_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists converted_at timestamptz,
  add column if not exists converted_project_id uuid references projects(id) on delete set null;

create index if not exists idx_estimations_status on estimations(status);
create index if not exists idx_estimations_org_status on estimations(org_id, status);
```

## 2.2 Status Transition UI

**A. Status Badge Dropdown di Builder Header:**

Status badge dari Phase 1 sekarang jadi dropdown:
```
[● Draft ▾]
  ├─ Tandai Terkirim
  ├─ Tandai Diterima
  ├─ Tandai Ditolak
  └─ Kembalikan ke Draft (jika bukan draft)
```

Aturan transisi:
- `draft` → bisa ke: `sent`, `accepted` (skip sent), `rejected`
- `sent` → bisa ke: `accepted`, `rejected`, `draft` (revert)
- `accepted` → bisa ke: `draft` (revert), `rejected`. Ke `converted` HANYA via wizard Phase 3
- `rejected` → bisa ke: `draft` (re-quote)
- `converted` → **read-only**, tidak bisa diubah. Show tooltip: "Estimasi sudah menjadi proyek."

Setiap transisi:
1. Show confirmation dialog: "Ubah status ke [Terkirim]? Status sekarang: [Draft]"
2. Save ke DB dengan timestamp yang sesuai
3. Update UI (badge, warna, action yang tersedia)
4. Toast notification: "Status diubah ke Terkirim"

**B. Auto-prompt Setelah PDF Download / WA Share:**

Saat user klik "Download PDF" atau "WhatsApp" DAN status masih `draft`:
- Setelah action selesai (PDF terdownload / WA link terbuka), setelah 500ms delay tampilkan toast dengan action:
  ```
  ┌────────────────────────────────────────┐
  │ 📤 PDF sudah dibagikan                 │
  │ Tandai estimasi sebagai Terkirim?      │
  │                     [Tandai] [Nanti]   │
  └────────────────────────────────────────┘
  ```
- Klik "Tandai" → status jadi `sent`, timestamp saved
- Klik "Nanti" → toast dismiss, tidak ada perubahan
- Toast auto-dismiss setelah 8 detik

**C. Filter tabs di list update:**
Filter tab yang sudah ada (Semua, Draft, Terkirim, Diterima, Jadi Proyek) sekarang harus berfungsi dengan status yang benar. Tambah tab "Ditolak" jika belum ada.

Setiap tab tampilkan count:
```
[Semua 24] [Draft 8] [Terkirim 12] [Diterima 3] [Ditolak 1] [Jadi Proyek 0]
```

**D. Status pipeline view (opsional, nice to have):**

Di list, tambah toggle view: "List" vs "Pipeline (Kanban)".
Kanban 5 kolom: Draft | Terkirim | Diterima | Ditolak | Jadi Proyek
Card estimasi bisa di-drag antar kolom untuk transisi.

**Jika tidak sempat di phase ini, skip. Bisa di iterasi berikutnya.**

## 2.3 History/Audit Info

Di halaman detail builder, tambah section kecil di footer:
```
Riwayat Status:
• Dibuat: 14 Agu 2026, 10:30
• Terkirim: 15 Agu 2026, 14:22
• Diterima: 16 Agu 2026, 09:15
```

Ini quick reference untuk user tahu kapan estimasi ini progress.

## Checkpoint Phase 2

- [ ] Status badge dropdown berfungsi
- [ ] Semua transisi tersimpan dengan timestamp
- [ ] Auto-prompt setelah PDF/WA share
- [ ] Filter tabs punya count
- [ ] History/audit info tampil di footer builder
- [ ] Confirmation dialog untuk setiap transisi
- [ ] Status `converted` read-only

**Suggested commit message:**
```
feat(estimator): phase 2 - status transition system

- Add status timestamp columns (sent_at, accepted_at, etc.)
- Status badge dropdown for transitions with confirmation
- Auto-prompt after PDF download / WhatsApp share
- Filter tabs with count per status
- Status history display in builder footer
- Prevent editing converted estimations
```

---

# PHASE 3 — CONVERT ESTIMASI KE PROYEK (CORE FEATURE)

**Goal:** User bisa jadikan estimasi yang diterima → jadi proyek + RAP otomatis.
**Estimasi:** 4-5 hari
**Dependency:** Phase 2 selesai

Ini adalah **fitur paling kritis** untuk business model. Prioritaskan quality dan reliability.

## 3.1 Database Migration

```sql
-- File: supabase/migrations/{timestamp}_estimation_project_bridge.sql

-- Sudah ditambahkan di phase 2:
-- estimations.converted_project_id uuid references projects(id)

-- Tambahkan reverse reference:
alter table projects 
  add column if not exists source_estimation_id uuid references estimations(id) on delete set null;

create index if not exists idx_projects_source_estimation on projects(source_estimation_id);

-- Tambahkan kolom ke RAP items untuk trace ke estimasi:
alter table rap_items 
  add column if not exists source_estimation_item_id uuid;

create index if not exists idx_rap_items_source on rap_items(source_estimation_item_id);
```

## 3.2 Tombol "Jadikan Proyek"

**Lokasi tombol:**
1. **Builder header** — menu "⋮ Aksi" → item "🚀 Jadikan Proyek"
   - Prominent (bold, hijau) jika status = `accepted`
   - Normal jika status lain (bisa juga convert dari draft, dengan warning)
   - Disabled + tooltip jika status = `converted`
2. **List card** — untuk estimasi status `accepted`, tampilkan tombol quick "🚀 Jadikan Proyek" di card

## 3.3 Convert Wizard Modal

Full-screen modal (desktop) atau full-page (mobile), 2 langkah:

### Step 1: Detail Proyek

```
┌─────────────────────────────────────────────────┐
│ Jadikan Proyek                             [×]  │
│ Langkah 1 dari 2                                │
│                                                 │
│ ● ─── ○                                         │
│                                                 │
│ ┌─ Detail Proyek ──────────────────────────┐   │
│ │                                          │   │
│ │ Nama Proyek *                            │   │
│ │ [Renovasi Dapur Rudi          ]         │   │
│ │ ℹ️ Pre-filled dari judul estimasi        │   │
│ │                                          │   │
│ │ Nama Klien                               │   │
│ │ [Rudi                          ]         │   │
│ │                                          │   │
│ │ Kontak Klien                             │   │
│ │ [0812-xxxx-xxxx                ]         │   │
│ │                                          │   │
│ │ Tanggal Mulai *                          │   │
│ │ [📅 20 Agu 2026 ▾]                      │   │
│ │                                          │   │
│ │ Target Selesai *                         │   │
│ │ [📅 19 Sep 2026 ▾]  (+30 hari)          │   │
│ │                                          │   │
│ │ Deskripsi                                │   │
│ │ [                                     ]   │   │
│ │ ℹ️ Pre-filled dari catatan estimasi      │   │
│ │                                          │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│         [Batal]              [Lanjut →]         │
└─────────────────────────────────────────────────┘
```

### Step 2: Pilih Item untuk RAP

```
┌─────────────────────────────────────────────────┐
│ Jadikan Proyek                             [×]  │
│ Langkah 2 dari 2                                │
│                                                 │
│ ● ─── ●                                         │
│                                                 │
│ ┌─ Pilih Item untuk RAP ───────────────────┐   │
│ │                                          │   │
│ │ Item mana yang masuk ke Rencana          │   │
│ │ Anggaran Pelaksanaan (RAP)?              │   │
│ │                                          │   │
│ │ [☑ Pilih Semua]         Total: Rp 18.5jt │   │
│ │                                          │   │
│ │ ▾ Kitchen Set (3 item)                   │   │
│ │   ☑ Kabinet Atas — 5,55m                 │   │
│ │      HPP: Rp 1.740.000/m                 │   │
│ │      Total: Rp 9.657.000                 │   │
│ │                                          │   │
│ │   ☑ Kabinet Atas (2) — 6,15m             │   │
│ │      HPP: Rp 660.000/m                   │   │
│ │      Total: Rp 4.059.000                 │   │
│ │                                          │   │
│ │   ☑ Lemari kulkas — 2,09 pcs             │   │
│ │      HPP: Rp 2.320.000/pcs               │   │
│ │      Total: Rp 4.848.800                 │   │
│ │                                          │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ Total budget RAP: Rp 18.564.800                 │
│                                                 │
│    [← Kembali]        [🚀 Buat Proyek]         │
└─────────────────────────────────────────────────┘
```

Behavior:
- Semua item checked by default (dari estimasi yang `included_in_total`)
- Item yang di-uncheck di estimasi (exclude) → default unchecked di sini
- Item bonus (0 rupiah) → default unchecked, tapi bisa dicheck
- Group by product group jika ada
- Total budget update real-time saat check/uncheck

## 3.4 Convert Logic (Backend)

**Function:** `convertEstimationToProject(estimationId, projectData, selectedItemIds)`

Steps:
1. **Cek entitlement & project limit** (implementasi Phase 5, untuk sekarang skip guard)
2. **Create project record:**
   ```typescript
   {
     org_id,
     name: projectData.name,
     client_name: projectData.client,
     client_contact: projectData.contact,
     start_date: projectData.startDate,
     end_date: projectData.endDate,
     description: projectData.description,
     status: 'active',
     source_estimation_id: estimationId,
     created_by: userId,
   }
   ```

3. **Create RAP items dari selected estimation items:**
   ```typescript
   for each selectedItem:
     rapItem = {
       project_id: newProject.id,
       name: item.item_name,
       category: mapCategory(item.category), // 'material', 'labor', 'jasa', etc.
       work_package: item.product_group, // jika ada
       planned_qty: item.qty,
       unit: item.unit,
       budget_per_unit: item.hpp_per_unit,
       budget_total: item.qty * item.hpp_per_unit,
       source_estimation_item_id: item.id,
       created_by: userId,
     }
   ```

4. **Category mapping:**
   ```
   Estimasi kategori → RAP kategori
   ─────────────────────────────────
   'borongan'        → 'borongan'
   'material'        → 'material'
   'upah'            → 'labor'
   'alat'            → 'equipment'
   'jasa'            → 'service'
   'lainnya'         → 'other'
   ```

5. **Update estimation:**
   ```typescript
   {
     status: 'converted',
     converted_at: now(),
     converted_project_id: newProject.id,
   }
   ```

6. **Transaction:** semua ini harus dalam 1 transaction. Jika ada yang gagal, rollback semua.

7. **Return:** `{ projectId: newProject.id }`

## 3.5 Post-Conversion UX

**A. Success screen (dalam modal atau navigate):**
```
       [Icon: check circle hijau + confetti]

        Proyek berhasil dibuat!

    Renovasi Dapur Rudi

    3 item RAP dengan total budget
         Rp 18.564.800

    Apa selanjutnya?

    [📊 Buka Proyek]   [📝 Kembali ke Estimasi]
```

**B. Banner di estimasi yang sudah converted:**
```
┌─────────────────────────────────────────────────┐
│ ✅ Estimasi ini sudah menjadi proyek            │
│    "Renovasi Dapur Rudi" →                      │
└─────────────────────────────────────────────────┘
```
Banner clickable ke halaman proyek.

**C. Banner di proyek yang berasal dari estimasi:**
Di halaman detail proyek, tambah info:
```
📎 Dibuat dari Estimasi EST-2026-033 →
```

## 3.6 Edge Cases

- **Estimasi tanpa item:** Show error, tidak boleh convert
- **User cancel di step 2:** Data step 1 disimpan sementara, bisa kembali
- **Duplicate convert attempt:** Jika `converted_project_id` sudah ada, block dan arahkan ke proyek existing
- **Estimasi rejected/draft:** Bisa convert tapi tampilkan warning: "Estimasi ini belum diterima klien. Yakin ingin membuatnya jadi proyek?"

## Checkpoint Phase 3

- [ ] Tombol "Jadikan Proyek" muncul di builder dan list (untuk accepted)
- [ ] Wizard 2 step berfungsi
- [ ] Data pre-filled dari estimasi
- [ ] User bisa pilih/uncheck item RAP
- [ ] Total budget update real-time
- [ ] Backend logic membuat project + RAP dalam 1 transaction
- [ ] Estimasi status auto-update ke `converted`
- [ ] Banner reference di estimasi & proyek
- [ ] Success screen dengan CTA ke proyek baru
- [ ] Responsive di semua device

**Suggested commit message:**
```
feat(estimator): phase 3 - convert estimation to project

- Add "Jadikan Proyek" button in builder and list
- 2-step wizard for project creation from estimation
- Auto-generate RAP items from selected estimation items
- Category mapping from estimator to RAP
- Bidirectional reference (estimation ↔ project)
- Success screen with navigation to new project
- Transaction-safe conversion logic
```

---

# PHASE 4 — ONBOARDING & PRICELIST TEMPLATES

**Goal:** First-time user experience yang smooth. User bisa setup lengkap dalam 5 menit.
**Estimasi:** 3-4 hari
**Dependency:** Phase 1 selesai (Phase 2 & 3 tidak wajib untuk phase ini, bisa paralel)

## 4.1 Pricelist Starter Templates

### Template Data

Buat 4 template di `lib/data/pricelist-templates.ts`:

**Template 1: Kitchen Set** (22 item)
```typescript
{
  id: 'kitchen-set',
  name: 'Kitchen Set',
  icon: '🍳',
  description: 'Untuk usaha kitchen set custom dan built-in furniture',
  itemCount: 22,
  items: [
    { name: 'Kabinet Atas', product: 'Kitchen Set', category: 'borongan', unit: 'm', sellPrice: 2900000, margin: 40 },
    { name: 'Kabinet Bawah', product: 'Kitchen Set', category: 'borongan', unit: 'm', sellPrice: 2900000, margin: 40 },
    { name: 'Countertop Granit', product: 'Kitchen Set', category: 'borongan', unit: 'm', sellPrice: 1500000, margin: 35 },
    { name: 'Countertop Marmer', product: 'Kitchen Set', category: 'borongan', unit: 'm', sellPrice: 2200000, margin: 35 },
    { name: 'Backsplash Keramik', product: 'Kitchen Set', category: 'borongan', unit: 'm', sellPrice: 500000, margin: 60 },
    { name: 'Rak Piring Tarik', product: 'Kitchen Set', category: 'borongan', unit: 'set', sellPrice: 850000, margin: 40 },
    { name: 'Rak Bumbu', product: 'Kitchen Set', category: 'borongan', unit: 'set', sellPrice: 450000, margin: 45 },
    { name: 'Lemari Kulkas Built-in', product: 'Kitchen Set', category: 'borongan', unit: 'pcs', sellPrice: 2900000, margin: 20 },
    { name: 'Island Kitchen', product: 'Kitchen Set', category: 'borongan', unit: 'm', sellPrice: 3500000, margin: 40 },
    { name: 'Sink + Kran', product: 'Kitchen Set', category: 'material', unit: 'set', sellPrice: 1200000, margin: 25 },
    { name: 'Exhaust Hood', product: 'Kitchen Set', category: 'material', unit: 'pcs', sellPrice: 1800000, margin: 20 },
    { name: 'LED Strip Kabinet', product: 'Kitchen Set', category: 'material', unit: 'm', sellPrice: 85000, margin: 40 },
    { name: 'Handle Kabinet', product: 'Kitchen Set', category: 'material', unit: 'pcs', sellPrice: 25000, margin: 50 },
    { name: 'Engsel Soft-Close', product: 'Kitchen Set', category: 'material', unit: 'pcs', sellPrice: 35000, margin: 50 },
    { name: 'HPL Sheet', product: 'Kitchen Set', category: 'material', unit: 'lembar', sellPrice: 320000, margin: 30 },
    { name: 'Multipleks 18mm', product: 'Kitchen Set', category: 'material', unit: 'lembar', sellPrice: 285000, margin: 25 },
    { name: 'Edging PVC', product: 'Kitchen Set', category: 'material', unit: 'm', sellPrice: 8000, margin: 40 },
    { name: 'Instalasi Listrik', product: 'Kitchen Set', category: 'jasa', unit: 'ls', sellPrice: 500000, margin: 50 },
    { name: 'Instalasi Air', product: 'Kitchen Set', category: 'jasa', unit: 'ls', sellPrice: 400000, margin: 50 },
    { name: 'Pengiriman', product: 'Kitchen Set', category: 'jasa', unit: 'ls', sellPrice: 350000, margin: 40 },
    { name: 'Pemasangan (Tukang)', product: 'Kitchen Set', category: 'upah', unit: 'ls', sellPrice: 2500000, margin: 30 },
    { name: 'Finishing & Cleaning', product: 'Kitchen Set', category: 'jasa', unit: 'ls', sellPrice: 300000, margin: 50 },
  ]
}
```

**Template 2: Renovasi Rumah** (30 item)
Focus: pondasi, dinding, plafon, cat, keramik, sanitary. Kategori material dominan.

**Template 3: Interior/Furniture** (25 item)
Focus: lemari, meja, kursi, partisi, wallpaper, cornice.

**Template 4: Konstruksi Ringan** (35 item)
Focus: struktur baja ringan, atap galvalum, pagar, kanopi, gudang, ruko.

Untuk setiap template, buat data lengkap dengan harga realistis Jabodetabek 2026 (bisa AI-generated tapi review manual agar tidak absurd).

### Modal Starter Template

Tampil saat pricelist EMPTY:

Layout desktop (grid 2x2):
```
┌─────────────────────────────────────────────┐
│ 📦 Mulai dengan Template Pricelist         │
│                                             │
│ Pilih tipe bisnis Anda untuk auto-populate │
│ pricelist dengan harga estimasi:            │
│                                             │
│ ┌───────────────┐  ┌───────────────┐        │
│ │  🍳            │  │  🏠            │       │
│ │  Kitchen Set  │  │  Renovasi     │        │
│ │  22 item      │  │  30 item      │        │
│ │               │  │               │        │
│ │  Kabinet,     │  │  Pondasi,     │        │
│ │  countertop,  │  │  cat, keramik,│        │
│ │  backsplash   │  │  sanitary     │        │
│ │               │  │               │        │
│ │  [Pilih]      │  │  [Pilih]      │        │
│ └───────────────┘  └───────────────┘        │
│                                             │
│ ┌───────────────┐  ┌───────────────┐        │
│ │  🪑            │  │  🏗️            │       │
│ │  Interior     │  │  Konstruksi   │        │
│ │  25 item      │  │  Ringan       │        │
│ │               │  │  35 item      │        │
│ │  Lemari, meja,│  │               │        │
│ │  partisi,     │  │  Baja ringan, │        │
│ │  furniture    │  │  kanopi, ruko │        │
│ │               │  │               │        │
│ │  [Pilih]      │  │  [Pilih]      │        │
│ └───────────────┘  └───────────────┘        │
│                                             │
│  ℹ️ Harga template adalah ESTIMASI.        │
│     Sesuaikan dengan harga di area Anda    │
│     setelah dimuat.                         │
│                                             │
│         [📝 Kosong — Input Sendiri]         │
└─────────────────────────────────────────────┘
```

Layout mobile: 1 kolom stacked.

Behavior:
- Klik "Pilih" → confirmation: "Muat 22 item dari template Kitchen Set?"
- Klik "Ya" → bulk insert semua item ke pricelist org user
- Show toast: "22 item berhasil ditambahkan. Sesuaikan harga di pricelist."
- Modal close, user melihat pricelist yang sudah terisi

Template bisa di-load kombinasi (user bisa load 2 template sekaligus untuk bisnis multi-vertical). Untuk MVP, sederhanakan: 1 template saja per klik. Kalau mau tambah, klik "+ Muat Template Lain" di halaman pricelist yang sudah punya item.

## 4.2 First-Time Onboarding Wizard

**Trigger:**
Tampil saat user pertama kali buka `/app/estimator` DAN:
- Belum ada estimasi
- Belum ada pricelist item
- Nama perusahaan di settings kosong

Simpan flag `onboarding_completed` di user metadata atau localStorage per user.

### Wizard Steps

Full-screen modal, 3 langkah, progress bar di atas.

**Step 1: Identitas Perusahaan**
```
┌─────────────────────────────────────────────┐
│ Selamat Datang di Monefyi Estimator! 🎉    │
│                                             │
│ Langkah 1 dari 3: Identitas Perusahaan      │
│ ●────○────○                                 │
│                                             │
│ Isi identitas agar penawaran Anda           │
│ terlihat profesional di mata klien.         │
│                                             │
│ Nama Perusahaan *                           │
│ [                                       ]   │
│                                             │
│ No. WhatsApp *                              │
│ [                                       ]   │
│                                             │
│ Alamat                                      │
│ [                                       ]   │
│                                             │
│ Logo (opsional)                             │
│ [ Drag & drop atau klik untuk upload ]     │
│                                             │
│ ℹ️ Bisa dilengkapi nanti di Pengaturan.     │
│                                             │
│           [Lewati]        [Lanjut →]        │
└─────────────────────────────────────────────┘
```

Nama perusahaan required. Sisanya opsional.

**Step 2: Setup Pricelist**
```
┌─────────────────────────────────────────────┐
│ Langkah 2 dari 3: Setup Pricelist           │
│ ●────●────○                                 │
│                                             │
│ Muat template harga untuk mulai cepat,      │
│ atau mulai dari kosong.                     │
│                                             │
│ [Same template selector as 4.1]             │
│                                             │
│         [← Kembali]       [Lanjut →]        │
└─────────────────────────────────────────────┘
```

Reuse komponen template selector dari 4.1.

**Step 3: Ready to Go**
```
┌─────────────────────────────────────────────┐
│ Langkah 3 dari 3: Siap!                     │
│ ●────●────●                                 │
│                                             │
│         🎉                                  │
│                                             │
│ Anda sudah siap buat penawaran pertama!     │
│                                             │
│ Yang bisa Anda lakukan sekarang:            │
│                                             │
│  ✅ Buat estimasi dari pricelist            │
│  ✅ Export PDF dengan branding Anda         │
│  ✅ Kirim langsung via WhatsApp             │
│  ✅ Track pipeline estimasi                 │
│  🎁 BONUS: 1 proyek gratis di Planner       │
│                                             │
│                                             │
│  [🚀 Buat Estimasi Pertama]                 │
│                                             │
│  [Ke Dashboard Estimator →]                 │
└─────────────────────────────────────────────┘
```

- "Buat Estimasi Pertama" → navigate ke `/app/estimator/new`
- "Ke Dashboard" → navigate ke `/app/estimator` (yang sekarang tidak lagi kosong karena punya pricelist)
- Set flag `onboarding_completed: true`

### Wizard behavior

- Bisa di-skip step 1 (tanpa isi apa-apa)
- Bisa di-skip step 2 (tidak load template, mulai dari kosong)
- Step 3 wajib (tapi ada 2 pilihan CTA)
- Progress bar clickable untuk navigate mundur (tidak maju)
- Tombol close [×] di corner: dismiss wizard, set flag `onboarding_completed: true`, konfirmasi: "Yakin lewati onboarding? Bisa dibuka lagi dari Pengaturan."

### Re-trigger wizard

Di halaman settings, tambah tombol: "🔄 Buka Ulang Onboarding" — reset flag dan tampilkan wizard lagi.

## 4.3 In-App Coach Marks (Optional, Priority Rendah)

Kalau waktu masih ada, buat coach marks untuk first-time visit di:
- Halaman estimasi list: tunjuk tombol "+ Estimasi Baru"
- Halaman builder pertama: tunjuk "Dari Pricelist" dan "Smart Input"
- Halaman builder saat pertama simpan: tunjuk tombol "Preview PDF" dan "WhatsApp"

Gunakan library seperti `driver.js` atau custom implementation dengan portal + overlay.

Skip jika waktu tidak cukup — bukan critical.

## Checkpoint Phase 4

- [ ] 4 template pricelist ready dengan data realistis
- [ ] Empty state pricelist tampil template selector
- [ ] Bulk insert template berfungsi
- [ ] Onboarding wizard 3 step berfungsi
- [ ] Wizard bisa di-skip di setiap step
- [ ] Flag `onboarding_completed` tersimpan
- [ ] Re-trigger onboarding dari settings
- [ ] Responsive semua device

**Suggested commit message:**
```
feat(estimator): phase 4 - onboarding & pricelist templates

- Add 4 starter pricelist templates (kitchen, renovation, interior, construction)
- Implement 3-step first-time onboarding wizard
- Empty state pricelist shows template selector
- Bulk insert template items
- Re-trigger onboarding from settings
```

---

# PHASE 5 — ENTITLEMENT SYSTEM & PAYMENT INTEGRATION

**Goal:** User bisa beli Estimator via checkout.monefyi.com. Fitur ter-gate sesuai tier.
**Estimasi:** 4-5 hari
**Dependency:** Phase 1-3 selesai (idealnya semua, minimal Phase 3)

## 5.1 Database Schema

```sql
-- File: supabase/migrations/{timestamp}_entitlement_system.sql

create table if not exists org_subscriptions (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  
  -- Tier & product
  tier text not null default 'free' 
    check (tier in ('free', 'estimator', 'pro', 'enterprise')),
  
  -- Payment tracking
  payment_provider text, -- 'xendit' | 'manual' | 'grandfather'
  external_payment_id text, -- Xendit invoice ID or transaction ID
  amount_paid bigint, -- in IDR
  currency text default 'IDR',
  
  -- Dates
  purchased_at timestamptz,
  activated_at timestamptz,
  expires_at timestamptz, -- null for lifetime (estimator), set for subscription
  
  -- Credit tracking (untuk upgrade dengan potongan)
  estimator_credit_available boolean default false,
  estimator_credit_used_at timestamptz,
  estimator_credit_amount bigint default 99000,
  
  -- Limits (derived from tier, cached for query performance)
  max_active_projects int not null default 0,
  max_members int not null default 1,
  
  -- Metadata
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  unique(org_id)
);

create index if not exists idx_org_subscriptions_org on org_subscriptions(org_id);
create index if not exists idx_org_subscriptions_tier on org_subscriptions(tier);

-- Auto-set limits based on tier
create or replace function set_subscription_limits()
returns trigger as $$
begin
  case new.tier
    when 'free' then
      new.max_active_projects := 0;
      new.max_members := 1;
    when 'estimator' then
      new.max_active_projects := 1;
      new.max_members := 1;
      -- Set credit available if just purchased
      if old is null or old.tier != 'estimator' then
        new.estimator_credit_available := true;
      end if;
    when 'pro' then
      new.max_active_projects := 10;
      new.max_members := 5;
    when 'enterprise' then
      new.max_active_projects := 999;
      new.max_members := 20;
  end case;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_set_subscription_limits
before insert or update of tier on org_subscriptions
for each row execute function set_subscription_limits();

-- RLS
alter table org_subscriptions enable row level security;

create policy "org members can read their subscription"
on org_subscriptions for select
using (
  org_id in (
    select org_id from user_orgs where user_id = auth.uid()
  )
);

create policy "service role can manage subscriptions"
on org_subscriptions for all
using (auth.jwt() ->> 'role' = 'service_role');

-- Grandfather existing users (users who already have estimations)
insert into org_subscriptions (org_id, tier, payment_provider, purchased_at, activated_at)
select distinct 
  e.org_id, 
  'estimator', 
  'grandfather',
  now(), 
  now()
from estimations e
where not exists (
  select 1 from org_subscriptions os where os.org_id = e.org_id
)
on conflict (org_id) do nothing;
```

## 5.2 Entitlement Hook/Composable

Buat `hooks/useEntitlement.ts`:

```typescript
export type Tier = 'free' | 'estimator' | 'pro' | 'enterprise';

export interface Entitlement {
  tier: Tier;
  isLoading: boolean;
  
  // Access flags
  canAccessEstimator: boolean;
  canCreateProject: boolean;
  canAccessFinance: boolean;
  canInviteMembers: boolean;
  
  // Limits
  maxActiveProjects: number;
  currentActiveProjects: number;
  remainingProjectSlots: number;
  maxMembers: number;
  currentMembers: number;
  
  // Credit
  estimatorCreditAvailable: boolean;
  estimatorCreditAmount: number;
  
  // Convenience flags
  isFree: boolean;
  isEstimator: boolean;
  isPro: boolean;
  isEnterprise: boolean;
  hasPaid: boolean; // tier !== 'free'
  
  // Actions
  refresh: () => Promise<void>;
}

export function useEntitlement(): Entitlement {
  // Fetch from org_subscriptions
  // Count active projects for current org
  // Count members
  // Return combined data
}
```

Fetch strategi: SWR or React Query dengan revalidation setiap 60 detik atau on window focus.

## 5.3 Route Guards

**A. Guard Estimator pages** untuk tier `free`:

Buat wrapper `<EstimatorAccessGuard>`:
- Jika tier === 'free': render `<EstimatorPaywall />` component
- Jika tier !== 'free': render children

Wrap semua estimator pages: `/app/estimator/*`

**B. EstimatorPaywall Component:**

Halaman internal (bukan redirect keluar):
```
┌─────────────────────────────────────────────────┐
│                                                 │
│         [Icon: Sparkle + Calculator]            │
│                                                 │
│      Buat Penawaran Profesional                 │
│      dengan Monefyi Estimator                   │
│                                                 │
│      Dari pricelist ke PDF berlogo              │
│      dalam 5 menit. Kirim via WhatsApp.         │
│                                                 │
│  ✅ Pricelist master (unlimited item)           │
│  ✅ PDF profesional 4 template                  │
│  ✅ Kalkulasi HPP & margin otomatis             │
│  ✅ Kirim langsung ke WhatsApp klien            │
│  ✅ Pipeline estimasi (draft → diterima)        │
│  🎁 BONUS: 1 proyek GRATIS di Planner           │
│                                                 │
│     ┌───────────────────────────┐               │
│     │   Rp 99.000               │               │
│     │   Sekali bayar, seumur    │               │
│     │   hidup akses             │               │
│     └───────────────────────────┘               │
│                                                 │
│         [🚀 Beli Sekarang]                      │
│                                                 │
│    ✓ 7 hari uang kembali                        │
│    ✓ Pembayaran via QRIS, transfer, e-wallet    │
│                                                 │
│    Ada pertanyaan? Chat kami di WhatsApp        │
└─────────────────────────────────────────────────┘
```

Tombol "Beli Sekarang" → redirect ke `checkout.monefyi.com/estimator?org_id={org_id}&return_url={current_url}`

**C. Guard Project Creation:**

Sebelum user create project (di halaman `/app/projects/new` atau via wizard convert):
- Cek `canCreateProject` dari useEntitlement
- Jika false (hit limit), show upgrade modal (jangan langsung create)

**D. Guard Pro-Only Features:**

Untuk halaman Keuangan Bisnis (`/app/finance/*`), Dashboard (jika Pro-only), Tim (jika ada limit):
- Jika tier === 'estimator': tampil locked preview mode
- Locked preview: blurred content + overlay card:
  ```
  ┌─────────────────────────────────────────┐
  │ 🔒 Fitur ini tersedia di Planner Pro   │
  │                                         │
  │ Keuangan Bisnis membantu Anda:          │
  │ • Track kas, piutang, hutang            │
  │ • Neraca bisnis otomatis                │
  │ • Bridge biaya proyek                   │
  │                                         │
  │ Rp 199.000/bulan                        │
  │ Rp 99.000 Estimator jadi credit         │
  │ → Bulan pertama Rp 100.000              │
  │                                         │
  │ [🚀 Upgrade ke Pro]                     │
  └─────────────────────────────────────────┘
  ```

**E. Sidebar Visual:**

Untuk user `estimator`:
- Menu Estimator: normal (aktif hijau)
- Menu Proyek: normal (mereka punya 1 proyek slot)
- Menu Keuangan: 🔒 icon suffix (subtle gray)
- Menu Tim: 🔒 icon suffix jika ada limit
- Menu Dashboard: normal (assume basic dashboard accessible)

Untuk user `free`:
- Semua menu selain Estimator paywall: 🔒
- Klik menu → tampil locked preview

## 5.4 Upsell Modal (Reusable Component)

Buat `<UpgradeModal>` yang bisa di-trigger dari berbagai tempat:

**Props:**
- `trigger: 'project_limit' | 'pro_feature' | 'estimation_accepted' | 'manual'`
- `featureName?: string` (untuk trigger `pro_feature`)
- `onClose: () => void`

**Content variasi berdasarkan trigger:**

**Trigger: `project_limit`**
```
┌─────────────────────────────────────────────────┐
│ 🎯 Anda sudah punya 1 proyek aktif              │
│                                                 │
│ Paket Estimator termasuk 1 proyek gratis        │
│ untuk merasakan Monefyi Planner.                │
│                                                 │
│ Untuk mengelola lebih banyak proyek:             │
│                                                 │
│ ─── OPSI 1: Kelola Proyek Lama ───              │
│ Selesaikan atau hapus proyek yang tidak aktif   │
│ [📊 Kelola Proyek Saya]                         │
│                                                 │
│ ─── OPSI 2: Upgrade ke Planner Pro ───          │
│                                                 │
│ ✅ 10 proyek aktif                              │
│ ✅ Keuangan bisnis penuh                        │
│ ✅ Tim sampai 5 member                          │
│ ✅ AI rekomendasi lanjutan                      │
│                                                 │
│ Rp 199.000/bulan                                │
│                                                 │
│ 💰 Rp 99.000 Estimator Anda jadi credit         │
│    → Bulan pertama hanya Rp 100.000             │
│                                                 │
│ [🚀 Upgrade ke Pro]        [Nanti saja]         │
└─────────────────────────────────────────────────┘
```

**Trigger: `pro_feature`**
Copy disesuaikan dengan fitur (Finance, Team, etc.)

**Trigger: `estimation_accepted`**
Muncul saat status berubah ke `accepted` dan user masih tier `estimator`:
```
┌─────────────────────────────────────────────────┐
│ 🎉 Penawaran diterima klien!                    │
│                                                 │
│ Langkah selanjutnya:                            │
│                                                 │
│ ┌─ Jadikan Proyek ─────────────────────────┐   │
│ │ RAP otomatis dari estimasi ini.          │   │
│ │ Track biaya aktual vs penawaran.         │   │
│ │ (1 proyek gratis termasuk di Estimator)  │   │
│ │                                          │   │
│ │ [🚀 Jadikan Proyek Sekarang]             │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ Atau ingin unlimited fitur?                     │
│ [Lihat Planner Pro →]                           │
│                                                 │
│                              [Tutup]            │
└─────────────────────────────────────────────────┘
```

Tombol "Upgrade" di semua variasi → redirect ke `checkout.monefyi.com/pro?org_id={org_id}&credit={estimator_credit_amount}&return_url={current_url}`

## 5.5 Integrasi dengan checkout.monefyi.com

**Flow pembayaran Estimator:**

```
1. User di app klik "Beli Sekarang"
   ↓
2. Redirect ke: checkout.monefyi.com/estimator
   ?org_id=uuid
   &user_id=uuid
   &return_url=https://planner.monefyi.com/app/estimator
   &product=estimator
   &amount=99000
   ↓
3. User bayar di checkout.monefyi.com via Xendit
   ↓
4. Xendit webhook → checkout.monefyi.com
   ↓
5. checkout.monefyi.com panggil Supabase RPC:
   upsert_subscription(org_id, tier='estimator', payment_id, amount)
   ↓
6. checkout.monefyi.com redirect user balik ke:
   return_url + ?payment=success&order_id=xxx
   ↓
7. App detect ?payment=success di URL
   → refresh entitlement
   → show success modal
   → clear query param
```

**Yang perlu dibuat di app Planner:**

**A. Redirect utility:**
```typescript
// lib/checkout.ts
export function redirectToCheckout(product: 'estimator' | 'pro' | 'enterprise', options?: {
  creditAmount?: number;
  returnUrl?: string;
}) {
  const currentOrg = getCurrentOrgId();
  const userId = getCurrentUserId();
  const returnUrl = options?.returnUrl || window.location.href;
  
  const params = new URLSearchParams({
    org_id: currentOrg,
    user_id: userId,
    product,
    return_url: returnUrl,
  });
  
  if (options?.creditAmount) {
    params.set('credit', String(options.creditAmount));
  }
  
  window.location.href = `https://checkout.monefyi.com/${product}?${params}`;
}
```

**B. Success/failure handler:**

Buat hook `usePaymentReturn()` yang jalan di root layout:
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  
  if (payment === 'success') {
    entitlement.refresh(); // trigger reload entitlement
    showSuccessModal();    // "🎉 Estimator aktif!"
    cleanUrl();            // remove ?payment=success from URL
  } else if (payment === 'failed' || payment === 'cancelled') {
    showFailureModal();
    cleanUrl();
  }
}, []);
```

**C. Success Modal:**
```
┌─────────────────────────────────────────────────┐
│              🎉                                 │
│                                                 │
│         Estimator Aktif!                        │
│                                                 │
│    Anda sekarang bisa membuat penawaran         │
│    profesional dan 1 proyek gratis di Planner.  │
│                                                 │
│    Yuk mulai dari mana?                         │
│                                                 │
│    [🎯 Setup Pricelist]                         │
│    [📝 Buat Estimasi Pertama]                   │
│    [👋 Tur Cepat Estimator]                     │
└─────────────────────────────────────────────────┘
```

**D. Setup RPC di Supabase untuk checkout.monefyi.com panggil:**

```sql
create or replace function activate_subscription(
  p_org_id uuid,
  p_tier text,
  p_payment_provider text,
  p_external_payment_id text,
  p_amount bigint,
  p_expires_at timestamptz default null
) returns org_subscriptions as $$
declare
  v_subscription org_subscriptions;
  v_credit_used boolean := false;
  v_final_amount bigint := p_amount;
begin
  -- Check for estimator credit
  if p_tier in ('pro', 'enterprise') then
    select estimator_credit_available into v_credit_used
    from org_subscriptions where org_id = p_org_id;
    
    if v_credit_used then
      v_final_amount := p_amount; -- credit already applied on checkout side
    end if;
  end if;
  
  -- Upsert
  insert into org_subscriptions (
    org_id, tier, payment_provider, external_payment_id,
    amount_paid, purchased_at, activated_at, expires_at,
    estimator_credit_used_at
  ) values (
    p_org_id, p_tier, p_payment_provider, p_external_payment_id,
    v_final_amount, now(), now(), p_expires_at,
    case when v_credit_used then now() else null end
  )
  on conflict (org_id) do update set
    tier = excluded.tier,
    payment_provider = excluded.payment_provider,
    external_payment_id = excluded.external_payment_id,
    amount_paid = excluded.amount_paid,
    purchased_at = excluded.purchased_at,
    activated_at = excluded.activated_at,
    expires_at = excluded.expires_at,
    estimator_credit_available = case 
      when excluded.tier = 'estimator' then true 
      when excluded.tier in ('pro', 'enterprise') then false
      else org_subscriptions.estimator_credit_available
    end,
    estimator_credit_used_at = case 
      when excluded.tier in ('pro', 'enterprise') 
        and org_subscriptions.estimator_credit_available 
      then now()
      else org_subscriptions.estimator_credit_used_at
    end
  returning * into v_subscription;
  
  return v_subscription;
end;
$$ language plpgsql security definer;

-- Grant execute to service role only (called from checkout.monefyi.com backend)
revoke all on function activate_subscription from public;
grant execute on function activate_subscription to service_role;
```

## 5.6 Notification Component

Setelah pembelian sukses, kirim notifikasi in-app di halaman utama Estimator:
> ✅ Selamat! Estimator aktif. Jangan lupa setup identitas perusahaan di Pengaturan untuk penawaran yang lebih profesional. [Setup Sekarang →]

Setelah 24 jam tanpa create estimasi, tampilkan reminder banner:
> 🎯 Estimator sudah siap dipakai. Yuk buat estimasi pertama! [Mulai Sekarang]

## Checkpoint Phase 5

- [ ] Migration `org_subscriptions` berjalan
- [ ] Grandfather existing user dengan estimasi = tier 'estimator'
- [ ] `useEntitlement` hook berfungsi
- [ ] Route guards di semua halaman yang perlu
- [ ] Paywall Estimator internal (bukan redirect keluar)
- [ ] Redirect ke checkout.monefyi.com dengan parameter yang benar
- [ ] Detect ?payment=success return
- [ ] Success/failure modal
- [ ] Upgrade modal component reusable
- [ ] Sidebar visual (lock icons) untuk pro features
- [ ] Project creation guard (hit limit → upsell)
- [ ] RPC `activate_subscription` untuk dipanggil checkout.monefyi.com

**Suggested commit message:**
```
feat(entitlement): phase 5 - subscription tier & payment integration

- Add org_subscriptions table with tier-based limits
- Auto-set limits via trigger based on tier
- Grandfather existing users with estimator tier
- useEntitlement hook for feature gating
- Internal paywall for Estimator (free tier)
- Locked preview mode for Pro-only features
- Sidebar lock icons for gated menus
- Upgrade modal component (project_limit, pro_feature, estimation_accepted)
- Redirect flow to checkout.monefyi.com
- Payment return handler (?payment=success)
- Activate subscription RPC for external checkout
```

---

# PHASE 6 — ANALYTICS & UPSELL TRIGGERS

**Goal:** Track funnel dari beli Estimator sampai upgrade Pro. Trigger upsell di momen yang tepat.
**Estimasi:** 2-3 hari
**Dependency:** Phase 5 selesai

## 6.1 Analytics Setup

**Tool:** PostHog (recommended karena free tier generous + self-hosted option) atau Mixpanel.

**A. Setup client:**
```typescript
// lib/analytics/client.ts
import posthog from 'posthog-js';

export function initAnalytics(userId: string, orgId: string) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: 'https://app.posthog.com',
    person_profiles: 'identified_only',
  });
  
  posthog.identify(userId, {
    org_id: orgId,
  });
  
  posthog.group('organization', orgId);
}

export function track(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}
```

**B. Events yang harus di-track:**

| Event | Trigger | Properties |
|-------|---------|-----------|
| `estimator_purchased` | Setelah payment success | `amount, payment_provider` |
| `onboarding_started` | Wizard step 1 open | - |
| `onboarding_completed` | Wizard step 3 completion | `template_chosen, has_logo` |
| `onboarding_skipped` | User close wizard | `step_at_skip` |
| `pricelist_template_loaded` | Template dimuat | `template_id, item_count` |
| `pricelist_item_added` | Item ditambah manual | `category, source (manual/csv/template)` |
| `pricelist_item_bulk_updated` | Bulk update margin/kategori | `count, action` |
| `estimation_created` | Estimasi baru disimpan | `item_count, total_amount, from_smart_button` |
| `estimation_item_added` | Item ditambah ke estimasi | `source (manual/pricelist/smart)` |
| `estimation_pdf_previewed` | Preview PDF | `estimation_id` |
| `estimation_pdf_downloaded` | Download PDF | `estimation_id, template` |
| `estimation_wa_shared` | Klik WhatsApp share | `estimation_id, share_type (text/pdf)` |
| `estimation_status_changed` | Status transition | `from, to, estimation_id` |
| `estimation_accepted` | Status → accepted | `estimation_id, total, profit, days_from_created` |
| `estimation_rejected` | Status → rejected | `estimation_id, days_from_sent` |
| `convert_wizard_opened` | Klik "Jadikan Proyek" | `estimation_id` |
| `convert_wizard_completed` | Proyek dibuat dari estimasi | `estimation_id, project_id, items_selected` |
| `project_limit_hit` | User coba create proyek tapi limit | `current_count, tier` |
| `upgrade_modal_shown` | Modal upgrade muncul | `trigger_type` |
| `upgrade_modal_dismissed` | User tutup upgrade modal | `trigger_type` |
| `upgrade_cta_clicked` | Klik upgrade CTA | `trigger_type, target_tier` |
| `pro_feature_clicked` | Klik menu pro yang locked | `feature_name` |

Instrumentasi di setiap event handler yang relevan. Buat helper wrapper agar konsisten:

```typescript
// lib/analytics/events.ts
export const analytics = {
  estimationCreated: (props: { itemCount: number; totalAmount: number; fromSmartButton?: boolean }) => 
    track('estimation_created', props),
  
  estimationAccepted: (props: { estimationId: string; total: number; profit: number; daysFromCreated: number }) =>
    track('estimation_accepted', props),
  
  upgradeModalShown: (trigger: string) =>
    track('upgrade_modal_shown', { trigger_type: trigger }),
  
  // ... etc
};
```

## 6.2 Upsell Trigger Implementations

Upsell modal (dari Phase 5) sekarang di-trigger di titik-titik strategis.

**A. Trigger: Estimation Accepted**

Di handler status change ke `accepted`, tambahkan (untuk user tier `estimator` yang belum punya proyek aktif atau yang masih punya slot):

```typescript
if (newStatus === 'accepted' && entitlement.isEstimator) {
  await updateStatus('accepted');
  
  // Delay 1 detik untuk celebrate first
  setTimeout(() => {
    if (entitlement.remainingProjectSlots > 0) {
      // Bisa jadikan proyek
      showUpgradeModal({ trigger: 'estimation_accepted' });
    } else {
      // Sudah hit limit
      showUpgradeModal({ trigger: 'project_limit' });
    }
    analytics.upgradeModalShown('estimation_accepted');
  }, 1000);
}
```

**B. Trigger: Project Limit Hit**

Di convert wizard atau create project button:

```typescript
if (!entitlement.canCreateProject) {
  showUpgradeModal({ trigger: 'project_limit' });
  analytics.upgradeModalShown('project_limit');
  analytics.track('project_limit_hit', {
    current_count: entitlement.currentActiveProjects,
    tier: entitlement.tier,
  });
  return; // Block creation
}
```

**C. Trigger: Pro Feature Clicked**

Di locked preview page:

```typescript
useEffect(() => {
  analytics.proFeatureClicked({ feature_name: featureName });
}, []);
```

Tombol upgrade di locked preview:
```typescript
<button onClick={() => {
  analytics.upgradeCtaClicked({ 
    trigger_type: 'pro_feature',
    target_tier: 'pro',
  });
  redirectToCheckout('pro', {
    creditAmount: entitlement.estimatorCreditAmount,
  });
}}>
  Upgrade ke Pro
</button>
```

**D. Trigger: Estimasi Ke-5 Milestone**

Setelah user save estimasi ke-5 (dalam 30 hari terakhir):

```typescript
// Di handler save estimasi baru
const count = await countEstimationsInLast30Days(orgId);
if (count === 5 && entitlement.isEstimator) {
  // Cek apakah sudah pernah shown
  const alreadyShown = localStorage.getItem('milestone_5_shown');
  if (!alreadyShown) {
    setTimeout(() => {
      showMilestoneUpsellModal({
        title: '📊 Anda aktif! 5 penawaran bulan ini',
        message: `Total nilai: Rp ${totalNilai}. Berapa yang benar-benar profit?`,
        cta: 'Track profit aktual dengan Planner Pro',
      });
      localStorage.setItem('milestone_5_shown', 'true');
      analytics.upgradeModalShown('milestone_5_estimations');
    }, 1500);
  }
}
```

Bisa expand ke milestone 10, 20 estimasi juga.

## 6.3 Weekly Insight Email (Opsional)

Setup email digest mingguan (setiap Senin) untuk user tier `estimator`.

**Isi email:**
```
Subject: 📊 Ringkasan Estimator Anda Minggu Ini

Hai [Nama],

Minggu ini di Estimator Anda:
• [X] penawaran baru dibuat
• [Y] penawaran terkirim ke klien
• [Z] penawaran diterima 🎉
• Total nilai penawaran: Rp [total]
• Estimasi profit: Rp [profit]

[Detail →]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Pertanyaan yang tidak bisa dijawab Estimator:
"Berapa profit AKTUAL setelah proyek dikerjakan?"

Track biaya aktual vs penawaran dengan Planner Pro.
[Lihat Demo →]
```

Implementasi via Supabase Edge Function + cron (scheduled). Atau via external tool (Resend + Vercel cron).

**Skip jika waktu tidak cukup di phase ini.** Bisa masuk phase iterasi berikutnya.

## 6.4 Analytics Dashboard (Internal untuk Anda)

Buat halaman internal (di app.monefyi.com admin atau sheets manual) untuk pantau:
- Estimator sold per hari/minggu
- Conversion Estimator → Pro
- Rata-rata waktu dari beli Estimator → estimasi pertama
- Rata-rata waktu dari estimasi pertama → convert to project
- Trigger yang paling banyak convert (accepted vs limit vs milestone)

Untuk MVP, cukup pantau dari dashboard PostHog. Buat custom dashboard di PostHog dengan 6 chart utama:
1. Estimator purchased over time
2. Onboarding completion rate
3. First estimation created within 48 hours (%)
4. Estimation → accepted conversion rate
5. Accepted → convert to project rate
6. Upgrade modal shown vs clicked (per trigger)

## Checkpoint Phase 6

- [ ] PostHog terintegrasi
- [ ] Semua events ter-track
- [ ] Upsell trigger `estimation_accepted` berfungsi
- [ ] Upsell trigger `project_limit_hit` berfungsi
- [ ] Upsell trigger `pro_feature_clicked` berfungsi
- [ ] Milestone modal (5 estimasi) muncul
- [ ] Analytics dashboard PostHog setup
- [ ] User identify dengan org_id di semua session

**Suggested commit message:**
```
feat(analytics): phase 6 - event tracking & upsell triggers

- Integrate PostHog for event tracking
- Track full user funnel (purchase → estimation → convert → upgrade)
- Implement upsell trigger points:
  - Estimation accepted (celebrate + Jadikan Proyek CTA)
  - Project limit hit (block + upgrade)
  - Pro feature clicked (locked preview)
  - 5 estimations milestone (data-driven insight)
- Analytics dashboard configuration
- User identification with org context
```

---

# APENDIKS: PANDUAN UNTUK USER (ANDA)

## Cara Menjalankan Prompt Ini di Cursor

**Cara 1 — Phase per phase (recommended):**
Buka Cursor Composer, paste satu phase sekaligus:
> "Kerjakan Phase 1 dari file ESTIMATOR_UPGRADE_MASTER_PROMPT.md. Baca konteks dan instruksi umum di bagian atas file dulu. Setelah selesai, laporkan hasil dan tunggu instruksi untuk phase berikutnya."

**Cara 2 — Section per section dalam 1 phase:**
Untuk phase besar (Phase 1, 3, 5), bisa pecah lagi:
> "Dari Phase 1, kerjakan section 1.1 (Redesign List Estimasi) dulu. Jangan sentuh section lain."

**Cara 3 — Referenced file:**
Attach file `ESTIMATOR_UPGRADE_MASTER_PROMPT.md` ke context, lalu:
> "Kerjakan Phase 3 dari file yang di-attach."

## Urutan Recommended untuk Launch

**Minggu 1-2:** Phase 1 (UI Polish) → estimator terasa profesional
**Minggu 2-3:** Phase 2 (Status) + Phase 3 (Convert) → core workflow
**Minggu 3-4:** Phase 4 (Onboarding) → first-time UX
**Minggu 4-5:** Phase 5 (Entitlement + Payment) → siap terima uang
**Minggu 5-6:** Phase 6 (Analytics + Upsell) → siap scale
**Minggu 6:** QA, beta test, fix bugs
**Minggu 7:** 🚀 Launch

## Testing Checklist Sebelum Launch

- [ ] Test di iPhone Safari (iOS 15+)
- [ ] Test di Android Chrome
- [ ] Test di desktop Chrome, Firefox, Safari
- [ ] Test payment flow end-to-end (dari checkout.monefyi.com)
- [ ] Test convert estimasi → proyek dengan berbagai data
- [ ] Test entitlement guards di semua halaman
- [ ] Test onboarding flow dari user baru (private window)
- [ ] Test PDF preview & download di mobile
- [ ] Test WhatsApp share di HP
- [ ] Test upload logo (compress berjalan?)
- [ ] Load test pricelist dengan 100+ item
- [ ] Test auto-save (buka 2 tab, edit yang sama)

---

*Dokumen ini adalah master prompt untuk Cursor. Simpan sebagai `ESTIMATOR_UPGRADE_MASTER_PROMPT.md` di root repo atau di `/docs/`.*

*Versi 1.0 · Agustus 2026 · Monefyi Product*