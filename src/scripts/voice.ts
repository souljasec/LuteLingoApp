// Device voices. Speech is synthesised by the phone/laptop itself, so the available voices differ
// per device; the student's choice is kept in this device's localStorage, not on the server.

import { brand } from '../brand/brand';

const KEY = `${brand.storagePrefix}.voice`;

export function savedVoiceURI(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return ''; // private mode / blocked storage: fall back to automatic
  }
}

export function saveVoiceURI(uri: string) {
  try {
    if (uri) localStorage.setItem(KEY, uri);
    else localStorage.removeItem(KEY);
  } catch {}
}

// Apple's novelty voices: fun, but useless for learning pronunciation.
const NOVELTY = new Set(['Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Good News', 'Jester', 'Organ', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox']);

/** English voices on this device, US first, offline before online. */
export function englishVoices(): SpeechSynthesisVoice[] {
  const vs = window.speechSynthesis?.getVoices() ?? [];
  return vs
    .filter((v) => v.lang.toLowerCase().startsWith('en') && !NOVELTY.has(v.name))
    .sort((a, b) => Number(b.lang === 'en-US') - Number(a.lang === 'en-US') || Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name));
}

// School default when the student has not chosen: iPhone/Mac, Windows Edge. Android has no fixed
// name, so it falls through to the phone's own default voice. Not "Google US English": it is
// online-only on desktop Chrome and does not report word boundaries (no highlighting).
const PREFERRED = ['Samantha', 'Microsoft Aria', 'Microsoft Jenny'];

/**
 * The chosen voice if this device still has it; else the school default; else the phone's own
 * default US voice (Android: Settings → Text-to-speech); else an offline US voice (they report word boundaries).
 */
export function pickVoice(): SpeechSynthesisVoice | undefined {
  const vs = englishVoices();
  const uri = savedVoiceURI();
  const preferred = PREFERRED.map((n) => vs.find((v) => v.lang === 'en-US' && v.name.startsWith(n))).find(Boolean);
  return (uri && vs.find((v) => v.voiceURI === uri)) || preferred || vs.find((v) => v.lang === 'en-US' && v.default) || vs.find((v) => v.lang === 'en-US' && v.localService) || vs[0];
}

/** Voices load asynchronously on some browsers (iOS, Chrome). */
export function onVoices(cb: () => void) {
  cb();
  window.speechSynthesis?.addEventListener?.('voiceschanged', cb);
}
