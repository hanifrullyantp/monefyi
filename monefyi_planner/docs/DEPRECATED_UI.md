# UI Legacy — Tidak Digunakan Lagi

Daftar file yang **disimpan** di repo tetapi **tidak lagi di-route** setelah migrasi partial (Detail Project, Keuangan Bisnis, Database). Jangan dihapus tanpa review; gunakan sebagai referensi write-parity.

**Terakhir diperbarui:** 2026-07-13

## Detail Project — Command Center (V1)

| File | Alasan deprecated |
|------|-------------------|
| `src/components/projects/ProjectDetail.tsx` | Diganti `ProjectDetailV2.tsx` — semua entry point ke detail proyek |
| `src/components/projects/command-center/ProjectCommandHeader.tsx` | Bagian Command Center |
| `src/components/projects/command-center/ProjectCommandTabs.tsx` | Bagian Command Center |
| `src/components/projects/command-center/TabOverview.tsx` | Tab lama |
| `src/components/projects/command-center/TabBahanTukang.tsx` | Tab lama |
| `src/components/projects/command-center/TabKeuangan.tsx` | Tab lama |
| `src/components/projects/command-center/TabHutangPiutang.tsx` | Tab lama |
| `src/components/projects/command-center/TabPlanningRealisasi.tsx` | Tab lama |
| `src/components/projects/command-center/TabDokumenLaporan.tsx` | Tab lama |
| `src/components/projects/command-center/ProjectScheduleGantt.tsx` | Gantt inline di command center |
| `src/components/projects/command-center/types.ts` | Types Command Center |
| `src/components/projects/ProjectDetailHeader.tsx` | Header legacy (masih di-import oleh TabHutangPiutang) |

**Pengganti aktif:** `src/components/projects/v2/*`

## Keuangan — Finance V1

| File | Alasan deprecated |
|------|-------------------|
| `src/pages/Finance.tsx` | Sidebar mengarah ke `/app/finance-v2`; V1 hanya jika `activeTab=finance` di `/app` |
| `src/components/finance-v1/BusinessReportPanel.tsx` | Panel laporan V1 |
| `src/services/financeV1/*` | Service layer V1 |

**Pengganti aktif:** `src/pages/finance-v2/FinanceBusinessPage.tsx` + tab sandbox 7

## Keuangan V2 — Nav lama (10 modul)

| File | Alasan deprecated |
|------|-------------------|
| `src/components/finance-v2/FinanceV2Sidebar.tsx` | Diganti tab horizontal 7-tab sandbox |
| Route `/app/finance-v2/kas`, `piutang`, `hutang`, `stok`, `prabayar`, `investor` | Redirect ke struktur tab sandbox |

Halaman sub-modul (`KasPage`, `OpexPage`, dll.) **masih dipakai** sebagai konten tab.

## Sandbox vanilla (bukan production router)

| Path | Catatan |
|------|---------|
| `refined-project-planner-prompt/src-new/js/pages/project-detail.js` | Placeholder — referensi UI di `src/lib/project-detail/` |
| `refined-project-planner-prompt/src-new/js/pages/finance.js` | Placeholder |
| `refined-project-planner-prompt/src-new/js/pages/database.js` | Placeholder |

## Cara verifikasi file tidak terpakai

```bash
# Contoh: ProjectDetail tidak di-import di production
rg "from.*ProjectDetail'" monefyi_planner/src --glob '!**/ProjectDetail.tsx'
```
