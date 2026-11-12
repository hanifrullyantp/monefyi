# Catatan Perbaikan: Otonomi & Ketepatan Analisa Ads

Dokumen ini merangkum perubahan dan langkah yang perlu Anda lakukan setelah menempel file ke repo.

## 1. Masalah yang diperbaiki

| Gejala | Penyebab di kode | Perbaikan |
|---|---|---|
| Iklan beberapa bulan lalu ikut dianalisa | Default `datePreset` = `data_maximum` (seluruh riwayat akun). Loop preset berhenti di preset pertama yang sukses, jadi lifetime selalu terpakai. | Jendela eksplisit `last_14d` (`analysisWindowDays`). Tidak ada fallback ke lifetime. Kampanye ARCHIVED/DELETED dibuang. |
| Angka muncul padahal data kosong (OCLP 80%, LP ke checkout 4,2%, checkout 38%) | Nilai fallback ditulis langsung di engine. | Fallback dihapus. Jika data LP belum ada, pilar diberi status `perlu_data` dan tidak membuat rencana LP. |
| Kampanye baru dihentikan saat learning phase | Aturan boncos tidak memperhatikan umur kampanye. | Kampanye umur < 7 hari dan konversi < 50 dianggap learning. Ditahan, kecuali spend sudah melewati `learningHardStopSpend` (Rp 135.000). Setiap penahanan dicatat di `dataAudit`. |
| Status "executed" muncul tanpa perubahan di Meta | Tick hanya menandai status di memori. | Tick memanggil `/api/engine/apply`. Status `executed` hanya jika `liveExecuted: true`. |
| Scale bisa menimpa budget ad set dan tetap dilaporkan sukses | Budget dibagi rata tanpa cek hasil. Budget tak terbaca default ke Rp 100.000. | Budget riil dibaca dari Meta. ABO dinaikkan proporsional. Setiap perubahan dicek. Scale dibatalkan jika budget tidak terbaca. |
| Scale terlalu sering | Tidak ada jeda antar perubahan. | Jeda `scaleCooldownHours` (48 jam) dibaca dari riwayat eksekusi terakhir. |
| Harga berbeda antar bagian | Engine Rp 199.000 / anchor Rp 499.000, apply fallback Rp 249.000 / Rp 600.000. | Apply memakai fallback yang sama dengan engine. Konstanta `MONEFYI_PRICING` ada di engine. |
| Aksi LP, checkout, CAPI mengaku berhasil | Mengembalikan `ok: true` tanpa mengubah apa pun. | Ditandai `liveExecuted: false` dan `manualActionRequired: true`. Store menampilkannya sebagai "Perlu dikerjakan manual". |
| Mode tanpa token tampil berhasil | Simulasi lokal mengembalikan `ok: true`. | Sekarang `ok: false` dengan pesan jelas. |
| Ambang boncos berbeda antara route dan engine | Route memakai Rp 85.000 / Rp 100.000, engine memakai 1,8x target CPA. | Route memakai konstanta dari `DEFAULT_WINNING_ENGINE_CONFIG`. |

## 2. Mode otonom

`autonomous: true` (default) membuat AI mengeksekusi sendiri dua jenis aksi:
- pause kampanye boncos (di luar learning phase), dan
- scale budget maksimal 20% per langkah, dengan jeda 48 jam.

Aksi lain tetap butuh persetujuan: membuat kampanye baru, mengubah harga, dan mengubah copy landing page.

Setiap keputusan membawa `evidenceWindow` dan `dataAudit`, sehingga Anda bisa melihat apa yang dianalisa, apa yang dikecualikan, dan mengapa.

## 3. Langkah setelah menempel ke repo

