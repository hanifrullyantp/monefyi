# ADR 003 — Fase 2: satu rumus domain

- Status: diterapkan di kode, belum di-deploy
- Tanggal: 2026-11-04
- Bergantung pada: ADR 001, ADR 002

## Keputusan

Fase 2 pada brief (memecah IIFE, menghapus `public/`, menyalakan realtime vanilla, RPC duplikasi proyek) tidak dikerjakan di `planner/`. Pohon itu tetap beku. Isi yang dipertahankan: satu sumber rumus, lapisan yang tidak menghitung uang sendiri, dan memori yang tidak menghidupkan kembali nominal salah.

### Domain

`packages/domain/src/` memegang:

- `money.ts` — rupiah dan perintah biaya (fase 1)
- `dates.ts` — `orgToday`
- `progress.ts` — progres jadwal dan rata-rata tertimbang
- `evm.ts` — PV, EV, AC, SPI, CPI, EAC. `planner-analyze` memanggil fungsi ini, bukan salinan rumus
- `validation.ts` — bentrok memori dan syarat menghafal
- `errors.ts` — `{code, message_id, fix_hint, valid_options}`

Edge function mengimpor file itu. Tidak ada rumus kedua di `_shared`.

Progres di UI membulatkan ke bilangan utuh. Trigger SQL fase 1 membulatkan dua desimal. Keduanya tidak disatukan di fase ini karena mengubah angka yang sudah tampil.

### Lapisan klien

`components/` dan `pages/` tetap lapisan tampilan. `services/` tetap lapisan IO. Folder tidak dipindah massal: aplikasi produksi sudah berupa modul, dan pemindahan ratusan berkas akan menyentuh perubahan estimator yang belum selesai tanpa mengubah rumus.

`planner_parsing_rules` tidak dibaca klien React maupun klien vanilla. Aturan yang hidup ada di kode. Tabel tidak dihapus.

`duplicateProject` vanilla tidak dijadikan RPC di fase ini.

Realtime React sudah terpasang di bootstrap. Tidak ada perubahan di sana.

### Memori perintah

Baris `planner_command_memory` tidak dihapus. Saat dibaca, nominal yang berbeda dari `parseCostCommand` / `parseRupiah` yang sudah pasti diabaikan, lalu parser aturan yang dipakai. Hasil model yang bentrok atau masih `needsReview` tidak ditulis. Koreksi yang diketik pengguna tetap disimpan, termasuk bila angkanya berbeda dari parser.

## Risiko

- Deploy function harus bisa mengimpor `packages/domain` dari luar folder `supabase/functions`. Jika CLI menolak path itu, function gagal sebelum mengganti rumus yang sekarang berjalan.
- Memori yang diabaikan tetap tersimpan. Ia tidak lagi menimpa parser untuk kalimat yang parser-nya sudah pasti.
