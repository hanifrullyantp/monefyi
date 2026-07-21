/**
 * Hardened Web Speech + MediaRecorder server STT fallback.
 * @module services/voice-input
 */

import { expandSpokenAmounts } from '../parsers/normalize.js';

/** @type {'text'|'voice'} */
let _lastInputChannel = 'text';

const CONFIDENCE_OK = 0.72;
const FN_VOICE = (typeof window !== 'undefined' && window.MONEFYI_CONFIG?.fnVoiceTranscribe)
  || 'monefyi-voice-transcribe';

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
  return !!(
    window.SpeechRecognition
    || window.webkitSpeechRecognition
    || (navigator.mediaDevices?.getUserMedia && window.MediaRecorder)
  );
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
 * @param {string} transcript
 * @returns {string}
 */
export function hygieneVoiceTranscript(transcript) {
  let text = String(transcript || '').trim();
  if (!text) return '';

  const replacements = [
    [/\bgo\s*pay\b/gi, 'gopay'],
    [/\bgope\b/gi, 'gopay'],
    [/\bgopai\b/gi, 'gopay'],
    [/\bgojek\b/gi, 'gojek'],
    [/\bgo jek\b/gi, 'gojek'],
    [/\bshoppe?\s*pay\b/gi, 'shopeepay'],
    [/\bsea\s*bank\b/gi, 'seabank'],
    [/\blink\s*aja\b/gi, 'linkaja'],
  ];
  for (const [re, to] of replacements) {
    text = text.replace(re, to);
  }

  text = expandSpokenAmounts(text);
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} cleaned
 * @param {number} confidence
 * @returns {boolean}
 */
export function isTranscriptGoodEnough(cleaned, confidence) {
  if (!cleaned || cleaned.length < 3) return false;
  if (confidence < CONFIDENCE_OK) return false;
  if (!/\d{3,}/.test(cleaned) && !/\b\d+\s*(rb|ribu|jt|juta|k)\b/i.test(cleaned)) {
    return false;
  }
  return true;
}

/**
 * @returns {{ url: string, token: string }|null}
 */
function getAuthForEdge() {
  try {
    const cfg = window.MONEFYI_CONFIG || {};
    const url = String(cfg.supabaseUrl || '').replace(/\/+$/, '');
    const token = window.STATE?.db?.session?.access_token || '';
    if (!url || !token) return null;
    return { url, token };
  } catch {
    return null;
  }
}

/**
 * @param {Blob} blob
 * @returns {Promise<{ transcript: string, engine: string }|null>}
 */