1. **Konfirmasi harga final.** Engine memakai Pro Rp 199.000 dengan harga coret Rp 499.000, dan menyebut Rp 250.000 sebagai harga reguler Pro. Pastikan `MONEFYI_PRICING` di `engine/winningEngine.ts` sudah sesuai.
2. **Kolom baru di Supabase tidak diperlukan**, tetapi tick membaca `last_plans` dari `winning_engine_config` untuk cooldown. Pastikan kolom itu ada (sudah dipakai tick sebelumnya).
3. **Simpan konfigurasi baru.** Field `analysisWindowDays`, `autonomous`, `learning*`, `minPurchasesToScale`, `scaleCooldownHours` hanya memakai default kode. Jika ingin bisa diubah dari dashboard, tambahkan ke `api-routes/engine/config/route.ts`.
4. **Verifikasi satuan budget IDR** di Meta. Kode menulis `daily_budget` sebagai angka rupiah mentah, sama seperti pembacaan sebelumnya. Cek satu kampanye di Ads Manager sebelum mengaktifkan `autonomous`.
5. **Mulai dengan `killSwitch` mati dan pantau satu siklus** lewat `dataAudit` di respons tick sebelum mempercayakan penuh.

## 4. Yang belum diubah (perlu pekerjaan lanjutan)

- Teks rencana Pilar 1 (offer) dan Pilar 3 (checkout) masih template tetap. Sebaiknya hanya dibuat jika ada bukti data.
- Skor Pilar 1 dan Pilar 5 masih heuristik.
- Nama model `openai/gpt-6-luna-pro` dan `anthropic/claude-3.5-sonnet` di konfigurasi perlu diverifikasi ulang terhadap ID yang tersedia di OpenRouter.
- Impor `../types/marketing` di folder `engine/` dan `services/` tidak cocok dengan struktur zip (`core-types/marketing.ts`). Sesuaikan dengan alias di repo asli.

## 5. Keamanan dan audit (P0)

Yang berubah:
- Semua route Ads sekarang memerlukan login admin (`lib/auth/adminGuard.ts`). Admin diverifikasi lewat Supabase Auth dan harus ada di `ADMIN_EMAILS`.
- Tick, apply, campaigns, dan insights juga menerima `x-engine-secret` untuk pemanggilan cron dan internal.
- Guardrail untuk aksi manual dan apply dibaca dari database, bukan dari body request (`lib/engine/engineDb.ts`).
- Aksi manual dibatasi plafon, minimum budget, dan kill switch. Pause tetap diizinkan.
- Minimum budget manual sekarang mengikuti guardrail (default Rp 100.000), sebelumnya Rp 20.000.
- Setiap aksi live dicatat di `engine_action_log` (append-only), dengan nilai sebelum dan sesudah.
- Satu aksi live per rencana per hari (idempotency key berbasis WIB).
- Lock `engine_run_lock` mencegah dua analisa berjalan bersamaan.

Langkah setup yang wajib:
1. Jalankan `db/migrations/001_engine_action_log_and_lock.sql` di Supabase SQL Editor.
2. Set env server: `ADMIN_EMAILS` (email admin, dipisah koma), `ENGINE_CRON_SECRET` (string acak panjang), `SUPABASE_SERVICE_ROLE_KEY`.
3. Di layout admin, panggil sekali `setAccessTokenProvider(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null)` dari `lib/auth/authedFetch.ts`. Tanpa ini, UI admin tidak bisa memanggil API dan itu disengaja (fail closed).
4. Job pg_cron yang memanggil tick harus mengirim header `x-engine-secret: <ENGINE_CRON_SECRET>`.
5. Uji dengan sesi non-admin: semua route harus mengembalikan 401 atau 403.

Catatan: path file baru mengikuti alias `@/lib/...` yang dipakai route. Di zip, `engine/` dan `core-types/` ada di root. Sesuaikan jika struktur repo asli berbeda.

## 6. Ketepatan keputusan, evaluasi, dan pembatalan (P1)

