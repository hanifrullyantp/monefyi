export type TabId = 'kpr' | 'kkb' | 'kta' | 'barang' | 'komparator'

export type MetodeBunga = 'anuitas' | 'flat' | 'efektif'

export type InputDPMode = 'rupiah' | 'persen'

export type AffordabilityStatus =
  | 'sangat_aman'
  | 'aman'
  | 'perhatian'
  | 'berbahaya'
  | 'kritis'

export interface JadwalAngsuran {
  bulan: number
  cicilan: number
  pokok: number
  bunga: number
  sisaPokok: number
  persenLunas: number
}

export interface HasilCicilan {
  pokokPinjaman: number
  cicilanPerBulan: number
  totalBunga: number
  totalBiaya: number
  totalPembayaran: number
  bungaEfektif: number
  tenorBulan: number
  jadwal: JadwalAngsuran[]
}

export interface AffordabilityResult {
  rasio: number
  status: AffordabilityStatus
  maxPinjamanIdeal: number
  pesanStatus: string
}

export interface KPRInput {
  hargaProperti: number
  dp: number
  dpMode: InputDPMode
  tenor: number
  satuanTenor: 'tahun' | 'bulan'
  bunga: number
  metode: MetodeBunga
  provisi: number
  admin: number
  asuransi: number
  penghasilan: number
}

export interface KKBInput {
  hargaOTR: number
  tipe: 'baru' | 'bekas'
  dp: number
  dpMode: InputDPMode
  tenor: number
  bunga: number
  metode: MetodeBunga
  admin: number
  asuransi: 'all_risk' | 'tlo' | 'tidak_ada'
  penghasilan: number
}

export interface KTAInput {
  jumlahPinjaman: number
  tenor: number
  bunga: number
  metode: MetodeBunga
  provisi: number
  admin: number
  penghasilan: number
}

export interface BarangInput {
  namaBarang: string
  harga: number
  dp: number
  dpMode: InputDPMode
  tenor: number
  bunga: number
  admin: number
}

export interface KomparatorItem {
  id: string
  label: string
  pokok: number
  bunga: number
  tenor: number
  metode: MetodeBunga
  biayaLain: number
}

export interface PelunasanDipercepatResult {
  bulanLunasAsli: number
  bulanLunasBaru: number
  bulanHemat: number
  bungaHemat: number
  totalDibayarBaru: number
}

export interface HistoryItem {
  id: string
  tanggal: string
  jenis: TabId
  label: string
  cicilanPerBulan: number
  totalBayar: number
}

export interface ToastMessage {
  id: string
  message: string
  variant: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}
