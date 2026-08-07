import React, { useEffect, useState } from "react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { fetchTransactions } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { daysInMonth, toISODate } from "../../shared/dates.js";
import { STREAK_WINDOW_DAYS } from "../lib/streak.js";
import { computeMageInsights } from "../lib/mageInsight.js";
import { card } from "./sharedStyles.js";
import AddBudgetSheet from "./AddBudgetSheet.jsx";
import MageMascot from "./mascot/MageMascot.jsx";

const INSIGHT_ROTATE_MS = 5000;

// pointerEvents:"auto" overrides the body wrapper's own pointerEvents:"none" below (a child can
// always re-enable pointer events an ancestor turned off) — this button is the one real
// interactive element inside that wrapper and needs to stay clickable.
const ctaBtn = { padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--color-primary)", color: "var(--color-white)", fontWeight: 700, fontSize: 13, pointerEvents: "auto" };

// expenseCentsSoFar: the viewed month's expense total, computed by Dashboard.jsx.
// Only valid to display when isCurrentMonth is true, which is exactly when this card renders its number.
// onMageClick: Dashboard.jsx's setShowForm(true) — opens the same amount-entry modal the "+"
// FAB does (RPG party interactions, part 2). Passed through even on the isCurrentMonth===false
// early return below would be pointless (that state hides the whole card), so it's only actually
// used in the main render path.
//
// mageFiring: (2026-08-07) NOT the main save-success reaction anymore — Dashboard.jsx's own
// full-screen MageSpellOverlay replaced this mage's old small in-card cast animation for that.
// Dashboard.jsx only ever sets this when mascotAnimationEnabled is OFF, as that case's fallback
// (a plain, motion-free "จดไว้แล้ว!" bubble here instead of the overlay) — same
// enabled-gets-overlay/disabled-gets-plain-inline-bubble split as BudgetMageCard.jsx.
export default function SafeToSpendCard({ isCurrentMonth, expenseCentsSoFar, mageFiring, onMageClick }) {
  const { budgets, refetch } = useReferenceData();
  const [showSheet, setShowSheet] = useState(false);

  // Mage Insight (2026-08-07) — self-contained fetch, same idiom as StreakBadge.jsx/
  // NoEntryTodayBanner.jsx: always reflects the real current date/month regardless of which
  // month Dashboard.jsx's own calendar cursor is pointed at. Fetches the same STREAK_WINDOW_DAYS
  // (120 days) StreakBadge already uses — not because streak and insight are related, just a
  // convenient shared "far enough back to be statistically meaningful, not so far it's wasteful"
  // constant, and computeWorstWeekday wants a real multi-week window to average over.
  const [insights, setInsights] = useState([]);
  const [insightIndex, setInsightIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - STREAK_WINDOW_DAYS);
    fetchTransactions({ from: toISODate(from), to: toISODate(today) })
      .then((rows) => {
        if (cancelled) return;
        setInsights(computeMageInsights(rows, from, today, today));
        setInsightIndex(0);
      })
      .catch(() => { if (!cancelled) setInsights([]); }); // stay silent — a nice-to-have bubble, not critical data
    return () => { cancelled = true; };
  }, []);

  // Rotates through whatever insights were actually computable — a no-op interval if there's
  // only 0 or 1 (nothing to rotate TO), so this never re-renders the card pointlessly in that
  // case.
  useEffect(() => {
    if (insights.length < 2) return undefined;
    const id = setInterval(() => {
      setInsightIndex((i) => (i + 1) % insights.length);
    }, INSIGHT_ROTATE_MS);
    return () => clearInterval(id);
  }, [insights]);

  if (!isCurrentMonth) {
    return (
      <div style={{ ...card, marginBottom: 16, textAlign: "center", color: "var(--color-inkMuted)", fontSize: 12 }}>
        การ์ด "ใช้ได้อีกวันนี้" แสดงเฉพาะเดือนปัจจุบันเท่านั้น
      </div>
    );
  }

  const budgetTotalCents = budgets.reduce((s, b) => s + b.monthlyLimitCents, 0);

  let body;
  if (budgets.length === 0) {
    body = (
      <>
        <div style={{ fontSize: 13, color: "var(--color-inkMuted)", marginBottom: 10 }}>
          ยังไม่ได้ตั้งงบประมาณ — ตั้งเพื่อดูว่าวันนี้ใช้ได้อีกเท่าไหร่
        </div>
        <button type="button" style={ctaBtn} onClick={() => setShowSheet(true)}>+ ตั้งงบประมาณ</button>
      </>
    );
  } else {
    const now = new Date();
    const daysRemaining = daysInMonth(now.getFullYear(), now.getMonth()) - now.getDate() + 1;
    const overBudget = expenseCentsSoFar > budgetTotalCents;
    if (overBudget) {
      body = (
        <>
          <div style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>เกินงบเดือนนี้แล้ว</div>
          <div className="num" style={{ fontSize: 30, fontWeight: 600, color: "var(--color-danger)" }}>
            {centsToDisplay(expenseCentsSoFar - budgetTotalCents)}
          </div>
        </>
      );
    } else {
      const perDayCents = Math.floor((budgetTotalCents - expenseCentsSoFar) / daysRemaining);
      body = (
        <>
          <div style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>ใช้ได้อีกวันนี้</div>
          <div className="num" style={{ fontSize: 34, fontWeight: 600, color: "var(--color-ink)" }}>{centsToDisplay(perDayCents)}</div>
          <div style={{ fontSize: 11, color: "var(--color-inkMuted)", marginTop: 4 }}>เหลืออีก {daysRemaining} วันในเดือนนี้</div>
        </>
      );
    }
  }

  return (
    <div style={{ ...card, marginBottom: 16, position: "relative", overflow: "hidden" }} className="safe-to-spend-card">
      {/* zIndex:1 so this text reliably paints above the mage mount below regardless of DOM
          order — same safety-net idiom as Dashboard.jsx's net-worth numbers over WarriorMascot.
          pointerEvents:"none" — same fix as that same net-worth div: this box spans the full
          card width, so it was silently swallowing every real click aimed at the mage wherever
          the two boxes overlapped (see Dashboard.jsx's own comment on this exact bug). The one
          real interactive element inside (the "+ ตั้งงบประมาณ" button, empty-budgets state)
          re-enables itself via its own pointerEvents:"auto" (ctaBtn above). */}
      <div style={{ position: "relative", zIndex: 1, pointerEvents: "none" }}>{body}</div>
      {/* MageMascot mount — arcade-only (MageMascot itself renders null off-theme, so this div
          is harmless dead weight on every other theme, same as WarriorMascot's own mount).
          Positioned like WarriorMascot's corner mount on the net-worth card: absolute, clear of
          the left-aligned text above. */}
      <div className="scribe-mage-mount">
        {/* message (the rotating insight) and firing are meant to never both matter at once —
            MageMascot's own firedMessage state already overrides message for the brief firing
            window, then falls back to whatever message currently is, exactly matching "insights
            keep rotating in the idle state, tapping still reacts normally" (MageMascot.jsx's own
            comment documents this as the intended contract between the two props). */}
        <MageMascot message={insights[insightIndex]} firing={mageFiring} firingText="จดไว้แล้ว! ✨" onClick={onMageClick} />
      </div>
      <AddBudgetSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        onSaved={async () => { await refetch(); setShowSheet(false); }}
      />
    </div>
  );
}
