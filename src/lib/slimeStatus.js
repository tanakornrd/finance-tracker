// Pure budget-vs-spend math for SlimeEnemy.jsx (Budgets.jsx) — no fetching, no persistence.
// The caller (Budgets.jsx) is responsible for loading the transactions these functions need
// and for actually saving resolveMonthTransition's result via updateSettings (server/app_settings
// — see server/state.js and server/routes/settings.js; no schema change, just two new known
// keys in the existing key/value table).

function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function prevMonthDate(date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function totalBudgetCents(budgets) {
  return budgets.reduce((s, b) => s + b.monthlyLimitCents, 0);
}

// Sums expense transactions for `monthStr` whose category currently has a budget set — matches
// Budgets.jsx's own spentByCategory: only budget-managed categories count, so an unrelated spike
// in an unbudgeted category doesn't move the slime. Uses the CURRENT budgets list even when
// summing a past month, since budgets.monthly_limit is one ongoing cap per category (see
// server/routes/budgets.js), not a historical snapshot — there is no record of what the limit
// used to be, so re-applying today's limit retroactively is the same approximation every
// budgeting app makes here.
export function sumBudgetedSpend(transactions, budgets, monthStr) {
  const budgetedCats = new Set(budgets.map((b) => b.category));
  let total = 0;
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    if (t.date.slice(0, 7) !== monthStr) continue;
    if (!budgetedCats.has(t.category)) continue;
    total += t.amountCents;
  }
  return total;
}

// Called once per app load (Budgets.jsx) to check whether a new month has started since the
// app last looked, and if so, resolve last month's outcome. Returns what changed rather than
// persisting anything itself.
//
//   storedLastSeenMonth / storedCarryOverCents: from settings (null/0 if never set before).
//   prevMonthTransactions: only needed (and only fetched by the caller) when a real
//     month-over-month comparison is possible — see the early-out below.
//
// Returns { changed, carryOverCents, defeated, newLastSeenMonth? }. `changed: false` means
// nothing to save (same month as last check) — the caller should skip its updateSettings call.
export function resolveMonthTransition({ today, budgets, prevMonthTransactions, storedLastSeenMonth, storedCarryOverCents }) {
  const currentMonth = monthKeyOf(today);
  if (storedLastSeenMonth === currentMonth) {
    return { changed: false, carryOverCents: storedCarryOverCents, defeated: false };
  }

  const budgetCents = totalBudgetCents(budgets);
  if (!storedLastSeenMonth || budgetCents <= 0) {
    // Nothing meaningful to resolve: either this is the very first time the app has ever
    // checked (no "last month" to judge), or there are no budgets configured (currently, and
    // as far as this can tell) — either way, no defeat animation, since there was nothing on
    // screen to defeat. Just start/reset tracking from a clean slate.
    return { changed: true, carryOverCents: 0, defeated: false, newLastSeenMonth: currentMonth };
  }

  const prevMonth = monthKeyOf(prevMonthDate(today));
  const prevSpentCents = sumBudgetedSpend(prevMonthTransactions, budgets, prevMonth);
  const wasOverBudget = prevSpentCents > budgetCents;

  if (wasOverBudget) {
    return {
      changed: true,
      carryOverCents: storedCarryOverCents + (prevSpentCents - budgetCents),
      defeated: false,
      newLastSeenMonth: currentMonth,
    };
  }
  return { changed: true, carryOverCents: 0, defeated: true, newLastSeenMonth: currentMonth };
}

// This month's live ratio for SlimeEnemy's size — carried-over debt from unresolved past
// months plus this month's own spend-so-far, against this month's current budget total.
// Returns null when there's nothing to size against (no budgets set), which SlimeEnemy takes
// as "don't show me".
export function computeSlimeRatio({ budgets, thisMonthTransactions, today, carryOverCents }) {
  const budgetCents = totalBudgetCents(budgets);
  if (budgetCents <= 0) return null;
  const monthStr = monthKeyOf(today);
  const spentCents = sumBudgetedSpend(thisMonthTransactions, budgets, monthStr);
  return (carryOverCents + spentCents) / budgetCents;
}
