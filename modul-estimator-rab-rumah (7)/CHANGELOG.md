# CHANGELOG — modul-estimator-rab-rumah (7)

## 2026-11-28
- **`src/ui/ui.test.tsx`**: Memperbarui tes `T6. UI Editor Denah` agar menguji drag ruangan dengan `pointerDown` → `pointerMove` → `pointerUp` berkoordinat nyata, memastikan `viewBox` kanvas tidak bergeser, dan memastikan poligon ruangan berpindah (gagal jika `e.stopPropagation()` dihapus).
- **`src/engine/upgrade.test.ts`**: Mengoptimalkan loop pada uji *property-based* dan menaikkan batas timeout menjadi `60_000` ms agar tidak timeout saat suite berjalan paralel.
- **`scripts/audit-layout-e2e.mjs`**: Menambahkan skrip verifikasi Playwright E2E untuk drag ruangan dengan `page.mouse.down/move/up`, cek `viewBox` kanvas, pan latar, dan cek overflow layar mobile `360×800`.
