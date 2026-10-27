// Word levels (Lute's statuses) and phrase size: the one place these numbers live.
// Pure, so the reader script, pages, API and tests share it. Terms are defined in GLOSSARY.md.

export const LEARNING = [1, 2, 3, 4, 5] as const; // 1 = just met … 5 = almost known
export const IGNORED = 98; // names and the like: never coloured, never reviewed, no XP
export const KNOWN = 99;
export type Learning = (typeof LEARNING)[number];
export type Status = Learning | typeof IGNORED | typeof KNOWN;

/** Longest new phrase, in words. Longer selections are sentences: they translate but aren't saved. */
export const MAX_PHRASE = 5;

export const isLearning = (s: unknown): s is Learning => LEARNING.includes(s as Learning);
export const isStatus = (s: unknown): s is Status => isLearning(s) || s === IGNORED || s === KNOWN;

/** Reader colour class: a word with no status is new (blue), learning levels are coloured, known and ignored are plain. */
export const statusClass = (s: number | undefined) => (s === undefined ? 'st0' : isLearning(s) ? `st${s}` : '');

/** SQL conditions on a saved_words status column. */
export const statusSql = (col = 'status') => ({
  learning: `${col} BETWEEN ${LEARNING[0]} AND ${LEARNING.at(-1)}`,
  known: `${col} = ${KNOWN}`,
  notIgnored: `${col} != ${IGNORED}`,
});
