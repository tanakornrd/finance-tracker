import React from "react";
import { useTheme } from "../../context/ThemeContext.jsx";

// Original chibi runner mascot — NOT a costumed human superhero: no mask/cowl, no chest emblem,
// plain cartoon face. Red top with a couple of small scattered lightning-bolt decorations, gold
// pants — the color brief without recreating a specific copyrighted costume design (a full-body
// suit + circular chest emblem + cowl reads as one particular character; a shirt + separate
// pants + bare cartoon face reads as an original runner in similar colors instead).
function RunnerSvg({ running }) {
  return (
    <svg viewBox="0 0 100 120" width="70" height="84" style={{ overflow: "visible" }}>
      {/* Motion streaks trailing behind — only drawn while actually dashing, not in the static
          idle pose (reduced-motion / animation-off fallback). */}
      {running && (
        <g stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" opacity="0.6">
          <line x1="-6" y1="50" x2="-26" y2="50" />
          <line x1="-2" y1="62" x2="-30" y2="62" />
          <line x1="-6" y1="74" x2="-22" y2="74" />
        </g>
      )}

      {/* Back leg */}
      <g className={running ? "runner-leg-back" : undefined} style={{ transformOrigin: "50px 68px" }}>
        <rect x="44" y="68" width="12" height="30" rx="6" fill="var(--color-secondary)" />
        <ellipse cx="50" cy="100" rx="9" ry="5" fill="var(--color-ink)" />
      </g>
      {/* Front leg */}
      <g className={running ? "runner-leg-front" : undefined} style={{ transformOrigin: "50px 68px" }}>
        <rect x="44" y="68" width="12" height="30" rx="6" fill="var(--color-secondary)" />
        <ellipse cx="50" cy="100" rx="9" ry="5" fill="var(--color-ink)" />
      </g>

      {/* Torso */}
      <rect x="34" y="38" width="32" height="34" rx="10" fill="var(--color-primary)" />
      <g stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9">
        <polyline points="42,46 47,54 43,54 48,63" />
        <polyline points="58,48 62,55 59,55 63,62" />
      </g>

      {/* Back arm */}
      <g className={running ? "runner-arm-back" : undefined} style={{ transformOrigin: "40px 44px" }}>
        <rect x="34" y="44" width="10" height="24" rx="5" fill="var(--color-primary)" />
      </g>
      {/* Front arm */}
      <g className={running ? "runner-arm-front" : undefined} style={{ transformOrigin: "60px 44px" }}>
        <rect x="56" y="44" width="10" height="24" rx="5" fill="var(--color-primary)" />
      </g>

      {/* Head — plain cartoon face, no mask */}
      <circle cx="50" cy="22" r="17" fill="#F2C29A" />
      <circle cx="44" cy="21" r="2.2" fill="var(--color-ink)" />
      <circle cx="56" cy="21" r="2.2" fill="var(--color-ink)" />
      <path d="M 43,29 Q 50,33 57,29" stroke="var(--color-ink)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function SpeedsterMascot() {
  const { theme, mascotAnimationEnabled } = useTheme();
  if (theme !== "speedster") return null;

  return (
    <div
      className={mascotAnimationEnabled ? "mascot-dash" : undefined}
      style={{
        position: "absolute",
        top: 64,
        // Static fallback position (reduced motion / toggle off) — a resting spot near the
        // right edge.
        ...(mascotAnimationEnabled ? {} : { right: 8 }),
        pointerEvents: "none",
        zIndex: 5,
      }}
      aria-hidden="true"
    >
      <RunnerSvg running={mascotAnimationEnabled} />
    </div>
  );
}
