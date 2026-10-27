// Device voices. Speech is synthesised by the phone/laptop itself, so the available voices differ
// per device; the student's choice is kept in this device's localStorage, not on the server.

import { brand } from '../brand/brand';
import { chooseVoice, sortEnglish } from '../lib/voices.ts';

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

/** English voices on this device, US first, offline before online. */
export const englishVoices = (): SpeechSynthesisVoice[] => sortEnglish(window.speechSynthesis?.getVoices() ?? []);

/** The chosen voice if this device still has it, else the school default, else the device's best US voice. */
export const pickVoice = () => chooseVoice(englishVoices(), savedVoiceURI());

/** Voices load asynchronously on some browsers (iOS, Chrome). */
export function onVoices(cb: () => void) {
  cb();
  window.speechSynthesis?.addEventListener?.('voiceschanged', cb);
}
