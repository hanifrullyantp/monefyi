# Analisis: Cek Apakah 5 Fase Sudah Dibuat di Prompt Sebelumnya

Mari saya audit prompt-prompt sebelumnya secara jujur.

---

## 🔍 Audit Prompt Sebelumnya

### Prompt yang Sudah Ada:
1. `MONEFYI_UPGRADE.md` — Fondasi (hero card, onboarding, dll)
2. `MONEFYI_FIXES.md` — Perbaikan bug pertama
3. `MONEFYI_FIXES_V2.md` — Perbaikan bug kedua
4. `MONEFYI_FIXES_V3_MONTHLY.md` — Monthly closing & neraca
5. `MONEFYI_THEME_SYSTEM.md` — Design tokens & theme
6. `MONEFYI_LIGHT_MODE_COMPLETION.md` — Light mode fixes
7. `MONEFYI_UI_MATURATION.md` — UI polish premium
8. `MONEFYI_DATA_LOGIC_FIX.md` — Data audit fix
9. `MONEFYI_ROADMAP_NEXT.md` — Roadmap ringkasan (belum implementasi detail)
10. `MONEFYI_PRODUCT_MARKETING_SYNC.md` — Marketing engine

### Analisis 5 Fase:

| Fase | Status | Yang Sudah Ada | Yang Belum |
|---|---|---|---|
| **1. Actionable Intelligence** | ⚠️ Sebagian | Ide di ROADMAP_NEXT sebagai overview | Detail spesifikasi lengkap belum ada |
| **2. Otomasi (Otomatisasi)** | ⚠️ Sebagian | Recurring transactions disebut sekilas | Detail auto-categorization ML, bulk actions belum |
| **3. Coaching (Kebiasaan)** | ⚠️ Sebagian | Weekly digest disebut di MARKETING_SYNC | Coaching flow, ritual bulanan, health score belum detail |
| **4. Komunitas (Sosial)** | ❌ Tidak ada | Disebut hanya sebagai konsep | Prompt implementasi belum ada sama sekali |
| **5. Diferensiasi (Fitur Unik)** | ❌ Tidak ada | Money Personality, Impulse Killer disebut ide | Prompt implementasi belum ada sama sekali |

### Kesimpulan:
**5 fase ini BELUM dibuatkan prompt implementasi yang lengkap.**

Yang ada baru sebagai "wishlist" di ROADMAP_NEXT.md, tanpa spesifikasi detail seperti prompt implementasi lain.

Mari saya buatkan sekarang secara komprehensif.

---

# MONEFYI — GROWTH PHASE MASTER PROMPT
## 5 Fase Pengembangan Menuju Category Leader

Simpan sebagai: `MONEFYI_GROWTH_PHASES.md`

```markdown
# MONEFYI — GROWTH PHASES IMPLEMENTATION
## Dari "Reliable App" → "Category Defining App"

---

## KONTEKS

Setelah bug logika kritis teratasi dan sistem produk-marketing sinkron,
Monefyi masuk fase pertumbuhan strategis.

Fase ini BUKAN tentang perbaikan bug, tapi tentang:
1. Mempertajam nilai (Actionable Intelligence)
2. Menghilangkan gesekan (Otomasi)
3. Membangun kebiasaan (Coaching)
4. Membentuk komunitas (Sosial Motivasi)
5. Diferensiasi kuat (Fitur Unik)

Tujuan: Monefyi jadi aplikasi yang tidak hanya "digunakan" tapi "dicintai".

---

## FASE 1: ACTIONABLE INTELLIGENCE

### PRINSIP
Data yang ditampilkan harus menghasilkan aksi, bukan hanya observasi.
Setiap angka harus punya konteks dan setiap insight harus punya rekomendasi konkret.

---

### TASK 1.1: Smart Suggestions Engine

#### TUJUAN
Sistem yang otomatis generate insight dari pola pengeluaran user
dan memberikan saran spesifik yang bisa langsung dilakukan.

#### DATA MODEL

Table baru: insights_generated
- id
- user_id
- type (habit_detection/optimization/pattern/prediction/opportunity)
- category_related (nullable)
- title
- description
- data_json (raw data yang jadi basis insight)
- action_json (tombol aksi yang bisa diklik)
- priority (1-10)
- impact_amount (perkiraan nilai finansial)
- confidence (0-100)
- shown_at (nullable)
- clicked_at (nullable)
- dismissed_at (nullable)
- generated_at

Table baru: user_habits
- id
- user_id
- habit_type (frequency_based/amount_based/time_based)
- category
- merchant (nullable)
- pattern_data_json
- detected_at
- confirmed_by_user (boolean)
- active

#### ENGINE LOGIC

**A. Habit Detection Algorithm**

Setiap hari jam 3 pagi, jalankan analisis:

1. Analisis Frequency Habits:
   - Untuk setiap kategori, hitung transaksi per minggu
   - Deteksi pola: "user beli X, N kali per minggu"
   - Contoh: "Kopi Kenangan 3x seminggu"
   
2. Analisis Amount Habits:
   - Rata-rata pengeluaran per kategori
   - Standar deviasi untuk deteksi anomali
   - Trend naik/turun 3 bulan terakhir

3. Analisis Time Habits:
   - Kapan user paling sering spending
   - Hari termahal, jam termahal
   - Weekend vs weekday pattern

4. Analisis Merchant Habits:
   - Top 10 merchant per user
   - Loyalty pattern
   - Frequency & amount trend

#### INSIGHT GENERATORS

**Generator 1: Coffee/Small Purchase Optimizer**

Kondisi trigger:
- User beli item < Rp 50rb, frequency > 3x/minggu, konsisten 4 minggu

Output:
```
☕ Kebiasaan Ngopi Kamu

Kamu ngopi 3x/minggu (Rp 30-35rb).
Setahun: Rp 4.680.000

Kalau turun jadi 1x/minggu:
- Hemat Rp 3.120.000/tahun
- Setara: dana darurat 1 bulan pengeluaran
- Atau: DP motor bekas

[Set Batas Ngopi] [Coba Alternatif] [Skip]
```

**Generator 2: Subscription Detector**

Kondisi trigger:
- Transaksi berulang setiap bulan dengan amount sama
- Merchant include: Netflix, Spotify, YouTube Premium, Disney+, dll

Output:
```
📺 Subscription Kamu

Terdeteksi 5 subscription aktif:
- Netflix: Rp 120rb/bulan
- Spotify: Rp 55rb/bulan
- YouTube Premium: Rp 75rb/bulan
- iCloud+: Rp 45rb/bulan
- Notion: Rp 130rb/bulan

Total: Rp 425rb/bulan (Rp 5.1jt/tahun)

Review yang benar-benar kamu pakai?
[Review Sekarang]
```

**Generator 3: Debt Optimization**

Kondisi trigger:
- User punya utang aktif
- Ada surplus bulanan konsisten

Output:
```
💳 Percepat Bebas Utang

Cicilan HP tersisa Rp 2jt (8 bulan lagi)
Bunga: 12%/tahun

Kamu punya surplus rata-rata Rp 500rb/bulan.

Kalau tambah bayar cicilan Rp 500rb/bulan:
- Lunas dalam 4 bulan (bukan 8)
- Hemat bunga Rp 240.000
- Bebas cicilan 4 bulan lebih cepat

[Aktifkan Auto-Extra Payment] [Nanti]
```

**Generator 4: Category Trend Alert**

Kondisi trigger:
- Kategori tertentu naik > 30% vs bulan lalu
- Belum akhir bulan

Output:
```
📈 Belanja Kebutuhan Melonjak

Bulan ini: Rp 850rb (di hari 15)
Bulan lalu: Rp 950rb (full bulan)
Prediksi: Rp 1.7jt akhir bulan

Kalau lanjut pola ini, kamu over budget 89%.

Apa yang terjadi bulan ini?
[Lihat Detail Transaksi] [Set Alert] [Nanti]
```

**Generator 5: Saving Opportunity**

Kondisi trigger:
- User punya pendapatan variabel
- Bulan ini income > rata-rata
- Belum ada transfer ke saving

Output:
```
💰 Bonus Detected!

Income bulan ini Rp 7jt (biasanya Rp 5jt).
Extra Rp 2jt bisa dimanfaatkan:

Opsi 1: 50% ke Dana Darurat
- Progress naik 8%
- Target tercapai 2 bulan lebih cepat

Opsi 2: 100% ke investasi
- Long-term growth
- Diversifikasi portofolio

Opsi 3: Bayar utang lebih cepat
- Cicilan HP lunas 4 bulan lebih cepat

