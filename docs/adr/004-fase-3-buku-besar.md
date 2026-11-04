# ADR 004 — Fase 3: satu buku besar

- Status: diterapkan di kode, deploy menyusul di turn yang sama
- Tanggal: 2026-11-04
- Bergantung pada: ADR 001

## Keputusan

Tidak ada tabel buku ketiga. Pihak, dompet, dan alokasi menempel pada `planner_finance_accounts` dan `planner_journal_lines`.

- Dompet adalah baris `planner_wallets` yang menunjuk akun `kas` yang sudah ada. Akun kas baru otomatis mendapat dompet.
- Jurnal hanya lewat `planner_post_journal`, satu transaksi. Baris yang tidak seimbang membatalkan seluruh simpanan.
- `UPDATE` dan `DELETE` jurnal ditolak. Koreksi adalah jurnal baru `reversal`.
- Saldo `current_balance` diisi trigger dari baris. Penulisan saldo dari klien ditolak. Saat migrasi, saldo diselaraskan dengan jumlah baris yang sudah ada. Akun yang saldonya tidak berasal dari jurnal menjadi nol.
- Debit, kredit, total jurnal, dan saldo akun menjadi `bigint` rupiah.
- Biaya proyek yang belum punya `journal_entry_id` dipindah sekali: debit laba, kredit kas proyek. Baris yang sudah tertaut tidak ditulis lagi.
- Lima template ada di `packages/domain/src/journal.ts`: biaya proyek, pemasukan, transfer dompet, bayar hutang, terima piutang.
- Hutang satu pihak di banyak proyek adalah jumlah `planner_journal_allocations`, tampil di `planner_v_party_debt`. Kas proyek tampil di `planner_v_project_cash`.

Klien `createJournalEntry` memanggil RPC itu dan tidak lagi menghapus jurnal saat gagal.

## Risiko

- Backfill mengurangi kas proyek sebesar biaya lama yang belum masuk jurnal.
- Deploy function harus tetap bisa mengimpor `packages/domain`.
- Fungsi backfill hanya jalan dari migrasi. Tidak diberikan ke peran `authenticated`.
