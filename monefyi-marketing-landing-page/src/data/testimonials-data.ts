export interface JourneyMilestone {
  time: string;
  icon: string;
  title: string;
  description: string;
}

export interface StoryTestimonial {
  id: string;
  featured: boolean;
  name: string;
  age: string | number;
  role: string;
  location: string;
  photo: string;
  duration: string;
  rating: number;
  storyTitle: string;
  microStory?: string;
  before: {
    paragraph: string;
    keyPain: string;
  };
  moment: {
    quote: string;
    context: string;
  };
  journey: JourneyMilestone[];
  after: {
    paragraph: string;
    keyOutcome: string;
  };
  punchLine: string;
  transformation: {
    before: string;
    after: string;
  };
}

export const storiesData: StoryTestimonial[] = [
  {
    id: "rina-maharani",
    featured: true,
    name: "Rina Maharani",
    age: 27,
    role: "Marketing Manager",
    location: "Jakarta",
    photo: "",
    duration: "6 bulan bersama Monefyi",
    rating: 5,
    storyTitle: "Dari Panik Setiap Tanggal 20, Sekarang Tidur Nyenyak",
    before: {
      paragraph: "Setiap tanggal 20, gue bangun tidur langsung buka mobile banking. Jantung deg-degan. Berdoa saldo masih cukup sampai gajian. Rasanya kayak mau UN, tapi setiap hari. Nggak ada yang gue omongin ke temen karena malu — gaji 8 juta kok masih tekor terus. Yang paling bikin capek: rasa cemas yang nggak pernah hilang. Bahkan pas gajian, gue udah mulai cemas mikirin bulan depan.",
      keyPain: "Anxiety soal uang itu real. Dan bikin capek banget."
    },
    moment: {
      quote: "Suatu Minggu pagi, gue lagi ngopi sendirian. Buka HP, lihat notif tagihan kartu kredit. Tiba-tiba nangis. Bukan karena angkanya besar, tapi karena gue sadar: gue nggak tahu gue udah keluarin uang buat apa aja bulan ini.",
      context: "Minggu pagi, di sebuah cafe di Sudirman"
    },
    journey: [
      {
        time: "Hari 1",
        icon: "Search",
        title: "Kaget Sama Data Sendiri",
        description: "Ternyata gue habis Rp 1.5jt cuma buat kopi Starbucks bulan lalu. Nggak sadar."
      },
      {
        time: "Minggu 2",
        icon: "Brain",
        title: "Mulai Berpikir Sebelum Beli",
        description: "Setiap mau checkout online, gue cek Monefyi dulu. Aman apa enggak? Ternyata banyak yang bisa ditunda."
      },
      {
        time: "Bulan 1",
        icon: "TrendingDown",
        title: "Pengeluaran Turun 30%",
        description: "Bukan karena maksa hemat, tapi karena tahu mana yang benar-benar penting."
      },
      {
        time: "Bulan 3",
        icon: "PiggyBank",
        title: "Pertama Kali Punya Emergency Fund",
        description: "Rp 3 juta di tabungan khusus. Rasanya kayak dapat medali olimpiade."
      },
      {
        time: "Sekarang",
        icon: "Smile",
        title: "Tenang. Tidur Nyenyak.",
        description: "Nggak ada lagi anxiety pagi. Gue tahu persis posisi keuangan gue setiap saat."
      }
    ],
    after: {
      paragraph: "Sekarang, tanggal 20 tuh biasa aja. Gue bahkan kadang lupa itu tanggal berapa. Buka banking? Santai. Diajak nongkrong? Bisa. Mau checkout online? Cek Monefyi, kalau aman ya jalan. Emergency fund udah 3 bulan pengeluaran. Bulan depan mulai reksadana. Yang paling penting: gue udah nggak mikirin uang terus-terusan. Otak gue bebas untuk hal lain.",
      keyOutcome: "Bukan cuma keuangan yang berubah. Hidup gue yang berubah."
    },
    punchLine: "Monefyi bukan mengubah keuangan saya. Monefyi mengubah cara saya hidup.",
    transformation: {
      before: "Anxiety tiap akhir bulan, saving = 0",
      after: "Tenang, emergency fund 3 bulan, mulai investasi"
    }
  },
  {
    id: "ahmad-fauzi",
    featured: false,
    name: "Ahmad Fauzi",
    age: 32,
    role: "Freelance Designer",
    location: "Bandung",
    photo: "",
    duration: "8 bulan bersama Monefyi",
    rating: 5,
    storyTitle: "Freelancer dengan Income Rollercoaster, Akhirnya Stabil",
    microStory: "Bulan bagus dapat Rp 15jt, bulan sepi Rp 3jt. Dulu bulan sepi = panic mode. Sekarang? Santai, karena punya buffer 6 bulan pengeluaran.",
    before: {
      paragraph: "As freelancer, income gue nggak pernah stabil. Bulan Januari deras banget bisa Rp 15jt. Bulan Februari? Sepi, cuma Rp 3jt. Setiap bulan sepi datang, gue panik. Mulai cari utangan, jual barang, atau terpaksa ambil project murahan yang bikin burnout.",
      keyPain: "Income tinggi tapi selalu merasa miskin."
    },
    moment: {
      quote: "Waktu itu gue tolak project premium karena butuh cash cepat, ambil project receh yang bayarannya kecil. Client-nya toxic. Gue sadar: gue perlu sistem, bukan keberuntungan.",
      context: "Setelah menolak project impian karena butuh uang cepat"
    },
    journey: [
      {
        time: "Minggu 1",
        icon: "TrendingUp",
        title: "Setup Buffer Fund",
        description: "Monefyi bantu itung berapa yang perlu disimpan tiap bulan bagus untuk cover bulan sepi."
      },
      {
        time: "Bulan 2",
        icon: "Calculator",
        title: "Sistem 'Rata-rata Income'",
        description: "Berdasarkan history, gue tahu average income real. Bikin budget dari itu, bukan dari income bulan ini."
      },
      {
        time: "Bulan 6",
        icon: "Shield",
        title: "Buffer 6 Bulan Terbentuk",
        description: "Sekarang gue punya cash pool yang cover 6 bulan pengeluaran. Bulan sepi = tetep santai."
      }
    ],
    after: {
      paragraph: "Sekarang gue bisa milih project dengan tenang. Nolak yang toxic, tunggu yang worth it. Karena buffer aman, gue nggak perlu terima segala tawaran. Ironisnya, income gue malah naik karena bisa fokus di project berkualitas.",
      keyOutcome: "Ketenangan bikin gue jadi freelancer yang lebih baik."
    },
    punchLine: "Sekarang gue kerja karena passion, bukan karena panik.",
    transformation: {
      before: "Income variabel bikin stress tiap bulan sepi",
      after: "Cash flow stabil, buffer 6 bulan, milih project tenang"
    }
  },
  {
    id: "budi-santoso",
    featured: false,
    name: "Budi Santoso",
    age: 28,
    role: "Karyawan Swasta",
    location: "Yogyakarta",
    photo: "",
    duration: "5 bulan bersama Monefyi",
    rating: 5,
    storyTitle: "5 Tahun Kerja, Baru Nabung Pertama Kali di Usia 28",
    microStory: "Gaji Rp 12jt tapi tabungan selalu 0. Malu banget. Sekarang rutin nabung Rp 2jt/bulan, target DP rumah 2027.",
    before: {
      paragraph: "5 tahun kerja, tabungan gue selalu di angka 0. Malu banget kalau ditanya orang tua atau temen. Gaji Rp 12jt itu nggak kecil, tapi selalu habis. Buat apa? Nggak tahu. Setiap kali coba nabung, selalu gagal. Ada aja yang bikin tabungan kepakai lagi.",
      keyPain: "Merasa gagal sebagai orang dewasa."
    },
    moment: {
      quote: "Waktu ketemu temen SMA yang udah punya rumah, mobil, tabungan besar. Gue liat diri sendiri: 28 tahun, tabungan 0. Gue nggak boleh terus kayak gini.",
      context: "Reuni SMA di Jakarta"
    },
    journey: [
      {
        time: "Bulan 1",
        icon: "Eye",
        title: "Lihat Kebocoran",
        description: "Ternyata Rp 3jt/bulan hilang untuk 'kebiasaan kecil' — kopi, jajan, langganan lupa."
      },
      {
        time: "Bulan 2",
        icon: "Target",
        title: "Auto-Save Rp 2jt/bulan",
        description: "Setup auto transfer ke tabungan terpisah di awal bulan. Sisa untuk hidup."
      },
      {
        time: "Bulan 5",
        icon: "Trophy",
        title: "Rp 10jt Terkumpul",
        description: "Tabungan pertama seumur hidup. Rasanya surreal."
      }
    ],
    after: {
      paragraph: "Sekarang gue punya sistem yang jalan otomatis. Nggak perlu willpower berlebihan. Uang sudah dialokasikan sebelum sempat dihabiskan. Bulan depan mulai investasi rutin. Target DP rumah di 2027 udah on track.",
      keyOutcome: "Saya bukan orang yang boros. Saya cuma butuh sistem."
    },
    punchLine: "Nabung itu bukan soal willpower. Ini soal sistem yang benar.",
    transformation: {
      before: "Gaji 12jt, tabungan 0, malu tiap ditanya",
      after: "Rutin nabung Rp 2jt/bulan, target DP rumah on track"
    }
  },
  {
    id: "dewi-rizky",
    featured: false,
    name: "Dewi & Rizky",
    age: "29 & 31",
    role: "Suami-Istri",
    location: "Surabaya",
    photo: "",
    duration: "4 bulan bersama Monefyi",
    rating: 5,
    storyTitle: "Berhenti Bertengkar Soal Uang. Mulai Planning Bareng.",
    microStory: "3 tahun nikah, selalu ribut soal keuangan. Sekarang dashboard bersama, transparan, dan kompak plan masa depan.",
    before: {
      paragraph: "3 tahun nikah, konflik terbesar kami adalah uang. Gue merasa istri boros, dia merasa gue pelit. Setiap akhir bulan pasti ada drama. Yang lebih parah: kami nggak tahu pasti keuangan kami real-nya kayak apa. Semua asumsi.",
      keyPain: "Uang jadi topik yang bikin rumah tangga tegang."
    },
    moment: {
      quote: "Suatu malam kami duduk berdua, buka semua rekening bareng-bareng. Kaget. Ternyata gue yang lebih boros. Ternyata dia yang selama ini nabung diam-diam untuk emergency.",
      context: "Setelah pertengkaran besar soal cicilan"
    },
    journey: [
      {
        time: "Minggu 1",
        icon: "Users",
        title: "Dashboard Bersama",
        description: "Semua transaksi kedua-nya masuk ke satu dashboard. No more asumsi."
      },
      {
        time: "Bulan 1",
        icon: "MessageCircle",
        title: "Diskusi Weekly, Bukan Ribut",
        description: "Setiap Minggu malam, kami review budget bareng. Konstruktif, bukan blame game."
      },
      {
        time: "Bulan 3",
        icon: "Heart",
        title: "Punya Goals Bareng",
        description: "DP rumah 2027, honeymoon lagi 2026, dana anak. Kami punya visi finansial bersama."
      }
    ],
    after: {
      paragraph: "Sekarang, uang bukan lagi topik yang bikin ribut. Justru jadi topik yang bikin kami kompak. Setiap keputusan besar kami diskusi berdasarkan data, bukan emosi. Rasanya seperti punya partner finansial, bukan lawan.",
      keyOutcome: "Kami jadi tim, bukan dua orang yang sering ribut."
    },
    punchLine: "Ternyata masalah uang di rumah tangga adalah masalah komunikasi. Bukan masalah uang.",
    transformation: {
      before: "Ribut soal uang setiap bulan, semua asumsi",
      after: "Kompak plan masa depan, transparent, punya goals bareng"
    }
  }
];
