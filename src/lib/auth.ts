import type { AstroCookies } from 'astro';
import { env } from 'cloudflare:workers';
import { randomToken, sha256 } from './crypto.ts';

const COOKIE = 'sid';
const DAY = 86_400;
const SESSION_DAYS = 30;

export async function createSession(cookies: AstroCookies, userId: number, secure: boolean) {
  const token = randomToken();
  const expires = Math.floor(Date.now() / 1000) + SESSION_DAYS * DAY;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), userId, expires),
    env.DB.prepare('UPDATE users SET last_active_at = unixepoch() WHERE id = ?').bind(userId),
    // Housekeeping: drop this user's expired sessions so the table doesn't grow forever.
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at < unixepoch()').bind(userId),
  ]);
  cookies.set(COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: SESSION_DAYS * DAY });
}

/** Returns the logged-in user; slides the expiry and last_active at most once a day to save writes. */
export async function getUser(cookies: AstroCookies, secure: boolean): Promise<User | null> {
  const token = cookies.get(COOKIE)?.value;
  if (!token) return null;
  const id = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.ui_lang, u.text_size, u.speech_rate, u.theme, s.expires_at, u.last_active_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?`,
  )
    .bind(id, now)
    .first<User & { expires_at: number; last_active_at: number | null }>();
  if (!row) {
    cookies.delete(COOKIE, { path: '/' });
    return null;
  }
  if (row.expires_at - now < (SESSION_DAYS - 1) * DAY) {
    const expires = now + SESSION_DAYS * DAY;
    await env.DB.batch([
      env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').bind(expires, id),
      env.DB.prepare('UPDATE users SET last_active_at = ? WHERE id = ?').bind(now, row.id),
    ]);
    cookies.set(COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: SESSION_DAYS * DAY });
  }
  const { expires_at, last_active_at, ...user } = row;
  return user;
}

export async function destroySession(cookies: AstroCookies) {
  const token = cookies.get(COOKIE)?.value;
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run();
  cookies.delete(COOKIE, { path: '/' });
}

/**
 * Best-effort limit of 10 tries per minute per IP and key. Cloudflare's limiter is approximate and
 * per data centre, so real login protection is the per-account lockout in login.astro.
 */
export async function rateLimited(request: Request, action: string): Promise<boolean> {
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  if (!env.AUTH_LIMIT) return false;
  const { success } = await env.AUTH_LIMIT.limit({ key: `${action}:${ip}` });
  return !success;
}
