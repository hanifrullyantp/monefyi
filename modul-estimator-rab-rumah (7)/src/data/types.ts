export type Provenance = "pengguna" | "usulan_ai" | "aturan_parametrik" | "default_config";
export type Finishing = "standar" | "menengah" | "premium";
export type RoofType = "pelana" | "perisai" | "limasan" | "datar";
export type Foundation = "batu_kali" | "footplat" | "cerucuk";
export type Soil = "baik" | "sedang" | "buruk";
export type LabelRab = "INDIKATIF" | "RAB DETAIL";
export type ConfidenceLabel = "Akurat" | "Perlu cek" | "Tidak lengkap";
export type KomponenJenis = "tenaga" | "bahan" | "alat";
export type KelasSumber = "terukur" | "turunan" | "estimasi_struktur" | "persentase";

export interface Pt {
  x: number;
  y: number;
}

export type FootprintShape = "persegi" | "L" | "T" | "U" | "trapesium" | "polygon";

export interface Footprint {
  shape: FootprintShape;
  /** Kotak pembatas — dipertahankan untuk kompatibilitas & UI ringkas. */
  width: number;
  depth: number;
  /** Poligon batas lantai (CCW, meter). Sumber kebenaran geometri. */
  points: Pt[];
}

export type RoomFunction =
  | "kamar_utama" | "kamar_tidur" | "kamar_mandi" | "dapur" | "ruang_tamu" | "ruang_makan"
  | "ruang_keluarga" | "teras" | "carport" | "cuci" | "gudang" | "tangga" | "koridor" | "kerja";

export interface Room {
  id: string;
  name: string;
  fungsi: RoomFunction;
  level: number;
  /** Poligon ruangan (CCW, meter). */
  polygon: Pt[];
  wet: boolean;
  /** Zona penempatan dari solver: depan/tengah/belakang. */
  zone?: "depan" | "tengah" | "belakang";
  locked?: boolean;
}

export interface Level {
  index: number;
  height: number;
  footprint: Footprint;
}

export interface RoofSpec {
  type: RoofType;
  pitch: number;
  overhang: number;
}

export interface Assumption {
  source: Provenance;
  /** true = nilai dikonfirmasi pengguna. "Belum tahu" => answered true, confirmed false. */
  confirmed: boolean;
  confidence: number;
  answered?: boolean;
  note?: string;
}

export interface BuildingModel {
  id: string;
  name: string;
  type: string;
  area: number;
  landArea: number;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  levels: Level[];
  rooms: Room[];
  roof: RoofSpec;
  finishing: Finishing;
  foundation: Foundation;
  soil: Soil;
  location: string;
  /** Disimpan untuk kompatibilitas; engine memakai indeks per jenis dari config wilayah. */
  regionIndex: number;
  ceilingHeight: number;
  doors: number;
  windows: number;
  electricalPoints: number;
  waterPoints: number;
  carport: boolean;
  created: string;
  updated: string;
  assumptions: Record<string, Assumption>;
  structureConfirmed: boolean;
  /** Denah dihasilkan solver? (untuk tombol "Reset ke hasil generator") */
  layoutSeed?: number;
  layoutTypology?: LayoutTypology;
  /** Arah jalan relatif terhadap denah (derajat, 0 = dari depan/bawah). */
  roadDirection?: number;
}

/* ---------- Denah: kebutuhan, alternatif, validasi ---------- */

export type LayoutTypology = "linear" | "L" | "courtyard" | "split" | "U";

export interface RoomRequirement {
  fungsi: RoomFunction;
  label: string;
  count: number;
  minArea: number;
  minSide: number;
  wet: boolean;
  zone: "depan" | "tengah" | "belakang";
  needsExterior: boolean;
}

export interface LayoutBrief {
  area: number;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  landWidth?: number;
  landDepth?: number;
  landPolygon?: Pt[];
  roadDirection: number;
  typologyHint?: LayoutTypology | null;
  seed: number;
  priorities?: string[];
}

export interface LayoutScore {
  total: number;
  areaFit: number;
  circulation: number;
  plumbing: number;
  daylight: number;
  notes: string[];
}

export interface LayoutAlternative {
  id: string;
  typology: LayoutTypology;
  label: string;
  rooms: Room[];
  levels: Level[];
  score: LayoutScore;
  seed: number;
  area: number;
}

