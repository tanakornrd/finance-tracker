import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

// Pixel-art mage advisor for the "arcade" theme — mounted inside BudgetMageCard.jsx, a small
// self-contained card BudgetMageCard.jsx owns entirely (unlike WarriorMascot.jsx, which has to
// share Dashboard's pre-existing net-worth card and so leans on absolute positioning + clamp()
// tricks to avoid covering that card's own numbers). Because this component's parent card exists
// only to hold it, the bubble+mage layout here is plain flow (a flex row), not absolute — simpler,
// and there's no risk of covering unrelated content since there isn't any in this card.
export default function MageMascot({ message }) {
  const { theme, mascotAnimationEnabled } = useTheme();
  if (theme !== "arcade") return null;

  return (
    // justifyContent:"center" (not the full-width flex row this used to be) — BudgetMageCard.jsx
    // is a plain card the width of the whole page, and with the bubble sized to its own content
    // now (not flex:1 stretching to fill whatever's left), a left-anchored row would leave the
    // mage+bubble pair stranded off in a huge empty card; centering keeps them as one compact,
    // deliberately-placed unit regardless of card width.
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
      {message && <SpeechBubble text={message} />}
      <div
        className={mascotAnimationEnabled ? "mage-float" : undefined}
        style={{ flexShrink: 0, pointerEvents: "none" }}
      >
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
