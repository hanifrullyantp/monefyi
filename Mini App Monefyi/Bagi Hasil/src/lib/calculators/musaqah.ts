import type {
  MusaqahInput,
  PertanianResult,
  SkenarioResult,
  ValidationResult,
} from "@/types/bagi-hasil";

function validateInput(input: MusaqahInput): ValidationResult {
  const pesan: string[] = [];
  const totalNisbah = input.nisbahPemilik + input.nisbahPengelola;

  if (Math.abs(totalNisbah - 100) > 0.01)
    pesan.push(
      `Total nisbah harus 100%. Saat ini: ${totalNisbah.toFixed(2)}%`
    );

  if (input.estimasiHasilPanen <= 0)
    pesan.push("Estimasi hasil panen harus lebih dari 0.");
  if (input.estimasiHargaPerSatuan <= 0)
    pesan.push("Estimasi harga per satuan harus lebih dari 0.");
  if (input.nisbahPemilik <= 0)
    pesan.push("Nisbah pemilik kebun harus lebih dari 0%.");
  if (input.nisbahPengelola <= 0)
    pesan.push("Nisbah pengelola harus lebih dari 0%.");
  if (!input.namaPemilikKebun.trim())
    pesan.push("Nama pemilik kebun harus diisi.");
  if (!input.namaPengelola.trim())
    pesan.push("Nama pengelola harus diisi.");

  return { valid: pesan.length === 0, pesan };
}

function buildSkenarioKebun(
  label: string,
  multiplier: number,
  baseHasilPanen: number,
  hargaPerSatuan: number,
  nisbahPemilik: number,
  nisbahPengelola: number,
  namaPemilik: string,
  namaPengelola: string
): SkenarioResult {
  const totalNilai = baseHasilPanen * multiplier * hargaPerSatuan;
  return {
    label,
    multiplier,
    totalNilai,
    pembagianPerPihak: [
      { nama: namaPemilik, nilai: totalNilai * (nisbahPemilik / 100) },
      { nama: namaPengelola, nilai: totalNilai * (nisbahPengelola / 100) },
    ],
  };
}

export function calculateMusaqah(input: MusaqahInput): PertanianResult {
  const validasi = validateInput(input);

  if (!validasi.valid) {
    return {
      estimasiNilaiPanen: 0,
      biayaTotal: 0,
      nilaiPanenBersih: 0,
      pembagianPemilik: { persentase: input.nisbahPemilik, rupiah: 0 },
      pembagianPenggarap: { persentase: input.nisbahPengelola, rupiah: 0 },
      skenario: [],
      catatanAkad:
        "Dalam musaqah, pengelola hanya merawat tanaman yang sudah ada. Tidak ada biaya benih. Pengelola berhak atas persentase panen sebagai imbalan atas perawatannya.",
    };
  }

  const estimasiNilaiPanen =
    input.estimasiHasilPanen * input.estimasiHargaPerSatuan;

  const pembagianPemilik = {
    persentase: input.nisbahPemilik,
    rupiah: estimasiNilaiPanen * (input.nisbahPemilik / 100),
  };
  const pembagianPenggarap = {
    persentase: input.nisbahPengelola,
    rupiah: estimasiNilaiPanen * (input.nisbahPengelola / 100),
  };

  const skenario: SkenarioResult[] = [
    buildSkenarioKebun(
      "🌾 Panen Melimpah", 1.4,
      input.estimasiHasilPanen, input.estimasiHargaPerSatuan,
      input.nisbahPemilik, input.nisbahPengelola,
      input.namaPemilikKebun, input.namaPengelola
    ),
    buildSkenarioKebun(
      "🌱 Panen Normal", 1.0,
      input.estimasiHasilPanen, input.estimasiHargaPerSatuan,
      input.nisbahPemilik, input.nisbahPengelola,
      input.namaPemilikKebun, input.namaPengelola
    ),
    buildSkenarioKebun(
      "🌧 Panen Buruk", 0.5,
      input.estimasiHasilPanen, input.estimasiHargaPerSatuan,
      input.nisbahPemilik, input.nisbahPengelola,
      input.namaPemilikKebun, input.namaPengelola
    ),
    buildSkenarioKebun(
      "❌ Gagal Panen", 0,
      input.estimasiHasilPanen, input.estimasiHargaPerSatuan,
      input.nisbahPemilik, input.nisbahPengelola,
      input.namaPemilikKebun, input.namaPengelola
    ),
  ];

  return {
    estimasiNilaiPanen,
    biayaTotal: 0,
    nilaiPanenBersih: estimasiNilaiPanen,
    pembagianPemilik,
    pembagianPenggarap,
    skenario,
    catatanAkad:
      "Dalam musaqah, pengelola hanya merawat tanaman yang sudah ada. Tidak ada biaya benih. Pengelola berhak atas persentase panen sebagai imbalan atas perawatannya.",
  };
}
