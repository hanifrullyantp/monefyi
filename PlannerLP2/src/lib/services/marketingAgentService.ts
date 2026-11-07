import {
  MarketingAgentRole,
  MarketingChatMessage,
  WinningAdTemplate,
  MetaCampaign,
  MarketingAutomationRules,
  MARKETING_AGENTS,
  VideoAuditReport,
} from '../types/marketing';

export interface GenerateAdParams {
  targetNiche: 'kontraktor_umum' | 'interior_kitchen' | 'arsitek_desain' | 'subkon_sipil';
  angle: 'takut_rugi_proyek' | 'efisiensi_rab_cepat' | 'kalah_tender' | 'standar_profesional';
  format: 'reels_ugc_9_16' | 'feed_carousel_1_1' | 'single_image_banner';
  customOfferPrompt?: string;
}

export function generateWinningAdLocally(params: GenerateAdParams): WinningAdTemplate {
  const isInterior = params.targetNiche === 'interior_kitchen';
  const isArsitek = params.targetNiche === 'arsitek_desain';
  const isSubkon = params.targetNiche === 'subkon_sipil';

  let title = 'Iklan Winning - Kontraktor Bangunan';
  let hooks: string[] = [];
  let primaryTexts: { framework: 'PAS' | 'HSO' | 'BAB'; text: string }[] = [];
  let headlines: string[] = [];
  let visualBeats: { time: string; visual: string; voiceover: string; onScreenText: string }[] = [];

  if (isInterior) {
    title = '🔥 Winning Ad - Interior & Kitchen Set Custom';
    hooks = [
      'Stop bikin RAB kitchen set seharian cuma buat dighosting calon klien!',
      'Kelihatannya untung 35 juta di depan, pas serah terima malah tekor 8 juta. Kenapa?',
      'Cara cerdas desainer interior kirim penawaran rapi berlogo sendiri sebelum pulang dari survei lokasi.',
      'Kenapa 80% workshop interior selalu pusing pas gajian tukang padahal proyek lagi rame?',
      'Jangan mau disuruh revisi desain & RAB 5 kali tanpa ada kepastian DP masuk!',
    ];
    primaryTexts = [
      {
        framework: 'PAS',
        text: `Bikin penawaran kitchen set butuh waktu 2 hari, pas dikirim klien bilang: "Kemahalan mas, saya bandingin sama sebelah dulu ya." 😭\n\nRugi waktu, bahan material naik diam-diam, tukang nuntut upah harian jalan terus.\n\nDengan Monefyi Estimator, Anda bisa hitung harga modal bahan + upah tukang langsung di HP saat survei lokasi. Klik 1 tombol, PDF penawaran profesional dengan merek Anda langsung meluncur ke WhatsApp klien sebelum Anda pulang. Lebih cepat, dipercaya, anti-boncos!\n\n👉 Amankan lisensinya sekarang dengan promo khusus hari ini.`,
      },
      {
        framework: 'HSO',
        text: `Tahun lalu workshop interior saya hampir kolaps. Orderan keliatan banyak, tapi tiap tutup buku saldo rekening kas selalu tipis.\n\nSetelah diaudit, ternyata bocor di sisa potongan multiplek, aksesoris lambat dihitung, dan biaya tukang lembur yang tidak tercatat di awal.\n\nSekarang pakai Monefyi: rumus meter lari, HPP bahan, upah borongan tukang sudah otomatis. Margin laba bersih terkunci 30%. Hasilnya? Klien kagum penawaran secepat kilat, omset naik tanpa pusing nomboki proyek.`,
      },
      {
        framework: 'BAB',
        text: `DULU: Pulang survei malam, masih lembur buka laptop ketik Excel sampai jam 1 pagi. Besoknya klien batalin sepihak.\n\nSEKARANG: Selesai ukur ruangan di lokasi, input ukuran di HP, PDF resmi terkirim saat itu juga di depan klien. DP masuk sebelum besok pagi!\n\nMonefyi Estimator dirancang khusus untuk pebisnis interior & furniture yang ingin kerja lebih santai tapi hasil maksimal.`,
      },
    ];
    headlines = [
      'Kirim Penawaran Kitchen Set Sebelum Pulang Survei 🚀',
      'Anti Tekor Proyek Interior: Hitung HPP Akurat di HP',
      'Software Wajib Workshop Interior & Kitchen Set 2026',
      'Tinggalkan Excel! Cara Cepat Bikin RAB Rapi & Elegan',
      'Saring Klien Serius Lewat Penawaran Profesional Otomatis',
    ];
    visualBeats = [
      {
        time: '00:00 - 00:03',
        visual: 'Tangan memegang meteran laser di dapur kosong, lalu frustasi melihat laptop penuh rumus Excel rumit.',
        voiceover: 'Masih lembur semalaman cuma buat bikin RAB kitchen set yang akhirnya dighosting klien?',
        onScreenText: 'STOP BIKIN RAB MANUAL! 🛑',
      },
      {
        time: '00:03 - 00:10',
        visual: 'Beralih ke layar HP membuka aplikasi Monefyi. Memilih template Kitchen Set Atas & Bawah, input ukuran panjang.',
        voiceover: 'Tinggalkan cara lama. Sekarang cukup pilih template, ketik ukuran panjang, harga material dan upah tukang langsung keluar otomatis.',
        onScreenText: 'Hitung HPP & Margin di HP 📱',
      },
      {
        time: '00:10 - 00:20',
        visual: 'Klik tombol "Generate PDF", muncul dokumen penawaran rapi lengkap dengan kop nama usaha sendiri dan rincian kerja.',
        voiceover: 'PDF penawaran resmi berlogo workshop Anda langsung jadi dan bisa dikirim ke WA klien sebelum Anda beranjak dari lokasi survei.',
        onScreenText: 'Kirim PDF Rapi Saat Survei 📄✨',
      },
      {
        time: '00:20 - 00:30',
        visual: 'Klien tersenyum menyetujui, notifikasi transfer DP masuk ke layar HP. Logo Monefyi Estimator muncul.',
        voiceover: 'Klien lebih percaya, closing lebih cepat, dan margin laba Anda terkunci aman. Coba Monefyi hari ini!',
        onScreenText: 'AMANKAN PROMO SEKARANG 👉',
      },
    ];
  } else {
    // Kontraktor Umum / Arsitek / Sipil
    title = '🔥 Winning Ad - Kontraktor & Pemborong Bangunan';
    hooks = [
      'Proyek miliaran rupiah tapi pas opname akhir malah minus? Cek 1 kesalahan fatal ini!',
      'Kontraktor cerdas sudah tinggalkan laptop dan buku nota di lapangan sejak ada ini.',
      'Rahasia pemborong menang tender proyek tanpa perlu banting-bantingan harga.',
      'Gara-gara salah rumus di Excel, tekor 40 juta beli semen dan besi. Jangan sampai Anda alami!',
      'Cara bikin RAB rumah 2 lantai tuntas dalam 7 menit dengan rincian material real-time.',
    ];
    primaryTexts = [
      {
        framework: 'PAS',
        text: `Berapa kali Anda tekor di proyek karena harga besi dan semen naik, tapi Anda tidak sempat update perhitungan di penawaran lama?\n\nKlien tidak mau tahu kenaikan harga, upah tukang harian nuntut dibayar tiap Sabtu. Kalau terus begini, Anda kerja keras cuma buat nomboki kontraktor lain!\n\nMonefyi Planner & Estimator adalah senjata rahasia kontraktor modern: buat RAP otomatis, monitor progres lapangan, dan pantau arus kas proyek langsung dari smartphone Anda.\n\nKendalikan keuntungan proyek Anda sebelum terlambat. Klik link di bawah untuk akses langsung!`,
      },
      {
        framework: 'HSO',
        text: `Dulu saya sering bangga menang proyek besar. Tapi pas proyek selesai 100%, sisa uang di rekening proyek cuma cukup buat bayar tukang terakhir. Untung saya ke mana?\n\nTernyata pengeluaran kecil tak terduga, sisa buangan material, dan kasbon tukang yang berceceran menghabiskan seluruh laba bersih.\n\nBegitu beralih ke Monefyi, setiap sak semen dan jam kerja tercatat rapi. Margin profit 18% terkunci dari awal sampai serah terima kunci. Kontraktor tenang, keluarga senang.`,
      },
      {
        framework: 'BAB',
        text: `DULU: Setiap tender pusing kalkulasi rumus Excel berjam-jam, data harga material ketinggalan zaman, resiko salah hitung tinggi.\n\nSEKARANG: Database harga material terstandarisasi, tinggal klik tambah pekerjaan, PDF penawaran siap presentasi ke owner dalam hitungan menit.\n\nJadilah kontraktor profesional yang dipercaya klien kelas atas dengan Monefyi.`,
      },
    ];
    headlines = [
      'Kendalikan Laba Proyek Konstruksi Langsung di HP 🏗️',
      'RAB Akurat 7 Menit, Selamat Tinggal Rumus Excel Rumit',
      'Software Manajemen Proyek & Estimasi Wajib Kontraktor',
      'Cegah Boncos Proyek Bangunan Sebelum Mulai Kerja',
      'Kirim Penawaran Elegan & Profesional ke Calon Owner',
    ];
    visualBeats = [
      {
        time: '00:00 - 00:03',
        visual: 'Tumpukan kertas nota basah dan helm proyek kusam di atas meja, raut muka kontraktor kebingungan mengecek buku kas.',
        voiceover: 'Capek kerja di proyek berbulan-bulan, pas tutup buku malah tekor nomboki material?',
        onScreenText: 'PROYEK RAME TAPI KAS KOSONG? 📉',
      },
      {
        time: '00:03 - 00:10',
        visual: 'Beralih ke rekaman screen HP: membuka proyek di Monefyi, melihat dashboard progres, cashflow, dan RAB terhubung.',
        voiceover: 'Semua kontraktor sukses punya satu kesamaan: mereka tahu persis ke mana perginya setiap rupiah di proyek mereka.',
        onScreenText: 'Kendalikan Proyek Real-Time 🏗️',
      },
      {
        time: '00:10 - 00:20',
        visual: 'Mengetuk fitur Estimator cepat: menghitung volume dinding, beton bertulang, langsung keluar kebutuhan sak semen dan besi.',
        voiceover: 'Dengan Monefyi, estimasi harga modal, kasbon tukang, hingga laporan opname mingguan terkontrol rapi tanpa pusing buka Excel.',
        onScreenText: 'Hitung Volume & Kebutuhan Otomatis ⚡',
      },
      {
        time: '00:20 - 00:30',
        visual: 'Bangunan rumah modern jadi rapi, pemilik proyek bersalaman dengan kontraktor, download Monefyi di App Store / Web.',
        voiceover: 'Tingkatkan reputasi Anda, menangkan tender bergengsi, dan amankan profit proyek Anda mulai sekarang!',
        onScreenText: 'DAPATKAN AKSES SEKARANG 👉',
      },
    ];
  }

  return {
    id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    targetNiche: params.targetNiche,
    angle: params.angle,
    format: params.format,
    hooks,
    primaryTexts,
    headlines,
    ctaText: 'Dapatkan Akses Sekarang',
    videoScript: {
      durationSec: 30,
      visualBeats,
    },
    metricsEstimate: {
      expectedCtr: '2.4% - 3.8%',
      targetCpa: 'Rp 18.000 - Rp 28.000',
    },
    createdAt: new Date().toISOString(),
    savedInBank: false,
  };
}

