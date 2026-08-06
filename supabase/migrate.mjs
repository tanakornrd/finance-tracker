// One-off migration: copies every row from the local SQLite database into Supabase (Postgres).
// Run with: node supabase/migrate.mjs
//
// Safety properties this script relies on:
//  - Opens SQLite in readonly mode — physically cannot write back to the source file.
//  - Uses the service_role key (bypasses RLS) only here, only locally, read from .env.
//  - Money columns (*_cents in SQLite) are converted to Postgres numeric(12,2) via exact
//    string construction (see centsToMoneyString below) — never through a JS float division,
//    so no rounding/precision loss is possible during the conversion.
//  - IDs are preserved as-is: the app already generates ids with crypto.randomUUID(), so the
//    same UUID string becomes the Postgres uuid primary key — every foreign key
//    (account_id, to_account_id, recurring_bill_id, transaction_id) stays valid with zero
//    remapping.
//  - Every table's inserted row count is compared against the SQLite source count and printed
//    for verification before the script exits.

import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal .env loader (no dependency on `dotenv` package) — good enough for KEY=VALUE lines.
function loadEnv(file) {
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv(path.join(__dirname, "..", ".env"));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.MIGRATE_USER_ID; // passed explicitly at run time, see bottom

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
if (!USER_ID) {
  console.error("Missing MIGRATE_USER_ID env var — pass the Supabase auth user_id to own every migrated row.");
  process.exit(1);
}

const sqlite = new Database(path.join(__dirname, "..", "data", "finance.db"), { readonly: true });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Exact integer-cents -> decimal-string conversion. No float division anywhere, so e.g.
// 12345 -> "123.45" and -5 -> "-0.05" are both exact, no matter how large the amount.
function centsToMoneyString(cents) {
  if (cents === null || cents === undefined) return null;
  const neg = cents < 0;
  const digits = String(Math.abs(cents)).padStart(3, "0");
  const intPart = digits.slice(0, -2);
  const decPart = digits.slice(-2);
  return (neg ? "-" : "") + intPart + "." + decPart;
}

function bool(v) {
  return v === null || v === undefined ? null : !!v;
}

async function insertBatch(table, rows, sourceCount) {
  if (rows.length === 0) {
    console.log(`${table}: source has 0 rows — nothing to insert, skipping.`);
    return { inserted: 0, sourceCount };
  }
  const { error } = await supabase.from(table).insert(rows);
  if (error) {
    throw new Error(`Insert into ${table} failed: ${error.message}`);
  }
  const { count, error: countErr } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (countErr) throw new Error(`Count check on ${table} failed: ${countErr.message}`);
  console.log(`${table}: inserted ${rows.length} rows. Supabase now has ${count} rows (source had ${sourceCount}).`);
  return { inserted: rows.length, supabaseCount: count, sourceCount };
}

async function main() {
  const results = {};

  // 1) accounts — no FK dependency besides auth.users
  const accounts = sqlite.prepare("SELECT * FROM accounts").all();
  results.accounts = await insertBatch(
    "accounts",
    accounts.map((a) => ({
      id: a.id,
      user_id: USER_ID,
      name: a.name,
      type: a.type,
      balance: centsToMoneyString(a.balance_cents),
      status: a.status,
      interest_rate: a.interest_rate,
      interest_rate_type: a.interest_rate_type,
      monthly_payment: centsToMoneyString(a.monthly_payment_cents),
      due_day: a.due_day,
      is_goal_account: bool(a.is_goal_account),
      is_investment_account: bool(a.is_investment_account),
      target_amount: centsToMoneyString(a.target_amount_cents),
      target_date: a.target_date,
    })),
    accounts.length
  );

  // 2) transactions — references accounts(id)
  const transactions = sqlite.prepare("SELECT * FROM transactions").all();
  results.transactions = await insertBatch(
    "transactions",
    transactions.map((t) => ({
      id: t.id,
      user_id: USER_ID,
      kind: t.kind,
      amount: centsToMoneyString(t.amount_cents),
      category: t.category,
      account_id: t.account_id,
      to_account_id: t.to_account_id,
      date: t.date,
      note: t.note,
      is_installment: bool(t.is_installment),
      installment_info: t.installment_info ? JSON.parse(t.installment_info) : null,
      created_at: t.created_at,
    })),
    transactions.length
  );

  // 3) recurring_bills — references accounts(id)
  const recurringBills = sqlite.prepare("SELECT * FROM recurring_bills").all();
  results.recurring_bills = await insertBatch(
    "recurring_bills",
    recurringBills.map((r) => ({
      id: r.id,
      user_id: USER_ID,
      name: r.name,
      amount: centsToMoneyString(r.amount_cents),
      category: r.category,
      account_id: r.account_id,
      frequency: r.frequency,
      start_date: r.start_date,
      active: bool(r.active),
    })),
    recurringBills.length
  );

  // 4) recurring_bill_occurrences — references recurring_bills(id), transactions(id)
  const occurrences = sqlite.prepare("SELECT * FROM recurring_bill_occurrences").all();
  results.recurring_bill_occurrences = await insertBatch(
    "recurring_bill_occurrences",
    occurrences.map((o) => ({
      id: o.id,
      user_id: USER_ID,
      recurring_bill_id: o.recurring_bill_id,
      due_date: o.due_date,
      status: o.status,
      transaction_id: o.transaction_id,
    })),
    occurrences.length
  );

  // 5) budgets — no FK besides user
  const budgets = sqlite.prepare("SELECT * FROM budgets").all();
  results.budgets = await insertBatch(
    "budgets",
    budgets.map((b) => ({
      id: b.id, // budgets.id is already a UUID (crypto.randomUUID()) same as every other table
      user_id: USER_ID,
      category: b.category,
      monthly_limit: centsToMoneyString(b.monthly_limit_cents),
    })),
    budgets.length
  );

  // 6) savings_goals — no FK besides user
  const savingsGoals = sqlite.prepare("SELECT * FROM savings_goals").all();
  results.savings_goals = await insertBatch(
    "savings_goals",
    savingsGoals.map((g) => ({
      id: g.id,
      user_id: USER_ID,
      name: g.name,
      target_amount: centsToMoneyString(g.target_amount_cents),
      target_date: g.target_date,
      current_amount: centsToMoneyString(g.current_amount_cents),
      status: g.status,
    })),
    savingsGoals.length
  );

  // 7) app_settings — no FK besides user
  const appSettings = sqlite.prepare("SELECT * FROM app_settings").all();
  results.app_settings = await insertBatch(
    "app_settings",
    appSettings.map((s) => ({
      id: crypto.randomUUID(),
      user_id: USER_ID,
      key: s.key,
      value: s.value,
    })),
    appSettings.length
  );

  console.log("\n=== สรุปผลการย้ายข้อมูล ===");
  let allMatch = true;
  for (const [table, r] of Object.entries(results)) {
    const match = (r.supabaseCount ?? 0) === r.sourceCount;
    if (!match) allMatch = false;
    console.log(`${table.padEnd(28)} source=${r.sourceCount}  supabase=${r.supabaseCount ?? 0}  ${match ? "OK" : "MISMATCH!!"}`);
  }
  console.log(allMatch ? "\n✅ ทุกตารางจำนวนแถวตรงกัน" : "\n❌ มีตารางที่จำนวนไม่ตรง — ห้ามไปขั้นถัดไป");
  sqlite.close();
}

main().catch((e) => {
  console.error("Migration failed:", e.message);
  sqlite.close();
  process.exit(1);
});
