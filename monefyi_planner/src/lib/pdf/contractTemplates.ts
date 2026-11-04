/**
 * Template Surat Perjanjian Kerja (MoU) — teks klausul + gaya desain PDF.
 * Klausul memakai placeholder {{key}} yang diganti saat generate, sehingga
 * pengguna bebas mengedit teks tanpa kehilangan pengisian otomatis.
 */

export type ContractDesign = 'formal' | 'modern' | 'minimal' | 'bold';

export interface ContractClause {
  id: string;
  title: string;
  body: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  tagline: string;
  /** Cocok untuk apa — ditampilkan di kartu pilihan. */
  tags: string[];
  design: ContractDesign;
  accent: string;
  /** Default nilai bidang khusus template. */
  defaults: {
    durationDays: number;
    warrantyDays: number;
    penaltyPct: number;
    retentionPct: number;
    revisionCount: number;
  };
  clauses: ContractClause[];
}

/** Daftar placeholder yang tersedia untuk bantuan pengguna di editor. */
export const CONTRACT_PLACEHOLDERS: Array<{ key: string; label: string }> = [
  { key: 'vendor_company', label: 'Nama perusahaan vendor' },
  { key: 'vendor_name', label: 'Nama perwakilan vendor' },
  { key: 'client_name', label: 'Nama klien' },
  { key: 'project_title', label: 'Judul proyek' },
  { key: 'project_address', label: 'Lokasi pekerjaan' },
  { key: 'contract_value', label: 'Nilai perjanjian (Rp)' },
  { key: 'contract_value_words', label: 'Nilai dalam terbilang' },
  { key: 'payment_terms', label: 'Skema pembayaran otomatis' },
  { key: 'bank_info', label: 'Rekening pembayaran' },
  { key: 'start_date', label: 'Tanggal mulai' },
  { key: 'end_date', label: 'Tanggal selesai' },
  { key: 'duration_days', label: 'Durasi (hari)' },
  { key: 'warranty_days', label: 'Garansi (hari)' },
  { key: 'penalty_pct', label: 'Denda per hari (%)' },
  { key: 'retention_pct', label: 'Retensi (%)' },
  { key: 'revision_count', label: 'Jumlah revisi' },
  { key: 'jurisdiction', label: 'Domisili hukum' },
  { key: 'estimation_code', label: 'Kode estimasi' },
];

const c = (id: string, title: string, body: string): ContractClause => ({ id, title, body });

const CLAUSE_SCOPE = c(
  'scope',
  'Ruang Lingkup Pekerjaan',
  `PIHAK PERTAMA setuju untuk melaksanakan pekerjaan "{{project_title}}" milik PIHAK KEDUA yang berlokasi di {{project_address}}.
Rincian pekerjaan, volume, dan harga satuan mengacu pada Penawaran No. {{estimation_code}} serta Lampiran A perjanjian ini, yang merupakan satu kesatuan yang tidak terpisahkan.
{{scope}}`,
);

const CLAUSE_VALUE = c(
  'value',
  'Nilai Perjanjian',
  `Nilai pekerjaan yang disepakati adalah sebesar {{contract_value}} ({{contract_value_words}} rupiah).
Nilai tersebut bersifat tetap sesuai lingkup pekerjaan dalam Pasal 1, kecuali terdapat pekerjaan tambah/kurang yang disepakati tertulis oleh kedua belah pihak.`,
);

const CLAUSE_PAYMENT = c(
  'payment',
  'Cara Pembayaran',
  `{{payment_terms}}
Seluruh pembayaran dilakukan melalui transfer ke rekening PIHAK PERTAMA: {{bank_info}}.
Bukti transfer dikirimkan kepada PIHAK PERTAMA, dan PIHAK PERTAMA menerbitkan kwitansi sebagai tanda terima pembayaran.`,
);

const CLAUSE_TIME = c(
  'time',
  'Jangka Waktu Pelaksanaan',
  `Pekerjaan dimulai pada {{start_date}} dan diselesaikan dalam waktu {{duration_days}} hari kalender, yaitu paling lambat {{end_date}}.
Jangka waktu dihitung sejak DP diterima dan lokasi pekerjaan siap digunakan oleh PIHAK PERTAMA.`,
);

