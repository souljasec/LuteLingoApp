import type { APIRoute } from 'astro';
import { destroySession } from '../lib/auth.ts';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  await destroySession(cookies);
  return redirect('/login');
};
