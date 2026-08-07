import React, { useEffect } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { playSound } from "../../lib/sound.js";

// Full-screen "spell cast" flash for a successful budget save on Budgets.jsx (RPG party
// interactions follow-up, 2026-08-07) — same overlay idiom as PartyLevelUpOverlay.jsx (fixed,
// full-viewport, auto-dismisses, click-to-close early), but page-scoped here (mounted from
// Budgets.jsx itself, only for its own "ตั้งงบประมาณ" form) rather than App.jsx-level, and much
// shorter — this is a brief flourish on a routine save, not a rare milestone worth 5 full
// seconds. No new art: reuses mascot-mage.png (already in src/assets) plus a CSS-drawn magic
// circle (conic-gradient ring), same "plain CSS, not a separate asset" idiom as MageMascot's own
// orb glow.
export default function BudgetSpellOverlay({ onClose }) {
  const { theme, mascotAnimationEnabled, soundEnabled } = useTheme();

  useEffect(() => {
    // 1400ms — a little past the 1.2s CSS animation below so the fade-out actually finishes
    // on-screen instead of being cut off mid-fade, but short enough to never feel like it's
    // blocking the page; the user can also tap to close it early at any point regardless.
    const t = setTimeout(onClose, 1400);
    return () => clearTimeout(t);
  }, [onClose]);

  useEffect(() => {
    if (theme === "arcade" && soundEnabled) playSound("mageCast");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (theme !== "arcade") return null;

  return (
    <div
      className="budget-spell-overlay"
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        background: "rgba(10,4,26,0.7)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
      }}
      onClick={onClose}
      role="button"
      tabIndex={0}
      aria-label="ปิดหน้าต่างเอฟเฟกต์"
    >
      <div
        className={mascotAnimationEnabled ? "budget-spell-circle" : undefined}
        style={{
          position: "relative",
          width: "clamp(160px, 45vw, 260px)", height: "clamp(160px, 45vw, 260px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {/* The ring itself — a conic-gradient disc masked down to just its outer band, so it
            reads as a rotating magic circle rather than a filled pie. Kept as its own layer
            (not merged onto the wrapper above) so the mascotAnimationEnabled gate and the
            rotate+fade keyframe can be swapped out together via one class name, same pattern as
            MageMascot's own .mage-orb-glow.firing. */}
        <div
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "conic-gradient(from 0deg, #FFD75E, #FF8A3D, #FFD75E 50%, #FF8A3D, #FFD75E)",
            WebkitMask: "radial-gradient(closest-side, transparent 72%, black 74%, black 100%)",
            mask: "radial-gradient(closest-side, transparent 72%, black 74%, black 100%)",
            filter: "drop-shadow(0 0 18px rgba(255,180,80,0.65))",
          }}
        />
        <img
          src={new URL("../../assets/mascot-mage.png", import.meta.url).href}
          alt=""
          style={{ position: "relative", width: "48%", height: "48%", imageRendering: "pixelated" }}
        />
      </div>
      <div style={{ fontSize: "clamp(13px, 3.5vw, 16px)", color: "#F5F3FF", marginTop: 18, textAlign: "center", textShadow: "2px 2px 0 #1A1030" }}>
        บันทึกงบประมาณเรียบร้อย! ✨
      </div>
    </div>
  );
}
