import type { KategoriItem } from "@/types/budget-planner";

export function calculateBudget40302010(
  penghasilan: number,
  penghasilanTambahan: number
): KategoriItem[] {
  const total = penghasilan + penghasilanTambahan;

  if (total <= 0) {
    return getEmptyKategori();
  }

  const kebutuhan = total * 0.4;
  const keinginan = total * 0.3;
  const tabungan = total * 0.2;
  const sedekah = total * 0.1;

  // Zakat penghasilan estimasi = 2.5% dari penghasilan utama
  const zakatEstimasi = penghasilan * 0.025;

  return [
    {
      id: "kebutuhan",
      nama: "Kebutuhan Hidup",
      tipe: "kebutuhan",
      persentaseDefault: 40,
      rupiahAlokasi: kebutuhan,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Home",
      deskripsi: "Kebutuhan pokok yang wajib dipenuhi",
      subKategori: [
        {
          id: "sewa",
          nama: "Tempat Tinggal (Sewa/KPR)",
          rupiah: Math.round(total * 0.14),
          isCustom: false,
        },
        {
          id: "makan",
          nama: "Makan & Groceries",
          rupiah: Math.round(total * 0.1),
          isCustom: false,
        },
        {
          id: "transportasi",
          nama: "Transportasi",
          rupiah: Math.round(total * 0.06),
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
          rupiah: Math.round(total * 0.03),
          isCustom: false,
        },
        {
          id: "keluarga",
          nama: "Kebutuhan Keluarga",
          rupiah: Math.round(total * 0.03),
          isCustom: false,
        },
      ],
    },
    {
      id: "keinginan",
      nama: "Keinginan & Gaya Hidup",
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
          rupiah: Math.round(total * 0.08),
          isCustom: false,
        },
        {
          id: "hiburan",
          nama: "Hiburan & Streaming",
          rupiah: Math.round(total * 0.04),
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
          rupiah: Math.round(total * 0.04),
          isCustom: false,
        },
        {
          id: "lainnya",
          nama: "Lainnya",
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
          rupiah: Math.round(total * 0.07),
          isCustom: false,
        },
        {
          id: "investasi",
          nama: "Investasi",
          rupiah: Math.round(total * 0.08),
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
    {
      id: "sedekah",
      nama: "Sedekah, Zakat & Infaq",
      tipe: "sedekah",
      persentaseDefault: 10,
      rupiahAlokasi: sedekah,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Heart",
      deskripsi: "Zakat penghasilan, sedekah, dan infaq",
      subKategori: [
        {
          id: "zakat",
          nama: `Zakat Penghasilan (est. Rp ${Math.round(zakatEstimasi).toLocaleString("id-ID")})`,
          rupiah: Math.round(zakatEstimasi),
          isCustom: false,
        },
        {
          id: "sedekah-rutin",
          nama: "Sedekah Rutin",
          rupiah: Math.round(sedekah * 0.4),
          isCustom: false,
        },
        {
          id: "infaq",
          nama: "Infaq & Keluarga",
          rupiah: Math.round(sedekah - zakatEstimasi - sedekah * 0.4),
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
      persentaseDefault: 40,
      rupiahAlokasi: 0,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Home",
      deskripsi: "Kebutuhan pokok yang wajib dipenuhi",
    },
    {
      id: "keinginan",
      nama: "Keinginan & Gaya Hidup",
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
    {
      id: "sedekah",
      nama: "Sedekah, Zakat & Infaq",
      tipe: "sedekah",
      persentaseDefault: 10,
      rupiahAlokasi: 0,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Heart",
      deskripsi: "Zakat penghasilan, sedekah, dan infaq",
    },
  ];
}
