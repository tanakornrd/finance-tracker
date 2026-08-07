import React, { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { playSound } from "../../lib/sound.js";

// Full-screen "spell cast" sequence for a successful budget save on Budgets.jsx (RPG party
// interactions follow-up, 2026-08-07 — redesigned per feedback from the first, single-fade
// version). Only ever mounted when mascotAnimationEnabled is true (Budgets.jsx decides that —
// see its own comment); the reduced-motion/toggle-off experience is a completely different,
// much simpler path (BudgetMageCard's own small inline mage getting a brief `firing` bubble, no
// overlay at all), not a stripped-down version of this component.
//
// Four phases, driven by one internal `phase` state + chained timers (not four separate CSS
// animations racing each other): "casting" (ring spins, no message yet) -> "message" (message
// bubble pops in above the mage with a sparkle burst, ring keeps spinning underneath) ->
// "fading" (whole thing fades out) -> onClose. ~3.7s total — close to what was asked for
// (3.7-3.9s) without being pinned to an exact figure, since the four phases are independently
// timed and don't need to add up to a fixed target.
const CASTING_MS = 1800;
const MESSAGE_MS = 1500;
const FADE_MS = 400;

export default function BudgetSpellOverlay({ onClose }) {
  const { theme, soundEnabled } = useTheme();
  const [phase, setPhase] = useState("casting");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("message"), CASTING_MS);
    const t2 = setTimeout(() => setPhase("fading"), CASTING_MS + MESSAGE_MS);
    const t3 = setTimeout(onClose, CASTING_MS + MESSAGE_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  useEffect(() => {
    if (theme === "arcade" && soundEnabled) playSound("mageCast");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (theme !== "arcade") return null;

  const showMessage = phase === "message" || phase === "fading";

  return (
    <div
      className={`budget-spell-overlay${phase === "fading" ? " budget-spell-overlay-fading" : ""}`}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(10,4,26,0.72)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        // No click-to-dismiss (removed per feedback) — this is a short, self-timed sequence, not
        // a dialog waiting on the user; deliberately no role="button"/onClick/aria-label either.
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
            className="budget-spell-bubble"
            style={{
              position: "relative",
              maxWidth: "min(360px, 88vw)",
              background: "#F5F3FF", color: "#1A1030", border: "3px solid #1A1030",
              boxShadow: "4px 4px 0 rgba(0,0,0,0.35)", borderRadius: 0,
              padding: "10px 16px", fontSize: "clamp(14px, 4vw, 18px)", fontWeight: 600,
              lineHeight: 1.4, fontFamily: "'IBM Plex Sans Thai', sans-serif", textAlign: "center",
            }}
          >
            บันทึกไว้แล้วนะ! ✨
            {/* Tail pointing DOWN at the mage below (bubble sits above him in this stacked
                layout, unlike every other mascot's bubble which sits beside its anchor) — same
                stepped-notch construction, just rotated to point down instead of sideways. */}
            <div style={{ position: "absolute", top: "100%", left: "50%", marginLeft: -7, width: 14, height: 7, background: "#1A1030" }} />
            <div style={{ position: "absolute", top: "100%", left: "50%", marginLeft: -4, marginTop: -3, width: 8, height: 4, background: "#F5F3FF" }} />
            {/* Sparkle burst — 8 small dots flung outward + fading, CSS-only, no art asset. Each
                one's angle is set via an inline --spark-angle custom property the shared
                @keyframes reads (rotate(angle) then translateX(distance) sends it outward along
                that angle), so one @keyframes drives all 8 without a separate one per angle. */}
            <div className="budget-spell-sparkles" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="budget-spell-spark" style={{ "--spark-angle": `${i * 45}deg` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="budget-spell-circle"
        style={{
          position: "relative",
          width: "clamp(200px, 62vw, 360px)", height: "clamp(200px, 62vw, 360px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div
          className="budget-spell-ring"
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "conic-gradient(from 0deg, #FFD75E, #FF8A3D, #FFD75E 50%, #FF8A3D, #FFD75E)",
            WebkitMask: "radial-gradient(closest-side, transparent 72%, black 74%, black 100%)",
            mask: "radial-gradient(closest-side, transparent 72%, black 74%, black 100%)",
            filter: "drop-shadow(0 0 22px rgba(255,180,80,0.65))",
          }}
        />
        <img
          src={new URL("../../assets/mascot-mage.png", import.meta.url).href}
          alt=""
          style={{ position: "relative", width: "50%", height: "50%", imageRendering: "pixelated" }}
        />
      </div>
    </div>
  );
}
