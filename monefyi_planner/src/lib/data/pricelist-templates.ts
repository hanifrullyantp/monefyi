import type { PricelistCategory } from '../../types/estimator';

export interface PricelistTemplateItem {
  name: string;
  product: string;
  category: PricelistCategory;
  unit: string;
  sellPrice: number;
  margin: number;
}

export interface PricelistTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  highlights: string[];
  itemCount: number;
  items: PricelistTemplateItem[];
}

type ItemInput = PricelistTemplateItem;

function t(
  name: string,
  product: string,
  category: PricelistCategory,
  unit: string,
  sellPrice: number,
  margin: number,
): ItemInput {
  return { name, product, category, unit, sellPrice, margin };
}

const KITCHEN_SET_ITEMS: ItemInput[] = [
  t('Kabinet Atas', 'Kitchen Set', 'borongan', 'm', 2900000, 40),
  t('Kabinet Bawah', 'Kitchen Set', 'borongan', 'm', 2900000, 40),
  t('Countertop Granit', 'Kitchen Set', 'borongan', 'm', 1500000, 35),
  t('Countertop Marmer', 'Kitchen Set', 'borongan', 'm', 2200000, 35),
  t('Backsplash Keramik', 'Kitchen Set', 'borongan', 'm', 500000, 60),
  t('Rak Piring Tarik', 'Kitchen Set', 'borongan', 'set', 850000, 40),
  t('Rak Bumbu', 'Kitchen Set', 'borongan', 'set', 450000, 45),
  t('Lemari Kulkas Built-in', 'Kitchen Set', 'borongan', 'pcs', 2900000, 20),
  t('Island Kitchen', 'Kitchen Set', 'borongan', 'm', 3500000, 40),
  t('Sink + Kran', 'Kitchen Set', 'material', 'set', 1200000, 25),
  t('Exhaust Hood', 'Kitchen Set', 'material', 'pcs', 1800000, 20),
  t('LED Strip Kabinet', 'Kitchen Set', 'material', 'm', 85000, 40),
  t('Handle Kabinet', 'Kitchen Set', 'material', 'pcs', 25000, 50),
  t('Engsel Soft-Close', 'Kitchen Set', 'material', 'pcs', 35000, 50),
  t('HPL Sheet', 'Kitchen Set', 'material', 'lembar', 320000, 30),
  t('Multipleks 18mm', 'Kitchen Set', 'material', 'lembar', 285000, 25),
  t('Edging PVC', 'Kitchen Set', 'material', 'm', 8000, 40),
  t('Instalasi Listrik', 'Kitchen Set', 'jasa', 'ls', 500000, 50),
  t('Instalasi Air', 'Kitchen Set', 'jasa', 'ls', 400000, 50),
  t('Pengiriman', 'Kitchen Set', 'jasa', 'ls', 350000, 40),
  t('Pemasangan (Tukang)', 'Kitchen Set', 'upah', 'ls', 2500000, 30),
  t('Finishing & Cleaning', 'Kitchen Set', 'jasa', 'ls', 300000, 50),
];

const RENOVASI_RUMAH_ITEMS: ItemInput[] = [
  t('Galian Tanah', 'Renovasi Rumah', 'upah', 'm3', 85000, 35),
  t('Urugan Pasir', 'Renovasi Rumah', 'material', 'm3', 320000, 25),
  t('Pondasi Batu Kali', 'Renovasi Rumah', 'material', 'm3', 450000, 22),
  t('Sloof Beton K-225', 'Renovasi Rumah', 'material', 'm3', 2100000, 20),
  t('Besi Tulangan D10', 'Renovasi Rumah', 'material', 'kg', 18500, 18),
  t('Bekisting Kayu', 'Renovasi Rumah', 'material', 'm2', 95000, 25),
  t('Dinding Bata Merah', 'Renovasi Rumah', 'material', 'm2', 185000, 28),
  t('Plester Aci', 'Renovasi Rumah', 'upah', 'm2', 65000, 35),
  t('Acian Dinding', 'Renovasi Rumah', 'upah', 'm2', 45000, 40),
  t('Plafon Gypsum 9mm', 'Renovasi Rumah', 'material', 'm2', 125000, 30),
  t('Rangka Hollow Plafon', 'Renovasi Rumah', 'material', 'm2', 55000, 28),
  t('Cat Tembok Dulux', 'Renovasi Rumah', 'material', 'kaleng', 520000, 25),
  t('Cat Plafon', 'Renovasi Rumah', 'material', 'kaleng', 380000, 30),
  t('Keramik Lantai 60x60', 'Renovasi Rumah', 'material', 'm2', 185000, 22),
  t('Keramik Dinding Kamar Mandi', 'Renovasi Rumah', 'material', 'm2', 165000, 25),
  t('Nat & Lem Keramik', 'Renovasi Rumah', 'material', 'kg', 28000, 35),
  t('Pasang Keramik', 'Renovasi Rumah', 'upah', 'm2', 85000, 35),
  t('Kusen Aluminium', 'Renovasi Rumah', 'material', 'm', 420000, 20),
  t('Pintu Kayu Solid', 'Renovasi Rumah', 'material', 'pcs', 1850000, 18),
  t('Jendela Aluminium', 'Renovasi Rumah', 'material', 'm2', 650000, 20),
  t('Kloset Duduk', 'Renovasi Rumah', 'material', 'pcs', 1250000, 22),
  t('Wastafel + Kran', 'Renovasi Rumah', 'material', 'set', 850000, 25),
  t('Shower Set', 'Renovasi Rumah', 'material', 'set', 650000, 28),
  t('Instalasi Pipa Air', 'Renovasi Rumah', 'jasa', 'titik', 350000, 45),
  t('Instalasi Pipa Limbah', 'Renovasi Rumah', 'jasa', 'titik', 420000, 45),
  t('Titik Listrik', 'Renovasi Rumah', 'jasa', 'titik', 185000, 50),
  t('Lampu Downlight LED', 'Renovasi Rumah', 'material', 'pcs', 85000, 35),
  t('Stop Kontak & Saklar', 'Renovasi Rumah', 'material', 'set', 45000, 40),
  t('Upah Tukang Harian', 'Renovasi Rumah', 'upah', 'hari', 200000, 30),
  t('Upah Mandor Proyek', 'Renovasi Rumah', 'upah', 'hari', 350000, 35),
];

