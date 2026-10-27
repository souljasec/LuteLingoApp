// Cleaning what the translation services return (pure, so it can be tested without them).

/**
 * One meaning, tidied. NFC: the two services can encode the same Vietnamese accents differently.
 * MyMemory sometimes returns markup fragments like '<g id="1">'; strip tags and stray brackets.
 */
export const cleanMeaning = (s: string) =>
  s.normalize('NFC').replace(/<[^>]*>?|[^\s<>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/^[-–•\s]+|[.。\s]+$/g, ''); // "- Anh đã bay." → "Anh đã bay"

/**
 * Up to 6 other meanings for a word or short phrase. Entries like "thủ đô, tiền vốn" are split so
 * the main meaning isn't repeated inside them. Each must contain a letter, and not the English
 * query itself (MyMemory returns fragments like "He flew").
 */
export function otherMeanings(alts: string[], main: string, query: string): string[] {
  const seen = new Set([main.toLowerCase()]);
  return alts.flatMap((a) => a.split(/[,;/]/)).map(cleanMeaning).filter((a) => {
    const k = a.toLowerCase();
    return /\p{L}/u.test(a) && !k.includes(query) && !seen.has(k) && seen.add(k);
  }).slice(0, 6);
}

export type TranslationQuery = { q: string; key: string; cacheable: boolean };

/** The ?q= of a translation request, or null when empty. Words and short phrases are cached for
 * everyone; sentences are not (they may come from students' private texts). */
export function translationQuery(raw: string | null): TranslationQuery | null {
  const q = (raw ?? '').trim().slice(0, 500);
  if (!q) return null;
  const key = q.toLowerCase();
  return { q, key, cacheable: key.split(/\s+/).length <= 3 };
}

/** Google's dict-chrome-ex reply: [["meaning", …]] for words, ["meaning"] for some phrases. */
export const googleText = (j: any): string => (Array.isArray(j[0]) ? j[0][0] : j[0]);

/** MyMemory's reply: the main translation and up to 5 distinct alternatives from its matches. */
export function myMemoryResult(j: any): { main: string; alts: string[] } {
  const alts = [...new Set<string>((j.matches ?? []).map((m: any) => String(m.translation).trim()))].slice(0, 5);
  return { main: j.responseData?.translatedText || '', alts };
}

/** The meaning to show: Google's when it gave one, else MyMemory's, cleaned. */
export const mainMeaning = (google: string | undefined, mymemory: string | undefined) => cleanMeaning(google || mymemory || '');

/** What the student sees. Other meanings only help for words and short phrases; for sentences they are noise. */
export function translationAnswer(query: TranslationQuery, google: string | undefined, mymemory: { main: string; alts: string[] } | undefined) {
  const vi = mainMeaning(google, mymemory?.main);
  return { vi, alts: query.cacheable ? otherMeanings(mymemory?.alts ?? [], vi, query.key) : [] };
}
