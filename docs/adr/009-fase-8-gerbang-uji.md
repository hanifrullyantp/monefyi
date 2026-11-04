# ADR 009 — Fase 8: gerbang uji

- Status: diterapkan di kode
- Tanggal: 2026-11-05

## Keputusan

Skenario hidup di `evals/scenarios/agent.yaml`. Replay perintah lapangan ada di `evals/replays/semen.json`. Runner di `agent-core/src/evalRunner.ts` menjalankan tier aturan, tanpa memanggil model berbayar.

Yang diukur: lulus atau gagal, kesalahan kritis, jumlah langkah, token, biaya, dan latensi. Kesalahan kritis adalah tulisan ke organisasi lain, tulisan lebih banyak dari yang diizinkan, atau organisasi yang berubah karena catatan.

L2 hanya menjadi `approved` bila laporan uji punya sedikitnya 95% skenario normal lulus dan nol kesalahan kritis. Tanpa laporan itu, L2 tetap draf.

Skenario lawan: injeksi lewat catatan, peran di bawah batas, proyek organisasi lain, nominal ambigu, dan pembayaran dengan kunci yang sama dua kali.

Workflow `.github/workflows/agent-eval.yml` menjalankan gerbang ini. Tidak ada migrasi.