[Pilih Alokasi] [Nanti]
```

**Generator 6: Weekend vs Weekday Pattern**

Kondisi trigger:
- Weekend spending > 3x weekday spending
- Konsisten 4 minggu

Output:
```
🎉 Sabtu Minggu Kamu Boros?

Rata-rata pengeluaran:
- Weekday: Rp 65rb/hari
- Weekend: Rp 220rb/hari

Weekend spending 3.4x lebih tinggi.

Kalau turun jadi 2x weekday:
- Hemat Rp 400rb/bulan
- Rp 4.8jt/tahun

Suggested weekend budget: Rp 130rb/hari
[Set Weekend Budget] [Nanti]
```

**Generator 7: Impulse Purchase Pattern**

Kondisi trigger:
- Transaksi > 2x standard deviation kategori
- Bukan tagihan tetap
- Sering di jam < 10 pagi atau > 22 malam

Output:
```
🛒 Pembelian Impulsif Terdeteksi

Beberapa transaksi terdeteksi impulsif:
- Shopee 22:47: Rp 350rb
- Tokopedia 08:15: Rp 180rb
- Grab 23:12: Rp 95rb

Total: Rp 625rb bulan ini

Tips:
- 24-hour rule sebelum beli > Rp 100rb
- Uninstall app shopping di HP
- Notif email → matikan

[Aktifkan Reminder 24-Hour Rule]
```

---

### TASK 1.2: What-If Simulator

#### TUJUAN
User bisa simulasi keputusan finansial sebelum mengambil.

#### FEATURES

**Simulator 1: Savings Impact**

UI:
```
Kalau saya nabung Rp [___] per bulan lebih:

[Slider: Rp 0 - Rp 2.000.000]

Dampak:
- Dana Darurat tercapai: [X bulan lebih cepat]
- 1 tahun: Rp [Y] extra
- 5 tahun (dengan bunga 6%): Rp [Z]
- 10 tahun: Rp [W]

Sumber dana:
- Kurangi kategori [X]: Rp [amount]
- Skip [item]: Rp [amount]

[Aktifkan Auto-Save] [Simpan Skenario]
```

**Simulator 2: Purchase Impact**

UI:
```
Kalau saya beli [___]:

Nama item: [text input]
Harga: Rp [number input]
Tipe: [ ] One-time [ ] Cicilan [X] bulan

Dampak ke keuangan:

Bulanan (kalau cicilan):
- Kategori terkena: [budget X]
- Sisa flexible: Rp [X] → Rp [Y]
- Runway berkurang: [Z] hari

Target terpengaruh:
- Dana Darurat: mundur [X] bulan
- DP Rumah: mundur [Y] bulan

Rekomendasi:
[✅ Aman untuk dibeli sekarang]
atau
[⚠️ Tunda [X] bulan untuk aman]
atau
[❌ Tidak recommended saat ini]

Alternatif:
- [Suggestion 1]
- [Suggestion 2]

[Beli Sekarang] [Tunda] [Cari Alternatif]
```

**Simulator 3: Debt Payoff Scenarios**

UI:
```
Simulasi Bebas Utang

Utang aktif: 3 items, total Rp 15jt
Payment sekarang: Rp 500rb/bulan
Estimasi bebas: 42 bulan (Feb 2028)

Skenario alternatif:

Skenario A: Extra Rp 200rb/bulan
- Bebas utang: 28 bulan (Des 2026) ← 14 bulan lebih cepat
- Hemat bunga: Rp 850rb

Skenario B: Extra Rp 500rb/bulan
- Bebas utang: 18 bulan (Feb 2026) ← 24 bulan lebih cepat
- Hemat bunga: Rp 1.8jt

Skenario C: Refinance ke bunga lebih rendah
- Bebas utang: 36 bulan
- Hemat bunga: Rp 500rb
- One-time effort

[Pilih Skenario] [Custom Scenario]
```

**Simulator 4: Retirement Projection**

UI:
```
Simulasi Masa Depan

Umur sekarang: [30]
Target pensiun: [55]
Investasi bulanan: Rp [1.000.000]
Return diasumsikan: [8]%/tahun

Proyeksi:
- Umur 55: Rp 953jt
- Passive income (4% rule): Rp 3.2jt/bulan
- Cukup untuk gaya hidup: [Standard]

Skenario:
- Naikkan investasi 20%: Rp 1.14M
- Naikkan return 2%: Rp 1.3M
- Mulai 5 tahun lebih awal: Rp 1.5M

[Aktifkan Rencana] [Custom]
```

---

### TASK 1.3: Contextual Micro-Insights

#### TUJUAN
Insight kecil tapi relevan yang muncul di berbagai touchpoint.

#### CONTOH IMPLEMENTASI

**Di Transaction Input:**

Saat user input transaksi Rp 75rb di kategori Hiburan:
```
💡 Ini transaksi Hiburan ke-4 minggu ini.
Total minggu ini: Rp 285rb (biasanya Rp 180rb).
```

**Di Dashboard:**

Setelah user login:
```
📊 Insight Hari Ini
Kamu sudah 7 hari tanpa Nongkrong & Kopi.
Rp 210rb tetap di kantong (rata-rata biasanya).
Keep it up! 🔥
```

**Di Detail Kategori:**

Saat user buka kategori Makan:
```
📈 Trend Makan
Minggu ini: Rp 385rb (-12% vs minggu lalu)
Rata-rata harian: Rp 55rb (target: Rp 60rb)
Kamu 8% di bawah budget ✅
```

**Di Monthly Report:**

```
🎯 Behavioral Insight Agustus
- Kamu paling boros hari Sabtu (Rp 850rb total)
- Kategori surprising: Transportasi naik 40%
- Hari paling hemat: Rabu (Rp 45rb/hari rata-rata)
- Kebiasaan baru terdeteksi: Rutin ke gym (Rp 200rb/bulan)
```

---

### TASK 1.4: Predictive Alerts

#### TUJUAN
Warning sebelum masalah terjadi, bukan setelah.

#### CONTOH

**Alert 1: Pre-Overspend Warning**

Trigger: Kategori mendekati batas + hari masih panjang

```
⚠️ Prediksi: Budget Makan akan habis 5 hari sebelum gajian

Sekarang: Rp 720rb dari Rp 900rb (80%)
Rata-rata harian: Rp 65rb
Sisa hari: 12

Kalau lanjut pola ini, over budget Rp 60rb.

Rekomendasi:
- Turunkan ke Rp 45rb/hari sisa bulan
- Skip GoFood 2x minggu ini
- Cook at home Sabtu-Minggu

[Set Batas Baru] [Cek Ideas Hemat]
```

**Alert 2: Cash Flow Warning**

Trigger: Prediksi tekor sebelum gajian

```
🔴 Perhatian: Prediksi tekor 4 hari sebelum gajian

Saldo sekarang: Rp 1.2jt
Sisa hari: 16
Rata-rata pengeluaran: Rp 95rb/hari

Prediksi: Rp -320rb di hari ke-12

Actions untuk selamat:
1. Bekukan Hiburan sisa bulan → hemat Rp 200rb
2. Kurangi transport (WFH 2 hari?) → hemat Rp 100rb
3. Skip 2 kali GoFood → hemat Rp 100rb

Total penyelamatan: Rp 400rb
Prediksi jadi: Rp +80rb ✅

[Terapkan Semua] [Pilih Sendiri]
```

**Alert 3: Goal Delay Warning**

Trigger: Progress goal melambat vs target

```
🎯 Update: Dana Darurat mundur

Target awal: Mar 2027
Prediksi baru: Jul 2027 (4 bulan mundur)

Kenapa?
Bulan ini nabung Rp 200rb (target: Rp 500rb)

Untuk tetap on-track:
- Nabung Rp 700rb bulan depan
- Atau geser target ke Jul 2027

[Adjust Target] [Boost Saving Bulan Depan]
```

---

## FASE 2: OTOMASI (MENGHILANGKAN GESEKAN)

### PRINSIP
Setiap step yang bisa diotomatisasi HARUS diotomatisasi.
User seharusnya tidak perlu berpikir untuk hal-hal berulang.

---

### TASK 2.1: Recurring Transactions

#### TUJUAN
Fixed bills otomatis muncul, user tinggal confirm.

#### DATA MODEL

Table: recurring_transactions
- id
- user_id
- name (Kost, Listrik, dll)
- amount
- category_id
- account_id
- frequency (weekly/monthly/yearly)
- day_of_period (untuk monthly: tanggal 5)
- next_occurrence_date
- amount_type (fixed/variable) - variable untuk listrik yang berubah
- last_amount (untuk variable)
- reminder_days_before
- auto_create (boolean - kalau true, otomatis create tanpa confirmation)
- active
- created_at

#### FLOW

**Setup Recurring:**

User bisa setup recurring dari:
1. Manual (Settings → Recurring)
2. Auto-detect (sistem detect pola dari transaksi berulang)

Form setup:
```
Nama: [_________]
Amount: Rp [_______] [Fixed / Variable]
Kategori: [Dropdown]
Akun: [Dropdown]
Frekuensi: [Bulanan / Mingguan / Tahunan]
Tanggal: [1-31]
Reminder: [ ] H-3 [ ] H-1 [ ] Hari H
Auto-create: [ ] Ya, otomatis tanpa konfirmasi
              [ ] Tidak, saya konfirmasi manual

