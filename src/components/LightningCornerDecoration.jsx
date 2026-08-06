import React from "react";
import { useTheme } from "../context/ThemeContext.jsx";

// Absolute relative to ".app-container" so it hugs that container's real edges at any width,
// pointer-events:none, very low opacity so it never competes with foreground text/number
// contrast. Bright yellow/orange jagged bolts, per the speedster theme's own visual language.
function LightningBolt({ style }) {
  return (
    <svg viewBox="0 0 60 140" width="60" height="140" style={style}>
      <polygon
        points="38,0 10,70 26,70 14,140 50,55 32,55"
        fill="var(--color-accent)"
      />
    </svg>
  );
}

export default function LightningCornerDecoration() {
  const { theme } = useTheme();
  if (theme !== "speedster") return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.1, overflow: "hidden" }}>
      <LightningBolt style={{ position: "absolute", top: -10, left: 20, transform: "rotate(-8deg)" }} />
      <LightningBolt style={{ position: "absolute", top: 30, right: 30, transform: "rotate(10deg) scaleX(-1)" }} />
      <LightningBolt style={{ position: "absolute", bottom: -20, left: "40%", transform: "rotate(4deg)", opacity: 0.7 }} />
    </div>
  );
}
