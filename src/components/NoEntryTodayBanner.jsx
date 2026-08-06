import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchTransactions } from "../api.js";
import { toISODate } from "../../shared/dates.js";
import { colors, iconBtn } from "./sharedStyles.js";

const DISMISS_KEY = "financeTrackerNoEntryBannerDismissedDate";

function todayStr() {
  return toISODate(new Date());
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === todayStr();
  } catch {
    // localStorage can throw in some private-browsing modes — fail open (show the banner)
    // rather than crash the dashboard over a nice-to-have persistence feature.
    return false;
  }
}

// Self-contained, like PendingBillsCard.jsx: does its own fetch rather than reusing Dashboard's
// month-scoped `rangeTx`, specifically so this always reflects *today* — Dashboard's own
// transaction window follows whatever month the user has navigated the calendar to, which would
// silently break this check the moment they page back/forward away from the current month.
//
// `refreshSignal` is bumped by Dashboard.jsx right after a transaction is saved, so the banner
// disappears immediately once today has an entry instead of waiting for the next full page load.
export default function NoEntryTodayBanner({ refreshSignal }) {
  const [hasEntryToday, setHasEntryToday] = useState(null); // null = still checking
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    let cancelled = false;
    const today = todayStr();
    fetchTransactions({ from: today, to: today })
      .then((rows) => { if (!cancelled) setHasEntryToday(rows.length > 0); })
      .catch(() => { if (!cancelled) setHasEntryToday(null); }); // stay silent on error — this is a nudge, not critical data
    return () => { cancelled = true; };
  }, [refreshSignal]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, todayStr());
    } catch {
      // persistence-is-a-nice-to-have, same reasoning as readDismissed() above
    }
  }

  if (hasEntryToday !== false || dismissed) return null;

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: colors.accentTint, border: `1px solid ${colors.accentBorder}`, color: colors.accentInk,
        fontSize: 12, borderRadius: 10, padding: "10px 12px", marginBottom: 14,
      }}
    >
      <span style={{ flex: 1 }}>📝 วันนี้ยังไม่มีการบันทึกรายการเลย อย่าลืมจดนะ</span>
      <button onClick={dismiss} style={iconBtn} aria-label="ปิด">
        <X size={14} color={colors.accentInk} />
      </button>
    </div>
  );
}
