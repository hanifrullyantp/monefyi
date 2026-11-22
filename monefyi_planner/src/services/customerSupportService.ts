export interface CSMessage {
  id: string;
  sender: 'user' | 'cs';
  text: string;
  timestamp: Date;
  suggestedActions?: {
    label: string;
    action: 'ask' | 'link_whatsapp' | 'link_upgrade' | 'navigate' | 'escalate_telegram';
    payload: string;
  }[];
}

export const CS_AGENT_PROFILE = {
  name: 'Mbak Esti',
  title: 'Customer Concierge & Support Froyek',
  avatar: '👩‍💼',
  badge: 'Orang Rumah Froyek',
  status: 'Online Siap Membantu',
  greeting:
    'Halo Mas/Mbak! Saya Esti dari Froyek. Anggap aja rumah sendiri ya 😊 Mau tanya seputar akun/password, cara pakai aplikasi, pengelolaan proyek, atau paket langganan? Esti siap pandu santai sampai beres!',
};

export const POPULAR_CS_QUESTIONS = [
  'Bagaimana cara ganti password?',
  'Cara kirim PDF penawaran berlogo sendiri?',
  'Apa bedanya paket Standard vs Pro?',
  'Bagaimana cara undang mandor & tim lapangan?',
  'Hubungkan saya ke WhatsApp Support',
];

