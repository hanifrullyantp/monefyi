import type { BudgetInsight, BudgetPlan, KategoriTipe } from "@/types/budget-planner";
import { formatCurrency } from "@/lib/formatters";

export function generateInsights(budget: BudgetPlan): BudgetInsight[] {
  const insights: BudgetInsight[] = [];
  const total = budget.totalPenghasilan;
  if (total <= 0) return [];

  // Helper to get kategori by tipe
  const getByTipe = (tipe: KategoriTipe) =>
    budget.kategori.filter((k) => k.tipe === tipe);

  const kebutuhanKategori = getByTipe("kebutuhan");
  const tabunganKategori = [
    ...getByTipe("tabungan"),
    ...getByTipe("investasi"),
  ];
  const sedekahKategori = getByTipe("sedekah");
  const keinginanKategori = getByTipe("keinginan");

  const totalKebutuhan = kebutuhanKategori.reduce(
    (s, k) => s + k.rupiahAlokasi,
    0
  );
  const totalTabungan = tabunganKategori.reduce(
    (s, k) => s + k.rupiahAlokasi,
    0
  );
  const totalSedekah = sedekahKategori.reduce(
    (s, k) => s + k.rupiahAlokasi,
    0
  );
  const totalKeinginan = keinginanKategori.reduce(
    (s, k) => s + k.rupiahAlokasi,
    0
  );

  const pctKebutuhan = (totalKebutuhan / total) * 100;
  const pctTabungan = (totalTabungan / total) * 100;
  const pctSedekah = (totalSedekah / total) * 100;
  const pctKeinginan = (totalKeinginan / total) * 100;

  const overspendKategori = budget.kategori.filter(
    (k) => k.rupiahAlokasi > 0 && k.rupiahTerpakai > k.rupiahAlokasi
  );
  const hasDanadarurat = budget.kategori.some(
    (k) =>
      k.nama.toLowerCase().includes("darurat") ||
      k.id.toLowerCase().includes("darurat")
  );

  // --- NEGATIVE insights (prioritas tinggi) ---
  if (overspendKategori.length > 0) {
    overspendKategori.forEach((k, idx) => {
      insights.push({
        tipe: "negatif",
        judul: `${k.nama} Melebihi Anggaran`,
        pesan: `Kategori "${k.nama}" sudah melebihi alokasi sebesar ${formatCurrency(
          k.rupiahTerpakai - k.rupiahAlokasi
        )}. Evaluasi pengeluaran di kategori ini.`,
        aksi: "Sesuaikan alokasi",
        icon: "AlertTriangle",
        prioritas: 1 + idx,
      });
    });
  }

  if (pctKebutuhan > 60 && pctKebutuhan > 0) {
    insights.push({
      tipe: "negatif",
      judul: "Kebutuhan Melebihi Batas Ideal",
      pesan: `Alokasi kebutuhan Anda sebesar ${pctKebutuhan.toFixed(0)}% melebihi batas ideal 60%. Pertimbangkan untuk mengurangi pengeluaran tetap seperti sewa atau cicilan.`,
      aksi: "Evaluasi pengeluaran tetap",
      icon: "TrendingDown",
      prioritas: 2,
    });
  }

  if (pctTabungan < 10 && total > 0 && pctTabungan >= 0) {
    const targetTambahan = Math.round((total * 0.1) - totalTabungan);
    insights.push({
      tipe: "negatif",
      judul: "Tabungan Di Bawah Ideal",
      pesan: `Alokasi tabungan Anda hanya ${pctTabungan.toFixed(0)}%. Idealnya minimal 10-20%. Coba tingkatkan secara bertahap, mulai dari ${formatCurrency(targetTambahan)} per bulan.`,
      aksi: "Tingkatkan tabungan",
      icon: "PiggyBank",
      prioritas: 3,
    });
  }

  if (pctKeinginan > 35 && pctKeinginan > 0) {
    insights.push({
      tipe: "negatif",
      judul: "Pengeluaran Lifestyle Cukup Besar",
      pesan: `Alokasi keinginan Anda sebesar ${pctKeinginan.toFixed(0)}% cukup besar. Evaluasi pengeluaran lifestyle dan cari yang bisa dikurangi.`,
      icon: "ShoppingBag",
      prioritas: 4,
    });
  }

  // --- POSITIVE insights ---
  if (pctTabungan >= 20) {
    insights.push({
      tipe: "positif",
      judul: "Alokasi Tabungan Sudah Ideal! 🎉",
      pesan: `Tabungan ${pctTabungan.toFixed(0)}% dari penghasilan — Anda sudah di jalur yang benar! Pertahankan kebiasaan ini dan pertimbangkan investasi rutin.`,
      icon: "Star",
      prioritas: 10,
    });
  }

  if (overspendKategori.length === 0 && budget.kategori.length > 0 && budget.totalTerpakai > 0) {
    insights.push({
      tipe: "positif",
      judul: "Budget Terkendali Dengan Baik! ✅",
      pesan: "Semua kategori masih dalam batas anggaran. Kerja bagus! Pertahankan disiplin keuangan ini.",
      icon: "CheckCircle",
      prioritas: 11,
    });
  }

  if (pctSedekah >= 2.5 && pctSedekah > 0) {
    insights.push({
      tipe: "positif",
      judul: "Alhamdulillah, Sudah Alokasi Sedekah 🤲",
      pesan: `Anda mengalokasikan ${pctSedekah.toFixed(1)}% untuk sedekah dan zakat. Semoga menjadi berkah dan semakin membuka pintu rezeki.`,
      icon: "Heart",
      prioritas: 12,
    });
  }

  // --- SARAN insights ---
  if (!hasDanadarurat) {
    insights.push({
      tipe: "saran",
      judul: "Tambahkan Dana Darurat",
      pesan: "Belum ada alokasi dana darurat dalam budget Anda. Idealnya simpan 3-6x pengeluaran bulanan sebagai dana darurat.",
      aksi: "Tambah kategori dana darurat",
      icon: "Shield",
      prioritas: 5,
    });
  }

  if (budget.profilKeuangan.penghasilanTambahan > 0) {
    insights.push({
      tipe: "saran",
      judul: "Manfaatkan Penghasilan Tambahan",
      pesan: `Anda memiliki penghasilan tambahan ${formatCurrency(budget.profilKeuangan.penghasilanTambahan)}. Pertimbangkan untuk menambah porsi investasi dari penghasilan ini.`,
      icon: "TrendingUp",
      prioritas: 13,
    });
  }

  if (total < 3_000_000 && total > 0) {
    insights.push({
      tipe: "saran",
      judul: "Prioritaskan Kebutuhan Pokok",
      pesan: "Dengan penghasilan ini, fokuslah pada kebutuhan pokok dan bangun dana darurat kecil terlebih dahulu. Setiap rupiah yang ditabung tetap berarti.",
      icon: "AlertCircle",
      prioritas: 6,
    });
  }

  if (total >= 10_000_000 && pctTabungan < 25) {
    insights.push({
      tipe: "saran",
      judul: "Optimalkan Investasi Anda",
      pesan: "Dengan penghasilan di atas 10 juta, Anda bisa meningkatkan porsi investasi. Pertimbangkan reksa dana, saham, atau properti untuk diversifikasi.",
      icon: "BarChart",
      prioritas: 14,
    });
  }

  // Sort by prioritas ascending
  return insights.sort((a, b) => a.prioritas - b.prioritas).slice(0, 6);
}
