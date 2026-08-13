import type { KategoriItem } from "@/types/budget-planner";

export function calculateBudget503020(
  penghasilan: number,
  penghasilanTambahan: number
): KategoriItem[] {
  const total = penghasilan + penghasilanTambahan;

  if (total <= 0) {
    return getEmptyKategori();
  }

  const kebutuhan = total * 0.5;
  const keinginan = total * 0.3;
  const tabungan = total * 0.2;

  return [
    {
      id: "kebutuhan",
      nama: "Kebutuhan Hidup",
      tipe: "kebutuhan",
      persentaseDefault: 50,
      rupiahAlokasi: kebutuhan,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Home",
      deskripsi: "Kebutuhan pokok yang wajib dipenuhi setiap bulan",
      subKategori: [
        {
          id: "sewa",
          nama: "Tempat Tinggal (Sewa/KPR)",
          rupiah: Math.round(total * 0.175),
          isCustom: false,
        },
        {
          id: "makan",
          nama: "Makan & Groceries",
          rupiah: Math.round(total * 0.125),
          isCustom: false,
        },
        {
          id: "transportasi",
          nama: "Transportasi",
          rupiah: Math.round(total * 0.075),
          isCustom: false,
        },
        {
          id: "tagihan",
          nama: "Tagihan Utilitas",
          rupiah: Math.round(total * 0.04),
          isCustom: false,
        },
        {
          id: "kesehatan",
          nama: "Kesehatan & Asuransi",
          rupiah: Math.round(total * 0.04),
          isCustom: false,
        },
        {
          id: "keluarga",
          nama: "Kebutuhan Keluarga",
          rupiah: Math.round(total * 0.045),
          isCustom: false,
        },
      ],
    },
    {
      id: "keinginan",
      nama: "Keinginan & Lifestyle",
      tipe: "keinginan",
      persentaseDefault: 30,
      rupiahAlokasi: keinginan,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "ShoppingBag",
      deskripsi: "Pengeluaran untuk gaya hidup dan hiburan",
      subKategori: [
        {
          id: "kuliner",
          nama: "Makan di Luar / Kuliner",
          rupiah: Math.round(total * 0.075),
          isCustom: false,
        },
        {
          id: "hiburan",
          nama: "Hiburan & Streaming",
          rupiah: Math.round(total * 0.035),
          isCustom: false,
        },
        {
          id: "pakaian",
          nama: "Pakaian & Aksesori",
          rupiah: Math.round(total * 0.05),
          isCustom: false,
        },
        {
          id: "hobi",
          nama: "Hobi",
          rupiah: Math.round(total * 0.05),
          isCustom: false,
        },
        {
          id: "liburan",
          nama: "Liburan (tabung per bulan)",
          rupiah: Math.round(total * 0.09),
          isCustom: false,
        },
      ],
    },
    {
      id: "tabungan",
      nama: "Tabungan & Investasi",
      tipe: "tabungan",
      persentaseDefault: 20,
      rupiahAlokasi: tabungan,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "TrendingUp",
      deskripsi: "Untuk masa depan dan keamanan finansial",
      subKategori: [
        {
          id: "dana-darurat",
          nama: "Dana Darurat",
          rupiah: Math.round(total * 0.075),
          isCustom: false,
        },
        {
          id: "investasi",
          nama: "Investasi",
          rupiah: Math.round(total * 0.075),
          isCustom: false,
        },
        {
          id: "tabungan-tujuan",
          nama: "Tabungan Tujuan",
          rupiah: Math.round(total * 0.05),
          isCustom: false,
        },
      ],
    },
  ];
}

function getEmptyKategori(): KategoriItem[] {
  return [
    {
      id: "kebutuhan",
      nama: "Kebutuhan Hidup",
      tipe: "kebutuhan",
      persentaseDefault: 50,
      rupiahAlokasi: 0,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Home",
      deskripsi: "Kebutuhan pokok yang wajib dipenuhi setiap bulan",
    },
    {
      id: "keinginan",
      nama: "Keinginan & Lifestyle",
      tipe: "keinginan",
      persentaseDefault: 30,
      rupiahAlokasi: 0,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "ShoppingBag",
      deskripsi: "Pengeluaran untuk gaya hidup dan hiburan",
    },
    {
      id: "tabungan",
      nama: "Tabungan & Investasi",
      tipe: "tabungan",
      persentaseDefault: 20,
      rupiahAlokasi: 0,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "TrendingUp",
      deskripsi: "Untuk masa depan dan keamanan finansial",
    },
  ];
}
