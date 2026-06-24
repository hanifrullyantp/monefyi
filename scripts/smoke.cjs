#!/usr/bin/env node

const { execSync, spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

function hasDocker() {
  try {
    execSync("docker info", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function assertContains(filePath, needle) {
  const content = readFileSync(filePath, "utf8");
  if (!content.includes(needle)) {
    throw new Error(`[smoke] Missing "${needle}" in ${filePath}`);
  }
}

function main() {
  const root = process.cwd();
  const supabaseDir = `${root}/my-supabase-project`;

  console.log("\n[smoke] 1/4 Build frontend");
  run("npm run build", root);

  console.log("\n[smoke] 2/4 Static guard checks");
  assertContains(
    `${supabaseDir}/supabase/functions/ai-user-coach/index.ts`,
    "APP_CORS_ORIGIN",
  );
  assertContains(
    `${supabaseDir}/supabase/functions/asfin-parse-transaction/index.ts`,
    "APP_CORS_ORIGIN",
  );
  assertContains(
    `${supabaseDir}/supabase/functions/asfin-parse-transaction/index.ts`,
    "mode === \"text\"",
  );
  assertContains(
    `${supabaseDir}/supabase/functions/asfin-parse-transaction/index.ts`,
    "parse_session_id",
  );
  assertContains(
    `${supabaseDir}/supabase/functions/lynk-webhook/index.ts`,
    "APP_CORS_ORIGIN",
  );
  assertContains(
    `${supabaseDir}/supabase/functions/monefyi-landing-config/index.ts`,
    "assertAdminFromBearer",
  );
  assertContains(
    `${supabaseDir}/supabase/functions/monefyi-admin-app-config/index.ts`,
    "ALLOWED_KEYS",
  );
  assertContains(
    `${supabaseDir}/supabase/functions/monefyi-upload-logo/index.ts`,
    "APP_CORS_ORIGIN",
  );
  assertContains(
    `${supabaseDir}/supabase/config.toml`,
    "[functions.lynk-webhook]",
  );
  assertContains(
    `${supabaseDir}/supabase/config.toml`,
    "[functions.monefyi-landing-config]",
  );
  assertContains(
    `${supabaseDir}/supabase/config.toml`,
    "[functions.lynk-webhook]\nenabled = true\nverify_jwt = false",
  );
  assertContains(
    `${supabaseDir}/supabase/config.toml`,
    "[functions.monefyi-landing-config]\nenabled = true\nverify_jwt = false",
  );
  assertContains(
    `${root}/app/js/app.js`,
    "functions/v1/monefyi-admin-users",
  );
  assertContains(
    `${root}/app/js/app.js`,
    "functions/v1/ai-quota-status",
  );
  assertContains(
    `${root}/app/js/app.js`,
    "mode: 'batch'",
  );

  console.log("[smoke] Static guards OK.");

  console.log("\n[smoke] 3/4 Check Docker daemon");
  if (!hasDocker()) {
    console.log("[smoke] Docker daemon belum aktif, skip runtime edge-function smoke.");
    console.log("[smoke] Jalankan ulang setelah Docker aktif: npm run smoke");
    process.exit(0);
  }

  console.log("\n[smoke] 4/4 Basic edge-function serve check");
  const check = spawnSync(
    "npx",
    ["supabase", "functions", "serve", "ai-user-coach", "--no-verify-jwt"],
    { cwd: supabaseDir, stdio: "pipe", timeout: 10000 },
  );

  // timeout is expected because serve is long-running; treat timeout as success startup
  if (check.error && check.error.code === "ETIMEDOUT") {
    console.log("[smoke] Edge-function server startup OK (timed out intentionally).");
    process.exit(0);
  }
  if (check.status !== 0) {
    const err = String(check.stderr || check.stdout || "").slice(0, 500);
    console.log("[smoke] Edge-function serve failed:", err);
    console.log("[smoke] Edge-function serve gagal. Periksa env Supabase lokal.");
    process.exit(1);
  }
  console.log("[smoke] Edge-function server exited normally.");
}

main();