export interface LayoutIssue {
  code: string;
  severity: "saran" | "info" | "warning" | "error";
  message: string;
  roomIds: string[];
  suggestion?: string;
  actionLabel?: string;
  actionType?: "expand-room" | "shrink-neighbor" | "expand-footprint" | "group-plumbing" | "shift-exterior" | "repair-tiling" | "ignore";
}

export interface ValidationResult {
  valid: boolean;
  issues: LayoutIssue[];
  areaDelta: number;
}

/* ---------- Katalog (komponen, analisis, mapping pekerjaan) ---------- */

export interface Komponen {
  kode: string;
  uraian: string;
  jenis: KomponenJenis;
  satuan: string;
  harga: number;
  wilayah: string;
  tanggalBerlaku: string;
  sumber: string;
}

export interface AnalisisKomponen {
  komponenId: string;
  koefisien: number;
  waste?: number;
}

export interface Analisis {
  id: string;
  pekerjaanId: string;
  uraian: string;
  satuan: string;
  komponen: AnalisisKomponen[];
  sumber: { regulasi: string; tahun: number | null; halaman: string | null };
  keyakinan: "terverifikasi" | "belum";
}

export interface WorkItem {
  id: string;
  paket: string;
  uraian: string;
  satuan: string;
  /** Rumus dievaluasi parser (tanpa eval) dengan variabel dari geometri/model. */
  rumus: string;
  /** Rumus opsional; item aktif bila hasilnya > 0. */
  syaratAktif?: string;
  /** Boleh berisi {finishing} untuk memilih analisis per kelas finishing. */
  analisisId: string;
  kelasSumber: KelasSumber;
  /** Variabel model (kunci asumsi) yang menentukan volume. */
  slots: string[];
  /** Koefisien variasi volume bila slot belum dikonfirmasi. */
  cvVolume: number;
  relasi?: "lantai" | "basah" | "dinding" | "atap" | "plafon" | "bukaan" | "struktur" | "mep" | "umum";
  finishingSensitive?: boolean;
}

export interface Catalog {
  komponen: Komponen[];
  analisis: Analisis[];
  workItems: WorkItem[];
}

/* ---------- Hasil RAB ---------- */

export interface PackageBreakdown {
  key: string;
  label: string;
  percent: number;
  amount: number;
}

export interface AuditKomponen {
  kode: string;
  uraian: string;
  jenis: KomponenJenis;
  satuan: string;
  koefisien: number;
  waste: number;
  harga: number;
  indeks: number;
  tanggalBerlaku: string;
  sumber: string;
  subtotal: number;
  specFactor?: number;
  directAmount?: number;
}

export interface BoqItem {
  id: string;
  workItemId: string;
  packageKey: string;
  packageLabel: string;
  uraian: string;
  satuan: string;
  volume: number;
  unitPrice: number;
  amount: number;
  /** Net BOQ before commercial markup. Always set on calculated rows. */
  directAmount?: number;
  directUnitPrice?: number;
  rumus: string;
  variables: Record<string, number>;
  kelasSumber: KelasSumber;
  keyakinan: ConfidenceLabel;
  relasi?: WorkItem["relasi"];
  analisisId?: string;
  analisisSumber?: string;
  analisisKeyakinan?: Analisis["keyakinan"];
  komponen: AuditKomponen[];
  faktor: { nama: string; nilai: number; sumber: string }[];
  priceDate: string;
  verified: boolean;
  custom?: boolean;
  isStructure?: boolean;
}

export interface RekapRow {
  kode: string;
  uraian: string;
  jenis: KomponenJenis;
  satuan: string;
  qty: number;
  cost: number;
}

export interface RabResult {
  label: LabelRab;
  subtotal: number;
  overhead: number;
  profit: number;
  ppn: number;
  total: number;
  p10: number;
  p90: number;
  perM2: number;
  completeness: number;
  completenessDetail: { key: string; label: string; confirmed: boolean }[];
  confidence: ConfidenceLabel;
  packages: PackageBreakdown[];
  items: BoqItem[];
  materials: RekapRow[];
  labor: RekapRow[];
  equipment: RekapRow[];
  sCurve: { week: number; planned: number; actual?: number }[];
  terms: { label: string; percent: number; amount: number; note: string }[];
  verifiedPercent: number;
  priceConfidence: number;
  /** Rencana anggaran proyek (biaya riil kontraktor) & margin. */
  rap: RapBreakdown;
  /** Item pekerjaan yang tidak punya analisis (tidak dihitung diam-diam). */
  missingAnalysis: string[];
  stalePrices: number;
  overheadMode: "rekap" | "dalam_harga";
  warnings: string[];
  checks: { id: string; severity: "error" | "warning" | "info"; title: string; detail: string; suggestion: string; action: "perbaiki" | "tambahkan" | "tinjau" }[];
  calibrationId?: string;
  computeMs: number;
}

