# ADR 005 — Fase 4: registry tool

- Status: diterapkan di kode
- Tanggal: 2026-11-04

## Keputusan

Tool agen hidup di `agent-core/`. Satu daftar menghasilkan skema fungsi, daftar MCP, `docs/agent/AGENT_MANUAL.md`, dan fixture.

Delapan tool. Argumen paling banyak enam. Tidak ada `org_id`. `find_*` mengembalikan paling banyak lima kandidat dari baris yang diberikan, atau `needs_choice`. `commit_record_cost` hanya menerima token dan `idempotency_key`. Token berlaku 10 menit.

Teks yang terbaca sebagai biaya mendapat `sop: catat_biaya`, sama dengan jalur tombol catat. Menyimpan biaya melewati `prepare` lalu `commit`. Nominal yang ditulis adalah nominal di dalam token.

Mandor (`worker`) boleh menyiapkan dan menyimpan biaya. Usulan notifikasi mulai dari `manager`. Satu spesialis melihat paling banyak delapan tool.

Kunci token di klien hanya mengunci nominal antara siapkan dan simpan. Pemeriksaan di server menyusul pada fase mesin agen.
