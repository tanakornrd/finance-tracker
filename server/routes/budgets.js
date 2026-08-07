import { Router } from "express";
import crypto from "node:crypto";
import { parseToCents } from "../../shared/money.js";
import { centsToMoney } from "../moneyConvert.js";
import { EXPENSE_CATEGORY_NAMES } from "../../shared/categories.js";
import { FESTIVAL_SLUGS } from "../../shared/festivals.js";

const router = Router();

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Upsert by category — budgets are one recurring monthly cap per category (per user, see
// supabase/schema.sql's unique(user_id, category)), not per-month rows.
//
// Festival budgets (2026-08-08, ชุด 4.1): a SECOND kind of row in this same table, not a new
// table — distinguished by festivalStartDate/festivalEndDate being present (both, or neither;
// a request with only one of the two is rejected below rather than silently dropped). For a
// festival row, `category` holds one of FESTIVAL_SLUGS (e.g. "songkran") instead of a real
// expense category name — validated against that set instead of EXPENSE_CATEGORY_NAMES. The
// existing unique(user_id, category) constraint doubles as "one budget per festival per user"
// for free, same upsert-by-category logic as the plain case below, no separate code path needed
// for that part.
router.post("/", async (req, res) => {
  const { category, monthlyLimit, festivalStartDate, festivalEndDate } = req.body;

  const isFestival = festivalStartDate != null || festivalEndDate != null;
  if (isFestival) {
    if (!ISO_DATE_RE.test(festivalStartDate) || !ISO_DATE_RE.test(festivalEndDate)) {
      return res.status(400).json({ error: "festivalStartDate and festivalEndDate must both be YYYY-MM-DD" });
    }
    if (festivalEndDate < festivalStartDate) {
      return res.status(400).json({ error: "festivalEndDate must not be before festivalStartDate" });
    }
    if (!category || !FESTIVAL_SLUGS.has(category)) {
      return res.status(400).json({ error: "category must be a known festival slug" });
    }
  } else if (!category || !EXPENSE_CATEGORY_NAMES.has(category)) {
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

  const row = {
    monthly_limit: centsToMoney(limitCents),
    festival_start_date: isFestival ? festivalStartDate : null,
    festival_end_date: isFestival ? festivalEndDate : null,
  };

  const { data: existing } = await req.supabase.from("budgets").select("id").eq("category", category).maybeSingle();
  let id = existing?.id;
  if (existing) {
    const { error } = await req.supabase.from("budgets").update(row).eq("id", existing.id);
    if (error) return res.status(400).json({ error: error.message });
  } else {
    id = crypto.randomUUID();
    const { error } = await req.supabase.from("budgets").insert({ id, user_id: req.userId, category, ...row });
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
