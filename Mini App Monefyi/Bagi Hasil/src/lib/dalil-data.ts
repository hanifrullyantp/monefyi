import type { DalilItem, JenisAkad } from "@/types/bagi-hasil";

export const dalilUmum: DalilItem[] = [
  {
    jenis: "quran",
    referensi: "QS. Al-Maidah: 2",
    teksArab: "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ ۖ وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ",
    terjemahan:
      "Dan tolong-menolonglah kamu dalam (mengerjakan) kebajikan dan takwa, dan jangan tolong-menolong dalam berbuat dosa dan permusuhan.",
    relevansi:
      "Landasan kerja sama usaha yang saling menguntungkan dan dilandasi kebajikan.",
  },
  {
    jenis: "quran",
    referensi: "QS. Al-Maidah: 1",
    teksArab: "يَا أَيُّهَا الَّذِينَ آمَنُوا أَوْفُوا بِالْعُقُودِ",
    terjemahan:
      "Wahai orang-orang yang beriman, penuhilah akad-akad (perjanjian-perjanjian) itu.",
    relevansi: "Setiap akad bagi hasil harus dipenuhi oleh kedua pihak.",
  },
  {
    jenis: "quran",
    referensi: "QS. An-Nisa: 29",
    teksArab:
      "يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ إِلَّا أَن تَكُونَ تِجَارَةً عَن تَرَاضٍ مِّنكُمْ",
    terjemahan:
      "Wahai orang-orang yang beriman, janganlah kamu saling memakan harta sesamamu dengan jalan yang batil, kecuali dengan jalan perniagaan yang berlaku dengan suka sama-suka di antara kamu.",
    relevansi:
      "Bagi hasil harus didasarkan atas kerelaan dan kesepakatan kedua pihak.",
  },
  {
    jenis: "quran",
    referensi: "QS. Al-Baqarah: 282",
    teksArab:
      "يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنتُم بِدَيْنٍ إِلَىٰ أَجَلٍ مُّسَمًّى فَاكْتُبُوهُ",
    terjemahan:
      "Wahai orang-orang yang beriman! Apabila kamu bermuamalah tidak secara tunai untuk waktu yang ditentukan, hendaklah kamu menuliskannya.",
    relevansi:
      "Akad bagi hasil sebaiknya dicatat dan didokumentasikan dengan jelas.",
  },
];

export const dalilMudharabah: DalilItem[] = [
  {
    jenis: "hadits",
    referensi: "HR. Ibnu Majah",
    teksArab:
      "كَانَ النَّبِيُّ ﷺ يَتَّجِرُ بِمَالِ خَدِيجَةَ مُضَارَبَةً",
    terjemahan:
      "Nabi Muhammad ﷺ pernah melakukan perjalanan dagang dengan modal milik Khadijah radhiyallahu 'anha sebelum menikah dengannya, dan beliau mendapat bagian dari keuntungan.",
    relevansi:
      "Praktik mudharabah telah ada sejak sebelum Islam dan diakui serta dipraktikkan Nabi.",
  },
  {
    jenis: "hadits",
    referensi: "Ibnu Qudamah dalam Al-Mughni",
    teksArab: "أَجْمَعَ الْعُلَمَاءُ عَلَى جَوَازِ الْمُضَارَبَةِ",
    terjemahan:
      "Para ulama telah berijma' (sepakat) atas kebolehan mudharabah karena manusia membutuhkannya. Pemilik modal terkadang tidak mampu mengelola usaha, sedangkan pengelola terkadang tidak punya modal.",
    relevansi: "Landasan ijma' ulama atas akad mudharabah.",
  },
  {
    jenis: "hadits",
    referensi: "HR. Ad-Daruquthni dan Al-Baihaqi",
    teksArab:
      "الْخَسَارَةُ فِي الْمُضَارَبَةِ عَلَى الْمَالِ وَعَمَلُ الْمُضَارِبِ لَا يُضْمَنُ",
    terjemahan:
      "Kerugian dalam mudharabah ditanggung oleh modal (pemilik modal), sedangkan kerja pengelola tidak dapat diganti.",
    relevansi: "Dasar pembagian risiko dalam mudharabah.",
  },
  {
    jenis: "hadits",
    referensi: "Ijma' Fuqaha",
    teksArab:
      "يُشْتَرَطُ فِي الْمُضَارَبَةِ أَنْ يَكُونَ الرِّبْحُ مَعْلُومًا",
    terjemahan:
      "Disyaratkan dalam mudharabah agar nisbah (bagian) keuntungan diketahui dengan jelas, baik berupa setengah, sepertiga, atau seperempat dari keuntungan.",
    relevansi: "Nisbah tidak boleh kabur atau tidak ditentukan sebelum akad.",
  },
];