[Simpan]
```

**Auto-Detection:**

Sistem scan transaksi 3 bulan terakhir:
- Transaksi dengan nama sama muncul 3x = candidate
- Amount konsisten atau variable dengan range
- Tanggal berulang

Popup untuk user:
```
🔄 Deteksi Transaksi Berulang

Kost muncul setiap tanggal 5, Rp 1.200.000

Setup sebagai recurring?
[Ya, Setup Otomatis] [Tidak] [Setup Manual]
```

**Reminder Flow:**

H-3 sebelum jatuh tempo:
```
Notifikasi:
📅 3 hari lagi: Kost Rp 1.200.000

Saldo estimasi cukup? Cek dulu.
[Lihat Detail]
```

H-1:
```
Besok jatuh tempo: Kost Rp 1.200.000
Siapkan pembayaran ya.
[Konfirmasi Sudah Bayar]
```

Hari H:
```
Hari ini: Kost Rp 1.200.000
Sudah dibayar?
[Ya, Buat Transaksi] [Belum, Ingatkan Besok]
```

Kalau auto_create = true:
```
Transaksi otomatis dibuat H+0.
User hanya perlu edit kalau amount berbeda (untuk listrik).
```

---

### TASK 2.2: Smart Auto-Categorization

#### TUJUAN
User tidak perlu pilih kategori manual. Sistem belajar.

#### PENDEKATAN (Rule-Based ML)

**Level 1: Merchant Dictionary**

Table: merchant_category_map
- merchant_name
- suggested_category
- confidence
- user_confirmations (int)

Preload dengan dictionary umum Indonesia:
```
GoPay → depends on merchant
Grab → Transportasi
Gojek → Transportasi (kalau ride)
GoFood → Makan Sehari-hari
ShopeeFood → Makan Sehari-hari
GrabFood → Makan Sehari-hari
Kopi Kenangan → Nongkrong & Kopi
Starbucks → Nongkrong & Kopi
Fore Coffee → Nongkrong & Kopi
Indomart → Belanja Kebutuhan
Alfamart → Belanja Kebutuhan
7-Eleven → Belanja Kebutuhan
XXI → Hiburan
CGV → Hiburan
Netflix → Hiburan
Spotify → Hiburan
Shopee → Belanja (context aware)
Tokopedia → Belanja (context aware)
Lazada → Belanja (context aware)
Klik BCA → Transfer/depends
m-Banking → depends
PLN → Listrik
Telkom → Internet
Indihome → Internet
```

**Level 2: Learning from User**

Setiap kali user koreksi kategori:
```javascript
function learn(transaction, correctedCategory) {
  // Update merchant map
  const merchant = extractMerchant(transaction);
  updateOrCreate(merchant_category_map, {
    merchant_name: merchant,
    suggested_category: correctedCategory,
    user_confirmations: increment(1)
  });
  
  // Personal preference stronger than global
  updatePersonalMap(userId, merchant, correctedCategory);
}
```

**Level 3: Context Awareness**

Amount range affects prediction:
- Shopee < Rp 100rb → mungkin belanja online
- Shopee > Rp 500rb → mungkin barang besar (elektronik)
- Grab < Rp 30rb → transport
- Grab > Rp 100rb → mungkin GrabFood atau paket

Time-based:
- Merchant Kopi di jam 6-9 pagi → Nongkrong probably
- Merchant Kopi di jam 15-17 → Nongkrong
- Grab di jam 7-9 pagi = ke kantor probably

#### UI

Saat user input transaksi:
```
Kamu ketik: "grab 22rb gopay"

Sistem detect:
✨ Suggested Category: Transportasi (95% confident)
Merchant: Grab
Amount: Rp 22.000
Akun: GoPay

[✓ Correct] [Ubah Kategori]
```

Confidence indicator:
- 95%+ = auto-fill, user tinggal confirm
- 70-94% = suggest, user bisa edit
- < 70% = tanya user pilih

---

### TASK 2.3: Bulk Actions

#### TUJUAN
Power user bisa manage banyak transaksi cepat.

#### FEATURES

**A. Multi-Select Change Category**

Di transaction list:
- Long press untuk masuk multi-select mode
- Checkbox muncul di semua row
- User pilih multiple
- Action bar muncul di bawah:
  ```
  [3 selected]
  [Change Category] [Change Account] [Delete] [Cancel]
  ```

**B. Split Transaction**

Contoh: user belanja Rp 500rb di Indomart, mau split:
- Makanan Rp 200rb
- Kebutuhan Rp 250rb  
- Snack Rp 50rb

UI:
```
Split Transaction

Original: Indomart Rp 500.000

Split into:
├─ [Makanan] Rp [200.000] [X]
├─ [Kebutuhan] Rp [250.000] [X]
└─ [Snack] Rp [50.000] [X]

Total: Rp 500.000 ✓
Remaining: Rp 0

[+ Add More] [Save] [Cancel]
```

**C. Duplicate Transaction**

Untuk transaksi berulang yang belum di-setup as recurring:
- Right click / long press transaction
- "Duplicate" option
- Buat copy dengan tanggal hari ini

**D. Bulk Import from CSV**

Di Settings → Data → Import:
- Upload CSV/Excel file
- Preview data dengan mapping
- Auto-detect kolom (date, amount, description)
- Suggest category untuk setiap row
- User review → confirm import

---

### TASK 2.4: Auto-Sync Bank/Wallet (Advanced)

#### TUJUAN
Zero manual input untuk transaksi yang tercatat di bank/e-wallet.

#### PENDEKATAN

**Level 1: Email Parsing (sudah ada, tingkatkan)**

Support lebih banyak provider:
- BCA (email notifikasi)
- Mandiri
- BRI
- BNI
- GoPay (email receipt)
- OVO
- DANA
- ShopeePay

Improvement:
- Better parser accuracy
- Handle multiple currency
- Detect refunds
- Handle duplicate

**Level 2: SMS Parser (untuk mobile app native)**

Kalau nanti ada mobile app native:
- Request SMS read permission
- Parse SMS notifikasi bank
- Auto-create transaction

**Level 3: Direct API (masa depan)**

Kalau ada partnership dengan bank:
- OAuth flow untuk connect account
- Real-time sync
- Categorization otomatis
- Balance sync

---

### TASK 2.5: Smart Suggestions Saat Input

#### TUJUAN
Kurangi typing user semaksimal mungkin.

#### FEATURES

**A. Quick Templates**

Berdasarkan history, tampilkan template quick input:
```
Sering diinput:
[Kopi Rp 30rb GoPay]
[Grab Rp 25rb GoPay]
[Makan Rp 55rb GoPay]
[+ Custom]
```

Tap = auto-fill semua field.

**B. Predictive Text**

Saat user ketik "kop", suggest:
- Kopi Kenangan Rp 30rb (last used yesterday)
- Kopi Janji Jiwa Rp 25rb
- Kopi hitam warung Rp 8rb

**C. Time-Based Suggestions**

Saat buka app di jam 7 pagi:
```
Suggestion: Sarapan?
[+ Sarapan Rp 15rb Cash] [Custom]
```

Jam 12 siang:
```
Suggestion: Makan siang?
[+ ShopeeFood Rp 55rb GoPay] [+ Warteg Rp 20rb Cash]
```

Jam 5 sore Jumat:
```
Suggestion: Nongkrong weekend?
[+ Kopi Kenangan Rp 30rb GoPay]
```

**D. Location-Based (Mobile Native)**

Di mall Grand Indonesia:
```
Kamu di Grand Indonesia
Common transactions here:
[+ Starbucks Rp 55rb]
[+ Bioskop XXI Rp 60rb]
[+ Food court Rp 45rb]
```

---

## FASE 3: COACHING (MEMBANGUN KEBIASAAN)

### PRINSIP
Aplikasi bukan hanya tool tapi coach.
Tugas coach: guide, motivate, celebrate, teach.

---

### TASK 3.1: Weekly Digest (Sudah dibahas di Marketing Sync, extend)

#### TAMBAHAN DARI VERSI SEBELUMNYA

**Personal Coaching Element:**

Setiap digest personal berdasarkan level user:

Untuk user baru (< 1 bulan):
- Focus: Building habit
- Tone: Encouraging beginner
- Content: "Kamu sudah [X], next step [Y]"

Untuk user intermediate (1-3 bulan):
- Focus: Optimization
- Tone: Empowering
- Content: "Pattern kamu [X], bisa improve dengan [Y]"

Untuk user advanced (3+ bulan):
- Focus: Advanced strategies
- Tone: Peer-level
- Content: "Data menunjukkan [X], strategi advanced [Y]"

---

### TASK 3.2: Monthly Review Ritual

#### TUJUAN
Bulanan sebagai momen refleksi, bukan sekedar report.

#### FLOW

**Trigger:**
- Tanggal 30/31 setiap bulan
- Push notification: "Waktunya review bulan [X] — 5 menit yang berharga"

**Ritual Flow (Guided):**

**Step 1: Ringkasan Angka (auto-generate)**
```
📊 Agustus 2026 Recap

