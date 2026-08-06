// Pure functions only — no fetching, no React. Dashboard.jsx loads the last-30-days
// transaction window once and passes it in here; these just count/rank it. Kept separate so
// each rule (frequent category, frequent account, category→account pairing, frequent amount)
// is independently testable and none of it is tangled into the (already large) form component.

// `days` counts back from `today` inclusive of both ends, matching how a user would describe
// "the last 30 days" — today minus 29 full days.
export function withinLastDays(transactions, today, days) {
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return transactions.filter((t) => t.date >= cutoffStr);
}

// Top categories by *count of uses*, not amount spent — a ฿20,000 rent payment used once
// shouldn't outrank a ฿40 coffee bought fifteen times when the goal is "what do I usually tap".
// Scoped to a single kind (expense/income each have their own category list) since a category
// valid for one is meaningless as a quick-pick for the other.
export function mostFrequentCategories(transactions, kind, limit = 5) {
  const counts = new Map();
  for (const t of transactions) {
    if (t.kind !== kind || !t.category) continue;
    counts.set(t.category, (counts.get(t.category) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category);
}

// Top accounts by count of uses across both legs of a transaction (accountId, and toAccountId
// for transfers/repayments) — using an account to receive a transfer counts as "using" it just
// as much as spending from it does. `allowedIds`, if given, restricts results to accounts that
// are actually valid to pick for the current form state (e.g. debt accounts only make sense as
// an expense target, not an income destination) — computed the same way the existing dropdowns
// already filter their own options, so a quick-pick button never offers something the dropdown
// itself wouldn't.
export function mostFrequentAccounts(transactions, limit = 3, allowedIds = null) {
  const counts = new Map();
  for (const t of transactions) {
    if (t.accountId) counts.set(t.accountId, (counts.get(t.accountId) || 0) + 1);
    if (t.toAccountId) counts.set(t.toAccountId, (counts.get(t.toAccountId) || 0) + 1);
  }
  const allowed = allowedIds ? new Set(allowedIds) : null;
  return [...counts.entries()]
    .filter(([id]) => !allowed || allowed.has(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

// The account most often paired with a given category — used to auto-fill the account field the
// moment a category is picked (item 4). Returns null (leave the field alone) if the category has
// never been used in the window at all, rather than guessing.
export function mostFrequentAccountForCategory(transactions, category) {
  if (!category) return null;
  const counts = new Map();
  for (const t of transactions) {
    if (t.category !== category || !t.accountId) continue;
    counts.set(t.accountId, (counts.get(t.accountId) || 0) + 1);
  }
  let best = null, bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) { best = id; bestCount = count; }
  }
  return best;
}

// Top exact amounts by count — "exact" means compared in cents, never rounded, so ฿50.00 and
// ฿50.50 are always counted separately no matter how close they are.
export function mostFrequentAmounts(transactions, limit = 5, minCount = 2) {
  const counts = new Map();
  for (const t of transactions) {
    if (!t.amountCents) continue;
    counts.set(t.amountCents, (counts.get(t.amountCents) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([amountCents]) => amountCents);
}