const INTERIOR_FURNITURE_ITEMS: ItemInput[] = [
  t('Lemari Pakaian Built-in', 'Interior', 'borongan', 'm', 3200000, 38),
  t('Meja Kerja Custom', 'Interior', 'borongan', 'pcs', 2850000, 35),
  t('Rak Buku Wall-mounted', 'Interior', 'borongan', 'm', 1650000, 40),
  t('Partisi Gypsum', 'Interior', 'material', 'm2', 285000, 32),
  t('Wallpaper Premium', 'Interior', 'material', 'm2', 185000, 35),
  t('Cornice / Lis Plafon', 'Interior', 'material', 'm', 95000, 40),
  t('Kursi Dining Custom', 'Interior', 'borongan', 'pcs', 1850000, 35),
  t('Sofa Custom 3 Seater', 'Interior', 'borongan', 'pcs', 6500000, 32),
  t('Headboard + Nightstand', 'Interior', 'borongan', 'set', 4200000, 35),
  t('Coffee Table', 'Interior', 'borongan', 'pcs', 1250000, 38),
  t('TV Cabinet', 'Interior', 'borongan', 'pcs', 2850000, 35),
  t('Kitchen Island Kecil', 'Interior', 'borongan', 'm', 3800000, 35),
  t('Cermin Frame Custom', 'Interior', 'borongan', 'pcs', 850000, 42),
  t('Gorden Blackout', 'Interior', 'material', 'm2', 185000, 45),
  t('Rolling Door', 'Interior', 'material', 'm2', 650000, 25),
  t('Laci Modular', 'Interior', 'material', 'pcs', 285000, 35),
  t('Handle Furniture', 'Interior', 'material', 'pcs', 35000, 50),
  t('Engsel Pintu Lemari', 'Interior', 'material', 'pcs', 45000, 45),
  t('Drawer Runner Soft-close', 'Interior', 'material', 'set', 185000, 40),
  t('Finishing HPL', 'Interior', 'jasa', 'm2', 125000, 45),
  t('Finishing Duco', 'Interior', 'jasa', 'm2', 285000, 42),
  t('Instalasi & Assembly', 'Interior', 'jasa', 'ls', 850000, 50),
  t('Pengiriman Furniture', 'Interior', 'jasa', 'ls', 450000, 40),
  t('Desain & Survey', 'Interior', 'jasa', 'ls', 750000, 55),
  t('Cleaning Post Install', 'Interior', 'jasa', 'ls', 350000, 50),
];

