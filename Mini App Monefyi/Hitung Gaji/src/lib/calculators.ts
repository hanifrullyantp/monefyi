import type {
  JadwalAngsuran,
  HasilCicilan,
  MetodeBunga,
  AffordabilityResult,
  AffordabilityStatus,
  PelunasanDipercepatResult,
} from '@/types'

export function hitungAnuitas(
  pokok: number,
  bungaPerTahun: number,
  tenorBulan: number
): HasilCicilan {
  const r = bungaPerTahun / 12 / 100
  let cicilan: number
  
  if (r === 0) {
    cicilan = pokok / tenorBulan
  } else {
    const pembilang = r * Math.pow(1 + r, tenorBulan)
    const penyebut = Math.pow(1 + r, tenorBulan) - 1
    cicilan = pokok * (pembilang / penyebut)
  }
  
  const jadwal: JadwalAngsuran[] = []
  let sisaPokok = pokok
  let totalBunga = 0
  
  for (let i = 1; i <= tenorBulan; i++) {
    const bunga = sisaPokok * r
    let pokokBayar = cicilan - bunga
    
    // Adjust last payment for rounding
    if (i === tenorBulan) {
      pokokBayar = sisaPokok
      const actualCicilan = pokokBayar + bunga
      jadwal.push({
        bulan: i,
        cicilan: actualCicilan,
        pokok: pokokBayar,
        bunga: bunga,
        sisaPokok: 0,
        persenLunas: 100,
      })
      totalBunga += bunga
      break
    }
    
    sisaPokok -= pokokBayar
    totalBunga += bunga
    
    jadwal.push({
      bulan: i,
      cicilan: cicilan,
      pokok: pokokBayar,
      bunga: bunga,
      sisaPokok: sisaPokok,
      persenLunas: ((pokok - sisaPokok) / pokok) * 100,
    })
  }
  
  return {
    pokokPinjaman: pokok,
    cicilanPerBulan: cicilan,
    totalBunga: totalBunga,
    totalBiaya: 0,
    totalPembayaran: pokok + totalBunga,
    bungaEfektif: bungaPerTahun,
    tenorBulan: tenorBulan,
    jadwal: jadwal,
  }
}

export function hitungFlat(
  pokok: number,
  bungaPerTahun: number,
  tenorBulan: number
): HasilCicilan {
  const cicilanPokok = pokok / tenorBulan
  const bungaBulan = (pokok * bungaPerTahun) / 12 / 100
  const cicilan = cicilanPokok + bungaBulan
  
  const jadwal: JadwalAngsuran[] = []
  let sisaPokok = pokok
  
  for (let i = 1; i <= tenorBulan; i++) {
    sisaPokok -= cicilanPokok
    
    jadwal.push({
      bulan: i,
      cicilan: cicilan,
      pokok: cicilanPokok,
      bunga: bungaBulan,
      sisaPokok: i === tenorBulan ? 0 : sisaPokok,
      persenLunas: (i / tenorBulan) * 100,
    })
  }
  
  const totalBunga = bungaBulan * tenorBulan
  const bungaEfektif = hitungBungaEfektifDariFlat(bungaPerTahun, tenorBulan)
  
  return {
    pokokPinjaman: pokok,
    cicilanPerBulan: cicilan,
    totalBunga: totalBunga,
    totalBiaya: 0,
    totalPembayaran: pokok + totalBunga,
    bungaEfektif: bungaEfektif,
    tenorBulan: tenorBulan,
    jadwal: jadwal,
  }
}

export function hitungEfektif(
  pokok: number,
  bungaPerTahun: number,
  tenorBulan: number
): HasilCicilan {
  const r = bungaPerTahun / 12 / 100
  const cicilanPokok = pokok / tenorBulan
  
  const jadwal: JadwalAngsuran[] = []
  let sisaPokok = pokok
  let totalBunga = 0
  
  for (let i = 1; i <= tenorBulan; i++) {
    const bunga = sisaPokok * r
    const cicilan = cicilanPokok + bunga
    
    sisaPokok -= cicilanPokok
    totalBunga += bunga
    
    jadwal.push({
      bulan: i,
      cicilan: cicilan,
      pokok: cicilanPokok,
      bunga: bunga,
      sisaPokok: i === tenorBulan ? 0 : sisaPokok,
      persenLunas: (i / tenorBulan) * 100,
    })
  }
  
  const cicilanPertama = jadwal[0]?.cicilan || 0
  
  return {
    pokokPinjaman: pokok,
    cicilanPerBulan: cicilanPertama,
    totalBunga: totalBunga,
    totalBiaya: 0,
    totalPembayaran: pokok + totalBunga,
    bungaEfektif: bungaPerTahun,
    tenorBulan: tenorBulan,
    jadwal: jadwal,
  }
}

