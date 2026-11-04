# ADR 001 — Arsitektur siap-agen

- Status: diterima. Fase 1 dikerjakan di ADR 002.
- Tanggal: 2026-11-04
- Lingkup: platform proyek (nama produk tidak di-hardcode; hari ini tampil sebagai Planner)

## Keputusan

Platform agen ditanam pada klien yang hidup dan pada rantai migrasi yang benar-benar di-deploy:

- UI: `monefyi_planner/` (React + Vite, domain produksi `planner.monefyi.com`)
- Data plane: `my-supabase-project/supabase/migrations/` dan `my-supabase-project/supabase/functions/`
- Aturan murni: paket baru `packages/domain/` (tanpa React, tanpa Supabase), dipakai UI, parser, dan tool
- Kontrak agen: folder baru `agent-core/` (tool, SOP, generator skema)

Klien vanilla `planner/` (satu IIFE `js/app.js`, 2.355 baris) **dibekukan**. Ia bukan tempat menanam agen. Memecah IIFE itu menjadi modul akan membuat produk ketiga, sementara produksi sudah pindah.

Nama produk, warna, dan logo hanya boleh datang dari satu modul konfigurasi merek. Prompt, tool, dan SOP tidak menyebut nama aplikasi.

## Konteks

Brief fase 0 menggambarkan PWA vanilla: `planner/js/app.js`, `planner/index.html`, `planner/css/app.css`, skema `planner/supabase/migrations/001_planner_core_schema.sql`, dan dua edge function. Audit di bawah membuktikan gambaran itu akurat **untuk pohon vanilla**, tetapi bukan keadaan sistem yang dipakai pengguna hari ini.

Ada dua klien dan satu database bersama (project Supabase yang sama dengan aplikasi Monefyi utama):

| Pohon | Peran hari ini | Nasib |
|---|---|---|
| `planner/` | Prototipe vanilla. Port dev 5174. Masih bisa di-deploy terpisah. Tombol "Masuk cepat" aktif. | Beku. Tidak ditambah fitur. Fase 1 hanya menutup lubang keamanan jika URL-nya masih hidup. |
| `monefyi_planner/` | Klien produksi. Port dev 5173. Estimator, keuangan v2, absensi, payroll, undo. | UI yang dikembangkan. |
| `my-supabase-project/supabase/` | Satu-satunya skema dan function yang di-push. | Sumber kebenaran data. |
| `planner/supabase/` | Salinan awal. SQL inti identik dengan migrasi `20260523120000`. Function sudah tertinggal. | Bukan sumber deploy. Jangan di-push. |

`001_planner_core_schema.sql` dan `20260523120000_planner_core_schema.sql` byte-identik. Semua perubahan sesudah itu (onboarding, RLS, keuangan, estimator, langganan) hanya ada di `my-supabase-project`. README yang menyuruh "ubah skema di satu tempat lalu sinkronkan" tidak lagi menggambarkan kenyataan: ada puluhan migrasi yang tidak punya pasangan di `planner/supabase`.

## Prinsip yang mengikat arsitektur ini

P1–P11 pada brief berlaku. Empat batas tambahan, karena data yang ada sudah lebih kaya daripada brief:

1. Agen, UI, dan edge function memanggil fungsi domain yang sama. Tidak ada rumus rupiah atau EVM kedua.
2. `org_id`, peran, dan `user_id` selalu dari JWT. Argumen tool tidak memuatnya.
3. Profil perusahaan hanya boleh mengubah parameter bertipe yang SOP izinkan, di dalam min/max. Tidak bisa mematikan jurnal seimbang, isolasi tenant, persetujuan aksi kritis, atau jejak audit.
4. Penulisan uang lewat satu jalur: validasi domain → `prepare_*` → kartu konfirmasi manusia atau kebijakan otonomi → `commit_*` dengan `idempotency_key`. Parser teks hanyalah pintu masuk ke jalur itu.

## Temuan audit

Angka parser di bawah direproduksi dengan menyalin aturan di `planner/js/app.js` (baris 1636–1656 dan `parseNumberFromText`) dan menjalankannya. `monefyi_planner/src/lib/commandParser.ts` memakai tes yang sama: `/ribu|rb|k/i` tanpa batas akhir kata, dan `parseNumberFromText` menghapus semua titik dan koma.

