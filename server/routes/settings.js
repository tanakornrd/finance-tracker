import { Router } from "express";
import { getSettings } from "../state.js";

const router = Router();

router.patch("/", async (req, res) => {
  const { targetSavingsPct, allocationPlan } = req.body;

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

  res.json(await getSettings(req.supabase));
});

export default router;