const CLAUSE_OBLIG_VENDOR = c(
  'vendor_duty',
  'Hak dan Kewajiban PIHAK PERTAMA',
  `PIHAK PERTAMA berkewajiban:
a. Melaksanakan pekerjaan sesuai spesifikasi, mutu, dan jadwal yang disepakati.
b. Menyediakan tenaga kerja, bahan, dan peralatan yang diperlukan.
c. Menjaga kebersihan, keamanan, dan ketertiban selama pekerjaan berlangsung.
d. Menginformasikan perkembangan pekerjaan kepada PIHAK KEDUA secara berkala.
PIHAK PERTAMA berhak menerima pembayaran sesuai skema pada Pasal 3.`,
);

const CLAUSE_OBLIG_CLIENT = c(
  'client_duty',
  'Hak dan Kewajiban PIHAK KEDUA',
  `PIHAK KEDUA berkewajiban:
a. Melakukan pembayaran sesuai jumlah dan waktu yang disepakati.
b. Menyediakan akses lokasi, air, dan listrik yang dibutuhkan selama pekerjaan.
c. Memberikan keputusan, persetujuan, atau data yang diperlukan tepat waktu.
PIHAK KEDUA berhak menerima hasil pekerjaan yang sesuai dengan kesepakatan dan menyampaikan keberatan secara tertulis.`,
);

const CLAUSE_CHANGE = c(
  'change',
  'Perubahan Pekerjaan',
  `Setiap penambahan atau pengurangan pekerjaan harus disepakati tertulis (addendum) oleh kedua belah pihak, termasuk dampaknya terhadap biaya dan jangka waktu.
Pekerjaan tambahan yang dilakukan tanpa persetujuan tertulis tidak menjadi tanggung jawab PIHAK KEDUA.`,
);

const CLAUSE_PENALTY = c(
  'penalty',
  'Keterlambatan dan Denda',
  `Apabila PIHAK PERTAMA terlambat menyelesaikan pekerjaan bukan karena keadaan memaksa atau keterlambatan dari PIHAK KEDUA, maka PIHAK PERTAMA dikenakan denda sebesar {{penalty_pct}}% per hari dari nilai perjanjian, dengan batas maksimal 5% dari nilai perjanjian.
Apabila PIHAK KEDUA terlambat melakukan pembayaran, jadwal pekerjaan dapat ditunda sebesar jumlah hari keterlambatan tersebut.`,
);

const CLAUSE_WARRANTY = c(
  'warranty',
  'Garansi Pekerjaan',
  `PIHAK PERTAMA memberikan garansi atas hasil pekerjaan selama {{warranty_days}} hari sejak serah terima.
Garansi mencakup perbaikan atas cacat pekerjaan akibat kesalahan pengerjaan, dan tidak mencakup kerusakan akibat pemakaian tidak wajar, bencana, atau perubahan oleh pihak lain.`,
);

const CLAUSE_FORCE = c(
  'force',
  'Keadaan Memaksa (Force Majeure)',
  `Keadaan memaksa adalah peristiwa di luar kendali para pihak, seperti bencana alam, kebakaran, banjir, huru-hara, atau kebijakan pemerintah yang menghambat pekerjaan.
Pihak yang terdampak wajib memberitahukan pihak lainnya secara tertulis dalam waktu 3 (tiga) hari, dan jadwal pekerjaan disesuaikan secara musyawarah.`,
);

const CLAUSE_TERMINATE = c(
  'terminate',
  'Pembatalan dan Pemutusan Perjanjian',
  `Perjanjian dapat diakhiri apabila salah satu pihak melanggar ketentuan perjanjian dan tidak memperbaikinya dalam 7 (tujuh) hari setelah teguran tertulis.
Dalam hal pembatalan oleh PIHAK KEDUA, pembayaran yang telah diterima tidak dikembalikan sebatas pekerjaan, bahan, dan biaya yang telah dikeluarkan PIHAK PERTAMA.`,
);

const CLAUSE_DISPUTE = c(
  'dispute',
  'Penyelesaian Perselisihan',
  `Perselisihan yang timbul akan diselesaikan secara musyawarah untuk mufakat.
Apabila tidak tercapai kesepakatan, para pihak memilih domisili hukum di Kepaniteraan Pengadilan Negeri {{jurisdiction}}.`,
);

