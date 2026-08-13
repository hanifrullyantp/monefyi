import type {
  MukhabarahInput,
  PertanianResult,
  SkenarioResult,
  ValidationResult,
} from "@/types/bagi-hasil";

function validateInput(input: MukhabarahInput): ValidationResult {
  const pesan: string[] = [];
  const totalNisbah = input.nisbahPemilik + input.nisbahPenggarap;

  if (Math.abs(totalNisbah - 100) > 0.01)
    pesan.push(
      `Total nisbah harus 100%. Saat ini: ${totalNisbah.toFixed(2)}%`
    );

  if (input.estimasiHasilPanen <= 0)
    pesan.push("Estimasi hasil panen harus lebih dari 0.");
  if (input.estimasiHargaPerSatuan <= 0)
    pesan.push("Estimasi harga per satuan harus lebih dari 0.");
  if (input.nisbahPemilik <= 0)
    pesan.push("Nisbah pemilik lahan harus lebih dari 0%.");
  if (input.nisbahPenggarap <= 0)
    pesan.push("Nisbah penggarap harus lebih dari 0%.");
  if (!input.namaPemilikLahan.trim())
    pesan.push("Nama pemilik lahan harus diisi.");
  if (!input.namaPenggarap.trim())
    pesan.push("Nama penggarap harus diisi.");

  return { valid: pesan.length === 0, pesan };
}

function buildSkenarioTani(
  label: string,
  multiplier: number,
  baseHasilPanen: number,
  hargaPerSatuan: number,
  biayaTotal: number,
  nisbahPemilik: number,
  nisbahPenggarap: number,
  namaPemilik: string,
  namaPenggarap: string
): SkenarioResult {
  const nilaiKotor = baseHasilPanen * multiplier * hargaPerSatuan;
  const nilaiBersih = Math.max(0, nilaiKotor - biayaTotal);
  return {
    label,
    multiplier,
    totalNilai: nilaiBersih,
    pembagianPerPihak: [
      { nama: namaPemilik, nilai: nilaiBersih * (nisbahPemilik / 100) },
      { nama: namaPenggarap, nilai: nilaiBersih * (nisbahPenggarap / 100) },
    ],
  };
}

export function calculateMukhabarah(input: MukhabarahInput): PertanianResult {
  const validasi = validateInput(input);
  const biayaOperasionalTotal = input.biayaBenih + input.biayaOperasionalLain;

  if (!validasi.valid) {
    return {
      estimasiNilaiPanen: 0,
      biayaTotal: biayaOperasionalTotal,
      nilaiPanenBersih: 0,
      pembagianPemilik: { persentase: input.nisbahPemilik, rupiah: 0 },
      pembagianPenggarap: { persentase: input.nisbahPenggarap, rupiah: 0 },
      skenario: [],
      catatanAkad:
        "Dalam mukhabarah, benih disediakan penggarap. Biaya benih menjadi tanggungan penggarap dan sudah diperhitungkan dalam kalkulasi ini.",
    };
  }

  const estimasiNilaiPanen =
    input.estimasiHasilPanen * input.estimasiHargaPerSatuan;
  const nilaiPanenBersih = Math.max(0, estimasiNilaiPanen - biayaOperasionalTotal);

  const pembagianPemilik = {
    persentase: input.nisbahPemilik,
    rupiah: nilaiPanenBersih * (input.nisbahPemilik / 100),
  };
  const pembagianPenggarap = {
    persentase: input.nisbahPenggarap,
    rupiah: nilaiPanenBersih * (input.nisbahPenggarap / 100),
  };

  const skenario: SkenarioResult[] = [
    buildSkenarioTani(
      "🌾 Panen Melimpah", 1.4, input.estimasiHasilPanen,
      input.estimasiHargaPerSatuan, biayaOperasionalTotal,
      input.nisbahPemilik, input.nisbahPenggarap,
      input.namaPemilikLahan, input.namaPenggarap
    ),
    buildSkenarioTani(
      "🌱 Panen Normal", 1.0, input.estimasiHasilPanen,
      input.estimasiHargaPerSatuan, biayaOperasionalTotal,
      input.nisbahPemilik, input.nisbahPenggarap,
      input.namaPemilikLahan, input.namaPenggarap
    ),
    buildSkenarioTani(
      "🌧 Panen Buruk", 0.5, input.estimasiHasilPanen,
      input.estimasiHargaPerSatuan, biayaOperasionalTotal,
      input.nisbahPemilik, input.nisbahPenggarap,
      input.namaPemilikLahan, input.namaPenggarap
    ),
    buildSkenarioTani(
      "❌ Gagal Panen", 0, input.estimasiHasilPanen,
      input.estimasiHargaPerSatuan, biayaOperasionalTotal,
      input.nisbahPemilik, input.nisbahPenggarap,
      input.namaPemilikLahan, input.namaPenggarap
    ),
  ];

  return {
    estimasiNilaiPanen,
    biayaTotal: biayaOperasionalTotal,
    nilaiPanenBersih,
    pembagianPemilik,
    pembagianPenggarap,
    skenario,
    catatanAkad:
      "Dalam mukhabarah, benih disediakan penggarap. Biaya benih menjadi tanggungan penggarap dan sudah diperhitungkan dalam kalkulasi ini.",
  };
}
