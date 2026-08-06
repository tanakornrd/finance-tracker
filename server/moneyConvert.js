// Exact integer-cents <-> Postgres numeric(12,2) conversion at the server/Supabase boundary.
// The rest of the app (frontend, shared/money.js) still speaks in integer cents everywhere —
// only these two functions ever touch the baht-decimal representation Postgres stores, so the
// "no rounding, always 2 decimal places" rule only has one place it can be violated.

// cents (integer) -> decimal string, e.g. 12345 -> "123.45", -5 -> "-0.05". Built from string
// digits, never a float division, so it's exact no matter how large the amount.
export function centsToMoney(cents) {
  if (cents === null || cents === undefined) return null;
  const neg = cents < 0;
  const digits = String(Math.abs(cents)).padStart(3, "0");
  return (neg ? "-" : "") + digits.slice(0, -2) + "." + digits.slice(-2);
}

// Postgres numeric(12,2) values arrive over PostgREST as JSON numbers already rounded to 2
// decimal places (e.g. 123.45) — multiplying by 100 and rounding is exact for any value in
// that shape, same guarantee shared/money.js's parseToCents gives on the way in.
export function moneyToCents(value) {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value) * 100);
}
