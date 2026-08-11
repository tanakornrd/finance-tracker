import React, { useState } from "react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { centsToDisplay } from "../../shared/money.js";
import { daysInMonth } from "../../shared/dates.js";
import { card } from "./sharedStyles.js";
import AddBudgetSheet from "./AddBudgetSheet.jsx";
import MageMascot from "./mascot/MageMascot.jsx";

// pointerEvents:"auto" is a no-op now (the header's text wrapper no longer sets
// pointerEvents:"none" on an ancestor — that was only ever needed while Mage sat absolutely
// positioned UNDER this same box, see the header's own 2026-08-11 comment on why that's gone).
// Left in place since it's harmless and this button is exactly the element it would matter for
// if that ever came back.
const ctaBtn = { padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--color-primary)", color: "var(--color-white)", fontWeight: 700, fontSize: 13, pointerEvents: "auto" };

// expenseCentsBeforeToday / expenseCentsToday: the current month's expense total split at the
// day boundary, computed by Dashboard.jsx. Kept separate (rather than one combined
// "so far this month" total) so today's allowance can be pinned for the whole day — see the
// perDayCents/remainingTodayCents comment below for why a single blended total was the bug.
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
const COLOR_NORMAL = "var(--color-primary)";
const COLOR_WARN = "var(--color-accent)";
const COLOR_OVER = "var(--color-danger)";

