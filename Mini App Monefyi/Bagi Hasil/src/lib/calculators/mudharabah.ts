import type {
  MudharabahInput,
  MudharabahResult,
  PembagianPihak,
  SkenarioResult,
  ValidationResult,
} from "@/types/bagi-hasil";

function validateInput(input: MudharabahInput): ValidationResult {
  const pesan: string[] = [];

  const shahibul = input.pihak.find((p) => p.peran === "shahibul_mal");
  const mudharib = input.pihak.find((p) => p.peran === "mudharib");

  if (!shahibul) pesan.push("Harus ada pihak Shahibul Mal (pemilik modal).");
  if (!mudharib) pesan.push("Harus ada pihak Mudharib (pengelola).");

  if (shahibul && shahibul.jumlahModal <= 0)
    pesan.push("Modal Shahibul Mal harus lebih dari 0.");

  const totalNisbah = input.pihak.reduce((s, p) => s + p.nisbahKeuntungan, 0);
  if (Math.abs(totalNisbah - 100) > 0.01)
    pesan.push(
      `Total nisbah keuntungan harus 100%. Saat ini: ${totalNisbah.toFixed(2)}%`
    );

  input.pihak.forEach((p) => {
    if (p.nisbahKeuntungan <= 0)
      pesan.push(`Nisbah ${p.nama || p.peran} harus lebih dari 0%.`);
  });

  if (input.estimasiPendapatanUsaha <= 0)
    pesan.push("Estimasi pendapatan usaha harus lebih dari 0.");
  if (input.periodeUsaha <= 0)
    pesan.push("Periode usaha harus lebih dari 0.");

  return { valid: pesan.length === 0, pesan };
}

function buildSkenario(
  label: string,
  multiplier: number,
  base: number,
  pihak: { nama: string; nisbah: number }[]
): SkenarioResult {
  const totalNilai = base * multiplier;
  return {
    label,
    multiplier,
    totalNilai,
    pembagianPerPihak: pihak.map((p) => ({
      nama: p.nama,
      nilai: totalNilai * (p.nisbah / 100),
    })),
  };
}

export function calculateMudharabah(
  input: MudharabahInput
): MudharabahResult {
  const validasi = validateInput(input);

  const shahibul = input.pihak.find((p) => p.peran === "shahibul_mal")!;
  const mudharib = input.pihak.find((p) => p.peran === "mudharib")!;

  const totalModal = shahibul?.jumlahModal ?? 0;
  const estimasi = input.estimasiPendapatanUsaha;

  const shahibulKeuntungan = estimasi * ((shahibul?.nisbahKeuntungan ?? 0) / 100);
  const mudharibKeuntungan = estimasi * ((mudharib?.nisbahKeuntungan ?? 0) / 100);

  const pembagian: PembagianPihak[] = [
    {
      nama: shahibul?.nama || "Shahibul Mal",
      peran: "Shahibul Mal (Pemilik Modal)",
      keuntunganRupiah: shahibulKeuntungan,
      persentaseKeuntungan: shahibul?.nisbahKeuntungan ?? 0,
      kerugianRupiah: totalModal,
      persentaseKerugian: 100,
    },
    {
      nama: mudharib?.nama || "Mudharib",
      peran: "Mudharib (Pengelola)",
      keuntunganRupiah: mudharibKeuntungan,
      persentaseKeuntungan: mudharib?.nisbahKeuntungan ?? 0,
      kerugianRupiah: 0,
      persentaseKerugian: 0,
    },
  ];

  const pihakSkenario = [
    { nama: shahibul?.nama || "Shahibul Mal", nisbah: shahibul?.nisbahKeuntungan ?? 0 },
    { nama: mudharib?.nama || "Mudharib", nisbah: mudharib?.nisbahKeuntungan ?? 0 },
  ];

  const skenario: SkenarioResult[] = [
    buildSkenario("🟢 Optimis", 1.3, estimasi, pihakSkenario),
    buildSkenario("⚪ Moderat", 1.0, estimasi, pihakSkenario),
    buildSkenario("🔴 Pesimis", 0.5, estimasi, pihakSkenario),
  ];

  const jenisTeks =
    input.jenisMudharabah === "muthlaqah"
      ? "Muthlaqah (Tidak Terikat)"
      : "Muqayyadah (Terikat)";

  const ringkasanAkad = `Akad Mudharabah ${jenisTeks} antara ${shahibul?.nama || "Shahibul Mal"} sebagai pemilik modal dan ${mudharib?.nama || "Mudharib"} sebagai pengelola. Modal: Rp ${totalModal.toLocaleString("id-ID")}. Nisbah keuntungan: ${shahibul?.nisbahKeuntungan ?? 0}% : ${mudharib?.nisbahKeuntungan ?? 0}%.`;

  return {
    totalModal,
    estimasiPendapatan: estimasi,
    estimasiKeuntunganBersih: estimasi,
    pembagian,
    skenario,
    ringkasanAkad,
    validasiNisbah: validasi,
  };
}
