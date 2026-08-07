import { useState } from "react";
import { useTheme } from "../context/ThemeContext.jsx";
import { playSound } from "./sound.js";

// Card press feedback (2026-08-07) — shrink-then-bounce-back on tap, transform-only (no width/
// height/margin, so this never triggers layout/reflow — just a GPU-composited scale, cheap on
// mobile) + a light click tick. Pointer events (not CSS :active) on purpose: :active alone
// famously doesn't reliably fire on tap for a plain, non-form element in iOS Safari unless a
// touch listener is already attached somewhere in the chain — pointerdown/up/cancel/leave covers
// touch + mouse + pen in one API without that gotcha, and gives an explicit moment (pointerdown)
// to play the sound on rather than guessing from a CSS pseudo-class.
//
// Reuses the same mascotAnimationEnabled/soundEnabled toggles as every other animation/sound in
// the app (ThemeContext) rather than adding a third settings switch just for this — same
// underlying "do I want motion/sound" preference a user already set once. prefers-reduced-motion
// is handled separately, in App.jsx's CSS (the ".press-active" class's transform is zeroed out
// there), not here — this hook still tracks `pressed`/plays sound either way, since suppressing
// the animation is a CSS-only concern and duplicating that check here would just be two sources
// of truth for the same thing.
export function useCardPress() {
  const { mascotAnimationEnabled, soundEnabled } = useTheme();
  const [pressed, setPressed] = useState(false);

  function onPointerDown() {
    if (mascotAnimationEnabled) setPressed(true);
    if (soundEnabled) playSound("cardTap");
  }
  function release() {
    setPressed(false);
  }

  return {
    pressed,
    handlers: {
      onPointerDown,
      onPointerUp: release,
      onPointerCancel: release,
      onPointerLeave: release,
    },
  };
}