export function processAgentWarRoomMessage(
  userQuery: string,
  campaigns: MetaCampaign[],
  rules: MarketingAutomationRules
): MarketingChatMessage[] {
  const query = userQuery.toLowerCase();
  const responses: MarketingChatMessage[] = [];
  const now = new Date().toISOString();

  // Scenario 1: Kill bleeding / pause request
  if (query.includes('mati') || query.includes('pause') || query.includes('boncos') || query.includes('kill')) {
    const bleedingCampaigns = campaigns.filter(c => c.healthStatus === 'bleeding' || c.cpa > rules.maxCpaThreshold);
    
    responses.push({
      id: `msg_${Date.now()}_1`,
      sender: 'cmo',
      text: `Siap, Pak/Bu. Saya instruksikan Bima (Media Buyer) untuk memprioritaskan efisiensi anggaran dan mengamankan kas dari kampanye yang membakar budget tanpa konversi memadai.`,
      timestamp: now,
    });

    if (bleedingCampaigns.length > 0) {
      const names = bleedingCampaigns.map(c => `• **${c.name}** (CPA: Rp ${c.cpa.toLocaleString('id-ID')} | ROAS: ${c.roas}x)`).join('\n');
      responses.push({
        id: `msg_${Date.now()}_2`,
        sender: 'media_buyer',
        text: `Lapor, saya sudah mengidentifikasi ${bleedingCampaigns.length} kampanye yang CPA-nya melebihi batas toleransi kita (Rp ${rules.maxCpaThreshold.toLocaleString('id-ID')}):\n\n${names}\n\nSaya telah mengeksekusi perintah **PAUSE** agar budget tidak bocor. Penghematan harian sekitar Rp ${bleedingCampaigns.reduce((acc, c) => acc + c.dailyBudget, 0).toLocaleString('id-ID')}/hari.`,
        timestamp: now,
        actionTaken: {
          type: 'pause_campaign',
          details: `Mematikan ${bleedingCampaigns.length} kampanye bleeding`,
        },
      });
    } else {
      responses.push({
        id: `msg_${Date.now()}_2`,
        sender: 'media_buyer',
        text: `Semua kampanye saat ini masih berada di bawah batas maksimal CPA (Rp ${rules.maxCpaThreshold.toLocaleString('id-ID')}). Tidak ada iklan bleeding akut yang perlu dimatikan darurat.`,
        timestamp: now,
      });
    }
    return responses;
  }

  // Scenario 2: Scale winning campaign
  if (query.includes('scale') || query.includes('naikkan') || query.includes('tambah budget') || query.includes('winning')) {
    const winningCampaigns = campaigns.filter(c => c.healthStatus === 'winning' || c.healthStatus === 'scale_ready' || c.roas >= 3.0);
    
    responses.push({
      id: `msg_${Date.now()}_1`,
      sender: 'cmo',
      text: `Sangat setuju! Kita ada momentum positif pada beberapa kampanye dengan ROAS di atas 3x. Saya minta Bima eksekusi vertical scale bertahap (+20%) agar tidak merusak learning phase Meta AI.`,
      timestamp: now,
    });

    if (winningCampaigns.length > 0) {
      const details = winningCampaigns.map(c => {
        const newBudget = Math.round(c.dailyBudget * 1.2);
        return `• **${c.name}**: Rp ${c.dailyBudget.toLocaleString('id-ID')} ➔ **Rp ${newBudget.toLocaleString('id-ID')}/hari** (ROAS: ${c.roas}x | CPA: Rp ${c.cpa.toLocaleString('id-ID')})`;
      }).join('\n');

      responses.push({
        id: `msg_${Date.now()}_2`,
        sender: 'media_buyer',
        text: `Penyesuaian anggaran berhasil diaplikasikan ke ${winningCampaigns.length} kampanye winning:\n\n${details}\n\nKenaikan 20% ini aman dari lonjakan CPM tiba-tiba. Kami pantau kestabilannya dalam 24 jam ke depan.`,
        timestamp: now,
        actionTaken: {
          type: 'scale_budget',
          details: `Menaikkan budget 20% pada ${winningCampaigns.length} winning campaigns`,
        },
      });
    }
    return responses;
  }

  // Scenario 3: Creative / Copy / Hook request
  if (query.includes('hook') || query.includes('iklan') || query.includes('copy') || query.includes('kreatif') || query.includes('video') || query.includes('reels')) {
    responses.push({
      id: `msg_${Date.now()}_1`,
      sender: 'cmo',
      text: `Ide bagus! Kunci menurunkan CPA di Meta Ads saat ini ada di 3-detik pertama (Thumbstop Rate). Saya serahkan ke Sinta (Creative Strategist) untuk meracik materi iklan winning spesifik audiens Monefyi.`,
      timestamp: now,
    });

    responses.push({
      id: `msg_${Date.now()}_2`,
      sender: 'copywriter',
      text: `Halo, ini 3 formula hook penahan scroll dan angle tajam yang siap diuji:\n\n1. [Hook Emosional]: "Kelihatannya untung 50 juta di depan, pas serah terima kunci malah nomboki 15 juta. Ternyata bocornya di sini..."\n2. [Hook Efisiensi]: "Kirim penawaran RAB berlogo workshop sendiri ke WA klien sebelum Anda pulang dari survei lokasi."\n3. [Hook Kontroversial]: "Hentikan banting harga tender kalau rumus Excel Anda sendiri masih rawan salah hitung!"\n\nDraft naskah video 30 detik sudah tersedia di tab Pabrik Iklan. Silakan pilih format carousel atau video untuk dieksekusi.`,
      timestamp: now,
      actionTaken: {
        type: 'generate_ad',
        details: 'Menghasilkan 3 variasi hook penahan scroll dan konsep video',
      },
    });
    return responses;
  }

  // Scenario 4: Funnel, Scale.co.id, Order Bump, Abandoned Cart
  if (query.includes('scale') || query.includes('bump') || query.includes('upsell') || query.includes('checkout') || query.includes('capi') || query.includes('aov') || query.includes('konversi')) {
    responses.push({
      id: `msg_${Date.now()}_1`,
      sender: 'funnel_aov',
      text: `Laporan optimasi Funnel dan AOV (Model Scale):\n\n1. [Order Bump Checkout]: Tambahkan add-on "Template Database Harga 500+ Material & SOP Proyek 2026" seharga Rp 49.000. Take-rate benchmark mencapai 28-35% sehingga langsung mendongkrak margin transaksi.\n2. [Meta Conversions API (CAPI)]: CAPI server-side aktif dengan Event Match Quality 8.6/10 untuk meminimalkan kebocoran data di browser.\n3. [Follow-up Abandoned Checkout]: Calon pembeli yang mengisi nomor WhatsApp namun belum menyelesaikan pembayaran dapat di-follow up otomatis via pesan pengingat.`,
      timestamp: now,
    });
    return responses;
  }

  // Default General Advice from CMO
  responses.push({
    id: `msg_${Date.now()}_1`,
    sender: 'cmo',
    text: `Saya Mas Danu, CMO Tim Marketing. Bersama Bima (Media Buyer), Sinta (Creative Strategist), dan Aris (Funnel Specialist), kami mengawal seluruh funnel pemasaran:\n\n- Media Buyer: Memantau metrik Meta Ads, mematikan iklan boncos, dan scaling iklan winning.\n- Creative Strategist: Menyusun hook 3-detik, teks penawaran, dan naskah video.\n- Funnel Specialist: Mengoptimalkan Order Bump, Upsell OTO, dan penanganan checkout tertunda.\n\nSilakan tentukan fokus instruksi Anda.`,
    timestamp: now,
  });

  return responses;
}

