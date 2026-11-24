#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const FINANCE_PATTERNS = [
  /^apps\/web\/src\/services\/finance/,
  /^apps\/web\/src\/services\/(incomeService|costService)\.ts$/,
  /^apps\/web\/src\/lib\/financeV2/,
  /^packages\/domain\//,
  /^agent-core\//,
  /^my-supabase-project\/supabase\/migrations\/.*(finance|ledger|journal|f0_|f1_|f2_|cost|income|dividend|opex|investor|period_close|project_close).*\.sql$/i,
];

export const REQUIRED_CHANGELOG_PATH = 'docs/finance/CHANGELOG.md';

export function isFinanceFile(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return FINANCE_PATTERNS.some((re) => re.test(normalized));
}

export function evaluateDocsGate(changedFiles) {
  const normalized = [...new Set(
    (changedFiles || [])
      .map((f) => String(f || '').replace(/\\/g, '/').replace(/^\.\//, '').trim())
      .filter(Boolean),
  )];

  const touchedFinanceFiles = normalized.filter(isFinanceFile);
  const changelogUpdated = normalized.includes(REQUIRED_CHANGELOG_PATH);

  if (touchedFinanceFiles.length === 0) {
    return {
      ok: true,
      touchedFinanceFiles: [],
      changelogUpdated,
      reason: 'Tidak ada file keuangan yang berubah.',
    };
  }

  if (!changelogUpdated) {
    return {
      ok: false,
      touchedFinanceFiles,
      changelogUpdated: false,
      reason: `File keuangan berubah (${touchedFinanceFiles.join(', ')}), tetapi ${REQUIRED_CHANGELOG_PATH} belum ikut diperbarui di PR/commit ini.`,
    };
  }

  return {
    ok: true,
    touchedFinanceFiles,
    changelogUpdated: true,
    reason: `OK: ${touchedFinanceFiles.length} file keuangan berubah dan ${REQUIRED_CHANGELOG_PATH} ikut diperbarui.`,
  };
}

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

export function collectChangedFiles(args = process.argv.slice(2), env = process.env) {
  const filesIdx = args.indexOf('--files');
  if (filesIdx !== -1 && args[filesIdx + 1]) {
    return args[filesIdx + 1].split(',').map((s) => s.trim()).filter(Boolean);
  }

  const baseIdx = args.indexOf('--base');
  const explicitBase = baseIdx !== -1 ? args[baseIdx + 1] : '';
  const baseRef = explicitBase || env.DOCS_GATE_BASE_REF || (env.GITHUB_BASE_REF ? `origin/${env.GITHUB_BASE_REF}` : '');

  if (baseRef) {
    const diffOut = runGit(`git diff --name-only ${baseRef}...HEAD`);
    if (diffOut) return diffOut.split('\n').filter(Boolean);
  }

  // Cek perubahan lokal yang belum di-commit (staged + unstaged + untracked)
  const porcelain = runGit('git status --porcelain');
  if (porcelain) {
    const dirty = porcelain
      .split('\n')
      .map((line) => line.slice(3).trim())
      .map((entry) => (entry.includes(' -> ') ? entry.split(' -> ').pop().trim() : entry))
      .filter(Boolean);
    if (dirty.length > 0) return dirty;
  }

  // Jika working tree bersih dan berada di branch selain main, bandingkan dengan main
  const branch = runGit('git rev-parse --abbrev-ref HEAD');
  if (branch && branch !== 'main') {
    const branchDiff = runGit('git diff --name-only main...HEAD');
    if (branchDiff) return branchDiff.split('\n').filter(Boolean);
  }

  // Fallback terakhir: commit HEAD terbaru
  const headFiles = runGit('git diff-tree --no-commit-id --name-only -r HEAD');
  return headFiles ? headFiles.split('\n').filter(Boolean) : [];
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const changed = collectChangedFiles();
  const result = evaluateDocsGate(changed);
  console.log('=== FROYEK FINANCE DOCS-GATE CHECK ===');
  console.log(`Changed files inspected: ${changed.length}`);
  console.log(`Touched finance files: ${result.touchedFinanceFiles.length}`);
  console.log(`CHANGELOG updated: ${result.changelogUpdated}`);
  if (!result.ok) {
    console.error(`\nFAIL: ${result.reason}`);
    process.exit(1);
  }
  console.log(`\nPASS: ${result.reason}`);
}

