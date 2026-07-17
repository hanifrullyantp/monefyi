/**
 * Base-path aware module loader.
 *
 * Handles both local dev and production deployments:
 * - Local dev: http://127.0.0.1:5500/      → base = ''
 * - Production: https://www.monefyi.com/app/ → base = '/app'
 *
 * Dynamic import() from classic scripts resolves against the document base URL
 * (e.g. /app/), NOT the script file URL (/app/js/app.js). Use loadModule()
 * instead of bare relative import('./parsers/...') to get correct paths.
 *
 * @module utils/module-loader
 */

/** @type {string|null} */
let _cachedBase = null;

/**
 * Detect base path from current URL.
 * @returns {string} Base path like '' or '/app'
 */
export function getBasePath() {
  if (_cachedBase !== null) return _cachedBase;

  if (typeof window === 'undefined') {
    _cachedBase = '';
    return _cachedBase;
  }

  const pathname = window.location.pathname;

  if (pathname === '/app' || pathname.startsWith('/app/')) {
    _cachedBase = '/app';
  } else {
    _cachedBase = '';
  }

  return _cachedBase;
}

/**
 * Resolve a relative module path to an absolute path.
 *
 * @param {string} relativePath - e.g. 'js/parsers/normalize.js' or '/js/...'
 * @returns {string} Resolved path
 *
 * @example
 * // Production (/app/):
 * resolvePath('js/parsers/normalize.js')
 * // → '/app/js/parsers/normalize.js'
 *
 * // Local dev (/):
 * resolvePath('js/parsers/normalize.js')
 * // → '/js/parsers/normalize.js'
 */
export function resolvePath(relativePath) {
  const clean = relativePath.replace(/^(\.?\/)+/, '');
  const base = getBasePath();
  return `${base}/${clean}`;
}

/**
 * Dynamic import with auto base-path resolution.
 * Drop-in replacement for `import()` from classic scripts.
 *
 * @param {string} relativePath
 * @returns {Promise<Module>}
 *
 * @example
 * const { normalizeInput } = await loadModule('js/parsers/normalize.js');
 */
export function loadModule(relativePath) {
  const fullPath = resolvePath(relativePath);
  return import(fullPath);
}

/**
 * Reset cached base path (for testing).
 */
export function resetBaseCache() {
  _cachedBase = null;
}

if (typeof window !== 'undefined') {
  window.monefyiLoader = {
    getBasePath,
    resolvePath,
    loadModule,
    resetBaseCache,
  };
}
