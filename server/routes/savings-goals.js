import { Router } from "express";
import crypto from "node:crypto";
import { getState } from "../state.js";
import { parseToCents } from "../../shared/money.js";
import { centsToMoney } from "../moneyConvert.js";

const router = Router();

router.post("/", async (req, res) => {
  const { name, targetAmount, targetDate, startingAmount } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!targetDate) {
    return res.status(400).json({ error: "targetDate is required" });
  }
  let targetCents, startingCents;
  try {
    targetCents = parseToCents(targetAmount);
    startingCents = startingAmount ? parseToCents(startingAmount) : 0;
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!targetCents || targetCents <= 0) {
    return res.status(400).json({ error: "targetAmount must be a positive number" });
  }
  if (startingCents < 0) {
    return res.status(400).json({ error: "startingAmount cannot be negative" });
  }

  const { error } = await req.supabase.from("savings_goals").insert({
    id: crypto.randomUUID(),
    user_id: req.userId,
    name: name.trim(),
    target_amount: centsToMoney(targetCents),
    target_date: targetDate,
    current_amount: centsToMoney(startingCents),
  });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(await getState(req.supabase));
});

// Handles top-up, editing name/target, and trash/restore — each field is applied
// independently when present so existing callers (e.g. top-up only) keep working. Top-up goes
// through the top_up_savings_goal Postgres function (does current_amount = current_amount +
// amount as one atomic UPDATE) instead of a read-then-write here, so two near-simultaneous
// top-ups can't overwrite each other.
router.patch("/:id", async (req, res) => {
  const { data: goal } = await req.supabase.from("savings_goals").select("*").eq("id", req.params.id).maybeSingle();
  if (!goal) return res.status(404).json({ error: "not found" });

  const { topUpAmount, name, targetAmount, targetDate, status } = req.body;

  if (topUpAmount !== undefined) {
    let topUpCents;
    try {
      topUpCents = parseToCents(topUpAmount);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (!topUpCents || topUpCents <= 0) {
      return res.status(400).json({ error: "topUpAmount must be a positive number" });
    }
    const { error } = await req.supabase.rpc("top_up_savings_goal", {
      p_goal_id: goal.id,
      p_amount: centsToMoney(topUpCents),
    });
    if (error) return res.status(400).json({ error: error.message });
  }

  const patch = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name must not be empty" });
    }
    patch.name = name.trim();
  }
  if (targetAmount !== undefined) {
    let cents;
    try {
      cents = parseToCents(targetAmount);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    if (!cents || cents <= 0) {
      return res.status(400).json({ error: "targetAmount must be a positive number" });
    }
    patch.target_amount = centsToMoney(cents);
  }
  if (targetDate !== undefined) {
    if (!targetDate) return res.status(400).json({ error: "targetDate is required" });
    patch.target_date = targetDate;
  }
  if (status !== undefined) {
    if (status !== "active" && status !== "trashed") {
      return res.status(400).json({ error: "status must be 'active' or 'trashed'" });
    }
    patch.status = status;
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await req.supabase.from("savings_goals").update(patch).eq("id", goal.id);
    if (error) return res.status(400).json({ error: error.message });
  }

  res.json(await getState(req.supabase));
});

// Permanent delete only allowed from the trash — goals must be soft-deleted first.
router.delete("/:id", async (req, res) => {
  const { data: goal } = await req.supabase.from("savings_goals").select("*").eq("id", req.params.id).maybeSingle();
  if (!goal) return res.status(404).json({ error: "not found" });
  if (goal.status !== "trashed") {
    return res.status(400).json({ error: "goal must be trashed before it can be permanently deleted" });
  }
  const { error } = await req.supabase.from("savings_goals").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json(await getState(req.supabase));
});

export default router;
