# Glossary

The words this code uses for the domain, and where each one lives.

| Term | Meaning | Code |
|---|---|---|
| **Term** | A word or phrase a student has saved, lowercased. One row in `saved_words` per student and term | `saved_words`, `Term` in `src/lib/texts.ts` |
| **Status** (level) | How well the student knows a term: **learning** 1–5, **ignored** 98, **known** 99. A word with no status is **new** | `src/lib/terms.ts` |
| **Learning** | Status 1 (just met) to 5 (almost known). Only learning terms are coloured in the text and become flashcards | `LEARNING`, `isLearning` |
| **Known** | Status 99. Plain in the text, never reviewed | `KNOWN` |
| **Ignored** | Status 98: names and the like. Plain in the text, never reviewed, earns no XP | `IGNORED` |
| **New** | A word in a text the student has never given a status. Blue in the text | `statusClass` → `st0` |
| **Phrase** | A term of 2 to `MAX_PHRASE` (5) words within one sentence. Longer selections are **sentences**: translated, never saved | `MAX_PHRASE` |
| **Parent** (base word) | The base form a term links to ("went" → "go"), Lute's parent term. Suggested by rules, confirmed by the student | `saved_words.parent`, `src/lib/lemma.ts` |
| **Due** | A learning term whose next review time has passed. Only due cards can be answered | `saved_words.due_at`, `src/lib/srs.ts` |
| **Flashcard review** | Answering a due card: "got it" moves up one status (5 → known), "not yet" goes back to 1 | `review` in `src/lib/srs.ts` |
| **Text** | Something to read. Owned by the school (`owner_id` NULL) or by a student | `texts`, `src/lib/texts.ts` |
| **Visibility** | Who may read a text: `all`, `classes` (linked classes only) or `private` (the owner only) | `VISIBLE` in `src/lib/texts.ts`; who may choose which, and edit: `src/lib/text-policy.ts` |
| **Class** | A group of students an admin manages, joined with a **join code** | `classes`, `class_members` |
| **Class categories** | Categories a class limits its library to (a filter, not a lock) | `class_categories`, `ALLOWED` |
| **XP** | Points for learning actions, from four **sources**: words, reviews, texts, games | `XP` in `src/lib/xp.ts` |
| **Cap** | The most XP one source can pay in one school day | `CAPS` |
| **Daily goal** | The XP a student aims for each day: 10, 20, 30 or 50 | `GOALS` |
| **School day** | A calendar date in the school's time zone (`locale.utcOffset`), not UTC | `localDay` in `src/lib/xp-dates.ts` |
| **Streak** | School days in a row with XP, ending today, or yesterday if today has none yet | `streakFrom` |
| **Leaderboard week** | Monday to Sunday, school time. XP rankings reset every Monday | `weekStart` |
| **Admin** | A teacher account: manages classes, school texts and students. Everyone else is a **student** | `users.role` |
