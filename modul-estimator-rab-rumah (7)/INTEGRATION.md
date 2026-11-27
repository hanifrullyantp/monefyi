# INTEGRATION — Panduan Integrasi ke Aplikasi Host

Modul Estimator RAB Rumah diekspor sebagai komponen React `<EstimatorModule host={...} />` tanpa navbar sendiri, dirancang untuk disisipkan ke aplikasi utama.

---

## 1. Pemakaian Dasar
```tsx
import { EstimatorModule } from "./EstimatorModule";

export function App() {
  return (
    <EstimatorModule
      host={{
        currentUser: { name: "Budi Santoso", email: "budi@contoh.id" },
        onNavigateBack: () => {
          // Callback saat user menekan kembali di menu mengambang
          window.history.back();
        },
        onProjectCreated: (project) => {
          console.log("Proyek baru dibuat:", project.id, project.name);
        },
        onEvent: ({ type, payload }) => {
          // Event modul: project_created, project_archived, layout_applied,
          // scenario_applied, actuals_recorded, calibration_applied, ahsp_imported
          console.log("Modul Event:", type, payload);
        },
        theme: {
          accent: "#157F5F",
          surface: "#F4F7F5",
        },
        initialProjectId: undefined,
        engineMode: "local", // "local" (browser) atau "remote" (server API)
        remoteUrl: "https://api.contoh.id",
      }}
    />
  );
}
```

---

## 2. Navigasi Tanpa Navbar
Modul sepenuhnya mematuhi prinsip **Clean Shell Tanpa Navbar**:
- Navigasi kembali internal melalui chip `< Proyek` di sudut kiri atas konten.
- Tombol mengambang (FAB) `Menu` 48px di kanan bawah (di atas tombol aksi bawah), membuka popover/bottom sheet:
  - Proyek Baru
  - Cari Proyek
  - Database Harga & Analisis
  - Realisasi & Kalibrasi
  - Planner Harga
  - Impor / Ekspor AHSP
  - Pengaturan
  - Pelajaran AI
  - Arsip
- Command Palette cepat melalui shortcut `Ctrl/Cmd + K` untuk pencarian dan aksi instan.
- Bagian RAB (Ringkasan, Rincian, Material, Kurva S, Termin, Versi) dapat di-scroll dengan chip lompat internal.

---

## 3. Kontrak `EngineClient` (`src/integration/engineClient.ts`)
Seluruh komponen UI hanya berkomunikasi dengan engine melalui antarmuka `EngineClient`:
```ts
export interface EngineClient {
  readonly mode: "local" | "remote";
  computeRab(project: Project): Promise<RabResult>;
  interpretText(text: string): Promise<IntentResult>;
  nextQuestion(project: Project): Promise<InterviewQuestion | null>;
  recordCorrection(c: Correction): Promise<void>;
  recordActuals(a: ActualRecord): Promise<void>;
  getCalibration(): Promise<CalibrationReport>;
  runBacktest(csv: string): Promise<{ result: BacktestResult | null; errors: string[] }>;
  previewFormula(formula: string, vars: Record<string, number>): ReturnType<typeof previewFormula>;
  generateLayouts(brief: LayoutBrief, count?: number): Promise<LayoutAlternative[]>;
  validateLayout(model: BuildingModel, rooms: Room[]): Promise<ValidationResult>;
  checkRoomPlacement(model: BuildingModel, rooms: Room[], roomId: string, level: number): Promise<{ ok: boolean; reason?: string; suggestion?: string }>;
  optimize(project: Project, goal: OptimizerGoal): Promise<OptimizerResult>;
  efficiency(project: Project, goal: OptimizerGoal): Promise<(EfficiencyRow & { specAtFloor: SpecState })[]>;
  applyEfficiency(project: Project, portions: Partial<Record<SpecGroupKey, number>>, goal: OptimizerGoal): Promise<SpecState>;
  specDeltas(project: Project): Promise<Record<SpecGroupKey, { current: number; options: { level: SpecLevel; delta: number; blocked?: string }[] }>>;
  facadeFromText(text: string, model: BuildingModel): Promise<{ spec: FacadeSpec; variations: FacadeSpec[]; note?: string }>;
  catalog: {
    listWorkItems(): Promise<WorkItem[]>;
    listAnalyses(): Promise<Analisis[]>;
    listPrices(): Promise<Komponen[]>;
    upsertPrice(k: Komponen): Promise<void>;
    upsertAnalysis(a: Analisis): Promise<void>;
  };
}
```

---

## 4. Pemisahan Modul Tanpa Dependensi Browser
Folder `src/engine/`, `src/geometry/`, dan `src/data/` bersifat fungsi murni tanpa ketergantungan pada React, DOM, atau Three.js, sehingga dapat disalin langsung ke backend Node.js untuk implementasi server remote `/v1`.

## Revisi kontrak Fase 1

Gunakan `result.total` untuk jumlah yang dibayar pembeli, `result.rap.sellingPrice` untuk harga sebelum pajak, dan `result.rap.margin` untuk margin. Jangan hitung ulang angka tersebut di host. Kolom BOQ `directAmount` adalah basis biaya langsung yang sama pada kedua mode markup.

`EngineClient.planTarget(project, { amount, basis, lock? })` menerima basis `total` (termasuk PPN aktif), `rap`, atau `margin`; hasil adalah ledger harga lengkap. Adaptor remote memerlukan `POST /v1/pricing/target`. Implementasi server remote tidak diklaim tersedia. `summarizePortfolio` menjumlahkan hasil engine untuk proyek aktif dan mengembalikan `null` jika belum ada hasil.

Faktor bahan disimpan bersama pengaturan di IndexedDB. Saat proyek lama dibuka, salinan lantai atas yang dapat dikenali dari ID induk, nama, fungsi dan poligon identik diperbaiki; ruang buatan pengguna dan nilai snapshot historis tidak ditimpa.
