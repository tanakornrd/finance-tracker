import React, { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

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
export default function MageMascot({ message, firing }) {
  const { theme, mascotAnimationEnabled } = useTheme();
  const [firedMessage, setFiredMessage] = useState(null);

  useEffect(() => {
    if (firing) {
      setFiredMessage(SCRIBE_MESSAGES[Math.floor(Math.random() * SCRIBE_MESSAGES.length)]);
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

  return (
    // justifyContent:"center" (not the full-width flex row this used to be) — BudgetMageCard.jsx
    // is a plain card the width of the whole page, and with the bubble sized to its own content
    // now (not flex:1 stretching to fill whatever's left), a left-anchored row would leave the
    // mage+bubble pair stranded off in a huge empty card; centering keeps them as one compact,
    // deliberately-placed unit regardless of card width. Callers that mount this inside their
    // own absolutely-positioned corner (SafeToSpendCard.jsx, same idiom as WarriorMascot) get a
    // small, self-contained unit either way since the row only ever takes its content's width.
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
      {shownMessage && <SpeechBubble text={shownMessage} />}
      <div className={animClass} style={{ position: "relative", flexShrink: 0, pointerEvents: "none" }}>
        {/* The magic orb glow — a plain CSS radial gradient positioned over roughly where the
            orb sits in mascot-mage.png (right of center, upper-middle), not a separate art
            asset. Percentages are of this wrapper's own box, which is sized to the <img> below
            (flex shrink-to-fit), so they track the image's clamp()/breakpoint sizing for free.
            Idle: a faint, static glow. Firing: ".mage-orb-glow.firing" below spins/pulses it —
            the "the magic circle moves too" effect, distinct from the staff-swing on the image
            itself, which is flat art and can't animate on its own. */}
        <div className={`mage-orb-glow${firing ? " firing" : ""}`} />
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
    </div>
  );
}

// Same pixel-box visual language as WarriorMascot's SpeechBubble (hard-cornered, blocky drop
// shadow, stepped-notch tail) laid out in normal flow instead of position:absolute. First
// version used flex:1, which stretched this to fill the entire rest of the card — a huge flat
// box that read as an empty input field, not a speech bubble, with the tail barely reaching the
// mage. Sized to its own content now (flex: "0 1 auto", maxWidth as a cap for unusually long
// messages) so it hugs the text and stays visually anchored right next to him instead.
function SpeechBubble({ text }) {
  return (
    <div
      style={{
        position: "relative", // containing block for the tail below, same trick as WarriorMascot
        flex: "0 1 auto",
        maxWidth: "min(320px, 60vw)",
        wordBreak: "break-word",
        // 6, not the previous flex `gap: 10` on the parent — matches WarriorMascot's own
        // marginRight:6, close enough that the 7px tail below all but touches the mage.
        marginRight: 6,
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
