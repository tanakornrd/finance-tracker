import { Router } from "express";
import { getSettings } from "../state.js";

const router = Router();

router.patch("/", async (req, res) => {
  const { targetSavingsPct, allocationPlan, slimeCarryOverCents, slimeCategoryCarryOver, slimeLastSeenMonth } = req.body;

  if (targetSavingsPct !== undefined) {
    if (targetSavingsPct !== null && (typeof targetSavingsPct !== "number" || !Number.isFinite(targetSavingsPct) || targetSavingsPct < 0 || targetSavingsPct > 100)) {
      return res.status(400).json({ error: "targetSavingsPct must be a number between 0 and 100, or null" });
    }
    if (targetSavingsPct === null) {
      const { error } = await req.supabase.from("app_settings").delete().eq("key", "target_savings_pct");
      if (error) return res.status(400).json({ error: error.message });
    } else {
      const { error } = await req.supabase
        .from("app_settings")
        .upsert({ user_id: req.userId, key: "target_savings_pct", value: String(targetSavingsPct) }, { onConflict: "user_id,key" });
      if (error) return res.status(400).json({ error: error.message });
    }
  }

  if (allocationPlan !== undefined) {
    if (allocationPlan === null) {
      const { error } = await req.supabase.from("app_settings").delete().eq("key", "allocation_plan");
      if (error) return res.status(400).json({ error: error.message });
    } else {
      const { spend, save, invest } = allocationPlan;
      if ([spend, save, invest].some((n) => typeof n !== "number" || !Number.isFinite(n) || n < 0)) {
        return res.status(400).json({ error: "allocationPlan.spend/save/invest must be non-negative numbers" });
      }
      if (Math.round(spend + save + invest) !== 100) {
        return res.status(400).json({ error: "allocationPlan.spend + save + invest must add up to 100" });
      }
      const { error } = await req.supabase
        .from("app_settings")
        .upsert({ user_id: req.userId, key: "allocation_plan", value: JSON.stringify({ spend, save, invest }) }, { onConflict: "user_id,key" });
      if (error) return res.status(400).json({ error: error.message });
    }
  }

  // SlimeEnemy's (src/lib/slimeStatus.js) three settings keys — same app_settings table, no
  // schema change. Written together by Budgets.jsx whenever resolveMonthTransition() detects a
  // new month has started.
  if (slimeCarryOverCents !== undefined) {
    if (slimeCarryOverCents === null) {
      const { error } = await req.supabase.from("app_settings").delete().eq("key", "slime_carry_over_cents");
      if (error) return res.status(400).json({ error: error.message });
    } else {
      if (typeof slimeCarryOverCents !== "number" || !Number.isFinite(slimeCarryOverCents) || slimeCarryOverCents < 0 || !Number.isInteger(slimeCarryOverCents)) {
        return res.status(400).json({ error: "slimeCarryOverCents must be a non-negative integer (cents), or null" });
      }
      const { error } = await req.supabase
        .from("app_settings")
        .upsert({ user_id: req.userId, key: "slime_carry_over_cents", value: String(slimeCarryOverCents) }, { onConflict: "user_id,key" });
      if (error) return res.status(400).json({ error: error.message });
    }
  }

  if (slimeCategoryCarryOver !== undefined) {
    if (slimeCategoryCarryOver === null) {
      const { error } = await req.supabase.from("app_settings").delete().eq("key", "slime_category_carry_over");
      if (error) return res.status(400).json({ error: error.message });
    } else {
      if (typeof slimeCategoryCarryOver !== "object" || Array.isArray(slimeCategoryCarryOver)) {
        return res.status(400).json({ error: "slimeCategoryCarryOver must be an object of category -> cents, or null" });
      }
      for (const [cat, cents] of Object.entries(slimeCategoryCarryOver)) {
        if (typeof cat !== "string" || !cat) {
          return res.status(400).json({ error: "slimeCategoryCarryOver keys must be non-empty category names" });
        }
        if (typeof cents !== "number" || !Number.isFinite(cents) || cents < 0 || !Number.isInteger(cents)) {
          return res.status(400).json({ error: `slimeCategoryCarryOver["${cat}"] must be a non-negative integer (cents)` });
        }
      }
      const { error } = await req.supabase
        .from("app_settings")
        .upsert({ user_id: req.userId, key: "slime_category_carry_over", value: JSON.stringify(slimeCategoryCarryOver) }, { onConflict: "user_id,key" });
      if (error) return res.status(400).json({ error: error.message });
    }
  }

  if (slimeLastSeenMonth !== undefined) {
    if (slimeLastSeenMonth === null) {
      const { error } = await req.supabase.from("app_settings").delete().eq("key", "slime_last_seen_month");
      if (error) return res.status(400).json({ error: error.message });
    } else {
      if (typeof slimeLastSeenMonth !== "string" || !/^\d{4}-\d{2}$/.test(slimeLastSeenMonth)) {
        return res.status(400).json({ error: "slimeLastSeenMonth must be a \"YYYY-MM\" string, or null" });
      }
      const { error } = await req.supabase
        .from("app_settings")
        .upsert({ user_id: req.userId, key: "slime_last_seen_month", value: slimeLastSeenMonth }, { onConflict: "user_id,key" });
      if (error) return res.status(400).json({ error: error.message });
    }
  }

  res.json(await getSettings(req.supabase));
});

export default router;