const CLAUSE_CLOSING = c(
  'closing',
  'Penutup',
  `Perjanjian ini dibuat dalam 2 (dua) rangkap bermaterai cukup, masing-masing mempunyai kekuatan hukum yang sama dan dipegang oleh masing-masing pihak.
Perjanjian ini berlaku sejak ditandatangani oleh kedua belah pihak.`,
);

/* ---------- Interior / kitchen set ---------- */

const INTERIOR_DESIGN = c(
  'design',
  'Desain dan Persetujuan Gambar Kerja',
  `PIHAK PERTAMA menyiapkan gambar kerja/desain yang wajib disetujui PIHAK KEDUA sebelum produksi dimulai.
Revisi desain diberikan maksimal {{revision_count}} kali tanpa biaya tambahan. Revisi berikutnya atau perubahan setelah produksi berjalan dikenakan biaya tambahan.
Gambar yang telah disetujui menjadi acuan serah terima pekerjaan.`,
);

const INTERIOR_MATERIAL = c(
  'material',
  'Material dan Finishing',
  `Material, warna, dan finishing mengikuti spesifikasi pada penawaran dan sampel yang disetujui.
Perbedaan ringan pada serat, corak, atau tone warna akibat sifat alami material dan perbedaan layar/pencahayaan merupakan toleransi yang wajar dan bukan cacat pekerjaan.`,
);

const INTERIOR_INSTALL = c(
  'install',
  'Produksi, Pengiriman, dan Instalasi',
  `Produksi dilakukan setelah desain disetujui dan DP diterima. Pengiriman dan instalasi dijadwalkan bersama PIHAK KEDUA.
PIHAK KEDUA memastikan area instalasi siap (dinding rata, instalasi listrik/air sesuai gambar) agar pemasangan berjalan lancar.`,
);

/* ---------- Renovasi / konstruksi ---------- */

const BUILD_PROGRESS = c(
  'progress',
  'Progres dan Pengawasan',
  `PIHAK PERTAMA melaporkan progres pekerjaan secara berkala (foto/laporan) kepada PIHAK KEDUA.
PIHAK KEDUA atau wakilnya berhak meninjau lokasi pekerjaan dengan pemberitahuan terlebih dahulu dan menyampaikan catatan perbaikan secara tertulis.`,
);

const BUILD_HANDOVER = c(
  'handover',
  'Serah Terima dan Masa Pemeliharaan',
  `Serah terima pekerjaan dituangkan dalam Berita Acara Serah Terima setelah pekerjaan selesai dan diperiksa bersama.
Retensi sebesar {{retention_pct}}% dari nilai perjanjian ditahan selama masa pemeliharaan {{warranty_days}} hari dan dibayarkan setelah seluruh catatan perbaikan diselesaikan.`,
);

const BUILD_SAFETY = c(
  'safety',
  'Keselamatan Kerja dan Pihak Ketiga',
  `PIHAK PERTAMA bertanggung jawab atas keselamatan pekerja dan wajib mematuhi tata tertib lingkungan setempat.
Kerugian terhadap pihak ketiga yang timbul akibat kelalaian PIHAK PERTAMA menjadi tanggung jawab PIHAK PERTAMA.`,
);

