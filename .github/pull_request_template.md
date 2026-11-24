## Ringkasan Perubahan
- Tugas / Issue / Fase:
- Perubahan utama:

---

## Checklist Wajib Keuangan (Jika menyentuh keuangan, `packages/domain`, `agent-core`, atau migrasi)
- [ ] **Invarian Terjaga:** $\sum \text{Debit} = \sum \text{Kredit}$, jurnal tidak di-update/delete (hanya `reversal`), nominal rupiah bulat, kas buku = kas operasional.
- [ ] **Dokumen Diperbarui di PR Ini:**
  - [ ] `docs/finance/CHANGELOG.md` sudah ditambah entri PR ini (diwajibkan oleh gerbang CI `docs-gate`).
  - [ ] `docs/finance/ACCOUNTING-MODEL.md` & `docs/finance/DECISIONS.md` tetap sinkron dengan kode.
- [ ] **Dampak ke Agent AI:**
  - [ ] `docs/finance/AGENT-GUIDE.md`, `agent-core/functions.json`, SOP YAML, dan `evals/finance/` diperiksa/diperbarui jika ada perubahan skema/slot/aturan.
- [ ] **Migrasi & Keamanan:**
  - [ ] Migrasi SQL hanya ditulis lokal di `my-supabase-project/supabase/migrations/` (TIDAK push ke Supabase remote produksi; status `BLOCKED remote` dicatat di `OPEN-DECISIONS.md`).
  - [ ] Tidak ada file `.env*` atau rahasia yang ikut ter-commit.
- [ ] **Uji & Verifikasi:**
  - [ ] Tes reproduksi gagal ditulis lebih dulu (test-first).
  - [ ] `npm --prefix apps/web run typecheck` hijau.
  - [ ] `npm --prefix apps/web test` hijau.
  - [ ] `node scripts/docs-gate-check.mjs` hijau.