### 1. Parser rupiah — masih hidup di kedua klien

Pengali `× 1000` menyala jika string **mengandung** huruf `k`, bukan hanya akhiran `65k`. `sak`, `tukang`, `kaleng`, dan `proyek` semua mengandung `k`.

| Input | Hasil hari ini | Seharusnya |
|---|---|---|
| `beli semen 10 sak 65000` | qty 10 × Rp 65.000.000 = **Rp 650.000.000** | Rp 650.000 |
| `bayar tukang 1.500.000` | **Rp 1.500.000.000** (`tukang` memicu `k`) | Rp 1.500.000 |
| `bayar tukang 1,5 juta` | **Rp 15.000.000** (koma dihapus jadi `15`) | Rp 1.500.000 |
| `beli cat 2 kaleng 150000` | **Rp 2.000** (`kaleng` bukan satuan; `2` tertangkap lalu `× 1000`; `150000` terbuang) | 2 kaleng × Rp 150.000 |

`beli semen 10 sak 65rb` kebetulan benar (Rp 650.000) karena akhiran `rb` ikut terpotong regex lalu dikalikan 1000. Tes yang ada, `commandPipeline.test.ts`, hanya memeriksa intent `record_cost` untuk `catat semen 10 sak 65000` dan **tidak memeriksa nominal**. Itu sebabnya regresi ini lolos.

Vanilla tidak mengenali kata kerja `catat` tanpa `beli` (`catat semen 10 sak 65000` → tidak cocok). React mengenali `catat` dan tetap salah nominal.

Satuan yang belum dikenal antara lain: kaleng, ember, galon, dus, set, titik, hari, orang, m2.

### 2. Smart Button menulis tanpa konfirmasi — benar di vanilla, sudah ada kartu di React

Vanilla `executeSmartCommand`: jika keyakinan aturan ≥ 0,75, `executeIntent` langsung `insert` ke `planner_cost_realizations`, `planner_work_items`, dan `planner_daily_logs`.

`needsConfirm` hanya dibaca di satu tempat (`showSmartOutput`) dan tidak pernah di-set. Tombol "Benar" (`confirmSmartCommand`) hanya menyembunyikan kartu dan menampilkan toast "Dikonfirmasi!". Tombol "Koreksi" hanya menyembunyikan kartu. Keduanya tidak menyimpan dan tidak membatalkan, karena baris sudah tertulis.

React `CommandModal.handleProcess` selalu masuk stage `confirm` sebelum `executeIntent`. Itu sudah sesuai arah fase 1.2 untuk klien produksi. Yang belum: nominal hasil parser bisa salah sebelum pengguna melihat kartu, dan tidak ada `prepare_token` atau `idempotency_key`.

### 3. RLS — lubang brief sebagian sudah ditambal, lubang peran masih terbuka

Di `001` / `20260523120000`:

- `planner_members_self_insert` … `WITH CHECK (user_id = auth.uid())` tanpa cek peran. Pemanggil bisa menyisipkan dirinya dengan `role = 'owner'` di organisasi mana pun. **Benar untuk file itu.**
- Tabel anak (`planner_rap_items`, `planner_work_items`, `planner_cost_realizations`, `planner_daily_logs`, `planner_analysis_snapshots`) memakai `FOR ALL` hanya dengan keanggotaan organisasi. `viewer` bisa menulis. **Benar untuk file itu.** Postgres memakai ekspresi `USING` sebagai `WITH CHECK` bila `WITH CHECK` tidak ditulis, jadi insert tidak terbuka untuk anonim; yang terbuka adalah setiap anggota, termasuk viewer.

Keadaan setelah rantai migrasi (inilah yang berlaku jika `db push` lengkap):