/* ---------- Proyek & state ---------- */

export interface ActualRecord {
  id: string;
  projectId: string;
  tanggal: string;
  perPaket: Record<string, number>;
  /** Progres kumulatif per minggu (%) — opsional, untuk kurva S aktual. */
  progress?: number[];
  estimateAtRecord: { total: number; perPaket: Record<string, number> };
  context: { finishing: Finishing; location: string; area: number; floors: number };
}

export interface CalibrationFactors {
  finishing: Partial<Record<Finishing, number>>;
  wilayah: Record<string, number>;
  produktivitas: number;
}

export interface CalibrationVersion {
  id: string;
  createdAt: string;
  label: string;
  factors: CalibrationFactors;
  status: "aktif" | "dibatalkan";
  basis: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: "draf" | "indikatif" | "detail";
  archived: boolean;
  location: string;
  model: BuildingModel;
  ratesLocked?: boolean;
  /** Snapshot harga komponen saat "Kunci harga" diaktifkan. */
  priceSnapshot?: Komponen[];
  boqOverrides?: Record<string, { volume?: number; unitPrice?: number; removed?: boolean; uraian?: string; formula?: string }>;
  /** Tingkat spesifikasi per kelompok (sumber kebenaran mutu). */
  spec?: SpecState;
  /** Spesifikasi tampak depan. */
  facade?: FacadeSpec;
  /** Lingkup opsional yang dapat dihapus optimizer. */
  scope?: { carport: boolean; canopy: boolean; balcony: boolean; secondarySkin: boolean };
  /** PPN aktif untuk proyek ini. */
  ppnEnabled?: boolean;
  /** Target planner harga (opsional, untuk selisih di dashboard). */
  targets?: PricingTargets;
  extraItems?: BoqItem[];
  lastSavedAt: string;
  thumbnail?: string;
  thumbnailKey?: string;
  stage: 1 | 2;
  answers: ConversationStep[];
  qualityFlag?: string;
  completed?: boolean;
}

export interface ConversationStep {
  question: string;
  answer: string;
  at: string;
  slot: string;
}

export interface ScenarioVersion {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  total: number;
  p10: number;
  p90: number;
  completeness: number;
  pricesLocked: boolean;
  modelSnapshot: BuildingModel;
  pricingSnapshot?: RapBreakdown;
  specSnapshot?: SpecState;
  facadeSnapshot?: FacadeSpec;
  scopeSnapshot?: Project["scope"];
  rap?: number;
  margin?: number;
}

export interface Correction {
  id: string;
  projectId?: string;
  context: { type: string; area: number; floors: number; location: string; finishing: Finishing };
  field: string;
  proposed: string | number;
  corrected: string | number;
  at: string;
  approval?: "pending" | "approved" | "rejected";
  source?: "pengguna" | "seed";
  total?: number;
  perPackage?: Record<string, number>;
}

export interface LearnedPattern {
  id: string;
  field: string;
  value: string | number;
  label: string;
  count: number;
  total: number;
  status: "pending" | "approved" | "rejected";
  contexts: string[];
  updatedAt: string;
}

export interface AppSettings {
  rapConfig?: { indirectPercent: number; contingencyPercent: number };
  materialFactors?: Partial<Record<SpecGroupKey, MaterialFactorRow>>;
  overheadPercent: number;
  profitPercent: number;
  ppnPercent: number;
  overheadMode: "rekap" | "dalam_harga";
  priceStaleMonths: number;
  aiProvider: "mock" | "openai" | "anthropic";
  aiKey: string;
  aiModel: string;
  sampleMode: boolean;
  engineMode: "local" | "remote";
  remoteUrl: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  detail?: string;
  tone: "success" | "info" | "warning" | "danger";
}

