import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { playSound } from "../../lib/sound.js";
import { useKeepBubbleOnScreen, useIsMobile } from "../../lib/useKeepBubbleOnScreen.js";
import ModalPortal from "../ModalPortal.jsx";

// Pixel-art warrior guard for the "arcade" theme — mounted inside Dashboard.jsx next to the net-
// worth card (not globally via App.jsx anymore) since its speech bubble is meant to comment on
// real numbers on that specific card, not float generically over every page. The parent is
// responsible for positioning this via its own wrapper (see Dashboard.jsx: a `position: relative`
// wrapper around the net-worth card, with this dropped in as an absolutely-positioned corner
// child) — this component only renders its own size/animation/bubble, no page-level placement.
//
// Replaced the original side-profile Knight sprite (2026-08-06) — that art was a hard right-facing
// profile and needed scaleX(-1) to face the money numbers on its left. This mascot-warrior.png
// art is a 3/4 lunge pose already leading with its sword to the left (shield trailing on the
// right), so it's left-facing as-is — no flip here. If it ever reads as facing the wrong way on
// screen, flip it back on by adding `transform: "scaleX(-1)"` to the <img> style below.
//
// Clickable (RPG party interactions, part 1) — `message` (weeklyInsight, from Dashboard.jsx)
// stays the normal persistent bubble text; a click plays a one-shot sword-slash animation and
// swaps the bubble to a reminder/praise line for ~1.5s (picked from `hasEntryToday`, also from
// Dashboard.jsx — its own separate "does today have an entry" check, same idea as
// NoEntryTodayBanner.jsx's own independent fetch), then reverts to `message` on its own.
export default function WarriorMascot({ message, hasEntryToday }) {
  const { theme, mascotAnimationEnabled, soundEnabled } = useTheme();
  const [slashing, setSlashing] = useState(false);
  const [clickMessage, setClickMessage] = useState(null);
  const anchorRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!clickMessage) return undefined;
    const t = setTimeout(() => setClickMessage(null), 1500);
    return () => clearTimeout(t);
  }, [clickMessage]);

  if (theme !== "arcade") return null;

  function handleClick() {
    setClickMessage(hasEntryToday ? "เก่งมาก! วันนี้จดแล้ว" : "อย่าลืมจดรายรับรายจ่ายวันนี้นะ!");
    if (soundEnabled) playSound("warriorSlash");
    if (mascotAnimationEnabled) {
      // Re-triggers even on rapid repeat clicks: force a reflow between removing and re-adding
      // the class, same one-shot-animation-replay trick ArcherMascot/MageMascot don't need
      // (their firing prop is controlled by a parent's own timer, which naturally already
      // toggles the class off before back on — this one is self-triggered by the same click
      // handler each time, so without this it could re-click while still "slashing" and never
      // see the class change at all).
      setSlashing(false);
      requestAnimationFrame(() => setSlashing(true));
    }
  }

  // Mobile only: skip the persistent `message` (weeklyInsight) fallback entirely — the tap
  // reminder/praise line still shows for its normal ~1.5s then disappears completely, matching
  // what mobile users are used to (the bubble was simply invisible outright on mobile before
  // this pass's fix, so "always up, showing the weekly insight" was never something they'd seen —
  // per feedback, that persistent state reads as stuck/not going away on a phone, unlike desktop
  // where it sits calmly in the card's own layout instead of floating fixed over other content).
  const shownMessage = isMobile ? clickMessage : clickMessage || message;

  return (
    <button
      ref={anchorRef}
      type="button"
      onClick={handleClick}
      onAnimationEnd={() => setSlashing(false)}
      aria-label="อัศวินยาม กดเพื่อดูสถานะการบันทึกวันนี้"
      className={slashing ? "warrior-slash" : mascotAnimationEnabled ? "warrior-guard" : undefined}
      // Was a plain aria-hidden <div> with pointerEvents:"none" — now a real, focusable,
      // keyboard-activatable button (native <button> gets Enter/Space activation for free), so
      // both the "decorative, not interactive" attributes are gone and the wrapping button
      // needs its own reset styles (no default button chrome) instead of just position/flex.
      style={{
        position: "relative", display: "flex", alignItems: "center",
        background: "none", border: "none", padding: 0, cursor: "pointer",
        zIndex: 5,
      }}
    >
      {shownMessage && <SpeechBubble text={shownMessage} anchorRef={anchorRef} />}
      <img
        src={new URL("../../assets/mascot-warrior.png", import.meta.url).href}
        alt=""
        // Sizing itself lives in the ".warrior-img" CSS class (App.jsx), not inline here — it's
        // a clamp() that shrinks with the viewport on mobile then doubles in size again past the
        // desktop breakpoint, and only an external stylesheet rule can be overridden by a media
        // query; an inline style always wins over one regardless of specificity.
        className="warrior-img"
        style={{ display: "block", imageRendering: "pixelated" }}
      />
    </button>
  );
}

