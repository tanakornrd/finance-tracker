import { Router } from "express";
import { rowToTx } from "../state.js";
import { parseToCents } from "../../shared/money.js";
import { centsToMoney } from "../moneyConvert.js";
import { ALL_CATEGORY_NAMES } from "../../shared/categories.js";

const router = Router();

// Scoped query for a route's own use — a date range (Dashboard/Overview/Budgets), a single
// account (AccountDetail), or neither (Transactions.jsx, which searches/exports full history).
router.get("/", async (req, res) => {
  const { from, to, accountId } = req.query;
  let q = req.supabase.from("transactions").select("*").order("date", { ascending: false });
  if (from) q = q.gte("date", from);
  if (to) q = q.lte("date", to);
  if (accountId) q = q.or(`account_id.eq.${accountId},to_account_id.eq.${accountId}`);
  const { data, error } = await q;
  if (error) return res.status(400).json({ error: error.message });
  res.json((data || []).map(rowToTx));
});

// Registered before "/:id" — Express matches path segments literally before params, but only
// if the literal route is declared first, so this has to stay above the "/:id" handler below or
// a request for "/latest" would instead hit "/:id" with id="latest".
router.get("/latest", async (req, res) => {
  // created_at is NULL for every row migrated in from before that column existed, so
  // nullsFirst: false pushes those to the very end regardless of sort order — "most recent"
  // among rows that actually have a timestamp, which every row inserted through this app now
  // always does (see insert_transaction in supabase/functions.sql).
  const { data, error } = await req.supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);
  if (error) return res.status(400).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: "no transactions yet" });
  res.json(rowToTx(data[0]));
});

router.get("/:id", async (req, res) => {
  const { data, error } = await req.supabase.from("transactions").select("*").eq("id", req.params.id).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "not found" });
  res.json(rowToTx(data));
});

router.post("/", async (req, res) => {
  const { kind, amount, accountId, date, category, toAccountId, isInstallment, installmentInfo, note } = req.body;
  if (!["income", "expense", "repay", "transfer"].includes(kind)) {
    return res.status(400).json({ error: "invalid kind" });
  }

  let amountCents;
  try {
    amountCents = parseToCents(amount);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!amountCents || amountCents <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }
  if (!accountId || !date) {
    return res.status(400).json({ error: "accountId and date are required" });
  }
  if ((kind === "repay" || kind === "transfer") && !toAccountId) {
    return res.status(400).json({ error: "toAccountId is required for repay/transfer" });
  }
  if (kind !== "repay" && kind !== "transfer" && category && !ALL_CATEGORY_NAMES.has(category)) {
    return res.status(400).json({ error: "unknown category" });
  }
  if (isInstallment && kind !== "expense") {
    return res.status(400).json({ error: "isInstallment only applies to expenses" });
  }

  // insert_transaction (supabase/functions.sql) does the row insert AND the account balance
  // update(s) as one atomic Postgres transaction — see that file's header comment for why.
  const { data, error } = await req.supabase.rpc("insert_transaction", {
    p_kind: kind,
    p_amount: centsToMoney(amountCents),
    p_category: kind === "repay" || kind === "transfer" ? null : category || null,
    p_account_id: accountId,
    p_to_account_id: toAccountId || null,
    p_date: date,
    p_note: note || "",
    p_is_installment: !!isInstallment,
    p_installment_info: isInstallment ? installmentInfo || {} : null,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ id: data });
});

router.delete("/:id", async (req, res) => {
  const { data: tx } = await req.supabase.from("transactions").select("id").eq("id", req.params.id).maybeSingle();
  if (!tx) return res.status(404).json({ error: "not found" });

  const { error } = await req.supabase.rpc("delete_transaction", { p_tx_id: req.params.id });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// Editing a row's amount/account/date-relevant fields means its old balance effect has to be
// undone and the new one applied — handled inside edit_transaction (supabase/functions.sql) as
// one atomic step, not a separate reverse-then-apply from here. kind itself is never edited
// (TransactionDetail.jsx's edit form doesn't offer it).
router.patch("/:id", async (req, res) => {
  const { data: tx } = await req.supabase.from("transactions").select("*").eq("id", req.params.id).maybeSingle();
  if (!tx) return res.status(404).json({ error: "not found" });

  const { amount, category, accountId, date, note } = req.body;

  let amountMoney = null;
  if (amount !== undefined) {
    let cents;
    try {
      cents = parseToCents(amount);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (!cents || cents <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }
    amountMoney = centsToMoney(cents);
  }
  if (category !== undefined) {
    if (tx.kind === "repay") return res.status(400).json({ error: "repay/transfer rows have no category" });
    if (category && !ALL_CATEGORY_NAMES.has(category)) return res.status(400).json({ error: "unknown category" });
  }
  if (accountId !== undefined && !accountId) return res.status(400).json({ error: "accountId must not be empty" });
  if (date !== undefined && !date) return res.status(400).json({ error: "date must not be empty" });

  const { error } = await req.supabase.rpc("edit_transaction", {
    p_tx_id: req.params.id,
    p_amount: amountMoney,
    p_category: category !== undefined ? category : null,
    p_account_id: accountId !== undefined ? accountId : null,
    p_date: date !== undefined ? date : null,
    p_note: note !== undefined ? note : null,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

// Bulk import from a parsed statement (ImportStatement.jsx). Every row is validated up front;
// inserts then run one at a time via insert_transaction (each individually atomic). If one
// fails partway through the batch, every row already inserted in this batch is rolled back via
// delete_transaction before returning the error — best-effort equivalent of the single
// db.transaction() SQLite used to wrap the whole batch in.
router.post("/import", async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "rows must be a non-empty array" });
  }

  const prepared = [];
  for (let i = 0; i < rows.length; i++) {
    const { kind, amount, accountId, date, category, note } = rows[i];
    if (kind !== "income" && kind !== "expense") {
      return res.status(400).json({ error: `row ${i + 1}: kind must be 'income' or 'expense'` });
    }
    let amountCents;
    try {
      amountCents = parseToCents(amount);
    } catch (e) {
      return res.status(400).json({ error: `row ${i + 1}: ${e.message}` });
    }
    if (!amountCents || amountCents <= 0) {
      return res.status(400).json({ error: `row ${i + 1}: amount must be a positive number` });
    }
    if (!accountId || !date) {
      return res.status(400).json({ error: `row ${i + 1}: accountId and date are required` });
    }
    if (category && !ALL_CATEGORY_NAMES.has(category)) {
      return res.status(400).json({ error: `row ${i + 1}: unknown category` });
    }
    prepared.push({ kind, amountMoney: centsToMoney(amountCents), accountId, date, category: category || null, note: note || "" });
  }

  const insertedIds = [];
  for (const row of prepared) {
    const { data, error } = await req.supabase.rpc("insert_transaction", {
      p_kind: row.kind,
      p_amount: row.amountMoney,
      p_category: row.category,
      p_account_id: row.accountId,
      p_to_account_id: null,
      p_date: row.date,
      p_note: row.note,
      p_is_installment: false,
      p_installment_info: null,
    });
    if (error) {
      for (const id of insertedIds) {
        await req.supabase.rpc("delete_transaction", { p_tx_id: id }).catch(() => {});
      }
      return res.status(400).json({ error: error.message });
    }
    insertedIds.push(data);
  }
  res.status(201).json({ ids: insertedIds });
});

export default router;
