# Roadmap

What comes next, in order. Small fixes and the items in the README's "Known gaps" are not repeated here.

## 1. Language profiles: learn more than English

Today the app teaches English only; each copy chooses the language meanings are shown in (`translateTo` in `src/brand/locale.ts`). Lute, which this app follows, handles many languages. The plan: each student picks the language they are learning, and everything they do is kept per language.

### How profiles work

- **Choosing:** Settings → "I'm learning: English / Español / Français / …", plus a quick switch at the top of the library. The choice is saved on the account, like the interface language.
- **Per language:** texts, saved words and their levels, flashcards, games, "continue reading" and word counts. A student learning English and Spanish has two separate word lists.
- **Per account (shared):** XP, the daily goal, the streak and the weekly leaderboard, so switching language never breaks a streak.
- **Per copy:** which learned languages a school offers (e.g. English only, or English and Arabic), and the language meanings are shown in (`translateTo`, as today).
- **Classes:** a class has one language; its dashboard and texts are for that language.
- **Existing data:** a migration marks every current text and saved word as English, so students and schools lose nothing and see no change until a copy offers a second language.

### Data

| Table | Change |
|---|---|
| `texts` | `lang` column (default `'en'`); the library shows texts in the student's current language |
| `saved_words` | `lang` column; the unique key becomes (user, lang, term), since one spelling can be a word in two languages |
| `users` | `learning` column: the current profile |
| `classes` | `lang` column |
| `translation_cache` | key includes the source language |
| `activity`, `progress` | no change (XP is per account; progress is per text, and texts have a language) |

New migrations start in this repo, as always, so numbering stays the same in every copy.

### What is tied to English today

| Where | Today | Becomes |
|---|---|---|
| `src/brand/locale.ts` | `translateTo` only | add `offers`: the learned languages this copy allows |
| `src/lib/languages.ts` (new, pure) | | one entry per language: code, letters, sentence exceptions, speech language (BCP 47), Tatoeba code, direction, word splitting |
| `src/pages/api/translate.ts`, `translateHere` in `src/scripts/reader.ts` | source language `en` | the text's language |
| `src/lib/tokenize.ts` | Latin and Vietnamese letters; English abbreviation exceptions | letters and exceptions from the language entry |
| `src/scripts/reader.ts`, `src/lib/voices.ts` | speech `en-US`, English voices only, English `PREFERRED` names | the language entry's speech language and voices |
| `examples()` in `src/scripts/reader.ts` | Tatoeba `lang=eng` | the language entry's Tatoeba code |
| `src/lib/lemma.ts` | English base-word rules | English only; other languages show no suggestions until they have their own rules |
| UI strings that say "English" | English | the profile's language name |

Everything else (levels, colours, flashcards, games, XP) does not depend on the language.

### Languages, in order

| Group | Languages | Work per language |
|---|---|---|
| **1. Almost free** | Spanish, French, German, Portuguese, Italian, Dutch, Turkish, Indonesian/Malay, Russian, Ukrainian | words are space-separated, left to right: add the alphabet's letters and common abbreviations, check the device voices. Good speech on all devices, many Tatoeba examples |
| **2. A little work** | Vietnamese, Korean, Hindi | space-separated, but Vietnamese words often span several syllables and Korean attaches particles to words: reading works, saved words are less precise |
| **3. Right to left** | Arabic, then Hebrew, Persian, Urdu | `dir="rtl"` for the reader, the panel and selection, done once for Arabic; the others then cost little. Arabic: texts with diacritics are pronounced better; speech synthesis is for learning texts, not Quran recitation (it does not follow tajwid) |
| **4. No spaces** | Chinese (Mandarin), Japanese, Thai | word splitting with `Intl.Segmenter` (built into browsers and Workers); pinyin for Chinese and furigana for Japanese would help learners; word highlighting during speech may not line up exactly |

**Speech** uses the device's own voices (Web Speech API), so quality depends on the phone or computer. Arabic, Russian, Chinese and the group-1 languages are built into iPhone/iPad/Mac and Android, and into Windows with the language pack; desktop Chrome's own online voices cover most of group 1, Russian and Chinese, but not Arabic. Check each language on a real iPhone, Android phone and Windows before release; some voices need a one-time download in the device's settings.

### Texts

Texts for each language come from the owner when development starts. As for English: only texts that are free to publish go into this repo (no copyrighted texts, see `CLAUDE.md`); a copy's own texts go in through scripts, not migrations.

### Steps

1. **Profiles with English only:** the `lang` columns and migration, `src/lib/languages.ts` with the English entry, Settings and library switch hidden while a copy offers one language. Existing copies see no change. All current tests keep passing.
2. **Group 1, starting with Spanish, French and German:** a language entry and unit tests each (words, sentences, voice choice, Tatoeba examples), then the owner's texts. A copy offering a second language shows the switch.
3. **Arabic:** right-to-left layout; check on phones.
4. **Chinese:** word splitting, then pinyin.
5. **The rest** of groups 2–4 as schools ask for them.
