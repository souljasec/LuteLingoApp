import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { locale } from '../../brand/locale.ts';
import { json } from '../../lib/http.ts';
import { cleanMeaning, otherMeanings } from '../../lib/meanings.ts';

const TL = locale.translateTo;

// Same sources as the Lute panel (lute-custom/custom/vi.html): Google first, MyMemory for fallback
// and alternative meanings. Words and short phrases are cached for everyone; sentences are not
// (they may come from students' private texts).

async function google(q: string): Promise<string> {
  const r = await fetch(
    'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=' + TL + '&q=' + encodeURIComponent(q),
  );
  if (!r.ok) throw new Error(`google ${r.status}`);
  const j: any = await r.json();
  return Array.isArray(j[0]) ? j[0][0] : j[0];
}

async function mymemory(q: string): Promise<{ main: string; alts: string[] }> {
  const r = await fetch('https://api.mymemory.translated.net/get?langpair=en|' + TL + '&q=' + encodeURIComponent(q));
  if (!r.ok) throw new Error(`mymemory ${r.status}`);
  const j: any = await r.json();
  const alts = [...new Set<string>((j.matches ?? []).map((m: any) => String(m.translation).trim()))].slice(0, 5);
  return { main: j.responseData?.translatedText, alts };
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.user) return json({ error: 'auth' }, 401);
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 500);
  if (!q) return json({ error: 'empty' }, 400);

  const key = q.toLowerCase();
  const cacheable = key.split(/\s+/).length <= 3;
  if (cacheable) {
    const hit = await env.DB.prepare('SELECT vi, alts FROM translation_cache WHERE term = ?')
      .bind(key)
      .first<{ vi: string; alts: string }>();
    if (hit) return json({ vi: hit.vi, alts: JSON.parse(hit.alts), cached: true });
  }

  const [g, m] = await Promise.allSettled([google(q), mymemory(q)]);
  for (const r of [g, m]) if (r.status === 'rejected') console.error('translate source failed:', String(r.reason));
  const vi = cleanMeaning(g.status === 'fulfilled' && g.value ? g.value : m.status === 'fulfilled' ? m.value.main || '' : '');
  if (!vi) return json({ error: 'unavailable' }, 502);
  // Other meanings only help for words and short phrases; for sentences they are noise.
  const alts = otherMeanings(m.status === 'fulfilled' && cacheable ? m.value.alts : [], vi, key);

  if (cacheable) {
    await env.DB.prepare('INSERT OR REPLACE INTO translation_cache (term, vi, alts) VALUES (?, ?, ?)')
      .bind(key, vi, JSON.stringify(alts))
      .run();
  }
  return json({ vi, alts });
};
