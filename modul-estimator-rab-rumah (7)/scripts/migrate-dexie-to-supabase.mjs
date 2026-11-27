import Dexie from "dexie";
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline";

const DB_NAME = "rab-rumah-estimator";
const STORE_NAME = "store";
const APP_STATE_KEY = "app-state";
const SUPABASE_TABLE = "rab_app_state";

class LocalDb extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(1).stores({ [STORE_NAME]: "key, updatedAt" });
  }
}

const db = new LocalDb();

function env(name, fallback = "") {
  return process.env[name] ?? fallback;
}

function supabaseClient() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
  if (!url) throw new Error("SUPABASE_URL / VITE_SUPABASE_URL belum diatur.");
  if (!serviceKey && !anonKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY atau VITE_SUPABASE_ANON_KEY belum diatur.");
  return createClient(url, serviceKey || anonKey);
}

async function readDexieState() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB tidak tersedia (jalankan skrip ini di lingkungan browser).");
  }
  const row = await db.store.get(APP_STATE_KEY);
  return row ? row.value : null;
}

async function confirmMigration(prompt) {
  const confirmEnv = env("MIGRATE_CONFIRM");
  if (confirmEnv === "yes" || confirmEnv === "1") return true;
  if (!process.stdin.isTTY) {
    throw new Error("Tidak ada TTY dan MIGRATE_CONFIRM tidak diatur. Tetapkan MIGRATE_CONFIRM=yes untuk melaksanakan migrasi non-interaktif.");
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) =>
    rl.question("PERINGATAN: Migrasi Dexie -> Supabase hanya boleh dijalankan sekali. Lanjutkan? (yes/no): ", resolve)
  );
  rl.close();
  return String(answer).trim().toLowerCase() === "yes";
}

async function migrate() {
  const state = await readDexieState();
  if (!state) {
    console.log("Tidak ada state Dexie (app-state) untuk dimigrasikan.");
    return;
  }

  const projectCount = Array.isArray(state.projects) ? state.projects.length : 0;
  const komponenCount = state.catalog && Array.isArray(state.catalog.komponen) ? state.catalog.komponen.length : 0;
  console.log(`Ditemukan state Dexie: ${projectCount} proyek, ${komponenCount} komponen katalog.`);

  if (!(await confirmMigration())) {
    console.log("Migrasi dibatalkan oleh pengguna.");
    return;
  }

  const sb = supabaseClient();
  const payload = {
    id: APP_STATE_KEY,
    state,
    updated_at: new Date().toISOString(),
    migrated_from_dexie: true,
    migrated_at: new Date().toISOString(),
  };

  const { error } = await sb.from(SUPABASE_TABLE).upsert(payload);
  if (error) throw error;

  console.log(`Migrasi selesai: state disimpan ke tabel Supabase "${SUPABASE_TABLE}" (id: ${APP_STATE_KEY}).`);
  console.log("Adaptor Supabase kini menjadi penyimpanan utama. Dexie dipertahankan sebagai cache offline.");
}

migrate().catch((err) => {
  console.error("Migrasi gagal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