export function hitungBungaEfektifDariFlat(
  bungaFlat: number,
  tenorBulan: number
): number {
  // Approximation: bunga efektif ≈ bunga flat × 1.8
  // More accurate formula based on tenor
  const factor = 1.7 + (tenorBulan / 240)
  return bungaFlat * factor
}

export function hitungCicilan(
  pokok: number,
  bungaPerTahun: number,
  tenorBulan: number,
  metode: MetodeBunga
): HasilCicilan {
  switch (metode) {
    case 'anuitas':
      return hitungAnuitas(pokok, bungaPerTahun, tenorBulan)
    case 'flat':
      return hitungFlat(pokok, bungaPerTahun, tenorBulan)
    case 'efektif':
      return hitungEfektif(pokok, bungaPerTahun, tenorBulan)
    default:
      return hitungAnuitas(pokok, bungaPerTahun, tenorBulan)
  }
}

export function hitungDPRupiah(
  harga: number,
  dp: number,
  mode: 'rupiah' | 'persen'
): number {
  if (mode === 'persen') {
    return (harga * dp) / 100
  }
  return dp
}

export function hitungAffordability(
  cicilan: number,
  penghasilan: number
): AffordabilityResult {
  if (penghasilan <= 0) {
    return {
      rasio: 0,
      status: 'kritis',
      maxPinjamanIdeal: 0,
      pesanStatus: 'Masukkan penghasilan untuk analisis',
    }
  }
  
  const rasio = (cicilan / penghasilan) * 100
  let status: AffordabilityStatus
  let pesanStatus: string
  
  if (rasio < 20) {
    status = 'sangat_aman'
    pesanStatus = 'Sangat aman! Masih banyak ruang finansial'
  } else if (rasio <= 30) {
    status = 'aman'
    pesanStatus = 'Aman. Rasio cicilan ideal'
  } else if (rasio <= 40) {
    status = 'perhatian'
    pesanStatus = 'Perhatian. Mulai ketat untuk biaya lain'
  } else if (rasio <= 50) {
    status = 'berbahaya'
    pesanStatus = 'Berbahaya! Risiko gagal bayar tinggi'
  } else {
    status = 'kritis'
    pesanStatus = 'Kritis! Cicilan terlalu besar untuk penghasilan'
  }
  
  // Max pinjaman ideal dengan rasio 30%
  const cicilanIdeal = penghasilan * 0.3
  
  return {
    rasio,
    status,
    maxPinjamanIdeal: cicilanIdeal,
    pesanStatus,
  }
}

export function hitungPelunasanDipercepat(
  jadwal: JadwalAngsuran[],
  ekstraPerBulan: number
): PelunasanDipercepatResult {
  if (ekstraPerBulan <= 0 || jadwal.length === 0) {
    return {
      bulanLunasAsli: jadwal.length,
      bulanLunasBaru: jadwal.length,
      bulanHemat: 0,
      bungaHemat: 0,
      totalDibayarBaru: 0,
    }
  }
  
  const bulanLunasAsli = jadwal.length
  const bungaAsli = jadwal.reduce((sum, item) => sum + item.bunga, 0)
  
  // Simulate with extra payment
  let sisaPokok = jadwal[0]?.sisaPokok || 0
  if (jadwal[0]) {
    sisaPokok = jadwal[0].sisaPokok + jadwal[0].pokok
  }
  
  const cicilanAsli = jadwal[0]?.cicilan || 0
  const bungaRate = jadwal[0] ? jadwal[0].bunga / (jadwal[0].sisaPokok + jadwal[0].pokok) : 0
  
  let bulanLunasBaru = 0
  let totalBungaBaru = 0
  
  while (sisaPokok > 0 && bulanLunasBaru < bulanLunasAsli * 2) {
    bulanLunasBaru++
    const bunga = sisaPokok * bungaRate
    const pokokBayar = Math.min(cicilanAsli + ekstraPerBulan - bunga, sisaPokok)
    
    if (pokokBayar <= 0) break
    
    totalBungaBaru += bunga
    sisaPokok -= pokokBayar
    
    if (sisaPokok < 1) {
      sisaPokok = 0
      break
    }
  }
  
  const bulanHemat = bulanLunasAsli - bulanLunasBaru
  const bungaHemat = bungaAsli - totalBungaBaru
  
  return {
    bulanLunasAsli,
    bulanLunasBaru,
    bulanHemat: bulanHemat > 0 ? bulanHemat : 0,
    bungaHemat: bungaHemat > 0 ? bungaHemat : 0,
    totalDibayarBaru: sisaPokok === 0 ? jadwal[0].sisaPokok + jadwal[0].pokok + totalBungaBaru : 0,
  }
}
