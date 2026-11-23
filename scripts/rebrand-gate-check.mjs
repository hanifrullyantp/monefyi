#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const allowlistPath = path.join(rootDir, 'config', 'rebrand-allowlist.txt');
if (!fs.existsSync(allowlistPath)) {
  console.error(`ERROR: Allowlist file not found at ${allowlistPath}`);
  process.exit(1);
}

const allowlistLines = fs
  .readFileSync(allowlistPath, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith('#'));

const allowlistPatterns = allowlistLines.map((pattern) => {
  return new RegExp(pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
});

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name !== 'node_modules' &&
        entry.name !== 'dist' &&
        entry.name !== '.next' &&
        entry.name !== '.git' &&
        entry.name !== 'tmp_extract'
      ) {
        walk(full, fileList);
      }
    } else if (
      entry.name.endsWith('.ts') ||
      entry.name.endsWith('.tsx') ||
      entry.name.endsWith('.js') ||
      entry.name.endsWith('.mjs') ||
      entry.name.endsWith('.html') ||
      entry.name.endsWith('.webmanifest')
    ) {
      fileList.push(full);
    }
  }
  return fileList;
}

const targetDirs = [
  path.join(rootDir, 'apps', 'web', 'src'),
  path.join(rootDir, 'apps', 'landing', 'src'),
  path.join(rootDir, 'apps', 'web', 'public'),
  path.join(rootDir, 'apps', 'landing', 'public'),
];

const filesToScan = targetDirs.flatMap((d) => walk(d));
const rebrandRegex = /(monefyi|monefai|planner)/i;

let scannedCount = 0;
let allowedOccurrences = 0;
const violations = [];

for (const file of filesToScan) {
  scannedCount++;
  const relativeFile = path.relative(rootDir, file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (rebrandRegex.test(line)) {
      // Check if line is covered by any allowlisted pattern
      const isAllowed = allowlistPatterns.some((pattern) => pattern.test(line));
      if (isAllowed) {
        allowedOccurrences++;
      } else {
        violations.push({
          file: relativeFile,
          line: index + 1,
          text: line.trim(),
        });
      }
    }
  });
}

console.log('=== FROYEK REBRAND GATE CHECK ===');
console.log(`Files scanned: ${scannedCount}`);
console.log(`Allowlisted legacy occurrences: ${allowedOccurrences}`);
console.log(`Unapproved violations: ${violations.length}`);

if (violations.length > 0) {
  console.error('\nFAIL: Found unapproved legacy brand strings:');
  violations.forEach((v) => {
    console.error(`  ${v.file}:${v.line} -> ${v.text}`);
  });
  console.error(
    `\nTotal: ${violations.length} violation(s). If these are legitimate legacy identifiers, add them to config/rebrand-allowlist.txt.`
  );
  process.exit(1);
} else {
  console.log('\nPASS: All legacy brand strings match approved compatibility allowlist.');
  process.exit(0);
}

