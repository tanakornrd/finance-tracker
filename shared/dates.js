// month is 0-indexed everywhere here (JS Date convention), matching Dashboard.jsx's cursor.

export const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// Indexed like JS Date.getDay(): 0 = Sunday.
export const THAI_WEEKDAYS_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Parses 'YYYY-MM-DD' via manual split into a local-time Date — never `new Date(isoString)`,
// which parses as UTC and can shift a day depending on local offset.
export function parseISODate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Formats a full ISO timestamp (transactions.createdAt — always UTC, from `new Date().toISOString()`
// at insert time) into "6 ส.ค. 2569 14:23:05" — Thai month, Buddhist year, local time, seconds
// included per the spec. Unlike parseISODate above, `new Date(isoString)` is the right way to
// parse this: that gotcha only applies to date-only "YYYY-MM-DD" strings (which JS parses as UTC
// midnight, shifting a day in negative-UTC-offset timezones) — a full timestamp with an explicit
// time and "Z" has no such ambiguity.
export function formatDateTimeThai(isoTimestamp) {
  const d = new Date(isoTimestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Formats a full ISO timestamp (transactions.createdAt) into just the local time "14:23" —
// for inline display in list rows where the date is already shown separately. Same UTC-safe
// parsing as formatDateTimeThai above (full ISO timestamp, not a date-only string).
export function formatTimeThai(isoTimestamp) {
  const d = new Date(isoTimestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Whole calendar months between fromDate and toDate, floored (conservative: undershooting
// months-remaining yields a higher, safer required-per-month figure for savings goals).
export function monthsBetween(fromDate, toDate) {
  let diff = (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
  if (toDate.getDate() < fromDate.getDate()) diff -= 1;
  return diff;
}
