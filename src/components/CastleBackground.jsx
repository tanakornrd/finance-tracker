import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

const roomImg = new URL("../assets/backgrounds/castle_room.jpg", import.meta.url).href;

// Dungeon/castle backdrop for the "arcade" theme.
//
// 2026-08-08, second pass: the wall+windows and pillars+floor used to be two SEPARATE art layers
// (the "near" one `position: fixed` to the viewport bottom, for a parallax-ish "always visible"
// effect) — replaced with ONE single full-room illustration the user supplied instead, for two
// reasons reported after trying the two-layer version: (1) the fixed near layer centered itself
// on the whole browser viewport, which doesn't account for .app-sidebar's 260px on desktop, so it
// drifted left onto the sidebar's own icons/text; (2) on mobile, having the wall and the floor as
// two separate bands left a visibly empty gap of plain sky between them. A single image sidesteps
// both: it's one `position: absolute` element (like every other layer here, no more `fixed`
// anywhere in this file — the desktop-sidebar bug has no code path left to happen through), and
// there's no gap because the room is one continuous illustrated scene, wall down to floor.
//
//  1. Night sky gradient, full height (unchanged — the page can scroll for thousands of px, this
//     is the one layer that's fine being that tall; the room art below is a fixed-size band near
//     the top, same as the layers it replaces always were).
//  2. Star field (unchanged). The separate CSS moon disc + glow from the two-layer version were
//     dropped here — the room art already has its own moon rendered in the center window, and
//     keeping both read as two moons stacked on top of each other.
//  3. castle_room.jpg — the room art itself.
//  4. Flat dark overlay — same contrast guarantee as before, still last so it dims the art
//     exactly like it used to dim the hand-drawn CSS version.
// maxWidth: 900 keeps the room looking like a mobile-scaled band even on wide desktop windows,
// instead of stretching to app-container's full (up to 1400px) width and looking oversized.
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

      {/* 2. Stars — fixed positions (not random) so they don't reshuffle on re-render, clustered
          in the top band that's always in view on load. */}
      <StarField />

      {/* 3. Room art */}
      <img
        src={roomImg}
        alt=""
        style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 900, height: "auto", display: "block" }}
      />

      {/* 4. Dark overlay — the actual contrast guarantee. Everything above this exists only to
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
