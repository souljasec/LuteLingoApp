import { defineMiddleware } from 'astro:middleware';
import { getUser } from './lib/auth.ts';
import { isLang, translator } from './lib/i18n.ts';
import { locale } from './brand/locale.ts';

const PUBLIC = ['/login', '/signup', '/privacy', '/lang'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  // Build assets (fonts, scripts) are public. In production Cloudflare serves them before the Worker runs.
  if (ctx.url.pathname.startsWith('/_astro/')) return next();
  const secure = ctx.url.protocol === 'https:';
  const user = await getUser(ctx.cookies, secure);
  ctx.locals.user = user;
  // Logged in: the account setting. Logged out: the `lang` cookie from the switcher.
  const pref = user?.ui_lang ?? ctx.cookies.get('lang')?.value;
  ctx.locals.lang = isLang(pref) ? pref : locale.translateTo;
  ctx.locals.t = translator(ctx.locals.lang);
  const path = ctx.url.pathname;

  if (!user && !PUBLIC.includes(path)) {
    if (path.startsWith('/api/')) return new Response('{"error":"auth"}', { status: 401 });
    return ctx.redirect('/login');
  }
  if (path.startsWith('/admin') && user?.role !== 'admin') return ctx.redirect('/');

  const res = await next();
  // Pages show personal data: never cache them in shared caches.
  if (!path.startsWith('/_astro/')) res.headers.set('cache-control', 'private, no-store');
  return res;
});
