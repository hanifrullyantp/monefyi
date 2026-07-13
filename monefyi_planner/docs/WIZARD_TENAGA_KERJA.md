# Wizard Modal "Tambah Tenaga Kerja"

Wizard 3-step menggantikan `LaborPlannerModal` di Tab RAP (Tenaga Kerja → `+ Tambah` / ikon kalender).

## Local URLs

```bash
cd monefyi_planner && npm run dev
```

| Resource | URL |
|----------|-----|
| Desktop preview | http://localhost:5173/preview-wizard-tenaga-desktop.html |
| Mobile preview | http://localhost:5173/preview-wizard-tenaga-mobile.html |
| Production entry | Tab RAP → Tenaga Kerja → `+ Tambah` |

## Kalender (Step 3)

- Dropdown **bulan** + **tahun** di header kalender
- Tombol panah kiri/kanan untuk bulan sebelumnya/berikutnya
- Mobile: swipe horizontal pada area kalender untuk ganti bulan
- Tanggal terpilih **tetap tersimpan** saat pindah bulan (lintas bulan didukung)

## Parity vs LaborPlannerModal (legacy)

| Feature | Status |
|---------|--------|
| Pilih karyawan HR | ✅ Step 1 |
| Tambah ke HR | ✅ |
| Jabatan + tarif | ✅ Step 2 |
| Planning / Realisasi | ✅ Step 3 |
| Detail per hari (½ hari, lembur) | ✅ |
| Import absensi | ✅ |
| Edit existing RAP item | ✅ |
| Save ke Supabase + sync budget | ✅ |

`LaborPlannerModal.tsx` di-deprecate; tidak lagi dipakai dari `TabV2Rap`.

## Manual Test Checklist

- [ ] Desktop: dropdown bulan/tahun, panah, drag-select, Ctrl+S
- [ ] Mobile: swipe bulan, tap tanggal, safe-area footer
- [ ] Pilih tanggal di bulan A, pindah ke bulan B, kembali — tanggal A masih terpilih
- [ ] Simpan → item muncul di RAP; reload halaman data persist
