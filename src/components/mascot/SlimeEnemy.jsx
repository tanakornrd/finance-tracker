import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

// Enemy mascot for the "arcade" theme — the overall (page-header) slime in Budgets.jsx, and
// (via `variant="party"`) each category's own slime in BudgetMageCard.jsx, staged opposite the
// mage like a real enemy encounter. Unlike every other mascot in this app, its size isn't just
// responsive to viewport width — it's DATA-driven (how close to or over budget; see
// src/lib/slimeStatus.js). Each variant's own CSS class (App.jsx) lays this out at a fixed
// MAXIMUM box — for "party" specifically, the same max as MageMascot's own ".mage-img", so its
// 0.5 baseline scale (below) reads as "standard size = half the mage" exactly, per how it was
// asked for — and shrinks/grows within that reserved box via transform:scale(), driven by a CSS
// custom property (--slime-scale) set inline here. The box itself never changes size, so it can
// never grow into surrounding content no matter the ratio.
export default function SlimeEnemy({ ratio, defeated, variant = "lg", tint }) {
  const { theme, mascotAnimationEnabled } = useTheme();
  if (theme !== "arcade") return null;
  // null ratio means "no budget set for this (or, overall, any) category" — nothing to size
  // against, so there's nothing to show, UNLESS a defeat animation is actively playing (the
  // moment a budget gets cleared right as a defeat is resolving is an edge case, but finishing
  // the animation that's already started looks better than it cutting off mid-pose).
  if (ratio == null && !defeated) return null;

  // "party" starts at 0.5 (standard size = half the mage) and grows to 1.0 (equal to the mage)
  // as the ratio climbs to/past 1 — a slime that's caught up to its opponent's size reads as
  // the threat it represents. "lg" (the page-header slime) keeps its original 0.3..1 range,
  // unrelated to the mage's size at all.
  const scale =
    variant === "party"
      ? Math.max(0.5, Math.min(1, 0.5 + (ratio || 0) * 0.5))
      : Math.max(0.3, Math.min(1, 0.3 + (ratio || 0) * 0.5));

  const imgClass = variant === "party" ? "slime-img-party" : "slime-img";

  return (
    <div
      className={defeated ? "slime-defeat" : mascotAnimationEnabled ? "slime-idle" : undefined}
      style={{ "--slime-scale": scale, pointerEvents: "none", display: "inline-block" }}
      aria-hidden="true"
    >
      <img
        src={new URL("../../assets/enemy-slime.png", import.meta.url).href}
        alt=""
        className={imgClass}
        // tint: a CSS filter string (hue-rotate/saturate), not a separate art asset — there is
        // only one slime PNG (green); BudgetMageCard.jsx assigns each category slime a
        // different tint so the party reads as a group of distinct enemies, not clones.
        style={{ display: "block", imageRendering: "pixelated", filter: tint || undefined }}
      />
    </div>
  );
}
