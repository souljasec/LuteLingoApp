import type { APIRoute } from 'astro';
import { isLang } from '../lib/i18n.ts';

// Language switcher for logged-out pages (login, sign-up). Logged-in users change it in Settings.
export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const to = url.searchParams.get('to');
  if (isLang(to)) cookies.set('lang', to, { path: '/', maxAge: 365 * 86_400, sameSite: 'lax' });
  // Same-site paths only. "//x" and "/\\x" are both read by browsers as another host (THREATS.md W1).
  const back = url.searchParams.get('back') ?? '/login';
  return redirect(/^\/(?![\/\\])/.test(back) ? back : '/login');
};
