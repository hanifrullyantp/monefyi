/**
 * Human-friendly UI copy — centralized terminology (TASK 4.1).
 * @module constants/language
 */

/** @type {Readonly<object>} */
export const LABELS = {
  NERACA: {
    PAGE_TITLE: 'Posisi Keuangan Saya',
    OWNS: 'Yang Saya Miliki',
    OWES: 'Yang Saya Hutangi & Modal',
    TOTAL_OWNS: 'Total Yang Saya Miliki',
    TOTAL_OWES: 'Total Hutang & Modal',
    BALANCED: 'Posisi Seimbang',
    UNBALANCED: 'Posisi Belum Seimbang',
    RETAINED_EARNINGS: 'Sisa Surplus yang Belum Dialokasikan',
    EQUITY: 'Nilai Bersih Saya',
    SHORTCUT_SUB: 'Lihat posisi keuangan lengkap',
    OWNS_MORE: 'Yang Saya Miliki lebih besar Rp {{amount}} dari Yang Saya Hutangi',
    OWES_MORE: 'Yang Saya Hutangi lebih besar Rp {{amount}} dari Yang Saya Miliki',
    TIP_OWES_SIDE: 'Apakah selisih ini nilai bersih, hutang, atau tabungan yang belum dicatat?',
    TIP_OWNS_SIDE: 'Apakah selisih ini kas/properti/investasi yang belum dicatat?',
  },
  BUDGET: {
    USED: 'Yang sudah dipakai',
    USED_PROGRESS: 'Yang sudah dipakai dari rencana',
    PLAN: 'Rencana',
    ALLOCATION: 'Rencana',
    INCOME: 'Budget Income',
    MATCHED_TX: 'Transaksi yang cocok',
    USED_STATS: '{{used}} Rp {{spent}} · Rencana Rp {{planned}} · Sisa Rp {{remaining}}',
  },
  PRIORITY: {
    harus: 'Tagihan & Kewajiban',
    penting: 'Kebutuhan Hidup',
    mau: 'Pengeluaran Pribadi',
    simpan: 'Tabungan & Masa Depan',
  },
  GENERAL: {
    ESTIMATED_BALANCE: 'Perkiraan Uang Tersisa',
    ESTIMATED_BALANCE_UNTIL: 'Perkiraan uang tersisa sampai {{date}}',
    NET: 'Selisih Masuk - Keluar',
    SAVING_RATE: '% yang berhasil disisihkan',
    INCOME: 'Pemasukan',
    EXPENSE: 'Pengeluaran',
  },
  ERRORS: {
    GENERIC: 'Ada yang tidak beres — coba lagi sebentar ya.',
    NETWORK: 'Koneksi lagi bermasalah. Data aman tersimpan lokal.',
    SAVE_FAILED: 'Belum berhasil disimpan. Cek koneksi lalu coba lagi.',
    LOAD_FAILED: 'Gagal memuat data. Tarik layar untuk refresh.',
    VALIDATION_AMOUNT: 'Nominal harus lebih dari nol.',
    VALIDATION_REQUIRED: 'Isi bagian yang wajib dulu ya.',
  },
  NOTIF: {
    MORNING_AMAN: '☀️ Pagi! Hari ini kamu aman pakai Rp{{amount}}.',
    MORNING_WASPADA: '☀️ Pagi! Hari ini maksimal Rp{{amount}} ya.',
    MORNING_BAHAYA: '⚠️ Pagi! Keuangan bulan ini butuh perhatian.',
    NEW_USER: '☀️ Hari ke-{{day}} bersama Monefyi!',
  },
  DAILY: {
    AMAN_PER_DAY: 'Aman per Hari',
    REALISASI_PER_DAY: 'Realisasi per Hari',
    REALISASI_HARIAN: 'Realisasi harian',
    DAYS_TO_PAYDAY: 'hari ke gajian',
    AMAN_TODAY: 'Hari ini aman pakai',
    CATEGORY_REMAINING: 'Sisa kategori bulan ini',
  },
  COMPARE: {
    NO_PREV_MONTH: 'Belum ada data bulan lalu untuk perbandingan',
  },
};

/**
 * Simple template replace: {{key}} → value.
 * @param {string} template
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(template, vars = {}) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key];
    return v != null ? String(v) : '';
  });
}

/**
 * Priority label for budget pillar key.
 * @param {string} key
 * @returns {string}
 */
export function priorityLabel(key) {
  return LABELS.PRIORITY[key] || key;
}

/**
 * Apply human-friendly priority labels to PRIORITY_LEVELS clone.
 * @param {object} levels
 * @returns {object}
 */
export function applyPriorityLabels(levels) {
  const out = {};
  for (const [k, v] of Object.entries(levels)) {
    const key = v.key || k.toLowerCase();
    out[k] = {
      ...v,
      label: LABELS.PRIORITY[key] || v.label,
    };
  }
  return out;
}
