import type { KategoriItem } from "@/types/budget-planner";

export function calculateBudget702010(
  penghasilan: number,
  penghasilanTambahan: number
): KategoriItem[] {
  const total = penghasilan + penghasilanTambahan;

  if (total <= 0) {
    return getEmptyKategori();
  }

  const pengeluaran = total * 0.7;
  const tabungan = total * 0.2;
  const hutangDonasi = total * 0.1;

  return [
    {
      id: "pengeluaran",
      nama: "Pengeluaran Hidup",
      tipe: "kebutuhan",
      persentaseDefault: 70,
      rupiahAlokasi: pengeluaran,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Wallet",
      deskripsi: "Semua kebutuhan dan keinginan hidup sehari-hari",
      subKategori: [
        {
          id: "sewa",
          nama: "Tempat Tinggal",
          rupiah: Math.round(total * 0.2),
          isCustom: false,
        },
        {
          id: "makan",
          nama: "Makan & Groceries",
          rupiah: Math.round(total * 0.15),
          isCustom: false,
        },
        {
          id: "transportasi",
          nama: "Transportasi",
          rupiah: Math.round(total * 0.1),
          isCustom: false,
        },
        {
          id: "tagihan",
          nama: "Tagihan & Utilitas",
          rupiah: Math.round(total * 0.05),
          isCustom: false,
        },
        {
          id: "lainnya",
          nama: "Lainnya",
          rupiah: Math.round(total * 0.2),
          isCustom: false,
        },
      ],
    },
    {
      id: "tabungan",
      nama: "Tabungan",
      tipe: "tabungan",
      persentaseDefault: 20,
      rupiahAlokasi: tabungan,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "PiggyBank",
      deskripsi: "Tabungan dan investasi untuk masa depan",
      subKategori: [
        {
          id: "dana-darurat",
          nama: "Dana Darurat",
          rupiah: Math.round(total * 0.1),
          isCustom: false,
        },
        {
          id: "investasi",
          nama: "Investasi",
          rupiah: Math.round(total * 0.1),
          isCustom: false,
        },
      ],
    },
    {
      id: "hutang-donasi",
      nama: "Hutang / Donasi",
      tipe: "hutang",
      persentaseDefault: 10,
      rupiahAlokasi: hutangDonasi,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "CreditCard",
      deskripsi: "Cicilan hutang atau donasi sosial",
      subKategori: [
        {
          id: "cicilan",
          nama: "Cicilan / Hutang",
          rupiah: Math.round(total * 0.05),
          isCustom: false,
        },
        {
          id: "donasi",
          nama: "Donasi / Sedekah",
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
      id: "pengeluaran",
      nama: "Pengeluaran Hidup",
      tipe: "kebutuhan",
      persentaseDefault: 70,
      rupiahAlokasi: 0,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Wallet",
      deskripsi: "Semua kebutuhan dan keinginan hidup sehari-hari",
    },
    {
      id: "tabungan",
      nama: "Tabungan",
      tipe: "tabungan",
      persentaseDefault: 20,
      rupiahAlokasi: 0,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "PiggyBank",
      deskripsi: "Tabungan dan investasi untuk masa depan",
    },
    {
      id: "hutang-donasi",
      nama: "Hutang / Donasi",
      tipe: "hutang",
      persentaseDefault: 10,
      rupiahAlokasi: 0,
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "CreditCard",
      deskripsi: "Cicilan hutang atau donasi sosial",
    },
  ];
}
