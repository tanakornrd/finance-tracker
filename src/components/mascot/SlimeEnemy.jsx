import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

// Enemy mascot for the "arcade" theme, mounted in Budgets.jsx. Unlike every other mascot in
// this app, its size isn't just responsive to viewport width — it's DATA-driven (how close to
// or over the monthly budget the user is; see src/lib/slimeStatus.js). ".slime-img" in App.jsx
// still defines a normal responsive clamp() range for the breakpoint-based part, and this
// component multiplies that via a CSS custom property (--slime-scale) set inline here — the one
// place in this app where an inline style and an external stylesheet rule cooperate instead of
// one unconditionally overriding the other (every other mascot's sizing is one or the other,
// never both at once, because nothing else needs a continuously-variable size on top of a
// responsive one).
export default function SlimeEnemy({ ratio, defeated }) {
  const { theme, mascotAnimationEnabled } = useTheme();
  if (theme !== "arcade") return null;
  // null ratio means "no budgets set" (see computeSlimeRatio) — nothing to size against, so
  // there's nothing to show, UNLESS a defeat animation is actively playing (the moment budgets
  // get cleared right as a defeat is resolving is an edge case, but finishing the animation
  // that's already started looks better than it cutting off mid-pose).
  if (ratio == null && !defeated) return null;

  // 0.4..1.8 — never fully invisible once budgets exist (a sliver of slime is always on
  // screen, so its GROWTH reads as a signal rather than it just appearing out of nowhere from
  // zero), capped so an extreme overspend can't blow up the layout.
  const scale = Math.max(0.4, Math.min(1.8, 0.4 + (ratio || 0) * 1.2));

  return (
    <div
      className={defeated ? "slime-defeat" : mascotAnimationEnabled ? "slime-idle" : undefined}
      style={{ "--slime-scale": scale, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <img
        src={new URL("../../assets/enemy-slime.png", import.meta.url).href}
        alt=""
        className="slime-img"
        style={{ display: "block", imageRendering: "pixelated" }}
      />
    </div>
  );
}
