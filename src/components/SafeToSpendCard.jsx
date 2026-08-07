import React, { useState } from "react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { centsToDisplay } from "../../shared/money.js";
import { daysInMonth } from "../../shared/dates.js";
import { card } from "./sharedStyles.js";
import AddBudgetSheet from "./AddBudgetSheet.jsx";
import MageMascot from "./mascot/MageMascot.jsx";

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
  const { budgets: allBudgets, refetch } = useReferenceData();
  // `allBudgets` mixes category budgets and festival budgets now (2026-08-08, ชุด 4.1 — see
  // server/routes/budgets.js's own comment). This card's whole point is "today's slice of your
  // MONTHLY category budgets" — summing a festival's one-off total in here too would inflate
  // budgetTotalCents with an unrelated number and skew the daily figure below.
  const budgets = allBudgets.filter((b) => !b.festivalStartDate);
  const [showSheet, setShowSheet] = useState(false);

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
        <MageMascot firing={mageFiring} firingText="จดไว้แล้ว! ✨" onClick={onMageClick} />
      </div>
      <AddBudgetSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        onSaved={async () => { await refetch(); setShowSheet(false); }}
      />
    </div>
  );
}