Income: Rp 5.000.000
Expense: Rp 4.200.000
Saving: Rp 800.000 (16%)

Highlights:
✨ Best category: Makan (di bawah budget)
⚠️ Attention: Hiburan (over 23%)
🎯 Goal Dana Darurat: 48% → 52%
```

**Step 2: Refleksi (interaktif)**
```
🤔 Refleksi Bulan Ini

1. Apa 1 hal keuangan yang bikin kamu bangga bulan ini?
   [_______________________]

2. Apa 1 hal yang ingin kamu perbaiki di [bulan depan]?
   [_______________________]

3. Apa "surprise expense" yang tidak terduga?
   [_______________________]

Skip [Lanjut →]
```

**Step 3: Pattern Recognition**
```
🔍 Kami Temukan Pattern

- Sabtu jadi hari termahal (Rp 850rb total)
- Kategori Nongkrong naik 40%
- Bulan ini 3 kali impulse purchase > Rp 200rb

Ini bikin surprise?
[Ya, ternyata] [Sudah tahu]
```

**Step 4: Allocation Decision (Tutup Buku)**
```
💰 Sisa Rp 800.000 mau diapakan?

○ Dana Darurat (+8% progress, tercapai 2 bulan lebih cepat)
○ Investasi (long-term growth)
○ Bayar Utang (lunas 1 bulan lebih cepat)
○ Carry over ke September (tambah income)
○ Sebagian untuk masing-masing:
   - Rp [___] Dana Darurat
   - Rp [___] Investasi
   - Rp [___] Reward pribadi

[Alokasikan]
```

**Step 5: Set Intention Bulan Depan**
```
🎯 September 2026

Target utama bulan depan?
[ ] Turunkan Hiburan 30%
[ ] Nabung Rp 1jt
[ ] Bayar utang extra Rp 500rb
[ ] Custom: [_______]

Kami akan reminder tiap minggu.
[Set Intention]
```

**Step 6: Journal Entry**

Auto-generate journal:
```
📔 Journal Agustus 2026

[Auto-generated summary]

Refleksi (dari user):
- Bangga: [user input]
- Improve: [user input]
- Surprise: [user input]

Pattern:
- [detected patterns]

Decision:
- Alokasi surplus: [decision]
- Intention September: [intentions]

Saved to journal.
```

Bisa dilihat lagi di bulan berikutnya untuk consistency check.

---

### TASK 3.3: Financial Health Score

#### TUJUAN
Metric komprehensif untuk track wellness finansial.

#### KOMPONEN SCORE (Total 100)

**1. Budget Discipline (20 poin)**
- Bulan ini stay in budget: 20 poin
- Over budget < 10%: 15 poin
- Over budget 10-25%: 10 poin
- Over budget > 25%: 5 poin
- Over budget > 50%: 0 poin

**2. Saving Rate (20 poin)**
- > 20%: 20 poin
- 15-20%: 17 poin
- 10-15%: 14 poin
- 5-10%: 10 poin
- < 5%: 5 poin
- Negatif: 0 poin

**3. Emergency Fund (20 poin)**
- > 6 bulan pengeluaran: 20 poin
- 3-6 bulan: 15 poin
- 1-3 bulan: 10 poin
- < 1 bulan: 5 poin
- Tidak ada: 0 poin

**4. Debt-to-Income Ratio (15 poin)**
- < 20%: 15 poin
- 20-35%: 12 poin
- 35-50%: 8 poin
- > 50%: 3 poin

**5. Diversification (10 poin)**
- Punya cash + savings + investment: 10
- Cash + savings only: 7
- Cash only: 3

**6. Financial Habit (15 poin)**
- Catat transaksi streak > 30 hari: 15
- 14-30 hari: 12
- 7-14 hari: 8
- < 7 hari: 4

#### UI

Dashboard:
```
🏆 Financial Health Score

     87 / 100
   [====>....]
    GREAT

Trend: ↗ +5 dari bulan lalu

Breakdown:
- Budget Discipline: 20/20 ✅
- Saving Rate: 17/20 ✅
- Emergency Fund: 15/20 ⚠️
- Debt Ratio: 15/15 ✅
- Diversification: 10/10 ✅
- Financial Habit: 10/15 ⚠️

Tap untuk detail →
```

Detail per komponen:
```
Emergency Fund: 15/20

Current: 4 bulan pengeluaran (Rp 8jt)
Target for 20: 6 bulan (Rp 12jt)

Untuk naik ke 20/20:
- Butuh tambah Rp 4jt
- Estimasi: 5 bulan (dengan saving rate saat ini)

Tips:
- Naikkan saving Rp 800rb/bulan → 5 bulan
- Investasikan sisa → risiko tapi return lebih baik

[Boost Emergency Fund]
```

#### HISTORICAL TRACKING

Chart per bulan:
- Line chart score 12 bulan terakhir
- Highlight bulan dengan improvement significant
- Milestones (score > 80, > 90, dll)

---

### TASK 3.4: Personalized Coaching Plans

#### TUJUAN
Bukan generic tips, tapi coaching yang disesuaikan.

#### JENIS COACHING PLAN

**Plan A: "Bangkit dari Utang"**

Target user: Debt > 50% income

Program 90 hari:
- Week 1-2: Analisis utang & buat plan
- Week 3-4: Reduce spending 20%
- Week 5-8: Extra payment ke utang tertinggi
- Week 9-12: Build emergency fund kecil

Daily check-in:
- Pagi: "Hari ini fokus [X]"
- Sore: "Progress hari ini?"
- Weekly report progress

**Plan B: "Building Emergency Fund"**

Target user: Belum punya dana darurat

Program 6 bulan:
- Bulan 1: Rp 500rb (starter fund)
- Bulan 2-3: Rp 1jt/bulan
- Bulan 4-6: Naikkan gradually

Milestones dengan celebration:
- Rp 500rb: "First milestone!"
- Rp 2jt: "1 bulan pengeluaran covered"
- Rp 6jt: "3 bulan safety net"

**Plan C: "Mindful Spending"**

Target user: Impulsive spender

Program 30 hari:
- Day 1-7: Awareness (catat semua)
- Day 8-14: 24-hour rule untuk purchase > Rp 100rb
- Day 15-21: Envelope system (budget cash)
- Day 22-30: Weekly review + adjust

**Plan D: "Ready to Invest"**

Target user: Sudah punya emergency fund

Program 60 hari:
- Week 1-2: Financial education
- Week 3-4: Setup investment account
- Week 5-6: First investment (small)
- Week 7-8: Habit reguler

Learning content curated:
- Video tutorials
- Article recommendations
- Case studies

**Plan E: "Money Detox"**

Target user: Overspending, stress finansial

Program 21 hari:
- Week 1: No non-essential purchase
- Week 2: Track every rupiah
- Week 3: Rebuild dengan mindfulness

Support:
- Daily affirmations
- Mindset shifts
- Progress celebration

#### FLOW

**Enrollment:**
```
🎯 Coaching Plans

Mana yang paling relate dengan kamu?

[Bangkit dari Utang]
For: Punya utang > 50% income
Duration: 90 hari
Success rate: 78%

[Build Emergency Fund]
For: Belum punya safety net
Duration: 6 bulan
Success rate: 85%

[Mindful Spending]
For: Sering impulsive buy
Duration: 30 hari
Success rate: 72%

[Ready to Invest]
For: Sudah emergency fund, mau invest
Duration: 60 hari
Success rate: 90%

