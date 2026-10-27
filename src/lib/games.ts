import { env } from 'cloudflare:workers';
import { gapSplit } from './tokenize.ts';
import { statusSql } from './terms.ts';

export const GAMES = ['match', 'listen', 'fill'] as const;
export type Game = (typeof GAMES)[number];
export type GameWord = { t: string; m: string; s?: [string, string, string] };

/**
 * Up to 15 random saved words for a game (never ignored ones), no two sharing a term or a
 * meaning, so every question has exactly one answer. Empty when there aren't enough to play.
 * match: multiple of 5, all with a meaning. listen: ≥ 5 with a meaning (questions are the
 * first 10, the rest are wrong choices). fill: ≥ 5 words found in their saved sentence come
 * first (the questions, up to 10), then other words as wrong choices.
 */
export async function gameWords(user: { id: number }, game: Game): Promise<GameWord[]> {
  const { results } = await env.DB.prepare(
    `SELECT term, translation, sentence FROM saved_words WHERE user_id = ? AND ${statusSql().notIgnored} ORDER BY random() LIMIT 80`,
  )
    .bind(user.id)
    .all<{ term: string; translation: string; sentence: string }>();
  const seen = new Set<string>();
  const words: GameWord[] = [];
  for (const r of results) {
    let m = r.translation.split(/[;\n]/)[0].trim();
    if (m.length > 48) m = m.slice(0, 47) + '…';
    if (!m && game !== 'fill') continue;
    const keys = [`t:${r.term.toLowerCase()}`, ...(m ? [`m:${m.toLowerCase()}`] : [])];
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    const s = game === 'fill' && r.sentence ? gapSplit(r.sentence, r.term) : null;
    words.push(s ? { t: r.term, m, s } : { t: r.term, m });
  }
  if (game === 'match') {
    const w = words.slice(0, 15);
    return w.slice(0, w.length - (w.length % 5));
  }
  if (game === 'listen') return words.length >= 5 ? words.slice(0, 15) : [];
  const questions = words.filter((w) => w.s).slice(0, 10);
  if (questions.length < 5) return [];
  return [...questions, ...words.filter((w) => !w.s).slice(0, 15 - questions.length)];
}
