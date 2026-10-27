// The reader panel's rules for saving a term (pure; the reader script does the requests and the DOM).
import type { Status, Term } from './terms.ts';

/** The sentence a term was saved from, kept for its flashcard; none when the term is the whole sentence. */
export const sourceSentence = (term: string, sentence: string) => (term === sentence.toLowerCase() ? '' : sentence);

/**
 * The panel's copy of a term after saving it: the meaning shown, else the one it had. `parent`
 * undefined keeps the link it had (the server does too), '' unlinks.
 */
export function savedTerm(prev: Term | undefined, shown: string, s: Status, parent = prev?.p): Term {
  return { t: shown || prev?.t || '', s, ...(parent ? { p: parent } : {}) };
}

/** A chosen or typed base word, '' to unlink, or null when it would link a term to itself. */
export function parentChoice(term: string, input: string | null): string | null {
  const p = input?.trim().toLowerCase() ?? '';
  return p === term ? null : p;
}

/** The base word to add to the panel after linking: only one the server returned and the panel lacks. */
export const newParent = (p: string, returned: Term | null, terms: Record<string, Term>) =>
  p && returned && !(p in terms) ? returned : null;