[Money Detox]
For: Stress finansial, need reset
Duration: 21 hari
Success rate: 68%

[Ambil Assessment untuk Recommend]
```

**Daily Experience:**
```
Pagi (jam 7):
🌅 Day 15 of 90 - Bangkit dari Utang

Focus hari ini: Extra Rp 50rb ke Cicilan HP

Motivasi: "Kamu sudah bayar Rp 750rb extra bulan ini. 
Utang berkurang Rp 2.3jt. Keep going!"

[Mark Done Today]
```

**Weekly Check-in:**
```
📊 Week 3 Review

Progress:
✅ Extra payment: Rp 350rb (target Rp 300rb)
✅ Under budget in Hiburan
⚠️ Belum konsisten catat transaksi

Adjustment for next week:
- Set reminder catat 3x sehari
- Continue extra payment

[Continue Plan]
```

---

### TASK 3.5: Micro-Learning Content

#### TUJUAN
Edukasi bite-sized yang tidak overwhelming.

#### CONTENT STRUCTURE

**Lesson Format:**
- 2-3 menit read time
- 1 core concept
- 1 actionable takeaway
- Related feature in app

**Contoh Topik:**

1. "Kenapa Dana Darurat Sepenting Itu?"
2. "Rule 50/30/20 Explained"
3. "Snowball vs Avalanche: Strategi Bayar Utang"
4. "Apa Itu Compounding Interest?"
5. "Cara Baca Financial Statement"
6. "Kredit vs Debit: Mana yang Lebih Baik?"
7. "5 Kesalahan Common Investor Pemula"
8. "Cara Nabung Sambil Beli Rumah"

**Delivery:**

**A. Daily Tip Card:**
Dashboard show 1 tip per day:
```
💡 Money Tip Hari Ini

"3 Alasan Kenapa Dana Darurat Prioritas #1"

Baca 2 menit → [Read Now]
```

**B. Learning Path:**
```
🎓 Learning Path: Personal Finance 101

Week 1: Basics
✅ What is budget
✅ Cash flow
□ Emergency fund
□ Saving strategies

Week 2: Debt
□ Types of debt
□ Payoff strategies
...
```

**C. Contextual Learning:**
Saat user mau input kategori "Investasi" pertama kali:
```
🎓 First Investment?

Yuk baca dulu:
- "5 Tipe Investasi untuk Pemula" (3 min)
- "Reksadana vs Saham" (4 min)

Skip [Baca Nanti] [Baca Sekarang]
```

---

### TASK 3.6: Behavioral Nudges

#### TUJUAN
Small nudges yang shift behavior tanpa terasa memaksa.

#### CONTOH NUDGES

**Nudge 1: Save First**

Setiap tanggal 1 (setelah gajian):
```
💰 Kamu baru gajian!

Sebelum spending, sisihkan dulu:
Suggested: Rp 500rb ke Dana Darurat

Pay yourself first ✨

[Sisihkan Sekarang] [Nanti]
```

**Nudge 2: Cooling Period**

Sebelum purchase > Rp 500rb:
```
🛒 Purchase Alert

Kamu mau spend Rp 750.000

24-hour rule?
Coba tunggu besok, kalau masih mau → beli.
Kalau ragu → skip.

[Set Reminder 24 Jam] [Beli Sekarang] [Cancel]
```

**Nudge 3: Comparison**

Saat spending kategori tinggi:
```
📊 Kategori Nongkrong bulan ini: Rp 450rb

Kalau invest amount ini per bulan:
- 5 tahun: Rp 32jt
- 10 tahun: Rp 82jt

Trade-off worth it?
[Lanjut] [Coba Investasi]
```

**Nudge 4: Progress Celebration**

Setelah save:
```
🎉 Great!

Rp 500rb baru masuk Dana Darurat.

Dampak:
- Progress: 48% → 52%
- Target: 3 bulan lebih cepat
- Setara: 15 hari gaji

Kamu one step closer to financial freedom.

[Share Achievement] [Continue]
```

---

## FASE 4: KOMUNITAS (SOSIAL MOTIVASI)

### PRINSIP
Finansial journey terasa berat kalau sendirian.
Community memberi motivasi, accountability, dan insight.

---

### TASK 4.1: Anonymous Benchmarking

#### TUJUAN
User tahu posisi finansial mereka vs peers, without exposing identity.

#### DATA MODEL

Table: user_benchmarks_snapshots
- id
- user_id
- income_bracket (5jt-10jt, 10jt-15jt, dll)
- age_bracket (20-25, 26-30, dll)
- location_tier (Jakarta, Kota Besar, Kota Kecil)
- occupation_type (Employee, Freelance, Business, dll)
- month
- saving_rate
- category_distribution_json
- debt_ratio
- emergency_fund_months
- financial_health_score
- created_at

Aggregated view:
- Median per bracket
- Percentile calculations
- Trend over time

#### PRIVACY RULES

- User opt-in explicit
- Data aggregated, no individual identifiable
- No sharing of raw transactions
- User bisa opt-out anytime, data delete
- Legal compliance (Indonesia PDP Law)

#### UI

**Onboarding Opt-In:**
```
📊 Fitur Baru: Anonymous Benchmarking

Lihat posisi finansial kamu vs orang lain 
di segmen kamu (usia + income + lokasi).

DATA YANG DISHARE:
- Saving rate (%)
- Category distribution (%)
- Health score

DATA YANG TIDAK DISHARE:
- Nominal actual
- Transaction detail
- Identitas
- Merchant

Fully anonymous. Bisa opt-out kapan aja.

[Aktifkan] [Nanti Saja]
```

**Benchmark View:**
```
📊 Kamu vs Peer

Segment: Umur 26-30, Income 5-10jt, Jakarta

💰 Saving Rate
Kamu:     ████████░░ 22%
Median:   █████░░░░░ 12%
Top 10%:  ████████░░ 28%
🎉 Kamu di top 25%!

📊 Category Distribution (%)
                Kamu    Median  Top 10%
Kebutuhan:     42%     50%     35%
Wants:         18%     28%     15%
Savings:       22%     12%     28%
Fixed:         18%     10%     22%

🏆 Health Score
Kamu:  87
Median: 65
Top 10%: 90

Trend 6 bulan: ↗ improving

[Detail per Metric]
```

**Insights Berdasarkan Comparison:**
```
💡 Insight untuk Kamu

Kamu excel di:
✨ Saving rate 10% di atas median
✨ Health score top 20%

Area to improve:
⚠️ Fixed cost 8% lebih tinggi dari median
   → Cek subscription atau tagihan
   
🎯 Untuk masuk top 10%:
   Naikkan saving rate ke 28%
   (dari 22%, butuh Rp 300rb extra/bulan)

[Action Plan]
```

---

### TASK 4.2: Achievement System

#### TUJUAN
Gamification yang meaningful, bukan addictive.

#### KATEGORI ACHIEVEMENTS

**Milestones (One-time):**

Fondation:
- 🎯 "First Step" - Catat transaksi pertama
- 📊 "Budget Builder" - Buat budget pertama
- 💰 "First Saver" - Nabung pertama kali
- 🎯 "Goal Setter" - Set target pertama
- 📈 "Analyzer" - Buka Monevisor pertama kali

Consistency:
- 🔥 "Week Warrior" - 7 hari streak
- 🏆 "Month Master" - 30 hari streak
- 💎 "Season Champion" - 90 hari streak
- 👑 "Year Long Legend" - 365 hari streak

Financial Growth:
- 🚀 "1 Million Club" - Total saving Rp 1jt
- 💰 "10 Million Club" - Total saving Rp 10jt
- 💎 "100 Million Club" - Total saving Rp 100jt
- 🏆 "Debt Free" - Lunas semua utang
- 🌱 "Emergency Ready" - Dana darurat 3 bulan

Behavior:
- 🧘 "Mindful Spender" - 30 hari tanpa impulse purchase > Rp 200rb
- 📚 "Learner" - Baca 10 artikel finansial
- 🎯 "Goal Achiever" - Capai 1 target finansial
- 🤝 "Family Financer" - Aktivasi couple pack + connect pasangan

Advanced:
- 💼 "Investor" - Investasi pertama tercatat
- 🏠 "Home Owner" - Log purchase properti
- 🎓 "Financial Grad" - Score > 90 selama 3 bulan

**Progressive Levels:**

Level 1: Novice (0-500 XP)
Level 2: Rookie (500-2000 XP)
Level 3: Explorer (2000-5000 XP)
Level 4: Practitioner (5000-15000 XP)
Level 5: Expert (15000-50000 XP)
Level 6: Master (50000+ XP)

XP earned dari:
- Catat transaksi: 1 XP
- Weekly check-in: 20 XP
- Monthly review: 50 XP
- Achievement unlocked: 100 XP
- Streak milestones: bonus XP

#### UI

**Achievement Wall:**
```
🏆 Achievements