Yang berubah:
- **Sampel minimum.** Kampanye baru boleh dinilai boncos jika sudah punya minimal 100 klik link (`minLinkClicksToJudge`). Satu pembelian mahal tidak cukup sebagai bukti; butuh minimal 2 pembelian atau belanja di atas 3x target CPA. Yang ditahan karena sampel kurang tercatat di `dataAudit` beserta alasannya.
- **Learning phase dari Meta.** Route campaigns kini meminta `learning_stage_info` dari ad set. Jika ada ad set berstatus LEARNING, kampanye dianggap belajar. SUCCESS atau FAIL berarti tidak. Jika Meta tidak mengirim atau menolak field itu, permintaan diulang tanpa field tersebut dan engine memakai perkiraan lama (umur dan jumlah konversi). Setiap kampanye membawa `learningSource` ("meta" atau "heuristic").
- **Perubahan manual dihormati.** Jika Meta melaporkan perubahan signifikan pada ad set kurang dari 48 jam lalu (termasuk yang Anda ubah sendiri), scale ditahan.
- **Rekonsiliasi penjualan.** Jika tabel pesanan dikonfigurasi, engine membandingkan pembelian versi Meta dengan pesanan yang lunas. Hanya satu arah yang dianggap bahaya: Meta mencatat lebih banyak pembelian daripada yang dibayar (toleransi 25%). Dalam kondisi itu scale ditunda. Pesanan lunas yang lebih banyak dari Meta dianggap wajar (penjualan organik). Hasilnya ada di `reconciliation` pada respons tick.
- **Evaluasi 48 jam dan rollback otomatis.** `POST /api/engine/review` menilai setiap aksi scale yang sudah lebih dari 48 jam: membaik, stabil, memburuk, atau data belum cukup. Jika memburuk dengan bukti cukup dan budget belum diubah pihak lain, budget dikembalikan ke angka sebelum scale. Hasilnya dicatat di `engine_action_review` dan dikirim ke Telegram jika dikonfigurasi. Menurunkan budget berjalan juga saat kill switch aktif karena mengurangi risiko.
- **Undo satu klik (API).** `POST /api/engine/undo` dengan body `{ "logId": 123 }`. Scale dikembalikan ke budget sebelumnya. Pause diaktifkan kembali (ditolak saat kill switch aktif). Setelah Anda mengaktifkan ulang kampanye yang di-pause AI, AI tidak mem-pause kampanye itu lagi selama 72 jam.

Langkah setup:
1. Jalankan `db/migrations/002_engine_action_review.sql` di Supabase SQL Editor.
2. Buat job pg_cron kedua, misalnya tiap 6 jam, untuk `POST /api/engine/review` dengan header `x-engine-secret`.
3. Untuk rekonsiliasi, isi env sesuai tabel pesanan Anda: `ORDERS_TABLE` (wajib), `ORDERS_STATUS_COLUMN`, `ORDERS_PAID_VALUES`, `ORDERS_CREATED_COLUMN`. Selama `ORDERS_TABLE` kosong, rekonsiliasi dilewati dan statusnya `tidak_dikonfigurasi`.
4. Token Meta untuk job review dan undo dibaca dari env `META_ACCESS_TOKEN`, jika kosong dari kolom `meta_access_token` di `winning_engine_config`.

Perlu diverifikasi di akun nyata:
- Nama field `learning_stage_info` dan nilai statusnya (LEARNING, SUCCESS, FAIL) ditulis dari pengetahuan saya tentang Graph API dan belum saya cek ke dokumentasi atau akun Anda. Fallback menjamin ad set tetap terbaca jika field ditolak.
- Evaluasi memakai `time_range` per tanggal. Zona waktu akun iklan bisa berbeda dari WIB, jadi batas hari bisa bergeser satu hari.
- Angka CPA 48 jam bisa terlambat terisi karena atribusi Meta. Penilai sengaja konservatif: rollback hanya jika sampel cukup dan hasilnya jelas memburuk.

Belum ada: tombol undo dan tampilan hasil evaluasi di UI (P3). Sementara ini keduanya bisa dilihat di tabel `engine_action_log` dan `engine_action_review`.

## 7. Perbaikan lanjutan (UI dan klaim)

- **Klaim dampak hardcoded dihapus.** Teks seperti "akurasi 99%" dan "CPA turun 10–18%" diganti menjadi hipotesis yang diukur setelah 7 hari.
- **Ringkasan satu baris** (`lib/engine/engineStatus.ts`), misalnya "Aman, 3 kampanye belajar, 1 di-scale 24 jam terakhir". Fungsinya murni dan sudah diuji.
- **Timeline** di `ui-components/EngineStatusPanel.tsx`: dianalisa, ditahan dan alasannya, dieksekusi ke Meta, dan hasil evaluasi 48 jam.
- **Tombol Batalkan** di setiap aksi scale atau pause yang belum dibatalkan, dengan konfirmasi. Memakai `/api/engine/undo` yang sudah ada.
- **Endpoint baca** `GET /api/engine/activity` (hanya baca, memerlukan login admin).
- Store menyimpan `winningDataAudit` dari respons tick dan batch.
- **Tabel 26 metrik desktop disembunyikan secara default** (`MetaAdsCommanderTable.tsx`). Ringkasan kartu tetap tampil. Tampilan mobile (kartu) tidak berubah.

