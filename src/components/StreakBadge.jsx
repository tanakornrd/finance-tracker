import React, { useEffect, useState } from "react";
import { fetchTransactions } from "../api.js";
import { toISODate } from "../../shared/dates.js";
import { computeStreak, STREAK_WINDOW_DAYS } from "../lib/streak.js";
import { useTheme } from "../context/ThemeContext.jsx";

// Self-contained, same idiom as NoEntryTodayBanner.jsx/PendingBillsCard.jsx: does its own fetch
// rather than reusing Dashboard's month-scoped `rangeTx`, specifically so this always reflects
// *today's* real streak — Dashboard's own transaction window follows whatever month the user has
// navigated the calendar to, which would silently break this the moment they page away from the
// current month. Fetches exactly STREAK_WINDOW_DAYS back (streak.js's own cap — no point fetching
// further than computeStreak will ever count) rather than "all transactions" the way
// Transactions.jsx does, since that page already has its full history loaded for other reasons
// and this one doesn't.
//
// `refreshSignal` (optional) lets Dashboard.jsx bump this right after a save, same convention as
// NoEntryTodayBanner's own prop, so a fresh streak reflects immediately rather than waiting for
// the next full page load.
export default function StreakBadge({ refreshSignal }) {
  const { theme } = useTheme();
  const [streak, setStreak] = useState(null); // null = still loading (or failed) — renders nothing either way

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - STREAK_WINDOW_DAYS);
    fetchTransactions({ from: toISODate(from), to: toISODate(today) })
      .then((rows) => { if (!cancelled) setStreak(computeStreak(rows, today)); })
      .catch(() => { if (!cancelled) setStreak(null); }); // stay silent on error — a nice-to-have badge, not critical data
    return () => { cancelled = true; };
  }, [refreshSignal]);

  // Nothing to celebrate at 0 — skip the badge entirely rather than show "🔥 0 วันติด", which
  // would read as a nag/failure state on every fresh account instead of just staying quiet.
  if (!streak || streak.days === 0) return null;

  const label = `🔥 ${streak.capped ? `${STREAK_WINDOW_DAYS}+` : streak.days} วันติด`;

  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        marginTop: 6,
        padding: "4px 10px",
        borderRadius: theme === "arcade" ? 0 : 999,
        fontSize: 12, fontWeight: 700,
        background: "var(--color-accentTint)",
        color: "var(--color-accentInk)",
        border: theme === "arcade" ? "2px solid var(--color-ink)" : "1px solid var(--color-accentBorder)",
        // Same blocky drop-shadow idiom every other pixel-box in the arcade theme uses (mascot
        // speech bubbles, etc.) — 0 blur, hard offset. Plain themes get no shadow at all, same
        // as their other small pill badges elsewhere in the app.
        boxShadow: theme === "arcade" ? "2px 2px 0 rgba(0,0,0,0.35)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}
