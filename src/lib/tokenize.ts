// Text parser, ported from Lute v3's SpaceDelimitedParser (lute/parse/space_delimited_parser.py, MIT)
// with Lute's English language settings:
//   1. character substitutions are applied first,
//   2. each line is a paragraph,
//   3. sentence-split exceptions ("Mr.", "U.S.") are matched before ordinary words, so they stay
//      one word and don't end a sentence,
//   4. a non-word gap containing . ! ? ends the sentence.
// Differences from Lute: contractions (didn't, it's) stay one word, and the Vietnamese letter
// block is included so names like "Bác Hồ" are whole words.

const SUBSTITUTIONS: [string, string][] = [
  ['´', "'"], ['`', "'"], ['’', "'"], ['‘', "'"], ['...', '…'], ['..', '‥'],
];

// Lute's English exceptions minus "in." and "No.", which end sentences far more often than they
// abbreviate in learner texts ("Come in.", "No.").
// The single-initial rule goes last: regex alternatives are tried in order and "[A-Z]." would
// otherwise take the "U." of "U.S.".
const EXCEPTIONS = ['Mrs.', 'Mr.', 'Dr.', 'Vds.', 'Vd.', 'U.S.', 'St.', 'pp.', 'Jr.', 'p.m.', 'a.m.', 'Inc.', 'Gov.', 'Rep.', 'Ms.', 'Sen.', 'Co.', '[A-Z].'];

const LETTERS = 'a-zA-ZÀ-ÖØ-öø-ȳẠ-ỹ';
const WORD = `[${LETTERS}]+(?:'[${LETTERS}]+)*`;
const EXC = EXCEPTIONS.map((e) => e.replace(/\./g, '\\.')).join('|');
// Exceptions must not be glued to a preceding letter ("Items." is not "Ms.").
const TOKEN = new RegExp(`(?<![${LETTERS}])(?:${EXC})|${WORD}`, 'gu');
const SENTENCE_END = /[.!?]/;

export type Token = { w: string; word: boolean };
export type Sentence = Token[];
export type Paragraph = Sentence[];

export function clean(text: string): string {
  let t = text.replace(/\r\n?/g, '\n');
  for (const [from, to] of SUBSTITUTIONS) t = t.split(from).join(to);
  return t;
}

export function parseParagraph(text: string): Paragraph {
  const sentences: Paragraph = [];
  let cur: Sentence = [];
  const gap = (s: string) => {
    if (!s) return;
    cur.push({ w: s, word: false });
    if (SENTENCE_END.test(s)) {
      sentences.push(cur);
      cur = [];
    }
  };
  let pos = 0;
  for (const m of text.matchAll(TOKEN)) {
    gap(text.slice(pos, m.index));
    cur.push({ w: m[0], word: true });
    pos = m.index + m[0].length;
  }
  gap(text.slice(pos));
  if (cur.length) sentences.push(cur);
  return sentences;
}

export function parse(body: string): Paragraph[] {
  return clean(body)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseParagraph);
}

/** Lowercased word list of a text (for term lookups and "mark rest as known"). */
export const wordsOf = (paras: Paragraph[]) => paras.flat(2).filter((t) => t.word).map((t) => t.w.toLowerCase());

/** The text of a run of tokens as a saved term: lowercased, whitespace collapsed. */
export const termOf = (tokens: Token[]) => tokens.map((t) => t.w).join('').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Find saved multi-word terms in a sentence, longest first from the left (Lute matches multiword
 * terms the same way). Returns [startIndex, endIndex] token ranges, word to word inclusive.
 */
export function findPhrases(sentence: Sentence, phrases: Set<string>, maxWords = 8): [number, number][] {
  if (!phrases.size) return [];
  const wordIdx = sentence.flatMap((t, i) => (t.word ? [i] : []));
  const found: [number, number][] = [];
  for (let a = 0; a < wordIdx.length; a++) {
    for (let b = Math.min(wordIdx.length - 1, a + maxWords - 1); b > a; b--) {
      const from = wordIdx[a], to = wordIdx[b];
      if (phrases.has(termOf(sentence.slice(from, to + 1)))) {
        found.push([from, to]);
        a = b; // no overlapping phrases
        break;
      }
    }
  }
  return found;
}

/**
 * A sentence split around the first whole-word match of `term` (any capitals), for the
 * fill-the-gap game: [before, the word as written, after]. Null if it isn't there as a whole word.
 */
export function gapSplit(sentence: string, term: string): [string, string, string] | null {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'iu').exec(sentence);
  return m ? [sentence.slice(0, m.index), m[0], sentence.slice(m.index + m[0].length)] : null;
}
