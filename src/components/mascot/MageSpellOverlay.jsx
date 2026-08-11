import React, { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { playSound } from "../../lib/sound.js";

// Full-screen "spell cast" sequence — originally built for Budgets.jsx's budget-save reaction,
// generalized (2026-08-07) so Dashboard.jsx's transaction-save reaction can reuse the exact same
// mechanism with its own message/timing instead of duplicating it. Callers decide whether/when to
// mount this (Budgets.jsx and Dashboard.jsx both gate it behind mascotAnimationEnabled — the
// reduced-motion/toggle-off experience is a completely different, simpler path for each: a plain
// inline mage bubble, no overlay at all — not a stripped-down version of this component).
//
// Four phases, driven by one internal `phase` state + chained timers (not several CSS animations
// racing each other): "casting" (ring spins, no message yet) -> "message" (message bubble pops
// in above the mage with a sparkle burst, ring keeps spinning underneath) -> "fading" (whole
// thing fades out) -> onClose. castingMs/messageMs/fadeMs are all caller-supplied so Budgets.jsx
// (a rarer action, ~3.7s total is fine) and Dashboard.jsx (fires on nearly every save, wants
// ~1.5-1.8s) can each pick their own pace without a second copy of this component.
//
// The ring itself is mage-orb-ring.png — a crop of the actual magic-circle art already in
// mascot-mage.png's hand (not a separate/new asset, not a CSS approximation like the first
// version of this component used) — see that file's own note for the crop provenance.
export default function MageSpellOverlay({ message, castingMs = 1800, messageMs = 1500, fadeMs = 400, onClose }) {
  const { theme, soundEnabled } = useTheme();
  const [phase, setPhase] = useState("casting");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("message"), castingMs);
    const t2 = setTimeout(() => setPhase("fading"), castingMs + messageMs);
    const t3 = setTimeout(onClose, castingMs + messageMs + fadeMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, castingMs, messageMs, fadeMs]);

  useEffect(() => {
    if (theme === "arcade" && soundEnabled) playSound("mageCast");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (theme !== "arcade") return null;

  const showMessage = phase === "message" || phase === "fading";

  return (
    <div
      className={`mage-spell-overlay${phase === "fading" ? " mage-spell-overlay-fading" : ""}`}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        // Plain near-black, not a color tinted toward the arcade theme's own already-dark
        // purple background — that tint (the first version's rgba(10,4,26,...)) sat close
        // enough to the page's real background that the "dim everything behind" effect read as
        // barely-there (2026-08-07 feedback: looked like there was no backdrop at all). Higher
        // opacity too, for the same reason.
        background: "rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        // No click-to-dismiss — this is a short, self-timed sequence, not a dialog waiting on
        // the user; deliberately no role="button"/onClick/aria-label either.
        pointerEvents: "auto",
      }}
    >
      {/* Reserves its own space at all times (not display:none pre-"message") so the mage below
          doesn't visually jump/recenter the instant the bubble appears — same idiom as
          useKeepBubbleOnScreen's "hidden until measured" bubbles, just via a fixed min-height
          here instead since there's nothing to measure. */}
      <div
        style={{
          minHeight: "clamp(70px, 16vw, 100px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          marginBottom: 14, padding: "0 20px",
        }}
      >
        {showMessage && (
          <div
            className="mage-spell-bubble"
            style={{
              position: "relative",
              maxWidth: "min(360px, 88vw)",
              background: "#F5F3FF", color: "#1A1030", border: "3px solid #1A1030",
              boxShadow: "4px 4px 0 rgba(0,0,0,0.35)", borderRadius: 0,
              padding: "10px 16px", fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 600,
              lineHeight: 1.4, fontFamily: "'IBM Plex Sans Thai', sans-serif", textAlign: "center",
            }}
          >
            {message}
            {/* Tail pointing DOWN at the mage below (bubble sits above him in this stacked
                layout, unlike every other mascot's bubble which sits beside its anchor) — same
                stepped-notch construction, just rotated to point down instead of sideways. */}
            <div style={{ position: "absolute", top: "100%", left: "50%", marginLeft: -7, width: 14, height: 7, background: "#1A1030" }} />
            <div style={{ position: "absolute", top: "100%", left: "50%", marginLeft: -4, marginTop: -3, width: 8, height: 4, background: "#F5F3FF" }} />
            {/* Sparkle burst — 8 small dots flung outward + fading, CSS-only, no art asset. Each
                one's angle is set via an inline --spark-angle custom property the shared
                @keyframes reads (rotate(angle) then translateX(distance) sends it outward along
                that angle), so one @keyframes drives all 8 without a separate one per angle. */}
            <div className="mage-spell-sparkles" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="mage-spell-spark" style={{ "--spark-angle": `${i * 45}deg` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="mage-spell-circle"
        style={{
          position: "relative",
          width: "clamp(200px, 62vw, 360px)", height: "clamp(200px, 62vw, 360px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <img
          src={new URL("../../assets/mage-orb-ring.png", import.meta.url).href}
          alt=""
          className="mage-spell-ring"
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            // NOT pixelated, unlike every other sprite in this theme — deliberately. This image
            // spins continuously via CSS transform:rotate(), and pixel art rendered crisp at
            // arbitrary (non-90°) rotation angles gets a jagged, torn-looking edge (each square
            // pixel becomes a hard-edged rotated block instead of smoothly interpolating) —
            // reported 2026-08-07 as the ring looking "broken/patchy". Smooth scaling here reads
            // as a soft magic glow anyway (it already has a blur-like drop-shadow), so letting
            // the browser anti-alias it while it rotates is a strict visual improvement, not a
            // style mismatch — mascot-mage.png itself (never rotated) stays pixelated below.
            imageRendering: "auto",
            filter: "drop-shadow(0 0 22px rgba(255,180,80,0.65))",
          }}
        />
        <img
          src={new URL("../../assets/mascot-mage.png", import.meta.url).href}
          alt=""
          style={{
            position: "relative", width: "50%", height: "50%", imageRendering: "pixelated",
            // Dark outline behind the sprite (2026-08-11, reported as "หัวขาด" — the mage's dark
            // hair/hood was reading as missing, not actually cropped) — the new mage-orb-ring.png
            // has bright rays crossing right at head height, and against those the character's
            // own dark tones lost all contrast and visually vanished into the pattern. Stacking
            // the same near-black drop-shadow 4x (each pass only adds a little opacity around the
            // sprite's alpha edge; layering multiplies it up to a solid-looking outline) traces a
            // dark silhouette around him regardless of how bright/busy whatever's behind him gets
            // — same #1A1030 ink tone as every other pixel-box outline in this theme.
            filter: "drop-shadow(0 0 2px #1A1030) drop-shadow(0 0 2px #1A1030) drop-shadow(0 0 4px #1A1030) drop-shadow(0 0 4px #1A1030)",
          }}
        />
      </div>
    </div>
  );
}
