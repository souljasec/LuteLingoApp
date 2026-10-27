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

/** A saved term's text: lowercased, whitespace collapsed, at most 200 characters. */
export const cleanTerm = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 200);

/** What POST /api/words may set. parent: null leaves the link as is, '' unlinks. */
export type TermInput = { term: string; translation: string; status: Status; parent: string | null; sentence: string };

/** The term body as values to save, or null when the term is empty, the status unknown or the term its own parent. */
export function parseTermInput(input: unknown): TermInput | null {
  const b = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const term = cleanTerm(b.term);
  const status = Number(b.status ?? 1);
  const parent = b.parent === undefined ? null : cleanTerm(b.parent);
  if (!term || !isStatus(status) || parent === term) return null;
  return {
    term,
    translation: String(b.translation ?? '').trim().slice(0, 500),
    status,
    parent,
    sentence: String(b.sentence ?? '').replace(/\s+/g, ' ').trim().slice(0, 300),
  };
}

/** More words than a new phrase may have (sentences translate but aren't saved). */
export const isTooLong = (term: string) => term.split(' ').length > MAX_PHRASE;

/** New-word XP: only the first save of a term, and never for ignoring it. */
export const paysNewWordXp = (existed: boolean, status: Status) => !existed && status !== IGNORED;