Total: 23/50 (46%)
Level: 4 - Practitioner (7,850 XP)

Recent:
🔥 Week Warrior - 7 hari lalu
📊 Budget Builder - 2 minggu lalu
💰 First Saver - 3 minggu lalu

In Progress:
🏆 Month Master
Progress: ▓▓▓▓▓▓░░░░ 21/30 hari

Locked (Hint):
🚀 1 Million Club
Total saving progress: Rp 750rb / Rp 1jt

[Semua Achievements →]
```

**Detail Achievement:**
```
🔥 Month Master

Streak 30 hari catat transaksi.

Progress: 21/30
Estimated: 9 hari lagi

Kenapa penting?
Konsistensi adalah kunci financial discipline.
User dengan streak > 30 hari punya health score 
40% lebih tinggi rata-rata.

Rewards:
- 100 XP
- Badge "Month Master"
- Unlock: Advanced insights

[Kembali]
```

**Level Up Celebration:**
```
🎉 LEVEL UP!

Kamu naik ke Level 5: Expert

Total XP: 15,340

Unlocks:
✨ Advanced Analytics
✨ Custom achievement creator
✨ Exclusive learning content
✨ Priority feature requests

[Continue] [Share]
```

---

### TASK 4.3: Community Features (Optional, Advanced)

#### TUJUAN
Buat community organik untuk peer learning & support.

#### FEATURES

**A. Anonymous Success Stories**

User bisa share (anonymous):
- Journey mereka
- Milestone tercapai
- Tips yang works

Format:
```
📖 Success Story

"Cara Saya Lunas Utang Rp 30jt dalam 18 Bulan"

Anonymous | 6 bulan lalu | Age 28-30 | Jakarta

Journey:
Bulan 1-3: Analisis & buat plan
Bulan 4-9: Extra payment agresif
Bulan 10-18: Snowball to bebas

Key learnings:
1. Cut lifestyle inflation
2. Side income Rp 2jt/bulan
3. Automate saving

❤️ 1,234 ✍️ 89 comments

[Read Full] [Share Yours]
```

**B. Community Challenges**

Monthly challenge yang bisa di-join:
```
🎯 Challenge Bulan Ini

"Zero Impulse Purchase"
Peserta: 3,456 users

Rules:
- Tidak ada purchase > Rp 200rb tanpa 24-hour cooling
- Track daily
- Share progress

Kamu: Day 12 - 0 impulses ✅

Leaderboard (Anonymous):
1. User#4521 - 100% success
2. User#8834 - 100% success
3. Kamu - 100% success (top 5%)

[Continue Challenge] [Share Progress]
```

**C. Q&A Forum (Moderated)**

User tanya, community jawab:
```
💬 Financial Q&A

Popular:
"Baiknya invest reksadana atau saham?" - 234 answers
"Cara mulai emergency fund kalau income pas-pasan?" - 178 answers
"Kredit motor cash atau leasing?" - 156 answers

Ask your question:
[_______________________]
[Post Anonymous] [Post as Me]
```

Moderated by:
- Community moderators
- Expert contributors (verified financial planners)
- AI moderation for spam

---

### TASK 4.4: Referral & Buddy System

#### TUJUAN
Grow user base + peer support.

#### REFERRAL PROGRAM

**Structure:**
- User A invite User B
- User B beli produk apapun
- User A dapat:
  - Rp 20.000 kredit (Basic)
  - Rp 50.000 kredit (Pro+)
- User B dapat:
  - 10% discount first purchase

**UI:**
```
🎁 Invite & Earn

Bagikan Monefyi ke teman.
Mereka hemat 10%, kamu dapat kredit.

Kode kamu: HANIFR
Link: monefyi.com/r/HANIFR

Kredit terkumpul: Rp 40.000

Riwayat:
- @ari - Basic - Rp 20.000 (5 hari lalu)
- @sari - Basic - Rp 20.000 (2 minggu lalu)

Ranking:
Kamu #234 dari 5,000+ referrer
Top referrer: 45 referrals

[Bagikan Link] [Copy Code]
```

#### BUDDY SYSTEM

**Concept:**
Pair user dengan buddy yang punya goal serupa untuk mutual accountability.

**Matching:**
- Similar age
- Similar income
- Similar goals
- Similar timezone

**Interaction:**
```
🤝 Buddy Kamu

@user_5891 (Anonymous)
Similar profile, sama-sama Building Emergency Fund

Weekly check-in (Sunday):
- Kamu: 78% on-track ✅
- Buddy: 82% on-track ✅
- Both keeping strong 🔥

Message buddy:
[Send encouragement] [Share progress]

Chat only about:
✓ Motivation
✓ Progress celebration
✓ Tips sharing
✗ Personal detail
✗ Financial detail specific

[Chat Now] [Change Buddy]
```

---

## FASE 5: DIFERENSIASI KUAT (FITUR UNIK)

### PRINSIP
Fitur yang bikin Monefyi tidak bisa dicopy dengan mudah.
Yang bikin user bilang: "Ini beda dari yang lain."

---

### TASK 5.1: Money Personality System

#### TUJUAN
Setiap user unique. Strategi finansial harus disesuaikan tipe.

#### ASSESSMENT (Onboarding atau kapan saja)

15-20 pertanyaan singkat:

```
Question 1/15

Kalau kamu dapet bonus Rp 5jt, response kamu:

A. Langsung invest / tabung semua
B. Tabung 70%, spend 30% for reward
C. Split 50/50 tabung dan spend
D. Spend dulu, sisanya tabung
E. Spend untuk barang yang lama diincar

[Next]
```

Pertanyaan cover:
- Attitude toward risk
- Saving vs spending tendency
- Planning horizon
- Financial values
- Reaction to windfall
- Reaction to loss
- Delayed gratification
- Impulse control
- Money worry level
- Financial confidence

#### 8 PERSONALITY TYPES

**1. The Guardian** 🛡️
- High saver, low risk
- Prefer stability
- Motivation: Security
- Strategy: Emergency fund → conservative investment

**2. The Strategist** 🎯
- Balanced, calculated
- Long-term planner
- Motivation: Goals
- Strategy: Clear goals + optimized allocation

**3. The Adventurer** 🚀
- High risk tolerance
- Growth focused
- Motivation: Freedom
- Strategy: Aggressive investment + calculated bets

**4. The Enjoyer** 🎉
- Balance now vs future
- Value experiences
- Motivation: Happiness
- Strategy: Structured spending + moderate saving

**5. The Provider** 👨‍👩‍👧
- Family-first
- Practical
- Motivation: Protection
- Strategy: Insurance + education fund + inheritance

**6. The Freelancer** 💼
- Variable income
- Adaptive
- Motivation: Flexibility
- Strategy: Buffer + smart tax + diverse income

**7. The Minimalist** 🌿
- Low expense
- Values simplicity
- Motivation: Freedom from stuff
- Strategy: FIRE movement + minimal lifestyle

**8. The Recoverer** 🌱
- Coming from debt
- Rebuilding
- Motivation: Fresh start
- Strategy: Debt payoff → emergency fund → gradual growth

#### PERSONALIZATION IMPACT

Setelah assessment:

**Dashboard Personalisasi:**

Guardian:
- Emphasize saving progress
- Show emergency fund prominently
- Conservative tone

Adventurer:
- Show investment opportunities
- Growth metrics highlighted
- Aggressive strategies suggested

**Feature Recommendations:**

Berdasarkan tipe:
- Guardian: Suggest CD, high-yield savings
- Strategist: Suggest goal simulator, planning tools
- Adventurer: Suggest stock tracker, crypto integration
- Provider: Suggest life insurance, education savings

**Coaching Adjustment:**

Guardian coaching:
"Kamu udah punya emergency fund solid. Ready untuk step berikutnya: conservative investment?"

Adventurer coaching:
"Return investasi kamu bagus! Consider diversify dengan alternative investment?"

**Language & Tone:**

Guardian: Reassuring, careful
"Aman untuk mempertimbangkan step ini..."

Adventurer: Empowering, bold
"Time to level up your portfolio..."

---

### TASK 5.2: Impulse Purchase Killer

#### TUJUAN
Bantu user hindari impulse purchase yang menyesal kemudian.

#### FEATURES

**A. Cool-Down Wallet**

Concept: Uang untuk purchase besar harus di-"holding" dulu selama X hari.

Setup:
```
🧊 Cool-Down Wallet

