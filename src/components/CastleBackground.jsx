import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

// Dungeon/castle backdrop for the "arcade" theme — CSS gradients + inline SVG only, no image
// file, so it costs nothing extra to load and never blocks or slows down the dashboard's first
// paint. Night sky (not day) deliberately: arcade's palette is already dark purple/neon, so a
// dark gradient sky sits naturally next to it and never has to fight the UI for contrast the way
// a bright daytime sky would.
//
// Layered back-to-front (each one only a plain gradient, SVG pattern, or a few <rect>s):
//  1. Night sky gradient, full height (the page can scroll for thousands of px — this is the
//     one layer that's fine being that tall, everything else below is a fixed decorative cluster
//     near the top so it's guaranteed visible without scrolling, same reasoning as the torches/
//     WarriorMascot.jsx already use).
//  2. Star field + moon.
//  3. Far castle skyline (dim, small) — the "distant" layer for depth.
//  4. Near brick wall texture (brighter than the first pass) — the "close" layer.
//  5. Architecture details on the near wall: stained-glass window, banner, a stepped stone
//     plinth, moss/vine patches.
//  6. Torch glow + flame, now brighter with a slow flicker.
//  7. A flat dark overlay — this is what actually guarantees text/number contrast stays intact
//     no matter how bright the layers under it look, rather than hoping their opacities alone
//     are always safe. Lowered from the first pass (0.55 → 0.32) since "brighter" was the ask,
//     but still enough to keep every card's own text readable over it.
// Positioned absolute behind ".app-container"'s content (z-index -1 — see the note on that value
// below) and never intercepts clicks.
export default function CastleBackground() {
  const { theme } = useTheme();
  if (theme !== "arcade") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        // Negative, not 0 — a positioned z-index:0 layer actually paints *above* the page's
        // normal static-flow content (cards, text) per CSS stacking rules, DOM order
        // notwithstanding. Only a negative z-index guarantees this sits behind every card
        // instead of washing its overlay out over them. (Also depends on ".app-container" itself
        // having an explicit z-index — see App.jsx's own note — or this escapes further up than
        // intended and disappears behind ".app-shell"'s background entirely.)
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* 1. Night sky */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, var(--castle-sky-top) 0%, var(--castle-sky-bottom) 100%)" }} />

      {/* 2. Stars + moon — fixed positions (not random) so they don't reshuffle on re-render,
          clustered in the top ~160px band that's always in view on load. */}
      <StarField />
      <div style={{ position: "absolute", top: 4, left: "42%", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, var(--castle-moon-glow) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: 22, left: "46%", width: 26, height: 26, borderRadius: "50%", background: "var(--castle-moon)", boxShadow: "inset -6px -2px 0 rgba(0,0,0,0.15)" }} />

      {/* 3. Far skyline — dim, distant battlements. SVG <pattern> tiles in absolute px
          (userSpaceOnUse), so it repeats cleanly across any container width without JS. */}
      <svg width="100%" height="50" style={{ position: "absolute", top: 56, left: 0 }} shapeRendering="crispEdges" preserveAspectRatio="none">
        <defs>
          <pattern id="castle-far-merlons" width="20" height="50" patternUnits="userSpaceOnUse">
            <rect x="0" y="30" width="20" height="20" fill="var(--castle-far)" />
            <rect x="0" y="20" width="8" height="10" fill="var(--castle-far)" />
            <rect x="12" y="20" width="8" height="10" fill="var(--castle-far)" />
          </pattern>
        </defs>
        <rect width="100%" height="50" fill="url(#castle-far-merlons)" opacity="0.55" />
        {/* Two taller distant towers with a single lit window each, breaking up the repeat */}
        <rect x="14%" y="6" width="16" height="44" fill="var(--castle-far)" opacity="0.6" />
        <rect x="calc(14% + 5px)" y="16" width="6" height="6" fill="var(--castle-window-warm)" opacity="0.5" />
        <rect x="78%" y="0" width="16" height="50" fill="var(--castle-far)" opacity="0.6" />
        <rect x="calc(78% + 5px)" y="12" width="6" height="6" fill="var(--castle-window-warm)" opacity="0.5" />
      </svg>

      {/* 4. Near brick wall texture (brighter palette than the first pass — see themes.js) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.6,
          backgroundColor: "var(--castle-stone)",
          backgroundImage: `
            repeating-linear-gradient(0deg, var(--castle-mortar) 0px, var(--castle-mortar) 2px, transparent 2px, transparent 26px),
            repeating-linear-gradient(90deg, var(--castle-mortar) 0px, var(--castle-mortar) 2px, transparent 2px, transparent 52px),
            repeating-linear-gradient(90deg, var(--castle-mortar) 0px, var(--castle-mortar) 2px, transparent 2px, transparent 52px)
          `,
          backgroundPosition: "0 0, 0 0, 26px 26px",
          backgroundSize: "100% 26px, 52px 52px, 52px 52px",
        }}
      />
      {/* Alternating brick shading for depth, offset rows via the same 52px rhythm as the mortar
          grid above so bricks and mortar lines line up. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.3,
          backgroundImage: "linear-gradient(180deg, var(--castle-stone) 0%, var(--castle-stone-dark) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* 5. Architecture details on the near wall — all clustered near the top so they're
          guaranteed visible without scrolling (the container itself can be thousands of px
          tall on a long page; a `bottom: ...` anchor here would be invisible until scrolled all
          the way down, the same bug WarriorMascot.jsx's positioning hit earlier). */}
      {/* Kept above ~top:70 and outside the ~35%-65% horizontal band on purpose — the month-nav
          row ("< ส.ค. 2569 >") sits right in that box, so anything placed there reads as
          colliding with real UI rather than as background art. */}
      <StainedGlassWindow style={{ position: "absolute", top: 4, left: "22%" }} />
      <Banner style={{ position: "absolute", top: 0, left: 46 }} />
      <StonePlinth style={{ position: "absolute", top: 6, right: "26%" }} />
      <MossPatch style={{ position: "absolute", top: 30, left: 8 }} />
      <MossPatch style={{ position: "absolute", top: 34, right: "34%" }} scale={0.75} />

      {/* 6. Torches — brighter glow + a slow flicker (see App.jsx's torchFlicker keyframes) */}
      <div className="castle-torch-flicker" style={{ position: "absolute", top: -60, left: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, var(--castle-torch-glow) 0%, transparent 70%)" }} />
      <div className="castle-torch-flicker" style={{ position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, var(--castle-torch-glow) 0%, transparent 70%)", animationDelay: "1.1s" }} />
      <TorchIcon style={{ position: "absolute", top: 14, left: 18 }} />
      <TorchIcon style={{ position: "absolute", top: 14, right: 18 }} />

      {/* 7. Dark overlay — the actual contrast guarantee. Everything above this exists only to
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

function StainedGlassWindow({ style }) {
  return (
    <div style={{ ...style, position: "absolute" }}>
      {/* Glow behind the frame — without this the colored panes read as a random floating
          checkerboard rather than "a lit window in a dark wall" (this is what actually sells
          the shape, more than the frame outline does). */}
      <div style={{ position: "absolute", top: -10, left: -10, width: 60, height: 70, borderRadius: "50%", background: "radial-gradient(circle, var(--castle-moon-glow) 0%, transparent 70%)" }} />
      <svg viewBox="0 0 16 20" width="40" height="50" style={{ position: "relative", opacity: 0.9 }} shapeRendering="crispEdges">
        {/* Frame, drawn in the lighter "far" stone tone (not stone-dark) so it actually shows up
            against the dark sky instead of disappearing into it — the first pass used
            stone-dark for the frame, which was nearly the same color as the background. */}
        <rect x="1" y="3" width="14" height="17" fill="none" stroke="var(--castle-far)" strokeWidth="1" />
        <path d="M 1 4 L 8 -1 L 15 4" fill="none" stroke="var(--castle-far)" strokeWidth="1" />
        <rect x="2" y="4" width="12" height="16" fill="var(--castle-stone-dark)" />
        <path d="M 2 4 L 8 0 L 14 4 Z" fill="var(--castle-stone-dark)" />
        <rect x="4" y="6" width="3" height="6" fill="var(--castle-window)" opacity="0.9" />
        <rect x="9" y="6" width="3" height="6" fill="var(--castle-window-warm)" opacity="0.9" />
        <rect x="4" y="13" width="3" height="5" fill="var(--castle-window-warm)" opacity="0.9" />
        <rect x="9" y="13" width="3" height="5" fill="var(--castle-window)" opacity="0.9" />
        <rect x="7" y="6" width="2" height="12" fill="var(--castle-far)" />
        <rect x="4" y="9" width="8" height="1" fill="var(--castle-far)" />
      </svg>
    </div>
  );
}