export interface MarketingSystemAudit {
  isFullyIntegrated: boolean;
  score: number; // 0 - 100
  metaStatus: {
    connected: boolean;
    label: string;
    detail: string;
  };
  aiStatus: {
    connected: boolean;
    provider: string;
    model: string;
    detail: string;
  };
  capiStatus: {
    connected: boolean;
    emq: number;
    detail: string;
  };
  detectedIssues: {
    severity: 'critical' | 'warning' | 'info';
    agent: MarketingAgentRole;
    title: string;
    diagnosis: string;
    actionableFix: string;
  }[];
}

export function analyzeMarketingSystemIntegrations(
  apiConfig: {
    metaAccessToken?: string;
    adAccountId?: string;
    pixelId?: string;
    capiAccessToken?: string;
    aiProvider?: string;
    aiApiKey?: string;
  },
  campaigns: MetaCampaign[],
  rules: MarketingAutomationRules
): MarketingSystemAudit {
  const issues: MarketingSystemAudit['detectedIssues'] = [];
  let score = 100;

  const hasMetaToken = Boolean(apiConfig.metaAccessToken?.trim() || apiConfig.capiAccessToken?.trim());
  const hasAdAccount = Boolean(apiConfig.adAccountId?.trim());
  const hasPixel = Boolean(apiConfig.pixelId?.trim());
  const hasCapiToken = Boolean(apiConfig.capiAccessToken?.trim() || apiConfig.metaAccessToken?.trim());
  const hasAiKey = Boolean(apiConfig.aiApiKey?.trim());

  // Check 1: Meta Credentials
  if (!hasMetaToken || !hasAdAccount) {
    score -= 25;
    issues.push({
      severity: 'warning',
      agent: 'media_buyer',
      title: 'Meta Graph API Berjalan di Mode Simulator',
      diagnosis: 'Access Token atau Ad Account ID belum diisi. Saat ini tabel menampilkan data benchmark sandbox Monefyi.',
      actionableFix: 'Buka menu Konfigurasi & Rules, masukkan Access Token dari Meta Business Developer dan Ad Account ID (format: act_xxxxxxxx).',
    });
  }

  // Check 2: Conversions API (CAPI)
  if (!hasCapiToken || !hasPixel) {
    score -= 15;
    issues.push({
      severity: 'warning',
      agent: 'funnel_aov',
      title: 'Meta Conversions API (CAPI) Server-Side Belum Aktif',
      diagnosis: 'Hanya pixel browser yang aktif tanpa token CAPI server. Sekitar 18-25% konversi dari pengguna iOS 14+ dan browser dengan ad-blocker bisa hilang dari pelaporan Meta.',
      actionableFix: 'Generate Conversions API Access Token di Meta Events Manager dan tempelkan ke konfigurasi CAPI.',
    });
  }

  // Check 3: AI Provider BYOK
  if (!hasAiKey) {
    score -= 10;
    issues.push({
      severity: 'info',
      agent: 'cmo',
      title: 'Kunci AI Provider Eksternal Belum Terpasang',
      diagnosis: 'Sistem War Room saat ini menggunakan mesin penalaran lokal built-in. Untuk integrasi model Gemini 2.5 Pro / Claude 3.7 Sonnet / OpenRouter Luna, pasang API Key Anda.',
      actionableFix: 'Pilih provider AI di pengaturan dan simpan API Key untuk mengaktifkan model reasoning tingkat tinggi.',
    });
  }

  // Check 4: Campaign Performance / Funnel Bleeding (OCLP & Bleeding)
  const bleedingCamps = campaigns.filter(c => c.healthStatus === 'bleeding');
  if (bleedingCamps.length > 0) {
    score -= 15;
    issues.push({
      severity: 'critical',
      agent: 'media_buyer',
      title: `Terdeteksi ${bleedingCamps.length} Kampanye Boncos (Bleeding)`,
      diagnosis: `Kampanye "${bleedingCamps[0].name}" memiliki CPA Rp ${bleedingCamps[0].cpa.toLocaleString('id-ID')}, melebihi ambang batas toleransi Anda (Rp ${rules.maxCpaThreshold.toLocaleString('id-ID')}).`,
      actionableFix: 'Klik tombol Matikan Kampanye Boncos atau turunkan budgetnya sekarang untuk menghentikan pembakaran saldo iklan.',
    });
  }

  const lowOclpCamps = campaigns.filter(c => (c.oclpRate || 0) > 0 && (c.oclpRate || 0) < 70);
  if (lowOclpCamps.length > 0) {
    score -= 10;
    issues.push({
      severity: 'warning',
      agent: 'funnel_aov',
      title: 'Rasio OCLP Di Bawah 70% (Indikasi Landing Page Lemot)',
      diagnosis: `Pada kampanye "${lowOclpCamps[0].name}", rasio Outbound Click ke Landing Page View hanya ${lowOclpCamps[0].oclpRate}%. Lebih dari 30% orang klik iklan tapi menutup browser sebelum halaman selesai loading.`,
      actionableFix: 'Optimalkan kompresi gambar landing page dan gunakan CDN agar loading time di bawah 1.8 detik.',
    });
  }

  return {
    isFullyIntegrated: hasMetaToken && hasAdAccount && hasPixel && hasCapiToken,
    score: Math.max(20, score),
    metaStatus: {
      connected: hasMetaToken && hasAdAccount,
      label: hasMetaToken && hasAdAccount ? 'Meta API Terhubung (Live)' : 'Simulator Mode Aktif',
      detail: hasMetaToken && hasAdAccount ? `Ad Account: ${apiConfig.adAccountId}` : 'Sandbox Benchmark Monefyi',
    },
    aiStatus: {
      connected: true,
      provider: apiConfig.aiProvider || 'Built-in Reasoning Engine',
      model: hasAiKey ? 'External Model Live' : 'Autonomous Engine',
      detail: hasAiKey ? 'BYOK API Key Aktif' : 'Engine Standar Aktif',
    },
    capiStatus: {
      connected: hasPixel && hasCapiToken,
      emq: hasCapiToken ? 8.6 : 5.2,
      detail: hasCapiToken ? 'Server-Side Redundancy 98%' : 'Hanya Pixel Browser',
    },
    detectedIssues: issues,
  };
}

