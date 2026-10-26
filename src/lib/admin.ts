import { env } from 'cloudflare:workers';

export type StudentRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  last_active_at: number | null;
  created_at: number;
  opened: number;
  finished: number;
  known: number;
  learning: number;
};

// One row per user with their progress counts. `where` narrows it (e.g. to a class).
const STUDENTS = `
  SELECT u.id, u.name, u.email, u.role, u.last_active_at, u.created_at,
    (SELECT count(*) FROM progress p WHERE p.user_id = u.id) AS opened,
    (SELECT count(*) FROM progress p WHERE p.user_id = u.id AND p.finished_at IS NOT NULL) AS finished,
    (SELECT count(*) FROM saved_words w WHERE w.user_id = u.id AND w.status = 99) AS known,
    (SELECT count(*) FROM saved_words w WHERE w.user_id = u.id AND w.status BETWEEN 1 AND 5) AS learning
  FROM users u`;

export async function studentsInClass(classId: number) {
  const { results } = await env.DB.prepare(
    `${STUDENTS} JOIN class_members cm ON cm.user_id = u.id WHERE cm.class_id = ? ORDER BY u.name`,
  )
    .bind(classId)
    .all<StudentRow>();
  return results;
}

export async function allStudents() {
  const { results } = await env.DB.prepare(`${STUDENTS} ORDER BY u.last_active_at DESC NULLS LAST, u.name`).all<StudentRow>();
  return results;
}

export async function student(id: number) {
  return env.DB.prepare(`${STUDENTS} WHERE u.id = ?`).bind(id).first<StudentRow>();
}

export const fmtDate = (ts: number | null, lang: string) =>
  ts ? new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(ts * 1000) : null;
