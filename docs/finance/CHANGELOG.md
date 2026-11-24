# CHANGELOG — Keuangan Froyek

Setiap PR yang menyentuh `apps/web/src/services/finance*`, `apps/web/src/services/incomeService.ts`, `apps/web/src/services/costService.ts`, `apps/web/src/lib/financeV2*`, `packages/domain/`, `agent-core/`, atau migrasi keuangan **WAJIB** menambah satu entri di file ini pada PR yang sama.

---

## [F0-T8] 2026-11-24 — Keluarkan `apps/web/.env.local` dari Git & Tambah ke `.gitignore`
- **Branch / PR:** `finance/F0-T8-remove-env-local`
- **Fase:** F0 (Kebenaran — T8)
- **Perubahan & Alasan:**
  - Menghapus `apps/web/.env.local` dari indeks Git (`git rm --cached apps/web/.env.local`) sambil mempertahankan file lokal di disk.
  - Menambahkan `apps/web/.env.local` dan `apps/*/.env.local` secara eksplisit ke `.gitignore`.
  - Mencatat kewajiban rotasi manual semua token pada file tersebut (termasuk token Vercel) di `OPEN-DECISIONS.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak ada.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** Verifikasi `git ls-files apps/web/.env.local` kosong dan `git check-ignore apps/web/.env.local` berhasil.
- **Dampak ke Tool Agent:** Tidak ada.
- **Cara Rollback:** `git revert` commit merge PR ini (tidak disarankan karena menyangkut keamanan kredensial).

## [F0-T0] 2026-11-24 — Kerangka Dokumentasi Keuangan, Template PR, & Gerbang CI `docs-gate`
- **Branch / PR:** `finance/F0-T0-docs-framework`
- **Fase:** F0 (Kebenaran)
- **Perubahan & Alasan:**
  - Membentuk seluruh kerangka dokumen wajib di `docs/finance/` (`ACCOUNTING-MODEL.md`, `CHANGELOG.md`, `DECISIONS.md`, `AGENT-GUIDE.md`, `OPEN-QUESTIONS.md`, `PHASES/F0-plan.md`).
  - Menambahkan `.github/pull_request_template.md` dengan checklist verifikasi akuntansi, dokumen, migrasi, dan dampak ke tool agent.
  - Menambahkan skrip gerbang CI `scripts/docs-gate-check.mjs`, script `npm run gate:docs`, workflow `.github/workflows/docs-gate.yml`, serta tes unit `apps/web/src/lib/docsGateCheck.test.ts` untuk menggagalkan PR bila file keuangan berubah tanpa pembaruan `docs/finance/CHANGELOG.md`.
- **Akun / Template Jurnal Tersentuh:** Tidak ada perubahan kode akuntansi; mendokumentasikan baseline COA & template F0.
- **Migrasi SQL:** Tidak ada.
- **Tes Ditambah:** `apps/web/src/lib/docsGateCheck.test.ts`.
- **Dampak ke Tool Agent:** Tidak ada perubahan runtime tool; mendefinisikan kontrak di `docs/finance/AGENT-GUIDE.md`.
- **Cara Rollback:** `git revert` commit merge PR ini.

