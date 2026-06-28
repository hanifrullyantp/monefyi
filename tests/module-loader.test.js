/**
 * @file tests/module-loader.test.js
 * Run: npx deno test --allow-all tests/module-loader.test.js
 */

import {
  getBasePath,
  resolvePath,
  resetBaseCache,
} from '../app/js/utils/module-loader.js';
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

Deno.test('module-loader: returns empty base in non-window env', () => {
  resetBaseCache();
  const base = getBasePath();
  assertEquals(base, '');
});

Deno.test('module-loader: detects /app/ base in production', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/app/' } };
  const base = getBasePath();
  assertEquals(base, '/app');
  delete globalThis.window;
  resetBaseCache();
});

Deno.test('module-loader: detects /app/anything as /app base', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/app/transactions' } };
  const base = getBasePath();
  assertEquals(base, '/app');
  delete globalThis.window;
  resetBaseCache();
});

Deno.test('module-loader: detects root for local dev', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/' } };
  const base = getBasePath();
  assertEquals(base, '');
  delete globalThis.window;
  resetBaseCache();
});

Deno.test('module-loader: detects root for /index.html', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/index.html' } };
  const base = getBasePath();
  assertEquals(base, '');
  delete globalThis.window;
  resetBaseCache();
});

Deno.test('module-loader: resolvePath strips leading slash', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/app/' } };
  const path = resolvePath('/js/parsers/normalize.js');
  assertEquals(path, '/app/js/parsers/normalize.js');
  delete globalThis.window;
  resetBaseCache();
});

Deno.test('module-loader: resolvePath strips leading ./', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/app/' } };
  const path = resolvePath('./js/services/metrics.js');
  assertEquals(path, '/app/js/services/metrics.js');
  delete globalThis.window;
  resetBaseCache();
});

Deno.test('module-loader: resolvePath without prefix', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/app/' } };
  const path = resolvePath('js/components/quick-preview.js');
  assertEquals(path, '/app/js/components/quick-preview.js');
  delete globalThis.window;
  resetBaseCache();
});

Deno.test('module-loader: resolvePath for local dev', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/' } };
  const path = resolvePath('js/parsers/normalize.js');
  assertEquals(path, '/js/parsers/normalize.js');
  delete globalThis.window;
  resetBaseCache();
});

Deno.test('module-loader: caches base path after first call', () => {
  resetBaseCache();
  globalThis.window = { location: { pathname: '/app/' } };
  const first = getBasePath();

  globalThis.window = { location: { pathname: '/different' } };
  const second = getBasePath();

  assertEquals(first, second);
  delete globalThis.window;
  resetBaseCache();
});