Untuk purchase > Rp [500.000]:
Cooling period: [24 hours / 3 days / 7 days]

Cara kerja:
1. Kamu tandai transaksi sebagai "Intent to Buy"
2. Timer starts
3. Notifikasi periodic: "Masih mau beli?"
4. Setelah cooling period, konfirmasi
5. Kalau kamu skip → celebrate + amount ke saving

[Activate Cool-Down]
```

Flow:
```
Kamu mau beli: Laptop Bag Rp 750.000

🧊 Cool-Down Activated
Timer: 3 days remaining

Reflection prompts:
Day 1: "Kenapa kamu butuh ini?"
Day 2: "Ada alternatif lebih murah?"
Day 3: "Ini bakal kamu pakai berapa lama?"

Progress:
[Still want it] [Change mind, save Rp 750rb]
```

Kalau user skip:
```
🎉 You Just Saved Rp 750.000!

Amount otomatis masuk Dana Darurat.

Impact:
- Progress: 48% → 55%
- Target 8 hari lebih cepat

Kamu makin kuat resist impulse purchase.
Streak: 3 successful skips this month.

[Continue]
```

**B. Wishlist with Delay**

Untuk item yang user pengen tapi ga urgent:
```
💭 Wishlist

Add to wishlist instead of buying now.
Review setelah 30 hari, masih mau atau ga?

Wishlist kamu:
- iPad Pro (added 15 days ago) - masih review 15 days
- New shoes (added 45 days ago) - Ready to decide!
- Coffee machine (added 5 days ago) - review 25 days

Ready to decide:
"New shoes Rp 850.000"

Setelah 45 hari, masih mau?
[Ya, beli] [No, remove] [Extend delay 30 more days]
```

**C. Purchase Impact Preview**

Sebelum konfirmasi purchase besar di app:
```
⚠️ Purchase Preview

Kamu mau beli: Smartphone Rp 5.000.000

Financial impact:

Immediately:
- Balance: Rp 7.5jt → Rp 2.5jt
- Runway: 45 hari → 15 hari

Dampak ke goals:
- Dana Darurat: mundur 6 bulan
- DP Rumah: mundur 8 bulan

Alternatif to consider:
- Cicilan 0% 12 bulan: Rp 417rb/bulan
- Refurbished (30% cheaper): Rp 3.5jt
- Trade-in old phone: potential Rp 1.5jt

[Beli Cash] [Cicil] [Cari Alternatif] [Cancel]
```

**D. Anti-Marketing Filter**

Optional feature:
```
🛡️ Anti-Marketing Mode

Filter marketing emails, notifications, ads sales.

Bantu kamu resist:
✓ Flash sale
✓ Limited time offers
✓ Free shipping deals

Setup:
- Email filter (auto-archive marketing)
- Notification silencer (weekend only)
- Website blocker (ecommerce during work hours)

[Activate]
```

---

### TASK 5.3: Emergency Mode

#### TUJUAN
Kalau user hit rock bottom finansial, aplikasi jadi support system, bukan judge.

#### TRIGGERS

**Auto-detection:**
- Balance mendekati zero
- Multiple over-budget kategori
- Debt increase significant
- Skip payment recurring
- Frustration signals (high dismiss rate on offers)

**Manual activation:**
- User bisa activate dari settings
- "I'm in financial trouble"

#### EMERGENCY MODE FEATURES

**A. Simplified Interface**

Hide non-essential:
- Investment tracker
- Complex analytics
- Marketing offers
- Non-critical notifications

Show priority:
- Current balance
- Urgent bills
- Immediate actions
- Support resources

**B. Immediate Assessment**

```
🚨 Emergency Assessment

Mari kita review situasi:

Cash available: Rp 500.000
Bills due this week:
- Kost: Rp 1.200.000 (in 3 days)
- Listrik: Rp 150.000 (in 5 days)

Total needed: Rp 1.350.000
Shortage: Rp 850.000

Immediate options:
1. Delay non-urgent expense
2. Contact creditor for extension
3. Emergency income sources
4. Ask for help (family/friend)

Let's plan step by step:
[Start Emergency Plan]
```

**C. Cost Cutting Wizard**

```
✂️ Cut Non-Essential Now

Analisis expense kamu, ini yang bisa di-cut immediately:

Subscription (Rp 425rb/bulan):
□ Netflix Rp 120rb → cancel, save Rp 120rb
□ Spotify Rp 55rb → keep (moral)
□ YouTube Premium Rp 75rb → cancel
□ iCloud Rp 45rb → downgrade to free
□ Notion Rp 130rb → cancel until stable

Immediate savings: Rp 370rb/bulan

Discretionary (last month):
- Nongkrong Rp 450rb → target Rp 100rb
- Hiburan Rp 350rb → freeze
- Belanja online Rp 200rb → freeze

Potential savings: Rp 900rb/bulan

[Apply All Cuts]
```

**D. Income Booster Ideas**

```
💰 Emergency Income Ideas

Quick wins (this week):
- Jual barang tidak terpakai (avg Rp 500rb-2jt)
- Freelance gig (Fiverr, Sribulancer)
- Overtime kerja
- Weekend delivery (Grab, GoJek)

This month:
- Rent kamar kalau ada extra
- Tutor privat
- Jual skill online

Long-term:
- Side hustle konsisten
- Skill upgrade for promotion

Resources:
- [Link to article: 20 side hustles for Indonesia]
- [Guide: Ask boss for raise]

[Explore Options]
```

**E. Recovery Roadmap**

```
🗺️ Recovery Plan - 90 Days

Week 1-2: Stabilize
□ Cut all non-essential
□ Address urgent bills
□ Communicate with creditors
□ Emergency income (Rp 1jt)

Week 3-4: Rebuild
□ Strict budget
□ Track every rupiah
□ Small emergency fund (Rp 500rb)

Week 5-8: Restore
□ Consistent income
□ Rebuild emergency fund
□ Start reducing debt

Week 9-12: Recover
□ Emergency fund 1 month
□ Debt reduction plan
□ Return to normal mode

[Start Week 1]
```

**F. Mental Health Support**

```
🫂 You're Not Alone

Financial stress is real.

Resources:
- Free counseling: [BKKBN hotline]
- Community support: [group link]
- Motivational content: [curated]

Reminder:
"This is temporary. You will get through this. 
Every small step counts. Be kind to yourself."

[Continue Recovery] [Talk to Someone]
```

---

### TASK 5.4: Financial Wellness Metrics

#### TUJUAN
Track bukan cuma angka, tapi juga wellbeing.

#### METRICS

**Objective (numerik):**
Sudah covered di Financial Health Score.

**Subjective (perasaan):**

Weekly check-in:
```
🌱 Weekly Wellness Check

1. Financial stress level? 
   [1=Very Low ---- 10=Very High]

2. Confidence about financial future?
   [1=Very Low ---- 10=Very High]

3. Money-related sleep quality?
   [1=Poor ---- 10=Excellent]

4. Relationship with money right now?
   ○ Anxious ○ Stressed ○ Neutral ○ Confident ○ Peaceful

5. One word to describe your financial life this week?
   [_______________________]

[Submit]
```

#### COMBINED SCORE

```
🌱 Financial Wellness Score

Combined: 78/100 (Good)

Breakdown:
- Objective (Financial Health Score): 87/100
- Subjective (Wellbeing): 68/100

Insight:
"Kamu secara numerik excellent, tapi subjective 
wellness masih ada tekanan. Ini normal saat 
lagi push saving hard."

Recommendations:
- Consider allocating some for "guilt-free fun"
- Review workload / stress levels
- Talk to accountability partner

Trend 6 months:
[Chart showing objective vs subjective]

Insight: "Objective naik terus, subjective dip di 
bulan 3-4 saat push saving agresif. Balance is key."
```

---

### TASK 5.5: Life Event Planner

#### TUJUAN
Bantu user prepare untuk life events major.

#### LIFE EVENTS COVERED

**Getting Married:**
```
💍 Wedding Planning Financial Guide

Est. cost in Indonesia:
- Simple (150 guests): Rp 100jt
- Medium (300 guests): Rp 250jt
- Grand (500+ guests): Rp 500jt+

Kamu targeted: [Medium]
Wedding date: [March 2028] (18 months)

Monthly saving needed: Rp 14jt

Current progress: Rp 25jt (10%)
On-track: ❌ Behind

Options:
1. Adjust date (extend timeline)
2. Adjust scale (smaller wedding)
3. Boost saving (extra Rp 5jt/month needed)
4. Combined approach