- `20260531120000_planner_onboarding.sql` menghapus `planner_members_self_insert`.
- Peran disederhanakan: `admin → owner`, `member → manager`, `viewer → worker`. Constraint hidup: `owner | manager | worker`. **Tidak ada peran `viewer`.** Fase 1 tidak boleh menghidupkan kembali `viewer` / `member` / `admin`.
- `planner_auth_org_ids()`, `planner_auth_admin_org_ids()`, `planner_auth_project_ids()` adalah `SECURITY DEFINER` agar RLS tidak rekursif. Belum ada `is_org_member(org_id, min_role)` dengan urutan peran.
- Tabel anak proyek (`20260601120000`) sudah punya `WITH CHECK`, tetapi memakai `planner_auth_project_ids()` — himpunan yang **boleh dibaca**, termasuk `worker`. Worker yang ditugaskan bisa mengubah RAP, biaya, pekerjaan, dan log.
- Keuangan v2 (`20260609120000`) memakai `planner_auth_org_ids()` untuk `FOR ALL` pada jurnal, akun, hutang, piutang, dan aset. Setiap anggota aktif, termasuk worker, bisa menulis dan menghapus buku besar.
- `planner_members_manage` mengizinkan owner **dan manager** menyisipkan baris anggota tanpa membatasi nilai `role`. Manager bisa membuat owner.

### 4. Edge function — service role, dan salinannya terbelah

| | `planner/supabase/functions/` | Yang di-deploy (`my-supabase-project`) |
|---|---|---|
| `planner-parse-command` | 97 baris. CORS `*`. Service role. JWT dicek, keanggotaan tidak. Tanpa kuota. Tanpa batas panjang input. | 223 baris. CORS allowlist. JWT lewat klien anon, lalu **tetap service role** untuk baca profil dan tulis pemakaian. Kuota Gemini per pengguna ada (`_shared/gemini.ts`). Keanggotaan organisasi tidak dicek. Contoh koreksi dari klien masuk ke prompt. |
| `planner-analyze` | CORS `*`. Service role. Tanpa kuota. Tanpa cek keanggotaan. | CORS allowlist. Selebihnya sama: service role setelah `getUser`. Siapa pun yang punya JWT project Supabase ini dan tahu `project_id` bisa membaca RAP, biaya, dan menulis `planner_analysis_snapshots`. Tanpa kuota. |

Keduanya mem-bypass RLS. Project Supabase dipakai bersama aplikasi lain, jadi "pengguna login" tidak sama dengan "anggota organisasi proyek".

`planner-analyze` **dipanggil** klien React (`analyzeService.ts`). Brief yang menyebut "belum dipanggil klien" hanya benar untuk vanilla (`fnAnalyze` ada di config, tidak ada pemanggilan di `app.js`).

Port dev vanilla 5174 tidak ada di allowlist CORS. Port 5173 ada.

### 5. Kredensial di repo — masih ada

- `planner/js/config.js` dan salinan identik `planner/public/js/config.js`: `bypassLoginEnabled: true`, email dan password akun demo, serta anon key. Tombol di `planner/index.html`.
- `planner/README.md` menuliskan password yang sama dan password akun kedua.
- `my-supabase-project/supabase/migrations/20260524120000_planner_seed_auth_email_users.sql` menulis ulang password itu ke `auth.users` bila migrasi dijalankan.
- `monefyi_planner` mengambil URL dan anon key dari env. Tidak menyimpan password bypass. Masih meng-hardcode `adminEmails` di `src/lib/config.ts` (daftar yang sama dengan vanilla). `VITE_DEV_DEMO_AUTH` hanya menyala jika env diset.

Menghapus file tidak mencabut password dari riwayat git atau dari database yang sudah di-seed. Fase 1 wajib merotasi password itu di Supabase, bukan hanya menghapus teks.

### 6. Angka turunan ditulis browser — masih hidup

Kolom `total_budget`, `total_spent`, `progress_pct` tidak dihitung trigger atau view.

- Vanilla: `updateProjectBudget` (baris 749), `updateProjectProgress` (baris 910), `total_spent` (sekitar baris 978).
- React: `costService.recalculateProjectSpent` menulis `total_spent`; `workItemService.updateProjectProgressFromWorkItems` menulis `progress_pct`; pembuatan proyek menulis `total_budget`.
- Akun keuangan v2 menyimpan `current_balance` sebagai kolom, bukan saldo dari jumlah baris jurnal.

Dua klien bisa menimpa angka yang sama. Tidak ada satu rumus.

### 7. Zona waktu — kolom ada, pemakaian masih UTC

`planner_organizations.timezone` sudah ada, default `Asia/Jakarta` (`20260531120000`). UI React menyimpan dan menampilkannya di wizard serta pengaturan.