// Pixel-styled speech bubble — a genuine hard-cornered box (border-radius:0), hard-edged
// border + blocky drop shadow (0 blur) to match the theme's 8-bit look, same idiom
// CastleBackground.jsx's props use. The message text itself stays on the app's normal readable
// font, not the pixel one — this is a real sentence about the user's own spending someone has
// to actually read, not a short label.
function SpeechBubble({ text, anchorRef }) {
  // Below the desktop breakpoint (see useKeepBubbleOnScreen.js), the bubble used to just be
  // hidden outright below ~560px — the card it shares with the net-worth number is too narrow
  // for a fixed-offset bubble to reliably fit beside it. Now it's portaled to document.body
  // (escapes ".passbook-card"'s overflow:hidden, same as every modal in the app) and its real
  // position is measured + clamped to the actual viewport, so it can stay visible and fully
  // on-screen at every phone width instead of being switched off. Desktop is untouched — same
  // absolutely-positioned-beside-the-warrior rendering as always, no portal, no measurement.
  //
  // anchorFrac 0.14 (not the 0.5 default, and higher up than desktop's own 0.28 — mobile has no
  // fixed "row of numbers" to clear beside, so it can sit right up near the head) + gap 0 (was
  // 6, then 3 — per feedback, tightened twice more to sit flush against the warrior's head
  // instead of drifting down toward the balance figure below it).
  const { isMobile, bubbleRef, pos } = useKeepBubbleOnScreen({ anchorRef, anchorFrac: 0.14, gap: 0, deps: [text] });

  const bubble = (
    <div
      ref={bubbleRef}
      style={{
        position: isMobile ? "fixed" : "absolute",
        ...(isMobile
          ? {
              left: pos ? pos.left : -9999,
              top: pos ? pos.top : -9999,
              visibility: pos ? "visible" : "hidden",
              width: "max-content",
              // Tight cap (not the old calc(100vw - 20px)) so long messages WRAP into a compact
              // multi-line box beside the head instead of stretching into one wide line that
              // spans most of the screen and covers the net-worth figure below.
              maxWidth: "min(170px, 55vw)",
              zIndex: 45,
              // Cancels App.jsx's mobile body zoom for this element specifically — see
              // MageMascot.jsx's identical line for the full explanation (top/left here are real
              // unzoomed viewport pixels, but this div is a zoomed descendant of body via the
              // portal, so without this those offsets land somewhere else entirely).
              zoom: "calc(1 / var(--mobile-zoom-factor, 1))",
            }
          : {
              // top: 28% (not 50%, the sprite's own vertical center) is deliberate: the warrior
              // image is taller than the card is, so centering the bubble on the whole 130px
              // sprite pushed it up far enough to cover the label text above the numbers row.
              // The head — where a speech bubble's tail should actually point — sits in roughly
              // the top third of a standing sprite, so aiming there instead both looks right
              // (tail meets the head, not the chest) and keeps the bubble low enough to clear
              // the label above it.
              top: "28%",
              right: "100%",
              transform: "translateY(-50%)",
              marginRight: 6,
              width: "clamp(120px, 32vw, 200px)",
            }),
        background: "#F5F3FF",
        color: "#1A1030",
        border: "3px solid #1A1030",
        boxShadow: "4px 4px 0 rgba(0,0,0,0.35)",
        // 0, not the previous 4px — a rounded corner on an otherwise hard-edged pixel box read
        // as inconsistent; a true 8-bit text-box look wants square corners throughout.
        borderRadius: 0,
        padding: "8px 10px",
        fontSize: isMobile ? 12 : "clamp(10px, 2.6vw, 12px)",
        lineHeight: 1.4,
        fontFamily: "'IBM Plex Sans Thai', sans-serif",
        textAlign: "left",
        wordBreak: "break-word",
      }}
    >
      {text}
      {/* Tail dropped on mobile — once the bubble's position is clamped back onto the screen it
          may no longer sit exactly beside the warrior's head, so a tail fixed to "left:100%"
          could end up pointing at empty space instead of him. Desktop keeps it exactly as
          before (never clamped, so it's always aimed correctly). */}
      {!isMobile && (
        <>
          <div style={{ position: "absolute", left: "100%", top: "50%", marginTop: -7, width: 7, height: 14, background: "#1A1030" }} />
          <div style={{ position: "absolute", left: "100%", top: "50%", marginTop: -4, marginLeft: -3, width: 4, height: 8, background: "#F5F3FF" }} />
        </>
      )}
    </div>
  );

  return isMobile ? <ModalPortal>{bubble}</ModalPortal> : bubble;
}
