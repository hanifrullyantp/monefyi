
```markdown
# MONEFYI — THEME SYSTEM OVERHAUL
## Perbaikan Menyeluruh Light Mode + Standardisasi Design System

## KONTEKS MASALAH

Light mode saat ini BROKEN:
- Banyak komponen masih pakai warna hardcoded dari dark mode
- Sidebar text putih di background putih (tidak terbaca)
- Kartu-kartu masih dark background di light theme
- Tid``ak ada single source of truth untuk warna
- Setiap komponen dibuat terpisah tanpa referensi design tokens

TUJUAN:
1. Bangun DESIGN TOKEN SYSTEM yang solid
2. Perbaiki SEMUA komponen di light mode
3. Pastikan dark mode tetap konsisten
4. Buat GUIDELINE agar developer/AI kedepan otomatis pakai token yang benar
5. Zero hardcoded colors di komponen

---

## TASK 1: AUDIT MENYELURUH

BACA DAN LAKUKAN:

1. Scan semua file CSS di project
2. Cari SEMUA hardcoded color values:
   - hex colors (#xxxxxx)
   - rgb/rgba values
   - Named colors (white, black, red, dll)
3. Cari SEMUA inline style dengan color
4. List komponen yang tidak responsive terhadap theme

OUTPUT:
Buat file AUDIT_REPORT.md berisi:
- Daftar file dengan hardcoded colors
- Daftar komponen yang broken di light mode
- Prioritas perbaikan

---

## TASK 2: BUILD DESIGN TOKEN SYSTEM

Buat file: styles/tokens.css

STRUKTUR TOKEN:

/* ============================================
   DESIGN TOKENS — SINGLE SOURCE OF TRUTH
   Semua warna, spacing, radius, shadow HARUS
   pakai token ini. Zero hardcoded values.
   ============================================ */

/* ============================================
   COLOR PRIMITIVES (raw colors)
   ============================================ */
:root {
  /* Brand */
  --color-brand-50: #ECFDF5;
  --color-brand-100: #D1FAE5;
  --color-brand-200: #A7F3D0;
  --color-brand-300: #6EE7B7;
  --color-brand-400: #34D399;
  --color-brand-500: #10B981;  /* PRIMARY */
  --color-brand-600: #059669;
  --color-brand-700: #047857;
  --color-brand-800: #065F46;
  --color-brand-900: #064E3B;

  /* Blue (Trust, Info) */
  --color-blue-50: #EFF6FF;
  --color-blue-100: #DBEAFE;
  --color-blue-500: #3B82F6;
  --color-blue-600: #2563EB;
  --color-blue-700: #1D4ED8;

  /* Red (Danger, Expense) */
  --color-red-50: #FEF2F2;
  --color-red-100: #FEE2E2;
  --color-red-500: #EF4444;
  --color-red-600: #DC2626;
  --color-red-700: #B91C1C;

  /* Orange (Warning) */
  --color-orange-50: #FFF7ED;
  --color-orange-100: #FFEDD5;
  --color-orange-500: #F97316;
  --color-orange-600: #EA580C;

  /* Amber (Attention) */
  --color-amber-50: #FFFBEB;
  --color-amber-100: #FEF3C7;
  --color-amber-500: #F59E0B;
  --color-amber-600: #D97706;

  /* Purple (Special) */
  --color-purple-50: #FAF5FF;
  --color-purple-500: #A855F7;
  --color-purple-600: #9333EA;

  /* Neutral (Grays) */
  --color-neutral-0: #FFFFFF;
  --color-neutral-50: #F8FAFC;
  --color-neutral-100: #F1F5F9;
  --color-neutral-200: #E2E8F0;
  --color-neutral-300: #CBD5E1;
  --color-neutral-400: #94A3B8;
  --color-neutral-500: #64748B;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1E293B;
  --color-neutral-900: #0F172A;
  --color-neutral-950: #020617;
}

/* ============================================
   SEMANTIC TOKENS — LIGHT MODE (Default)
   ============================================ */
:root,
[data-theme="light"] {
  /* Backgrounds */
  --bg-primary: var(--color-neutral-0);           /* Main app bg */
  --bg-secondary: var(--color-neutral-50);        /* Section bg */
  --bg-tertiary: var(--color-neutral-100);        /* Nested bg */
  --bg-elevated: var(--color-neutral-0);          /* Cards, modals */
  --bg-overlay: rgba(15, 23, 42, 0.5);           /* Backdrop */
  --bg-inverse: var(--color-neutral-900);         /* Contrast bg */

  /* Text */
  --text-primary: var(--color-neutral-900);       /* Headings, main text */
  --text-secondary: var(--color-neutral-600);     /* Body text */
  --text-tertiary: var(--color-neutral-500);      /* Muted text */
  --text-disabled: var(--color-neutral-400);      /* Disabled */
  --text-inverse: var(--color-neutral-0);         /* On dark bg */
  --text-brand: var(--color-brand-600);           /* Brand color text */
  --text-link: var(--color-blue-600);             /* Links */

  /* Borders */
  --border-subtle: var(--color-neutral-200);      /* Default border */
  --border-default: var(--color-neutral-300);     /* Emphasized */
  --border-strong: var(--color-neutral-400);      /* Strong border */
  --border-focus: var(--color-brand-500);         /* Focus ring */

  /* Interactive */
  --interactive-primary: var(--color-brand-500);
  --interactive-primary-hover: var(--color-brand-600);
  --interactive-primary-active: var(--color-brand-700);
  --interactive-primary-text: var(--color-neutral-0);

  --interactive-secondary: var(--color-neutral-100);
  --interactive-secondary-hover: var(--color-neutral-200);
  --interactive-secondary-text: var(--color-neutral-900);

  /* Status Colors */
  --status-success: var(--color-brand-500);
  --status-success-bg: var(--color-brand-50);
  --status-success-text: var(--color-brand-700);
  --status-success-border: var(--color-brand-200);

  --status-warning: var(--color-amber-500);
  --status-warning-bg: var(--color-amber-50);
  --status-warning-text: var(--color-amber-700);
  --status-warning-border: var(--color-amber-200);

  --status-danger: var(--color-red-500);
  --status-danger-bg: var(--color-red-50);
  --status-danger-text: var(--color-red-700);
  --status-danger-border: var(--color-red-200);

  --status-info: var(--color-blue-500);
  --status-info-bg: var(--color-blue-50);
  --status-info-text: var(--color-blue-700);
  --status-info-border: var(--color-blue-200);

  /* Financial Semantics */
  --finance-income: var(--color-brand-600);
  --finance-income-bg: var(--color-brand-50);
  --finance-expense: var(--color-red-600);
  --finance-expense-bg: var(--color-red-50);
  --finance-neutral: var(--color-neutral-600);
  --finance-savings: var(--color-blue-600);
  --finance-savings-bg: var(--color-blue-50);

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 
               0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 4px 6px rgba(15, 23, 42, 0.05),
               0 2px 4px rgba(15, 23, 42, 0.04);
  --shadow-lg: 0 10px 15px rgba(15, 23, 42, 0.08),
               0 4px 6px rgba(15, 23, 42, 0.04);
  --shadow-xl: 0 20px 25px rgba(15, 23, 42, 0.10),
               0 10px 10px rgba(15, 23, 42, 0.04);
  --shadow-focus: 0 0 0 3px rgba(16, 185, 129, 0.2);

  /* Sidebar Specific */
  --sidebar-bg: var(--color-neutral-0);
  --sidebar-border: var(--color-neutral-200);
  --sidebar-item-text: var(--color-neutral-700);
  --sidebar-item-hover-bg: var(--color-neutral-100);
  --sidebar-item-active-bg: var(--color-brand-50);
  --sidebar-item-active-text: var(--color-brand-700);
  --sidebar-item-active-border: var(--color-brand-500);

  /* Header/Nav Specific */
  --header-bg: var(--color-neutral-0);
  --header-border: var(--color-neutral-200);
  --header-text: var(--color-neutral-900);

  /* Card Specific */
  --card-bg: var(--color-neutral-0);
  --card-border: var(--color-neutral-200);
  --card-shadow: var(--shadow-sm);
  --card-hover-shadow: var(--shadow-md);

  /* Input Specific */
  --input-bg: var(--color-neutral-0);
  --input-border: var(--color-neutral-300);
  --input-border-hover: var(--color-neutral-400);
  --input-border-focus: var(--color-brand-500);
  --input-text: var(--color-neutral-900);
  --input-placeholder: var(--color-neutral-400);
  --input-disabled-bg: var(--color-neutral-100);
}

/* ============================================
   SEMANTIC TOKENS — DARK MODE
   ============================================ */
[data-theme="dark"] {
  /* Backgrounds */
  --bg-primary: var(--color-neutral-950);
  --bg-secondary: var(--color-neutral-900);
  --bg-tertiary: var(--color-neutral-800);
  --bg-elevated: var(--color-neutral-800);
  --bg-overlay: rgba(0, 0, 0, 0.7);
  --bg-inverse: var(--color-neutral-0);

  /* Text */
  --text-primary: var(--color-neutral-50);
  --text-secondary: var(--color-neutral-300);
  --text-tertiary: var(--color-neutral-400);
  --text-disabled: var(--color-neutral-600);
  --text-inverse: var(--color-neutral-900);
  --text-brand: var(--color-brand-400);
  --text-link: var(--color-blue-400);

  /* Borders */
  --border-subtle: var(--color-neutral-800);
  --border-default: var(--color-neutral-700);
  --border-strong: var(--color-neutral-600);
  --border-focus: var(--color-brand-400);

  /* Interactive */
  --interactive-primary: var(--color-brand-500);
  --interactive-primary-hover: var(--color-brand-400);
  --interactive-primary-active: var(--color-brand-600);
  --interactive-primary-text: var(--color-neutral-0);

  --interactive-secondary: var(--color-neutral-800);
  --interactive-secondary-hover: var(--color-neutral-700);
  --interactive-secondary-text: var(--color-neutral-50);

  /* Status Colors — Desaturated for dark mode */
  --status-success: var(--color-brand-400);
  --status-success-bg: rgba(16, 185, 129, 0.1);
  --status-success-text: var(--color-brand-300);
  --status-success-border: rgba(16, 185, 129, 0.3);

  --status-warning: var(--color-amber-400);
  --status-warning-bg: rgba(245, 158, 11, 0.1);
  --status-warning-text: var(--color-amber-300);
  --status-warning-border: rgba(245, 158, 11, 0.3);

  --status-danger: var(--color-red-400);
  --status-danger-bg: rgba(239, 68, 68, 0.1);
  --status-danger-text: var(--color-red-300);
  --status-danger-border: rgba(239, 68, 68, 0.3);

  --status-info: var(--color-blue-400);
  --status-info-bg: rgba(59, 130, 246, 0.1);
  --status-info-text: var(--color-blue-300);
  --status-info-border: rgba(59, 130, 246, 0.3);

  /* Financial */
  --finance-income: var(--color-brand-400);
  --finance-income-bg: rgba(16, 185, 129, 0.1);
  --finance-expense: var(--color-red-400);
  --finance-expense-bg: rgba(239, 68, 68, 0.1);
  --finance-neutral: var(--color-neutral-400);
  --finance-savings: var(--color-blue-400);
  --finance-savings-bg: rgba(59, 130, 246, 0.1);

  /* Shadows — More subtle di dark mode */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5);
  --shadow-focus: 0 0 0 3px rgba(52, 211, 153, 0.3);

  /* Sidebar */
  --sidebar-bg: var(--color-neutral-900);
  --sidebar-border: var(--color-neutral-800);
  --sidebar-item-text: var(--color-neutral-300);
  --sidebar-item-hover-bg: var(--color-neutral-800);
  --sidebar-item-active-bg: rgba(16, 185, 129, 0.15);
  --sidebar-item-active-text: var(--color-brand-400);
  --sidebar-item-active-border: var(--color-brand-500);

  /* Header */
  --header-bg: var(--color-neutral-900);
  --header-border: var(--color-neutral-800);
  --header-text: var(--color-neutral-50);

  /* Card */
  --card-bg: var(--color-neutral-900);
  --card-border: var(--color-neutral-800);
  --card-shadow: var(--shadow-sm);
  --card-hover-shadow: var(--shadow-md);

  /* Input */
  --input-bg: var(--color-neutral-800);
  --input-border: var(--color-neutral-700);
  --input-border-hover: var(--color-neutral-600);
  --input-border-focus: var(--color-brand-500);
  --input-text: var(--color-neutral-50);
  --input-placeholder: var(--color-neutral-500);
  --input-disabled-bg: var(--color-neutral-800);
}

/* ============================================
   SPACING SCALE
   ============================================ */
:root {
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}

/* ============================================
   BORDER RADIUS
   ============================================ */
:root {
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-full: 9999px;
}

/* ============================================
   TYPOGRAPHY
   ============================================ */
:root {
  --font-family-primary: 'Plus Jakarta Sans', -apple-system, 
                         BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Monaco', monospace;

  --font-size-xs: 0.75rem;      /* 12px */
  --font-size-sm: 0.875rem;     /* 14px */
  --font-size-base: 1rem;       /* 16px */
  --font-size-lg: 1.125rem;     /* 18px */
  --font-size-xl: 1.25rem;      /* 20px */
  --font-size-2xl: 1.5rem;      /* 24px */
  --font-size-3xl: 1.875rem;    /* 30px */
  --font-size-4xl: 2.25rem;     /* 36px */
  --font-size-5xl: 3rem;        /* 48px */

  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-tight: 1.2;
  --line-height-snug: 1.375;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.625;
}

/* ============================================
   Z-INDEX SCALE
   ============================================ */
:root {
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;
}

/* ============================================
   TRANSITIONS
   ============================================ */
:root {
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
  --transition-slower: 500ms ease;
}

---

## TASK 3: REFACTOR SEMUA KOMPONEN

ATURAN:
- SEMUA color values HARUS pakai var(--token-name)
- ZERO hardcoded hex/rgb di komponen
- Kalau butuh warna baru → tambah ke tokens.css dulu

CHECKLIST KOMPONEN YANG WAJIB DIREFACTOR:

### 3.1 Sidebar
File: components/sidebar.css

Ganti semua warna dengan token:
- Background: var(--sidebar-bg)
- Border: var(--sidebar-border)
- Text default: var(--sidebar-item-text)
- Text hover: var(--sidebar-item-active-text)
- Bg hover: var(--sidebar-item-hover-bg)
- Bg active: var(--sidebar-item-active-bg)
- Text active: var(--sidebar-item-active-text)
- Border active (left): var(--sidebar-item-active-border)

MASALAH SPESIFIK YANG DILIHAT:
- Text "ADVISOR AI" putih di background putih → FIX pakai var(--text-primary)
- Menu items text putih → FIX pakai var(--sidebar-item-text)
- Icons harus adapt theme

### 3.2 Header
File: components/header.css

- Background: var(--header-bg)
- Border bottom: var(--header-border)
- Title text: var(--text-primary)
- Subtitle: var(--text-secondary)
- Search input: var(--input-bg), var(--input-border)
- User avatar bg: var(--interactive-secondary)
- Notification icon: var(--text-secondary)

MASALAH SPESIFIK:
- "Dashboard" title putih di light mode → FIX
- Search "Cari..." placeholder low contrast → FIX

### 3.3 Kartu Saldo Utama
File: components/balance-card.css

Kartu ini di sidebar (Rp 2.461.000) HARUS adapt theme:

Light mode:
- Background: linear-gradient dari var(--color-brand-50) ke var(--color-neutral-0)
- Border: 1px solid var(--color-brand-200)
- Text label: var(--text-secondary)
- Text nominal: var(--text-primary)
- Chip income: bg var(--finance-income-bg), text var(--finance-income)
- Chip expense: bg var(--finance-expense-bg), text var(--finance-expense)

Dark mode:
- Background: linear-gradient dari var(--color-neutral-900) ke var(--color-neutral-800)
- Border: 1px solid var(--color-neutral-700)
- (semua text pakai token yang adaptive)

### 3.4 Kartu Akun (DANA, OVO, GoPay, dll)
File: components/account-card.css

MASALAH BESAR: Sekarang dark bg dipakai di light mode.

Light mode:
- Card bg: var(--card-bg) — PUTIH
- Card border: var(--card-border)
- Icon container: bg tetap warna brand (Dana biru, OVO ungu, dll) 
  tapi lebih soft (opacity 15% atau pakai warna 100 range)
- Account name: var(--text-primary)
- Nominal: var(--text-primary)
- Progress bar bg: var(--color-neutral-100)
- Progress bar fill: warna brand akun

Dark mode:
- Card bg: var(--card-bg) — dark
- (dst pakai token)

### 3.5 KPI Cards (Pemasukan/Pengeluaran)
File: components/kpi-card.css

Light mode:
- Bg: var(--card-bg)
- Border: var(--card-border)
- Icon container Pemasukan: var(--finance-income-bg), icon var(--finance-income)
- Icon container Pengeluaran: var(--finance-expense-bg), icon var(--finance-expense)
- Label: var(--text-secondary)
- Nominal: var(--text-primary)
- Period info: var(--text-tertiary)

### 3.6 Kartu Neraca (banner "Lihat struktur")
Sekarang gradient orange soft (bagus untuk light) tapi konsistensi harus dijaga:

Light mode:
- Bg: var(--color-orange-50)
- Icon bg: var(--color-orange-100)
- Icon: var(--color-orange-600)
- Text: var(--text-primary)

Dark mode:
- Bg: rgba(249, 115, 22, 0.1)
- Icon bg: rgba(249, 115, 22, 0.2)
- Icon: var(--color-orange-400)

### 3.7 Quick Access Icons Row
Yang menampilkan 9 icon di baris

Light mode:
- Container icon bg: warna 50/100 sesuai fungsi
- Icon color: warna 500/600 sesuai fungsi

Dark mode:
- Container icon bg: rgba warna dengan 15% opacity
- Icon color: warna 400 (lighter untuk contrast)

### 3.8 Semua Modal, Dialog, Sheet
File: components/modal.css, dialog.css, sheet.css

- Backdrop: var(--bg-overlay)
- Content bg: var(--bg-elevated)
- Content border: var(--border-subtle)
- Title: var(--text-primary)
- Body: var(--text-secondary)
- Close button: var(--text-tertiary)

### 3.9 Buttons
File: components/button.css

Variants harus pakai token:

.btn-primary {
  background: var(--interactive-primary);
  color: var(--interactive-primary-text);
}
.btn-primary:hover {
  background: var(--interactive-primary-hover);
}
.btn-primary:active {
  background: var(--interactive-primary-active);
}

.btn-secondary {
  background: var(--interactive-secondary);
  color: var(--interactive-secondary-text);
  border: 1px solid var(--border-subtle);
}

.btn-ghost {
  background: transparent;
  color: var(--text-primary);
}
.btn-ghost:hover {
  background: var(--interactive-secondary);
}

.btn-danger {
  background: var(--status-danger);
  color: white;
}

### 3.10 Forms & Inputs
File: components/input.css, select.css, textarea.css

input, select, textarea {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--input-text);
}
input::placeholder {
  color: var(--input-placeholder);
}
input:hover {
  border-color: var(--input-border-hover);
}
input:focus {
  border-color: var(--input-border-focus);
  box-shadow: var(--shadow-focus);
  outline: none;
}
input:disabled {
  background: var(--input-disabled-bg);
  color: var(--text-disabled);
}

### 3.11 Tables
- Header bg: var(--bg-secondary)
- Header text: var(--text-secondary)
- Row hover: var(--bg-secondary)
- Border: var(--border-subtle)
- Cell text: var(--text-primary)

### 3.12 Chips / Badges
- Default: bg var(--interactive-secondary), text var(--text-primary)
- Success: bg var(--status-success-bg), text var(--status-success-text)
- Warning: bg var(--status-warning-bg), text var(--status-warning-text)
- Danger: bg var(--status-danger-bg), text var(--status-danger-text)
- Info: bg var(--status-info-bg), text var(--status-info-text)

### 3.13 Charts
Ini penting — chart library sering pakai warna sendiri.

Buat helper function:
function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    income: style.getPropertyValue('--finance-income').trim(),
    expense: style.getPropertyValue('--finance-expense').trim(),
    text: style.getPropertyValue('--text-secondary').trim(),
    grid: style.getPropertyValue('--border-subtle').trim(),
    // dst
  };
}

Update chart config saat theme change.

---

## TASK 4: THEME SWITCHER

File: js/theme-manager.js

Fungsi:

1. detectSystemPreference():
   Cek prefers-color-scheme

2. getCurrentTheme():
   Return 'light' | 'dark' | 'auto'
   Baca dari localStorage 'monefyi_theme'

3. setTheme(theme):
   Set data-theme di <html>
   Simpan ke localStorage
   Update meta theme-color (untuk mobile browser bar)
   Dispatch event 'theme-changed' untuk komponen yang perlu update
   (misal charts)

4. initTheme():
   Auto-detect atau baca dari localStorage
   Apply saat page load
   Listen perubahan sistem preference

DEFAULT: 
- Kalau user belum pernah pilih → gunakan 'auto' (ikut sistem)
- Kalau sudah pilih manual → hormati pilihan user

Meta theme-color update:
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)">

---

## TASK 5: BUAT GUIDELINE — DESIGN_SYSTEM.md

File ini akan jadi referensi untuk semua developer & AI kedepan.

ISI:

# Monefyi Design System Guidelines

## Prinsip Utama

1. **Zero Hardcoded Colors**
   Semua warna HARUS pakai CSS variable dari tokens.css
   ❌ SALAH: color: #000000;
   ✅ BENAR: color: var(--text-primary);

2. **Semantic > Primitive**
   Pilih token semantic dulu, primitive hanya untuk kasus khusus
   ❌ SALAH: background: var(--color-brand-500);
   ✅ BENAR: background: var(--interactive-primary);

3. **Theme-First Design**
   Setiap komponen HARUS work di light DAN dark mode
   Test dengan toggle theme sebelum commit

4. **Contrast Compliance**
   Text minimal WCAG AA (4.5:1 untuk body, 3:1 untuk large text)
   Gunakan tool: WebAIM Contrast Checker

## Cara Pakai Token

### Kapan Pakai Yang Mana?

#### Backgrounds
- `--bg-primary`: Background utama aplikasi
- `--bg-secondary`: Background section, sidebar area
- `--bg-tertiary`: Background nested (card di dalam card)
- `--bg-elevated`: Modal, dropdown, tooltip
- `--card-bg`: SEMUA card

#### Text
- `--text-primary`: Judul, angka penting, main content
- `--text-secondary`: Body text, description
- `--text-tertiary`: Metadata, timestamps, hints
- `--text-disabled`: Text yang di-disable

#### Financial (WAJIB pakai untuk konteks keuangan)
- Income/Pemasukan: `--finance-income`, `--finance-income-bg`
- Expense/Pengeluaran: `--finance-expense`, `--finance-expense-bg`
- Savings/Tabungan: `--finance-savings`, `--finance-savings-bg`

#### Status
- Success: `--status-success-*` (transaksi berhasil, target tercapai)
- Warning: `--status-warning-*` (approaching limit)
- Danger: `--status-danger-*` (over budget, error)
- Info: `--status-info-*` (informasi netral)

## Panduan Kontras Wajib

### Light Mode
- White bg + text: minimal --color-neutral-700 (kontras 8:1)
- White bg + secondary text: minimal --color-neutral-500 (kontras 4.6:1)
- Colored bg (--color-brand-50): text pakai --color-brand-700

### Dark Mode
- Dark bg + text: minimal --color-neutral-100 (kontras 15:1)
- Dark bg + secondary text: minimal --color-neutral-400 (kontras 4.8:1)
- Colored bg (rgba 10%): text pakai --color-brand-300

## Rules per Komponen

### Cards
```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--card-shadow);
}

