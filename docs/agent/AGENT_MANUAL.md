# Panduan agen

Dokumen ini dihasilkan dari registry. Jangan disunting tangan.

Agen tidak menulis database. Agen memanggil tool. Id hanya dari find_*. Commit tidak mengirim ulang nominal.

## find_project

Cari proyek. Mengembalikan paling banyak 5 kandidat beserta skor, atau needs_choice.

Risiko: read. Peran minimum: worker.

- `query` (string, wajib): Nama proyek yang disebut pengguna.

## find_party

Cari pihak (supplier atau pelanggan) di organisasi. Tidak mengarang id.

Risiko: read. Peran minimum: worker.

- `query` (string, wajib): Nama pihak.

## find_wallet

Cari dompet kas, termasuk kas proyek.

Risiko: read. Peran minimum: worker.

- `query` (string, wajib): Nama dompet.
- `project_id` (string): Id proyek dari find_project.

## get_project_cash

Saldo kas satu proyek dari buku besar.

Risiko: read. Peran minimum: worker.

- `project_id` (string, wajib): Id proyek dari find_project.

## get_party_debt

Hutang satu pihak, bisa dipecah per proyek.

Risiko: read. Peran minimum: worker.

- `party_id` (string, wajib): Id pihak dari find_party.
- `project_id` (string): Batasi ke satu proyek.

## prepare_record_cost

Kunci nominal dan tanggal biaya selama 10 menit. Belum menulis database.

Risiko: prepare. Peran minimum: worker.

- `project_id` (string, wajib): Id proyek dari find_project.
- `item` (string, wajib): Nama barang atau pekerjaan.
- `total` (integer, wajib): Total rupiah bulat.
- `qty` (integer): Jumlah, jika ada.
- `unit` (string): Satuan tertutup dari daftar satuan biaya.
- `entry_date` (string, wajib): Tanggal YYYY-MM-DD di zona organisasi.

## commit_record_cost

Simpan biaya yang sudah disiapkan. Nominal dan tanggal tidak dikirim lagi.

Risiko: commit. Peran minimum: worker.

- `prepare_token` (string, wajib): Token dari prepare_record_cost.
- `idempotency_key` (string, wajib): Kunci yang sama saat mencoba ulang.

## propose_notification

Usulkan pemberitahuan. Belum mengirim.

Risiko: prepare. Peran minimum: manager.

- `project_id` (string, wajib): Id proyek dari find_project.
- `audience` (string, wajib): Penerima. Pilihan: owner, manager, project_workers.
- `message_id` (string, wajib): Kode pesan, bukan kalimat bebas.
