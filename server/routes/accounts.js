import { Router } from "express";
import crypto from "node:crypto";
import { parseToCents } from "../../shared/money.js";
import { centsToMoney } from "../moneyConvert.js";

const router = Router();

router.post("/", async (req, res) => {
  const { name, type, targetAmount, targetDate } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (type !== "asset" && type !== "debt" && type !== "goal" && type !== "investment") {
    return res.status(400).json({ error: "type must be 'asset', 'debt', 'goal', or 'investment'" });
  }

  // 'goal' is stored as a flagged asset account — savings goals are real accounts whose
  // balance only moves via transfers in, not a separate tracker disconnected from money.
  if (type === "goal") {
    if (!targetDate) return res.status(400).json({ error: "targetDate is required for a goal account" });
    let targetCents;
    try {
      targetCents = parseToCents(targetAmount);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (!targetCents || targetCents <= 0) {
      return res.status(400).json({ error: "targetAmount must be a positive number" });
    }
    const id = "goal-" + crypto.randomUUID();
    const { error } = await req.supabase.from("accounts").insert({
      id,
      user_id: req.userId,
      name: name.trim(),
      type: "asset",
      balance: 0,
      is_goal_account: true,
      target_amount: centsToMoney(targetCents),
      target_date: targetDate,
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ id });
  }

  // 'investment' is the same pattern as 'goal': a flagged asset account, funded by ordinary
  // transfers, but open-ended — no target amount/date, since it's a bucket, not a savings goal.
  if (type === "investment") {
    const id = "inv-" + crypto.randomUUID();
    const { error } = await req.supabase.from("accounts").insert({
      id,
      user_id: req.userId,
      name: name.trim(),
      type: "asset",
      balance: 0,
      is_investment_account: true,
    });
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ id });
  }

  const id = "acc-" + crypto.randomUUID();
  const { error } = await req.supabase.from("accounts").insert({
    id,
    user_id: req.userId,
    name: name.trim(),
    type,
    balance: 0,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ id });
});

router.patch("/:id", async (req, res) => {
  const { data: account } = await req.supabase.from("accounts").select("*").eq("id", req.params.id).maybeSingle();
  if (!account) return res.status(404).json({ error: "account not found" });

  const { name, status, interestRate, interestRateType, monthlyPayment, dueDay, targetAmount, targetDate } = req.body;
  const patch = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name must not be empty" });
    }
    patch.name = name.trim();
  }
  if (status !== undefined) {
    if (status !== "active" && status !== "trashed") {
      return res.status(400).json({ error: "status must be 'active' or 'trashed'" });
    }
    patch.status = status;
  }

  const debtFieldsTouched =
    interestRate !== undefined || interestRateType !== undefined || monthlyPayment !== undefined || dueDay !== undefined;
  if (debtFieldsTouched && account.type !== "debt") {
    return res.status(400).json({ error: "interestRate/interestRateType/monthlyPayment/dueDay only apply to debt accounts" });
  }

  if (interestRate !== undefined) {
    if (interestRate !== null && (typeof interestRate !== "number" || !Number.isFinite(interestRate) || interestRate < 0)) {
      return res.status(400).json({ error: "interestRate must be a non-negative number or null" });
    }
    patch.interest_rate = interestRate;
  }
  if (interestRateType !== undefined) {
    if (interestRateType !== null && interestRateType !== "monthly" && interestRateType !== "yearly") {
      return res.status(400).json({ error: "interestRateType must be 'monthly', 'yearly', or null" });
    }
    patch.interest_rate_type = interestRateType;
  }
  if (monthlyPayment !== undefined) {
    let cents = null;
    if (monthlyPayment !== null) {
      try {
        cents = parseToCents(monthlyPayment);
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
      if (cents < 0) return res.status(400).json({ error: "monthlyPayment must not be negative" });
    }
    patch.monthly_payment = cents !== null ? centsToMoney(cents) : null;
  }
  if (dueDay !== undefined) {
    if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
      return res.status(400).json({ error: "dueDay must be an integer between 1 and 31, or null" });
    }
    patch.due_day = dueDay;
  }

  const goalFieldsTouched = targetAmount !== undefined || targetDate !== undefined;
  if (goalFieldsTouched && !account.is_goal_account) {
    return res.status(400).json({ error: "targetAmount/targetDate only apply to goal accounts" });
  }
  if (targetAmount !== undefined) {
    let cents;
    try {
      cents = parseToCents(targetAmount);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (!cents || cents <= 0) return res.status(400).json({ error: "targetAmount must be a positive number" });
    patch.target_amount = centsToMoney(cents);
  }
  if (targetDate !== undefined) {
    if (!targetDate) return res.status(400).json({ error: "targetDate is required" });
    patch.target_date = targetDate;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await req.supabase.from("accounts").update(patch).eq("id", req.params.id);
    if (error) return res.status(400).json({ error: error.message });
  }
  res.json({ ok: true });
});

// Permanent delete only allowed from the trash — accounts must be soft-deleted first. The
// actual cascade (recurring bills + their occurrences, every touching transaction, then the
// account itself) runs as one atomic Postgres function — see
// supabase/functions_part2.sql's permanently_delete_account — instead of separate requests
// from here, so a crash partway through can't leave orphaned rows or a mismatched balance.
router.delete("/:id", async (req, res) => {
  const { data: account } = await req.supabase.from("accounts").select("id").eq("id", req.params.id).maybeSingle();
  if (!account) return res.status(404).json({ error: "account not found" });

  const { error } = await req.supabase.rpc("permanently_delete_account", { p_account_id: req.params.id });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
