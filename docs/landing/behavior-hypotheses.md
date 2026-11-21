# Hipotesis perilaku — landing Froyek

Satu section, satu tujuan, satu metrik. Angka hasil tidak diisi di sini; metrik diukur dari event di admin analitik.

| Section | Tujuan perilaku | Metrik |
| --- | --- | --- |
| announcement | Pengunjung membaca satu pengumuman yang benar, lalu lanjut | `cta_click` dengan `section=announcement` |
| navbar | Satu pintu masuk: mulai pilih paket, atau buka aplikasi jika sudah masuk | `cta_click` `section=navbar` |
| hero | Pengunjung memahami hasil (proyek lebih terbaca) dan memulai satu langkah | `cta_click` `section=hero` plus varian A/B |
| problem | Pengunjung mengenali situasi kerjanya sendiri | `section_view` `section=problem` |
| beforeAfter | Pengunjung melihat perbedaan cara kerja, tanpa janji palsu | `section_view` `section=beforeAfter` |
| demo | Pengunjung mencoba contoh percakapan sampai selesai | `demo_started` lalu `demo_completed` |
| features | Pengunjung tahu batas paket sebelum memilih | `section_view` `section=features` |
| calculator | Pengunjung menghitung biaya dari angkanya sendiri | `calculator_used` |
| personas | Pengunjung menemukan peran yang mirip pekerjaannya | `section_view` `section=personas` |
| proof | Hanya bukti yang diisi admin yang tampil | `section_view` `section=proof` (section sembunyi jika kosong) |
| steps | Pengunjung tahu ada tiga langkah, lalu mau mencoba wizard | `cta_click` `section=steps` |
| trust | Pengunjung melihat batas keamanan yang memang ada | `section_view` `section=trust` |
| comparison | Pengunjung membandingkan dengan spreadsheet dan chat, tanpa merek lawan | `section_view` `section=comparison` |
| pricing | Pengunjung memilih paket atau meminta bantuan memilih | `cta_click` `section=pricing` atau `checkout_started` |
| faq | Keberatan terjawab tanpa meninggalkan halaman | `section_view` `section=faq` |
| finalCta | Pengunjung yang sudah di ujung halaman memulai wizard | `cta_click` `section=finalCta` |
| footer | Jalan ke login, aplikasi, atau bantuan tetap ada | `cta_click` `section=footer` |
| wizard | Satu jawaban per layar sampai pembayaran atau berhenti sadar | `wizard_step_viewed` / `wizard_step_answered` / `wizard_abandoned` |
| toast | Satu bantuan kontekstual, bisa ditutup, tidak mengganggu wizard | `toast_shown` / `toast_dismissed` / `toast_clicked` |

Aturan yang dipakai di antarmuka:

- Satu ajakan utama per layar.
- Bukti sosial, logo, dan angka yang belum ada ditulis `[ISI DI ADMIN]` dan section disembunyikan.
- Kalkulator hanya menjumlahkan masukan pengunjung.
- Demo berlabel contoh, bukan agen produksi.
- Niat keluar menawarkan bantuan, bukan diskon.
- Toast marketing paling banyak satu, dan tidak muncul di `/pilih`.
