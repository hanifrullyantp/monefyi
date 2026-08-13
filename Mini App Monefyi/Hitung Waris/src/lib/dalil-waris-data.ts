import type { JenisAhliWaris } from "@/types/hitung-waris";

export interface DalilItem {
  id: string;
  jenis: "quran" | "hadits";
  referensi: string;
  arabText: string;
  terjemahan: string;
  relevansi: string;
  relevanUntuk?: JenisAhliWaris[];
}

export const DALIL_WARIS: DalilItem[] = [
  {
    id: "nisa-11",
    jenis: "quran",
    referensi: "QS. An-Nisa: 11",
    arabText:
      "يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ ۖ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنثَيَيْنِ ۚ فَإِن كُنَّ نِسَاءً فَوْقَ اثْنَتَيْنِ فَلَهُنَّ ثُلُثَا مَا تَرَكَ ۖ وَإِن كَانَتْ وَاحِدَةً فَلَهَا النِّصْفُ ۚ وَلِأَبَوَيْهِ لِكُلِّ وَاحِدٍ مِّنْهُمَا السُّدُسُ مِمَّا تَرَكَ إِن كَانَ لَهُ وَلَدٌ",
    terjemahan:
      "Allah mensyariatkan (mewajibkan) kepadamu tentang (pembagian warisan untuk) anak-anakmu, (yaitu) bagian seorang anak laki-laki sama dengan bagian dua orang anak perempuan. Dan jika anak itu semuanya perempuan yang jumlahnya lebih dari dua, maka bagian mereka dua pertiga dari harta yang ditinggalkan. Jika dia (anak perempuan) itu seorang saja, maka dia memperoleh setengah (harta yang ditinggalkan). Dan untuk kedua orang tua, bagian masing-masing seperenam dari harta yang ditinggalkan, jika dia (yang meninggal) mempunyai anak.",
    relevansi:
      "Dasar utama bagian anak dan orang tua dalam warisan Islam. Menetapkan bagian anak laki-laki, anak perempuan, ayah, dan ibu.",
    relevanUntuk: ["anak_laki", "anak_perempuan", "ayah", "ibu"],
  },
  {
    id: "nisa-12",
    jenis: "quran",
    referensi: "QS. An-Nisa: 12",
    arabText:
      "وَلَكُمْ نِصْفُ مَا تَرَكَ أَزْوَاجُكُمْ إِن لَّمْ يَكُن لَّهُنَّ وَلَدٌ ۚ فَإِن كَانَ لَهُنَّ وَلَدٌ فَلَكُمُ الرُّبُعُ مِمَّا تَرَكْنَ ۚ مِن بَعْدِ وَصِيَّةٍ يُوصِينَ بِهَا أَوْ دَيْنٍ ۚ وَلَهُنَّ الرُّبُعُ مِمَّا تَرَكْتُمْ إِن لَّمْ يَكُن لَّكُمْ وَلَدٌ",
    terjemahan:
      "Dan bagianmu (suami-suami) adalah seperdua dari harta yang ditinggalkan oleh istri-istrimu, jika mereka tidak mempunyai anak. Jika mereka mempunyai anak, maka kamu mendapat seperempat dari harta yang ditinggalkannya setelah dipenuhi wasiat yang mereka buat atau (dan setelah dibayar) hutangnya. Para istri memperoleh seperempat harta yang kamu tinggalkan jika kamu tidak mempunyai anak.",
    relevansi:
      "Menetapkan bagian suami (1/2 atau 1/4) dan istri (1/4 atau 1/8) berdasarkan ada tidaknya anak.",
    relevanUntuk: ["suami", "istri"],
  },
  {
    id: "nisa-176",
    jenis: "quran",
    referensi: "QS. An-Nisa: 176",
    arabText:
      "يَسْتَفْتُونَكَ قُلِ اللَّهُ يُفْتِيكُمْ فِي الْكَلَالَةِ ۚ إِنِ امْرُؤٌ هَلَكَ لَيْسَ لَهُ وَلَدٌ وَلَهُ أُخْتٌ فَلَهَا نِصْفُ مَا تَرَكَ",
    terjemahan:
      "Mereka meminta fatwa kepadamu (tentang kalalah). Katakanlah, 'Allah memberi fatwa kepadamu tentang kalalah,' yaitu jika seseorang meninggal dunia, dan dia tidak mempunyai anak tetapi mempunyai saudara perempuan, maka bagiannya (saudara perempuannya itu) seperdua dari harta yang ditinggalkannya.",
    relevansi:
      "Dasar bagian saudara perempuan dalam kondisi kalalah (meninggal tanpa anak dan ayah).",
    relevanUntuk: [
      "saudara_kandung_perempuan",
      "saudara_sebapak_perempuan",
    ],
  },
  {
    id: "nisa-7",
    jenis: "quran",
    referensi: "QS. An-Nisa: 7",
    arabText:
      "لِّلرِّجَالِ نَصِيبٌ مِّمَّا تَرَكَ الْوَالِدَانِ وَالْأَقْرَبُونَ وَلِلنِّسَاءِ نَصِيبٌ مِّمَّا تَرَكَ الْوَالِدَانِ وَالْأَقْرَبُونَ مِمَّا قَلَّ مِنْهُ أَوْ كَثُرَ ۚ نَصِيبًا مَّفْرُوضًا",
    terjemahan:
      "Bagi laki-laki ada hak bagian dari harta peninggalan kedua orang tua dan kerabatnya, dan bagi perempuan ada hak bagian (pula) dari harta peninggalan kedua orang tua dan kerabatnya, baik sedikit atau banyak menurut bagian yang telah ditetapkan.",
    relevansi:
      "Penegasan bahwa baik laki-laki maupun perempuan berhak mendapatkan warisan sesuai bagian yang telah ditetapkan Allah.",
    relevanUntuk: undefined,
  },
  {
    id: "hadits-faraid-ashabul-furudh",
    jenis: "hadits",
    referensi: "HR. Bukhari & Muslim",
    arabText:
      "أَلْحِقُوا الْفَرَائِضَ بِأَهْلِهَا، فَمَا بَقِيَ فَهُوَ لِأَوْلَى رَجُلٍ ذَكَرٍ",
    terjemahan:
      "Bagikanlah harta warisan kepada yang berhak (ashabul furudh). Adapun sisanya, maka untuk laki-laki yang paling dekat (ashabah).",
    relevansi:
      "Dasar urutan pembagian warisan: ashabul furudh didahulukan, kemudian ashabah mendapatkan sisa.",
    relevanUntuk: undefined,
  },
  {
    id: "hadits-faraid-ilmu",
    jenis: "hadits",
    referensi: "HR. Ibnu Majah",
    arabText:
      "تَعَلَّمُوا الْفَرَائِضَ وَعَلِّمُوهَا النَّاسَ، فَإِنَّهُ نِصْفُ الْعِلْمِ",
    terjemahan:
      "Pelajarilah ilmu faraid dan ajarkanlah kepada manusia, karena sesungguhnya ia adalah separuh ilmu.",
    relevansi:
      "Menunjukkan urgensi dan keutamaan mempelajari ilmu faraid dalam Islam.",
    relevanUntuk: undefined,
  },
  {
    id: "hadits-wasiat",
    jenis: "hadits",
    referensi: "HR. Bukhari",
    arabText:
      "مَا حَقُّ امْرِئٍ مُسْلِمٍ لَهُ شَيْءٌ يُرِيدُ أَنْ يُوصِيَ فِيهِ يَبِيتُ لَيْلَتَيْنِ إِلَّا وَوَصِيَّتُهُ مَكْتُوبَةٌ عِنْدَهُ",
    terjemahan:
      "Tidak patut bagi seorang Muslim yang memiliki sesuatu yang ingin diwasiatkan untuk bermalam dua malam kecuali wasiatnya sudah tertulis di sisinya.",
    relevansi:
      "Pentingnya membuat wasiat sebelum wafat agar harta yang ditinggalkan dapat diurus dengan benar.",
    relevanUntuk: undefined,
  },
];
