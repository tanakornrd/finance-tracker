import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

// Enemy mascot for the "arcade" theme, mounted in Budgets.jsx — once as the overall (top-of-
// page) slime, and once per budget row (`compact`) next to that category's own progress bar.
// Unlike every other mascot in this app, its size isn't just responsive to viewport width —
// it's DATA-driven (how close to or over budget the user is; see src/lib/slimeStatus.js).
// ".slime-img"/".slime-img-compact" in App.jsx each lay this out at a fixed MAXIMUM size (the
// compact one small and not viewport-responsive, since it sits inline next to a row rather than
// being a page-level flourish) and shrink it down via transform:scale(), driven by a CSS custom
// property (--slime-scale) set inline here as a plain 0..1 fraction of that max — the box
// itself never changes size, so it can never grow into surrounding text no matter the ratio.
export default function SlimeEnemy({ ratio, defeated, compact }) {
  const { theme, mascotAnimationEnabled } = useTheme();
  if (theme !== "arcade") return null;
  // null ratio means "no budget set for this (or, overall, any) category" — nothing to size
  // against, so there's nothing to show, UNLESS a defeat animation is actively playing (the
  // moment a budget gets cleared right as a defeat is resolving is an edge case, but finishing
  // the animation that's already started looks better than it cutting off mid-pose).
  if (ratio == null && !defeated) return null;

  // 0.3..1 — never fully invisible once a budget exists (a sliver of slime is always on
  // screen, so its GROWTH reads as a signal rather than it just appearing out of nowhere from
  // zero), capped at the full reserved box size (1.0) so an extreme overspend can't blow up
  // the layout.
  const scale = Math.max(0.3, Math.min(1, 0.3 + (ratio || 0) * 0.5));

  return (
    <div
      className={defeated ? "slime-defeat" : mascotAnimationEnabled ? "slime-idle" : undefined}
      style={{ "--slime-scale": scale, pointerEvents: "none", display: "inline-block" }}
      aria-hidden="true"
    >
      <img
        src={new URL("../../assets/enemy-slime.png", import.meta.url).href}
        alt=""
        className={compact ? "slime-img-compact" : "slime-img"}
        style={{ display: "block", imageRendering: "pixelated" }}
      />
    </div>
  );
}
