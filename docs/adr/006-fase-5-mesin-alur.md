# ADR 006 — Fase 5: SOP dan mesin alur

- Status: diterapkan di kode. Belum dideploy.
- Tanggal: 2026-11-04

## Keputusan

Sembilan SOP hidup di `agent-core/sop/*.yaml`. Mesin di `agent-core/src/flow.ts` membaca versi itu. Run menyimpan `current_step`, kedaluwarsa 30 menit, dan bisa dilanjutkan dari state yang sama.

Tool di luar langkah ditolak dengan `tool_di_luar_langkah`. Langkah tidak dipindah ke pengganti. Kegagalan, ambiguitas, dan konflik tetap di langkah yang sama. Setelah dua input salah, tindakan `eskalasi_pemilik` muncul tanpa melewati langkah.

Commit adalah titik persetujuan. Pascakondisi diisi saat langkah akhir dan tidak diubah lagi.

Parameter SOP bertipe integer dengan min, max, dan bawaan. Nilai di luar batas menolak pembuatan run. Profil perusahaan belum menimpa bawaan (fase 6).

`org_id`, peran, dan hasil tool bukan argumen agen. Endpoint `planner-flow` hanya memeriksa apakah tool diizinkan. Ia belum menjalankan tool dan belum memajukan langkah. Organisasi diambil dari keanggotaan JWT. Pengguna dengan lebih dari satu organisasi ditolak sampai ada ikatan organisasi di server.

Baris `planner_flow_runs` bukan izin menulis uang. Jurnal tetap lewat RLS.

## Deploy

Token yang ada belum bisa melihat project Planner, jadi migrasi dan function ini belum didorong.
