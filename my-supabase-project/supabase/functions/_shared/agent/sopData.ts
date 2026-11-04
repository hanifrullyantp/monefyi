import type { SopDefinition } from './sopSchema.ts';

/** Dihasilkan dari agent-core/sop/*.yaml. Jangan disunting tangan. */
export const SOP_CATALOG: SopDefinition[] = [
  {
    "id": "bayar_hutang_pihak",
    "version": 1,
    "domain": "keuangan",
    "timeoutMinutes": 30,
    "intent": "pay_payable",
    "examples": [
      "bayar hutang toko bangunan",
      "lunasi supplier semen"
    ],
    "prerequisites": [
      "pihak_dikenal"
    ],
    "parameters": [
      {
        "key": "batas_bayar_rupiah",
        "type": "integer",
        "min": 0,
        "max": 100000000000,
        "required": true,
        "defaultValue": 5000000
      }
    ],
    "steps": [
      {
        "id": "cari_pihak",
        "tools": [
          "find_party"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "cari_dompet",
        "onNeedsChoice": "cari_pihak",
        "onInvalid": "cari_pihak",
        "onConflict": "cari_pihak"
      },
      {
        "id": "cari_dompet",
        "tools": [
          "find_wallet"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "siapkan_bayar",
        "onNeedsChoice": "cari_dompet",
        "onInvalid": "cari_dompet",
        "onConflict": "cari_dompet"
      },
      {
        "id": "siapkan_bayar",
        "tools": [
          "prepare_debt_payment"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "simpan_bayar",
        "onNeedsChoice": "siapkan_bayar",
        "onInvalid": "siapkan_bayar",
        "onConflict": "siapkan_bayar"
      },
      {
        "id": "simpan_bayar",
        "tools": [
          "commit_debt_payment"
        ],
        "minRole": "manager",
        "approval": true,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "simpan_bayar",
        "onInvalid": "simpan_bayar",
        "onConflict": "simpan_bayar"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "manager",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "hutang_berkurang"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  },
  {
    "id": "buat_proyek_dari_template",
    "version": 1,
    "domain": "proyek",
    "timeoutMinutes": 30,
    "intent": "create_project_from_template",
    "examples": [
      "buat proyek dari template rumah",
      "duplikasi pola proyek ruko"
    ],
    "prerequisites": [
      "template_disetujui"
    ],
    "parameters": [
      {
        "key": "anggaran_maks_rupiah",
        "type": "integer",
        "min": 0,
        "max": 100000000000,
        "required": true,
        "defaultValue": 5000000000
      }
    ],
    "steps": [
      {
        "id": "cari_template",
        "tools": [
          "find_project_template"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "siapkan_proyek",
        "onNeedsChoice": "cari_template",
        "onInvalid": "cari_template",
        "onConflict": "cari_template"
      },
      {
        "id": "siapkan_proyek",
        "tools": [
          "prepare_project_from_template"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "simpan_proyek",
        "onNeedsChoice": "siapkan_proyek",
        "onInvalid": "siapkan_proyek",
        "onConflict": "siapkan_proyek"
      },
      {
        "id": "simpan_proyek",
        "tools": [
          "commit_project_from_template"
        ],
        "minRole": "manager",
        "approval": true,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "simpan_proyek",
        "onInvalid": "simpan_proyek",
        "onConflict": "simpan_proyek"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "manager",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "proyek_terbuat"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  },
  {
    "id": "catat_biaya",
    "version": 1,
    "domain": "keuangan_proyek",
    "timeoutMinutes": 30,
    "intent": "record_cost",
    "examples": [
      "beli semen 10 sak 65000",
      "bayar tukang 1500000"
    ],
    "prerequisites": [
      "proyek_disebut"
    ],
    "parameters": [
      {
        "key": "ambang_konfirmasi_rupiah",
        "type": "integer",
        "min": 0,
        "max": 100000000000,
        "required": true,
        "defaultValue": 1000000
      }
    ],
    "steps": [
      {
        "id": "cari_proyek",
        "tools": [
          "find_project"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "siapkan_biaya",
        "onNeedsChoice": "cari_proyek",
        "onInvalid": "cari_proyek",
        "onConflict": "cari_proyek"
      },
      {
        "id": "siapkan_biaya",
        "tools": [
          "prepare_record_cost"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "simpan_biaya",
        "onNeedsChoice": "siapkan_biaya",
        "onInvalid": "siapkan_biaya",
        "onConflict": "siapkan_biaya"
      },
      {
        "id": "simpan_biaya",
        "tools": [
          "commit_record_cost"
        ],
        "minRole": "worker",
        "approval": true,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "simpan_biaya",
        "onInvalid": "simpan_biaya",
        "onConflict": "simpan_biaya"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "worker",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "biaya_tercatat",
      "nominal_sama_dengan_token"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  },
  {
    "id": "laporan_harian_proyek",
    "version": 1,
    "domain": "proyek",
    "timeoutMinutes": 30,
    "intent": "daily_log",
    "examples": [
      "laporan hari ini pasang bata",
      "catat cuaca hujan pekerjaan berhenti"
    ],
    "prerequisites": [
      "proyek_terbuka"
    ],
    "parameters": [
      {
        "key": "panjang_catatan_maks",
        "type": "integer",
        "min": 20,
        "max": 2000,
        "required": true,
        "defaultValue": 500
      }
    ],
    "steps": [
      {
        "id": "cari_proyek",
        "tools": [
          "find_project"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "siapkan_laporan",
        "onNeedsChoice": "cari_proyek",
        "onInvalid": "cari_proyek",
        "onConflict": "cari_proyek"
      },
      {
        "id": "siapkan_laporan",
        "tools": [
          "prepare_daily_log"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "simpan_laporan",
        "onNeedsChoice": "siapkan_laporan",
        "onInvalid": "siapkan_laporan",
        "onConflict": "siapkan_laporan"
      },
      {
        "id": "simpan_laporan",
        "tools": [
          "commit_daily_log"
        ],
        "minRole": "worker",
        "approval": true,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "simpan_laporan",
        "onInvalid": "simpan_laporan",
        "onConflict": "simpan_laporan"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "worker",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "laporan_tersimpan"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  },
  {
    "id": "pinjam_internal",
    "version": 1,
    "domain": "keuangan",
    "timeoutMinutes": 30,
    "intent": "internal_loan",
    "examples": [
      "pinjam kas proyek untuk operasional",
      "transfer internal antar dompet"
    ],
    "prerequisites": [
      "bukan_biaya_proyek"
    ],
    "parameters": [
      {
        "key": "batas_pinjaman_rupiah",
        "type": "integer",
        "min": 0,
        "max": 100000000000,
        "required": true,
        "defaultValue": 20000000
      }
    ],
    "steps": [
      {
        "id": "cari_asal",
        "tools": [
          "find_wallet"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "cari_tujuan",
        "onNeedsChoice": "cari_asal",
        "onInvalid": "cari_asal",
        "onConflict": "cari_asal"
      },
      {
        "id": "cari_tujuan",
        "tools": [
          "find_wallet"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "siapkan_pinjam",
        "onNeedsChoice": "cari_tujuan",
        "onInvalid": "cari_tujuan",
        "onConflict": "cari_tujuan"
      },
      {
        "id": "siapkan_pinjam",
        "tools": [
          "prepare_internal_loan"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "simpan_pinjam",
        "onNeedsChoice": "siapkan_pinjam",
        "onInvalid": "siapkan_pinjam",
        "onConflict": "siapkan_pinjam"
      },
      {
        "id": "simpan_pinjam",
        "tools": [
          "commit_internal_loan"
        ],
        "minRole": "manager",
        "approval": true,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "simpan_pinjam",
        "onInvalid": "simpan_pinjam",
        "onConflict": "simpan_pinjam"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "manager",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "pinjaman_internal_tercatat"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  },
  {
    "id": "rekonsiliasi_kas",
    "version": 1,
    "domain": "keuangan",
    "timeoutMinutes": 30,
    "intent": "reconcile_cash",
    "examples": [
      "cocokkan kas toko hari ini",
      "rekonsiliasi dompet proyek"
    ],
    "prerequisites": [
      "dompet_disebut"
    ],
    "parameters": [
      {
        "key": "selisih_maks_rupiah",
        "type": "integer",
        "min": 0,
        "max": 1000000000,
        "required": true,
        "defaultValue": 100000
      }
    ],
    "steps": [
      {
        "id": "cari_dompet",
        "tools": [
          "find_wallet"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "lihat_saldo",
        "onNeedsChoice": "cari_dompet",
        "onInvalid": "cari_dompet",
        "onConflict": "cari_dompet"
      },
      {
        "id": "lihat_saldo",
        "tools": [
          "get_cash_position"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "siapkan_rekonsiliasi",
        "onNeedsChoice": "lihat_saldo",
        "onInvalid": "lihat_saldo",
        "onConflict": "lihat_saldo"
      },
      {
        "id": "siapkan_rekonsiliasi",
        "tools": [
          "prepare_cash_reconcile"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "simpan_rekonsiliasi",
        "onNeedsChoice": "siapkan_rekonsiliasi",
        "onInvalid": "siapkan_rekonsiliasi",
        "onConflict": "siapkan_rekonsiliasi"
      },
      {
        "id": "simpan_rekonsiliasi",
        "tools": [
          "commit_cash_reconcile"
        ],
        "minRole": "manager",
        "approval": true,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "simpan_rekonsiliasi",
        "onInvalid": "simpan_rekonsiliasi",
        "onConflict": "simpan_rekonsiliasi"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "manager",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "kas_direkonsiliasi"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  },
  {
    "id": "terima_uang_klien",
    "version": 1,
    "domain": "keuangan_proyek",
    "timeoutMinutes": 30,
    "intent": "receive_client_money",
    "examples": [
      "terima DP klien rumah",
      "catat pelunasan klien"
    ],
    "prerequisites": [
      "proyek_dan_klien_disebut"
    ],
    "parameters": [
      {
        "key": "dp_minimum_persen",
        "type": "integer",
        "min": 0,
        "max": 100,
        "required": true,
        "defaultValue": 30
      }
    ],
    "steps": [
      {
        "id": "cari_proyek",
        "tools": [
          "find_project"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "cari_klien",
        "onNeedsChoice": "cari_proyek",
        "onInvalid": "cari_proyek",
        "onConflict": "cari_proyek"
      },
      {
        "id": "cari_klien",
        "tools": [
          "find_party"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "siapkan_terima",
        "onNeedsChoice": "cari_klien",
        "onInvalid": "cari_klien",
        "onConflict": "cari_klien"
      },
      {
        "id": "siapkan_terima",
        "tools": [
          "prepare_client_receipt"
        ],
        "minRole": "manager",
        "approval": false,
        "terminal": false,
        "onSuccess": "simpan_terima",
        "onNeedsChoice": "siapkan_terima",
        "onInvalid": "siapkan_terima",
        "onConflict": "siapkan_terima"
      },
      {
        "id": "simpan_terima",
        "tools": [
          "commit_client_receipt"
        ],
        "minRole": "manager",
        "approval": true,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "simpan_terima",
        "onInvalid": "simpan_terima",
        "onConflict": "simpan_terima"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "manager",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "uang_masuk_tercatat"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  },
  {
    "id": "tinjau_proyek_berisiko",
    "version": 1,
    "domain": "proyek",
    "timeoutMinutes": 30,
    "intent": "review_risky_project",
    "examples": [
      "proyek mana yang telat",
      "tinjau proyek berisiko"
    ],
    "prerequisites": [
      "ada_proyek_aktif"
    ],
    "parameters": [
      {
        "key": "spi_minimum_persen",
        "type": "integer",
        "min": 0,
        "max": 100,
        "required": true,
        "defaultValue": 90
      }
    ],
    "steps": [
      {
        "id": "cari_proyek",
        "tools": [
          "find_project"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "hitung",
        "onNeedsChoice": "cari_proyek",
        "onInvalid": "cari_proyek",
        "onConflict": "cari_proyek"
      },
      {
        "id": "hitung",
        "tools": [
          "get_evm"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "hitung",
        "onInvalid": "hitung",
        "onConflict": "hitung"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "worker",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "tinjauan_terbaca"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  },
  {
    "id": "update_progres_pekerjaan",
    "version": 1,
    "domain": "proyek",
    "timeoutMinutes": 30,
    "intent": "update_progress",
    "examples": [
      "progres pasang keramik 40 persen",
      "pekerjaan atap selesai"
    ],
    "prerequisites": [
      "pekerjaan_disebut"
    ],
    "parameters": [
      {
        "key": "progres_maks",
        "type": "integer",
        "min": 0,
        "max": 100,
        "required": true,
        "defaultValue": 100
      }
    ],
    "steps": [
      {
        "id": "cari_proyek",
        "tools": [
          "find_project"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "cari_pekerjaan",
        "onNeedsChoice": "cari_proyek",
        "onInvalid": "cari_proyek",
        "onConflict": "cari_proyek"
      },
      {
        "id": "cari_pekerjaan",
        "tools": [
          "find_work_item"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "siapkan_progres",
        "onNeedsChoice": "cari_pekerjaan",
        "onInvalid": "cari_pekerjaan",
        "onConflict": "cari_pekerjaan"
      },
      {
        "id": "siapkan_progres",
        "tools": [
          "prepare_progress_update"
        ],
        "minRole": "worker",
        "approval": false,
        "terminal": false,
        "onSuccess": "simpan_progres",
        "onNeedsChoice": "siapkan_progres",
        "onInvalid": "siapkan_progres",
        "onConflict": "siapkan_progres"
      },
      {
        "id": "simpan_progres",
        "tools": [
          "commit_progress_update"
        ],
        "minRole": "worker",
        "approval": true,
        "terminal": false,
        "onSuccess": "selesai",
        "onNeedsChoice": "simpan_progres",
        "onInvalid": "simpan_progres",
        "onConflict": "simpan_progres"
      },
      {
        "id": "selesai",
        "tools": [],
        "minRole": "worker",
        "approval": false,
        "terminal": true,
        "onSuccess": null,
        "onNeedsChoice": null,
        "onInvalid": null,
        "onConflict": null
      }
    ],
    "postconditions": [
      "progres_tercatat"
    ],
    "escalationAfter": 2,
    "escalationTo": "pemilik"
  }
];
