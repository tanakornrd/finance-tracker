import { Router } from "express";
import crypto from "node:crypto";
import { parseToCents } from "../../shared/money.js";
import { centsToMoney } from "../moneyConvert.js";
import { EXPENSE_CATEGORY_NAMES } from "../../shared/categories.js";

const router = Router();

const VALID_FREQUENCIES = new Set(["once", "monthly", "weekly", "yearly"]);

router.post("/", async (req, res) => {
  const { name, amount, category, accountId, frequency, startDate } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!VALID_FREQUENCIES.has(frequency)) {
    return res.status(400).json({ error: "frequency must be 'once', 'monthly', 'weekly', or 'yearly'" });
  }
  if (!startDate) {
    return res.status(400).json({ error: "startDate is required" });
  }
  if (category && !EXPENSE_CATEGORY_NAMES.has(category)) {
    return res.status(400).json({ error: "category must be a known expense category" });
  }
  const { data: account } = await req.supabase.from("accounts").select("id").eq("id", accountId).maybeSingle();
  if (!account) {
    return res.status(400).json({ error: "account not found" });
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

  const id = crypto.randomUUID();
  const { error } = await req.supabase.from("recurring_bills").insert({
    id,
    user_id: req.userId,
    name: name.trim(),
    amount: centsToMoney(amountCents),
    category: category || null,
    account_id: accountId,
    frequency,
    start_date: startDate,
    active: true,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ id });
});

// Atomic: creating the transaction (for 'pay') and recording the occurrence must succeed
// together, or a partial failure could leave a paid bill without its "paid" marker (letting it
// be paid twice) — both now happen inside one Postgres function, see
// supabase/functions.sql's pay_or_skip_occurrence.
router.post("/:id/occurrences", async (req, res) => {
  const { dueDate, action } = req.body;
  if (!dueDate) return res.status(400).json({ error: "dueDate is required" });
  if (action !== "pay" && action !== "skip") {
    return res.status(400).json({ error: "action must be 'pay' or 'skip'" });
  }
  const { data: bill } = await req.supabase.from("recurring_bills").select("id").eq("id", req.params.id).maybeSingle();
  if (!bill) return res.status(404).json({ error: "bill not found" });

  const { error } = await req.supabase.rpc("pay_or_skip_occurrence", {
    p_bill_id: req.params.id,
    p_due_date: dueDate,
    p_action: action,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ ok: true });
});

// Removes the recurring bill definition and its paid/skipped markers only — transactions
// already created from past "pay" actions are real money movements and are left untouched.
router.delete("/:id", async (req, res) => {
  const { data: bill } = await req.supabase.from("recurring_bills").select("id").eq("id", req.params.id).maybeSingle();
  if (!bill) return res.status(404).json({ error: "bill not found" });

  const { error } = await req.supabase.rpc("delete_recurring_bill", { p_bill_id: req.params.id });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
