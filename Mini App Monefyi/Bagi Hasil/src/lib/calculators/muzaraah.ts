import type {
  MuzaraahInput,
  PertanianResult,
  SkenarioResult,
  ValidationResult,
} from "@/types/bagi-hasil";

function validateInput(input: MuzaraahInput): ValidationResult {
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

export function calculateMuzaraah(input: MuzaraahInput): PertanianResult {
  const validasi = validateInput(input);
  if (!validasi.valid) {
    return {
      estimasiNilaiPanen: 0,
      biayaTotal: input.biayaOperasional,
      nilaiPanenBersih: 0,
      pembagianPemilik: { persentase: input.nisbahPemilik, rupiah: 0 },
      pembagianPenggarap: { persentase: input.nisbahPenggarap, rupiah: 0 },
      skenario: [],
      catatanAkad:
        "Dalam muzara'ah, benih disediakan pemilik lahan. Biaya benih termasuk dalam tanggungan pemilik lahan.",
    };
  }

  const estimasiNilaiPanen =
    input.estimasiHasilPanen * input.estimasiHargaPerSatuan;
  const biayaTotal = input.biayaOperasional;
  const nilaiPanenBersih = Math.max(0, estimasiNilaiPanen - biayaTotal);

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
      input.estimasiHargaPerSatuan, biayaTotal,
      input.nisbahPemilik, input.nisbahPenggarap,
      input.namaPemilikLahan, input.namaPenggarap
    ),
    buildSkenarioTani(
      "🌱 Panen Normal", 1.0, input.estimasiHasilPanen,
      input.estimasiHargaPerSatuan, biayaTotal,
      input.nisbahPemilik, input.nisbahPenggarap,
      input.namaPemilikLahan, input.namaPenggarap
    ),
    buildSkenarioTani(
      "🌧 Panen Buruk", 0.5, input.estimasiHasilPanen,
      input.estimasiHargaPerSatuan, biayaTotal,
      input.nisbahPemilik, input.nisbahPenggarap,
      input.namaPemilikLahan, input.namaPenggarap
    ),
    buildSkenarioTani(
      "❌ Gagal Panen", 0, input.estimasiHasilPanen,
      input.estimasiHargaPerSatuan, biayaTotal,
      input.nisbahPemilik, input.nisbahPenggarap,
      input.namaPemilikLahan, input.namaPenggarap
    ),
  ];

  return {
    estimasiNilaiPanen,
    biayaTotal,
    nilaiPanenBersih,
    pembagianPemilik,
    pembagianPenggarap,
    skenario,
    catatanAkad:
      "Dalam muzara'ah, benih disediakan pemilik lahan. Biaya benih termasuk dalam tanggungan pemilik lahan dan sudah diperhitungkan dalam biaya operasional.",
  };
}