`todayStr()` di vanilla (`app.js` baris 2255) dan di React (`adapters.ts`) keduanya `toISOString().slice(0, 10)`, yaitu tanggal UTC. Antara 00.00 dan 07.00 WIB, biaya dan log harian tertanggal kemarin. Kuota Gemini di server sudah memakai WIB (`getTodayWib`); klien belum.

### 8. Kode mati — sebagian hanya mati di vanilla

| Artefak | Vanilla | Klien React / server |
|---|---|---|
| `setupRealtime()` | Didefinisikan, tidak pernah dipanggil | `subscribeNotifications` dan `subscribeProjects` dipanggil dari `useBootstrap.ts` |
| `planner_parsing_rules` | Tidak dibaca. Aturan ada di kode | Tidak dibaca. Pembelajaran memakai `planner_command_memory` |
| `planner_analysis_snapshots` | Tidak ditulis klien | Ditulis `planner-analyze`. Tidak ada pembaca di `monefyi_planner/src` |
| `planner_notifications` | Hanya dibaca dan ditandai baca | Dibuat oleh edge function keanggotaan (`_shared/audit.ts`: undang, setujui, cabut, pindah owner). Tidak dibuat untuk biaya, progres, atau jatuh tempo |
| `duplicateProject` | Rangkaian insert di browser, bukan satu transaksi | Tidak ada padanan. Ada `planner_reversible_actions` (undo 7 hari) untuk aksi lain |

Salinan ganda yang sudah berpisah:

- `planner/js/app.js` identik dengan `planner/public/js/app.js`
- `planner/js/config.js` identik dengan `planner/public/js/config.js`
- `planner/css/app.css` dan `planner/public/css/app.css` **sudah beda** satu aturan (`.auth-logo-img`)
- `index.html` memuat `js/config.js`, `js/app.js`, `css/app.css`. `publicDir` Vite adalah `public/`, jadi URL yang sama bisa datang dari dua file. `dist/` di-gitignore, tetapi sumbernya tetap ganda.
- 83 `onclick` di `index.html`, 6 di `app.js`

### 9. Keuangan yang sudah ada — jangan ditambah buku ketiga

Bukan buku kosong. Sudah ada tiga model yang belum menyatu:

1. Realisasi proyek: `planner_cost_realizations`, `planner_project_incomes`, `planner_project_transfers` (`loan` / `repayment`). Angka ringkas di kolom proyek.
2. Buku besar v2: `planner_finance_accounts`, `planner_journal_entries`, `planner_journal_lines`, plus opex, persediaan, aset, piutang, hutang, investor. `reference_type` mencakup biaya proyek, pemasukan, opex, transfer, manual, amortisasi, penyusutan, saldo awal.
3. "Pihak" hanya string: `debtor_name` / `creditor_name`. `partyLedger.ts` mengelompokkan nama di klien. Tidak ada tabel `parties`. Tidak ada id stabil untuk agen (melanggar P3).

Jurnal v2 **belum** memenuhi P9:

- Tidak ada trigger jurnal seimbang (hanya cek per baris: debit dan kredit tidak sekaligus positif).
- Baris dan entri boleh di-update dan di-hapus (`ON DELETE CASCADE`, policy `FOR ALL`).
- Nominal `numeric(15,2)`, bukan bilangan bulat rupiah (P8).
- Tidak ada dompet (`wallets`) sebagai entitas; kas adalah tipe akun.
- Transfer antar proyek ada di tabel v1, tidak selalu menjadi jurnal.

Fase 3 memperkeras dan menyatukan model ini. Tidak membuat skema paralel dengan nama baru lalu membiarkan v1 dan v2 tetap ditulis UI.

### 10. Pelanggaran prinsip agen yang sudah terlihat di kode