export const dalilMusyarakah: DalilItem[] = [
  {
    jenis: "quran",
    referensi: "QS. Shad: 24",
    teksArab:
      "وَإِنَّ كَثِيرًا مِّنَ الْخُلَطَاءِ لَيَبْغِي بَعْضُهُمْ عَلَىٰ بَعْضٍ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ",
    terjemahan:
      "Dan sesungguhnya kebanyakan dari orang-orang yang berserikat itu sebahagian mereka berbuat zalim kepada sebahagian yang lain, kecuali orang-orang yang beriman dan mengerjakan amal yang saleh.",
    relevansi:
      "Ayat ini menyebutkan keberadaan syirkah (perserikatan) dan mengakui keabsahannya.",
  },
  {
    jenis: "hadits",
    referensi: "HR. Abu Dawud (Shahih)",
    teksArab:
      "أَنَا ثَالِثُ الشَّرِيكَيْنِ مَا لَمْ يَخُنْ أَحَدُهُمَا صَاحِبَهُ فَإِذَا خَانَ خَرَجْتُ مِنْ بَيْنِهِمَا",
    terjemahan:
      "Allah Ta'ala berfirman: 'Aku adalah pihak ketiga dari dua orang yang berserikat, selama salah seorang dari keduanya tidak mengkhianati sahabatnya. Apabila salah satunya berkhianat, maka Aku keluar dari perserikatan mereka.'",
    relevansi:
      "Keberkahan musyarakah dijamin Allah selama dijalankan dengan amanah.",
  },
  {
    jenis: "hadits",
    referensi: "Fiqh Madzhab Syafi'i, Maliki, Hanbali",
    teksArab:
      "الْخَسَارَةُ فِي الشَّرِكَةِ تُقَسَّمُ بِنِسْبَةِ رَأْسِ الْمَالِ",
    terjemahan:
      "Kerugian dalam syirkah dibagi proporsional sesuai dengan besar modal masing-masing pihak. Tidak boleh disyaratkan bahwa salah satu pihak menanggung lebih dari kerugian proporsional modalnya.",
    relevansi: "Dasar kalkulasi pembagian kerugian dalam musyarakah.",
  },
];

export const dalilMuzaraah: DalilItem[] = [
  {
    jenis: "hadits",
    referensi: "HR. Bukhari dan Muslim",
    teksArab:
      "أَعْطَى رَسُولُ اللهِ ﷺ خَيْبَرَ الْيَهُودَ عَلَى أَنْ يَعْمَلُوهَا وَيَزْرَعُوهَا وَلَهُمْ شَطْرُ مَا يَخْرُجُ مِنْهَا",
    terjemahan:
      "Rasulullah ﷺ memberikan tanah Khaibar kepada orang-orang Yahudi untuk dikelola dan ditanami, dan beliau mendapat setengah dari hasilnya berupa buah-buahan dan tanaman.",
    relevansi: "Nabi langsung mempraktikkan muzara'ah di tanah Khaibar.",
  },
  {
    jenis: "hadits",
    referensi: "HR. Bukhari dari Ibnu Abbas",
    teksArab:
      "لَمْ يَنْهَ رَسُولُ اللهِ ﷺ عَنِ الْمُزَارَعَةِ وَلَكِنَّهُ أَمَرَ أَنْ يَرْفُقَ بَعْضُهُمْ بِبَعْضٍ",
    terjemahan:
      "Ibnu Abbas radhiyallahu 'anhuma berkata: Rasulullah ﷺ tidak melarang muzara'ah, namun beliau memerintahkan agar sebagian membantu sebagian yang lain.",
    relevansi: "Konfirmasi kehalalan muzara'ah dari Ibnu Abbas.",
  },
];

