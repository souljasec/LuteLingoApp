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
