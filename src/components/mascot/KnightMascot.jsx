import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

// Pixel-art knight guard for the "arcade" theme — mounted inside Dashboard.jsx next to the net-
// worth card (not globally via App.jsx anymore) since its speech bubble is meant to comment on
// real numbers on that specific card, not float generically over every page. The parent is
// responsible for positioning this via its own wrapper (see Dashboard.jsx: a `position: relative`
// wrapper around the net-worth card, with this dropped in as an absolutely-positioned corner
// child) — this component only renders its own size/animation/bubble, no page-level placement.
export default function KnightMascot({ message }) {
  const { theme, mascotAnimationEnabled } = useTheme();
  if (theme !== "arcade") return null;

  return (
    <div
      className={mascotAnimationEnabled ? "knight-guard" : undefined}
      style={{ position: "relative", display: "flex", alignItems: "center", pointerEvents: "none", zIndex: 5 }}
      aria-hidden="true"
    >
      {message && <SpeechBubble text={message} />}
      <img
        src={new URL("../../assets/mascot-knight.png", import.meta.url).href}
        alt=""
        // clamp(), not a fixed 130px — this sits right next to the net-worth card's own number
        // on narrow mobile widths (the app's actual target width, ~480px, not just desktop),
        // and at fixed size it was wide enough there to cover that number and the row below it.
        // Scaling down with the viewport (while still landing on the full 130px at desktop
        // widths, where there's room) keeps it clear of both regardless of screen size, instead
        // of needing a separate mobile-specific breakpoint rule.
        style={{ display: "block", imageRendering: "pixelated", transform: "scaleX(-1)", width: "clamp(64px, 16vw, 130px)", height: "clamp(64px, 16vw, 130px)" }}
      />
    </div>
  );
}

// Pixel-styled speech bubble — hard-edged border + blocky drop shadow (no border-radius, no
// blur) to match the theme's 8-bit look, same idiom CastleBackground.jsx's props use. The
// message text itself stays on the app's normal readable font, not the pixel one — this is a
// real sentence about the user's own spending someone has to actually read, not a short label.
function SpeechBubble({ text }) {
  return (
    <div
      // Hidden below ~560px (see App.jsx's ".knight-speech-bubble" media query) — the net-worth
      // number this sits beside can render arbitrarily wide (it's a real, unbounded balance
      // figure, not a fixed-width label), and on a narrow phone-width card there just isn't
      // reliable room for a 120px+ bubble next to it no matter how far it's shrunk; clamp()ing
      // it smaller was tried first and still clipped into the number on real mobile widths.
      // The knight itself stays visible and clear at every width (see its own clamp() above) —
      // only the bubble text is the part that needs the extra room desktop has and mobile
      // doesn't.
      className="knight-speech-bubble"
      style={{
        position: "absolute",
        // To the knight's LEFT now (was above it) — sitting at the same row as the card's
        // income/expense/transfer numbers instead of needing headroom above the card (the
        // reason it used to be pinned to the card's very top edge — see Dashboard.jsx's mount
        // comment for that earlier constraint, which no longer applies here).
        // top: 28% (not 50%, the sprite's own vertical center) is deliberate: the knight image
        // is taller than the card is, so centering the bubble on the whole 130px sprite pushed
        // it up far enough to cover the label text above the numbers row. The head — where a
        // speech bubble's tail should actually point — sits in roughly the top third of a
        // standing sprite, so aiming there instead both looks right (tail meets the head, not
        // the chest) and keeps the bubble low enough to clear the label above it.
        top: "28%",
        right: "100%",
        transform: "translateY(-50%)",
        marginRight: 12,
        // Same reasoning as the knight's own clamp() above: this used to be a fixed 200px,
        // which combined with the (also-fixed) knight was wide enough to spill into the net-
        // worth number's own space on a ~480px-wide mobile screen — the app's real target
        // width, not an edge case.
        width: "clamp(120px, 32vw, 200px)",
        background: "#F5F3FF",
        color: "#1A1030",
        border: "3px solid #1A1030",
        boxShadow: "4px 4px 0 rgba(0,0,0,0.35)",
        borderRadius: 4,
        padding: "8px 10px",
        fontSize: "clamp(10px, 2.6vw, 12px)",
        lineHeight: 1.4,
        fontFamily: "'IBM Plex Sans Thai', sans-serif",
      }}
    >
      {text}
      {/* Blocky pixel-style tail pointing right at the knight's head — built the same
          two-rect "stepped notch" way as before, just rotated 90° to point sideways instead of
          down, since the bubble is now beside the knight instead of above it. */}
      <div style={{ position: "absolute", left: "100%", top: "50%", marginTop: -7, width: 7, height: 14, background: "#1A1030" }} />
      <div style={{ position: "absolute", left: "100%", top: "50%", marginTop: -4, marginLeft: -3, width: 4, height: 8, background: "#F5F3FF" }} />
    </div>
  );
}
