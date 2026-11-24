# OPEN QUESTIONS — Pertanyaan Terbuka untuk Pemilik

Daftar pertanyaan bisnis/akuntansi untuk diputuskan pemilik sebelum atau saat memasuki fase berikutnya (F1–F4).

---

## Q-01 — Ambang Kapitalisasi Aset Tetap (Menjelang F1 & F3)
- **Konteks:** Pengeluaran bisnis non-proyek seperti `"beli keramik perbaikan workshop"` masuk ke Beban Operasional (perawatan), namun pembelian bernilai besar atau berumur panjang (misalnya mesin/peralatan bengkel) perlu dikapitalisasi sebagai **Aset Tetap** bila nilainya di atas ambang kapitalisasi.
- **Pertanyaan:** Berapa nilai rupiah minimum (**ambang kapitalisasi**) di mana sistem/AI harus menanyakan atau menyarankan pencatatan sebagai **Aset Tetap** alih-alih Beban Operasional? (Usulan default: Rp 2.500.000 atau Rp 5.000.000 per item).

## Q-02 — Mode Default Dividen Organisasi (Menjelang F1 & F2)
- **Konteks:** Pemilik dapat memilih mode dividen **per PROYEK** (langsung ke investor/pihak proyek setelah proyek bersih) atau **per BISNIS** (profit dikumpulkan di Laba Ditahan lalu dibagi per periode).
- **Pertanyaan:** Untuk organisasi baru, mode mana yang sebaiknya menjadi default (`per_bisnis` vs `per_proyek`), dan apakah satu organisasi boleh mencampur proyek tertentu dengan mode berbeda atau wajib satu mode per organisasi?

## Q-03 — Kebijakan Cadangan Kas / Opex Sebelum Pembagian Dividen (Menjelang F2)
- **Konteks:** Dividen dibatasi oleh kas tersedia dan cadangan opex.
- **Pertanyaan:** Berapa bulan cadangan opex yang harus ditahan secara default sebelum dividen boleh dibagikan (mis. `1 ×` atau `2 ×` rata-rata rencana opex bulanan, atau diisi manual oleh pemilik)?

## Q-04 — Nasib `finance_version` (`v1`, `v2`, `v3`) & Data Historis `total_spent` / `total_received` (Menjelang F1)
- **Konteks:** Saat ini masih ada referensi `finance_version` (`v1`, `v2`, `v3`) di tipe & pengaturan migrasi, serta kolom turunan `total_spent` / `total_received` di `planner_projects`.
- **Pertanyaan:** Pada F1 saat `financeV1` dipensiunkan sebagai penghitung (hanya tata letaknya yang dipakai di F2), apakah kita mengunci seluruh organisasi ke satu jalur `financeV2` saja tanpa toggle `v1`?

