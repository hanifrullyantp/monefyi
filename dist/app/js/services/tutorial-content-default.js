/**
 * Default tutorial content.
 * Used as fallback when DB is not seeded.
 * Admin can override each step via database (including media_url).
 * Article ids are composite: `${categoryId}/${shortId}`.
 */

export const TUTORIAL_STRUCTURE = [
  {
    id: 'getting-started',
    title: 'Memulai',
    icon: 'rocket',
    description: 'Langkah pertama menggunakan Monefyi',
    articles: [
      {
        id: 'getting-started/welcome',
        title: 'Selamat Datang di Monefyi',
        steps: [
          { text: 'Apa itu Monefyi dan apa yang bisa dilakukan' },
          { text: 'Navigasi utama: Beranda, Transaksi, Budget, Monevisor' },
          { text: 'Install ke homescreen untuk pengalaman terbaik' },
        ],
      },
      {
        id: 'getting-started/first-setup',
        title: 'Setup Pertama Kali',
        steps: [
          { text: 'Set income bulanan' },
          { text: 'Buat akun keuangan (Cash, Bank, E-wallet)' },
          { text: 'Buat budget pertama (atau generate otomatis)' },
        ],
      },
      {
        id: 'getting-started/install-pwa',
        title: 'Install Monefyi di HP',
        steps: [
          { text: 'Android: Tap "Install" atau "Add to Home Screen"' },
          { text: 'iOS: Tap Share → "Add to Home Screen"' },
          { text: 'Desktop: Klik icon install di address bar' },
        ],
      },
    ],
  },
  {
    id: 'transactions',
    title: 'Transaksi',
    icon: 'list',
    description: 'Cara mencatat dan mengelola transaksi',
    articles: [
      {
        id: 'transactions/add-transaction',
        title: 'Tambah Transaksi',
        steps: [
          { text: 'Klik tombol hijau (+) di tengah bawah' },
          { text: 'Pilih "Input Teks Bebas" untuk input cepat' },
          { text: 'Ketik natural: "makan siang 50rb gopay"' },
          { text: 'Parser otomatis mendeteksi: jumlah, kategori, akun' },
          { text: 'Review preview, edit jika perlu, lalu "Simpan"' },
        ],
      },
      {
        id: 'transactions/quick-text',
        title: 'Input Teks Cepat (Parser)',
        steps: [
          { text: 'Ketik seperti chat: "bensin 150rb bca"' },
          { text: 'Parser memahami: rb=ribu, jt=juta, k=ribu' },
          { text: 'Akun otomatis: gopay, bca, mandiri, ovo, dana, cash' },
          { text: 'Kategori otomatis: makan→Food, bensin→Transport' },
          { text: 'Tips: semakin sering pakai, semakin akurat (learning)' },
        ],
      },
      {
        id: 'transactions/scan-receipt',
        title: 'Scan Struk Belanja (OCR)',
        steps: [
          { text: 'Klik icon kamera di input transaksi' },
          { text: 'Foto struk atau upload gambar' },
          { text: 'Tunggu OCR memproses (5-15 detik)' },
          { text: 'Review hasil: total, merchant, tanggal' },
          { text: 'Edit jika perlu, lalu "Simpan"' },
          { text: 'Tips: foto yang jelas & terang = hasil lebih akurat' },
        ],
      },
      {
        id: 'transactions/edit-delete',
        title: 'Edit & Hapus Transaksi',
        steps: [
          { text: 'Tap transaksi di list untuk buka detail' },
          { text: 'Lihat insight: tren kategori, budget progress' },
          { text: 'Edit field yang perlu diubah' },
          { text: 'Hapus: tekan "Hapus Transaksi" (bisa di-undo 5 detik)' },
        ],
      },
      {
        id: 'transactions/transaction-insight',
        title: 'Insight Per Transaksi',
        steps: [
          { text: 'Setiap transaksi punya insight otomatis' },
          { text: 'Tren kategori: grafik 6 bulan pengeluaran kategori ini' },
          { text: 'Budget progress: sudah berapa % terpakai' },
          { text: 'Perbandingan vs rata-rata 3 bulan' },
          { text: 'Ranking: transaksi ini ke-berapa terbesar bulan ini' },
        ],
      },
    ],
  },
  {
    id: 'budgeting',
    title: 'Budgeting',
    icon: 'target',
    description: '5 pilar budgeting: Planning, Priority, Realisasi, Evaluasi, Rekomendasi',
    articles: [
      {
        id: 'budgeting/budget-overview',
        title: 'Mengenal Budget Monefyi',
        steps: [
          { text: '5 pilar: Planning, Priority, Realisasi, Evaluasi, Rekomendasi' },
          { text: '4 level prioritas: Harus, Penting, Mau, Simpan' },
          { text: 'Budget otomatis terhubung dengan transaksi' },
          { text: 'Real-time tracking: sisa budget per hari' },
        ],
      },
      {
        id: 'budgeting/create-budget',
        title: 'Buat Budget Baru',
        steps: [
          { text: 'Tab Budget → Klik "Tambah Budget"' },
          { text: 'Pilih prioritas (Harus/Penting/Mau/Simpan)' },
          { text: 'Isi nama kategori' },
          { text: 'Tambah item detail: nama, qty, harga, tanggal target' },
          { text: 'Atur auto-link keywords agar transaksi otomatis masuk' },
          { text: 'Simpan' },
        ],
      },
      {
        id: 'budgeting/auto-generate',
        title: 'Generate Budget Otomatis',
        steps: [
          { text: 'Klik "Generate Budget Otomatis" di halaman Budget' },
          { text: 'Sistem pilih strategi terbaik:' },
          { text: '- User baru: aturan 50/30/20' },
          { text: '- Ada data bulan lalu: copy + improve' },
          { text: '- Data 3+ bulan: AI-optimized' },
          { text: 'Preview hasil, lalu "Terapkan"' },
        ],
      },
      {
        id: 'budgeting/priority-system',
        title: 'Sistem Prioritas (Harus/Penting/Mau/Simpan)',
        steps: [
          { text: 'HARUS: tidak bisa ditunda (listrik, cicilan)' },
          { text: 'PENTING: kebutuhan pokok (makan, transport)' },
          { text: 'MAU: bisa ditunda (hiburan, jajan)' },
          { text: 'SIMPAN: tabungan & investasi' },
          { text: 'Ideal: Harus+Penting 60-75%, Mau 10-20%, Simpan 15-30%' },
        ],
      },
      {
        id: 'budgeting/budget-tracking',
        title: 'Tracking Realisasi Budget',
        steps: [
          { text: 'Setiap transaksi otomatis masuk ke budget via auto-link' },
          { text: 'Progress bar menunjukkan % terpakai real-time' },
          { text: 'Sisa budget per hari dihitung otomatis' },
          { text: 'Warning saat mendekati limit (75%, 90%, 100%)' },
          { text: 'Notifikasi push jika over budget' },
        ],
      },
      {
        id: 'budgeting/budget-evaluation',
        title: 'Evaluasi Bulanan',
        steps: [
          { text: 'Klik "Evaluasi Bulan" di halaman Budget' },
          { text: 'Health score: 0-100 berdasarkan realisasi vs plan' },
          { text: 'Breakdown per prioritas' },
          { text: 'Perbandingan vs bulan lalu' },
          { text: 'Action plan dari Monevisor' },
        ],
      },
    ],
  },
  {
    id: 'monevisor',
    title: 'Monevisor (AI Coach)',
    icon: 'sparkles',
    description: 'Asisten keuangan AI pribadi kamu',
    articles: [
      {
        id: 'monevisor/monevisor-overview',
        title: 'Apa itu Monevisor?',
        steps: [
          { text: 'Monevisor = financial coach pribadi berbasis AI' },
          { text: 'Menganalisis data transaksi & budget kamu' },
          { text: 'Memberikan diagnosa, benchmark, action plan' },
          { text: 'Bisa ditanya lewat chat' },
        ],
      },
      {
        id: 'monevisor/financial-report',
        title: 'Laporan Keuangan',
        steps: [
          { text: 'Tab Advisor → lihat laporan otomatis' },
          { text: 'Metrics: Income, Expense, Net, Saving Rate' },
          { text: 'Diagnosa: Cash Flow, Tabungan, Budget, Kategori' },
          { text: 'Benchmark: posisi kamu vs standar keuangan' },
          { text: 'Proyeksi: jika pola berlanjut, ini yang terjadi' },
        ],
      },
      {
        id: 'monevisor/ai-chat',
        title: 'Chat dengan Monevisor',
        steps: [
          { text: 'Scroll ke bawah → "Tanya Monevisor AI"' },
          { text: 'Ketik pertanyaan: "Kenapa saving rate rendah?"' },
          { text: 'Monevisor jawab berdasarkan data kamu' },
          { text: 'Bisa follow-up bertanya lebih dalam' },
          { text: 'Tips: tanya hal spesifik untuk jawaban lebih akurat' },
        ],
      },
      {
        id: 'monevisor/health-score',
        title: 'Health Score',
        steps: [
          { text: 'Skor 0-100 menunjukkan kesehatan keuangan' },
          { text: 'Faktor: Cash Flow, Budget Adherence, Kategori, Saving' },
          { text: '80+: Excellent | 65+: Good | 45+: Fair | <45: Poor' },
          { text: 'Tips: ikuti action plan untuk naikkan skor' },
        ],
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Akun & Saldo',
    icon: 'wallet',
    description: 'Kelola akun keuangan kamu',
    articles: [
      {
        id: 'accounts/manage-accounts',
        title: 'Kelola Akun',
        steps: [
          { text: 'Beranda → Lihat card akun di baris kedua' },
          { text: 'Tap akun untuk lihat detail' },
          { text: 'Tambah akun baru: Bank, E-wallet, Cash' },
          { text: 'Setiap akun punya saldo & riwayat transaksi' },
        ],
      },
      {
        id: 'accounts/income-sources',
        title: 'Kelola Income',
        steps: [
          { text: 'Budget → tap "Kelola Income"' },
          { text: 'Tambah sumber income: Gaji, Freelance, Investasi, dll' },
          { text: 'Set nominal per sumber' },
          { text: 'Total income jadi dasar budgeting' },
        ],
      },
    ],
  },
  {
    id: 'ocr',
    title: 'Scan Struk (OCR)',
    icon: 'camera',
    description: 'Scan struk belanja otomatis',
    articles: [
      {
        id: 'ocr/how-ocr-works',
        title: 'Cara Kerja OCR',
        steps: [
          { text: 'Monefyi menggunakan Tesseract.js (offline, gratis)' },
          { text: 'Pertama kali scan: proses generic' },
          { text: 'Setelah koreksi: sistem belajar template' },
          { text: 'Scan berikutnya dari merchant sama: lebih cepat & akurat' },
          { text: 'Template bisa dibagikan ke komunitas' },
        ],
      },
      {
        id: 'ocr/tips-photo',
        title: 'Tips Foto Struk Terbaik',
        steps: [
          { text: 'Pencahayaan terang (hindari bayangan)' },
          { text: 'Struk rata & lurus (tidak miring/lipat)' },
          { text: 'Fokus tajam (tidak buram)' },
          { text: 'Background kontras (tangan/meja)' },
          { text: 'Foto dari atas, bukan miring' },
        ],
      },
    ],
  },
  {
    id: 'email-import',
    title: 'Email Import',
    icon: 'mail',
    description: 'Auto-import transaksi dari email bank',
    articles: [
      {
        id: 'email-import/setup-email',
        title: 'Setup Email Auto-Import',
        steps: [
          { text: 'Pengaturan → Email Import → Aktifkan' },
          { text: 'Copy alamat import unik kamu' },
          { text: 'Buat filter di Gmail/Outlook' },
          { text: 'Forward email dari bank ke alamat tersebut' },
          { text: 'Setelah setup: semua otomatis!' },
        ],
      },
      {
        id: 'email-import/supported-banks',
        title: 'Bank yang Didukung',
        steps: [
          { text: 'BCA, Mandiri, BNI, BRI' },
          { text: 'GoPay, OVO, DANA, ShopeePay, LinkAja' },
          { text: 'Tokopedia, Shopee, Grab (receipt)' },
          { text: 'Generic: email apapun dengan format Rp' },
        ],
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifikasi',
    icon: 'bell',
    description: 'Pengingat & peringatan cerdas',
    articles: [
      {
        id: 'notifications/notification-types',
        title: 'Jenis Notifikasi',
        steps: [
          { text: 'Morning Briefing: ringkasan budget harian' },
          { text: 'Bill Reminder: pengingat tagihan H-3, H-1, H' },
          { text: 'Spending Alert: peringatan pengeluaran besar' },
          { text: 'Budget Milestone: 75%, 90%, 100% terpakai' },
          { text: 'Weekly Recap: ringkasan mingguan' },
          { text: 'Achievement: pencapaian & streak' },
        ],
      },
      {
        id: 'notifications/notification-settings',
        title: 'Atur Notifikasi',
        steps: [
          { text: 'Pengaturan → Notifikasi' },
          { text: 'Toggle per jenis notifikasi' },
          { text: 'Set jam tenang (default 22:00-07:00)' },
          { text: 'Batas harian (default 5 notif/hari)' },
        ],
      },
    ],
  },
  {
    id: 'offline',
    title: 'Mode Offline',
    icon: 'wifiOff',
    description: 'Gunakan Monefyi tanpa internet',
    articles: [
      {
        id: 'offline/offline-features',
        title: 'Fitur yang Jalan Offline',
        steps: [
          { text: 'Semua fitur utama jalan tanpa internet' },
          { text: 'Tambah/edit/hapus transaksi' },
          { text: 'Lihat dashboard & budget' },
          { text: 'Scan struk (OCR lokal)' },
          { text: 'Parser teks cepat' },
          { text: 'Data otomatis sync saat online kembali' },
        ],
      },
      {
        id: 'offline/pending-queue',
        title: 'Antrian Pending',
        steps: [
          { text: 'Input yang butuh AI → disimpan sebagai pending' },
          { text: 'Badge menunjukkan jumlah pending' },
          { text: 'Otomatis diproses saat online' },
          { text: 'Bisa review, retry, atau hapus manual' },
        ],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Pengaturan',
    icon: 'settings',
    description: 'Konfigurasi aplikasi',
    articles: [
      {
        id: 'settings/general-settings',
        title: 'Pengaturan Umum',
        steps: [
          { text: 'Bahasa: Indonesia / English' },
          { text: 'Mata uang: IDR (default)' },
          { text: 'Tema: Dark mode (default)' },
          { text: 'Notifikasi: on/off per jenis' },
        ],
      },
      {
        id: 'settings/data-export',
        title: 'Export Data',
        steps: [
          { text: 'Pengaturan → Export' },
          { text: 'Pilih format: CSV atau PDF' },
          { text: 'Pilih periode' },
          { text: 'Download file' },
        ],
      },
      {
        id: 'settings/account-security',
        title: 'Keamanan Akun',
        steps: [
          { text: 'Ganti password' },
          { text: 'Data tersimpan aman di Supabase' },
          { text: 'Offline data di-encrypt di IndexedDB' },
          { text: 'Hapus akun: semua data dihapus permanen' },
        ],
      },
    ],
  },
  {
    id: 'tips',
    title: 'Tips Keuangan',
    icon: 'lightBulb',
    description: 'Tips praktis mengelola keuangan',
    articles: [
      {
        id: 'tips/rule-50-30-20',
        title: 'Aturan 50/30/20',
        steps: [
          { text: '50% untuk kebutuhan (Harus + Penting)' },
          { text: '30% untuk keinginan (Mau)' },
          { text: '20% untuk tabungan & investasi (Simpan)' },
          { text: 'Monefyi otomatis tracking % ini via prioritas budget' },
        ],
      },
      {
        id: 'tips/emergency-fund',
        title: 'Dana Darurat',
        steps: [
          { text: 'Ideal: 3-6 bulan pengeluaran' },
          { text: 'Contoh: pengeluaran Rp 5jt/bulan → dana darurat Rp 15-30jt' },
          { text: 'Mulai dari 1 bulan, tingkatkan bertahap' },
          { text: 'Gunakan kategori "Simpan" di budget' },
        ],
      },
      {
        id: 'tips/track-everything',
        title: 'Catat Semua Pengeluaran',
        steps: [
          { text: 'Sekecil apapun, catat (Rp 5.000 parkir pun)' },
          { text: '"Bocor halus" bisa Rp 500rb+/bulan tanpa sadar' },
          { text: 'Gunakan quick text: "parkir 5rb"' },
          { text: 'Atau scan struk setiap belanja' },
          { text: 'Konsistensi = insight yang akurat' },
        ],
      },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: 'helpCircle',
    description: 'Pertanyaan yang sering ditanyakan',
    articles: [
      {
        id: 'faq/faq-data-safety',
        title: 'Apakah data saya aman?',
        steps: [
          { text: 'Data disimpan di Supabase (infrastruktur enterprise)' },
          { text: 'Enkripsi saat transit (HTTPS) dan at-rest' },
          { text: 'Offline data di IndexedDB browser (local)' },
          { text: 'OCR diproses di browser, tidak di-upload ke server' },
          { text: 'Email import: raw email dihapus otomatis setelah 7 hari' },
        ],
      },
      {
        id: 'faq/faq-subscription',
        title: 'Bagaimana cara berlangganan?',
        steps: [
          { text: 'Trial: gratis 7 hari, daftar dengan email' },
          { text: 'Monthly: Rp 49rb/bulan via Lynk.id' },
          { text: 'Lifetime: Rp 499rb sekali bayar, akses selamanya' },
          { text: 'Pembayaran aman via Lynk.id' },
        ],
      },
      {
        id: 'faq/faq-offline',
        title: 'Bisa dipakai tanpa internet?',
        steps: [
          { text: 'Ya! Setelah login pertama, semua fitur utama jalan offline' },
          { text: 'Data tersimpan lokal di device' },
          { text: 'Sync otomatis saat online kembali' },
          { text: 'Hanya AI chat & email import butuh internet' },
        ],
      },
      {
        id: 'faq/faq-multidevice',
        title: 'Bisa dipakai di banyak device?',
        steps: [
          { text: 'Ya! Login di HP, tablet, dan desktop' },
          { text: 'Data sync otomatis antar device' },
          { text: 'Offline changes merge saat online' },
        ],
      },
    ],
  },
];

/**
 * Flatten structure for admin seed / list views.
 * @returns {{ categories: object[], articles: object[], steps: object[] }}
 */
export function flattenTutorialStructure(structure = TUTORIAL_STRUCTURE) {
  const categories = [];
  const articles = [];
  const steps = [];

  structure.forEach((cat, catIdx) => {
    categories.push({
      id: cat.id,
      title: cat.title,
      description: cat.description || '',
      icon: cat.icon || 'helpCircle',
      sort_order: catIdx,
      is_published: true,
    });

    (cat.articles || []).forEach((article, artIdx) => {
      articles.push({
        id: article.id,
        category_id: cat.id,
        title: article.title,
        description: article.description || '',
        sort_order: artIdx,
        is_published: true,
      });

      (article.steps || []).forEach((step, stepIdx) => {
        const stepId = `${article.id}/${stepIdx}`;
        steps.push({
          id: stepId,
          category_id: cat.id,
          article_id: article.id,
          step_index: stepIdx,
          text_content: step.text,
          media_url: step.media_url || null,
          media_type: step.media_type || null,
          media_alt: step.media_alt || null,
          is_published: true,
          sort_order: stepIdx,
        });
      });
    });
  });

  return { categories, articles, steps };
}

if (typeof window !== 'undefined') {
  window.monefyiTutorialDefaults = { TUTORIAL_STRUCTURE, flattenTutorialStructure };
}
