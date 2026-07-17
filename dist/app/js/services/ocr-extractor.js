/**
 * @file js/services/ocr-extractor.js
 * @description Client-side OCR via Tesseract.js — zero API cost.
 *
 * All image processing happens in the browser:
 *  - Canvas resize & greyscale before OCR (speeds Tesseract up ~2×)
 *  - SHA-256 hash for deduplication (hash only, image never leaves device)
 *  - Spatial layout analysis for template matching
 *
 * @module services/ocr-extractor
 */

const MAX_IMAGE_DIM = 1920;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_LANGUAGE = 'ind+eng';

// ---------------------------------------------------------------------------
// Injectable hook for tests (avoids Tesseract import in Deno)
// ---------------------------------------------------------------------------
/** @type {((lang: string, opts?: object) => Promise<object>)|null} */
let _tesseractLoader = null;

/**
 * Overrides the Tesseract worker factory — for unit tests.
 * @param {((lang: string|string[]) => Promise<object>)|null} loader
 */
export function _setTesseractLoader(loader) {
  _tesseractLoader = loader;
}

// ---------------------------------------------------------------------------
// SHA-256 image hash
// ---------------------------------------------------------------------------

/**
 * Returns the SHA-256 hex digest of an image file.
 * Used for deduplication — the actual image is never stored remotely.
 *
 * @param {File|Blob} imageFile
 * @returns {Promise<string>} hex string
 *
 * @example
 * const hash = await hashImage(file);
 * // "a3f2b1..."
 */
export async function hashImage(imageFile) {
  try {
    const buf = await imageFile.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (err) {
    console.error('[ocr-extractor] hashImage failed:', err);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Image preprocessing (canvas-based, browser only)
// ---------------------------------------------------------------------------

/**
 * Resizes and converts an image to greyscale for better Tesseract accuracy.
 * Returns the original file unchanged in non-browser environments (tests/SSR).
 *
 * @param {File|Blob} imageFile
 * @returns {Promise<Blob>}
 */
export async function preprocessImage(imageFile) {
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    return imageFile;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      try {
        let { naturalWidth: w, naturalHeight: h } = img;

        if (w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) {
          const ratio = Math.min(MAX_IMAGE_DIM / w, MAX_IMAGE_DIM / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imageFile);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);

        // Greyscale via desaturation
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const grey = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = grey;
        }
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ?? imageFile);
        }, 'image/png');
      } catch (err) {
        console.error('[ocr-extractor] preprocessImage failed:', err);
        URL.revokeObjectURL(url);
        resolve(imageFile);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(imageFile);
    };

    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Layout feature extraction
// ---------------------------------------------------------------------------

/**
 * Derives spatial layout features from Tesseract word objects.
 * These features drive template signature generation — same merchant → same signature.
 *
 * @param {Array<{text: string, bbox: {x0: number, y0: number, x1: number, y1: number}, confidence: number}>} words
 * @param {{ width?: number, height?: number }} [imageDims]
 * @returns {{
 *   line_count: number,
 *   header_lines: string[],
 *   merchant_position: 'top'|'center'|'unknown',
 *   total_position: 'bottom'|'center'|'unknown',
 *   date_format: string|null,
 *   has_items_section: boolean,
 *   word_density: number
 * }}
 */
export function extractLayoutFeatures(words, imageDims = {}) {
  if (!Array.isArray(words) || !words.length) {
    return {
      line_count: 0,
      header_lines: [],
      merchant_position: 'unknown',
      total_position: 'unknown',
      date_format: null,
      has_items_section: false,
      word_density: 0,
    };
  }

  const imageHeight = imageDims.height || 1000;

  // Group words into lines by y0 proximity (within 12px = same line)
  const lines = [];
  for (const w of words.filter((w) => w.text.trim())) {
    const y = w.bbox?.y0 ?? 0;
    const existing = lines.find((l) => Math.abs(l.y - y) < 12);
    if (existing) {
      existing.words.push(w);
    } else {
      lines.push({ y, words: [w] });
    }
  }
  lines.sort((a, b) => a.y - b.y);

  const lineTexts = lines.map((l) =>
    l.words
      .sort((a, b) => (a.bbox?.x0 ?? 0) - (b.bbox?.x0 ?? 0))
      .map((w) => w.text)
      .join(' ')
      .trim(),
  );

  const header_lines = lineTexts.slice(0, Math.min(3, lineTexts.length));

  // Detect date format in the raw lines
  const datePatterns = [
    { re: /\b\d{2}\/\d{2}\/\d{4}\b/, format: 'DD/MM/YYYY' },
    { re: /\b\d{2}-\d{2}-\d{4}\b/, format: 'DD-MM-YYYY' },
    { re: /\b\d{4}-\d{2}-\d{2}\b/, format: 'YYYY-MM-DD' },
    { re: /\b\d{1,2}\s+\w+\s+\d{4}\b/i, format: 'D MMMM YYYY' },
  ];

  let date_format = null;
  for (const line of lineTexts) {
    for (const { re, format } of datePatterns) {
      if (re.test(line)) {
        date_format = format;
        break;
      }
    }
    if (date_format) break;
  }

  // Detect TOTAL / amount row position
  const totalIdx = lineTexts.findIndex((l) =>
    /\b(total|jumlah|grand total|bayar|tunai|kembalian)\b/i.test(l),
  );
  const total_position =
    totalIdx < 0
      ? 'unknown'
      : totalIdx / lines.length > 0.6
        ? 'bottom'
        : 'center';

  // Detect itemised section (numbered list or repeated price patterns)
  const has_items_section =
    lineTexts.filter((l) => /\d[\d,.]+(,\d{3})*/.test(l)).length > 3;

  // Merchant: typically in the top 20% of the receipt
  const merchant_position =
    lineTexts.length > 0
      ? lines[0].y / imageHeight < 0.2
        ? 'top'
        : 'center'
      : 'unknown';

  return {
    line_count: lines.length,
    header_lines,
    merchant_position,
    total_position,
    date_format,
    has_items_section,
    word_density: words.length / Math.max(lines.length, 1),
  };
}

