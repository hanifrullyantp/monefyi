// Dalil Quran & Hadits tentang Zakat

export const DALIL = {
  general: {
    quran: {
      surat: 'At-Taubah',
      ayat: 103,
      arab: 'خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا',
      terjemahan: 'Ambillah zakat dari sebagian harta mereka, dengan zakat itu kamu membersihkan dan mensucikan mereka.',
    },
    hadits: [
      {
        rawi: 'HR. Bukhari & Muslim',
        text: 'Islam dibangun di atas lima perkara: bersaksi bahwa tidak ada tuhan selain Allah dan Muhammad adalah utusan Allah, mendirikan shalat, menunaikan zakat, berpuasa Ramadhan, dan berhaji ke Baitullah bagi yang mampu.',
      },
    ],
  },
  penghasilan: {
    dalil: 'Zakat penghasilan didasarkan pada qiyas terhadap zakat maal, sebagaimana firman Allah dalam QS. Al-Baqarah: 267.',
    quran: {
      surat: 'Al-Baqarah',
      ayat: 267,
      arab: 'يَا أَيُّهَا الَّذِينَ آمَنُوا أَنفِقُوا مِن طَيِّبَاتِ مَا كَسَبْتُمْ',
      terjemahan: 'Hai orang-orang yang beriman, nafkahkanlah (di jalan Allah) sebagian dari hasil usahamu yang baik-baik.',
    },
    fatwa: 'Fatwa MUI No. 3 Tahun 2003 tentang Zakat Penghasilan',
    note: '2.5% dari penghasilan bruto setelah dikurangi kebutuhan pokok',
  },
  maal: {
    quran: {
      surat: 'At-Taubah',
      ayat: 34,
      arab: 'وَالَّذِينَ يَكْنِزُونَ الذَّهَبَ وَالْفِضَّةَ وَلَا يُنفِقُونَهَا فِي سَبِيلِ اللَّهِ فَبَشِّرْهُم بِعَذَابٍ أَلِيمٍ',
      terjemahan: 'Dan orang-orang yang menyimpan emas dan perak dan tidak menafkahkannya pada jalan Allah, maka beritahukanlah kepada mereka bahwa mereka akan mendapat siksa yang pedih.',
    },
  },
  emas: {
    hadits: {
      rawi: 'HR. Abu Dawud',
      text: 'Tidak ada zakat atas emas yang kurang dari 20 dinar (85 gram). Jika telah mencapai 20 dinar dan telah berlalu satu tahun, maka wajib zakat setengah dinar (2.5%).',
    },
  },
  perdagangan: {
    hadits: {
      rawi: 'HR. Abu Dawud',
      text: 'Nabi memerintahkan kami untuk mengeluarkan zakat dari apa yang kami persiapkan untuk perdagangan.',
    },
  },
  pertanian: {
    quran: {
      surat: 'Al-Anam',
      ayat: 141,
      arab: 'وَآتُوا حَقَّهُ يَوْمَ حَصَادِهِ',
      terjemahan: 'Dan tunaikanlah haknya di hari memetik hasilnya.',
    },
    hadits: {
      rawi: 'HR. Bukhari',
      text: 'Tanaman yang diairi dengan air hujan, mata air, atau air tanah, zakatnya sepersepuluh (10%). Sedangkan yang diairi dengan tenaga manusia atau binatang, zakatnya seperduapuluh (5%).',
    },
  },
  fitrah: {
    hadits: {
      rawi: 'HR. Bukhari & Muslim',
      text: 'Rasulullah SAW mewajibkan zakat fitrah satu sha kurma atau satu sha gandum atas setiap muslim, merdeka atau hamba, laki-laki atau perempuan, besar atau kecil.',
    },
  },
  investasi: {
    dalil: 'Zakat investasi dianalogikan dengan zakat perdagangan karena keduanya bertujuan untuk mengembangkan harta.',
    quran: {
      surat: 'Al-Baqarah',
      ayat: 267,
      terjemahan: 'Hai orang-orang yang beriman, nafkahkanlah (di jalan Allah) sebagian dari hasil usahamu yang baik-baik.',
    },
  },
};

export const getGeneralDalil = () => DALIL.general;
export const getDalilByType = (type: keyof typeof DALIL) => DALIL[type];
