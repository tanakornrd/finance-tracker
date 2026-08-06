// SUPERSEDED as of the 2026-08-06 Supabase migration — server/index.js no longer imports this
// file, and nothing in the running app touches data/finance.db anymore (the app now talks to
// Supabase/Postgres via server/supabaseClient.js). Left in place deliberately, unmodified, as
// the read-only reference copy of the pre-migration data per the migration's ground rules —
// do not delete data/finance.db or this file until the Supabase migration is fully verified.
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "finance.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'debt')),
    balance_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trashed')),
    interest_rate REAL CHECK (interest_rate >= 0),
    interest_rate_type TEXT CHECK (interest_rate_type IN ('monthly', 'yearly')),
    monthly_payment_cents INTEGER CHECK (monthly_payment_cents >= 0),
    due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
    is_goal_account INTEGER NOT NULL DEFAULT 0,
    target_amount_cents INTEGER CHECK (target_amount_cents >= 0),
    target_date TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'repay')),
    amount_cents INTEGER NOT NULL,
    category TEXT,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    to_account_id TEXT REFERENCES accounts(id),
    date TEXT NOT NULL,
    note TEXT,
    is_installment INTEGER NOT NULL DEFAULT 0,
    installment_info TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tx_account_date ON transactions(account_id, date);
  CREATE INDEX IF NOT EXISTS idx_tx_to_account ON transactions(to_account_id);

  CREATE TABLE IF NOT EXISTS recurring_bills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    category TEXT,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    frequency TEXT NOT NULL CHECK (frequency IN ('once', 'monthly', 'weekly', 'yearly')),
    start_date TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS recurring_bill_occurrences (
    id TEXT PRIMARY KEY,
    recurring_bill_id TEXT NOT NULL REFERENCES recurring_bills(id),
    due_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('paid', 'skipped')),
    transaction_id TEXT REFERENCES transactions(id),
    UNIQUE(recurring_bill_id, due_date)
  );

  CREATE TRIGGER IF NOT EXISTS trg_tx_delete_clears_occurrence
  AFTER DELETE ON transactions
  BEGIN
    DELETE FROM recurring_bill_occurrences WHERE transaction_id = OLD.id;
  END;

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL UNIQUE,
    monthly_limit_cents INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount_cents INTEGER NOT NULL,
    target_date TEXT NOT NULL,
    current_amount_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trashed'))
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// SQLite has no "ADD COLUMN IF NOT EXISTS" — check table_info first so this migration is
// safe to re-run on every startup, same as the CREATE TABLE IF NOT EXISTS statements above.
const accountColumns = db.prepare("PRAGMA table_info(accounts)").all().map((c) => c.name);
if (!accountColumns.includes("is_investment_account")) {
  db.exec("ALTER TABLE accounts ADD COLUMN is_investment_account INTEGER NOT NULL DEFAULT 0");
}

// created_at: full timestamp (not just the existing `date` column, which is calendar-date-only
// and stays untouched/still drives every daily/monthly rollup) — added purely so the UI can show
// exactly when a row was entered and so "the most recent transaction" (used by the "จดซ้ำจาก
// รายการล่าสุด" quick-entry feature) has a real answer. Existing rows are intentionally left
// NULL rather than backfilled with a guessed time — see server/routes/transactions.js's
// `/latest` route for how NULLs there are still ordered sensibly.
const txColumns = db.prepare("PRAGMA table_info(transactions)").all().map((c) => c.name);
if (!txColumns.includes("created_at")) {
  db.exec("ALTER TABLE transactions ADD COLUMN created_at TEXT");
}

const seedCount = db.prepare("SELECT COUNT(*) AS n FROM accounts").get().n;
if (seedCount === 0) {
  db.prepare("INSERT INTO accounts (id, name, type, balance_cents) VALUES (?, ?, ?, ?)").run(
    "cash",
    "เงินสด",
    "asset",
    0
  );
}