- **Engine membaca landing page** (`lib/engine/pageAudit.ts`). Tick mengambil `LANDING_PAGE_URL` (default estimator.monefyi.com), membaca harga jual dan harga coret, lalu membandingkannya dengan `MONEFYI_PRICING`. Jika tidak cocok, dibuat rencana `update_offer_pricing` yang butuh persetujuan. Endpoint pengecekan: `GET /api/engine/page-audit`.
- **Gate satuan budget.** Field `budgetUnitVerified` (default false) menahan otonomi sampai satuan IDR dicocokkan. Cek dengan `GET /api/engine/budget-check?campaignId=...`. Migrasi `003_budget_unit_verified.sql` wajib dijalankan.
- **Harga rekomendasi di pilar offer** dibaca dari `MONEFYI_PRICING`, tidak lagi teks tetap.

Belum dikerjakan: pengujian tampilan di layar HP, vision critique kreatif (lihat catatan di project), dan rekonsiliasi pesanan (`ORDERS_TABLE`). Build TypeScript belum dijalankan karena dependensi repo tidak ada di zip.

## 8. Upgrade inti engine: keputusan berbasis probabilitas

Modul baru `engine/decisionCore.ts` (logika murni, tanpa I/O) menggantikan aturan pengali tetap di `winningEngine.ts`.

### Cara kerja
- Setiap kampanye dinilai dari **probabilitas** CPA sebenarnya, bukan dari satu angka CPA. Model: pembelian ~ Binomial(klik link, p) dengan prior Beta yang lemah dari performa seluruh akun. Sampel kecil otomatis menghasilkan probabilitas yang tidak tegas, sehingga mesin menahan diri tanpa aturan "minimal klik" yang berdiri sendiri.
- Lima vonis: `winner`, `profitable`, `losing`, `learning`, `insufficient`. Setiap vonis membawa alasan, peluang, dan rentang CPA 80%, dan masuk ke `dataAudit`.
- **Pause** hanya jika peluang CPA di atas **garis rugi** minimal 90% (`lossProbabilityToPause`). **Scale** hanya jika peluang CPA di bawah target minimal 80% (`winProbabilityToScale`) dan ada minimal `minPurchasesToScale` pembelian.
- **Garis rugi** = min(break-even CPA, 2,5 x target CPA). Break-even dihitung dari nilai pesanan rata-rata (atau harga paket terendah jika pembelian < 5) dikali margin kontribusi. Kampanye di atas target tetapi di bawah garis rugi diberi vonis `profitable`: diperbaiki, tidak dimatikan.
- **Langkah scale dinamis** (10% sampai `maxScalePctPerStep`) sebanding dengan keyakinan dan ruang efisiensi. Sebelumnya selalu penuh 20%.
- Ringkasan portofolio: berapa budget harian yang saat ini mengalir ke kampanye yang terbukti merugi.

### Kasus yang berubah dibanding aturan lama
| Kasus | Aturan lama | Sekarang |
|---|---|---|
| 3 pembelian tepat di target CPA | Winner, di-scale 20% | Belum tegas (peluang menang 35%), tidak di-scale |
| CPA Rp 75.000 (target Rp 45.000), 6 pembelian | Dipause (di atas 1,4x target) | `profitable`, diperbaiki, tidak dipause |
| 0 pembelian, hanya 40 klik | Dipause (belanja >= 1,8x target) | `insufficient`, ditahan |
| 0 pembelian, 300 klik | Dipause | Dipause (peluang rugi 98%) |

