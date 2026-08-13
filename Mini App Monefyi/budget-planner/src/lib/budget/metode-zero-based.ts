import type { KategoriItem, KategoriTipe, ZeroBudgetState } from "@/types/budget-planner";

export function initZeroBasedBudget(
  penghasilan: number,
  penghasilanTambahan: number
): ZeroBudgetState {
  const total = penghasilan + penghasilanTambahan;

  const defaultKategori: KategoriItem[] = [
    {
      id: "zb-sewa",
      nama: "Sewa / KPR",
      tipe: "kebutuhan",
      persentaseDefault: 0,
      rupiahAlokasi: Math.round(total * 0.2),
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Home",
      deskripsi: "Biaya tempat tinggal",
    },
    {
      id: "zb-makan",
      nama: "Makan & Groceries",
      tipe: "kebutuhan",
      persentaseDefault: 0,
      rupiahAlokasi: Math.round(total * 0.15),
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "UtensilsCrossed",
      deskripsi: "Biaya makan sehari-hari",
    },
    {
      id: "zb-transport",
      nama: "Transportasi",
      tipe: "kebutuhan",
      persentaseDefault: 0,
      rupiahAlokasi: Math.round(total * 0.1),
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Car",
      deskripsi: "Biaya transportasi",
    },
    {
      id: "zb-tagihan",
      nama: "Tagihan",
      tipe: "kebutuhan",
      persentaseDefault: 0,
      rupiahAlokasi: Math.round(total * 0.05),
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Zap",
      deskripsi: "Listrik, air, internet, dll",
    },
    {
      id: "zb-kesehatan",
      nama: "Kesehatan",
      tipe: "kebutuhan",
      persentaseDefault: 0,
      rupiahAlokasi: Math.round(total * 0.05),
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "Heart",
      deskripsi: "Biaya kesehatan dan asuransi",
    },
    {
      id: "zb-tabungan",
      nama: "Tabungan",
      tipe: "tabungan",
      persentaseDefault: 0,
      rupiahAlokasi: Math.round(total * 0.15),
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "PiggyBank",
      deskripsi: "Dana tabungan bulanan",
    },
    {
      id: "zb-investasi",
      nama: "Investasi",
      tipe: "investasi",
      persentaseDefault: 0,
      rupiahAlokasi: Math.round(total * 0.1),
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "TrendingUp",
      deskripsi: "Reksa dana, saham, dll",
    },
    {
      id: "zb-lainnya",
      nama: "Lain-lain",
      tipe: "keinginan",
      persentaseDefault: 0,
      rupiahAlokasi: Math.round(total * 0.2),
      rupiahTerpakai: 0,
      isEditable: true,
      isCustom: false,
      icon: "MoreHorizontal",
      deskripsi: "Pengeluaran lainnya",
    },
  ];

  const totalAlokasi = defaultKategori.reduce(
    (sum, k) => sum + k.rupiahAlokasi,
    0
  );

  return {
    totalPenghasilan: total,
    totalAlokasi,
    sisaAlokasi: total - totalAlokasi,
    kategori: defaultKategori,
    isBalanced: Math.abs(total - totalAlokasi) < 1,
  };
}

export function updateZeroBasedAlokasi(
  state: ZeroBudgetState,
  kategoriId: string,
  rupiahBaru: number
): ZeroBudgetState {
  const updatedKategori = state.kategori.map((k) =>
    k.id === kategoriId ? { ...k, rupiahAlokasi: Math.max(0, rupiahBaru) } : k
  );

  const totalAlokasi = updatedKategori.reduce(
    (sum, k) => sum + k.rupiahAlokasi,
    0
  );
  const sisaAlokasi = state.totalPenghasilan - totalAlokasi;

  return {
    ...state,
    kategori: updatedKategori,
    totalAlokasi,
    sisaAlokasi,
    isBalanced: Math.abs(sisaAlokasi) < 1,
  };
}

export function addKategoriZeroBased(
  state: ZeroBudgetState,
  namaKategori: string,
  tipe: KategoriTipe
): ZeroBudgetState {
  const iconMap: Record<KategoriTipe, string> = {
    kebutuhan: "Home",
    keinginan: "ShoppingBag",
    tabungan: "PiggyBank",
    investasi: "TrendingUp",
    sedekah: "Heart",
    hutang: "CreditCard",
  };

  const newKategori: KategoriItem = {
    id: `zb-custom-${Date.now()}`,
    nama: namaKategori,
    tipe,
    persentaseDefault: 0,
    rupiahAlokasi: 0,
    rupiahTerpakai: 0,
    isEditable: true,
    isCustom: true,
    icon: iconMap[tipe],
    deskripsi: `${namaKategori}`,
  };

  const updatedKategori = [...state.kategori, newKategori];
  const totalAlokasi = updatedKategori.reduce(
    (sum, k) => sum + k.rupiahAlokasi,
    0
  );

  return {
    ...state,
    kategori: updatedKategori,
    totalAlokasi,
    sisaAlokasi: state.totalPenghasilan - totalAlokasi,
    isBalanced: Math.abs(state.totalPenghasilan - totalAlokasi) < 1,
  };
}

export function removeKategoriZeroBased(
  state: ZeroBudgetState,
  kategoriId: string
): ZeroBudgetState {
  const updatedKategori = state.kategori.filter((k) => k.id !== kategoriId);
  const totalAlokasi = updatedKategori.reduce(
    (sum, k) => sum + k.rupiahAlokasi,
    0
  );

  return {
    ...state,
    kategori: updatedKategori,
    totalAlokasi,
    sisaAlokasi: state.totalPenghasilan - totalAlokasi,
    isBalanced: Math.abs(state.totalPenghasilan - totalAlokasi) < 1,
  };
}