export interface EstimatorModuleProps {
  onNavigateBack?: () => void;
  onProjectCreated?: (project: Project) => void;
  onEvent?: (event: { type: string; payload?: unknown }) => void;
  currentUser?: { name: string; email?: string };
  theme?: { accent?: string; surface?: string };
  initialProjectId?: string;
  engineMode?: "local" | "remote";
  remoteUrl?: string;
}

/* ---------- Spesifikasi (tingkat geser) ---------- */

export type SpecLevel = "ekonomis" | "standar" | "menengah" | "premium";

export interface MaterialFactorRow {
  factors: Record<SpecLevel, number>;
  source: string;
  calibrated: boolean;
}

export type SpecGroupKey =
  | "struktur" | "dinding" | "atap" | "plafon" | "lantai" | "kusen" | "cat"
  | "sanitair" | "listrik" | "air" | "tampak" | "kitchen";

export interface SpecGroup {
  key: SpecGroupKey;
  label: string;
  hint: string;
  /** Paket pekerjaan yang terpengaruh. */
  packages: string[];
  /** Bobot "terlihat user" untuk kendala lunak optimizer (0..1). */
  visibility: number;
  /** Boleh diturunkan di bawah standar? */
  structural?: boolean;
}

export type SpecState = Record<SpecGroupKey, SpecLevel>;

export interface SpecConstraint {
  when: { group: SpecGroupKey; level: SpecLevel };
  requires: { group: SpecGroupKey; minLevel: SpecLevel };
  reason: string;
}

/* ---------- Tampak depan ---------- */

export type FacadeStyle = "minimalis" | "tropis" | "skandinavia" | "klasik_modern" | "industrial";

export interface FacadeSpec {
  style: FacadeStyle;
  cantilever: number;
  splitLevel: boolean;
  roofType: RoofType;
  roofPitch: number;
  overhang: number;
  canopy: boolean;
  windows: "standar" | "panjang" | "kaca_mati";
  louvre: boolean;
  columns: number;
  secondarySkin: boolean;
  balcony: boolean;
  carport: "tidak" | "terbuka" | "tertutup";
  fence: boolean;
  accentWall: boolean;
  planter: boolean;
  frontStairs: boolean;
  palette: string;
}

/* ---------- RAP / margin / planner harga ---------- */

export interface RapBreakdown {
  direct: number;
  indirect: number;
  contingency: number;
  rap: number;
  sellingPrice: number;
  ppn: number;
  margin: number;
  marginPercent: number;
  overhead: number;
  profit: number;
  total: number;
  ppnEnabled: boolean;
}

export interface PricingTargets {
  sellingPrice: number | null;
  margin: number | null;
  rap: number | null;
  locked: "sellingPrice" | "margin" | "rap" | null;
  ppnEnabled: boolean;
}

export interface OptimizerStep {
  group: SpecGroupKey;
  label: string;
  from: SpecLevel;
  to: SpecLevel;
  saving: number;
  impact: "rendah" | "sedang" | "tinggi";
  reason: string;
}

export interface ScopeReduction {
  key: "carport" | "canopy" | "balcony" | "secondarySkin" | "area";
  label: string;
  saving: number;
  note: string;
}

export interface OptimizerResult {
  feasible: boolean;
  reachedTarget: boolean;
  steps: OptimizerStep[];
  spec: SpecState;
  rap: number;
  sellingPrice: number;
  margin: number;
  shortfall: number;
  safeFloorRap: number;
  scopeOptions: ScopeReduction[];
  notes: string[];
  elapsedMs: number;
}

export interface EfficiencyRow {
  group: SpecGroupKey;
  label: string;
  currentCost: number;
  maxSaving: number;
  impact: "rendah" | "sedang" | "tinggi";
  portion: number;
  blockedReason?: string;
}

export interface PricingScenario {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  spec: SpecState;
  scope: { carport: boolean; canopy: boolean; balcony: boolean; secondarySkin: boolean };
  rap: number;
  sellingPrice: number;
  total?: number;
  ppn?: number;
  margin: number;
  marginPercent: number;
}

export interface StructureRule {
  key: string;
  label: string;
  minSpecLevel: SpecLevel;
  appliesWhen?: { floors?: number; soil?: Soil; roofHeavy?: boolean };
  note: string;
}

export interface AhspDataset {
  id: string;
  name: string;
  year: number | null;
  region: string;
  effectiveDate: string;
  source: string;
  analysisCount: number;
  verifiedPercent: number;
  importedAt: string;
  sample: boolean;
}
