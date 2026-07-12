// =====================================================
// PROJECT PLANNER — RAP / Progress Templates
// Extracted from src/lib/mock-data.ts → src-new/js/data/templates.js
// =====================================================

/** RAP & progress templates (10 items, 3 categories) */
export const TEMPLATES = [
      {
        id: 1, category: "Interior", name: "Kitchen Set", baseUnit: "meter lari", icon: "sofa",
        progressTemplate: [
          { name: "Persiapan & Pengukuran", weight: 10 },
          { name: "Fabrikasi Rangka Hollow", weight: 25 },
          { name: "Pemasangan Rangka", weight: 20 },
          { name: "Pemasangan HPL", weight: 25 },
          { name: "Hardware & Finishing", weight: 15 },
          { name: "Serah Terima", weight: 5 },
        ],
        materials: [
          { materialId: 11, name: "HPL Taco Standard", qtyPerUnit: 5, unit: "Lembar", price: 185000 },
          { materialId: 13, name: "Plywood 18mm", qtyPerUnit: 0.7, unit: "Lembar", price: 425000 },
          { materialId: 6, name: "Hollow 4x4 Galvanis", qtyPerUnit: 1.5, unit: "Batang", price: 85000 },
          { materialId: 21, name: "Engsel Blum", qtyPerUnit: 4, unit: "Pcs", price: 25000 },
          { materialId: 22, name: "Handle Aluminium", qtyPerUnit: 2, unit: "Pcs", price: 15000 },
          { materialId: 26, name: "Lem HPL", qtyPerUnit: 0.5, unit: "Kg", price: 45000 },
          { materialId: 23, name: "Sekrup 5cm", qtyPerUnit: 0.5, unit: "Box/100", price: 25000 },
        ],
        workers: [
          { workerId: 2, name: "Tukang Kayu", daysPerUnit: 2, rate: 175000 },
          { workerId: 4, name: "Tukang Cat", daysPerUnit: 0.5, rate: 150000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 1, rate: 100000 },
        ],
        estCostPerUnit: 2850000, estSellPerUnit: 4500000, margin: 36.7,
      },
      {
        id: 2, category: "Interior", name: "Wardrobe 3 Pintu", baseUnit: "unit", icon: "sofa",
        progressTemplate: [
          { name: "Persiapan & Pengukuran", weight: 10 },
          { name: "Fabrikasi", weight: 35 },
          { name: "Pemasangan", weight: 30 },
          { name: "Finishing", weight: 20 },
          { name: "Serah Terima", weight: 5 },
        ],
        materials: [
          { materialId: 11, name: "HPL Taco Standard", qtyPerUnit: 8, unit: "Lembar", price: 185000 },
          { materialId: 13, name: "Plywood 18mm", qtyPerUnit: 3, unit: "Lembar", price: 425000 },
          { materialId: 6, name: "Hollow 4x4 Galvanis", qtyPerUnit: 6, unit: "Batang", price: 85000 },
          { materialId: 21, name: "Engsel Blum", qtyPerUnit: 12, unit: "Pcs", price: 25000 },
          { materialId: 22, name: "Handle Aluminium", qtyPerUnit: 3, unit: "Pcs", price: 15000 },
        ],
        workers: [
          { workerId: 2, name: "Tukang Kayu", daysPerUnit: 4, rate: 175000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 2, rate: 100000 },
        ],
        estCostPerUnit: 5200000, estSellPerUnit: 8500000, margin: 38.8,
      },
      {
        id: 3, category: "Interior", name: "TV Cabinet", baseUnit: "meter lari", icon: "sofa",
        progressTemplate: [
          { name: "Persiapan", weight: 15 },
          { name: "Fabrikasi & Pemasangan", weight: 50 },
          { name: "Finishing", weight: 30 },
          { name: "Serah Terima", weight: 5 },
        ],
        materials: [
          { materialId: 11, name: "HPL Taco Standard", qtyPerUnit: 3, unit: "Lembar", price: 185000 },
          { materialId: 13, name: "Plywood 18mm", qtyPerUnit: 0.5, unit: "Lembar", price: 425000 },
          { materialId: 6, name: "Hollow 4x4 Galvanis", qtyPerUnit: 1, unit: "Batang", price: 85000 },
        ],
        workers: [
          { workerId: 2, name: "Tukang Kayu", daysPerUnit: 1.5, rate: 175000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 0.5, rate: 100000 },
        ],
        estCostPerUnit: 1800000, estSellPerUnit: 3200000, margin: 43.7,
      },
      {
        id: 4, category: "Konstruksi", name: "Pondasi Batu Kali", baseUnit: "m3", icon: "building-2",
        progressTemplate: [
          { name: "Galian", weight: 30 },
          { name: "Pemasangan Batu", weight: 40 },
          { name: "Pengecoran", weight: 25 },
          { name: "Pembersihan", weight: 5 },
        ],
        materials: [
          { materialId: 20, name: "Batu Kali", qtyPerUnit: 1.2, unit: "m3", price: 250000 },
          { materialId: 1, name: "Semen Tiga Roda 50kg", qtyPerUnit: 6, unit: "Sak", price: 65000 },
          { materialId: 17, name: "Pasir Cor", qtyPerUnit: 0.5, unit: "m3", price: 350000 },
        ],
        workers: [
          { workerId: 1, name: "Tukang Batu", daysPerUnit: 1.5, rate: 150000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 2, rate: 100000 },
        ],
        estCostPerUnit: 1265000, estSellPerUnit: 2000000, margin: 36.7,
      },
      {
        id: 5, category: "Konstruksi", name: "Dinding Bata Merah", baseUnit: "m2", icon: "building-2",
        progressTemplate: [
          { name: "Persiapan & Marking", weight: 10 },
          { name: "Pemasangan Bata", weight: 60 },
          { name: "Pengeringan", weight: 20 },
          { name: "Pembersihan", weight: 10 },
        ],
        materials: [
          { materialId: 7, name: "Bata Merah", qtyPerUnit: 70, unit: "Pcs", price: 800 },
          { materialId: 1, name: "Semen Tiga Roda 50kg", qtyPerUnit: 0.5, unit: "Sak", price: 65000 },
          { materialId: 17, name: "Pasir Cor", qtyPerUnit: 0.03, unit: "m3", price: 350000 },
        ],
        workers: [
          { workerId: 1, name: "Tukang Batu", daysPerUnit: 0.3, rate: 150000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 0.15, rate: 100000 },
        ],
        estCostPerUnit: 135000, estSellPerUnit: 220000, margin: 38.6,
      },
      {
        id: 6, category: "Konstruksi", name: "Plester + Aci", baseUnit: "m2", icon: "building-2",
        progressTemplate: [
          { name: "Plesteran", weight: 50 },
          { name: "Acian", weight: 40 },
          { name: "Pengeringan", weight: 10 },
        ],
        materials: [
          { materialId: 1, name: "Semen Tiga Roda 50kg", qtyPerUnit: 0.3, unit: "Sak", price: 65000 },
          { materialId: 17, name: "Pasir Cor", qtyPerUnit: 0.02, unit: "m3", price: 350000 },
        ],
        workers: [
          { workerId: 1, name: "Tukang Batu", daysPerUnit: 0.15, rate: 150000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 0.08, rate: 100000 },
        ],
        estCostPerUnit: 55000, estSellPerUnit: 95000, margin: 42.1,
      },
      {
        id: 7, category: "Konstruksi", name: "Cor Beton K-225", baseUnit: "m3", icon: "building-2",
        progressTemplate: [
          { name: "Bekisting", weight: 25 },
          { name: "Pembesian", weight: 30 },
          { name: "Pengecoran", weight: 30 },
          { name: "Bongkar Bekisting", weight: 15 },
        ],
        materials: [
          { materialId: 1, name: "Semen Tiga Roda 50kg", qtyPerUnit: 10, unit: "Sak", price: 65000 },
          { materialId: 17, name: "Pasir Cor", qtyPerUnit: 0.5, unit: "m3", price: 350000 },
          { materialId: 19, name: "Split/Kerikil", qtyPerUnit: 0.7, unit: "m3", price: 400000 },
          { materialId: 3, name: "Besi Beton 8mm", qtyPerUnit: 15, unit: "Batang", price: 45000 },
        ],
        workers: [
          { workerId: 1, name: "Tukang Batu", daysPerUnit: 2, rate: 150000 },
          { workerId: 3, name: "Tukang Besi", daysPerUnit: 1.5, rate: 175000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 3, rate: 100000 },
        ],
        estCostPerUnit: 2850000, estSellPerUnit: 4500000, margin: 36.7,
      },
      {
        id: 8, category: "Renovasi", name: "Cat Ulang Dinding", baseUnit: "m2", icon: "hammer",
        progressTemplate: [
          { name: "Persiapan & Amplas", weight: 25 },
          { name: "Plamir", weight: 25 },
          { name: "Cat Dasar", weight: 20 },
          { name: "Cat Finishing", weight: 25 },
          { name: "Pembersihan", weight: 5 },
        ],
        materials: [
          { materialId: 15, name: "Cat Dulux 5L", qtyPerUnit: 0.03, unit: "Kaleng", price: 385000 },
        ],
        workers: [
          { workerId: 4, name: "Tukang Cat", daysPerUnit: 0.05, rate: 150000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 0.02, rate: 100000 },
        ],
        estCostPerUnit: 22000, estSellPerUnit: 45000, margin: 51.1,
      },
      {
        id: 9, category: "Renovasi", name: "Ganti Keramik Lantai", baseUnit: "m2", icon: "hammer",
        progressTemplate: [
          { name: "Bongkar Keramik Lama", weight: 20 },
          { name: "Persiapan Lantai", weight: 15 },
          { name: "Pemasangan Keramik", weight: 45 },
          { name: "Grouting", weight: 15 },
          { name: "Pembersihan", weight: 5 },
        ],
        materials: [
          { materialId: 9, name: "Keramik 40x40", qtyPerUnit: 0.16, unit: "Dus", price: 55000 },
          { materialId: 1, name: "Semen Tiga Roda 50kg", qtyPerUnit: 0.3, unit: "Sak", price: 65000 },
          { materialId: 17, name: "Pasir Cor", qtyPerUnit: 0.02, unit: "m3", price: 350000 },
        ],
        workers: [
          { workerId: 5, name: "Tukang Keramik", daysPerUnit: 0.12, rate: 175000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 0.06, rate: 100000 },
        ],
        estCostPerUnit: 45000, estSellPerUnit: 85000, margin: 47.1,
      },
      {
        id: 10, category: "Renovasi", name: "Rombak Kamar Mandi", baseUnit: "paket", icon: "hammer",
        progressTemplate: [
          { name: "Pembongkaran", weight: 15 },
          { name: "Instalasi Plumbing", weight: 25 },
          { name: "Pemasangan Dinding & Lantai", weight: 25 },
          { name: "Pemasangan Sanitari", weight: 20 },
          { name: "Finishing & Testing", weight: 15 },
        ],
        materials: [
          { materialId: 28, name: "Closet TOTO", qtyPerUnit: 1, unit: "Unit", price: 2500000 },
          { materialId: 29, name: "Wastafel", qtyPerUnit: 1, unit: "Unit", price: 450000 },
          { materialId: 10, name: "Keramik 60x60", qtyPerUnit: 2, unit: "Dus", price: 85000 },
          { materialId: 27, name: "Pipa PVC 4 inch", qtyPerUnit: 3, unit: "Batang", price: 65000 },
          { materialId: 1, name: "Semen Tiga Roda 50kg", qtyPerUnit: 5, unit: "Sak", price: 65000 },
        ],
        workers: [
          { workerId: 7, name: "Tukang Plumbing", daysPerUnit: 3, rate: 200000 },
          { workerId: 5, name: "Tukang Keramik", daysPerUnit: 2, rate: 175000 },
          { workerId: 1, name: "Tukang Batu", daysPerUnit: 2, rate: 150000 },
          { workerId: 8, name: "Helper/Kuli", daysPerUnit: 3, rate: 100000 },
        ],
        estCostPerUnit: 5500000, estSellPerUnit: 9500000, margin: 42.1,
      },
    ];
