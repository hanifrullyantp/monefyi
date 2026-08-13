import type { FAQItem } from '../types';

export const faqData: FAQItem[] = [
  // Umum
  { id: 'u1', category: 'Umum', question: 'Apa itu Monefyi?', answer: 'Monefyi adalah aplikasi keuangan personal yang membantu kamu tahu berapa uang yang aman dipakai setiap hari, memprediksi kapan saldo habis, dan memberi langkah konkret untuk keluar dari siklus gaji habis.' },
  { id: 'u2', category: 'Umum', question: 'Untuk siapa Monefyi cocok?', answer: 'Monefyi cocok untuk karyawan, freelancer, wirausaha, ibu rumah tangga — siapa saja yang ingin mengelola keuangan lebih cerdas tanpa ribet. Bahkan yang tidak pernah mencatat keuangan sebelumnya pun bisa langsung pakai.' },
  { id: 'u3', category: 'Umum', question: 'Apa bedanya Monefyi dengan aplikasi keuangan lain?', answer: 'Berbeda dari aplikasi lain yang hanya mencatat, Monefyi MEMBERITAHU kamu apa yang harus dilakukan. Fitur Safe to Spend menghitung otomatis berapa yang aman dipakai hari ini, dan Monevisor AI memberi insight personal setiap hari.' },
  { id: 'u4', category: 'Umum', question: 'Apakah Monefyi tersedia di iOS dan Android?', answer: 'Ya, Monefyi tersedia di App Store (iOS) dan Google Play Store (Android). Kamu juga bisa akses versi web melalui browser.' },
  
  // Fitur
  { id: 'f1', category: 'Fitur', question: 'Apa itu Safe to Spend?', answer: 'Safe to Spend adalah fitur unggulan Monefyi yang menghitung secara real-time berapa uang yang aman kamu belanjakan hari ini. Dihitung berdasarkan saldo, tagihan mendatang, hari hingga gajian, dan kebiasaan pengeluaranmu.' },
  { id: 'f2', category: 'Fitur', question: 'Apa itu Monevisor AI?', answer: 'Monevisor adalah AI financial coach personal kamu yang selalu monitoring kondisi keuangan dan memberikan peringatan dini, insight bulanan, serta rekomendasi aksi spesifik setiap harinya.' },
  { id: 'f3', category: 'Fitur', question: 'Apakah ada fitur budgeting?', answer: 'Ya! Monefyi mendukung berbagai metode budgeting: 50/30/20 (populer), 40/30/20/10 (Islami dengan alokasi sedekah), 70/20/10 (sederhana), atau custom sesuai keinginanmu.' },
  { id: 'f4', category: 'Fitur', question: 'Apakah ada fitur tracking hutang?', answer: 'Ada! Debt Freedom Planner membantu kamu menyusun strategi pelunasan hutang dengan metode Snowball (lunas terkecil dulu) atau Avalanche (lunas bunga tertinggi dulu), lengkap dengan visualisasi timeline bebas hutang.' },
  { id: 'f5', category: 'Fitur', question: 'Bisakah dipakai offline?', answer: 'Ya, Monefyi bisa dipakai dalam mode offline. Data akan tersinkronisasi otomatis ketika kembali online.' },
  
  // Keamanan
  { id: 'k1', category: 'Keamanan', question: 'Apakah data keuangan saya aman?', answer: 'Keamanan data adalah prioritas utama kami. Semua data dienkripsi dengan standar banking (AES-256). Data kamu tidak pernah dijual ke pihak ketiga. Kami tidak punya akses ke rekening bankmu.' },
  { id: 'k2', category: 'Keamanan', question: 'Apakah Monefyi terhubung ke rekening bank?', answer: 'Monefyi tidak memerlukan akses langsung ke rekening bankmu. Kamu input data manual atau impor dari mutasi rekening. Tidak ada risiko keamanan rekening.' },
  { id: 'k3', category: 'Keamanan', question: 'Di mana data saya disimpan?', answer: 'Data disimpan secara lokal di perangkatmu dan ter-backup di cloud yang terenkripsi. Hanya kamu yang bisa mengakses datamu.' },
  
  // Harga
  { id: 'h1', category: 'Harga', question: 'Berapa harga Monefyi?', answer: 'Ada tiga pilihan: Trial Gratis (7 hari, fitur dasar), Lifetime Rp 99.000 (sekali bayar, akses selamanya + bonus 4 apps), dan Pro+ Rp 250.000/tahun (fitur premium lengkap).' },
  { id: 'h2', category: 'Harga', question: 'Apa yang termasuk dalam paket Lifetime?', answer: 'Paket Lifetime Rp 99.000 mencakup: Akses semua fitur selamanya, update gratis selamanya, 4 bonus aplikasi keuangan (senilai Rp 796.000) dan prioritas support.' },
  { id: 'h3', category: 'Harga', question: 'Ada garansi uang kembali?', answer: 'Ya! Kami memberikan garansi 7 hari uang kembali 100%. Jika dalam 7 hari kamu tidak puas karena alasan apapun, kami kembalikan penuh tanpa pertanyaan.' },
  { id: 'h4', category: 'Harga', question: 'Apakah ada diskon untuk pasangan/keluarga?', answer: 'Ya! Couple Pack tersedia dengan harga Rp 149.000 untuk 2 akun (hemat 25%). Cocok untuk pasangan yang ingin kelola keuangan bersama.' },
  
  // Bonus Apps
  { id: 'b1', category: 'Bonus', question: 'Apa saja 4 bonus aplikasi yang didapat?', answer: 'Kamu mendapat: (1) Kalkulator Bagi Hasil Mudharabah & Musyarakah, (2) Kalkulator Gaji & PPh21 TER, (3) Debt Freedom Planner, (4) Budget Planner — total senilai Rp 796.000, GRATIS!' },
  { id: 'b2', category: 'Bonus', question: 'Apakah bonus apps bisa langsung dicoba?', answer: 'Ya! Semua 4 bonus apps bisa langsung kamu coba GRATIS di halaman ini sekarang, tanpa perlu daftar atau beli apapun. Klik "Coba Sekarang" di card masing-masing aplikasi.' },
  { id: 'b3', category: 'Bonus', question: 'Apa itu kalkulator bagi hasil?', answer: 'Kalkulator Bagi Hasil membantu menghitung distribusi keuntungan usaha sesuai prinsip Islam — Mudharabah (modal dari satu pihak) dan Musyarakah (modal dari beberapa pihak). Lengkap dengan dalil syari dan skenario analisis.' },
  
  // Teknis
  { id: 't1', category: 'Teknis', question: 'Apa persyaratan minimum perangkat?', answer: 'iOS 14+ atau Android 8.0+. RAM minimum 2GB. Storage 50MB. Koneksi internet untuk sinkronisasi (bisa offline untuk input).' },
  { id: 't2', category: 'Teknis', question: 'Bagaimana cara mulai menggunakan Monefyi?', answer: 'Sangat mudah: (1) Download app, (2) Input gaji dan tanggal gajian, (3) Input tagihan tetap, (4) Mulai catat pengeluaran. Selesai! Safe to Spend akan langsung aktif.' },
  { id: 't3', category: 'Teknis', question: 'Apakah ada mode untuk pasangan/suami istri?', answer: 'Ya! Couple Mode memungkinkan dua orang berbagi satu dashboard keuangan bersama, dengan privasi masing-masing tetap terjaga untuk pengeluaran personal.' },
  { id: 't4', category: 'Teknis', question: 'Bagaimana cara menghubungi support?', answer: 'Kamu bisa menghubungi kami via WhatsApp (respon < 1 jam), Email support@monefyi.com, atau live chat di dalam app. Tim support tersedia Senin-Sabtu 08.00-22.00 WIB.' },
  { id: 't5', category: 'Teknis', question: 'Apakah Monefyi akan terus diupdate?', answer: 'Ya! Kami berkomitmen update rutin setiap 2 minggu dengan fitur baru, perbaikan bug, dan peningkatan performa. Pengguna Lifetime mendapat semua update gratis selamanya.' },
  { id: 't6', category: 'Teknis', question: 'Bisakah saya export data keuangan saya?', answer: 'Ya, kamu bisa export data dalam format Excel atau PDF kapanpun. Data 100% milikmu dan bisa diunduh setiap saat.' },
];

export const faqCategories = ['Semua', 'Umum', 'Fitur', 'Keamanan', 'Harga', 'Bonus', 'Teknis'];
