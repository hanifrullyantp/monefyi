# Admin landing Froyek

Alamat kanonis panel adalah `https://froyek.com/admin`. Kunjungan ke `estimator.froyek.com/admin` dialihkan ke sana. Menu yang sudah ada tetap mengatur CRM, iklan, analitik, dan konten Estimator. Landing Froyek ada di `/admin/froyek`.

## Menerbitkan konten

1. Masuk dengan akun yang `profiles.role` bernilai `admin`.
2. Buka `/admin/froyek`.
3. Ubah section atau JSON. Tombol Urungkan mengembalikan draf di halaman itu.
4. Terbitkan. Server menolak JSON yang tidak lolos skema, lalu menyimpan slug `froyek` lewat edge `monefyi-landing-config`.

Mode edit di beranda (`Mode Edit` untuk admin) mengubah teks yang sama dan memakai tombol Terbitkan.

## Pembayaran

Wizard di `/pilih` membuat invoice lewat `POST /api/checkout/mayar` dengan `brand: "froyek"`. Harga dihitung ulang di server dari harga daftar di kode produk. Promo hanya berlaku jika ada di JSON yang sudah terbit dan nominalnya tidak lebih tinggi dari harga daftar.

Webhook `POST /api/webhook/mayar` yang sudah dipakai Estimator juga mengaktifkan langganan Froyek bila pesanan bertanda `brand: "froyek"`. Aktivasi membutuhkan `SUPABASE_SERVICE_ROLE_KEY` di lingkungan landing. Pengguna baru mendapat tautan atur kata sandi, bukan kata sandi bersama.

`MAYAR_API_KEY` dan `MAYAR_API_URL` mengikuti `.env.example`. Sandbox Mayar memakai `https://api.mayar.club`.

## Yang tidak diubah

Landing Estimator, checkout Estimator, dan aplikasi di `/app` tetap pada alurnya. Section urgensi Estimator tidak dihapus.
