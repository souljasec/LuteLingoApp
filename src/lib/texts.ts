import { env } from 'cloudflare:workers';
import { statusSql, type Status } from './terms.ts';

const S = statusSql();

export type TextRow = { id: number; title: string; body: string; owner_id: number | null; visibility: string; category: string; level: number };

/**
 * The one visibility rule. A user may read a text if it is for everyone, linked to one of
 * their classes, or their own. Admins read every school text but not students' private ones.
 * Every text query goes through this.
 */
const VISIBLE = `(
  (?1 = 'admin' AND t.visibility != 'private')
  OR t.visibility = 'all'
  OR t.owner_id = ?2
  OR (t.visibility = 'classes' AND EXISTS (
    SELECT 1 FROM text_classes tc JOIN class_members cm ON cm.class_id = tc.class_id
    WHERE tc.text_id = t.id AND cm.user_id = ?2))
)`;

/**
 * Library filter by class categories (not a lock: direct links still open). A text for
 * everyone shows unless every class the student is in limits categories and none allows it.
 * No subquery mentions `t`, so SQLite runs each once per query, not once per text (~4× fewer rows read).
 */
const ALLOWED = `(
  ?1 = 'admin' OR t.visibility != 'all' OR t.owner_id IS NOT NULL
  OR NOT EXISTS (SELECT 1 FROM class_members cm WHERE cm.user_id = ?2)
  OR EXISTS (SELECT 1 FROM class_members cm WHERE cm.user_id = ?2
    AND NOT EXISTS (SELECT 1 FROM class_categories cc WHERE cc.class_id = cm.class_id))
  OR t.category IN (SELECT cc.category FROM class_members cm JOIN class_categories cc ON cc.class_id = cm.class_id WHERE cm.user_id = ?2)
)`;

export async function listTexts(user: User) {
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.title, t.owner_id, t.visibility, t.category, t.level, length(t.body) AS chars, p.opened_at, p.finished_at
     FROM texts t LEFT JOIN progress p ON p.text_id = t.id AND p.user_id = ?2
     WHERE ${VISIBLE} AND ${ALLOWED} ORDER BY t.id DESC`,
  )
    .bind(user.role, user.id)
    .all<{ id: number; title: string; owner_id: number | null; visibility: string; category: string; level: number; chars: number; opened_at: number | null; finished_at: number | null }>();
  return results;
}

export async function getText(user: User, id: number) {
  return env.DB.prepare(`SELECT t.* FROM texts t WHERE t.id = ?3 AND ${VISIBLE}`)
    .bind(user.role, user.id, id)
    .first<TextRow>();
}

export async function markOpened(user: User, textId: number) {
  // opened_at = last opened, so the library's "continue" card shows the text read most recently.
  await env.DB.prepare('INSERT INTO progress (user_id, text_id) VALUES (?, ?) ON CONFLICT (user_id, text_id) DO UPDATE SET opened_at = unixepoch()')
    .bind(user.id, textId)
    .run();
}

/** True the first time a text earns its finishing XP for this user (then never again). */
export async function firstReward(user: User, textId: number) {
  const r = await env.DB.prepare(
    `INSERT INTO progress (user_id, text_id, rewarded) VALUES (?1, ?2, 1)
     ON CONFLICT (user_id, text_id) DO UPDATE SET rewarded = 1 WHERE progress.rewarded = 0`,
  )
    .bind(user.id, textId)
    .run();
  return (r.meta.changes ?? 0) > 0;
}

export async function getProgress(user: User, textId: number) {
  return env.DB.prepare('SELECT finished_at FROM progress WHERE user_id = ? AND text_id = ?')
    .bind(user.id, textId)
    .first<{ finished_at: number | null }>();
}

export type Term = { t: string; s: Status; p?: string }; // translation, status, parent term

/**
 * The user's terms relevant to a text: every single word that occurs in it, plus all their
 * multi-word terms (matched against the text by findPhrases).
 */
export async function termsFor(user: User, words: string[]) {
  const out: Record<string, Term> = {};
  const unique = [...new Set(words)];
  type Row = { term: string; translation: string; status: Status; parent: string };
  const add = ({ results }: { results: Row[] }) => {
    for (const r of results) out[r.term] = r.parent ? { t: r.translation, s: r.status, p: r.parent } : { t: r.translation, s: r.status };
  };
  // D1 caps bound parameters per query, so look up in chunks.
  const queries = [];
  for (let i = 0; i < unique.length; i += 90) {
    const chunk = unique.slice(i, i + 90);
    queries.push(
      env.DB.prepare(
        `SELECT term, translation, status, parent FROM saved_words WHERE user_id = ? AND term IN (${chunk.map(() => '?').join(',')})`,
      ).bind(user.id, ...chunk),
    );
  }
  queries.push(env.DB.prepare("SELECT term, translation, status, parent FROM saved_words WHERE user_id = ? AND term LIKE '% %'").bind(user.id));
  for (const r of await env.DB.batch<Row>(queries)) add(r);
  // Parents of these terms ("go" for "went"), so the sheet can show their meaning.
  const parents = [...new Set(Object.values(out).flatMap((x) => (x.p && !out[x.p] ? [x.p] : [])))].slice(0, 90);
  if (parents.length) {
    add(
      await env.DB.prepare(
        `SELECT term, translation, status, parent FROM saved_words WHERE user_id = ? AND term IN (${parents.map(() => '?').join(',')})`,
      )
        .bind(user.id, ...parents)
        .all<Row>(),
    );
  }
  return out;
}

/** Counts for the stats header: known, learning, and learning terms due for review. */
export async function termCounts(user: User) {
  return (await env.DB.prepare(
    `SELECT sum(${S.known}) AS known, sum(${S.learning}) AS learning,
       sum(${S.learning} AND due_at <= unixepoch()) AS due
     FROM saved_words WHERE user_id = ?`,
  )
    .bind(user.id)
    .first<{ known: number | null; learning: number | null; due: number | null }>())!;
}
