import type {
  MusyarakahInput,
  MusyarakahResult,
  PembagianPihak,
  SkenarioResult,
  ValidationResult,
} from "@/types/bagi-hasil";

function validateInput(input: MusyarakahInput): ValidationResult {
  const pesan: string[] = [];

  if (input.pihak.length < 2)
    pesan.push("Minimal 2 pihak diperlukan dalam musyarakah.");

  const totalNisbahKeuntungan = input.pihak.reduce(
    (s, p) => s + p.nisbahKeuntungan,
    0
  );
  if (Math.abs(totalNisbahKeuntungan - 100) > 0.01)
    pesan.push(
      `Total nisbah keuntungan harus 100%. Saat ini: ${totalNisbahKeuntungan.toFixed(2)}%`
    );

  const totalModal = input.pihak.reduce((s, p) => s + p.jumlahModal, 0);
  if (input.jenisMusyarakah !== "abdan" && input.jenisMusyarakah !== "wujuh") {
    if (totalModal <= 0) pesan.push("Total modal harus lebih dari 0.");
    input.pihak.forEach((p) => {
      if (p.jumlahModal < 0)
        pesan.push(`Modal ${p.nama || "pihak"} tidak boleh negatif.`);
    });
  }

  if (input.jenisMusyarakah === "mufawadhah") {
    const pertama = input.pihak[0]?.nisbahKeuntungan ?? 0;
    const semua = input.pihak.every(
      (p) => Math.abs(p.nisbahKeuntungan - pertama) < 0.01
    );
    if (!semua)
      pesan.push(
        "Musyarakah Mufawadhah mengharuskan nisbah keuntungan yang sama untuk semua pihak."
      );
  }

  if (input.estimasiPendapatanUsaha <= 0)
    pesan.push("Estimasi pendapatan usaha harus lebih dari 0.");

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

export function calculateMusyarakah(
  input: MusyarakahInput
): MusyarakahResult {
  const validasi = validateInput(input);

  const totalModal = input.pihak.reduce((s, p) => s + p.jumlahModal, 0);
  const estimasi = input.estimasiPendapatanUsaha;

  const pihakDenganPersen = input.pihak.map((p) => ({
    ...p,
    persentaseModal: totalModal > 0 ? (p.jumlahModal / totalModal) * 100 : 0,
    nisbahKerugian: totalModal > 0 ? (p.jumlahModal / totalModal) * 100 : 100 / input.pihak.length,
  }));

  const pembagian: PembagianPihak[] = pihakDenganPersen.map((p) => ({
    nama: p.nama || "Pihak",
    peran: `Mitra (${p.persentaseModal.toFixed(1)}% modal)`,
    keuntunganRupiah: estimasi * (p.nisbahKeuntungan / 100),
    persentaseKeuntungan: p.nisbahKeuntungan,
    kerugianRupiah: totalModal * (p.nisbahKerugian / 100),
    persentaseKerugian: p.nisbahKerugian,
  }));

  const distribusiModal = pihakDenganPersen.map((p) => ({
    nama: p.nama || "Pihak",
    jumlah: p.jumlahModal,
    persentase: p.persentaseModal,
  }));

  const pihakSkenario = pihakDenganPersen.map((p) => ({
    nama: p.nama || "Pihak",
    nisbah: p.nisbahKeuntungan,
  }));

  const skenario: SkenarioResult[] = [
    buildSkenario("🟢 Optimis", 1.3, estimasi, pihakSkenario),
    buildSkenario("⚪ Moderat", 1.0, estimasi, pihakSkenario),
    buildSkenario("🔴 Pesimis", 0.5, estimasi, pihakSkenario),
  ];

  const catatanKerugian =
    "Kerugian dalam musyarakah wajib dibagi proporsional sesuai porsi modal masing-masing pihak. Ketentuan ini merupakan ijma' ulama dan tidak dapat diubah.";

  return {
    totalModal,
    estimasiPendapatan: estimasi,
    estimasiKeuntunganBersih: estimasi,
    pembagian,
    distribusiModal,
    skenario,
    validasiNisbah: validasi,
    catatanKerugian,
  };
}