export async function transcribeAudioServer(blob) {
  const auth = getAuthForEdge();
  if (!auth || !blob || blob.size < 64) return null;

  const form = new FormData();
  const ext = (blob.type || '').includes('mp4') ? 'm4a'
    : (blob.type || '').includes('ogg') ? 'ogg'
      : 'webm';
  form.append('audio', blob, `voice.${ext}`);
  form.append('language', document.documentElement.lang === 'en' ? 'en' : 'id');

  const res = await fetch(`${auth.url}/functions/v1/${FN_VOICE}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    console.warn('[voice] server STT failed', res.status, msg);
    return null;
  }

  const data = await res.json().catch(() => null);
  const transcript = String(data?.transcript || '').trim();
  if (!transcript) return null;
  return { transcript, engine: String(data?.engine || 'server') };
}

/**
 * @returns {string|null}
 */
function pickRecorderMime() {
  if (!window.MediaRecorder) return null;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return '';
}

/**
 * @returns {Promise<{ stop: () => Promise<Blob|null>, discard: () => void }|null>}
 */
async function startAudioCapture() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return null;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    const mime = pickRecorderMime();
    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    /** @type {BlobPart[]} */
    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(250);

    const stopTracks = () => {
      stream.getTracks().forEach((t) => t.stop());
    };

    return {
      discard: () => {
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch { /* ignore */ }
        stopTracks();
        chunks.length = 0;
      },
      stop: () => new Promise((resolve) => {
        const finish = () => {
          stopTracks();
          if (!chunks.length) {
            resolve(null);
            return;
          }
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        };
        if (recorder.state === 'inactive') {
          finish();
          return;
        }
        recorder.onstop = finish;
        try { recorder.stop(); } catch { finish(); }
      }),
    };
  } catch (e) {
    console.warn('[voice] getUserMedia failed', e);
    toast(errorMessage('not-allowed') || 'Mikrofon ditolak', 'warn');
    return null;
  }
}

/**
 * @param {HTMLInputElement|HTMLTextAreaElement} inputEl
 * @param {HTMLElement} btnEl
 * @param {object} [options]
 * @returns {{ stop: () => void }|null}
 */
export function initVoiceInput(inputEl, btnEl, options = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canRecord = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

  if ((!SR && !canRecord) || !inputEl || !btnEl) {
    btnEl?.classList.add('hidden');
    return null;
  }

  if (btnEl.dataset.voiceWired === '1') {
    return { stop: () => {} };
  }
  btnEl.dataset.voiceWired = '1';
  btnEl.classList.remove('hidden');

  let listening = false;
  let finalizing = false;
  /** @type {string} */
  let baseValue = '';
  /** @type {{ stop: () => Promise<Blob|null>, discard: () => void }|null} */
  let capture = null;
  /** @type {SpeechRecognition|null} */
  let rec = null;
  /** @type {{ text: string, confidence: number }|null} */
  let lastBrowser = null;
  let srFailed = false;
  let acceptedBrowser = false;

  const setListening = (on) => {
    listening = on;
    btnEl.classList.toggle('voice-active', on);
    btnEl.setAttribute('aria-pressed', on ? 'true' : 'false');
  };

  const setBusy = (on) => {
    btnEl.classList.toggle('voice-busy', on);
    btnEl.disabled = !!on;
  };

  const applyTranscript = (raw, meta = {}) => {
    const cleaned = hygieneVoiceTranscript(raw);
    if (!cleaned) return '';
    const joined = baseValue ? `${baseValue} ${cleaned}` : cleaned;
    inputEl.value = joined;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    setLastInputChannel('voice');
    try {
      console.log('[voice] transcript', { ...meta, raw, cleaned });
    } catch { /* ignore */ }
    if (typeof options.onFinal === 'function') options.onFinal();
    if (options.autoParse && typeof options.onParse === 'function') {
      options.onParse(cleaned);
    }
    return cleaned;
  };

  async function finalizeSession() {
    if (finalizing) return;
    finalizing = true;
    setListening(false);

    const cleanedBrowser = lastBrowser
      ? hygieneVoiceTranscript(lastBrowser.text)
      : '';
    const browserOk = !!lastBrowser
      && isTranscriptGoodEnough(cleanedBrowser, lastBrowser.confidence)
      && !srFailed;

    if (browserOk || acceptedBrowser) {
      if (!acceptedBrowser && lastBrowser) {
        applyTranscript(lastBrowser.text, {
          engine: 'browser',
          confidence: lastBrowser.confidence,
        });
      }
      try { capture?.discard(); } catch { /* ignore */ }
      capture = null;
      finalizing = false;
      setBusy(false);
      return;
    }

    setBusy(true);
    let blob = null;
    try {
      blob = capture ? await capture.stop() : null;
    } catch {
      blob = null;
    }
    capture = null;

    if (blob && blob.size > 200) {
      toast('Memproses suara dengan AI…', 'info');
      try {
        const server = await transcribeAudioServer(blob);
        if (server?.transcript) {
          applyTranscript(server.transcript, { engine: server.engine, confidence: 0.9 });
          toast('Suara diproses dengan AI', 'success');
          setBusy(false);
          finalizing = false;
          return;
        }
      } catch (e) {
        console.warn('[voice] server fallback error', e);
      }
    }

    if (lastBrowser?.text) {
      applyTranscript(lastBrowser.text, {
        engine: 'browser_low_confidence',
        confidence: lastBrowser.confidence,
      });
      toast('Hasil suara kurang yakin — cek teks sebelum kirim', 'warn');
    } else {
      toast('Tidak ada hasil suara. Coba lagi.', 'warn');
    }
    setBusy(false);
    finalizing = false;
  }

  if (SR) {
    rec = new SR();
    rec.lang = document.documentElement.lang === 'en' ? 'en-US' : 'id-ID';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = false;

    rec.onresult = (ev) => {
      const { text, confidence } = pickBestTranscript(ev);
      if (!text) return;
      lastBrowser = { text, confidence };
      const isFinal = ev.results?.[ev.results.length - 1]?.isFinal;
      if (!isFinal) {
        inputEl.value = baseValue ? `${baseValue} ${text}` : text;
        return;
      }
      const cleaned = hygieneVoiceTranscript(text);
      if (isTranscriptGoodEnough(cleaned, confidence)) {
        acceptedBrowser = true;
        applyTranscript(text, { engine: 'browser', confidence });
      } else {
        // Show interim hygiene while waiting for possible server STT
        inputEl.value = baseValue ? `${baseValue} ${cleaned || text}` : (cleaned || text);
      }
    };

    rec.onerror = (ev) => {
      srFailed = true;
      const code = ev?.error || '';
      if (code === 'aborted') return;
      const msg = errorMessage(code);
      if (msg && !canRecord) toast(msg, 'warn');
    };

    rec.onend = () => {
      if (!listening && !finalizing) return;
      // Auto-finish after utterance (or after stop())
      finalizeSession();
    };
  }

  const stop = () => {
    try { rec?.stop(); } catch { /* ignore */ }
    if (!rec) finalizeSession();
  };

  btnEl.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btnEl.disabled) return;

    if (listening || finalizing) {
      try { rec?.stop(); } catch { /* ignore */ }
      if (!rec) await finalizeSession();
      return;
    }

    baseValue = String(inputEl.value || '').trim();
    lastBrowser = null;
    srFailed = false;
    acceptedBrowser = false;
    finalizing = false;
    setLastInputChannel('voice');

    capture = canRecord ? await startAudioCapture() : null;
    if (!capture && !rec) {
      toast('Mikrofon tidak tersedia di perangkat ini', 'warn');
      return;
    }

    setListening(true);
    if (rec) {
      try {
        rec.start();
      } catch (err) {
        console.warn('[voice] SR start failed', err);
        srFailed = true;
        if (!capture) {
          setListening(false);
          toast('Tidak bisa memulai voice. Coba lagi.', 'warn');
        }
      }
    } else {
      toast('Merekam… tap mic lagi untuk selesai', 'info');
    }
  });

  return { stop };
}

if (typeof window !== 'undefined') {
  window.monefyiVoice = {
    initVoiceInput,
    hygieneVoiceTranscript,
    isTranscriptGoodEnough,
    transcribeAudioServer,
    getLastInputChannel,
    setLastInputChannel,
    isVoiceSupported,
  };
}
