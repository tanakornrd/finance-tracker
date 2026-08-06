import React, { useMemo } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { computeBudgetInsight } from "../lib/budgetInsight.js";
import { card } from "./sharedStyles.js";
import { HpBar } from "../theme/rpgBars.jsx";
import MageMascot from "./mascot/MageMascot.jsx";
import SlimeEnemy from "./mascot/SlimeEnemy.jsx";

// Arcade-only, same gating convention as WeeklyInsightCard.jsx's THEMES_WITH_INSIGHT — this
// card exists purely to host the mage's advice, so on every other theme it renders nothing
// (not even an empty card), same as WarriorMascot returning null off-theme.
const THEMES_WITH_MAGE = ["arcade"];

// Cycled by budget index so the party reads as a group of distinct enemies rather than clones —
// see SlimeEnemy.jsx's `tint` prop. null (index 0, and every 4th after) keeps the original green
// art untouched; the rest are CSS filters, not separate art assets (there's only one PNG).
const SLIME_TINTS = [
  null,
  "hue-rotate(-100deg) saturate(1.4)", // orange
  "hue-rotate(220deg) saturate(1.5) brightness(1.05)", // pink
  "hue-rotate(150deg) saturate(1.3)", // blue
];

const COLOR_NORMAL = "var(--color-primary)";
const COLOR_WARN = "var(--color-accent)";
const COLOR_OVER = "var(--color-danger)";

// Fixed-size, self-contained (unlike Dashboard's net-worth card + WarriorMascot, this card
// doesn't have to share space with a pre-existing, variable layout) — deliberately placed above
// the budget list rather than beside it, because the list's own height varies with how many
// budgets are set, and a mascot pinned to "beside the list" would drift or get clipped as that
// height changes.
//
// categorySlimeRatios/defeatedCategories: same per-category data Budgets.jsx already computes
// for its own progress list (src/lib/slimeStatus.js) — passed straight through so the slime
// party's SIZE reflects carried-over debt across months, not just this month's spend, matching
// the page-header slime's own behavior.
export default function BudgetMageCard({ budgets, spentByCategory, categorySlimeRatios, defeatedCategories }) {
  const { theme } = useTheme();
  const enabled = THEMES_WITH_MAGE.includes(theme);

  // Cheap enough to not need useEffect/async like weeklyInsight's own fetch — budgets and this
  // month's spend are already loaded by Budgets.jsx for its progress bars, so this is a pure
  // recompute off props already in memory, no extra request.
  const insight = useMemo(() => computeBudgetInsight(budgets, spentByCategory), [budgets, spentByCategory]);

  if (!enabled) return null;

  return (
    <div style={{ ...card, marginBottom: 18 }}>
      {budgets.length > 0 ? (
        // A "vs" formation, not a centered unit like the empty-state below: the mage on the
        // left, the slime party on the right, so the whole row reads left-to-right as "hero
        // facing enemies". alignItems:flex-end keeps the slimes standing on a shared "ground"
        // line with their HP bars; the mage overrides that with alignSelf:center below (his
        // own div, right after this one) since he's sized independently of that ground line.
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div className="budget-mage-mount" style={{ alignSelf: "center" }}>
            <MageMascot message={insight.message} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            {budgets.map((b, i) => {
              const spentCents = spentByCategory[b.category] || 0;
              const pct = Math.min(150, (spentCents / b.monthlyLimitCents) * 100);
              const over = spentCents >= b.monthlyLimitCents;
              const warn = !over && pct >= 80;
              const color = over ? COLOR_OVER : warn ? COLOR_WARN : COLOR_NORMAL;
              return (
                <div
                  key={b.id}
                  // Overlapping, staggered stance ("ยืนซ้อนสลับฟันปลา") — negative marginLeft
                  // after the first slime overlaps each one slightly with the previous, and
                  // alternating translateY zigzags every other one up/down, so the party reads
                  // as a loose crowd rather than a neat row of icons. zIndex follows DOM order
                  // (later slimes drawn on top), which alone is enough for a natural-looking
                  // stack — no extra bookkeeping needed.
                  style={{
                    position: "relative",
                    marginLeft: i === 0 ? 0 : -18,
                    transform: `translateY(${i % 2 === 0 ? 0 : 14}px)`,
                    zIndex: i,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 64,
                  }}
                >
                  <SlimeEnemy
                    variant="party"
                    ratio={categorySlimeRatios[b.category] ?? null}
                    defeated={defeatedCategories.has(b.category)}
                    tint={SLIME_TINTS[i % SLIME_TINTS.length]}
                  />
                  <div style={{ width: "100%", marginTop: 2 }}>
                    <HpBar theme={theme} spentPct={Math.min(100, pct)} color={color} trackColor="var(--color-divider)" label={b.category} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <MageMascot message={insight.message} />
      )}
    </div>
  );
}