export const dalilMukhabarah: DalilItem[] = [
  {
    jenis: "hadits",
    referensi: "HR. Muslim dari Jabir",
    teksArab:
      "نَهَى رَسُولُ اللهِ ﷺ عَنِ الْمُخَابَرَةِ إِذَا كَانَتِ الْقِسْمَةُ عَلَى حِصَّةٍ مُعَيَّنَةٍ مِنَ الْأَرْضِ",
    terjemahan:
      "Rasulullah ﷺ melarang mukhabarah... (dalam riwayat lain): yang dilarang adalah jika pembagian menggunakan hasil dari bagian tanah tertentu, bukan persentase.",
    relevansi:
      "Mukhabarah boleh dengan syarat pembagian berupa persentase dari total panen, bukan mengacu pada hasil lahan tertentu.",
  },
  {
    jenis: "hadits",
    referensi: "Al-Mughni, Ibnu Qudamah",
    teksArab:
      "أَجَازَ الْإِمَامُ أَحْمَدُ الْمُخَابَرَةَ لِأَنَّهَا فِي مَعْنَى الْمُزَارَعَةِ",
    terjemahan:
      "Imam Ahmad membolehkan mukhabarah karena ia serupa dengan muzara'ah dalam esensinya, hanya berbeda dalam hal siapa yang menyediakan benih.",
    relevansi: "Dasar keabsahan mukhabarah menurut mazhab Hanbali.",
  },
];

export const dalilMusaqah: DalilItem[] = [
  {
    jenis: "hadits",
    referensi: "HR. Bukhari dan Muslim",
    teksArab:
      "دَفَعَ رَسُولُ اللهِ ﷺ إِلَى يَهُودِ خَيْبَرَ نَخْلَ خَيْبَرَ وَأَرْضَهَا عَلَى أَنْ يَعْمَلُوهَا مِنْ أَمْوَالِهِمْ وَلِرَسُولِ اللهِ ﷺ شَطْرُ ثَمَرِهَا",
    terjemahan:
      "Rasulullah ﷺ menyerahkan pohon kurma dan tanah Khaibar kepada orang-orang Yahudi untuk mereka rawat dan tanami, dengan syarat mereka mendapat setengah dari hasilnya.",
    relevansi:
      "Ini adalah dalil paling kuat dan langsung untuk musaqah.",
  },
  {
    jenis: "hadits",
    referensi: "Al-Umm, Imam Syafi'i",
    teksArab:
      "الْمُسَاقَاةُ جَائِزَةٌ لِحَاجَةِ النَّاسِ إِلَيْهَا",
    terjemahan:
      "Musaqah diperbolehkan karena manusia membutuhkannya. Pemilik kebun terkadang tidak mampu merawatnya sendiri, sementara pekerja membutuhkan pekerjaan.",
    relevansi: "Alasan kebolehan musaqah adalah kemaslahatan bersama.",
  },
];

export function getDalilForAkad(akad: JenisAkad): DalilItem[] {
  const khusus: Record<JenisAkad, DalilItem[]> = {
    mudharabah: dalilMudharabah,
    musyarakah: dalilMusyarakah,
    muzaraah: dalilMuzaraah,
    mukhabarah: dalilMukhabarah,
    musaqah: dalilMusaqah,
  };
  return [...dalilUmum, ...khusus[akad]];
}
