import React, { useEffect } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { playSound } from "../../lib/sound.js";

// A full-screen, whole-party celebration for reaching a savings goal (RPG party interactions,
// part 5) — deliberately NOT four separate per-page animations. Warrior/Mage live on
// Dashboard.jsx, Archer on Transactions.jsx, Slime on Budgets.jsx; a user is only ever looking
// at one of those pages at a time, so there is no way to make four page-scoped mascots visibly
// celebrate "together" in the way this was asked for. Mounted once at the App.jsx level instead
// (outside any single route) so it can appear over whichever page the user happens to be on,
// showing all four at once here rather than trying to synchronize page-scoped mascots.
//
// goalNames: array of the goal account name(s) that triggered this — plural-safe for the (rare)
// case where more than one goal completes between sessions. App.jsx owns deciding WHEN to show
// this and persisting that it's been shown (celebratedGoalIds, server/state.js) — this component
// only renders the celebration itself and calls onClose when it's done.
export default function PartyLevelUpOverlay({ goalNames, onClose }) {
  const { theme, mascotAnimationEnabled, soundEnabled } = useTheme();

  useEffect(() => {
    // Auto-dismiss — this is a celebration, not a decision the user needs to act on, so it
    // shouldn't sit blocking the screen waiting for a tap. Long enough to actually read the
    // goal name(s) and enjoy the moment, short enough not to feel like it's stuck.
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  // Fires once per mount (this component only ever mounts when there's something new to
  // celebrate — App.jsx doesn't render it otherwise), not tied to any click. Guarded on `theme`
  // itself (not just the early return below) since this hook has to run unconditionally before
  // that return either way (rules of hooks) — without the check here the jingle would still
  // fire on a non-arcade theme even though nothing visibly renders.
  useEffect(() => {
    if (theme === "arcade" && soundEnabled) playSound("levelUp");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (theme !== "arcade") return null;

  return (
    <div
      className="level-up-overlay"
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(10,4,26,0.88)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
      onClick={onClose}
      role="button"
      tabIndex={0}
      aria-label="ปิดหน้าต่างฉลอง"
    >
      {/* Radial burst behind the party — plain CSS, not a separate art asset, same idiom as
          MageMascot's own orb glow / click flash. */}
      <div className={mascotAnimationEnabled ? "level-up-burst" : undefined} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

      <div className={mascotAnimationEnabled ? "level-up-title" : undefined} style={{ fontSize: "clamp(28px, 8vw, 56px)", fontWeight: 800, color: "#FFD75E", textShadow: "0 0 16px rgba(255,215,94,0.8), 4px 4px 0 #1A1030", marginBottom: 8, textAlign: "center" }}>
        ⭐ LEVEL UP! ⭐
      </div>
      <div style={{ fontSize: "clamp(13px, 3.5vw, 16px)", color: "#F5F3FF", marginBottom: 28, textAlign: "center", padding: "0 24px" }}>
        {goalNames.length > 1
          ? `บรรลุเป้าหมาย "${goalNames.join('", "')}" แล้ว!`
          : `บรรลุเป้าหมาย "${goalNames[0]}" แล้ว!`}
      </div>

      <div style={{ display: "flex", gap: "clamp(8px, 3vw, 24px)", alignItems: "flex-end" }}>
        {[
          { src: "mascot-warrior.png", delay: "0s" },
          { src: "mascot-mage.png", delay: "0.15s" },
          { src: "mascot-archer.png", delay: "0.3s" },
          { src: "enemy-slime.png", delay: "0.45s" },
        ].map((m) => (
          <img
            key={m.src}
            src={new URL(`../../assets/${m.src}`, import.meta.url).href}
            alt=""
            className={mascotAnimationEnabled ? "level-up-char" : undefined}
            style={{
              width: "clamp(56px, 18vw, 110px)", height: "clamp(56px, 18vw, 110px)",
              imageRendering: "pixelated", animationDelay: m.delay,
            }}
          />
        ))}
      </div>

      <div style={{ fontSize: 11, color: "var(--color-inkMuted, #a89ec9)", marginTop: 28 }}>แตะที่ไหนก็ได้เพื่อปิด</div>
    </div>
  );
}
