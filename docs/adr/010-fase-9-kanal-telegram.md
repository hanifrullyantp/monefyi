# ADR 010 — Fase 9: kanal Telegram

- Status: diterapkan dan dideploy ke project Planner
- Tanggal: 2026-11-05

## Keputusan

Gateway kanal hanya menerjemahkan. Kecerdasan tetap di SOP `minta_update_progres_lapangan`, profil perusahaan, dan mesin alur. `ChannelProvider` punya `send`, `parseUpdate`, dan `status`. Implementasi sekarang `telegram` lewat Bot API resmi. `whatsapp_cloud` menyusul sebagai penyedia lain. Tes menukar penyedia ke `mock` tanpa mengubah `deliver`.

`tg-webhook` menolak permintaan sebelum membaca badan bila header `X-Telegram-Bot-Api-Secret-Token` tidak cocok. `update_id` masuk `planner_channel_inbox`. Duplikat dibalas 200 dan tidak diproses lagi. Respons 200 dikirim sebelum kerja agen, lewat `EdgeRuntime.waitUntil` bila ada.

Identitas hanya lahir dari kode sekali pakai yang kedaluwarsa dalam 10 menit. Peran dan organisasi diisi dari keanggotaan peminta kode. Isi pesan adalah data. Kalimat seperti "abaikan instruksi sebelumnya" tidak memanggil `routeRequest` dan tidak memindahkan SOP. Pengguna yang belum menautkan diri dicatat di `planner_channel_messages` dan tidak diteruskan ke agen. Tanpa pertanyaan lapangan yang sedang terbuka, pesan yang sudah tertaut juga hanya dicatat.

Jam tanya, batas balasan, dan penanggung jawab per proyek dibaca dari profil (`jam_tanya_progres`, `batas_balasan_menit`, `projectLeads`). Tidak ada angka bawaan di penjadwal. Tahap selesai tanpa foto tetap di langkah yang sama. Jawaban yang sah menjadi draf `prepare_progress_update` di antrean aplikasi. Chat tidak memanggil commit. Perubahan di atas ambang `update_progress` (batas rupiah 0 untuk peran itu) masuk antrean pemilik. Tidak ada balasan sampai batas profil: satu pengingat, lalu notifikasi pemilik.

Token bot disegel AES-GCM dengan `CHANNEL_SECRET_KEY` dan disimpan sebagai ciphertext. Klien hanya mengirim token sekali ke `tg-secret`, lalu bidangnya dikosongkan. Log melewati `redactSecrets`. Service role dipakai webhook setelah secret cocok, karena Telegram tidak membawa JWT pengguna.

Foto dan voice disimpan di bucket `planner-field-media` pada jalur organisasi, proyek, dan tanggal. Transkrip voice diisi bila `TRANSCRIBE_URL` ada. Tool kirim kanal tidak masuk registry 8 tool.

## Konfigurasi server

- `TELEGRAM_WEBHOOK_SECRET` — secret webhook Telegram, bukan token bot.
- `CHANNEL_SECRET_KEY` — kunci enkripsi token bot.
- `TRANSCRIBE_URL` — opsional.
- `planner_channel_config.dispatch_secret` dibuat migrasi. `tg-dispatch` membandingkan header dengan nilai itu. Job `planner-channel-dispatch` berjalan tiap jam.

## Batas

Tombol setujui di beranda mencatat status draf. Penulis progres ke pekerjaan belum dijalankan dari chat maupun dari tombol itu. Salinan modul kanal di `supabase/functions/_shared/channel` harus mengikuti `agent-core/src` karena bundler edge menolak impor di luar folder functions.
