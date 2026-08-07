import React, { useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { playSound } from "../../lib/sound.js";

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
//
// onClick: optional (RPG party interactions, part 3) — only Budgets.jsx's page-header ("lg")
// instance passes one, opening the SlimeScanModal breakdown. When present this renders as a
// real <button> and a click plays a one-shot "scan" ring pulse before/alongside the modal
// opening (called in the same handler, not delayed). The "party" slimes in BudgetMageCard.jsx
// never pass onClick, so they stay the plain non-interactive <div> exactly as before — no risk
// of the pointer-events bug WarriorMascot/MageMascot hit (see Dashboard.jsx's fix comment): this
// div was ALWAYS pointer-events:none before, only switching to "auto" now when onClick exists,
// and only Budgets.jsx's page-header slime sits in plain flex flow next to plain text (not
// absolutely stacked over another box), so there's nothing for it to be swallowed by.
export default function SlimeEnemy({ ratio, defeated, variant = "lg", tint, onClick }) {
  const { theme, mascotAnimationEnabled, soundEnabled } = useTheme();
  const [scanning, setScanning] = useState(false);
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

  function handleClick() {
    if (soundEnabled) playSound("slimeScan");
    if (mascotAnimationEnabled) {
      // Same re-trigger-on-rapid-clicks trick as every other mascot's click handler.
      setScanning(false);
      requestAnimationFrame(() => setScanning(true));
    }
    onClick();
  }

  const content = (
    <>
      <img
        src={new URL("../../assets/enemy-slime.png", import.meta.url).href}
        alt=""
        className={imgClass}
        // tint: a CSS filter string (hue-rotate/saturate), not a separate art asset — there is
        // only one slime PNG (green); BudgetMageCard.jsx assigns each category slime a
        // different tint so the party reads as a group of distinct enemies, not clones.
        // transitionDuration: "0s" when the toggle is off (2.2, 2026-08-08) — ".slime-img"/
        // ".slime-img-party" (App.jsx) always carry a `transition: transform 0.6s ease` for the
        // data-driven resize, same as every other animation here that's gated by
        // mascotAnimationEnabled; an inline style always wins over a stylesheet rule, so this is
        // what actually turns it off when the toggle is off (prefers-reduced-motion's own
        // override lives in App.jsx's media query, same as the rest, and still applies
        // regardless of this toggle's own state).
        style={{ display: "block", imageRendering: "pixelated", filter: tint || undefined, transitionDuration: mascotAnimationEnabled ? undefined : "0s" }}
      />
      {scanning && <div className="slime-scan-ring" onAnimationEnd={() => setScanning(false)} />}
    </>
  );

  const wrapperClass = [defeated ? "slime-defeat" : mascotAnimationEnabled ? "slime-idle" : undefined, onClick ? "slime-clickable" : undefined]
    .filter(Boolean)
    .join(" ") || undefined;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="สไลม์ กดเพื่อสแกนดูรายละเอียดงบประมาณ"
        className={wrapperClass}
        style={{ "--slime-scale": scale, display: "inline-block", position: "relative", background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={wrapperClass} style={{ "--slime-scale": scale, pointerEvents: "none", display: "inline-block", position: "relative" }} aria-hidden="true">
      {content}
    </div>
  );
}
