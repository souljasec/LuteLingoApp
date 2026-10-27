import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { locale } from '../../brand/locale.ts';
import { json } from '../../lib/http.ts';
import { googleText, myMemoryResult, translationAnswer, translationQuery, type TranslationQuery } from '../../lib/meanings.ts';

const TL = locale.translateTo;

// Same sources as the Lute panel (lute-custom/custom/vi.html): Google first, MyMemory for fallback
// and alternative meanings. Words and short phrases are cached for everyone; sentences are not
// (they may come from students' private texts).

async function google(q: string): Promise<string> {
  const r = await fetch(
    'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=' + TL + '&q=' + encodeURIComponent(q),
  );
  if (!r.ok) throw new Error(`google ${r.status}`);
  return googleText(await r.json());
}

async function mymemory(q: string): Promise<{ main: string; alts: string[] }> {
  const r = await fetch('https://api.mymemory.translated.net/get?langpair=en|' + TL + '&q=' + encodeURIComponent(q));
  if (!r.ok) throw new Error(`mymemory ${r.status}`);
  return myMemoryResult(await r.json());
}

/** Both services at once; a failed one is logged and counts as no answer. */
async function ask(q: string) {
  const [g, m] = await Promise.allSettled([google(q), mymemory(q)]);
  for (const r of [g, m]) if (r.status === 'rejected') console.error('translate source failed:', String(r.reason));
  return [g.status === 'fulfilled' ? g.value : undefined, m.status === 'fulfilled' ? m.value : undefined] as const;
}

const cached = (query: TranslationQuery) =>
  query.cacheable
    ? env.DB.prepare('SELECT vi, alts FROM translation_cache WHERE term = ?').bind(query.key).first<{ vi: string; alts: string }>()
    : null;

const remember = async (query: TranslationQuery, vi: string, alts: string[]) => {
  if (query.cacheable) {
    await env.DB.prepare('INSERT OR REPLACE INTO translation_cache (term, vi, alts) VALUES (?, ?, ?)').bind(query.key, vi, JSON.stringify(alts)).run();
  }
};

// Logged-out requests never get here: the middleware answers 401 for every /api/ route.
export const GET: APIRoute = async ({ url }) => {
  const query = translationQuery(url.searchParams.get('q'));
  if (!query) return json({ error: 'empty' }, 400);
  const hit = await cached(query);
  if (hit) return json({ vi: hit.vi, alts: JSON.parse(hit.alts), cached: true });
  const answer = translationAnswer(query, ...(await ask(query.q)));
  if (!answer.vi) return json({ error: 'unavailable' }, 502);
  await remember(query, answer.vi, answer.alts);
  return json(answer);
};