function Banner({ style }) {
  return (
    <div className="castle-banner-sway" style={{ ...style, transformOrigin: "top center" }}>
      <svg viewBox="0 0 10 24" width="16" height="38" shapeRendering="crispEdges" style={{ opacity: 0.85 }}>
        <rect x="1" y="0" width="1" height="24" fill="#7A4A28" />
        <path d="M 2 2 H 9 V 14 L 5.5 11 L 2 14 Z" fill="var(--castle-flag)" />
      </svg>
    </div>
  );
}

function StonePlinth({ style }) {
  return (
    <svg viewBox="0 0 30 14" width="60" height="28" style={{ ...style, opacity: 0.85 }} shapeRendering="crispEdges">
      {/* Each step is the lighter "far" stone tone with a stone-dark shadow along its front
          edge — stone-dark alone (the first pass) was nearly invisible against the sky/wall
          behind it; the two-tone edge is what actually reads as a stepped stair from a
          distance. */}
      <rect x="0" y="10" width="30" height="4" fill="var(--castle-far)" />
      <rect x="0" y="13" width="30" height="1" fill="var(--castle-stone-dark)" />
      <rect x="3" y="6" width="24" height="4" fill="var(--castle-far)" />
      <rect x="3" y="9" width="24" height="1" fill="var(--castle-stone-dark)" />
      <rect x="6" y="2" width="18" height="4" fill="var(--castle-far)" />
      <rect x="6" y="5" width="18" height="1" fill="var(--castle-stone-dark)" />
    </svg>
  );
}

function MossPatch({ style, scale = 1 }) {
  return (
    <div
      style={{
        ...style,
        width: 46 * scale,
        height: 60 * scale,
        opacity: 0.5,
        background: "radial-gradient(ellipse at top, var(--castle-moss) 0%, transparent 65%)",
      }}
    />
  );
}

function TorchIcon({ style }) {
  return (
    <svg viewBox="0 0 10 14" width="18" height="26" style={{ ...style, opacity: 0.9 }} shapeRendering="crispEdges">
      <rect x="4" y="7" width="2" height="7" fill="#5C3A1A" />
      <rect x="3" y="5" width="4" height="2" fill="#3D2812" />
      <rect x="4" y="1" width="2" height="2" fill="var(--castle-torch)" />
      <rect x="3" y="2" width="1" height="2" fill="#FFD700" />
      <rect x="6" y="2" width="1" height="2" fill="#FFD700" />
      <rect x="4" y="0" width="2" height="1" fill="#FFEFA0" />
    </svg>
  );
}
