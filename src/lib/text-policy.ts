// Who may edit a text, what the edit form may set, and who owns the result. Pure: the edit page
// does the queries and passes in what these decisions need.
import type { Key } from './i18n.ts';

type Who = { id: number; role: 'student' | 'admin' };
export type Visibility = 'all' | 'classes' | 'private';
export type TextForm = { title: string; body: string; visibility: string; classIds: number[]; category: string; level: number };

export const MAX_BODY = 20_000; // characters
export const MAX_OWN_TEXTS = 200; // per student (THREATS.md D2)

/** Students edit only their own texts. Admins also edit school texts and students' class-shared ones (never private). */
export const canEdit = (user: Who, t: { owner_id: number | null; visibility: string }) =>
  t.owner_id === user.id || (user.role === 'admin' && (t.owner_id === null || t.visibility === 'classes'));

/** Audiences the user may choose, the default first. Only admins publish to everyone. */
export const visibilityOptions = (isAdmin: boolean): readonly Visibility[] => (isAdmin ? ['all', 'classes', 'private'] : ['private', 'classes']);

/**
 * The edit form as values to save. `classIds` are the classes this user may share with.
 * `foreign`: an admin moderating a student's shared text, where only content changes and
 * the audience stays `current`.
 */
export function parseTextForm(
  f: URLSearchParams | FormData,
  ctx: { visibility: readonly Visibility[]; classIds: Set<number>; foreign: boolean; current: { visibility: string; classIds: number[] } },
): TextForm {
  let { visibility, classIds } = ctx.current;
  if (!ctx.foreign) {
    const chosen = String(f.get('visibility') ?? '');
    visibility = (ctx.visibility as readonly string[]).includes(chosen) ? chosen : ctx.visibility[0];
    classIds = f.getAll('class').map(Number).filter((c) => ctx.classIds.has(c));
  }
  return {
    title: String(f.get('title') ?? '').trim().slice(0, 200),
    body: String(f.get('body') ?? '').replace(/\r\n/g, '\n').trim(),
    visibility,
    classIds,
    category: String(f.get('category') ?? '').trim().slice(0, 40),
    // Level is optional for everyone (0 = not set), so students can tag their own texts too.
    level: Math.min(3, Math.max(0, Number(f.get('level')) || 0)),
  };
}

/** The first problem with a text, or null. `ownTexts` counts only for a student's new text. */
export function textError(
  v: Pick<TextForm, 'title' | 'body' | 'visibility' | 'classIds'>,
  ctx: { isNew: boolean; isAdmin: boolean; ownTexts: number },
): Key | null {
  if (!v.title) return 'texts.errTitle';
  if (!v.body) return 'texts.errBody';
  if (v.body.length > MAX_BODY) return 'texts.errLong';
  if (v.visibility === 'classes' && v.classIds.length === 0) return 'texts.errClasses';
  if (ctx.isNew && !ctx.isAdmin && ctx.ownTexts >= MAX_OWN_TEXTS) return 'texts.errTooMany';
  return null;
}

/**
 * Owner of the saved text: admin texts for everyone or classes belong to the school (null),
 * private ones to their author. `moderatedOwner` is the student whose text an admin is moderating.
 */
export const ownerFor = (user: Who, visibility: string, moderatedOwner: number | null) =>
  moderatedOwner ?? (user.role === 'admin' && visibility !== 'private' ? null : user.id);
