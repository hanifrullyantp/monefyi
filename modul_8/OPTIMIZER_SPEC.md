# OPTIMIZER_SPEC — Spesifikasi Optimizer & Planner Harga

Spesifikasi resmi algoritma optimasi deterministik, kendala struktur keras, fungsi objektif, rencana efisiensi, dan formulasi RAP / Harga Jual / Margin.

---

## 1. Definisi Keuangan Proyek
- **Biaya Langsung (Direct Cost)**: $\sum (\text{volume}_i \times \text{harga satuan}_i)$ dari baris BOQ.
- **Biaya Tak Langsung Riil (Indirect Cost)**: Biaya manajemen lapangan, direksi keet, mobilitas, K3 (bawaan $6\%$ dari biaya langsung).
- **Kontingensi Risiko**: Alokasi ketidakpastian fisik (bawaan $4\%$ dari langsung + tak langsung).
- **RAP (Rencana Anggaran Proyek / Modal)**:
  $$\text{RAP} = \text{Biaya Langsung} + \text{Biaya Tak Langsung} + \text{Kontingensi}$$
- **Harga Jual (Total Penawaran Sebelum PPN)**:
  $$\text{Harga Jual} = \text{RAP} + \text{Overhead} + \text{Profit}$$
- **Margin Usaha**:
  $$\text{Margin (Rp)} = \text{Harga Jual} - \text{RAP}$$
  $$\text{Margin (\%)} = \frac{\text{Margin}}{\text{Harga Jual}} \times 100\%$$
- **PPN (Pajak Pertambahan Nilai)**:
  Dihitung dari $\text{Harga Jual} \times \text{ppnPercent}$. Tidak memengaruhi nilai Margin maupun RAP.

---

## 2. Variabel Keputusan
Vektor tingkat spesifikasi untuk 12 kelompok pekerjaan:
$$s = (s_{\text{struktur}}, s_{\text{dinding}}, s_{\text{atap}}, s_{\text{plafon}}, s_{\text{lantai}}, s_{\text{kusen}}, s_{\text{cat}}, s_{\text{sanitair}}, s_{\text{listrik}}, s_{\text{air}}, s_{\text{tampak}}, s_{\text{kitchen}})$$
dengan domain diskret:
$$s_g \in \{\text{ekonomis}, \text{standar}, \text{menengah}, \text{premium}\}$$

Dan lingkup opsional biner:
$$\text{scope} \in \{\text{carport}, \text{kanopi}, \text{balkon}, \text{secondarySkin}\}$$

---

## 3. Kendala Keras (Hard Constraints — Pantang Dilanggar)
1. **Aturan Struktur Minimum (`STRUCTURE_RULES`)**:
   - Rumah 2 lantai $\rightarrow$ struktur $\ge \text{menengah}$.
   - Rumah 3 lantai $\rightarrow$ struktur $\ge \text{premium}$.
   - Tanah buruk (lembek/rawa) $\rightarrow$ struktur $\ge \text{menengah}$.
   - Atap berat (premium) $\rightarrow$ struktur $\ge \text{menengah}$.
   - Batas absolut bawah: struktur $\ge \text{standar}$ (tidak boleh ekonomis).
2. **Ketergantungan Teknis Antar-Kelompok (`SPEC_CONSTRAINTS`)**:
   - Atap premium $\rightarrow$ struktur $\ge \text{menengah}$.
   - Atap menengah $\rightarrow$ struktur $\ge \text{standar}$.
   - Lantai premium $\rightarrow$ dinding $\ge \text{standar}$ (plester/acian rata).
   - Sanitair premium $\rightarrow$ instalasi air $\ge \text{menengah}$ (air panas).
   - Tampak premium $\rightarrow$ cat eksterior $\ge \text{menengah}$.

---

## 4. Kendala Lunak & Pembobotan Kualitas (Soft Constraints)
Tiap kelompok $g$ memiliki bobot visibilitas $V_g \in [0, 1]$ (seberapa terlihat langsung oleh penghuni):
- **Visibilitas Rendah ($V_g \le 0.45$)**: Struktur ($0.15$), Air bersih ($0.35$), Dinding substrat ($0.45$), Listrik ($0.50$).
- **Visibilitas Tinggi ($V_g \ge 0.70$)**: Atap eksterior ($0.70$), Sanitair ($0.75$), Kusen ($0.80$), Lantai ($0.85$), Cat ($0.90$), Elemen tampak ($0.95$).

Biaya penurunan mutu dihitung sebagai:
$$C_{\text{impact}}(g) = \Delta \text{tingkat} \times (0.35 + 1.65 \times V_g)$$

Langkah efisiensi dengan skor prioritas tertinggi dipilih lebih dahulu:
$$\text{Skor}(g) = \frac{\Delta \text{Hemat (Rp)}}{C_{\text{impact}}(g)}$$

---

## 5. Algoritma Optimasi Deterministik
1. Mulai dari spesifikasi proyek saat ini $s_0$, dipastikan memenuhi aturan struktur via `resolveSpec(model, s0)`.
2. Jika $\text{RAP}(s_0) \le \text{Target}$, selesai (*target tercapai tanpa perubahan*).
3. Selama $\text{RAP} > \text{Target}$:
   - Kumpulkan semua kandidat penurunan 1 tingkat $s_g \rightarrow s_g - 1$ yang diizinkan dan tidak melanggar kendala keras.
   - Evaluasi penghematan $\Delta \text{RAP}$ dan hitung rasio efisiensi $\text{Skor}$.
   - Pilih kandidat dengan rasio terbaik (elemen tak terlihat dengan penghematan terbesar dipotong lebih dulu).
   - Perbarui keadaan spesifikasi dan kurangi RAP.
4. Jika tidak ada lagi langkah yang sah:
   - Hitung batas terendah yang aman ($\text{safeFloorRap}$).
   - Kumpulkan opsi pengurangan lingkup (carport, kanopi, balkon, secondary skin).
   - Buat hasil `OptimizerResult` yang memuat langkah detail dan alasan teknis.

---

## 6. Penanganan Kasus Tak Layak (*Infeasible Target*)
Bila target pengguna berada di bawah $\text{safeFloorRap}$:
1. **Tidak Ada Pemaksaan / Penipuan Angka**: Modul tidak menurunkan spesifikasi di bawah batas aman.
2. **Modal Keputusan**: Pengguna disajikan pilihan solutif:
   - **Terima Batas Aman**: Terapkan RAP terendah yang masih aman secara struktur.
   - **Kurangi Lingkup**: Lepas carport (hemat Rp X), kanopi (hemat Rp Y), dsb.
   - **Turunkan Margin**: Menahan harga jual dengan mengorbankan sebagian margin keuntungan.
   - **Batal**: Pertahankan keadaan proyek tanpa perubahan.

## Basis target (Fase 1)

Planner tidak membagi harga dengan faktor tetap. `invertPricing` melakukan bisection pada biaya langsung integer, memakai persentase proyek, kontingensi dan saklar PPN dari fungsi maju `computePricing`. Target total pembeli adalah nominal setelah PPN; margin selalu memakai harga sebelum PPN. Nilai skenario sebelum pajak dibandingkan dengan nilai sebelum pajak. Proyeksi optimizer juga memakai snapshot harga terkunci, override BOQ, dan faktor kalibrasi yang sama dengan RAB proyek.
