import { useFrontDeskPreferencesStore } from '../stores/frontDeskPreferencesStore';

export type SoundId = 'ting' | 'success' | 'error' | 'click';

const SOUND_PATHS: Record<SoundId, string> = {
  ting: `${import.meta.env.BASE_URL}sounds/ting.mp3`,
  success: `${import.meta.env.BASE_URL}sounds/success.mp3`,
  error: `${import.meta.env.BASE_URL}sounds/error.mp3`,
  click: `${import.meta.env.BASE_URL}sounds/click.mp3`,
};

/** Web Audio fallback tones when MP3 unavailable */
const FALLBACK_TONES: Record<SoundId, { freq: number; duration: number; type: OscillatorType }> = {
  ting: { freq: 880, duration: 0.12, type: 'sine' },
  success: { freq: 660, duration: 0.18, type: 'triangle' },
  error: { freq: 220, duration: 0.25, type: 'square' },
  click: { freq: 520, duration: 0.05, type: 'sine' },
};

const audioCache = new Map<SoundId, HTMLAudioElement>();

function getVolume(): number {
  return useFrontDeskPreferencesStore.getState().soundVolume;
}

function isSoundEnabled(): boolean {
  return useFrontDeskPreferencesStore.getState().soundsEnabled;
}

function playWebAudioTone(id: SoundId): void {
  try {
    const ctx = new AudioContext();
    const tone = FALLBACK_TONES[id];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.freq;
    gain.gain.value = getVolume() * 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + tone.duration);
    osc.onended = () => void ctx.close();
  } catch {
    /* ignore — autoplay policy or unsupported */
  }
}

function playCachedAudio(id: SoundId): boolean {
  const cached = audioCache.get(id);
  if (!cached) return false;
  try {
    cached.volume = getVolume();
    cached.currentTime = 0;
    void cached.play();
    return true;
  } catch {
    return false;
  }
}

function preloadSound(id: SoundId): void {
  if (audioCache.has(id)) return;
  const audio = new Audio(SOUND_PATHS[id]);
  audio.preload = 'auto';
  audio.addEventListener('error', () => audioCache.delete(id));
  audioCache.set(id, audio);
}

/**
 * Putar efek suara front desk. Otomatis respect preferensi user.
 */
export function playSound(id: SoundId): void {
  if (!isSoundEnabled()) return;
  preloadSound(id);
  if (!playCachedAudio(id)) {
    playWebAudioTone(id);
  }
}

/** Preload semua suara saat app init (opsional) */
export function preloadAllSounds(): void {
  if (!isSoundEnabled()) return;
  (Object.keys(SOUND_PATHS) as SoundId[]).forEach(preloadSound);
}
