/// <reference types="astro/client" />
import type { D1Database } from '@cloudflare/workers-types/index.ts';

declare global {
  type User = {
    id: number;
    email: string;
    name: string;
    role: 'student' | 'admin';
    ui_lang: string;
    text_size: 'small' | 'medium' | 'large';
    speech_rate: number;
    theme: 'light' | 'dim';
  };

  // Bindings from wrangler.jsonc, read via `import { env } from 'cloudflare:workers'`.
  interface Env {
    DB: D1Database;
    AUTH_LIMIT?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  }

  namespace App {
    interface Locals {
      user: User | null;
      lang: import('./lib/i18n.ts').Lang;
      t: (key: import('./lib/i18n.ts').Key) => string;
    }
  }
}
