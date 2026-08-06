import { Router } from "express";
import crypto from "node:crypto";
import { parseToCents } from "../../shared/money.js";
import { centsToMoney } from "../moneyConvert.js";
import { EXPENSE_CATEGORY_NAMES } from "../../shared/categories.js";

const router = Router();

// Upsert by category — budgets are one recurring monthly cap per category (per user, see
// supabase/schema.sql's unique(user_id, category)), not per-month rows.
router.post("/", async (req, res) => {
  const { category, monthlyLimit } = req.body;
  if (!category || !EXPENSE_CATEGORY_NAMES.has(category)) {
    return res.status(400).json({ error: "category must be a known expense category" });
  }
  let limitCents;
  try {
    limitCents = parseToCents(monthlyLimit);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!limitCents || limitCents <= 0) {
    return res.status(400).json({ error: "monthlyLimit must be a positive number" });
  }

  const { data: existing } = await req.supabase.from("budgets").select("id").eq("category", category).maybeSingle();
  let id = existing?.id;
  if (existing) {
    const { error } = await req.supabase.from("budgets").update({ monthly_limit: centsToMoney(limitCents) }).eq("id", existing.id);
    if (error) return res.status(400).json({ error: error.message });
  } else {
    id = crypto.randomUUID();
    const { error } = await req.supabase.from("budgets").insert({
      id,
      user_id: req.userId,
      category,
      monthly_limit: centsToMoney(limitCents),
    });
    if (error) return res.status(400).json({ error: error.message });
  }
  res.status(201).json({ id });
});

router.delete("/:id", async (req, res) => {
  const { data: budget } = await req.supabase.from("budgets").select("id").eq("id", req.params.id).maybeSingle();
  if (!budget) return res.status(404).json({ error: "not found" });
  const { error } = await req.supabase.from("budgets").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