const KONSTRUKSI_RINGAN_ITEMS: ItemInput[] = [
  t('Struktur Baja Ringan', 'Konstruksi Ringan', 'material', 'm2', 185000, 22),
  t('Atap Galvalum', 'Konstruksi Ringan', 'material', 'm2', 125000, 25),
  t('Atap Spandek', 'Konstruksi Ringan', 'material', 'm2', 95000, 28),
  t('Kanal C 75', 'Konstruksi Ringan', 'material', 'btg', 85000, 25),
  t('Reng Baja Ringan', 'Konstruksi Ringan', 'material', 'btg', 65000, 28),
  t('Sabuk Rigid', 'Konstruksi Ringan', 'material', 'm', 45000, 30),
  t('Sekrup Baja', 'Konstruksi Ringan', 'material', 'kg', 35000, 35),
  t('Insulasi Atap', 'Konstruksi Ringan', 'material', 'm2', 65000, 32),
  t('Talang Air PVC', 'Konstruksi Ringan', 'material', 'm', 85000, 30),
  t('Plafon PVC', 'Konstruksi Ringan', 'material', 'm2', 95000, 28),
  t('Pagar Besi Hollow', 'Konstruksi Ringan', 'material', 'm', 650000, 25),
  t('Pintu Gerbang Besi', 'Konstruksi Ringan', 'material', 'pcs', 4500000, 22),
  t('Kanopi Baja Ringan', 'Konstruksi Ringan', 'borongan', 'm2', 850000, 35),
  t('Lantai Cor Tipis', 'Konstruksi Ringan', 'material', 'm2', 285000, 20),
  t('Plester Lantai', 'Konstruksi Ringan', 'upah', 'm2', 75000, 35),
  t('Cat Epoxy Lantai', 'Konstruksi Ringan', 'material', 'm2', 125000, 30),
  t('Rolling Door Motor', 'Konstruksi Ringan', 'material', 'm2', 1250000, 22),
  t('Footing Beton K-225', 'Konstruksi Ringan', 'material', 'm3', 1950000, 18),
  t('Pondasi Mini Pile', 'Konstruksi Ringan', 'material', 'titik', 850000, 20),
  t('Dinding Batako', 'Konstruksi Ringan', 'material', 'm2', 165000, 25),
  t('Waterproofing', 'Konstruksi Ringan', 'material', 'm2', 85000, 35),
  t('Glasswool Insulasi', 'Konstruksi Ringan', 'material', 'm2', 65000, 32),
  t('Wiremesh M8', 'Konstruksi Ringan', 'material', 'lembar', 285000, 22),
  t('Truss Wire', 'Konstruksi Ringan', 'material', 'kg', 18500, 25),
  t('Jasa Las & Fabrikasi', 'Konstruksi Ringan', 'jasa', 'ls', 1250000, 45),
  t('Sewa Mobil Pickup', 'Konstruksi Ringan', 'jasa', 'hari', 650000, 30),
  t('Sewa Crane Mini', 'Konstruksi Ringan', 'jasa', 'hari', 3500000, 25),
  t('Scaffolding', 'Konstruksi Ringan', 'alat', 'set', 850000, 28),
  t('Safety Net', 'Konstruksi Ringan', 'material', 'm2', 35000, 35),
  t('Semen Gresik 40kg', 'Konstruksi Ringan', 'material', 'sak', 72000, 18),
  t('Pasir Cor', 'Konstruksi Ringan', 'material', 'm3', 320000, 20),
  t('Supervisor Lapangan', 'Konstruksi Ringan', 'upah', 'hari', 400000, 35),
  t('Tukang Baja Ringan', 'Konstruksi Ringan', 'upah', 'hari', 250000, 32),
  t('Rangka Ruko 1 Lantai', 'Konstruksi Ringan', 'borongan', 'm2', 850000, 30),
  t('Gudang Prefab Kecil', 'Konstruksi Ringan', 'borongan', 'm2', 950000, 28),
];

function buildTemplate(
  id: string,
  name: string,
  icon: string,
  description: string,
  highlights: string[],
  items: ItemInput[],
): PricelistTemplate {
  return {
    id,
    name,
    icon,
    description,
    highlights,
    itemCount: items.length,
    items,
  };
}

export const PRICELIST_TEMPLATES: PricelistTemplate[] = [
  buildTemplate(
    'kitchen-set',
    'Kitchen Set',
    '🍳',
    'Untuk usaha kitchen set custom dan built-in furniture',
    ['Kabinet', 'countertop', 'backsplash'],
    KITCHEN_SET_ITEMS,
  ),
  buildTemplate(
    'renovasi-rumah',
    'Renovasi Rumah',
    '🏠',
    'Renovasi rumah tinggal — pondasi hingga finishing',
    ['Pondasi', 'cat', 'keramik', 'sanitary'],
    RENOVASI_RUMAH_ITEMS,
  ),
  buildTemplate(
    'interior-furniture',
    'Interior & Furniture',
    '🪑',
    'Custom furniture, partisi, dan finishing interior',
    ['Lemari', 'meja', 'partisi', 'furniture'],
    INTERIOR_FURNITURE_ITEMS,
  ),
  buildTemplate(
    'konstruksi-ringan',
    'Konstruksi Ringan',
    '🏗️',
    'Baja ringan, kanopi, pagar, gudang, dan ruko',
    ['Baja ringan', 'kanopi', 'ruko', 'gudang'],
    KONSTRUKSI_RINGAN_ITEMS,
  ),
];

export function getPricelistTemplate(id: string): PricelistTemplate | undefined {
  return PRICELIST_TEMPLATES.find(t => t.id === id);
}