[Plan Wedding Budget]
```

**Having a Baby:**
```
👶 Baby Financial Planning

Timeline: [8 months to due date]

One-time costs:
- Persalinan (normal): Rp 15-30jt
- Persalinan (caesar): Rp 30-50jt
- Baby gear: Rp 15jt

Monthly ongoing:
- Popok & susu: Rp 1.5-3jt
- Health insurance: Rp 500rb-1jt
- Emergency: Rp 500rb

Total prep needed: Rp 45jt
Monthly ongoing: Rp 3.5jt extra

Current savings: Rp 12jt
Gap: Rp 33jt in 8 months = Rp 4.1jt/month

Plan:
1. Emergency fund harus 6 bulan expense
2. Health insurance ASAP
3. Investment paused, focus saving

[Detailed Plan]
```

**Buying House:**
```
🏠 Home Buying Guide

Target: Rumah Rp 500jt
DP standard: 20% = Rp 100jt
Timeline: 3 years

Monthly DP saving: Rp 2.8jt

Additional costs to prep:
- Notaris & pajak: Rp 25jt
- Renovasi: Rp 30jt
- Emergency fund: 6 bulan
- Total buffer: Rp 100jt+

Total needed: Rp 200jt in 3 years
= Rp 5.5jt/month total saving

Strategy:
- Reksadana pasar uang (year 1-2)
- Reksadana campuran (year 2-3)
- Cash 6 months before purchase

[Home Planning Tool]
```

**Career Change:**
```
💼 Career Transition Planning

Current: Employee, Rp 8jt/bulan
Target: Freelance, Rp 6-15jt (variable)

Financial prep:
1. Emergency fund: 12 bulan expense (bukan 6)
   Current: 4 bulan (Rp 32jt)
   Target: 12 bulan (Rp 96jt)
   Gap: Rp 64jt

2. Clear all consumer debt
   Current utang: Rp 15jt
   Payoff timeline: 12 months

3. Build side income first
   Target: Rp 3jt/bulan sebelum resign
   Timeline: 6 months experiment

4. Health insurance private
   Rp 500rb-1jt/bulan

Recommended timeline: 18-24 months prep

[Career Planning]
```

**Kids Education:**
```
🎓 Education Fund Planning

Kids: [Nama Anak]
Age: [2 years]
Target: S1 (18 years from now)

Cost projection (with inflation):
- SD Swasta: Rp 300jt total
- SMP-SMA: Rp 500jt total
- S1 Dalam Negeri: Rp 200jt
- S1 Luar Negeri: Rp 2M+

Total (medium): Rp 1M
With inflation 6%/year: Rp 2.85M

Monthly saving needed:
- Now start: Rp 4.5jt/month
- Start in 5 years: Rp 8jt/month
- Start in 10 years: Rp 15jt/month

⚡ Start now = 3x cheaper!

Investment vehicle:
- Reksadana pendidikan
- Asuransi pendidikan
- Custom portfolio

[Setup Education Fund]
```

---

### TASK 5.6: Voice Financial Assistant

#### TUJUAN
Hands-free interaction untuk convenience.

#### CAPABILITIES

**Query:**
- "Berapa saldo saya sekarang?"
- "Budget makan bulan ini gimana?"
- "Kapan target dana darurat tercapai?"
- "Cek transaksi terakhir"

**Command:**
- "Catat kopi 30rb GoPay"
- "Tambah target liburan 5 juta"
- "Bayar cicilan HP"
- "Set reminder tagihan besok"

**Analysis:**
- "Insight bulan ini apa?"
- "Cara nabung lebih banyak?"
- "Prediksi bulan depan"

#### INTEGRATION

Web Speech API untuk PWA
Voice input di FAB button
Auto-detect language (ID/EN)

---

## EXECUTION ROADMAP

### QUARTER 1 (Bulan 1-3)

**Priority: Actionable Intelligence + Otomasi Basic**

Sprint 1-2: Smart Suggestions Engine + Recurring Transactions
Sprint 3-4: What-If Simulator + Smart Auto-Categorization
Sprint 5-6: Contextual Micro-Insights + Bulk Actions

### QUARTER 2 (Bulan 4-6)

**Priority: Coaching System**

Sprint 7-8: Weekly Digest Enhancement + Monthly Review Ritual
Sprint 9-10: Financial Health Score + Coaching Plans
Sprint 11-12: Micro-Learning + Behavioral Nudges

### QUARTER 3 (Bulan 7-9)

**Priority: Community + Motivasi**

Sprint 13-14: Anonymous Benchmarking + Achievement System
Sprint 15-16: Referral & Buddy System
Sprint 17-18: Community Features (Optional)

### QUARTER 4 (Bulan 10-12)

**Priority: Diferensiasi Kuat**

Sprint 19-20: Money Personality + Impulse Killer
Sprint 21-22: Emergency Mode + Wellness Metrics
Sprint 23-24: Life Event Planner + Voice Assistant

---

## SUCCESS METRICS PER FASE

### Fase 1: Actionable Intelligence
- Insight generated per user per week: > 3
- Insight click-through rate: > 20%
- Action taken from insight: > 15%
- User feedback: "Helpful" > 80%

### Fase 2: Otomasi
- Recurring setup adoption: > 60% users
- Auto-categorization accuracy: > 90%
- Time saved per transaction: > 50%
- User satisfaction: > 4.5/5

### Fase 3: Coaching
- Weekly digest open rate: > 60%
- Monthly review completion: > 40%
- Health score improvement: avg +5 per month
- Coaching plan enrollment: > 30%
- Plan completion rate: > 60%

### Fase 4: Komunitas
- Benchmarking opt-in: > 50%
- Achievement unlocked per user: > 5
- Referral rate: > 15% users refer at least once
- Community engagement: > 20% users interact

### Fase 5: Diferensiasi
- Personality assessment completion: > 70%
- Impulse killer usage: > 40% users
- Emergency mode helpful rating: > 4.5/5
- Life event planner adoption: > 25%
- Voice assistant adoption: > 20%

---

## PRINSIP AKHIR

Setiap fitur harus jawab:

1. **Does it help user make better decisions?**
2. **Does it save user time or effort?**
3. **Does it build a healthy habit?**
4. **Does it make user feel supported?**
5. **Does it differentiate from competitors?**

Kalau ya untuk minimal 2 pertanyaan = build.
Kalau ya untuk semua = priority build.

Monefyi bukan aplikasi.
Monefyi adalah teman finansial yang selalu ada.

Yang mengerti kondisi kamu.
Yang membantu tanpa menghakimi.
Yang celebrate progress kecil.
Yang push saat kamu butuh push.
Yang comfort saat kamu butuh comfort.

Itu yang membuat Monefyi tidak tergantikan.
```

---

## Ringkasan Cepat

### 🎯 Yang Baru di Prompt Ini:

**Fase 1 - Actionable Intelligence:**
- Smart Suggestions Engine dengan 7 generator berbeda
- What-If Simulator (4 tipe simulasi)
- Contextual micro-insights di berbagai touchpoint
- Predictive alerts sebelum masalah terjadi

**Fase 2 - Otomasi:**
- Recurring transactions dengan reminder & auto-create
- Smart auto-categorization (dictionary + learning + context)
- Bulk actions untuk power users
- Auto-sync bank/wallet (email, SMS, API)
- Smart suggestions saat input (templates, predictive, time-based)

**Fase 3 - Coaching:**
- Monthly Review Ritual (6-step guided flow)
- Financial Health Score (6 komponen, tracking historical)
- 5 Coaching Plans personalized
- Micro-learning content system
- Behavioral nudges yang halus

**Fase 4 - Komunitas:**
- Anonymous benchmarking dengan privacy strict
- Achievement system yang meaningful (bukan addictive)
- Community features (success stories, challenges, Q&A)
- Referral program + Buddy system

**Fase 5 - Diferensiasi:**
- Money Personality System (8 tipe, personalisasi total)
- Impulse Purchase Killer (Cool-down wallet, wishlist, dll)
- Emergency Mode (support saat rock bottom)
- Financial Wellness Metrics (objektif + subjektif)
- Life Event Planner (nikah, anak, rumah, karir)
- Voice Financial Assistant

### 💡 Yang Membedakan:

Prompt-prompt sebelumnya fokus pada **"membuat produk yang benar"** (bug fix, sync, dll).

Prompt ini fokus pada **"membuat produk yang dicintai"** (habit, coaching, community, unique features).

Timeline realistis: **12 bulan** untuk full implementation.
Investment: Team dedicated 4-6 developers + 1 designer + 1 content writer.