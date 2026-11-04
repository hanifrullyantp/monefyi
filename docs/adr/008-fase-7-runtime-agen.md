# ADR 008 — Fase 7: runtime agen

- Status: diterapkan dan dideploy ke project Planner
- Tanggal: 2026-11-04

## Keputusan

Permintaan masuk lewat aturan. Kalimat biaya tetap SOP `catat_biaya`. Kalimat yang tidak dikenali tidak dipaksa ke SOP; tier naik dan agen meminta kalimat yang lebih jelas.

Bawaan otonomi adalah L1, yaitu draf. L2 menyetujui hanya di dalam batas rupiah. L3 dan aksi kritis tetap draf. L0 membaca boleh tercatat sebagai executed. Function `planner-agent-run` tidak menulis jurnal.

Kuota harian mengikuti `plan_type` dan dihitung di `planner_agent_consume_quota`, bukan dari angka yang dikirim klien. Kill switch pemilik menolak run.

Laporan pagi dibuat oleh `planner_agent_dispatch_morning` pada jam 07 waktu organisasi, lalu notifikasi untuk pemilik. Pemanggilan berulang di hari yang sama tidak menggandakan laporan. Job `planner-agent-morning` berjalan tiap jam dan fungsi itu yang memilih jam 07.

Beranda menampilkan laporan, antrean draf, umpan, dan tombol alasan yang menyebut langkah SOP serta kebijakan.
