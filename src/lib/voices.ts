// Choosing a speech voice from the ones this device has (pure; scripts/voice.ts reads the device).

type Voice = Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService' | 'default' | 'voiceURI'>;

// Apple's novelty voices: fun, but useless for learning pronunciation.
const NOVELTY = new Set(['Albert', 'Bad News', 'Bahh', 'Bells', 'Boing', 'Bubbles', 'Cellos', 'Good News', 'Jester', 'Organ', 'Superstar', 'Trinoids', 'Whisper', 'Wobble', 'Zarvox']);

const isUS = (v: Voice) => v.lang === 'en-US';
const first = (a: boolean, b: boolean) => Number(b) - Number(a);
const byPreference = (a: Voice, b: Voice) => first(isUS(a), isUS(b)) || first(a.localService, b.localService) || a.name.localeCompare(b.name);

/** English voices, US first, offline before online. */
export const sortEnglish = <V extends Voice>(vs: V[]): V[] =>
  vs.filter((v) => v.lang.toLowerCase().startsWith('en') && !NOVELTY.has(v.name)).sort(byPreference);

// School default when the student has not chosen: iPhone/Mac, Windows Edge. Android has no fixed
// name, so it falls through to the phone's own default voice. Not "Google US English": it is
// online-only on desktop Chrome and does not report word boundaries (no highlighting).
const PREFERRED = ['Samantha', 'Microsoft Aria', 'Microsoft Jenny'];

/** Tried in order; the first that finds a voice wins. */
const CHOICES: (<V extends Voice>(vs: V[], uri: string) => V | undefined)[] = [
  (vs, uri) => (uri ? vs.find((v) => v.voiceURI === uri) : undefined), // the student's choice, if this device still has it
  (vs) => PREFERRED.map((n) => vs.find((v) => isUS(v) && v.name.startsWith(n))).find(Boolean), // the school default
  (vs) => vs.find((v) => isUS(v) && v.default), // the phone's own default (Android: Settings → Text-to-speech)
  (vs) => vs.find((v) => isUS(v) && v.localService), // an offline US voice (they report word boundaries)
  (vs) => vs[0],
];

/** The voice to speak with, from sortEnglish's list and the saved choice ('' = automatic). */
export function chooseVoice<V extends Voice>(vs: V[], uri: string): V | undefined {
  for (const choose of CHOICES) {
    const v = choose(vs, uri);
    if (v) return v;
  }
  return undefined;
}
