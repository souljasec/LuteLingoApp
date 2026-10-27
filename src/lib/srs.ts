// Flashcard scheduling on top of Lute's statuses (a Leitner box per level).
// Level n is next due INTERVAL[n] after it is set; "Got it" moves up a level (5 → known),
// "Not yet" goes back to level 1 and returns in 10 minutes.

import { KNOWN, LEARNING, type Learning, type Status } from './terms.ts';

const DAY = 86_400;
export const INTERVAL: Record<Learning, number> = { 1: 0, 2: 1 * DAY, 3: 3 * DAY, 4: 7 * DAY, 5: 14 * DAY };
const RETRY = 10 * 60;

/** Due time for a status chosen directly (in the reader). Known/ignored are never due. */
export const dueFor = (status: Status, now: number) => (status in INTERVAL ? now + INTERVAL[status as Learning] : 0);

/** Result of a flashcard answer. */
export function review(status: Learning, correct: boolean, now: number): { status: Status; due: number } {
  if (!correct) return { status: 1, due: now + RETRY };
  const next = status + 1;
  return next > LEARNING.at(-1)! ? { status: KNOWN, due: 0 } : { status: next as Learning, due: now + INTERVAL[next as Learning] };
}
