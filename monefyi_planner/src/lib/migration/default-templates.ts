import type { JobTemplate } from '../../types/rpp';

/** Default job templates seeded per org when rpp_app_config is empty. */
export const DEFAULT_JOB_TEMPLATES: JobTemplate[] = [
  {
    id: 1,
    category: 'Interior',
    name: 'Kitchen Set',
    baseUnit: 'meter lari',
    icon: 'sofa',
    progressTemplate: [
      { name: 'Persiapan & Pengukuran', weight: 10 },
      { name: 'Fabrikasi Rangka Hollow', weight: 25 },
      { name: 'Pemasangan Rangka', weight: 20 },
      { name: 'Pemasangan HPL', weight: 25 },
      { name: 'Hardware & Finishing', weight: 15 },
      { name: 'Serah Terima', weight: 5 },
    ],
    materials: [
      { materialId: 11, name: 'HPL Taco Standard', qtyPerUnit: 5, unit: 'Lembar', price: 185000 },
      { materialId: 13, name: 'Plywood 18mm', qtyPerUnit: 0.7, unit: 'Lembar', price: 425000 },
      { materialId: 6, name: 'Hollow 4x4 Galvanis', qtyPerUnit: 1.5, unit: 'Batang', price: 85000 },
      { materialId: 21, name: 'Engsel Blum', qtyPerUnit: 4, unit: 'Pcs', price: 25000 },
      { materialId: 22, name: 'Handle Aluminium', qtyPerUnit: 2, unit: 'Pcs', price: 15000 },
      { materialId: 26, name: 'Lem HPL', qtyPerUnit: 0.5, unit: 'Kg', price: 45000 },
      { materialId: 23, name: 'Sekrup 5cm', qtyPerUnit: 0.5, unit: 'Box/100', price: 25000 },
    ],
    workers: [
      { workerId: 2, name: 'Tukang Kayu', daysPerUnit: 2, rate: 175000 },
      { workerId: 4, name: 'Tukang Cat', daysPerUnit: 0.5, rate: 150000 },
      { workerId: 8, name: 'Helper/Kuli', daysPerUnit: 1, rate: 100000 },
    ],
    estCostPerUnit: 2850000,
    estSellPerUnit: 4500000,
    margin: 36.7,
  },
  {
    id: 2,
    category: 'Interior',
    name: 'Wardrobe 3 Pintu',
    baseUnit: 'unit',
    icon: 'sofa',
    progressTemplate: [
      { name: 'Persiapan & Pengukuran', weight: 10 },
      { name: 'Fabrikasi', weight: 35 },
      { name: 'Pemasangan', weight: 30 },
      { name: 'Finishing', weight: 20 },
      { name: 'Serah Terima', weight: 5 },
    ],
    materials: [
      { name: 'HPL Premium', qtyPerUnit: 8, unit: 'Lembar', price: 220000 },
      { name: 'Plywood 18mm', qtyPerUnit: 2, unit: 'Lembar', price: 425000 },
      { name: 'Engsel Blum', qtyPerUnit: 6, unit: 'Pcs', price: 25000 },
    ],
    workers: [
      { name: 'Tukang Kayu', daysPerUnit: 3, rate: 175000 },
      { name: 'Helper/Kuli', daysPerUnit: 2, rate: 100000 },
    ],
    estCostPerUnit: 4200000,
    estSellPerUnit: 6500000,
    margin: 35.4,
  },
  {
    id: 3,
    category: 'Konstruksi',
    name: 'Renovasi Kamar Mandi',
    baseUnit: 'unit',
    icon: 'hammer',
    progressTemplate: [
      { name: 'Bongkar & Persiapan', weight: 15 },
      { name: 'Instalasi Pipa', weight: 25 },
      { name: 'Pemasangan Keramik', weight: 30 },
      { name: 'Finishing', weight: 20 },
      { name: 'Serah Terima', weight: 10 },
    ],
    materials: [
      { name: 'Keramik 40x40', qtyPerUnit: 15, unit: 'Dus', price: 85000 },
      { name: 'Pipa PVC 4"', qtyPerUnit: 3, unit: 'Batang', price: 45000 },
      { name: 'Closet Duduk', qtyPerUnit: 1, unit: 'Unit', price: 850000 },
    ],
    workers: [
      { name: 'Tukang Bangunan', daysPerUnit: 5, rate: 200000 },
      { name: 'Tukang Pipa', daysPerUnit: 2, rate: 180000 },
    ],
    estCostPerUnit: 5500000,
    estSellPerUnit: 8500000,
    margin: 35.3,
  },
];