export interface VideoAuditInput {
  title: string;
  targetNiche: string;
  videoUrl?: string;
  scriptOrDescription: string;
  currentMetricsIssue?: string;
}

export function auditVideoAdContent(input: VideoAuditInput): VideoAuditReport {
  const isInterior = input.targetNiche.toLowerCase().includes('interior') || input.targetNiche.toLowerCase().includes('kitchen');
  const issueLower = (input.currentMetricsIssue || '').toLowerCase();
  const descLower = input.scriptOrDescription.toLowerCase();

  // Basic diagnostic heuristics
  let thumbstopScore = 58;
  let retentionScore = 52;
  let clarityScore = 72;
  let offerScore = 65;

  if (descLower.includes('stop') || descLower.includes('tekor') || descLower.includes('bocor') || descLower.includes('rahasia')) {
    thumbstopScore += 18;
  }
  if (descLower.includes('pdf') || descLower.includes('hp') || descLower.includes('demo') || descLower.includes('otomatis')) {
    clarityScore += 14;
  }
  if (issueLower.includes('ctr rendah') || issueLower.includes('scroll lewat')) {
    thumbstopScore = Math.min(thumbstopScore, 48);
  }
  if (issueLower.includes('drop') || issueLower.includes('nonton bentar')) {
    retentionScore = Math.min(retentionScore, 42);
  }

  const overallScore = Math.round((thumbstopScore * 0.35) + (retentionScore * 0.25) + (clarityScore * 0.2) + (offerScore * 0.2));

  let hookVerdict = 'Hook 3 detik pertama masih kurang kontras. Penonton di feed/reels butuh pemicu emosi kuat (rasa takut rugi atau kepraktisan luar biasa) agar tidak langsung menggeser layar.';
  if (thumbstopScore >= 75) {
    hookVerdict = 'Hook pembuka sudah cukup menggigit dengan menyinggung pain-point nyata!';
  }

  let dropOffWarning = 'Ada indikasi jeda tempo di detik 04 - 12 (terlalu banyak penjelasan konsep sebelum memperlihatkan layar aplikasi di HP). Penonton digital mudah bosan jika tidak langsung melihat bukti nyata.';
  let proofVerdict = 'Demonstrasi kepraktisan fitur di HP sudah bagus, namun kop PDF berlogo sendiri perlu di-zoom lebih dekat untuk menonjolkan prestige profesional.';
  let ctaVerdict = 'Call to Action di akhir video perlu dipertegas dengan batasan waktu promo atau penawaran add-on khusus.';

  let newHooks: string[] = [];
  let bRollSuggestions: string[] = [];
  let revisedVoiceover = '';
  let onScreenTextFixes: string[] = [];

  if (isInterior) {
    newHooks = [
      'Stop bikin penawaran kitchen set seharian cuma buat dighosting klien!',
      'Kelihatannya proyek interior untung 30 juta, pas serah terima malah nombok 7 juta. Ini sebabnya...',
      'Cara cerdas workshop interior kirim PDF resmi berlogo sendiri sebelum pulang survei lokasi.',
    ];
    bRollSuggestions = [
      'Detik 01: Close-up meteran laser menempel di sudut dapur kosong dengan teks merah tebal.',
      'Detik 06: Tangan mengetik ukuran di smartphone, angka HPP langsung terhitung otomatis.',
      'Detik 16: Notifikasi WhatsApp terkirim dan klien tersenyum melihat lembar penawaran rapi.',
    ];
    revisedVoiceover = `Berapa kali Anda lembur semalaman bikin RAB kitchen set, tapi besoknya klien bilang "kemahalan ya mas"?\n\nTinggalkan cara lama. Dengan Monefyi Estimator, input ukuran ruangan di HP saat survei, hitung HPP bahan dan ongkos tukang langsung beres.\n\nKlik 1 tombol, PDF resmi berlogo workshop Anda langsung terkirim ke WA klien sebelum Anda pulang. Dapatkan promo lisensinya hari ini!`;
    onScreenTextFixes = [
      'Ubah teks pembuka jadi: "STOP LEMBUR BIKIN RAB KITCHEN SET! 🛑"',
      'Di detik 10 pasang teks: "Hitung HPP & Upah Tukang di HP 📱"',
      'Di penutup pasang teks: "KLIK LINK DI BAWAH UNTUK AMANKAN PROMO 👉"',
    ];
  } else {
    newHooks = [
      'Proyek miliaran rupiah tapi pas opname akhir rekening kas malah kosong? Cek 1 kebocoran ini!',
      'Kontraktor modern sudah tinggalkan buku nota basah dan rumus Excel rumit sejak pakai ini.',
      'Rahasia pemborong menang tender tanpa banting harga dan anti boncos saat harga material naik.',
    ];
    bRollSuggestions = [
      'Detik 01: Raut muka kontraktor mengecek kertas nota berantakan di meja proyek.',
      'Detik 07: Tampilan layar HP membuka dashboard proyek Monefyi (progres fisik vs pengeluaran kas).',
      'Detik 20: Bangunan selesai rapi dan tanda tangan serah terima kunci.',
    ];
    revisedVoiceover = `Pernah ngalamin proyek rame tapi pas tutup buku saldo kas habis buat nomboki semen dan besi?\n\nTernyata pengeluaran kecil tak terduga dan rumus Excel lama yang bikin margin profit Anda amblas!\n\nMonefyi Planner mengunci margin Anda dari awal: hitung RAP otomatis, pantau progres lapangan, dan kendalikan pengeluaran harian langsung di genggaman.\n\nCegah tekor di proyek berikutnya. Coba Monefyi sekarang!`;
    onScreenTextFixes = [
      'Ganti teks pembuka jadi: "PROYEK RAME TAPI KAS TEKOR? 📉"',
      'Di detik 08 sisipkan teks: "RAP & Arus Kas Terkunci Otomatis 🏗️"',
      'Di detik akhir sisipkan teks: "AMANKAN AKSES MONEFYI HARI INI 👉"',
    ];
  }

  return {
    id: `audit_${Date.now()}`,
    videoTitle: input.title || 'Video Iklan Meta Ads',
    targetNiche: input.targetNiche,
    currentIssue: input.currentMetricsIssue || 'Optimasi Winning Ads',
    overallScore,
    breakdown: {
      thumbstopScore,
      retentionScore,
      clarityScore,
      offerScore,
    },
    keyFindings: {
      hookVerdict,
      dropOffWarning,
      proofVerdict,
      ctaVerdict,
    },
    recommendedFixes: {
      newHooks,
      bRollSuggestions,
      revisedVoiceover,
      onScreenTextFixes,
    },
    auditedAt: new Date().toISOString(),
  };
}


