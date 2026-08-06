// Money is always stored/passed as an integer count of satang (cents).
// Never derive cents via `parseFloat(x) * 100` — binary floats can't
// represent most decimals exactly (19.99 * 100 = 1998.9999999999998),
// so parsing goes through the decimal string directly instead.

const AMOUNT_RE = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export function parseToCents(input) {
  const str = String(input).trim();
  const match = AMOUNT_RE.exec(str);
  if (!match) {
    throw new Error(`invalid amount: "${input}" (expected a number with at most 2 decimal places)`);
  }
  const [, sign, intPart, fracPartRaw] = match;
  const fracPart = (fracPartRaw || "").padEnd(2, "0");
  const cents = Number(intPart) * 100 + Number(fracPart);
  return sign === "-" ? -cents : cents;
}

function splitCents(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const intPart = Math.floor(abs / 100);
  const fracPart = String(abs % 100).padStart(2, "0");
  return { sign, intPart, fracPart };
}

// Display formatter: grouped thousands + currency sign, e.g. "฿1,234.56" / "-฿42.00"
export function centsToDisplay(cents) {
  const { sign, intPart, fracPart } = splitCents(cents);
  return `${sign}฿${intPart.toLocaleString("en-US")}.${fracPart}`;
}

// Plain formatter for CSV/machine use: no grouping, no currency sign, e.g. "1234.56"
export function centsToPlain(cents) {
  const { sign, intPart, fracPart } = splitCents(cents);
  return `${sign}${intPart}.${fracPart}`;
}