- UI menulis tabel langsung (P1).
- `fuzzyMatchProject` / `fuzzyMatchWorkItem` mengambil kecocokan `includes` pertama, tanpa skor dan tanpa `needs_choice` (P3). Parser AI boleh mengembalikan id dari konteks yang dikirim klien.
- Tidak ada `prepare_*` / `commit_*` / `idempotency_key` (P4). Undo React (`planner_reversible_actions`) adalah jejak setelah tulis, bukan pratinjau sebelum tulis.
- Urutan langkah dipilih klien dan model, bukan mesin alur (P5).
- Error Supabase dan toast adalah kalimat bebas, bukan `{code, message_id, fix_hint, valid_options}` (P6).
- Beberapa panggilan mengirim `user_id` di body function (P7).
- Uang tidak satu pustaka (P8).
- Jejak perintah (`planner_command_logs`, `ai_usage_logs`) tidak menyimpan versi SOP atau versi profil, karena keduanya belum ada (P10).
- Skema tool tidak menghasilkan manual dan fixture dari satu sumber (P11).

## Struktur folder target

Tidak dibuat di fase 0. Ini kontrak untuk fase 2 dan seterusnya.

```
packages/domain/                 aturan murni, satu-satunya rumus
  money/                         parseRupiah, format, satuan, bilangan bulat
  dates/                         tanggal organisasi (zona dari argumen, bukan dari jam proses)
  evm/                           PV, EV, AC, SPI, CPI, EAC
  progress/
  validation/                    nominal, tanggal, satuan, needs_review
  journal/                       template lima kejadian dan cek seimbang (fase 3)
  errors/                        bentuk {code, message_id, fix_hint, valid_options}

agent-core/
  tools/                         satu file per tool: nama, deskripsi, skema, risk, peran
  registry/                      generator: JSON Schema, server MCP, AGENT_MANUAL.md, fixture
  sop/                           berkas YAML (fase 5)
  flow/                          tipe status run; mesinnya jalan di edge function
  profile/                       buildContextPack, validator kekosongan dan konflik (fase 6)

monefyi_planner/src/
  ui/                            yang sekarang di components/ dan pages/ — tidak berisi rumus
  data/                          yang sekarang di services/ — hanya IO Supabase
  brand/                         nama, warna, logo. Satu modul.

my-supabase-project/supabase/
  migrations/                    satu-satunya DDL. Idempoten, ada skrip pembatalan.
  functions/_shared/agent/       pemanggilan tool di server, selalu JWT pengguna
  functions/agent-run/           fase 7
  tests/                         SQL peran: owner, manager, worker, orang luar

docs/adr/                        keputusan
docs/agent/AGENT_MANUAL.md       dihasilkan registry, tidak ditulis tangan
evals/                           skenario YAML (fase 8)

planner/                         beku. README satu paragraf: jangan dikembangkan.
```

`planner/supabase/functions/*` tidak disalin lagi ke folder deploy. Perubahan function hanya di `my-supabase-project`.

## Alur data

Hari ini (yang harus diberhentikan untuk penulisan uang):

```
teks/suara → regex atau Gemini → executeIntent → insert/update tabel dari browser
```

Target, satu jalur untuk manusia dan agen:

```
teks, suara, atau pilihan UI
        │
        ▼
  router SOP (aturan dulu, model hanya jika aturan tidak yakin)
        │
        ▼
  mesin alur  ── menolak tool di luar current_step
        │         menyajikan allowed_tools dan next_allowed_actions
        ▼
  find_*  →  paling banyak 5 kandidat + skor, atau needs_choice
        │
        ▼
  prepare_X  →  domain validator + pratinjau dampak + prepare_token (10 menit)
        │         nominal dan tanggal terkunci di token
        ▼
  kartu konfirmasi (atau kebijakan otonomi di dalam batas profil)
        │
        ▼
  commit_X(prepare_token, idempotency_key)
        │
        ▼
  RPC / Postgres sebagai pengguna JWT   ← RLS dan trigger, bukan service role
        │
        ▼
  agent_actions: agen, model, versi SOP, versi profil, input, output
```

Service role tidak menjadi jalur tulis agen. Ia hanya untuk pekerjaan yang tidak punya pengguna (jadwal), dan tetap memakai `org_id` dari baris job, bukan dari argumen model.

Keuangan proyek adalah filter `project_id` pada buku yang sama dengan keuangan usaha. Tidak ada transaksi yang disalin antar tabel.

Keselamatan yang tidak bisa ditimpa profil:

- jurnal seimbang sebelum commit
- isolasi tenant dari JWT
- aksi `critical` butuh persetujuan manusia
- tidak ada UPDATE/DELETE jurnal; koreksi lewat jurnal pembalik
- biaya langsung tanpa proyek ditolak
- kuota, batas iterasi, dan kill switch per organisasi

