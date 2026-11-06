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
    'Halo Mas/Mbak! Saya Esti dari Monefyi. Anggap aja rumah sendiri ya 😊 Mau tanya-tanya soal cara pakai aplikasi, fitur estimator/proyek, atau info paket upgrade? Esti siap jelaskan santai sampai paham!',
};

export const POPULAR_CS_QUESTIONS = [
  'Cara kirim PDF penawaran berlogo sendiri?',
  'Apa bedanya paket Standard vs Pro?',
  'Bagaimana cara upgrade ke Pro?',
  'Bisa dipakai mandor & tukang lapangan?',
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
  const q = query.toLowerCase();

  // 1. Upgrade & Aturan Paket Pro
  if (q.includes('upgrade') || q.includes('pro') || q.includes('paket') || q.includes('harga') || q.includes('biaya') || q.includes('bayar')) {
    return {
      text: `Soal paket di Monefyi simpel banget kok Mas/Mbak, ga ada biaya tersembunyi:\n\n✨ **Paket Standard:**\n• Cocok untuk Anda yang fokus hitung HPP cepat di HP dan kirim PDF penawaran resmi berlogo sendiri saat survei lokasi.\n• Proyek & penawaran unlimited tanpa batas.\n\n🚀 **Paket Pro (Paling Favorit Kontraktor):**\n• Semua fitur Standard + akses multi-user untuk staf, mandor, dan tukang lapangan.\n• Manajemen kasbon tukang, absensi GPS, dan kurva S progres proyek.\n• Laporan Keuangan Bisnis lengkap (neraca, laba/rugi, arus kas).\n\n💳 **Cara Upgradenya:**\nBisa langsung lewat menu Akun/Pricing di aplikasi atau klik checkout di landing page. Pembayaran otomatis via QRIS (Gopay/OVO/BCA), Virtual Account, atau Kartu. Langsung aktif detik itu juga!`,
      suggestedActions: [
        { label: '🚀 Lihat Halaman Upgrade / Checkout', action: 'link_upgrade', payload: '/checkout' },
        { label: '💬 Tanya Detail via WhatsApp', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20mau%20tanya%20detail%20upgrade%20paket%20Pro' },
      ],
    };
  }

  // 2. Cara Bikin Penawaran PDF / Estimator
  if (q.includes('pdf') || q.includes('penawaran') || q.includes('estimator') || q.includes('rab') || q.includes('logo') || q.includes('survei')) {
    return {
      text: `Bikin penawaran di Monefyi sengaja didesain secepat kilat biar klien ga dighosting Mas/Mbak! Caranya gini:\n\n1. Buka menu **Estimator** di aplikasi.\n2. Klik **Buat Penawaran Baru** (bisa pilih template: Kitchen Set, Interior, Rumah 2 Lantai, dll).\n3. Masukkan ukuran ruangan atau volume saat Anda lagi survei lokasi.\n4. Rumus HPP bahan & ongkos tukang langsung terhitung otomatis.\n5. Klik tombol **Cetak / Bagikan PDF**!\n\n💡 *Tips Orang Rumah:* Mas/Mbak bisa pasang logo usaha dan atur warna brand sendiri di menu Pengaturan Organisasi, jadi di PDF yang muncul adalah merek workshop Anda sendiri, bukan Monefyi!`,
      suggestedActions: [
        { label: 'Bagaimana cara pasang logo sendiri?', action: 'ask', payload: 'Cara pasang logo usaha di PDF' },
        { label: 'Berapa lama proses hitungnya?', action: 'ask', payload: 'Berapa menit bikin RAB di Monefyi?' },
      ],
    };
  }

  // 3. Mandor, Tukang, Karyawan Lapangan (HR & Attendance)
  if (q.includes('mandor') || q.includes('tukang') || q.includes('lapangan') || q.includes('karyawan') || q.includes('absen') || q.includes('kasbon')) {
    return {
      text: `Bisa banget Mas/Mbak! Di Monefyi ada fitur khusus **Pekerja & Tim Lapangan**:\n\n👷 **Untuk Mandor & Tukang:**\n• Mereka ga perlu pusing lihat angka keuangan perusahaan. Mereka punya tampilan khusus pekerja (*Worker View*).\n• Mandor bisa input opname progres harian + upload foto pekerjaan dari HP.\n• Tukang bisa absen masuk/pulang dengan GPS dan mengajukan kasbon mingguan.\n\n📲 **Bahkan ada Integrasi Telegram Bot!**\nAI Monefyi bisa proaktif kirim pengingat opname progres dan absensi langsung ke grup Telegram mandor di lapangan. Praktis banget tanpa harus download aplikasi berat.`,
      suggestedActions: [
        { label: 'Fitur mandor ada di paket apa?', action: 'ask', payload: 'Fitur mandor dan tim lapangan masuk paket mana?' },
        { label: 'Bagaimana cara undang mandor?', action: 'ask', payload: 'Cara undang karyawan dan mandor' },
      ],
    };
  }

  // 4. Logo, Merek, dan White-label
  if (q.includes('merek') || q.includes('brand') || q.includes('white') || q.includes('kop')) {
    return {
      text: `Tenang Mas/Mbak, privasi bisnis Anda aman 100%! Di dokumen PDF penawaran maupun kwitansi klien:\n\n• Kop surat menggunakan **Nama Usaha & Logo Anda**.\n• Warna tema PDF disesuaikan dengan warna identitas brand Anda.\n• Tanda tangan digital dan nomor rekening transfer adalah milik Anda.\n\nKlien Anda akan melihat Anda sebagai kontraktor/workshop yang sangat profesional dan bonafide!`,
      suggestedActions: [
        { label: 'Bagaimana cara aturnya?', action: 'ask', payload: 'Cara atur profil organisasi dan logo' },
      ],
    };
  }

  // 5. Hubungkan ke WhatsApp
  if (q.includes('wa') || q.includes('whatsapp') || q.includes('kontak') || q.includes('cs') || q.includes('manusia') || q.includes('bicara')) {
    return {
      text: `Siap Mas/Mbak! Kalau mau ngobrol langsung atau butuh panduan via WhatsApp, tim support Monefyi siap menyambut:\n\n📲 Jam Operasional: Setiap Hari (08.00 - 21.00 WIB)\nSilakan klik tombol di bawah untuk langsung terhubung ke WhatsApp resmi kami ya!`,
      suggestedActions: [
        { label: '📲 Buka WhatsApp Support Sekarang', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Monefyi%20Support,%20saya%20mau%20tanya-tanya%20seputar%20aplikasi' },
      ],
    };
  }

  // 6. Default Friendly Response
  return {
    text: `Paham Mas/Mbak! Di Monefyi kita bantu kontraktor, desainer interior, dan arsitek agar kerjaan ga bocor dan closing lebih cepat:\n\n1. **Estimator:** Hitung cepat HPP dan kirim PDF resmi berlogo sendiri saat survei lokasi.\n2. **Planner Proyek:** Pantau kurva S, opname progres fisik, dan kasbon tukang.\n3. **Keuangan Bisnis:** Arus kas dan neraca proyek real-time.\n\nBagian mana yang paling Mas/Mbak ingin tahu lebih dalam? Esti bantu pandu step-by-step ya!`,
    suggestedActions: [
      { label: 'Cara bikin PDF penawaran di HP', action: 'ask', payload: 'Cara bikin PDF penawaran di HP' },
      { label: 'Info paket upgrade ke Pro', action: 'ask', payload: 'Apa keuntungan upgrade ke Pro?' },
      { label: 'Hubungkan ke WhatsApp Support', action: 'link_whatsapp', payload: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Esti,%20mau%20tanya%20seputar%20Monefyi' },
    ],
  };
}

