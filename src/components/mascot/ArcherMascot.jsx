import React, { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

// Picked once per successful save (see the useEffect below), not re-rendered fresh every time —
// otherwise the message would flicker between different lines as the parent re-renders while
// `firing` stays true.
const CHEER_MESSAGES = [
  "ยิงเข้าเป้า! บันทึกเรียบร้อย 🎯",
  "แม่นมาก! บันทึกให้แล้วนะ",
  "เก็บครบ ไม่พลาดสักนัด!",
  "ธนูดอกนี้บันทึกเรียบร้อย!",
];

// Pixel-art archer for the "arcade" theme — mounted inline near the top of Transactions.jsx
// (the "รายการ" tab's transaction list) as a standing idle presence while browsing, no reactive
// duty of its own. The `firing`/CHEER_MESSAGES machinery below was originally exercised from
// Dashboard.jsx/TransactionDetail.jsx on a successful save; that reactive role moved to
// MageMascot's own `firing` mode instead (see that component), leaving this one purely idle in
// its current home — but `firing` is kept here rather than stripped out, since the component is
// otherwise unchanged and there's no reason a future spot for the archer couldn't reuse it.
export default function ArcherMascot({ firing }) {
  const { theme, mascotAnimationEnabled } = useTheme();
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (firing) {
      setMessage(CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)]);
    } else {
      // Delayed, not instant — the caller flips `firing` back off around the same time the
      // shoot animation finishes, so clearing the bubble immediately would cut the message off
      // mid-animation instead of letting it fade out with the pose.
      const t = setTimeout(() => setMessage(null), 300);
      return () => clearTimeout(t);
    }
  }, [firing]);

  if (theme !== "arcade") return null;

  return (
    // justifyContent left-anchored (no `justify-content: flex-end` here) — this sits at the
    // opposite side of the page from Dashboard's month-badge / TransactionDetail's "แก้ไข"
    // button, which both already occupy the right side of their own header row, so anchoring
    // the archer left avoids stacking two things in the same corner.
    <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }} aria-hidden="true">
      <div
        className={firing ? "archer-fire" : mascotAnimationEnabled ? "archer-idle" : undefined}
        style={{ flexShrink: 0, pointerEvents: "none" }}
      >
        <img
          src={new URL("../../assets/mascot-archer.png", import.meta.url).href}
          alt=""
          // No horizontal flip — the source art already faces right, which is the direction the
          // speech bubble sits in this layout (bubble to the archer's right, unlike Warrior's/
          // Mage's bubble-on-the-left), so "facing toward what he's reacting to" falls out
          // naturally without needing scaleX(-1).
          className="archer-img"
          style={{ display: "block", imageRendering: "pixelated" }}
        />
      </div>
      {message && <SpeechBubble text={message} />}
    </div>
  );
}

// Mirror of MageMascot's SpeechBubble — same pixel-box visual language, but the tail points
// LEFT (right:"100%") since the archer stands to this bubble's left, not its right.
function SpeechBubble({ text }) {
  return (
    <div
      style={{
        position: "relative",
        flex: "0 1 auto",
        maxWidth: "min(280px, 60vw)",
        wordBreak: "break-word",
        marginLeft: 6,
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
      {/* Stepped-notch tail pointing left at the archer — same construction as
          WarriorMascot/MageMascot's tail, mirrored to the bubble's left edge. */}
      <div style={{ position: "absolute", right: "100%", top: "50%", marginTop: -7, width: 7, height: 14, background: "#1A1030" }} />
      <div style={{ position: "absolute", right: "100%", top: "50%", marginTop: -4, marginRight: -3, width: 4, height: 8, background: "#F5F3FF" }} />
    </div>
  );
}