// ---------------------------------------------------------------------------
// Main OCR extraction
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} OCRResult
 * @property {string} text - Full extracted text
 * @property {number} confidence - Tesseract confidence 0–100
 * @property {Array<Object>} words - Word objects with bbox + confidence
 * @property {Object} layout - Extracted layout features
 * @property {number} latency_ms - OCR wall-clock time
 */

/**
 * Extracts text from a receipt image using Tesseract.js (client-side, offline).
 *
 * @param {File|Blob|string} imageInput - File, Blob, or URL/base64 string
 * @param {{
 *   language?: string,
 *   logger?: (m: object) => void,
 *   timeout?: number,
 *   imageDims?: { width?: number, height?: number }
 * }} [options]
 * @returns {Promise<OCRResult>}
 *
 * @example
 * const result = await extractTextFromImage(file, {
 *   logger: (m) => setProgress(m.progress),
 * });
 * console.log(result.text, result.confidence);
 */
export async function extractTextFromImage(imageInput, options = {}) {
  const {
    language = DEFAULT_LANGUAGE,
    logger = null,
    timeout = DEFAULT_TIMEOUT_MS,
    imageDims = {},
  } = options;

  const t0 = Date.now();

  /** @returns {OCRResult} */
  const failResult = () => ({
    text: '',
    confidence: 0,
    words: [],
    layout: extractLayoutFeatures([]),
    latency_ms: Date.now() - t0,
  });

  try {
    // Preprocess if it's a File/Blob
    let processedInput = imageInput;
    if (imageInput instanceof Blob) {
      processedInput = await preprocessImage(imageInput);
    }

    // Load Tesseract worker (injected in tests, CDN global in browser, npm import fallback)
    let worker;
    if (_tesseractLoader) {
      worker = await _tesseractLoader(language);
    } else if (typeof window !== 'undefined' && window.Tesseract?.createWorker) {
      const langs = language.split('+');
      worker = await window.Tesseract.createWorker(langs, 1, {
        logger: logger ?? (() => {}),
        errorHandler: (e) => console.error('[ocr] worker error:', e),
      });
    } else {
      // Fallback: dynamic import (dev with bundler / npm)
      const Tesseract = await import('tesseract.js');
      const langs = language.split('+');

      worker = await Tesseract.createWorker(langs, 1, {
        logger: logger ?? (() => {}),
        errorHandler: (e) => console.error('[ocr] worker error:', e),
      });
    }

    // Wrap in timeout
    const ocrPromise = worker.recognize(processedInput);

    const { data } = await Promise.race([
      ocrPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), timeout),
      ),
    ]);

    await worker.terminate?.();

    const words = data.words ?? [];
    const layout = extractLayoutFeatures(words, imageDims);

    return {
      text: data.text ?? '',
      confidence: data.confidence ?? 0,
      words,
      layout,
      latency_ms: Date.now() - t0,
    };
  } catch (err) {
    // Language model unavailable → retry with 'eng' only
    if (language !== 'eng') {
      console.warn(`[ocr-extractor] ${language} failed, retrying with eng:`, err.message);
      return extractTextFromImage(imageInput, { ...options, language: 'eng' });
    }
    console.error('[ocr-extractor] extractTextFromImage failed:', err);
    return failResult();
  }
}