/* ---------- Template lengkap ---------- */

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'borongan',
    name: 'Borongan Standar',
    tagline: 'Perjanjian kerja borongan klasik, lengkap dan formal',
    tags: ['Kontraktor', 'Umum'],
    design: 'formal',
    accent: '#1e3a8a',
    defaults: { durationDays: 30, warrantyDays: 30, penaltyPct: 0.1, retentionPct: 0, revisionCount: 2 },
    clauses: [
      CLAUSE_SCOPE,
      CLAUSE_VALUE,
      CLAUSE_PAYMENT,
      CLAUSE_TIME,
      CLAUSE_OBLIG_VENDOR,
      CLAUSE_OBLIG_CLIENT,
      CLAUSE_CHANGE,
      CLAUSE_PENALTY,
      CLAUSE_WARRANTY,
      CLAUSE_FORCE,
      CLAUSE_TERMINATE,
      CLAUSE_DISPUTE,
      CLAUSE_CLOSING,
    ],
  },
  {
    id: 'interior',
    name: 'Interior & Kitchen Set',
    tagline: 'Ada tahap desain, revisi, material, produksi & instalasi',
    tags: ['Interior', 'Kitchen set', 'Furniture'],
    design: 'modern',
    accent: '#059669',
    defaults: { durationDays: 45, warrantyDays: 365, penaltyPct: 0.1, retentionPct: 0, revisionCount: 2 },
    clauses: [
      CLAUSE_SCOPE,
      INTERIOR_DESIGN,
      INTERIOR_MATERIAL,
      CLAUSE_VALUE,
      CLAUSE_PAYMENT,
      CLAUSE_TIME,
      INTERIOR_INSTALL,
      CLAUSE_OBLIG_VENDOR,
      CLAUSE_OBLIG_CLIENT,
      CLAUSE_CHANGE,
      CLAUSE_PENALTY,
      CLAUSE_WARRANTY,
      CLAUSE_FORCE,
      CLAUSE_DISPUTE,
      CLAUSE_CLOSING,
    ],
  },
  {
    id: 'ringkas',
    name: 'Jasa Ringkas',
    tagline: 'Satu halaman, cukup untuk proyek kecil & kesepakatan cepat',
    tags: ['Proyek kecil', 'Cepat'],
    design: 'minimal',
    accent: '#111827',
    defaults: { durationDays: 14, warrantyDays: 14, penaltyPct: 0, retentionPct: 0, revisionCount: 1 },
    clauses: [
      c(
        'scope',
        'Pekerjaan',
        `PIHAK PERTAMA mengerjakan "{{project_title}}" di {{project_address}} sesuai Penawaran No. {{estimation_code}}.
{{scope}}`,
      ),
      c(
        'value_payment',
        'Nilai dan Pembayaran',
        `Nilai pekerjaan {{contract_value}} ({{contract_value_words}} rupiah).
{{payment_terms}}
Pembayaran melalui transfer ke {{bank_info}}.`,
      ),
      c(
        'time',
        'Waktu Pengerjaan',
        `Dimulai {{start_date}}, selesai maksimal {{end_date}} ({{duration_days}} hari kalender).`,
      ),
      c(
        'change',
        'Perubahan Pekerjaan',
        `Perubahan atau tambahan pekerjaan disepakati tertulis (termasuk pengaruh biaya dan waktu).`,
      ),
      c(
        'warranty',
        'Garansi',
        `Garansi pekerjaan {{warranty_days}} hari sejak selesai untuk cacat akibat kesalahan pengerjaan.`,
      ),
      c(
        'cancel',
        'Pembatalan',
        `Jika dibatalkan sepihak oleh PIHAK KEDUA, pembayaran yang sudah masuk dipakai untuk biaya pekerjaan dan bahan yang telah berjalan.`,
      ),
      c(
        'dispute',
        'Penyelesaian Perselisihan',
        `Diselesaikan secara musyawarah. Jika tidak tercapai, ditempuh melalui Pengadilan Negeri {{jurisdiction}}.`,
      ),
    ],
  },
  {
    id: 'renovasi',
    name: 'Renovasi & Konstruksi',
    tagline: 'Termasuk progres, retensi, serah terima & keselamatan kerja',
    tags: ['Renovasi', 'Bangun rumah', 'Ruko'],
    design: 'bold',
    accent: '#c2410c',
    defaults: { durationDays: 60, warrantyDays: 90, penaltyPct: 0.1, retentionPct: 5, revisionCount: 2 },
    clauses: [
      CLAUSE_SCOPE,
      CLAUSE_VALUE,
      CLAUSE_PAYMENT,
      CLAUSE_TIME,
      BUILD_PROGRESS,
      CLAUSE_OBLIG_VENDOR,
      CLAUSE_OBLIG_CLIENT,
      BUILD_SAFETY,
      CLAUSE_CHANGE,
      CLAUSE_PENALTY,
      BUILD_HANDOVER,
      CLAUSE_FORCE,
      CLAUSE_TERMINATE,
      CLAUSE_DISPUTE,
      CLAUSE_CLOSING,
    ],
  },
];

export function getContractTemplate(id: string): ContractTemplate {
  return CONTRACT_TEMPLATES.find(t => t.id === id) ?? CONTRACT_TEMPLATES[0];
}

export function cloneClauses(clauses: ContractClause[]): ContractClause[] {
  return clauses.map(cl => ({ ...cl }));
}
