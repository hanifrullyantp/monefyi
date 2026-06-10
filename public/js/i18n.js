/**
 * Monefyi i18n loader — locales/id.json + locales/en.json
 * Load before app.js; app.js t() delegates here when ready.
 */
(function (global) {
  const EXTRA = {
    id: {
      'toast.undo': 'Urungkan',
      'toast.deleted': 'Transaksi dihapus',
      'toast.saved': 'Transaksi tersimpan',
      'toast.error': 'Terjadi kesalahan',
      'ai.input.placeholder': 'Ketik transaksi… contoh: kopi 45rb gojek',
      'ai.input.voice': 'Input suara',
      'ai.input.photo': 'Foto struk',
      'ai.preview.title': 'Preview transaksi',
      'ai.preview.confidence': 'Keyakinan',
      'ai.preview.save': 'Simpan',
      'ai.preview.edit': 'Edit detail',
      'ai.duplicate.title': 'Transaksi mirip ditemukan',
      'ai.duplicate.skip': 'Lewati',
      'ai.duplicate.save': 'Simpan tetap',
      'health.score': 'Skor kesehatan',
      'health.excellent': 'Sangat baik',
      'health.good': 'Baik',
      'health.fair': 'Perlu perhatian',
      'health.poor': 'Kritis',
      'onboarding.welcome': 'Selamat datang di Monefyi',
      'onboarding.step1': 'Catat transaksi semudah chat — ketik, bicara, atau foto struk.',
      'onboarding.step2': 'Monevisor AI menganalisis keuanganmu dan memberi rekomendasi.',
      'onboarding.step3': 'Atur budget per kategori dan pantau progres bulanan.',
      'onboarding.start': 'Mulai',
      'onboarding.skip': 'Lewati',
      'kbd.search': 'Cari',
      'kbd.new_tx': 'Transaksi baru',
      'tx.empty.title': 'Belum ada transaksi',
      'tx.empty.subtitle': 'Mulai catat pemasukan atau pengeluaran pertamamu',
      'tx.empty.cta': 'Tambah Transaksi Pertama',
      'tx.menu.edit': 'Edit',
      'tx.menu.duplicate': 'Duplikat',
      'tx.menu.delete': 'Hapus',
      'tx.delete.confirm': 'Hapus transaksi ini?',
      'tx.delete.yes': 'Ya, Hapus',
      'tx.delete.no': 'Batal',
      'tx.pending': 'Menyimpan…',
      'sidebar.collapse': 'Ciutkan sidebar',
      'sidebar.expand': 'Lebarkan sidebar',
      'info.saldo_hint': 'Tap kartu saldo untuk detail lengkap',
      'nav.dashboard': 'Dashboard',
      'nav.transactions': 'Semua Transaksi',
      'nav.budget': 'Budgeting',
      'nav.advisor': 'Monevisor (AI)',
      'header.new_tx': 'Transaksi Baru',
      'tx.load_more': 'Muat lebih banyak',
      'tx.swipe.delete': 'Hapus',
      'form.category.suggest': 'Saran',
      'form.category.apply': 'Terapkan',
      'manual.date': 'Tanggal',
      'manual.type': 'Tipe',
      'manual.amount': 'Jumlah (IDR)',
      'manual.category': 'Kategori',
      'manual.account': 'Akun (dari)',
      'manual.to_account': 'Akun (ke)',
      'manual.payment': 'Metode',
      'manual.merchant': 'Merchant',
      'manual.notes': 'Catatan',
      'manual.save': 'Simpan',
    },
    en: {
      'toast.undo': 'Undo',
      'toast.deleted': 'Transaction deleted',
      'toast.saved': 'Transaction saved',
      'toast.error': 'Something went wrong',
      'ai.input.placeholder': 'Type a transaction… e.g. coffee 45k gojek',
      'ai.input.voice': 'Voice input',
      'ai.input.photo': 'Receipt photo',
      'ai.preview.title': 'Transaction preview',
      'ai.preview.confidence': 'Confidence',
      'ai.preview.save': 'Save',
      'ai.preview.edit': 'Edit details',
      'ai.duplicate.title': 'Similar transaction found',
      'ai.duplicate.skip': 'Skip',
      'ai.duplicate.save': 'Save anyway',
      'health.score': 'Health score',
      'health.excellent': 'Excellent',
      'health.good': 'Good',
      'health.fair': 'Needs attention',
      'health.poor': 'Critical',
      'onboarding.welcome': 'Welcome to Monefyi',
      'onboarding.step1': 'Log transactions like chat — type, speak, or snap a receipt.',
      'onboarding.step2': 'Monevisor AI analyzes your finances and recommends actions.',
      'onboarding.step3': 'Set category budgets and track monthly progress.',
      'onboarding.start': 'Get started',
      'onboarding.skip': 'Skip',
      'kbd.search': 'Search',
      'kbd.new_tx': 'New transaction',
      'tx.empty.title': 'No transactions yet',
      'tx.empty.subtitle': 'Start logging your first income or expense',
      'tx.empty.cta': 'Add First Transaction',
      'tx.menu.edit': 'Edit',
      'tx.menu.duplicate': 'Duplicate',
      'tx.menu.delete': 'Delete',
      'tx.delete.confirm': 'Delete this transaction?',
      'tx.delete.yes': 'Yes, delete',
      'tx.delete.no': 'Cancel',
      'tx.pending': 'Saving…',
      'sidebar.collapse': 'Collapse sidebar',
      'sidebar.expand': 'Expand sidebar',
      'info.saldo_hint': 'Tap balance card for full details',
      'nav.dashboard': 'Dashboard',
      'nav.transactions': 'All Transactions',
      'nav.budget': 'Budgeting',
      'nav.advisor': 'Monevisor (AI)',
      'header.new_tx': 'New Transaction',
      'tx.load_more': 'Load more',
      'tx.swipe.delete': 'Delete',
      'form.category.suggest': 'Suggest',
      'form.category.apply': 'Apply',
      'manual.date': 'Date',
      'manual.type': 'Type',
      'manual.amount': 'Amount (IDR)',
      'manual.category': 'Category',
      'manual.account': 'Account (from)',
      'manual.to_account': 'Account (to)',
      'manual.payment': 'Method',
      'manual.merchant': 'Merchant',
      'manual.notes': 'Notes',
      'manual.save': 'Save',
    },
  };

  const cache = { id: null, en: null, ready: false };

  function basePath() {
    const bp = String(global.MONEFYI_CONFIG?.basePath || '').replace(/\/$/, '');
    return bp ? bp + '/' : './';
  }

  async function loadLocales() {
    try {
      const [id, en] = await Promise.all([
        fetch(basePath() + 'locales/id.json').then((r) => (r.ok ? r.json() : {})),
        fetch(basePath() + 'locales/en.json').then((r) => (r.ok ? r.json() : {})),
      ]);
      cache.id = { ...id, ...EXTRA.id };
      cache.en = { ...en, ...EXTRA.en };
      cache.ready = true;
    } catch (e) {
      console.warn('i18n: locale load failed', e);
      cache.id = { ...EXTRA.id };
      cache.en = { ...EXTRA.en };
      cache.ready = true;
    }
  }

  function lookup(lang, key, fallbackObj) {
    const L = lang === 'en' ? 'en' : 'id';
    if (cache.ready && cache[L]?.[key]) return cache[L][key];
    if (fallbackObj?.[L]?.[key]) return fallbackObj[L][key];
    if (fallbackObj?.id?.[key]) return fallbackObj.id[key];
    if (EXTRA[L]?.[key]) return EXTRA[L][key];
    return key;
  }

  function t(key, vars, lang, fallbackI18n) {
    let str = lookup(lang || 'id', key, fallbackI18n);
    if (vars && typeof str === 'string') {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return str;
  }

  function formatMoney(amount, lang) {
    const L = lang === 'en' ? 'en-US' : 'id-ID';
    return new Intl.NumberFormat(L, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
      Number(amount || 0),
    );
  }

  function formatCompactMoney(amount, lang) {
    const n = Number(amount || 0);
    const abs = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    if (lang === 'en') {
      if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
      if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
      if (abs >= 1e3) return sign + (abs / 1e3).toFixed(0) + 'K';
      return sign + String(Math.round(abs));
    }
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1).replace(/\.0$/, '') + ' M';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(1).replace(/\.0$/, '') + ' jt';
    if (abs >= 1e3) return sign + (abs / 1e3).toFixed(0) + ' rb';
    return sign + String(Math.round(abs));
  }

  function applyDataI18n(root, lang, fallbackI18n) {
    const el = root || document;
    el.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (!key) return;
      const val = t(key, null, lang, fallbackI18n);
      if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') node.placeholder = val;
      else node.textContent = val;
    });
    el.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      const key = node.getAttribute('data-i18n-placeholder');
      if (key) node.placeholder = t(key, null, lang, fallbackI18n);
    });
  }

  function mergeIntoI18N(I18N) {
    if (!I18N || !cache.ready) return;
    I18N.id = { ...I18N.id, ...cache.id };
    I18N.en = { ...I18N.en, ...cache.en };
  }

  global.MonefyiI18n = {
    loadLocales,
    t,
    formatMoney,
    formatCompactMoney,
    applyDataI18n,
    mergeIntoI18N,
    EXTRA,
    get ready() {
      return cache.ready;
    },
  };

  loadLocales();
})(window);
