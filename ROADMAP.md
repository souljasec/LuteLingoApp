# Roadmap

What comes next, in order. Small fixes and the items in the README's "Known gaps" are not repeated here.

## 1. More languages to learn

Today the app teaches English only; each copy chooses the language meanings are shown in (`translateTo` in `src/brand/locale.ts`). Lute, which this app follows, handles many languages, so the plan is to make the **learned** language a setting too: one language pair per copy, e.g. Russian → English or Arabic → Indonesian.

**Order:** Arabic, Russian, Chinese (Mandarin), then other languages as schools ask for them.

### What is tied to English today

| Where | Today | Becomes |
|---|---|---|
| `src/brand/locale.ts` | `translateTo` only | add `learn`: the language code, the speech language (BCP 47, e.g. `ar-SA`), the Tatoeba code |
| `src/pages/api/translate.ts`, `translateHere` in `src/scripts/reader.ts` | source language `en` | `locale.learn` |
| `src/lib/tokenize.ts` | Latin and Vietnamese letters; English abbreviation exceptions | letters and sentence exceptions per language (see below) |
| `src/scripts/reader.ts`, `src/lib/voices.ts` | speech `en-US`, English voices only, `PREFERRED` English voice names | the learned language's voices and defaults |
| `examples()` in `src/scripts/reader.ts` | Tatoeba `lang=eng` | the learned language's Tatoeba code |
| `src/lib/lemma.ts` | English base-word rules | English only; other languages show no suggestions until they have their own rules |
| Seed texts, UI strings about "English" | English | per copy (texts go in via scripts, as copies already do) |

Everything else (levels, colours, flashcards, games, classes, XP) does not depend on the language.

### Per language

| Language | Words | Speech | Notes |
|---|---|---|---|
| **Arabic** | Arabic letters and diacritics (U+0600–U+06FF, U+0750–U+077F); words are space-separated | Built in on iPhone/iPad/Mac and Android; Windows with the Arabic language pack. Desktop Chrome's own online voices have no Arabic, so it uses the system voice | **Right to left**: the reader, the panel and selection need `dir="rtl"` work, not only settings. Texts with diacritics are pronounced better. Not for Quran recitation: speech synthesis does not follow tajwid |
| **Russian** | Cyrillic, incl. ё; abbreviation exceptions such as "т. е.", "г." | Built in on iPhone/iPad/Mac, Android and Windows; Chrome has an online Russian voice too | Words change by case and conjugation, so English-style base-word rules don't apply; leave suggestions off at first |
| **Chinese (Mandarin)** | No spaces between words: needs a word splitter (Lute uses one; `Intl.Segmenter` with `zh` is built into browsers and Workers) | Built in on iPhone/iPad/Mac, Android and Windows; Chrome has online Mandarin voices | Word highlighting during speech may not line up with our word boundaries. Simplified and Traditional are separate choices. Pinyin shown with the meaning would help learners |

**Speech** uses the device's own voices (Web Speech API), so quality and availability depend on the phone or computer. Check each language on a real iPhone, a real Android phone and Windows before release; a voice may need a one-time download in the device's settings.

### Steps

1. `locale.learn` with English as the default, so existing copies change nothing. Tests for English stay as they are.
2. Russian first in code (easiest: spaces, left to right), with unit tests on Russian text: words, sentences, Tatoeba examples, voice choice.
3. Arabic: letters, then right-to-left layout of the reader and panel; check on phones.
4. Chinese: word splitting with `Intl.Segmenter`, then pinyin.
5. Later, only if a school needs it: several learned languages in one copy (a language column on texts and saved words, and a migration).
