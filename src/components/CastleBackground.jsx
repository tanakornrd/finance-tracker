import React, { useMemo } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { useIsMobile } from "../lib/useKeepBubbleOnScreen.js";
import { toISODate } from "../../shared/dates.js";

// Tint colors per festival (ชุด 4.5, 2026-08-08) — shown to the user as swatches before this was
// written, see that approval. `gold` (a soft radial glow, reusing the same glow idiom the moon/
// torches already use elsewhere in this file) is only set for the two festivals it was actually
// asked for; songkran stays a plain wash with no glow accent.
const FESTIVAL_TINTS = {
  songkran: { wash: "rgba(35,140,220,0.32)" },
  chinese_new_year: { wash: "rgba(215,35,45,0.32)", gold: "rgba(220,175,70,0.35)" },
  christmas_newyear: { wash: "rgba(110,40,150,0.32)", gold: "rgba(220,175,70,0.35)" },
};

const wallImg = new URL("../assets/backgrounds/castle_layer1_far.png", import.meta.url).href;
const floorImg = new URL("../assets/backgrounds/castle_layer2_near.png", import.meta.url).href;

// castle_layer1_far.png / castle_layer2_near.png (2026-08-08, third pass): pre-processed from the
// original art (kept alongside as castle_layer1_far_original.png / castle_layer2_near_original.png
// in case a future edit wants to start from the unfaded source again), NOT via a runtime CSS mask.
// Straight out of the box, each PNG's own edges — the wall's left/right sides and bottom, the
// floor's left/right pillar columns — were hard, fully-opaque pixels running flush to the image's
// own rectangular canvas edge. Composited onto the gradient sky behind them, that read as a
// visible straight-line "sticker" cutout rather than something that belongs in the scene
// (reported: "ตัดภาพไม่ค่อยเนียน ดูเป็นเหลี่ยมก้อนสี่เหลี่ยม"). Each file now has its alpha channel
// faded to transparent along just the edges that needed it (wall: left/right/bottom, top left
// alone since the crenellations are already a natural silhouette there; floor: left/right/top,
// bottom left alone since that edge is meant to sit flush against the screen's own bottom edge,
// not fade into anything). Baked into the files instead of an equivalent CSS mask-image so it
// doesn't depend on iOS Safari's mask-image support at all, and costs nothing at runtime.

