import { gapSplit } from './tokenize.ts';

export const GAMES = ['match', 'listen', 'fill'] as const;
export type Game = (typeof GAMES)[number];
export type GameWord = { t: string; m: string; s?: [string, string, string] };

/**
 * Up to 15 words for a game from a sample of saved words (the page draws them at random, never
 * ignored ones), no two sharing a term or a meaning, so every question has exactly one answer. Empty when there aren't enough to play.
 * match: multiple of 5, all with a meaning. listen: ≥ 5 with a meaning (questions are the
 * first 10, the rest are wrong choices). fill: ≥ 5 words found in their saved sentence come
 * first (the questions, up to 10), then other words as wrong choices.
 */
type SavedWord = { term: string; translation: string; sentence: string };

/** The first meaning of a saved translation, short enough for a button. */
const firstMeaning = (translation: string) => {
  const m = translation.split(/[;\n]/)[0].trim();
  return m.length > 48 ? m.slice(0, 47) + '…' : m;
};

/** A saved word as a game word; fill also blanks it in its sentence when it is found there. */
function toGameWord(r: SavedWord, game: Game): GameWord {
  const m = firstMeaning(r.translation);
  const s = game === 'fill' && r.sentence ? gapSplit(r.sentence, r.term) : null;
  return s ? { t: r.term, m, s } : { t: r.term, m };
}

/** Drops words without a meaning (fill can do without) and any word repeating an earlier term or meaning. */
function oneAnswerEach(words: GameWord[], game: Game): GameWord[] {
  const seen = new Set<string>();
  return words.filter((w) => {
    if (!w.m && game !== 'fill') return false;
    const keys = [`t:${w.t.toLowerCase()}`, ...(w.m ? [`m:${w.m.toLowerCase()}`] : [])];
    if (keys.some((k) => seen.has(k))) return false;
    keys.forEach((k) => seen.add(k));
    return true;
  });
}

/** How each game sizes its round from the usable words. */
const ROUND: Record<Game, (words: GameWord[]) => GameWord[]> = {
  match: (words) => {
    const w = words.slice(0, 15);
    return w.slice(0, w.length - (w.length % 5));
  },
  listen: (words) => (words.length >= 5 ? words.slice(0, 15) : []),
  fill: (words) => {
    const questions = words.filter((w) => w.s).slice(0, 10);
    return questions.length < 5 ? [] : [...questions, ...words.filter((w) => !w.s).slice(0, 15 - questions.length)];
  },
};

export function pickGameWords(results: SavedWord[], game: Game): GameWord[] {
  return ROUND[game](oneAnswerEach(results.map((r) => toGameWord(r, game)), game));
}
