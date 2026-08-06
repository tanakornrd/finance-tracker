import { daysInMonth, parseISODate, toISODate } from "./dates.js";

function clampDay(year, month, day) {
  return Math.min(day, daysInMonth(year, month));
}

// bill: { startDate: 'YYYY-MM-DD', frequency: 'once'|'monthly'|'weekly'|'yearly', active }
// rangeStart/rangeEnd: Date objects (inclusive).
// Occurrences are computed on the fly, never pre-generated/stored.
export function getOccurrencesInRange(bill, rangeStart, rangeEnd) {
  if (!bill.active) return [];
  const start = parseISODate(bill.startDate);
  if (start > rangeEnd) return [];

  if (bill.frequency === "once") {
    return start >= rangeStart ? [toISODate(start)] : [];
  }

  const occurrences = [];

  if (bill.frequency === "weekly") {
    // Pure day-of-week arithmetic — no month-end clamping applies here.
    let cursor = start;
    let guard = 0;
    while (guard < 5000) {
      guard++;
      if (cursor > rangeEnd) break;
      if (cursor >= rangeStart) occurrences.push(toISODate(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    }
    return occurrences;
  }

  if (bill.frequency === "monthly" || bill.frequency === "yearly") {
    const anchorDay = start.getDate();
    const stepMonths = bill.frequency === "monthly" ? 1 : 12;
    let y = start.getFullYear();
    let m = start.getMonth();
    let guard = 0;
    while (guard < 2000) {
      guard++;
      // Clamp independently against each target month — never cumulatively — so a bill
      // anchored on the 31st lands on 28/29/30 in short months but back on 31 in long ones.
      const day = clampDay(y, m, anchorDay);
      const candidate = new Date(y, m, day);
      if (candidate > rangeEnd) break;
      if (candidate >= rangeStart) occurrences.push(toISODate(candidate));
      m += stepMonths;
      if (m >= 12) { y += Math.floor(m / 12); m = m % 12; }
    }
    return occurrences;
  }

  return [];
}
