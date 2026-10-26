# CLAUDE.md

This is the unbranded upstream edition. Branded copies pull from it, so every change here must work for any school.

- Never add a school's name, logo, colours, Cloudflare IDs, database IDs or account IDs. Branding lives only in `src/brand/` and `public/brand/`, and here those stay neutral ("LuteLingo").
- Never add copyrighted texts. `migrations/0007_*.sql` stays a placeholder.
- New migrations start here, so numbering stays the same in every copy.
- Keep `wrangler.jsonc` generic (`REPLACE_WITH_YOUR_D1_DATABASE_ID`, no `account_id`).
- Test before pushing: `npm test`, then `npm run test:e2e` with `npm run dev` running on port 4330 (kill stray servers first: `lsof -ti tcp:4330 | xargs kill`).
- This repo is public and never deploys anywhere.
- Release with `npm version patch|minor|major` then `git push --follow-tags`; the Release workflow publishes a GitHub release with the commit subjects since the last tag. Patch = fixes, minor = features, major = hosts must act.
