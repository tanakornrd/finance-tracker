import { toISODate } from "../../shared/dates.js";

// Hard cap on how far back computeStreak ever counts — not a fetch window: Transactions.jsx
// passes its own already-fetched full transaction history straight in (no separate request, no
// separate table — a streak is fully derivable from transaction dates already in the
// `transactions` table). 120 days is far more than any realistic daily-logging streak; if the
// real streak runs longer than that, this undercounts (see computeStreak's `capped` return
// field) rather than looping indefinitely or silently pretending 120 is exact.
export const STREAK_WINDOW_DAYS = 120;

function addDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

// transactions: any array of objects with a `.date` field ("YYYY-MM-DD") — Transactions.jsx
// passes its own fetched rows straight through, kind doesn't matter (income/expense/repay all
// count as "logged something that day").
// today: injectable for testing; defaults to the real today.
//
// Counts consecutive logged days walking backward from today. If today itself has no entry yet,
// that's not treated as a broken streak (someone genuinely mid-day just hasn't logged today's
// spending yet) — walking starts from yesterday instead in that one case, so a streak stays
// intact until a full day is actually missed.
export function computeStreak(transactions, today = new Date()) {
  const loggedDates = new Set(transactions.map((t) => t.date));

  let cursor = today;
  if (!loggedDates.has(toISODate(today))) {
    cursor = addDays(today, -1);
  }

  let streak = 0;
  while (streak < STREAK_WINDOW_DAYS && loggedDates.has(toISODate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return { days: streak, capped: streak >= STREAK_WINDOW_DAYS };
}