export default function SafeToSpendCard({ isCurrentMonth, expenseCentsBeforeToday, expenseCentsToday, spentByCategory, mageFiring, onMageClick, mageSrc }) {
  const { theme } = useTheme();
  const { budgets: allBudgets, refetch } = useReferenceData();
  // `allBudgets` mixes category budgets and festival budgets now (2026-08-08, ชุด 4.1 — see
  // server/routes/budgets.js's own comment). This card's whole point is "today's slice of your
  // MONTHLY category budgets" — summing a festival's one-off total in here too would inflate
  // budgetTotalCents with an unrelated number and skew the daily figure below.
  const budgets = allBudgets.filter((b) => !b.festivalStartDate);
  const [showSheet, setShowSheet] = useState(false);
  const spentMap = spentByCategory || {};

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
    const expenseCentsSoFar = expenseCentsBeforeToday + expenseCentsToday;
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
      // Today's allowance is pinned once per render of the day: split the budget that's left
      // *before today's own spending* across the days remaining (today included), then subtract
      // only what's actually been spent today. That keeps the number fixed at, say, 100 baht all
      // day instead of re-averaging it down every time a purchase is logged (the old formula
      // divided the whole month's running total by daysRemaining on every render, so spending
      // exactly your "allowance" for today never brought it to zero — it just recomputed a new,
      // slightly lower average including tomorrow and beyond, which read as "I used it all and
      // it still says I have money left").
      const todayQuotaCents = Math.floor((budgetTotalCents - expenseCentsBeforeToday) / daysRemaining);
      const remainingTodayCents = todayQuotaCents - expenseCentsToday;
      if (remainingTodayCents < 0) {
        body = (
          <>
            <div style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>ใช้เกินโควตาวันนี้แล้ว</div>
            <div className="num" style={{ fontSize: 30, fontWeight: 600, color: "var(--color-danger)" }}>
              {centsToDisplay(-remainingTodayCents)}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-inkMuted)", marginTop: 4 }}>พรุ่งนี้จะคำนวณโควตาใหม่จากงบที่เหลือ</div>
          </>
        );
      } else {
        body = (
          <>
            <div style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>ใช้ได้อีกวันนี้</div>
            <div className="num" style={{ fontSize: 34, fontWeight: 600, color: "var(--color-ink)" }}>{centsToDisplay(remainingTodayCents)}</div>
            <div style={{ fontSize: 11, color: "var(--color-inkMuted)", marginTop: 4 }}>เหลืออีก {daysRemaining} วันในเดือนนี้</div>
          </>
        );
      }
    }
  }

  // สัดส่วนรายหมวด — a compact companion to the one number above: which categories are eating
  // the budget, so "เกินงบไปแล้ว" isn't just a total with no clue which spending caused it.
  // Deliberately lighter than Budgets.jsx's own progress list (no icons/mascot/delete button —
  // this card is a Dashboard summary, not the budget-management screen), but reuses the exact
  // same 80%-warn / at-or-over-limit-danger thresholds and colors so the two screens read as one
  // consistent system. Sorted worst-first (over budget, then closest to it) so problems surface
  // without the user having to scan the whole list.
  let categoryBreakdown = null;
  if (budgets.length > 0) {
    const rows = budgets
      .map((b) => {
        const spentCents = spentMap[b.category] || 0;
        const pct = b.monthlyLimitCents > 0 ? (spentCents / b.monthlyLimitCents) * 100 : 0;
        const over = spentCents >= b.monthlyLimitCents;
        const warn = !over && pct >= 80;
        const color = over ? COLOR_OVER : warn ? COLOR_WARN : COLOR_NORMAL;
        return { ...b, spentCents, pct, over, warn, color };
      })
      .sort((a, b) => b.pct - a.pct);
    categoryBreakdown = (
      // position:relative + zIndex:1 (2026-08-11) — same safety net as the header text above:
      // Mage's corner mount has no explicit z-index of its own, so on a card with a lot of
      // category rows (tall enough for his corner overlap to reach down into this list) this
      // keeps the list's own text/bars painting on top of him instead of underneath.
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-divider)", position: "relative", zIndex: 1 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: "var(--color-ink)" }}>{r.category}</span>
              <span className="num" style={{ color: r.color }}>
                {centsToDisplay(r.spentCents)} / {centsToDisplay(r.monthlyLimitCents)}
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "var(--color-divider)", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, r.pct)}%`, height: "100%", background: r.color, borderRadius: 3 }} />
            </div>
            {r.over && (
              <div style={{ fontSize: 11, color: COLOR_OVER, marginTop: 3 }}>
                ⚠️ เกินงบหมวดนี้ {centsToDisplay(r.spentCents - r.monthlyLimitCents)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    // overflow moved to the ".safe-to-spend-card" CSS class (App.jsx) instead of inline here —
    // same reasoning as Dashboard.jsx's own ".passbook-card": arcade needs "visible" so Mage can
    // stand taller than the card and spill past its corner, every other theme (which never
    // renders Mage at all) keeps "hidden" same as before.
    <div style={{ ...card, marginBottom: 16, position: "relative" }} className="safe-to-spend-card">
      {/* Header block (2026-08-11, "ให้มาสคอตล้นออกนอกกรอบการ์ดได้") — back to text pinned in
          normal flow + Mage absolutely positioned in the corner, undoing the same day's earlier
          "centered flex pair" version (see git history) now that overflowing the card is the
          actual goal: a flex sibling can't spill past its own row's edges the way an
          absolutely-positioned corner mount (same idiom as Dashboard.jsx's ".warrior-mount") can.
          zIndex:1 on the text itself is a safety net (matches Dashboard.jsx's own numbers
          wrapper) keeping the "ใช้ได้อีกวันนี้" figure readable if a long message ever overlapped
          Mage's corner.

          Mage's mount is nested INSIDE this header now, not a sibling after it (2026-08-11,
          second pass — a real bug the first version had: anchoring to ".safe-to-spend-card"
          itself put him bottom-right of the WHOLE card, including everything categoryBreakdown
          adds below. On a card with several budgeted categories, that pushed him down past all
          those rows entirely — nowhere near the number he's supposed to stand beside, and easy
          to scroll straight past without noticing he'd "disappeared"). Anchoring to the header
          instead keeps him beside the number/figure at a fixed spot regardless of how many
          category rows render underneath. */}
      <div className="safe-to-spend-header" style={theme === "arcade" ? { position: "relative", zIndex: 1 } : undefined}>
        <div style={{ position: "relative", zIndex: 1 }}>{body}</div>
        {/* MageMascot mount — arcade-only (MageMascot itself renders null off-theme, so this div
            is harmless dead weight on every other theme, same as WarriorMascot's own mount).
            Positioned/sized in App.jsx's ".scribe-mage-mount" CSS, same split as every other
            mascot mount in this app (only a stylesheet class can differ per breakpoint). */}
        <div className="scribe-mage-mount">
          <MageMascot firing={mageFiring} firingText="จดไว้แล้ว! ✨" onClick={onMageClick} src={mageSrc} />
        </div>
      </div>
      {categoryBreakdown}
      <AddBudgetSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        onSaved={async () => { await refetch(); setShowSheet(false); }}
      />
    </div>
  );
}
