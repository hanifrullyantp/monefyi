/**
 * Hardened Web Speech voice input for transaction entry.
 * @module services/voice-input
 */

import { expandSpokenAmounts } from '../parsers/normalize.js';

/** @type {'text'|'voice'} */
let _lastInputChannel = 'text';

/**
 * @returns {'text'|'voice'}
 */
export function getLastInputChannel() {
  return _lastInputChannel;
}

/**
 * @param {'text'|'voice'} channel
 */
export function setLastInputChannel(channel) {
  _lastInputChannel = channel === 'voice' ? 'voice' : 'text';
}

/**
 * @returns {boolean}
 */
export function isVoiceSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * @param {string} code
 * @returns {string}
 */
function errorMessage(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Izinkan akses mikrofon di browser untuk voice input';
    case 'no-speech':
      return 'Tidak terdengar suara. Coba bicara lagi';
    case 'audio-capture':
      return 'Mikrofon tidak tersedia';
    case 'network':
      return 'Voice butuh koneksi. Cek jaringan lalu coba lagi';
    case 'aborted':
      return '';
    default:
      return code ? `Voice error: ${code}` : 'Voice input gagal';
  }
}

/**
 * @param {string} message
 * @param {string} [kind]
 */
function toast(message, kind = 'warn') {
  if (!message) return;
  try {
    if (typeof window.MonefyiUI?.showToast === 'function') {
      window.MonefyiUI.showToast(message, kind);
      return;
    }
  } catch { /* ignore */ }
  try {
    if (typeof window.showToast === 'function') window.showToast(message, kind);
  } catch { /* ignore */ }
}

/**
 * Pick best transcript from SpeechRecognition results.
 * @param {SpeechRecognitionEvent} ev
 * @returns {{ text: string, confidence: number }}
 */
function pickBestTranscript(ev) {
  const result = ev.results?.[ev.results.length - 1];
  if (!result) return { text: '', confidence: 0 };

  let best = { text: '', confidence: -1 };
  const n = result.length || 0;
  for (let i = 0; i < n; i++) {
    const alt = result[i];
    const conf = typeof alt.confidence === 'number' ? alt.confidence : 0.5;
    const text = String(alt.transcript || '').trim();
    if (text && conf >= best.confidence) {
      best = { text, confidence: conf };
    }
  }
  if (!best.text && result[0]) {
    best = {
      text: String(result[0].transcript || '').trim(),
      confidence: typeof result[0].confidence === 'number' ? result[0].confidence : 0.5,
    };
  }
  return best;
}

/**
 * Clean STT transcript for Indonesian money slang.
 * @param {string} transcript
 * @returns {string}
 */
export function hygieneVoiceTranscript(transcript) {
  let text = String(transcript || '').trim();
  if (!text) return '';

  // Common STT mangling for wallets / banks / verbs
  const replacements = [
    [/\bgo\s*pay\b/gi, 'gopay'],
    [/\bgope\b/gi, 'gopay'],
    [/\bgopai\b/gi, 'gopay'],
    [/\bgojek\b/gi, 'gojek'],
    [/\bgo jek\b/gi, 'gojek'],
    [/\bshoppe?\s*pay\b/gi, 'shopeepay'],
    [/\bsea\s*bank\b/gi, 'seabank'],
    [/\blink\s*aja\b/gi, 'linkaja'],
    [/\bbeli\b/gi, 'beli'],
    [/\bmakan\b/gi, 'makan'],
  ];
  for (const [re, to] of replacements) {
    text = text.replace(re, to);
  }

  text = expandSpokenAmounts(text);
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Attach voice recognition to an input + mic button.
 * @param {HTMLInputElement|HTMLTextAreaElement} inputEl
 * @param {HTMLElement} btnEl
 * @param {object} [options]
 * @param {boolean} [options.autoParse]
 * @param {() => void} [options.onFinal]
 * @returns {{ stop: () => void }|null}
 */
export function initVoiceInput(inputEl, btnEl, options = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || !inputEl || !btnEl) {
    btnEl?.classList.add('hidden');
    return null;
  }

  if (btnEl.dataset.voiceWired === '1') {
    return { stop: () => {} };
  }
  btnEl.dataset.voiceWired = '1';
  btnEl.classList.remove('hidden');

  const rec = new SR();
  const lang = document.documentElement.lang === 'en' ? 'en-US' : 'id-ID';
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.continuous = false;

  let listening = false;
  /** @type {string} */
  let baseValue = '';

  const setListening = (on) => {
    listening = on;
    btnEl.classList.toggle('voice-active', on);
    btnEl.setAttribute('aria-pressed', on ? 'true' : 'false');
  };

  const stop = () => {
    try { rec.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  btnEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (listening) {
      stop();
      return;
    }
    baseValue = String(inputEl.value || '').trim();
    try {
      rec.start();
      setListening(true);
      setLastInputChannel('voice');
    } catch (err) {
      setListening(false);
      toast('Tidak bisa memulai voice. Coba lagi.', 'warn');
      console.warn('[voice] start failed', err);
    }
  });

  rec.onresult = (ev) => {
    const { text, confidence } = pickBestTranscript(ev);
    if (!text) return;

    const isFinal = ev.results?.[ev.results.length - 1]?.isFinal;
    const cleaned = isFinal ? hygieneVoiceTranscript(text) : text;
    const joined = baseValue ? `${baseValue} ${cleaned}` : cleaned;
    inputEl.value = joined;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    setLastInputChannel('voice');

    if (isFinal) {
      try {
        console.log('[voice] transcript', { confidence, raw: text, cleaned });
      } catch { /* ignore */ }
      if (typeof options.onFinal === 'function') options.onFinal();
      if (options.autoParse && typeof options.onParse === 'function') {
        options.onParse(cleaned);
      }
    }
  };

  rec.onend = () => setListening(false);

  rec.onerror = (ev) => {
    setListening(false);
    const msg = errorMessage(ev?.error || '');
    if (msg) toast(msg, 'warn');
  };

  return { stop };
}

if (typeof window !== 'undefined') {
  window.monefyiVoice = {
    initVoiceInput,
    hygieneVoiceTranscript,
    getLastInputChannel,
    setLastInputChannel,
    isVoiceSupported,
  };
}
