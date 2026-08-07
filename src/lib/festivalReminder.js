// Warrior's "festival coming up" reminder (ชุด 4.3, 2026-08-08) — pure function, same idiom as
// weeklyInsight.js/slimeStatus.js: no fetching, just today + the festival budgets the caller
// already has loaded (Dashboard.jsx, via useReferenceData).
//
// Deliberately only reminds about a festival the user has ALREADY set a budget for (there's no
// hardcoded festival calendar anywhere in this app — สงกรานต์'s "13-15 เม.ย." isn't baked in as
// a constant, และตรุษจีน/lunar dates shift every year anyway) — see Budgets.jsx's own festival
// section for where that date comes from. A festival with no budget set simply never reminds;
// that's the trade-off of not hardcoding dates, not a bug.
import { parseISODate } from "../../shared/dates.js";
import { festivalBySlug } from "../../shared/festivals.js";
import { centsToDisplay } from "../../shared/money.js";

const WARN_DAYS = 7;

// Whole-day difference between `today` and a festival's start date, ignoring time-of-day on
// both sides (a user checking at 23:50 the night before shouldn't see "อีก 0 วัน" flip to
// "อีก -1 วัน" from an off-by-a-few-hours subtraction).
function daysUntil(dateStr, today) {
  const start = parseISODate(dateStr);
  start.setHours(0, 0, 0, 0);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((start.getTime() - todayMidnight.getTime()) / 86400000);
}

// festivalBudgets: budgets.js rows already filtered to festival-type (Budgets.jsx's own
// `festivalBudgets` split — see that file). Returns a single message string, or null when no
// festival is within the WARN_DAYS window (the common case, most days of the year). Picks the
// SOONEST upcoming one if more than one happens to qualify at once, rather than showing two
// messages or picking arbitrarily.
export function computeFestivalReminder(festivalBudgets, today = new Date()) {
  let soonest = null;
  for (const b of festivalBudgets) {
    if (!b.festivalStartDate) continue;
    const days = daysUntil(b.festivalStartDate, today);
    if (days < 0 || days > WARN_DAYS) continue;
    if (soonest == null || days < soonest.days) soonest = { budget: b, days };
  }
  if (!soonest) return null;

  const f = festivalBySlug(soonest.budget.category);
  if (!f) return null; // unknown slug (shouldn't happen) — fail quiet, not a broken message

  const amount = centsToDisplay(soonest.budget.monthlyLimitCents);
  if (soonest.days === 0) return `${f.icon} ${f.name}เริ่มวันนี้แล้วนะ! งบที่ตั้งไว้ ${amount}`;
  return `${f.icon} อีก ${soonest.days} วัน${f.name}จะมาแล้วนะ งบที่ตั้งไว้ ${amount}`;
}
