import React from "react";
import { useCardPress } from "../lib/useCardPress.js";

// Thin wrapper around useCardPress.js for the common case (a card rendered inside a .map() —
// transaction rows, etc.) — the hook itself can't be called directly inside a loop callback
// (rules of hooks), but a small component CAN be instantiated once per iteration, each getting
// its own independent pressed state. Anywhere rendering a single one-off card (Dashboard.jsx's
// own net-worth card) can just call useCardPress() itself instead of reaching for this.
export default function PressableCard({ as: Tag = "div", style, className = "", children, ...rest }) {
  const { pressed, handlers } = useCardPress();
  return (
    <Tag
      style={style}
      className={`press-card${pressed ? " press-active" : ""}${className ? ` ${className}` : ""}`}
      {...handlers}
      {...rest}
    >
      {children}
    </Tag>
  );
}
