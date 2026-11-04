# ADR 007 — Fase 6: profil perusahaan

- Status: diterapkan di kode
- Tanggal: 2026-11-04

## Keputusan

Dua puluh persen yang berbeda tiap usaha hidup di profil, bukan di kode SOP. Empat belas pertanyaan wizard mengubah jawaban menjadi field bertipe. Kalimat yang tidak masuk field menjadi catatan berstatus `usulan`.

Kebijakan menimpa angka bawaan SOP hanya di dalam min dan max. Parameter wajib yang kosong menghasilkan pertanyaan ke pemilik. Nilai tidak ditebak.

Kunci platform tidak bisa ditimpa: jurnal seimbang, isolasi tenant, persetujuan aksi kritis, jejak audit, dan larangan mengubah jurnal. Trigger menolak dokumen yang memuat kunci itu.

Usulan profil wajib punya bukti. Manajer boleh mengusulkan. Pemilik atau admin platform yang menyetujui. Rollback menyimpan isi versi lama sebagai versi baru, jadi riwayat tidak dihapus.

`buildContextPack` hanya memasukkan kebijakan se-domain dengan SOP, plus versi profil. Catatan panjang jatuh pada tier rendah supaya muat anggaran token.

Layar `/app/uji-agen` menghitung keputusan dari profil contoh dan tidak menulis database.

## Deploy

Tabel `planner_company_*` sudah ada di project Planner lewat migrasi `20261104210000`. Versi `20261104200000` sudah dipakai migrasi lain, jadi fase 6 tidak menimpa nomor itu.
