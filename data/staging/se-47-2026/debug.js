const d = require("./analisis-lampiran-vi.json");
const valid = d.baris.filter((r) => !r.needs_review);
const nr = d.baris.filter((r) => r.needs_review);
console.log("=== 5 VALID ===");
valid.slice(0, 5).forEach((r) => {
  console.log(JSON.stringify({
    kode: r.kodePekerjaan, uraian: r.uraianPekerjaan, satuan: r.satuanPekerjaan,
    halaman: r.halaman, nkomponen: r.komponen.length,
    komponen: r.komponen.map((c) => c.kode + ":" + c.koefisien + c.satuan).join(";"),
  }));
});
console.log("=== 5 NEEDS_REVIEW ===");
nr.slice(0, 5).forEach((r) => {
  console.log(JSON.stringify({
    kode: r.kodePekerjaan, uraian: r.uraianPekerjaan, satuan: r.satuanPekerjaan,
    halaman: r.halaman, alasan: r.alasanNeedsReview, nkomponen: r.komponen.length,
  }));
});