### Celah keamanan yang ditutup
- **Mode otonom dulu menyetujui dirinya sendiri.** Tick memaksa `status: "approved"` dan `userApproved: true`, sehingga pemeriksaan learning phase dan cooldown di guardrail server terlewati pada eksekusi otomatis. Sekarang ada `approvedBy: "engine"`: persetujuan mesin tetap melewati semua pemeriksaan bukti, learning, dan cooldown. Hanya persetujuan manusia yang melonggarkan.
- Guardrail memeriksa ulang bukti probabilitas di server. Besar langkah scale dibatasi oleh `scalePct` yang dihitung engine, bukan oleh angka di payload.
- **Harga cadangan di route apply tidak sama dengan engine** (Rp 150.000 / Rp 199.000 / coret Rp 499.000 vs `MONEFYI_PRICING`), padahal bagian 1 di atas menyatakan sudah disamakan. Itu keliru. Lebih berbahaya lagi, rencana "harga landing page tidak sesuai" tidak membawa harga, sehingga menyetujuinya menulis harga cadangan itu ke database. Sekarang semuanya memakai `MONEFYI_PRICING`.

### Angka karangan yang dihapus
- Status CAPI awal di store adalah `getMockCapiStatus()` (EMQ 8,6) yang dianggap data nyata. Sekarang bertanda `verified: false`, dan Pilar Tracking berstatus `perlu_data` sampai ada pembacaan nyata dari Meta.
- Take-rate order bump 31% dan upsell 16% di store hanya perkiraan. Tidak lagi dipakai sebagai skor, hanya ditampilkan berlabel "perkiraan".
- Skor dasar Pilar Offer (78), kisaran skor Pilar Ads (90/76/64/55), dan kampanye uji yang muncul di setiap siklus dihapus. Pilar tanpa data cukup berstatus `perlu_data` dan tidak masuk rata-rata skor keseluruhan.
- Klaim bonus produk (database 500+ harga material, template PKWT) dihapus dari rencana offer karena tidak bisa diverifikasi dari kode.
- Skala budget tidak lagi melompat ke `minDailyBudget`: budget Rp 50.000 naik sesuai langkah, bukan menjadi Rp 100.000.

### Konfigurasi baru (default di `DEFAULT_WINNING_ENGINE_CONFIG`)
`breakEvenCpa` (0 = otomatis), `contributionMarginPct` (90), `killMaxMultipleOfTarget` (2,5), `winProbabilityToScale` (0,8), `lossProbabilityToPause` (0,9), `priorStrengthClicks` (40). Seperti field lain di bagian 3, ini belum bisa diubah dari dashboard sampai ditambahkan ke `api-routes/engine/config/route.ts`.

### Pengujian
`npx tsx engine/__tests__/winningEngine.scenarios.ts` menjalankan 33 uji (rumus Beta terhadap nilai analitik, skenario kampanye, guardrail, data kosong, CAPI mock). Seluruhnya lulus. `winningEngine.ts` dan `decisionCore.ts` lolos type-check `strict`. Route `tick` dan `apply` hanya diperiksa sintaksisnya karena Next.js dan Supabase tidak ada di zip.

### Batasan yang jujur
- `contributionMarginPct` 90% dan `killMaxMultipleOfTarget` 2,5 adalah **asumsi saya**, bukan hasil kalibrasi data Anda. Sesuaikan dengan biaya gateway, pajak, dan toleransi risiko Anda.
- Mesin menilai satu agregat jendela 14 hari. Belum ada deret harian, jadi belum bisa mendeteksi tren memburuk dalam 3 hari terakhir. Itu langkah berikutnya yang paling bernilai.
- Skor Pilar 1, 2, 3 masih heuristik (hanya diberi data minimum dan tidak lagi punya angka dasar karangan). Ambang seperti LP ke checkout < 2% dan checkout selesai < 25% belum dikalibrasi ke data historis Monefyi.
- Anchor Pro: `MONEFYI_PRICING` memuat harga coret Rp 250.000, sedangkan bagian 3 di atas menyebut Rp 499.000. Konfirmasi mana yang benar di landing page Anda. Page audit akan menandai ketidakcocokan.
- Pembacaan EMQ nyata dari Meta belum diimplementasikan, sehingga Pilar Tracking akan `perlu_data` sampai itu dibuat.
