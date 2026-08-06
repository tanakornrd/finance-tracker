import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

// Enemy mascot for the "arcade" theme, mounted in Budgets.jsx. Unlike every other mascot in
// this app, its size isn't just responsive to viewport width — it's DATA-driven (how close to
// or over the monthly budget the user is; see src/lib/slimeStatus.js). ".slime-img" in App.jsx
// lays this out at a fixed per-breakpoint MAXIMUM size (same clamp() idiom as every other
// mascot's own -img class) and shrinks it down from there via transform:scale(), driven by a
// CSS custom property (--slime-scale) set inline here as a plain 0..1 fraction of that max —
// the box itself never changes size, so it can never grow into the page title next to it no
// matter the ratio; only the visual scale changes.
export default function SlimeEnemy({ ratio, defeated }) {
  const { theme, mascotAnimationEnabled } = useTheme();
  if (theme !== "arcade") return null;
  // null ratio means "no budgets set" (see computeSlimeRatio) — nothing to size against, so
  // there's nothing to show, UNLESS a defeat animation is actively playing (the moment budgets
  // get cleared right as a defeat is resolving is an edge case, but finishing the animation
  // that's already started looks better than it cutting off mid-pose).
  if (ratio == null && !defeated) return null;

  // 0.3..1 — never fully invisible once budgets exist (a sliver of slime is always on screen,
  // so its GROWTH reads as a signal rather than it just appearing out of nowhere from zero),
  // capped at the full reserved box size (1.0) so an extreme overspend can't blow up the layout.
  const scale = Math.max(0.3, Math.min(1, 0.3 + (ratio || 0) * 0.5));

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
