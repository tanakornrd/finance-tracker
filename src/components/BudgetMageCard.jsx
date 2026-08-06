import React, { useMemo } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { computeBudgetInsight } from "../lib/budgetInsight.js";
import { card } from "./sharedStyles.js";
import MageMascot from "./mascot/MageMascot.jsx";

// Arcade-only, same gating convention as WeeklyInsightCard.jsx's THEMES_WITH_INSIGHT — this
// card exists purely to host the mage's advice, so on every other theme it renders nothing
// (not even an empty card), same as WarriorMascot returning null off-theme.
const THEMES_WITH_MAGE = ["arcade"];

// Fixed-size, self-contained (unlike Dashboard's net-worth card + WarriorMascot, this card
// doesn't have to share space with a pre-existing, variable layout) — deliberately placed above
// the budget list rather than beside it, because the list's own height varies with how many
// budgets are set, and a mascot pinned to "beside the list" would drift or get clipped as that
// height changes.
export default function BudgetMageCard({ budgets, spentByCategory }) {
  const { theme } = useTheme();
  const enabled = THEMES_WITH_MAGE.includes(theme);

  // Cheap enough to not need useEffect/async like weeklyInsight's own fetch — budgets and this
  // month's spend are already loaded by Budgets.jsx for its progress bars, so this is a pure
  // recompute off props already in memory, no extra request.
  const insight = useMemo(() => computeBudgetInsight(budgets, spentByCategory), [budgets, spentByCategory]);

  if (!enabled) return null;

  return (
    <div style={{ ...card, marginBottom: 18 }}>
      <MageMascot message={insight.message} />
    </div>
  );
}
