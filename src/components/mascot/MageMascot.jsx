import React, { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { playSound } from "../../lib/sound.js";

// Picked once per successful save, same reasoning as ArcherMascot's own CHEER_MESSAGES — a
// stable message for the whole firing window instead of re-rolling on every re-render.
const SCRIBE_MESSAGES = [
  "จดไว้แล้ว! ✨",
  "บันทึกลงบัญชีเวทย์แล้วนะ",
  "เวทมนตร์จารึกเรียบร้อย!",
  "จดครบทุกตัวเลขแล้ว",
];

// Pixel-art mage — two different jobs depending on which prop the caller passes in:
//   - `message`: static advice text (BudgetMageCard.jsx passes the computed budget insight).
//     Idle float only, no firing animation.
//   - `firing`: reactive mode (Dashboard.jsx / TransactionDetail.jsx) — plays a one-shot
//     "cast a spell" animation (staff swing + the magic orb pulsing/spinning) and shows a
//     random SCRIBE_MESSAGES line, mirroring ArcherMascot's firing/CHEER_MESSAGES pattern.
// A component never gets both props at once in practice (one caller per mode), but `firing`
// takes priority over `message` if it somehow did, since it's the more specific, momentary state.
//
// floatingBubble: BudgetMageCard.jsx only. Normally the bubble sits in flex flow to the mage's
// left (marginRight, see SpeechBubble below), which is exactly what makes justifyContent:
// "center" below treat "mage + bubble" as the thing to center — fine for every OTHER caller
// (SafeToSpendCard.jsx, TransactionDetail.jsx), where that combined pair is genuinely what
// should be centered/positioned. BudgetMageCard.jsx centers a "mage + slime party" pair instead
// — the bubble's own (message-length-dependent, so not even a fixed width) space pulls that
// centering off to one side for no reason a viewer would expect. floatingBubble takes the
// bubble out of flex flow (position:absolute) so it no longer counts toward that centering at
// all, without changing anything for the callers that still want it counted.
//
// onClick: optional (RPG party interactions, part 2) — only SafeToSpendCard.jsx's instance
// passes one (opening the shared amount-entry modal as a shortcut). When present, the mage
// renders as a real <button> and a click plays a brief "spell flash" then calls onClick
// IMMEDIATELY in the same handler, not after a delay — the flash is a purely decorative overlay
// on top of the mage image, not a gate in front of opening the modal, so it can't add latency to
// something people will use often. BudgetMageCard.jsx and TransactionDetail.jsx don't pass
// onClick, so they keep rendering the plain, non-interactive <div> exactly as before.
export default function MageMascot({ message, firing, floatingBubble, onClick }) {
  const { theme, mascotAnimationEnabled, soundEnabled } = useTheme();
  const [firedMessage, setFiredMessage] = useState(null);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (firing) {
      setFiredMessage(SCRIBE_MESSAGES[Math.floor(Math.random() * SCRIBE_MESSAGES.length)]);
      if (soundEnabled) playSound("mageCast");
    } else if (firedMessage) {
      // Delayed, not instant — see ArcherMascot's identical comment: lets the message stay up
      // through the tail end of the cast animation instead of vanishing mid-pose.
      const t = setTimeout(() => setFiredMessage(null), 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firing]);

  if (theme !== "arcade") return null;

  // firedMessage covers both the firing window and its 300ms grace period; message (the static
  // budget-insight prop) is the fallback once neither applies.
  const shownMessage = firedMessage || message;
  const animClass = firing ? "mage-cast" : mascotAnimationEnabled ? "mage-float" : undefined;

  function handleClick() {
    if (soundEnabled) playSound("mageCast");
    if (mascotAnimationEnabled) {
      // Same re-trigger-on-rapid-clicks trick as WarriorMascot's handleClick — force the class
      // off then back on across a frame instead of just setFlashing(true), so clicking again
      // mid-flash restarts the animation instead of the (already-added) class doing nothing.
      setFlashing(false);
      requestAnimationFrame(() => setFlashing(true));
    }
    onClick();
  }

  const content = (
    <>
      {shownMessage && <SpeechBubble text={shownMessage} floating={floatingBubble} />}
      <div className={animClass} style={{ position: "relative", flexShrink: 0, pointerEvents: "none" }}>
        {/* The magic orb glow — a plain CSS radial gradient positioned over roughly where the
            orb sits in mascot-mage.png (right of center, upper-middle), not a separate art
            asset. Percentages are of this wrapper's own box, which is sized to the <img> below
            (flex shrink-to-fit), so they track the image's clamp()/breakpoint sizing for free.
            Idle: a faint, static glow. Firing: ".mage-orb-glow.firing" below spins/pulses it —
            the "the magic circle moves too" effect, distinct from the staff-swing on the image
            itself, which is flat art and can't animate on its own. */}
        <div className={`mage-orb-glow${firing ? " firing" : ""}`} />
        {/* The click "spell flash" (part 2) — a separate overlay div, not another mage-orb-glow
            state, since it needs to cover the whole sprite (a bright flash reading as "a burst
            of magic just before the modal opens"), not just the orb's own small area. */}
        {flashing && <div className="mage-click-flash" onAnimationEnd={() => setFlashing(false)} />}
        <img
          src={new URL("../../assets/mascot-mage.png", import.meta.url).href}
          alt=""
          // Sizing lives in the ".mage-img" CSS class (App.jsx) — same reasoning as
          // WarriorMascot's own img: a clamp() an inline style could still override, but only a
          // stylesheet rule can be swapped per breakpoint by a media query.
          className="mage-img"
          style={{ display: "block", imageRendering: "pixelated" }}
        />
      </div>
    </>
  );

  // justifyContent:"center" (not the full-width flex row this used to be) — BudgetMageCard.jsx
  // is a plain card the width of the whole page, and with the bubble sized to its own content
  // now (not flex:1 stretching to fill whatever's left), a left-anchored row would leave the
  // mage+bubble pair stranded off in a huge empty card; centering keeps them as one compact,
  // deliberately-placed unit regardless of card width. Callers that mount this inside their
  // own absolutely-positioned corner (SafeToSpendCard.jsx, same idiom as WarriorMascot) get a
  // small, self-contained unit either way since the row only ever takes its content's width.
  const rootStyle = { display: "flex", alignItems: "center", justifyContent: "center", position: floatingBubble ? "relative" : undefined };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="นักเวทย์ กดเพื่อบันทึกรายการอย่างรวดเร็ว"
        style={{ ...rootStyle, background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        {content}
      </button>
    );
  }

  return (
    <div style={rootStyle} aria-hidden="true">
      {content}
    </div>
  );
}

// Same pixel-box visual language as WarriorMascot's SpeechBubble (hard-cornered, blocky drop
// shadow, stepped-notch tail) laid out in normal flow instead of position:absolute. First
// version used flex:1, which stretched this to fill the entire rest of the card — a huge flat
// box that read as an empty input field, not a speech bubble, with the tail barely reaching the
// mage. Sized to its own content now (flex: "0 1 auto", maxWidth as a cap for unusually long
// messages) so it hugs the text and stays visually anchored right next to him instead.
function SpeechBubble({ text, floating }) {
  return (
    <div
      style={{
        // floating: position:absolute, pinned to the mage wrapper's left edge (right:100% of
        // that relative-positioned wrapper — see MageMascot's own root div above) instead of a
        // normal flex child with marginRight — see MageMascot's floatingBubble comment for why.
        // Needs width:"max-content" here, not just maxWidth: an absolutely positioned box with
        // only `right` set (no `left`) and the default width:auto falls back to shrink-to-fit
        // sizing, whose "available width" collapsed to ~0 in practice (both the static position
        // AND the specified right edge land at the same point once the bubble is taken out of
        // the flex row), wrapping the text to one character per line. max-content sizes to the
        // text's own natural width instead (still capped by maxWidth below for long messages),
        // sidestepping that shrink-to-fit calculation entirely.
        position: floating ? "absolute" : "relative", // "relative" still needed either way: containing block for the tail below
        ...(floating
          ? { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 0, width: "max-content" }
          : { flex: "0 1 auto", marginRight: 6 }),
        maxWidth: "min(320px, 60vw)",
        wordBreak: "break-word",
        background: "#F5F3FF",
        color: "#1A1030",
        border: "3px solid #1A1030",
        boxShadow: "4px 4px 0 rgba(0,0,0,0.35)",
        borderRadius: 0,
        padding: "8px 10px",
        fontSize: 12,
        lineHeight: 1.4,
        fontFamily: "'IBM Plex Sans Thai', sans-serif",
      }}
    >
      {text}
      {/* Stepped-notch tail pointing right at the mage, same construction as WarriorMascot's. */}
      <div style={{ position: "absolute", left: "100%", top: "50%", marginTop: -7, width: 7, height: 14, background: "#1A1030" }} />
      <div style={{ position: "absolute", left: "100%", top: "50%", marginTop: -4, marginLeft: -3, width: 4, height: 8, background: "#F5F3FF" }} />
    </div>
  );
}
