# Threat model

Last reviewed: 2026-10-24. Scope: the app Worker, its D1 database, and the browser/PWA client. Each threat lists its mitigation, where it lives in the code, and the automated test that checks it (`test/e2e/security.e2e.ts`, `test/lib.test.ts`).

## What we protect

| Asset | Why it matters |
|---|---|
| Student accounts (email, password, name) | Personal data of minors (Vietnam Decree 13/2023) |
| Learning data (saved words, progress, own texts) | Private to the student; own texts must stay private even from admins |
| Admin powers (classes, password resets, deletions) | Full control over students' accounts |
| Leaderboard / XP | Fairness between classmates; motivation breaks if it can be cheated |
| Service availability and the free-plan quota | 100k requests/day shared by the whole account |

## Who might attack

| Actor | Realistic goal |
|---|---|
| **Curious or competitive student** (most likely) | Read classmates' texts, top the leaderboard, become admin, lock a classmate out |
| **Outsider on the internet** | Guess passwords, phish students via our domain, abuse the API |
| **Malicious website a student visits** | Make the logged-in student's browser act (CSRF) |
| **Compromised admin account** | Everything an admin can do; out of scope for technical controls beyond logging out sessions |

## Entry points

Pages (`/login`, `/signup`, `/lang`, `/`, `/read/:id`, `/texts/edit`, `/words`, `/review`, `/leaderboard`, `/account`, `/admin/*`), JSON APIs (`/api/translate`, `/api/words`, `/api/review`, `/api/progress`), the session cookie, outbound calls (Google, MyMemory, Tatoeba from the phone), and the deploy token on the developer's Mac.

## Threats and controls

Status: ✅ mitigated and tested · ⚠️ accepted risk (documented) · 🔧 fixed in this review.

### Authentication

| ID | Threat | Control | Test | Status |
|---|---|---|---|---|
| A1 | Using pages or APIs without logging in | Middleware redirects pages to `/login`, APIs return 401 (`src/middleware.ts`) | A1 | ✅ |
| A2 | Learning which emails have accounts from login errors | Same message for unknown email and wrong password | A2 | ✅ |
| A3 | Password guessing | **Per-account lockout**: 10 wrong passwords → 15 min (`login.astro`). Per account, not per IP: a class shares one school Wi-Fi IP. Cloudflare's IP limiter proved approximate in a live test, so it is not relied on | A3 | ✅ |
| A3b | A student deliberately locks a classmate out | Lockout is only 15 min; admin password reset unlocks immediately | A3 | ⚠️ |
| A4 | Stolen or reused session after logout | Sessions stored server-side as SHA-256 of the token; logout deletes it; password reset deletes all of the user's sessions | A4, A3 | ✅ |
| A5 | Session theft via script or cross-site requests | Cookie `HttpOnly; SameSite=Lax; Path=/`, `Secure` on HTTPS | A5 | ✅ |
| A6 | Password database leak | PBKDF2-SHA256, 100k iterations (Workers maximum), random salt | unit: password hash | ✅ |
| A7 | Sign-up reveals that an email is registered | Needed to tell students to log in instead | — | ⚠️ |
| A8 | Very long passwords cost CPU | Max 200 characters (sign-up and login) | I2 | 🔧 |

### Cross-site requests

| ID | Threat | Control | Test | Status |
|---|---|---|---|---|
| C1 | A malicious site posts a form (or `text/plain` JSON) as the student | Astro `checkOrigin` rejects cross-origin form/text posts (403); `SameSite=Lax` keeps the cookie off cross-site POSTs; JSON APIs need a CORS preflight we never grant | C1 | ✅ |

### Authorization (who may see or change what)

