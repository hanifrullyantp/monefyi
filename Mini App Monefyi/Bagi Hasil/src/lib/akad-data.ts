import type { AkadInfo } from "@/types/bagi-hasil";
import { dalilMudharabah, dalilMusyarakah, dalilMuzaraah, dalilMukhabarah, dalilMusaqah, dalilUmum } from "./dalil-data";

export const akadData: AkadInfo[] = [
  {
    id: "mudharabah",
    nama: "Mudharabah",
    namaArab: "المضاربة",
    definisi:
      "Kerja sama di mana satu pihak (shahibul mal) menyediakan 100% modal, dan pihak lain (mudharib) mengelola usaha dengan keahliannya. Keuntungan dibagi sesuai nisbah yang disepakati, sedangkan kerugian finansial ditanggung penuh oleh pemilik modal.",
    rukun: [
      "Shahibul Mal (pemilik modal)",
      "Mudharib (pengelola)",
      "Ra'sul Mal (modal usaha)",
      "Amal (pekerjaan/usaha)",
      "Keuntungan (ribh)",
      "Ijab dan Qabul (sighat akad)",
    ],
    syarat: [
      "Modal harus tunai atau setara, bukan utang",
      "Modal harus diketahui jumlahnya",
      "Nisbah harus jelas dan disepakati di muka",
      "Jenis usaha harus halal",
      "Untuk muqayyadah, batasan harus jelas dan wajar",
    ],
    keuntunganDibagi: "Sesuai nisbah yang disepakati di awal akad",
    kerugianDitanggung:
      "Pemilik modal menanggung kerugian finansial sepenuhnya. Pengelola menanggung kerugian waktu, tenaga, dan pikiran. Jika kerugian akibat kelalaian/kecurangan pengelola, pengelola wajib ganti rugi.",
    contohKasus:
      "A memiliki modal Rp 100 juta, B memiliki keahlian di bidang kuliner. A dan B sepakat nisbah keuntungan 60:40. Jika usaha rugi bukan karena kelalaian B, A menanggung semua kerugian modal.",
    dalil: [...dalilUmum.slice(0, 2), ...dalilMudharabah],
  },
  {
    id: "musyarakah",
    nama: "Musyarakah",
    namaArab: "المشاركة",
    definisi:
      "Kerja sama antara dua pihak atau lebih yang masing-masing menyertakan modal dan/atau keahlian untuk menjalankan usaha bersama. Keuntungan dibagi sesuai nisbah yang disepakati, kerugian dibagi proporsional terhadap modal.",
    rukun: [
      "Para pihak ('aqidain)",
      "Modal (ra'sul mal)",
      "Usaha (amal)",
      "Keuntungan (ribh)",
      "Sighat akad",
    ],
    syarat: [
      "Modal masing-masing harus jelas",
      "Nisbah keuntungan disepakati di awal",
      "Nisbah kerugian proporsional terhadap modal (tidak bisa diubah)",
      "Untuk musyarakah inan, nisbah laba boleh berbeda dari porsi modal",
    ],
    keuntunganDibagi:
      "Sesuai nisbah yang disepakati (boleh berbeda dari porsi modal)",
    kerugianDitanggung:
      "Proporsional terhadap modal masing-masing. Ini adalah ketentuan yang tidak dapat diubah berdasarkan ijma' ulama.",
    contohKasus:
      "A menyertakan Rp 60 juta, B menyertakan Rp 40 juta. Mereka sepakat laba dibagi 50:50 karena B lebih aktif bekerja. Jika rugi Rp 10 juta, A tanggung Rp 6 juta dan B tanggung Rp 4 juta.",
    dalil: [...dalilUmum.slice(0, 2), ...dalilMusyarakah],
  },
  {
    id: "muzaraah",
    nama: "Muzara'ah",
    namaArab: "المزارعة",
    definisi:
      "Kerja sama pengolahan lahan pertanian di mana pemilik lahan menyediakan lahan DAN benih, sedangkan penggarap menyediakan tenaga dan alat. Hasil panen dibagi sesuai nisbah yang disepakati.",
    rukun: [
      "Pemilik lahan",
      "Penggarap",
      "Lahan pertanian",
      "Benih (dari pemilik lahan)",
      "Hasil panen",
      "Sighat akad",
    ],
    syarat: [
      "Lahan harus dapat ditanami",
      "Benih jelas jenis dan jumlahnya",
      "Nisbah hasil panen disepakati di awal",
      "Masa penggarapan jelas",
    ],
    keuntunganDibagi: "Persentase dari total hasil panen setelah dikurangi biaya operasional",
    kerugianDitanggung: "Ditanggung bersama secara proporsional sesuai nisbah",
    contohKasus:
      "Pak Ahmad memiliki sawah 2 hektar beserta benih padi. Pak Budi bersedia menggarap. Mereka sepakat hasil panen dibagi 60% untuk Pak Ahmad dan 40% untuk Pak Budi.",
    dalil: [...dalilUmum.slice(0, 2), ...dalilMuzaraah],
  },
  {
    id: "mukhabarah",
    nama: "Mukhabarah",
    namaArab: "المخابرة",
    definisi:
      "Seperti muzara'ah, namun BENIH disediakan oleh PENGGARAP. Pemilik lahan hanya menyediakan lahan, sedangkan penggarap menyediakan benih dan tenaga. Hasil panen dibagi sesuai nisbah yang disepakati.",
    rukun: [
      "Pemilik lahan",
      "Penggarap",
      "Lahan pertanian",
      "Benih (dari penggarap — ini yang membedakan dari Muzara'ah)",
      "Hasil panen",
      "Sighat akad",
    ],
    syarat: [
      "Lahan harus dapat ditanami",
      "Benih dari penggarap harus jelas jenis dan jumlahnya",
      "Nisbah hasil panen disepakati di awal (bukan dari bagian lahan tertentu)",
      "Masa penggarapan jelas",
    ],
    keuntunganDibagi:
      "Persentase dari total hasil panen. Biaya benih diperhitungkan sebagai kontribusi penggarap.",
    kerugianDitanggung: "Ditanggung bersama secara proporsional sesuai nisbah",
    contohKasus:
      "Pak Ahmad memiliki sawah 2 hektar. Pak Budi bersedia menggarap dan menyediakan sendiri benih padi. Mereka sepakat hasil panen dibagi 50% untuk masing-masing, dengan biaya benih diperhitungkan dari bagian Pak Budi.",
    dalil: [...dalilUmum.slice(0, 2), ...dalilMukhabarah],
  },
  {
    id: "musaqah",
    nama: "Musaqah",
    namaArab: "المساقاة",
    definisi:
      "Kerja sama perawatan kebun atau tanaman yang sudah ada (seperti kurma, buah-buahan) antara pemilik kebun dan pengelola/perawat. Pengelola mendapat bagian dari hasil panen sebagai imbalan perawatan.",
    rukun: [
      "Pemilik kebun",
      "Pengelola/perawat",
      "Tanaman yang dirawat (sudah ada)",
      "Hasil panen",
      "Sighat akad",
    ],
    syarat: [
      "Tanaman harus jelas dan sudah ada (bukan menanam baru)",
      "Masa perawatan jelas",
      "Nisbah hasil panen disepakati di awal",
      "Pekerjaan perawatan dilakukan oleh pengelola",
    ],
    keuntunganDibagi: "Persentase dari hasil panen (tidak ada biaya benih)",
    kerugianDitanggung:
      "Jika panen gagal bukan karena kelalaian pengelola, ditanggung bersama sesuai nisbah.",
    contohKasus:
      "Pak Ahmad memiliki kebun kurma dengan 500 pohon yang sudah berproduksi. Pak Budi bersedia merawat kebun tersebut selama 1 tahun. Mereka sepakat hasil panen dibagi 60% untuk Pak Ahmad dan 40% untuk Pak Budi.",
    dalil: [...dalilUmum.slice(0, 2), ...dalilMusaqah],
  },
];

export function getAkadById(id: string): AkadInfo | undefined {
  return akadData.find((a) => a.id === id);
}
