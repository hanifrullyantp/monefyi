# Demo data — Agustus 2026

Persona: karyawan gaji **Rp 5.000.000**, gajian **tgl 25**.

## Files

| File | Isi |
|------|-----|
| `transactions.json` | 30 transaksi expense, 1–7 Agt 2026 |
| `budget-2026-08.json` | Budget 12 kategori, total Rp 5 jt |
| `user-preferences.json` | Income, payday, fixed bills |

## Seed

```bash
# Preview (no changes)
npm run seed:demo-august -- --dry-run

# Apply — hapus SEMUA transaksi user, isi ulang Agustus + budget 2026-08
npm run seed:demo-august -- --confirm

# Optional: target user
export SEED_USER_EMAIL="you@example.com"
# or SEED_USER_ID=uuid

# With service role (REST API) instead of linked DB:
export SUPABASE_SERVICE_ROLE_KEY="..."
npm run seed:demo-august -- --confirm
```

Default mode tanpa `SUPABASE_SERVICE_ROLE_KEY`: pakai `supabase db query --linked` (butuh project linked + `my-supabase-project/.env` dengan access token).

## Setelah seed

IndexedDB masih cache data lama. **Logout → login** atau clear site data di browser, lalu buka periode **Agustus 2026**.

Angka yang **harus konsisten** (Agustus 2026, hari 1–7):

| Layar | Metrik | Nilai |
|-------|--------|-------|
| Transaksi | Saldo / net | **−Rp 2.539.000** |
| Transaksi | Pengeluaran periode | **−2,5 jt** (30 trx) |
| Budget hero | Realisasi | **Rp 2.539.000 / Rp 5.000.000** (~**51%**) |
| Budget | Sisa | **Rp 2.461.000** |
| Survive | Gajian tgl 25 | **18 hari** (≠ sisa bulan **24 hari** — beda definisi) |

Jika pengeluaran tampil ~**10 jt**, cache IndexedDB masih punya duplikat transaksi — wajib logout/login atau clear site data.

## Lihat di app

- **Beranda** — hero safe-to-spend, transaksi hari ini
- **Budget** — progress per kategori (Kost, Makan, Transport, dll.)
- **Transaksi** — list 30 baris Agustus
