import { toISODate, parseISODate, daysInMonth } from "../../shared/dates.js";
import { centsToDisplay } from "../../shared/money.js";

const THAI_WEEKDAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]; // JS Date#getDay() order (0 = Sunday)

function sumExpenseByCategory(transactions, fromISO, toISO) {
  const map = {};
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    if (t.date < fromISO || t.date > toISO) continue;
    map[t.category] = (map[t.category] || 0) + t.amountCents;
  }
  return map;
}

// Month-to-date, not full-calendar-month — comparing "1st through today" of each month, not
// "all of last month" vs "however much of this month has happened so far", which would always
// read as a huge drop no matter what actually changed (this month necessarily has fewer days of
// spending logged than a completed month did). Categories with no spending in the prior period
// are skipped (a % change from zero isn't a meaningful "swing", just "first time"), same
// reasoning weeklyInsight.js doesn't have to deal with since it compares two full 7-day windows.
export function computeCategoryMonthComparison(transactions, today = new Date()) {
  const day = today.getDate();
  const thisMonthFrom = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  const thisMonthTo = toISODate(today);

  const lastMonthRef = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthFrom = toISODate(lastMonthRef);
  // min(day, daysInLastMonth) — e.g. comparing through "Feb 30" would silently roll into March;
  // clamping to the last month's own length keeps the comparison window the same length or
  // shorter, never longer, than this month's.
  const lastMonthToDay = Math.min(day, daysInMonth(lastMonthRef.getFullYear(), lastMonthRef.getMonth()));
  const lastMonthTo = toISODate(new Date(lastMonthRef.getFullYear(), lastMonthRef.getMonth(), lastMonthToDay));

  const thisMonth = sumExpenseByCategory(transactions, thisMonthFrom, thisMonthTo);
  const lastMonth = sumExpenseByCategory(transactions, lastMonthFrom, lastMonthTo);

  let best = null;
  for (const category of Object.keys(thisMonth)) {
    const prev = lastMonth[category];
    if (!prev) continue; // no baseline to compare against — skip, don't report a fake "+∞%"
    const pct = ((thisMonth[category] - prev) / prev) * 100;
    if (!best || Math.abs(pct) > Math.abs(best.pct)) best = { category, pct };
  }
  if (!best || Math.round(best.pct) === 0) return null;

  const dir = best.pct > 0 ? "เพิ่มขึ้น" : "ลดลง";
  return `${best.category}${dir} ${Math.abs(Math.round(best.pct))}% เทียบกับช่วงเดียวกันของเดือนก่อน`;
}

// fromDate/toDate: the actual fetched window (SafeToSpendCard.jsx passes the same 120-day range
// it fetched transactions for) — occurrences are counted across every day in that real window,
// not just days that happen to have a transaction, so "average spend on a Monday" means what it
// says (total Monday spending / number of Mondays in the window), not "average spend among the
// Mondays where something happened to be logged."
export function computeWorstWeekday(transactions, fromDate, toDate) {
  const totals = new Array(7).fill(0);
  const occurrences = new Array(7).fill(0);

  for (const cursor = new Date(fromDate); cursor <= toDate; cursor.setDate(cursor.getDate() + 1)) {
    occurrences[cursor.getDay()] += 1;
  }
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    const d = parseISODate(t.date);
    if (d < fromDate || d > toDate) continue;
    totals[d.getDay()] += t.amountCents;
  }

  let bestIdx = -1;
  let bestAvg = 0;
  for (let i = 0; i < 7; i++) {
    if (occurrences[i] === 0) continue;
    const avg = totals[i] / occurrences[i];
    if (avg > bestAvg) {
      bestAvg = avg;
      bestIdx = i;
    }
  }
  if (bestIdx === -1) return null;

  return `วัน${THAI_WEEKDAYS[bestIdx]}มักใช้จ่ายเฉลี่ยสูงสุด ประมาณ ${centsToDisplay(Math.round(bestAvg))}/ครั้ง`;
}

// Simple linear projection, exactly as asked for: (spend so far / days elapsed) * days remaining,
// added to what's already been spent — not a trend/regression model, just an average-pace
// estimate. Only expense transactions count (income/transfers don't belong in a "spending
// forecast"). Returns null on day 1 (no "so far" to average yet — an estimate from a single
// day's spending, or from zero, isn't a forecast worth showing).
export function computeMonthEndForecast(transactions, today = new Date()) {
  const day = today.getDate();
  if (day < 2) return null;

  const totalDays = daysInMonth(today.getFullYear(), today.getMonth());
  const monthFrom = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  const todayISO = toISODate(today);

  const spentSoFar = transactions
    .filter((t) => t.kind === "expense" && t.date >= monthFrom && t.date <= todayISO)
    .reduce((sum, t) => sum + t.amountCents, 0);
  if (spentSoFar === 0) return null;

  const avgDaily = spentSoFar / day;
  const forecastCents = Math.round(spentSoFar + avgDaily * (totalDays - day));

  return `คาดว่าสิ้นเดือนนี้จะใช้จ่ายรวมประมาณ ${centsToDisplay(forecastCents)} (จากอัตราเฉลี่ยที่ใช้อยู่)`;
}

// Combines all three into whichever ones were actually computable — SafeToSpendCard.jsx rotates
// through the result. Order matters a little (roughly "most actionable first") but since the
// caller rotates through all of them on a timer, it's not load-bearing.
export function computeMageInsights(transactions, fromDate, toDate, today = new Date()) {
  return [
    computeCategoryMonthComparison(transactions, today),
    computeWorstWeekday(transactions, fromDate, toDate),
    computeMonthEndForecast(transactions, today),
  ].filter(Boolean);
}
