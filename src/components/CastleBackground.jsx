import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

const wallImg = new URL("../assets/backgrounds/castle_layer1_far.png", import.meta.url).href;
const floorImg = new URL("../assets/backgrounds/castle_layer2_near.png", import.meta.url).href;

// Dungeon/castle backdrop for the "arcade" theme.
//
// 2026-08-08: the wall/window/banner/torch pieces that used to be hand-drawn CSS+SVG are now two
// real art layers the user supplied (src/assets/backgrounds) — replaced, not layered on top of
// the old ones, since the art already depicts the same things (window, banners, torches) and
// having both would double up. Night sky/stars/moon/dark-overlay stay exactly as before; those
// aren't things the new art replaces, they're the open sky the wall sits in front of.
//
//  1. Night sky gradient, full height (unchanged — see the layers below for why this stays tall
//     while the two art images are each a fixed-size band).
//  2. Star field + moon glow (unchanged).
//  3. layer1_far.png — the far wall (window, banners, torches baked into the art itself, no
//     separate CSS glow needed for them anymore). Sits at the very top, same spot the old CSS
//     wall band occupied — scrolls away with the page on a long scroll, same as before.
//  4. layer2_near.png — pillars + floor, transparent in the middle. Unlike every other layer
//     here, this one is `position: fixed` to the viewport's bottom edge (same idiom as
//     BottomNav.jsx), not absolute within the scrollable page — it's the "near" layer, meant to
//     stay in view framing the bottom of the screen the whole time you're on this page, not
//     scroll away like the far wall does. The transparent middle means it never actually covers
//     any card/number no matter how the page scrolls.
//  5. Flat dark overlay — same contrast guarantee as before, still last so it dims the art layers
//     exactly like it used to dim the hand-drawn ones.
// maxWidth: 900 on both art layers keeps them looking like a mobile-scaled castle band even on
// wide desktop windows, instead of stretching to app-container's full (up to 1400px) width and
// looking oversized/blurry.
export default function CastleBackground() {
  const { theme } = useTheme();
  if (theme !== "arcade") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        // Negative, not 0 — see the note this always had: a positioned z-index:0 layer paints
        // *above* normal-flow content per CSS stacking rules, so this needs to be negative to
        // stay behind every card (and depends on ".app-container" having its own explicit
        // z-index — see App.jsx — or this escapes further up than intended).
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* 1. Night sky */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, var(--castle-sky-top) 0%, var(--castle-sky-bottom) 100%)" }} />

      {/* 2. Stars + moon glow — fixed positions (not random) so they don't reshuffle on
          re-render, clustered in the top band that's always in view on load. */}
      <StarField />
      <div style={{ position: "absolute", top: 4, left: "42%", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, var(--castle-moon-glow) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: 22, left: "46%", width: 26, height: 26, borderRadius: "50%", background: "var(--castle-moon)", boxShadow: "inset -6px -2px 0 rgba(0,0,0,0.15)" }} />

      {/* 3. Far wall art */}
      <img
        src={wallImg}
        alt=""
        style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 900, height: "auto", display: "block" }}
      />

      {/* 4. Near pillars/floor art — fixed to the viewport bottom, not the scrollable page. */}
      <img
        src={floorImg}
        alt=""
        style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 900, height: "auto", display: "block" }}
      />

      {/* 5. Dark overlay — the actual contrast guarantee. Everything above this exists only to
          be seen through it. */}
      <div style={{ position: "absolute", inset: 0, background: "var(--castle-overlay)" }} />
    </div>
  );
}

// Fixed (not Math.random) positions/delays so stars don't reshuffle on every re-render — small
// pixel squares rather than circles to stay in the blocky 8-bit idiom the rest of the theme uses.
const STAR_POSITIONS = [
  { top: 10, left: "8%", delay: "0s" },
  { top: 34, left: "20%", delay: "0.6s" },
  { top: 18, left: "62%", delay: "1.2s" },
  { top: 48, left: "88%", delay: "0.3s" },
  { top: 60, left: "35%", delay: "1.8s" },
  { top: 26, left: "70%", delay: "2.2s" },
  { top: 8, left: "92%", delay: "0.9s" },
  { top: 70, left: "12%", delay: "1.5s" },
  { top: 44, left: "50%", delay: "2.6s" },
];

function StarField() {
  return (
    <>
      {STAR_POSITIONS.map((s, i) => (
        <div
          key={i}
          className="castle-star-twinkle"
          style={{ position: "absolute", top: s.top, left: s.left, width: 2, height: 2, background: "var(--castle-star)", animationDelay: s.delay }}
        />
      ))}
    </>
  );
}
