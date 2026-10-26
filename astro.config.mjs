// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  // We run our own D1-backed sessions; passthrough images avoid provisioning KV and Images bindings.
  session: false,
  adapter: cloudflare({ imageService: 'passthrough' }),
  security: { checkOrigin: true },
  devToolbar: { enabled: false },
  // Be Vietnam Pro for headings because Outfit has no Vietnamese tone marks.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Be Vietnam Pro',
      cssVariable: '--font-display',
      weights: [400, 500, 700],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'vietnamese'],
      display: 'swap',
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Plus Jakarta Sans',
      cssVariable: '--font-body',
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'vietnamese'],
      display: 'swap',
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