## Batas modul

| Modul | Boleh | Tidak boleh |
|---|---|---|
| `packages/domain` | Fungsi murni. Jam dan zona masuk sebagai argumen. | `fetch`, Supabase, DOM, membaca env |
| `monefyi_planner` `ui/` | Menampilkan pratinjau, mengumpulkan input, memanggil data | Menghitung rupiah, EVM, atau saldo |
| `monefyi_planner` `data/` | Query dan RPC | Memutus aturan bisnis atau memilih id "yang paling mirip" |
| `agent-core/tools` | Skema datar, maksimal 6 argumen, enum untuk pilihan | Teks bebas untuk hal yang bisa dipilih; argumen `org_id` |
| `agent-core/flow` | Status run, langkah, timeout, tool yang diizinkan | Mengarang langkah pengganti saat tool ditolak |
| `agent-core/profile` | Parameter bertipe + catatan yang disetujui manusia | Menulis kebijakan yang menembus daftar keselamatan |
| Edge function | JWT, keanggotaan, kuota, memanggil domain | Mempercayai JSON model sebagai id atau nominal final |
| Postgres | RLS, trigger seimbang, saldo sebagai view, audit | Menerima service role dari jalur agen |

Peran tool terhadap peran organisasi (urutan: `worker` < `manager` < `owner`):

- baca: worker ke atas, hanya data organisasinya
- draf / prepare: manager ke atas, kecuali SOP mengizinkan worker untuk log harian miliknya
- commit uang dan progres: manager ke atas, di dalam ambang profil; di atas ambang menjadi `critical`
- ubah profil, peran, dan kill switch: owner

Satu agen melihat paling banyak 8 tool. Manajer proyek, keuangan, purchasing, dan HR adalah subset registry, bukan prompt yang berbeda-beda dengan tool yang sama.

## Pemetaan fase ke pohon ini

Brief menulis fase 2 sebagai "pecah `app.js`". Itu diganti dengan ekstraksi domain dari React, karena IIFE-nya dibekukan. Isi tiap fase tidak dilonggarkan.

| Fase | Dikerjakan di | Catatan dari audit |
|---|---|---|
| 1.1 `parseRupiah` | `packages/domain/money` + tes. Disambung ke `commandParser.ts`. | Regresi tabel di atas wajib gagal sebelum perbaikan dan lulus sesudahnya. Tes pipeline yang hanya cek intent tidak cukup. |
| 1.2 kartu konfirmasi | React: pastikan tidak ada jalur tulis sebelum stage confirm. Vanilla: matikan eksekusi otomatis atau cabut deploy. | Tombol vanilla hari ini tidak menyimpan dan tidak membatalkan. |
| 1.3 RLS | Migrasi baru di `my-supabase-project` saja, plus SQL owner / manager / worker / orang luar. | Jangan menghidupkan `viewer`. Tutup tulis worker pada jurnal dan tabel anak. Tambah `is_org_member(org_id, min_role)`. Manager tidak bisa mengangkat owner. |
| 1.4 edge function | Hanya salinan deploy. | JWT pengguna untuk query.data. Service role hanya setelah cek keanggotaan. Kuota pada `planner-analyze`. Batas ukuran input. CORS tetap allowlist; jangan kembali ke `*`. |
| 1.5 kredensial | Hapus bypass dari `planner/js`, `public/js`, README, dan hentikan migrasi yang menimpa password. Rotasi di dashboard. `adminEmails` pindah ke server. | Riwayat git tetap menyimpan password lama sampai dirotasi. |
| 1.6 angka turunan | Trigger atau view. Klien berhenti menulis kolom itu. | Jangan menghapus kolom di fase 1 (pembacaan lama masih ada). |
| 1.7 tanggal | `packages/domain/dates` memakai `organizations.timezone`. | Ganti kedua `todayStr()`. |
| 2 | `packages/domain` + `monefyi_planner/src/{ui,data}`. Bukan pecah IIFE. | Realtime React sudah hidup. `duplicateProject` vanilla tidak dipindahkan; bila duplikasi dibutuhkan, itu RPC transaksi di fase terpisah. Hapus pemakaian `planner_parsing_rules` dari rencana; memori perintah yang ada ditinjau ulang agar tidak menghafal nominal salah. |
| 3 | Perluas jurnal v2 + pihak + dompet. Migrasi realisasi yang idempoten. | Jangan membuat buku ketiga di samping v1 dan v2. Uang menjadi bilangan bulat di lapisan ini, dengan migrasi `numeric` yang punya pembatalan. |
| 4–8 | `agent-core/`, edge `agent-run`, `evals/` | Pintu teks/suara masuk ke SOP yang sama dengan tombol UI. |

