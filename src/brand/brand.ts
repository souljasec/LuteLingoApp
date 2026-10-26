// The brand pack: everything that names or styles this copy of the app lives in src/brand/ and
// public/brand/. To rebrand, replace the files in those two folders; no other file names the school.
//
//   src/brand/brand.ts      name, theme colours, storage prefix (this file)
//   src/brand/tokens.css    colour palette, light and dim themes
//   src/brand/logo.svg      header lockup, inlined (uses --logo-ink / --logo-accent)
//   src/brand/Decor.astro   artwork behind the login and sign-up screens (may render nothing)
//   public/brand/           favicon.svg, favicon.ico, symbol.svg, logo.svg, icon-192.png,
//                           icon-512.png, icon-maskable-512.png, apple-touch-icon.png,
//                           manifest.webmanifest, offline.html

export const brand = {
  name: 'LuteLingo',
  /** Spoken by the voice test in Settings. */
  welcome: 'Hello! Welcome. Let us read in English together.',
  /** Browser bar colour per theme; keep in step with --paper in tokens.css. */
  themeColor: { light: '#f8f6ef', dim: '#1c2a2b' },
  /** Prefix for this device's saved settings (zoom, filters, voice, reading position). Changing it
   *  resets those settings for everyone, so keep it once the app is in use. */
  storagePrefix: 'lutelingo',
};