.card:hover {
  box-shadow: var(--card-hover-shadow);
}
```

### Buttons
Selalu pakai variant class (.btn-primary, .btn-secondary, dll)
JANGAN inline style.

### Typography
```css
h1 { color: var(--text-primary); font-weight: var(--font-weight-bold); }
h2 { color: var(--text-primary); font-weight: var(--font-weight-semibold); }
p { color: var(--text-secondary); }
small { color: var(--text-tertiary); }
```

### Icons
- Icon default: var(--text-secondary)
- Icon di button: inherit dari button
- Icon di context (income green, expense red): pakai finance token

## Anti-Patterns (JANGAN LAKUKAN)

❌ Hardcode hex:
```css
color: #ffffff;
background: #1a1a2e;
```

❌ RGB tanpa alasan:
```css
background: rgb(15, 23, 42);
```

❌ Style dark mode terpisah dengan class:
```css
.dark .card { background: #1a1a2e; }
```

❌ Inline style untuk warna:
```html
<div style="color: white; background: black;">
```

❌ Warna berbeda untuk fungsi sama:
Kalau semua "success" pakai green, JANGAN ada yang pakai blue.

## Checklist Sebelum Commit

□ Zero hardcoded colors
□ Test di light mode
□ Test di dark mode
□ Kontras text minimal 4.5:1
□ Interactive states (hover, focus, active, disabled) semua defined
□ Focus ring visible untuk keyboard nav
□ Icon adapt theme
□ Chart colors update saat theme change

---

## TASK 6: TESTING FRAMEWORK

Buat file: test/theme-audit.js

Function untuk cek theme compliance:

1. scanHardcodedColors():
   - Loop semua stylesheet
   - Regex cari hex/rgb yang bukan di tokens.css
   - Return list violations

2. checkContrast():
   - Loop semua text element
   - Hitung kontras dengan background
   - Report yang < 4.5:1

3. testBothThemes():
   - Screenshot di light mode
   - Toggle ke dark mode
   - Screenshot lagi
   - Compare visual diff

Jalankan di browser console:
window.themeAudit.run()

---

## TASK 7: MIGRATION CHECKLIST

Urutan migrasi (dari yang paling terlihat):

FASE 1 (Kritis - hari 1):
□ Sidebar (paling parah broken)
□ Header
□ Kartu Saldo utama
□ Kartu akun (DANA, OVO, GoPay)

FASE 2 (Penting - hari 2):
□ KPI cards
□ Kartu Neraca banner
□ Quick access icons
□ Buttons semua variant
□ Forms & inputs

FASE 3 (Lengkap - hari 3):
□ Modal, dialog, sheet
□ Tables
□ Chips & badges
□ Charts

FASE 4 (Polish - hari 4):
□ Toast notifications
□ Tooltips
□ Empty states
□ Loading states
□ Error states

FASE 5 (Verification):
□ Run theme-audit.js
□ Manual test setiap halaman di kedua theme
□ Test keyboard navigation
□ Test dengan real user

---

## TASK 8: DOCUMENT & UPDATE README

Update README.md dengan section:

## Design System

Monefyi menggunakan design token system untuk konsistensi UI.
Semua warna, spacing, dan visual properties didefinisikan di 
`styles/tokens.css`.

### Menambah Warna Baru

1. Tambah primitive color di tokens.css (color-xxx-500)
2. Buat semantic token yang meaning-ful (--status-xxx)
3. Define untuk BOTH light dan dark mode
4. Dokumentasikan di DESIGN_SYSTEM.md

### Menambah Komponen Baru

1. Baca DESIGN_SYSTEM.md dulu
2. Pakai token yang sudah ada
3. Test di kedua theme
4. Run audit sebelum commit

### Aturan Absolut

- ZERO hardcoded colors di komponen
- Setiap component test di light + dark
- Kontras minimum 4.5:1 untuk body text
- Focus state harus visible

---

## TASK 9: SPESIFIC FIXES DARI SCREENSHOT

Berdasarkan screenshot yang menunjukkan light mode broken:

### Fix Sidebar
File: components/sidebar.css

MASALAH: Text putih di background putih

REPLACE:
```css
/* SEBELUM */
.sidebar { background: #1a1a2e; }
.sidebar-item { color: white; }
.sidebar-logo { color: white; }

/* SESUDAH */
.sidebar { 
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
}
.sidebar-item { 
  color: var(--sidebar-item-text);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}
.sidebar-item:hover {
  background: var(--sidebar-item-hover-bg);
  color: var(--text-primary);
}
.sidebar-item.active {
  background: var(--sidebar-item-active-bg);
  color: var(--sidebar-item-active-text);
  border-left: 3px solid var(--sidebar-item-active-border);
}
.sidebar-logo {
  color: var(--text-primary);
}
```

### Fix Kartu Saldo
File: components/balance-card.css

MASALAH: Card dark di light mode

REPLACE:
```css
/* SEBELUM */
.balance-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: white;
}

/* SESUDAH */
.balance-card {
  background: linear-gradient(
    135deg, 
    var(--color-brand-50) 0%, 
    var(--bg-elevated) 100%
  );
  border: 1px solid var(--color-brand-200);
  color: var(--text-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}

[data-theme="dark"] .balance-card {
  background: linear-gradient(
    135deg,
    var(--color-neutral-900) 0%,
    var(--color-neutral-800) 100%
  );
  border-color: var(--color-neutral-700);
}

.balance-card__label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.balance-card__amount {
  color: var(--text-primary);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
}
```

### Fix Account Cards
File: components/account-card.css

REPLACE:
```css
/* SEBELUM */
.account-card {
  background: #1a1a2e;
  color: white;
}

/* SESUDAH */
.account-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: box-shadow var(--transition-base);
}

.account-card:hover {
  box-shadow: var(--card-hover-shadow);
}

.account-card__icon {
  /* Warna per provider — brand color mereka */
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-card__icon--dana {
  background: rgba(0, 128, 255, 0.1);
  color: #0080FF;
}

.account-card__icon--ovo {
  background: rgba(75, 0, 130, 0.1);
  color: #4B0082;
}

.account-card__icon--gopay {
  background: rgba(0, 170, 224, 0.1);
  color: #00AAE0;
}

.account-card__name {
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
}

.account-card__balance {
  color: var(--text-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.account-card__progress {
  background: var(--color-neutral-100);
  height: 4px;
  border-radius: var(--radius-full);
  overflow: hidden;
}

[data-theme="dark"] .account-card__progress {
  background: var(--color-neutral-800);
}
```

### Fix Header
File: components/header.css

REPLACE:
```css
/* SEBELUM */
.header {
  background: #0f172a;
  color: white;
}

/* SESUDAH */
.header {
  background: var(--header-bg);
  border-bottom: 1px solid var(--header-border);
  padding: var(--space-4) var(--space-6);
}

.header__title {
  color: var(--text-primary);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.header__subtitle {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.header__search {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--input-text);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
}

.header__search::placeholder {
  color: var(--input-placeholder);
}
```

---

## EXECUTION ORDER

1. TASK 1 — Audit (baseline)
2. TASK 2 — Build tokens.css
3. TASK 5 — Buat DESIGN_SYSTEM.md (reference)
4. TASK 4 — Theme switcher
5. TASK 9 — Fix screenshot-specific issues DULU (biar keliatan hasilnya)
6. TASK 3 — Refactor komponen lain (bertahap sesuai fase)
7. TASK 6 — Build testing framework
8. TASK 7 — Migration checklist per komponen
9. TASK 8 — Documentation

---

## LAPORAN SETIAP TASK

Format laporan:

TASK [N] SELESAI

FILE DIUBAH:
- path/to/file.css: [ringkasan perubahan]
- path/to/component.js: [ringkasan perubahan]

TOKEN BARU DITAMBAHKAN:
- --token-name: alasan

BREAKING CHANGES:
- [jika ada]

TEST YANG PERLU DILAKUKAN USER:
1. Buka [halaman]
2. Toggle theme
3. Cek [element]

LANJUT KE TASK [N+1]

---

## KRITERIA SELESAI (Definition of Done)

Task ini dinyatakan SELESAI kalau:

□ Semua screenshot di light mode terlihat clean, kontras baik
□ Semua screenshot di dark mode tetap terlihat baik (tidak regressi)
□ Toggle theme smooth tanpa flash
□ Zero hardcoded colors (verified by audit tool)
□ DESIGN_SYSTEM.md lengkap dan bisa dipakai referensi
□ Kontras semua text minimum 4.5:1
□ Focus states visible di kedua theme
□ Charts adapt theme dengan benar
□ Meta theme-color update dengan benar

## PRINSIP EKSEKUSI

1. **Jangan Rewrite Semuanya Sekaligus**
   Migrasi bertahap. Selesaikan satu komponen sebelum lanjut.

2. **Test Setiap Perubahan**
   Buka browser, toggle theme, verify visual.

3. **Backward Compatible**
   Jangan hapus class lama sampai yakin tidak dipakai.

4. **Documentation as Code**
   Setiap decision tulis di comment atau design system doc.

5. **User Experience First**
   Bukan cuma developer experience. Test dengan mata user.
```

---