| ID | Threat | Control | Test | Status |
|---|---|---|---|---|
| Z1 | Student opens admin pages or posts admin actions | `/admin*` requires `role = 'admin'` in middleware, for GET and POST | Z1 | ✅ |
| Z2 | Reading/editing/deleting another student's private text, or an admin reading it | One visibility rule for every text query (`VISIBLE` in `src/lib/texts.ts`): admins see school texts, never students' private ones; `canEdit` for edits; private titles hidden on admin student pages | Z2 | ✅ |
| Z3 | Reading a class text without being in the class | Visibility rule checks class membership at request time | Z3 | ✅ |
| Z4 | Earning progress/XP on a text you cannot see | `/api/progress` loads the text through the visibility rule | Z4 | ✅ |
| Z5 | Seeing another class's names on the leaderboard | Students only get their own classes; `?class=` is matched against that list | Z5 | ✅ |
| Z6 | Student publishes a text to everyone (spam, abuse) | Students may choose only `private` or `classes`, always as owner; `classes` is limited to classes they are a member of | Z6, Z6b | ✅ |
| Z6c | Student shares an offensive text with their class | Admins can edit or delete class-shared student texts (`canEdit`); classmates can only read them; private texts stay out of admins' reach | Z6b | ✅ |
| Z6d | A student text reaches the whole library unreviewed | Only an admin can "Add to library", which copies a class-shared text (never a private one) as a school text credited by first name only; the student's own text is unchanged | Z6d | ✅ |
| Z7 | Admin removes the last admin | Admins cannot demote or delete themselves | — | ✅ |
| Z9 | Guessing a class join code to see its texts and leaderboard | 6 characters from 31 symbols (≈ 887 million codes); best-effort rate limit per user on joins; admins can issue a new code at any time | J1 | ✅ |
| Z10 | Students opening the class dashboard (classmates' activity) | Under `/admin`, admin only | J2, Z1 | ✅ |
| Z11 | Kids see adult categories in the library | Per-class category list (`ALLOWED` in `src/lib/texts.ts`); a library filter, not a lock: a direct link still opens a text for everyone | J3 | ⚠️ |
| Z8 | Guessing ids (IDOR) on `/read/:id`, `/texts/edit?id=`, words, reviews | Every lookup is scoped to the user or goes through the visibility rule | Z2–Z4 | ✅ |

### Web content

| ID | Threat | Control | Test | Status |
|---|---|---|---|---|
| W1 | **Open redirect** via `/lang?back=` used for phishing | Only paths starting with one `/` not followed by `/` or `\` (`src/pages/lang.ts`). The old check let `/\evil.com` through | W1 | 🔧 |
| S1 | Stored XSS through text titles/bodies, saved translations, or translation-service output | Astro escapes all output; client code uses `textContent` only; data for the reader sits in an escaped, quoted attribute; the layout's JSON escapes `<` | S1 | ✅ |
| S2 | SQL injection | Every query uses bound parameters; the only interpolated SQL is fixed fragments and placeholder lists | — (code review) | ✅ |

### Integrity of XP and the leaderboard

| ID | Threat | Control | Test | Status |
|---|---|---|---|---|
| X1 | Answering one flashcard again and again for XP | `/api/review` only accepts **due** cards (409 otherwise); "not yet" makes the card due again only after 10 min | X1 | 🔧 |
| X2 | Posting thousands of made-up words for XP | XP only for a term's first save; **daily caps** per source: words 50, reviews 100, texts 50 (`CAPS` in `src/lib/xp.ts`) | X2 | 🔧 |
| X3 | Toggling "finished" on a text for repeated XP | Paid once per text, recorded in `progress.rewarded` | X3 | 🔧 |
| X4 | XP for ignoring words | Status 98 (ignore) earns nothing | X4 | 🔧 |
| X5 | Students creating many own texts to farm text XP | Text XP capped at 50/day; own texts capped at 200 | X2, D2 | 🔧 |
| X6 | Posting "round finished" again and again for game XP | +5 per round, **capped at 30/day** (`CAPS.games`); unknown games refused; games never change word levels | G1 | 🔧 |

### Input and availability

| ID | Threat | Control | Test | Status |
|---|---|---|---|---|
| I1 | Invalid statuses, self-parent links, huge terms | Status whitelist, parent ≠ term, terms ≤ 200 chars, new phrases ≤ 5 words, sentences ≤ 300 chars, translations ≤ 500; theme whitelist | I1, P1, T1 | ✅ |
| I2 | Duplicate sign-ups racing, invalid passwords | `INSERT OR IGNORE` + friendly message; length checks | I2 | 🔧 |
| D1 | Translation API used as a free proxy | Login required; query ≤ 500 chars; only short terms cached | A1 | ✅ |
| D2 | Storage abuse via own texts | ≤ 200 own texts per student, ≤ 20,000 characters each | D2 | 🔧 |
| D3 | Admin form with an unknown class id crashes the page | Insert only if the class exists | D3 | 🔧 |
| D4 | Free-plan quota exhausted (100k requests/day) | ~500 active students/day of headroom; upgrade to $5 plan | load test in README | ⚠️ |
| D5 | Login CPU above the free plan's 10 ms | Tolerated today; $5 plan if "exceeded resources" errors appear | — | ⚠️ |

### Third parties and operations

| ID | Threat | Control | Status |
|---|---|---|---|
| T1 | Wrong or poisoned translations shared with everyone | Only the server writes the shared cache; phone fallbacks are never cached | ✅ |
| T2 | Google/MyMemory/Tatoeba see what students look up | Only the word is sent, no personal data; stated in the privacy policy | ⚠️ |
| T3 | Unofficial translation endpoints stop working or rate-limit a school Wi-Fi | Fallback chain; move to an official API if it becomes a problem | ⚠️ |
| O1 | Cloudflare deploy token leaks | Project-only token in git-ignored `.env`, scoped to Workers + D1 on your account; roll it if exposed | ✅ |
| O2 | Data loss | D1 Time Travel (7 days on free plan) | ⚠️ |
| O3 | Regressions | CI runs unit tests, type check, build and this security suite on every push | ✅ |

## Running the tests

```sh
npm test            # unit tests (parser, passwords, scheduling, dates)
npm run dev         # in another terminal
npm run test:e2e    # security suite against the running app (local D1)
```

The security suite creates its own users, class and texts with a unique run id and deletes them afterwards. It was checked against the old code: with the original redirect check and the original review endpoint, **W1 and X1 fail**; with the fixes, all pass.

## Review again when

Adding a new API route or page, changing who can see texts, adding email (password reset links become a new attack surface), adding a domain, or before opening sign-up beyond the school.