export function getCustomerSupportReply(
  query: string,
  options?: { allowEstimatorInfo?: boolean },
): {
  text: string;
  suggestedActions?: {
    label: string;
    action: 'ask' | 'link_whatsapp' | 'link_upgrade' | 'navigate' | 'escalate_telegram';
    payload: string;
  }[];
} {
  const q = query.toLowerCase().trim();
  const allowEstimatorInfo = options?.allowEstimatorInfo ?? false;

  // 1. Ganti Password, Lupa Sandi, & Keamanan Akun
  if (
    /\b(password|sandi|kata sandi|pass)\b/i.test(q) ||
    q.includes('ganti password') ||
    q.includes('ubah password') ||
    q.includes('lupa password') ||
    q.includes('reset password') ||
    q.includes('ganti kata sandi')
  ) {
    return {
      text: `Bisa banget Mas/Mbak! Untuk urusan **password / kata sandi**, caranya ada dua tergantung kondisi Anda:\n\n🔑 **Jika Anda Sedang Login di Aplikasi:**\n1. Buka menu **Pengaturan (Settings)** di menu samping/bawah.\n2. Pilih tab **Profil / Akun** (atau klik ikon profil Anda).\n3. Cari bagian **Keamanan & Kata Sandi**, lalu klik **Ubah Password**.\n4. Masukkan password lama, lalu ketik password baru (minimal 8 karakter) dan klik **Simpan**.\n\n❓ **Jika Anda Lupa Password Saat Mau Login:**\n1. Di halaman login (\`froyek.com/login\`), klik tombol tulisan biru: **"Lupa password?"**.\n2. Masukkan alamat email akun Froyek Anda, lalu klik **Kirim Link Reset**.\n3. Buka kotak masuk (atau folder Spam/Promosi) email Anda, lalu klik tautan reset untuk membuat sandi baru.\n\nAda kendala saat menerima emailnya? Esti bisa sambungkan ke tim teknis langsung ya!`,
      suggestedActions: [
        { label: '⚙️ Buka Pengaturan Akun', action: 'navigate', payload: '/app?tab=settings&st=profil' },
        { label: '💬 Butuh Bantuan via WhatsApp', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20saya%20butuh%20bantuan%20reset%20password%20Froyek' },
      ],
    };
  }

  // 2. Login, Logout, Masuk Akun, Keluar
  if (
    /\b(login|logout|masuk akun|keluar akun|signin|sign in|sign out)\b/i.test(q) ||
    q.includes('cara masuk') ||
    q.includes('cara keluar') ||
    q.includes('gagal login')
  ) {
    if (/\b(logout|keluar)\b/i.test(q)) {
      return {
        text: `Untuk keluar (logout) dari akun Froyek:\n\n1. Klik **Ikon Profil / Nama Anda** di pojok kiri bawah (atau di menu Pengaturan).\n2. Scroll ke bagian paling bawah, lalu klik tombol merah **Keluar / Logout**.\n3. Semua data Anda sudah aman tersimpan otomatis di cloud!`,
        suggestedActions: [
          { label: 'Buka Pengaturan Akun', action: 'navigate', payload: '/app?tab=settings' },
        ],
      };
    }
    return {
      text: `Untuk masuk (login) ke aplikasi Froyek:\n\n• Buka halaman login di browser Anda.\n• Masukkan email dan kata sandi yang sudah didaftarkan, lalu klik **Masuk**.\n• Anda juga bisa langsung klik **"Masuk dengan Google"** jika akun Anda terhubung dengan Gmail.\n\nJika belum punya akun, klik tombol **Daftar / Buat Akun Baru**.`,
      suggestedActions: [
        { label: 'Lupa Password?', action: 'ask', payload: 'Saya lupa password akun Froyek' },
        { label: 'Hubungi CS via WhatsApp', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20saya%20ada%20kendala%20login' },
      ],
    };
  }

  // 3. Profil Akun, Ganti Email, Nomor HP, Nama Usaha
  if (
    /\b(profil|profile|email|nomor hp|no hp|no wa|telepon|nama usaha|ganti nama)\b/i.test(q)
  ) {
    return {
      text: `Untuk mengubah data diri atau nama perusahaan:\n\n1. Buka menu **Pengaturan ➔ Profil & Organisasi**.\n2. Di situ Mas/Mbak bisa ganti nama panggilan, nomor WhatsApp kontak resmi, nama PT/CV/studio, alamat kantor, hingga warna brand.\n3. Jangan lupa klik tombol **Simpan Perubahan**.`,
      suggestedActions: [
        { label: 'Buka Pengaturan Profil', action: 'navigate', payload: '/app?tab=settings&st=profil' },
        { label: 'Atur Logo & Profil Bisnis', action: 'navigate', payload: '/app?tab=settings&st=organisasi' },
      ],
    };
  }

  // 4. Upgrade & Aturan Paket Pro (Gunakan regex boundary agar kata 'prompt', 'proyek', 'proses' tidak salah memicu!)
  if (
    /\b(upgrade|paket|harga|biaya|tarif|berlangganan|langganan|bayar|qris)\b/i.test(q) ||
    /\b(pro)\b/i.test(q) && !/\b(proyek|proses|progres|prompt|program)\b/i.test(q)
  ) {
    return {
      text: `Soal paket di Froyek simpel banget kok Mas/Mbak, ga ada biaya tersembunyi:\n\n🚀 **Paket Froyek Pro (Paling Favorit):**\n• Manajemen proyek & Gantt/CPM tanpa ribet, hingga 10 proyek aktif dan akses tim sampai 5 anggota.\n• Manajemen kasbon pekerja, absensi GPS, dan kurva S progres proyek.\n• Laporan Keuangan Bisnis lengkap (neraca, laba/rugi, arus kas).\n\n💳 **Cara Upgradenya:**\nBisa langsung buka menu Pengaturan (Settings) ➔ Pricelist, atau klik tombol Upgrade. Pembayaran otomatis via QRIS (Gopay/OVO/BCA), Virtual Account, atau Kartu!`,
      suggestedActions: [
        { label: '🚀 Buka Halaman Pengaturan & Pricelist', action: 'navigate', payload: '/app?tab=settings&st=pricelist' },
        { label: '💬 Tanya Detail via WhatsApp', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20mau%20tanya%20detail%20upgrade%20paket%20Froyek%20Pro' },
      ],
    };
  }

  // 5. Cara Bikin Penawaran PDF / Estimator / RAB (hanya jika berlisensi)
  if (
    /\b(pdf|penawaran|estimator|rab|hitung hpp|survei|survei lokasi|quotation)\b/i.test(q)
  ) {
    if (!allowEstimatorInfo) {
      return {
        text: `Di Froyek, Mas/Mbak bisa menyusun rencana anggaran biaya (RAP), memantau progres & jadwal Gantt proyek, serta mengekspor laporan ke PDF atau Excel langsung dari halaman Proyek.\n\n💡 *Tips:* Mas/Mbak bisa atur warna brand perusahaan sendiri di menu **Pengaturan ➔ Organisasi**!`,
        suggestedActions: [
          { label: 'Buka Daftar Proyek', action: 'navigate', payload: '/app?tab=projects' },
          { label: 'Atur Logo & Warna Brand', action: 'navigate', payload: '/app?tab=settings&st=organisasi' },
        ],
      };
    }
    return {
      text: `Bikin penawaran di Froyek Estimator sengaja didesain secepat kilat biar klien ga dighosting Mas/Mbak! Caranya gini:\n\n1. Buka menu **Estimator** (ikon kalkulator di menu navigasi).\n2. Klik **Buat Penawaran Baru** (bisa pakai template: Kitchen Set, Interior, Rumah Tinggal, dll).\n3. Masukkan ukuran ruangan atau volume saat Anda lagi survei lokasi.\n4. Rumus HPP bahan & ongkos tukang langsung terhitung otomatis sesuai margin profit yang diinginkan.\n5. Klik tombol **Cetak / Bagikan PDF**!\n\n💡 *Tips Orang Rumah:* Mas/Mbak bisa pasang logo usaha dan atur warna brand sendiri di menu Pengaturan ➔ Organisasi, jadi di PDF yang muncul adalah merek workshop Anda sendiri, bukan Froyek!`,
      suggestedActions: [
        { label: 'Buka Menu Estimator', action: 'navigate', payload: '/app/estimator' },
        { label: 'Atur Logo & Warna Brand', action: 'navigate', payload: '/app?tab=settings&st=organisasi' },
      ],
    };
  }

  // 6. Mandor, Tukang, Karyawan Lapangan (HR, Absensi & Kasbon)
  if (
    /\b(mandor|tukang|karyawan|absen|absensi|kasbon|gaji|staf|pekerja)\b/i.test(q) ||
    q.includes('tim lapangan') ||
    q.includes('undang anggota')
  ) {
    return {
      text: `Bisa banget Mas/Mbak! Di Froyek ada fitur khusus **Pekerja & Tim Lapangan**:\n\n👷 **Untuk Mandor & Tukang:**\n• Mereka ga perlu pusing lihat angka rahasia keuangan perusahaan. Mereka punya tampilan khusus pekerja (*Worker View*).\n• Mandor bisa input opname progres harian + upload foto pekerjaan dari HP.\n• Tukang bisa absen masuk/pulang dengan GPS dan mengajukan kasbon mingguan.\n\n📲 **Bahkan ada Integrasi Telegram Bot!**\nAI Froyek bisa proaktif kirim pengingat opname progres dan absensi langsung ke grup Telegram mandor di lapangan (bisa dicek di Pengaturan ➔ Koordinasi AI & Tim). Praktis banget tanpa aplikasi tambahan yang berat!`,
      suggestedActions: [
        { label: 'Lihat Menu Tim & Pekerja', action: 'navigate', payload: '/app?tab=hr' },
        { label: 'Cek Pengaturan Koordinasi Telegram', action: 'navigate', payload: '/app?tab=settings&st=koordinasi' },
      ],
    };
  }

  // 7. Logo, Merek, dan White-label
  if (/\b(merek|brand|white label|whitelabel|kop surat|logo)\b/i.test(q)) {
    return {
      text: `Tenang Mas/Mbak, privasi bisnis Anda aman 100%! Di dokumen PDF penawaran maupun laporan klien:\n\n• Kop surat menggunakan **Nama Usaha & Logo Anda**.\n• Warna tema disesuaikan dengan warna identitas brand Anda.\n• Tanda tangan digital dan nomor rekening transfer adalah milik Anda.\n\nKlien Anda akan melihat Anda sebagai bisnis yang sangat profesional dan bonafide!`,
      suggestedActions: [
        { label: 'Atur Brand & Logo Sekarang', action: 'navigate', payload: '/app?tab=settings&st=organisasi' },
      ],
    };
  }

  // 8. Hubungkan ke WhatsApp
  if (/\b(wa|whatsapp|kontak|cs|admin|manusia|bicara)\b/i.test(q)) {
    return {
      text: `Siap Mas/Mbak! Kalau mau ngobrol langsung atau butuh panduan via WhatsApp, tim support Froyek siap menyambut:\n\n📲 Jam Operasional: Setiap Hari (08.00 - 21.00 WIB)\nSilakan klik tombol di bawah untuk langsung terhubung ke WhatsApp resmi kami ya!`,
      suggestedActions: [
        { label: '📲 Buka WhatsApp Support Sekarang', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Froyek%20Support,%20saya%20mau%20tanya-tanya%20seputar%20aplikasi' },
      ],
    };
  }

  // 9. Pertanyaan Umum Lainnya (Fallback Cerdas — Tidak Mengulang Promosi Fitur secara Kaku)
  return {
    text: `Maaf ya Mas/Mbak, Esti belum begitu menangkap maksud pertanyaan Anda soal: *"${query}"*.\n\nBiar ga salah paham, apakah maksud Mas/Mbak salah satu dari topik berikut ini?\n\n1. **Akun & Akses:** Cara ganti password, lupa login, atau tambah anggota tim.\n2. **Proyek & Laporan:** Cara kelola jadwal, RAP, atau unduh laporan PDF/Excel.\n3. **Paket & Pembayaran:** Info upgrade Froyek Pro atau kendala tagihan.\n\nAtau jika Mas/Mbak butuh bantuan langsung dari Owner/Tim Support kami, silakan pilih tombol di bawah ya!`,
    suggestedActions: [
      { label: '🔑 Cara Ganti Password', action: 'ask', payload: 'Bagaimana cara ganti password?' },
      ...(allowEstimatorInfo
        ? [{ label: '📄 Cara Buat RAB & PDF', action: 'ask' as const, payload: 'Cara bikin PDF penawaran di HP' }]
        : [{ label: '📁 Lihat Daftar Proyek', action: 'navigate' as const, payload: '/app?tab=projects' }]),
      { label: '🚀 Info Upgrade Paket Pro', action: 'ask', payload: 'Apa keuntungan upgrade ke Pro?' },
      { label: '💬 Hubungkan ke WhatsApp Support', action: 'link_whatsapp', payload: `https://wa.me/6281234567890?text=Halo%20Froyek%20Support,%20saya%20mau%20tanya:%20${encodeURIComponent(query)}` },
    ],
  };
}
