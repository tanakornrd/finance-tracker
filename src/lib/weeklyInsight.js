import { toISODate } from "../../shared/dates.js";
import { centsToDisplay } from "../../shared/money.js";

function addDays(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

function sumByCategory(transactions, fromISO, toISO) {
  const map = {};
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    if (t.date < fromISO || t.date > toISO) continue;
    map[t.category] = (map[t.category] || 0) + t.amountCents;
  }
  return map;
}

// Rolling 7-day windows ending today, compared to the 7 days before that — not calendar weeks
// (Mon–Sun), so there's no ambiguity about where a week "starts" and the comparison is always
// meaningful regardless of what day of the month "today" is.
//
// Picks whichever category moved the most (up or down, by absolute cents) between the two
// windows — that's the one worth a passing comment, not necessarily the biggest spend overall.
export function computeWeeklyInsight(transactions, today = new Date()) {
  const thisWeekFrom = toISODate(addDays(today, -6));
  const thisWeekTo = toISODate(today);
  const lastWeekFrom = toISODate(addDays(today, -13));
  const lastWeekTo = toISODate(addDays(today, -7));

  const thisWeek = sumByCategory(transactions, thisWeekFrom, thisWeekTo);
  const lastWeek = sumByCategory(transactions, lastWeekFrom, lastWeekTo);

  const categories = new Set([...Object.keys(thisWeek), ...Object.keys(lastWeek)]);
  if (categories.size === 0) {
    return { kind: "empty", message: "ยังไม่มีข้อมูลรายจ่ายพอจะเปรียบเทียบ 2 สัปดาห์ล่าสุด" };
  }

  let best = null;
  for (const cat of categories) {
    const deltaCents = (thisWeek[cat] || 0) - (lastWeek[cat] || 0);
    if (!best || Math.abs(deltaCents) > Math.abs(best.deltaCents)) {
      best = { category: cat, deltaCents };
    }
  }

  if (best.deltaCents === 0) {
    return { kind: "neutral", message: "สัปดาห์นี้ใช้จ่ายใกล้เคียงกับสัปดาห์ก่อนในทุกหมวด" };
  }
  if (best.deltaCents > 0) {
    return {
      kind: "up",
      category: best.category,
      deltaCents: best.deltaCents,
      message: `ค่า${best.category}เพิ่มขึ้นจากอาทิตย์ก่อน ${centsToDisplay(best.deltaCents)}`,
    };
  }
  return {
    kind: "down",
    category: best.category,
    deltaCents: best.deltaCents,
    message: `ค่า${best.category}ลดลงจากอาทิตย์ก่อน ${centsToDisplay(Math.abs(best.deltaCents))} เยี่ยมมาก!`,
  };
}
