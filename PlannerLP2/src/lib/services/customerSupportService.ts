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
  title: 'Customer Concierge & Support Monefyi',
  avatar: '👩‍💼',
  badge: 'Orang Rumah Monefyi',
  status: 'Online Siap Membantu',
  greeting:
    'Halo Mas/Mbak! Saya Esti dari Monefyi. Anggap aja rumah sendiri ya 😊 Mau tanya seputar akun/password, cara pakai aplikasi, fitur estimator, atau paket langganan? Esti siap pandu santai sampai beres!',
};

export const POPULAR_CS_QUESTIONS = [
  'Bagaimana cara ganti password?',
  'Cara kirim PDF penawaran berlogo sendiri?',
  'Apa bedanya paket Standard vs Pro?',
  'Bagaimana cara undang mandor & tim lapangan?',
  'Hubungkan saya ke WhatsApp Support',
];

export function getCustomerSupportReply(query: string): {
  text: string;
  suggestedActions?: {
    label: string;
    action: 'ask' | 'link_whatsapp' | 'link_upgrade' | 'navigate' | 'escalate_telegram';
    payload: string;
  }[];
} {
  const q = query.toLowerCase().trim();

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
      text: `Bisa banget Mas/Mbak! Untuk urusan **password / kata sandi**, caranya ada dua tergantung kondisi Anda:\n\n🔑 **Jika Anda Sedang Login di Aplikasi:**\n1. Buka menu **Pengaturan (Settings)** di menu samping/bawah.\n2. Pilih tab **Profil / Akun** (atau klik ikon profil Anda).\n3. Cari bagian **Keamanan & Kata Sandi**, lalu klik **Ubah Password**.\n4. Masukkan password lama, lalu ketik password baru (minimal 6 karakter) dan klik **Simpan**.\n\n❓ **Jika Anda Lupa Password Saat Mau Login:**\n1. Di halaman login (\`monefyi.com/login\`), klik tombol tulisan biru: **"Lupa password?"**.\n2. Masukkan alamat email akun Monefyi Anda, lalu klik **Kirim Link Reset**.\n3. Buka kotak masuk (atau folder Spam/Promosi) email Anda, lalu klik tautan reset untuk membuat sandi baru.\n\nAda kendala saat menerima emailnya? Esti bisa sambungkan ke tim teknis langsung ya!`,
      suggestedActions: [
        { label: '⚙️ Buka Pengaturan Akun', action: 'navigate', payload: '/app?tab=settings&st=profil' },
        { label: '💬 Butuh Bantuan via WhatsApp', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20saya%20butuh%20bantuan%20reset%20password%20Monefyi' },
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
        text: `Untuk keluar (logout) dari akun Monefyi:\n\n1. Klik **Ikon Profil / Nama Anda** di pojok kiri bawah (atau di menu Pengaturan).\n2. Scroll ke bagian paling bawah, lalu klik tombol merah **Keluar / Logout**.\n3. Semua data Anda sudah aman tersimpan otomatis di cloud!`,
        suggestedActions: [
          { label: 'Buka Pengaturan Akun', action: 'navigate', payload: '/app?tab=settings' },
        ],
      };
    }
    return {
      text: `Untuk masuk (login) ke aplikasi Monefyi:\n\n• Buka halaman login di browser Anda.\n• Masukkan email dan kata sandi yang sudah didaftarkan, lalu klik **Masuk**.\n• Anda juga bisa langsung klik **"Masuk dengan Google"** jika akun Anda terhubung dengan Gmail.\n\nJika belum punya akun, klik tombol **Daftar / Buat Akun Baru**.`,
      suggestedActions: [
        { label: 'Lupa Password?', action: 'ask', payload: 'Saya lupa password akun Monefyi' },
        { label: 'Hubungi CS via WhatsApp', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20saya%20ada%20kendala%20login' },
      ],
    };
  }

  // 3. Profil Akun, Ganti Email, Nomor HP, Nama Usaha
  if (
    /\b(profil|profile|email|nomor hp|no hp|no wa|telepon|nama usaha|ganti nama)\b/i.test(q)
  ) {
    return {
      text: `Untuk mengubah data diri atau nama workshop/perusahaan:\n\n1. Buka menu **Pengaturan ➔ Profil & Organisasi**.\n2. Di situ Mas/Mbak bisa ganti nama panggilan, nomor WhatsApp kontak resmi, nama PT/CV/Studio interior, alamat kantor, hingga rekening bank.\n3. Jangan lupa klik tombol **Simpan Perubahan** di kanan bawah.`,
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
      text: `Soal paket di Monefyi simpel banget kok Mas/Mbak, ga ada biaya tersembunyi:\n\n✨ **Paket Standard:**\n• Cocok untuk Anda yang fokus hitung HPP cepat di HP dan kirim PDF penawaran resmi berlogo sendiri saat survei lokasi.\n• Proyek & penawaran unlimited tanpa batas.\n\n🚀 **Paket Pro (Paling Favorit Kontraktor):**\n• Semua fitur Standard + akses multi-user untuk staf, mandor, dan tukang lapangan.\n• Manajemen kasbon tukang, absensi GPS, dan kurva S progres proyek.\n• Laporan Keuangan Bisnis lengkap (neraca, laba/rugi, arus kas).\n\n💳 **Cara Upgradenya:**\nBisa langsung lewat menu Akun/Pricing di aplikasi atau klik checkout di landing page. Pembayaran otomatis via QRIS (Gopay/OVO/BCA), Virtual Account, atau Kartu. Langsung aktif detik itu juga!`,
      suggestedActions: [
        { label: '🚀 Lihat Halaman Upgrade / Checkout', action: 'link_upgrade', payload: '/checkout' },
        { label: '💬 Tanya Detail via WhatsApp', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20mau%20tanya%20detail%20upgrade%20paket%20Pro' },
      ],
    };
  }

  // 5. Cara Bikin Penawaran PDF / Estimator / RAB
  if (
    /\b(pdf|penawaran|estimator|rab|hitung hpp|survei|survei lokasi|quotation)\b/i.test(q)
  ) {
    return {
      text: `Bikin penawaran di Monefyi sengaja didesain secepat kilat biar klien ga dighosting Mas/Mbak! Caranya gini:\n\n1. Buka menu **Estimator** di aplikasi.\n2. Klik **Buat Penawaran Baru** (bisa pilih template: Kitchen Set, Interior, Rumah 2 Lantai, dll).\n3. Masukkan ukuran ruangan atau volume saat Anda lagi survei lokasi.\n4. Rumus HPP bahan & ongkos tukang langsung terhitung otomatis sesuai margin profit yang diinginkan.\n5. Klik tombol **Cetak / Bagikan PDF**!\n\n💡 *Tips Orang Rumah:* Mas/Mbak bisa pasang logo usaha dan atur warna brand sendiri di menu Pengaturan Organisasi, jadi di PDF yang muncul adalah merek workshop Anda sendiri, bukan Monefyi!`,
      suggestedActions: [
        { label: 'Bagaimana cara pasang logo sendiri?', action: 'ask', payload: 'Cara pasang logo usaha di PDF' },
        { label: 'Berapa lama proses hitungnya?', action: 'ask', payload: 'Berapa menit bikin RAB di Monefyi?' },
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
      text: `Bisa banget Mas/Mbak! Di Monefyi ada fitur khusus **Pekerja & Tim Lapangan**:\n\n👷 **Untuk Mandor & Tukang:**\n• Mereka ga perlu pusing lihat angka keuangan perusahaan. Mereka punya tampilan khusus pekerja (*Worker View*).\n• Mandor bisa input opname progres harian + upload foto pekerjaan dari HP.\n• Tukang bisa absen masuk/pulang dengan GPS dan mengajukan kasbon mingguan.\n\n📲 **Bahkan ada Integrasi Telegram Bot!**\nAI Monefyi bisa proaktif kirim pengingat opname progres dan absensi langsung ke grup Telegram mandor di lapangan. Praktis banget tanpa harus download aplikasi berat.`,
      suggestedActions: [
        { label: 'Fitur mandor ada di paket apa?', action: 'ask', payload: 'Fitur mandor dan tim lapangan masuk paket mana?' },
        { label: 'Bagaimana cara undang mandor?', action: 'ask', payload: 'Cara undang karyawan dan mandor' },
      ],
    };
  }

  // 7. Logo, Merek, dan White-label
  if (/\b(merek|brand|white label|whitelabel|kop surat|logo)\b/i.test(q)) {
    return {
      text: `Tenang Mas/Mbak, privasi bisnis Anda aman 100%! Di dokumen PDF penawaran maupun kwitansi klien:\n\n• Kop surat menggunakan **Nama Usaha & Logo Anda**.\n• Warna tema PDF disesuaikan dengan warna identitas brand Anda.\n• Tanda tangan digital dan nomor rekening transfer adalah milik Anda.\n\nKlien Anda akan melihat Anda sebagai kontraktor/workshop yang sangat profesional dan bonafide!`,
      suggestedActions: [
        { label: 'Bagaimana cara aturnya?', action: 'ask', payload: 'Cara atur profil organisasi dan logo' },
      ],
    };
  }

  // 8. Hubungkan ke WhatsApp
  if (/\b(wa|whatsapp|kontak|cs|admin|manusia|bicara)\b/i.test(q)) {
    return {
      text: `Siap Mas/Mbak! Kalau mau ngobrol langsung atau butuh panduan via WhatsApp, tim support Monefyi siap menyambut:\n\n📲 Jam Operasional: Setiap Hari (08.00 - 21.00 WIB)\nSilakan klik tombol di bawah untuk langsung terhubung ke WhatsApp resmi kami ya!`,
      suggestedActions: [
        { label: '📲 Buka WhatsApp Support Sekarang', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Monefyi%20Support,%20saya%20mau%20tanya-tanya%20seputar%20aplikasi' },
      ],
    };
  }

  // 9. Pertanyaan Umum Lainnya (Fallback Cerdas — Tidak Mengulang Promosi Fitur secara Kaku)
  return {
    text: `Maaf ya Mas/Mbak, Esti belum begitu menangkap maksud pertanyaan Anda soal: *"${query}"*.\n\nBiar ga salah paham, apakah maksud Mas/Mbak salah satu dari topik berikut ini?\n\n1. **Akun & Akses:** Cara ganti password, lupa login, atau tambah anggota tim.\n2. **RAB & Penawaran:** Cara input volume saat survei dan kirim PDF berlogo sendiri.\n3. **Paket & Pembayaran:** Info upgrade Standard/Pro atau kendala invoice.\n\nAtau jika Mas/Mbak butuh bantuan langsung dari Owner/Tim Support kami, silakan pilih tombol di bawah ya!`,
    suggestedActions: [
      { label: '🔑 Cara Ganti Password', action: 'ask', payload: 'Bagaimana cara ganti password?' },
      { label: '📄 Cara Buat RAB & PDF', action: 'ask', payload: 'Cara bikin PDF penawaran di HP' },
      { label: '🚀 Info Upgrade Paket Pro', action: 'ask', payload: 'Apa keuntungan upgrade ke Pro?' },
      { label: '💬 Hubungkan ke WhatsApp Support', action: 'link_whatsapp', payload: `https://wa.me/6281234567890?text=Halo%20Monefyi%20Support,%20saya%20mau%20tanya:%20${encodeURIComponent(query)}` },
    ],
  };
}
