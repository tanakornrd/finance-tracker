// Pure budget-vs-spend math for SlimeEnemy.jsx (Budgets.jsx) — no fetching, no persistence.
// The caller (Budgets.jsx) is responsible for loading the transactions these functions need
// and for actually saving resolveMonthTransition's result via updateSettings (server/app_settings
// — see server/state.js and server/routes/settings.js; no schema change, just three known keys
// in the existing key/value table: an overall carry-over, a per-category carry-over, and the
// last-seen month shared by both).

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

// Same idea as sumBudgetedSpend but for one specific category, used by the per-category slimes.
function sumCategorySpend(transactions, category, monthStr) {
  let total = 0;
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    if (t.category !== category) continue;
    if (t.date.slice(0, 7) !== monthStr) continue;
    total += t.amountCents;
  }
  return total;
}

// Called once per app load (Budgets.jsx) to check whether a new month has started since the
// app last looked, and if so, resolve last month's outcome — both the overall total AND each
// budgeted category independently (a category can be over budget even when the total isn't, if
// another category has slack, and vice versa — these are two genuinely different views, not one
// derived from the other). Returns what changed rather than persisting anything itself.
//
//   storedLastSeenMonth / storedCarryOverCents / storedCategoryCarryOver: from settings
//     (null / 0 / {} respectively if never set before).
//   prevMonthTransactions: only needed (and only fetched by the caller) when a real
//     month-over-month comparison is possible — see the early-out below.
//
// Returns { changed, carryOverCents, categoryCarryOver, defeated, defeatedCategories,
// newLastSeenMonth? }. `changed: false` means nothing to save (same month as last check) — the
// caller should skip its updateSettings call.
export function resolveMonthTransition({ today, budgets, prevMonthTransactions, storedLastSeenMonth, storedCarryOverCents, storedCategoryCarryOver }) {
  const currentMonth = monthKeyOf(today);
  if (storedLastSeenMonth === currentMonth) {
    return { changed: false, carryOverCents: storedCarryOverCents, categoryCarryOver: storedCategoryCarryOver, defeated: false, defeatedCategories: [] };
  }

  const budgetCents = totalBudgetCents(budgets);
  if (!storedLastSeenMonth || budgetCents <= 0) {
    // Nothing meaningful to resolve: either this is the very first time the app has ever
    // checked (no "last month" to judge), or there are no budgets configured (currently, and
    // as far as this can tell) — either way, no defeat animation, since there was nothing on
    // screen to defeat. Just start/reset tracking from a clean slate.
    return { changed: true, carryOverCents: 0, categoryCarryOver: {}, defeated: false, defeatedCategories: [], newLastSeenMonth: currentMonth };
  }

  const prevMonth = monthKeyOf(prevMonthDate(today));
  const prevSpentCents = sumBudgetedSpend(prevMonthTransactions, budgets, prevMonth);
  const wasOverBudget = prevSpentCents > budgetCents;

  const categoryCarryOver = {};
  const defeatedCategories = [];
  for (const b of budgets) {
    const prevCatSpent = sumCategorySpend(prevMonthTransactions, b.category, prevMonth);
    const prevCatCarry = (storedCategoryCarryOver && storedCategoryCarryOver[b.category]) || 0;
    if (prevCatSpent > b.monthlyLimitCents) {
      categoryCarryOver[b.category] = prevCatCarry + (prevCatSpent - b.monthlyLimitCents);
    } else {
      categoryCarryOver[b.category] = 0;
      // Only worth a defeat animation if that category actually had carried-over debt before —
      // a category that was already fine has nothing to "defeat".
      if (prevCatCarry > 0) defeatedCategories.push(b.category);
    }
  }

  if (wasOverBudget) {
    return {
      changed: true,
      carryOverCents: storedCarryOverCents + (prevSpentCents - budgetCents),
      categoryCarryOver,
      defeated: false,
      defeatedCategories,
      newLastSeenMonth: currentMonth,
    };
  }
  return { changed: true, carryOverCents: 0, categoryCarryOver, defeated: true, defeatedCategories, newLastSeenMonth: currentMonth };
}

// This month's live ratio for the overall (top-of-page) SlimeEnemy's size — carried-over debt
// from unresolved past months plus this month's own spend-so-far, against this month's current
// budget total. Returns null when there's nothing to size against (no budgets set), which
// SlimeEnemy takes as "don't show me".
export function computeSlimeRatio({ budgets, thisMonthTransactions, today, carryOverCents }) {
  const budgetCents = totalBudgetCents(budgets);
  if (budgetCents <= 0) return null;
  const monthStr = monthKeyOf(today);
  const spentCents = sumBudgetedSpend(thisMonthTransactions, budgets, monthStr);
  return (carryOverCents + spentCents) / budgetCents;
}

// Same idea as computeSlimeRatio but one ratio per budgeted category, for the small slime next
// to each progress row. Returns a plain { [category]: ratio } map — categories with no limit
// set (shouldn't happen, but budgets are user data) are skipped rather than dividing by zero.
export function computeCategorySlimeRatios({ budgets, thisMonthTransactions, today, categoryCarryOver }) {
  const monthStr = monthKeyOf(today);
  const map = {};
  for (const b of budgets) {
    if (b.monthlyLimitCents <= 0) continue;
    const spentCents = sumCategorySpend(thisMonthTransactions, b.category, monthStr);
    const carryCents = (categoryCarryOver && categoryCarryOver[b.category]) || 0;
    map[b.category] = (carryCents + spentCents) / b.monthlyLimitCents;
  }
  return map;
}