## Daftar risiko

1. **Salah pohon.** Perbaikan hanya di `planner/js/app.js` tidak mengubah produksi. Perbaikan hanya di React meninggalkan vanilla sebagai pintu bypass jika URL-nya masih terpasang.
2. **Service role tanpa keanggotaan** pada project Supabase bersama. Kebocoran lintas produk, bukan hanya lintas organisasi Planner.
3. **Worker bisa menulis buku besar** lewat policy `planner_auth_org_ids()`.
4. **Parser `k` dan koma**, lalu memori perintah menghafal hasil yang salah dan menaikkan keyakinan pada giliran berikut.
5. **Password di git dan di migrasi seed.** Menghapus teks tanpa rotasi tidak menutup akun.
6. **Dua penulis angka turunan** (browser dan, nanti, trigger) selama kolom masih bisa di-update klien.
7. **Tanggal UTC** menggeser biaya dan log pada dini hari WIB, termasuk data yang sudah tersimpan.
8. **Tiga model uang** (realisasi, jurnal, nama pihak). Fase 3 yang menambah tabel baru tanpa mematikan jalur lama menggandakan saldo.
9. **`numeric(15,2)`** dan pembulatan. Pindah ke integer rupiah harus satu kali, di buku yang sama.
10. **Jurnal bisa diubah dan dihapus**, dan `current_balance` bisa tidak sama dengan jumlah baris.
11. **Kecocokan `includes` pertama** memilih proyek atau pekerjaan yang salah tanpa `needs_choice`.
12. **Injeksi prompt** lewat nama pihak, catatan, dan `learned_examples` yang dikirim ke model. Gerbang fase 8; fase 1 cukup membatasi panjang dan tidak menaruh contoh itu di atas instruksi sistem.
13. **Menjalankan `001` sebagai skema penuh** pada database baru menghidupkan kembali self-insert dan tidak membuat tabel yang dipakai React.
14. **Constraint peran.** Menambah lagi nilai `viewer` akan bertentangan dengan migrasi onboarding yang sudah memetakan viewer lama menjadi worker.
15. **Salinan CSS dan function** yang terlihat "sumber" tetapi kalah oleh `public/` atau oleh folder deploy.
16. **Sinyal lapangan buruk.** Commit harus idempoten dan kartu konfirmasi harus tetap benar setelah sambungan putus di tengah `prepare` → `commit`.
17. **Nama aplikasi di-hardcode** di judul, prompt Gemini (`"Monefyi Planner"`), dan `plannerBrand.ts`. Ganti nama produk nanti akan menyebar ke prompt agen jika tidak dipusatkan sekarang.

## Yang sengaja tidak dilakukan di fase 0

Tidak ada perubahan kode aplikasi, SQL, function, atau konfigurasi. Tidak ada data yang dihapus. Tidak ada folder target yang dibuat.

## Deploy dan pembatalan fase ini

Tidak ada deploy. Pembatalan: hapus `docs/adr/001-arsitektur-agent-ready.md`.

## Verifikasi fase 0

Tidak ada tes perilaku, karena perilaku aplikasi tidak berubah. Yang dijalankan:

- Reproduksi parser vanilla (Node) untuk empat kalimat regresi di tabel atas.
- `cmp` salinan `app.js`, `config.js`, skema inti, dan kedua edge function.
- `diff` kedua `app.css` (satu aturan berbeda).
- Pembacaan policy efektif di migrasi onboarding, RLS proyek, dan keuangan v2.
- Pembacaan `commandParser.ts`, `CommandModal.tsx`, `costService.ts`, `adapters.ts` `todayStr`, `notificationService.ts`, dan pemanggilan `planner-analyze`.
