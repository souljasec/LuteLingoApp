// Account settings: the choices offered on /account and the one parser for that form.
import { isLang, type Lang } from './i18n.ts';

export const SIZES = ['small', 'medium', 'large'] as const;
export const THEMES = ['light', 'dim'] as const;
export const RATES = { slow: 0.7, normal: 0.9 } as const; // speech speed
export const GOALS = [10, 20, 30, 50] as const; // daily XP; the users.daily_goal CHECK in migration 0010 must match
export type Size = (typeof SIZES)[number];
export type Theme = (typeof THEMES)[number];
export type Prefs = { ui_lang: Lang; text_size: Size; speech_rate: number; daily_goal: number; theme: Theme };

const oneOf = <T>(list: readonly T[], v: unknown): v is T => list.includes(v as T);

/** The settings form as values to store, or null when any field is not one of the choices. */
export function parsePrefs(f: { get(name: string): unknown }): Prefs | null {
  const ui_lang = f.get('ui_lang');
  const text_size = f.get('text_size');
  const rate = f.get('speech_rate');
  // Own keys only: a plain lookup would accept "toString" and store a function.
  const speech_rate = typeof rate === 'string' && Object.hasOwn(RATES, rate) ? RATES[rate as keyof typeof RATES] : 0;
  const daily_goal = Number(f.get('daily_goal'));
  const theme = f.get('theme');
  if (!isLang(ui_lang) || !oneOf(SIZES, text_size) || !speech_rate || !oneOf(GOALS, daily_goal) || !oneOf(THEMES, theme)) return null;
  return { ui_lang, text_size, speech_rate, daily_goal, theme };
}
