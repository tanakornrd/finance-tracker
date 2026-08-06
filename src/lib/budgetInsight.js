import { centsToDisplay } from "../../shared/money.js";

// Same idea as weeklyInsight.js's computeWeeklyInsight — one function, pure, taking data the
// caller already has (Budgets.jsx computes both `budgets` and `spentByCategory` for its own
// progress bars) and returning a single { kind, message } for MageMascot's speech bubble to
// show as-is. Kept separate from weeklyInsight.js since the inputs and priority rules are
// unrelated (budget limits vs. week-over-week deltas), not a shared concept.
//
// Priority order (worst news first — over budget is the one thing worth interrupting for; once
// nothing is on fire, praise is more useful than a neutral status line):
//   1. any category over its limit -> warn about the worst overage
//   2. any category close to its limit (>=80%) -> warn about the closest one
//   3. otherwise the category with the most headroom -> praise it
//   4. no budgets set at all -> prompt to set one
export function computeBudgetInsight(budgets, spentByCategory) {
  if (!budgets || budgets.length === 0) {
    return { kind: "empty", message: "ยังไม่ได้ตั้งงบประมาณเลยนะ ลองตั้งดูสิ จะได้ช่วยคุมค่าใช้จ่ายให้" };
  }

  const rows = budgets.map((b) => {
    const spentCents = spentByCategory[b.category] || 0;
    return { category: b.category, spentCents, limitCents: b.monthlyLimitCents, pct: spentCents / b.monthlyLimitCents };
  });

  const overRows = rows.filter((r) => r.pct >= 1);
  if (overRows.length > 0) {
    const worst = overRows.reduce((a, b) => (b.spentCents - b.limitCents > a.spentCents - a.limitCents ? b : a));
    return {
      kind: "over",
      category: worst.category,
      message: `ใช้เกินงบ${worst.category}ไปแล้ว ${centsToDisplay(worst.spentCents - worst.limitCents)}`,
    };
  }

  const warnRows = rows.filter((r) => r.pct >= 0.8);
  if (warnRows.length > 0) {
    const closest = warnRows.reduce((a, b) => (b.pct > a.pct ? b : a));
    return {
      kind: "warn",
      category: closest.category,
      message: `ใกล้เกินงบ${closest.category}แล้วนะ ใช้ไป ${Math.round(closest.pct * 100)}% แล้ว`,
    };
  }

  // Most headroom = lowest pct — praise whichever category is best under control, not just
  // whichever has the biggest raw limit.
  const best = rows.reduce((a, b) => (b.pct < a.pct ? b : a));
  return {
    kind: "safe",
    category: best.category,
    message: `${best.category}ยังเหลืออีก ${centsToDisplay(best.limitCents - best.spentCents)} คุมได้ดีมาก!`,
  };
}