// Dungeon/castle backdrop for the "arcade" theme.
//
// 2026-08-08: the wall/window/banner/torch pieces that used to be hand-drawn CSS+SVG are now two
// real art layers the user supplied (src/assets/backgrounds) — replaced, not layered on top of
// the old ones, since the art already depicts the same things (window, banners, torches) and
// having both would double up. Night sky/stars/dark-overlay stay exactly as before; those aren't
// things the new art replaces, they're the open sky the wall sits in front of. The separate CSS
// moon disc + glow that used to sit here were dropped — layer1's own art already has a moon
// rendered inside its window, and keeping both read as two moons stacked on top of each other.
//
//  1. Night sky gradient, full height (unchanged — the page can scroll for thousands of px, this
//     is the one layer that's fine being that tall; the two art images are each a fixed-size band
//     near the top/bottom).
//  2. Star field (unchanged).
//  3. layer1_far.png — the far wall (window, banners, torches baked into the art itself). Sits at
//     the very top, same spot the old CSS wall band occupied — scrolls away with the page on a
//     long scroll, same as before.
//  4. layer2_near.png — pillars + floor, transparent in the middle. Mobile: `position: fixed` to
//     the viewport's bottom edge (same idiom as BottomNav.jsx) so it stays in view framing the
//     bottom of the screen the whole time you're on this page, not scroll away like the far wall
//     does. Desktop uses `absolute` instead — see that image's own comment below for why.
//  5. Flat dark overlay — same contrast guarantee as before, still last so it dims the art layers
//     exactly like it used to dim the hand-drawn ones.
// maxWidth: 900 on both art layers keeps them looking like a mobile-scaled castle band even on
// wide desktop windows, instead of stretching to app-container's full (up to 1400px) width and
// looking oversized/blurry.
export default function CastleBackground() {
  const { theme, mascotAnimationEnabled } = useTheme();
  const isMobile = useIsMobile();
  // Active festival tint (ชุด 4.5) — same "no hardcoded festival calendar" rule as 4.3's
  // reminder: today has to fall inside a festival budget's OWN start/end dates (Budgets.jsx),
  // not some baked-in "Songkran is always April 13-15" assumption, since this whole feature
  // works off whatever the user actually set. `budgets` here already includes both kinds of row
  // (see server/routes/budgets.js) — filtering to festivalStartDate is enough to only ever match
  // a festival row, no separate categoryBudgets split needed (nothing else in this file reads
  // budgets at all).
  const { budgets } = useReferenceData();
  const activeTint = useMemo(() => {
    const today = toISODate(new Date());
    const row = budgets.find((b) => b.festivalStartDate && b.festivalStartDate <= today && today <= b.festivalEndDate);
    return row ? FESTIVAL_TINTS[row.category] : null;
  }, [budgets]);
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

      {/* 2.5. Brick wall texture, full height (2026-08-08, brought back from the pre-art CSS
          version) — the two art images above only cover a band each near the top/bottom; on a
          short page (nothing to scroll) the gap between them was plain flat gradient, reported
          as looking bare. This repeating pattern fills that whole gap with the same stone/mortar
          colors the art itself uses (var(--castle-stone)/--castle-mortar, still defined in
          themes.js from before), sitting behind both art images and the final dark overlay.
          opacity 0.6 (this pattern's original value, from before the art layers existed) read as
          its own competing grid right where it showed through the art's soft-faded edges — a
          crisp geometric pattern butting up against the art's much softer painted brick texture,
          reported as looking like two different walls stitched together. Dropped to 0.18 (barely
          a hint of texture, not a second wall) specifically so it doesn't fight the art at that
          seam; the "alternating shading" pass that used to sit on top of this (for its own
          depth) is dropped entirely — at this low an opacity it only added visual noise, not
          depth. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
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

      {/* 3. Far wall art */}
      <img
        src={wallImg}
        alt=""
        style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 900, height: "auto", display: "block" }}
      />

      {/* 4. Near pillars/floor art. Mobile: `position: fixed` to the viewport bottom (not the
          scrollable page) — there's no sidebar there, app-container is essentially the whole
          screen width, so viewport-centering lines up with the content underneath it.
          Desktop: `fixed` centers on the FULL viewport width, which doesn't account for
          .app-sidebar's 260px — that pushed this layer left, off center under the actual content
          column and onto the sidebar's own icons/text instead (2026-08-08 bug report). Desktop
          switches to `absolute, bottom: 0` instead, which sizes/centers against app-container
          (this element's own containing block, same as the wall layer above) and scrolls with
          the page like every other layer here — an acceptable trade (desktop pages are also far
          less often as tall/scrolly as the mobile one-column layout gets). */}
      <img
        src={floorImg}
        alt=""
        style={{
          position: isMobile ? "fixed" : "absolute",
          bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 900, height: "auto", display: "block",
        }}
      />

      {/* 4.5. Festival tint (ชุด 4.5) — placed BEFORE the dark overlay below (not after), so the
          overlay's own contrast guarantee still gets the final say over every pixel behind the
          UI text no matter how strong a tint color is; the tint only ever colors what's already
          being dimmed, it never fights that dimming. mascotAnimationEnabled gates a plain fade-
          in (opacity-only, App.jsx's "festival-tint-fade" class + prefers-reduced-motion override
          there) — off just skips straight to the tint's full opacity with no transition, same
          idiom as every other themed animation here. */}
      {activeTint && (
        <>
          <div
            className={mascotAnimationEnabled ? "festival-tint-fade" : undefined}
            style={{ position: "absolute", inset: 0, background: activeTint.wash }}
          />
          {activeTint.gold && (
            <div
              className={mascotAnimationEnabled ? "festival-tint-fade" : undefined}
              style={{
                position: "absolute", top: 0, left: "50%", width: "70%", maxWidth: 500, height: 200,
                transform: "translateX(-50%)",
                background: `radial-gradient(ellipse at top, ${activeTint.gold} 0%, transparent 75%)`,
              }}
            />
          )}
        </>
      )}

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
