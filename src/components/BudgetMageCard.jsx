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
        // left, the slime party close beside him. translateX(-16px) on the whole row nudges
        // both groups slightly left of dead-center (per feedback — centered read as too far
        // right). alignItems:flex-end anchors the mage and every slime column to the same
        // bottom "ground" line — the mage no longer overrides this with alignSelf:center (an
        // earlier version did; per feedback the slimes need to sit level with him instead, and
        // flex-end naturally guarantees that for every item in the row without needing per-item
        // overrides or manual pixel math).
        // translateX(-40px), not the earlier -16px — the speech bubble to the mage's own left
        // (MageMascot.jsx) adds real width INSIDE his flex item that justifyContent:"center"
        // counts toward the row's total, but that width doesn't read as part of the "mage +
        // slime party" pair visually, so true flex-centering skewed the pair right of the
        // box's actual center. -40px was tuned by eye against that bubble's typical width.
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 40, flexWrap: "wrap", transform: "translateX(-40px)" }}>
          <div className="budget-mage-mount">
            <MageMascot message={insight.message} />
          </div>
          {/* marginBottom (not marginTop) here — see below: the party's own translateY(10px)
              nudges it down slightly past the mage's exact baseline, matching what was actually
              asked for ("a little further down than level"), and this flex row's own
              align-items:flex-end already guarantees the two stay on a shared line otherwise. */}
          <div style={{ display: "flex", alignItems: "flex-end", transform: "translateY(10px)" }}>
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
                  // as a loose crowd rather than a neat row of icons. Both distances shrunk from
                  // the first version (-18/14) to -8/6 per feedback — still overlapping, just
                  // less aggressively. zIndex follows DOM order (later slimes drawn on top),
                  // which alone is enough for a natural-looking stack — no extra bookkeeping
                  // needed.
                  style={{
                    position: "relative",
                    marginLeft: i === 0 ? 0 : -8,
                    transform: `translateY(${i % 2 === 0 ? 0 : 6}px)`,
                    zIndex: i,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: 64,
                  }}
                >
                  {/* HP bar above the slime now (was below) — its own marginBottom replaces the
                      old marginTop that used to sit between the slime and the bar underneath. */}
                  <div style={{ width: "100%", marginBottom: 2 }}>
                    <HpBar theme={theme} spentPct={Math.min(100, pct)} color={color} trackColor="var(--color-divider)" label={b.category} />
                  </div>
                  <SlimeEnemy
                    variant="party"
                    ratio={categorySlimeRatios[b.category] ?? null}
                    defeated={defeatedCategories.has(b.category)}
                    tint={SLIME_TINTS[i % SLIME_TINTS.length]}
                  />
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
