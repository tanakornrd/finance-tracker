import { moneyToCents } from "./moneyConvert.js";

export function rowToAccount(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balanceCents: moneyToCents(row.balance),
    status: row.status,
    interestRate: row.interest_rate,
    interestRateType: row.interest_rate_type,
    monthlyPaymentCents: moneyToCents(row.monthly_payment),
    dueDay: row.due_day,
    isGoalAccount: !!row.is_goal_account,
    isInvestmentAccount: !!row.is_investment_account,
    targetAmountCents: moneyToCents(row.target_amount),
    targetDate: row.target_date,
  };
}

export function rowToTx(row) {
  return {
    id: row.id,
    kind: row.kind,
    amountCents: moneyToCents(row.amount),
    category: row.category,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    date: row.date,
    note: row.note || "",
    isInstallment: !!row.is_installment,
    installmentInfo: row.installment_info || null, // jsonb column — already a parsed object
    // null for every row migrated from before this column existed — deliberately not backfilled.
    createdAt: row.created_at || null,
  };
}

export function rowToBudget(row) {
  return {
    id: row.id,
    category: row.category,
    monthlyLimitCents: moneyToCents(row.monthly_limit),
  };
}

function rowToSavingsGoal(row) {
  return {
    id: row.id,
    name: row.name,
    targetAmountCents: moneyToCents(row.target_amount),
    targetDate: row.target_date,
    currentAmountCents: moneyToCents(row.current_amount),
    status: row.status,
  };
}

export function rowToRecurringBill(row) {
  return {
    id: row.id,
    name: row.name,
    amountCents: moneyToCents(row.amount),
    category: row.category,
    accountId: row.account_id,
    frequency: row.frequency,
    startDate: row.start_date,
    active: !!row.active,
  };
}

export function rowToOccurrence(row) {
  return {
    id: row.id,
    recurringBillId: row.recurring_bill_id,
    dueDate: row.due_date,
    status: row.status,
    transactionId: row.transaction_id,
  };
}

// Throws with Postgres/PostgREST's own error message on failure, same shape every route
// handler already expects to catch (see e.g. accounts.js).
function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data || [];
}

// key/value settings (savings-rate target, spend/save/invest allocation plan, SlimeEnemy's
// month-to-month budget state), one row per key per user (see supabase/schema.sql's
// app_settings, unique(user_id, key)) — parsed here into the shapes the client actually wants.
// Unset keys default to null so the UI can show its own "not configured yet" state.
//
// slime_carry_over_cents / slime_category_carry_over / slime_last_seen_month are three more
// keys in this same existing table, added for the arcade theme's SlimeEnemy mascot
// (src/lib/slimeStatus.js) — no schema change, app_settings already stores arbitrary key/value
// pairs per user. slime_category_carry_over holds one JSON object (category name -> carried-
// over cents), same "one value, one JSON blob" idiom as allocation_plan above, rather than one
// app_settings row per category — categories are dynamic (whatever budgets exist), so a single
// key avoids having to track/clean up per-category rows as budgets are added or removed.
export async function getSettings(supabase) {
  const rows = unwrap(await supabase.from("app_settings").select("key, value"));
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const targetSavingsPct = map.target_savings_pct != null ? Number(map.target_savings_pct) : null;
  let allocationPlan = null;
  if (map.allocation_plan) {
    try {
      allocationPlan = JSON.parse(map.allocation_plan);
    } catch {
      allocationPlan = null;
    }
  }
  const slimeCarryOverCents = map.slime_carry_over_cents != null ? Number(map.slime_carry_over_cents) : 0;
  const slimeLastSeenMonth = map.slime_last_seen_month || null;
  let slimeCategoryCarryOver = {};
  if (map.slime_category_carry_over) {
    try {
      slimeCategoryCarryOver = JSON.parse(map.slime_category_carry_over);
    } catch {
      slimeCategoryCarryOver = {};
    }
  }
  return { targetSavingsPct, allocationPlan, slimeCarryOverCents, slimeCategoryCarryOver, slimeLastSeenMonth };
}

// Bounded, low-churn data used across almost every page (account balances, budget caps,
// recurring bill definitions) — small regardless of how much transaction history piles up,
// so unlike getState() this is safe to load eagerly on every page without re-fetching it
// per route. Deliberately excludes `transactions` (unbounded, fetched per-route/date-range
// instead) and `savings_goals` (superseded by goal accounts — see Overview.jsx).
export async function getReferenceData(supabase) {
  const [accountsRows, budgetsRows, billsRows, occRows, settings] = await Promise.all([
    supabase.from("accounts").select("*").then(unwrap),
    supabase.from("budgets").select("*").then(unwrap),
    supabase.from("recurring_bills").select("*").then(unwrap),
    supabase.from("recurring_bill_occurrences").select("*").then(unwrap),
    getSettings(supabase),
  ]);

  return {
    accounts: accountsRows.map(rowToAccount),
    budgets: budgetsRows.map(rowToBudget),
    recurringBills: billsRows.map(rowToRecurringBill),
    recurringBillOccurrences: occRows.map(rowToOccurrence),
    settings,
  };
}

export async function getState(supabase) {
  const [accountsRows, txRows, budgetsRows, goalsRows, billsRows, occRows] = await Promise.all([
    supabase.from("accounts").select("*").then(unwrap),
    supabase.from("transactions").select("*").order("date", { ascending: false }).then(unwrap),
    supabase.from("budgets").select("*").then(unwrap),
    supabase.from("savings_goals").select("*").then(unwrap),
    supabase.from("recurring_bills").select("*").then(unwrap),
    supabase.from("recurring_bill_occurrences").select("*").then(unwrap),
  ]);

  return {
    accounts: accountsRows.map(rowToAccount),
    transactions: txRows.map(rowToTx),
    recurringBills: billsRows.map(rowToRecurringBill),
    recurringBillOccurrences: occRows.map(rowToOccurrence),
    budgets: budgetsRows.map(rowToBudget),
    savingsGoals: goalsRows.map(rowToSavingsGoal),
  };
}
