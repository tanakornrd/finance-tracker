import React from "react";

// One progress-bar component, three semantic wrappers (HpBar / StaminaBar / QuestBar) — every
// call site already computes a 0-100 percentage the same way (see Budgets.jsx/Dashboard.jsx/
// Accounts.jsx/Overview.jsx's existing `pct` locals), so this only changes how that percentage
// is *drawn*: a plain thin bar outside the arcade theme (identical markup to what every one of
// those files already had, so every other theme is pixel-for-pixel unchanged), a chunky
// pixel-segmented bar inside it.
function RpgBar({ theme, pct, color, trackColor, label, height = 6 }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));

  if (theme !== "arcade") {
    return (
      <div style={{ height, background: trackColor, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${clamped}%`, background: color, borderRadius: 3 }} />
      </div>
    );
  }

  const segments = 10;
  const filled = Math.round((clamped / 100) * segments);
  return (
    <div>
      {label && (
        <div style={{ fontSize: 8, letterSpacing: 1, color: "var(--color-inkMuted)", marginBottom: 3, fontFamily: "'Press Start 2P', 'IBM Plex Sans Thai', monospace" }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", gap: 2, padding: 2, background: "#0D0221", border: "2px solid #000", borderRadius: 2 }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: height + 4, background: i < filled ? color : "#33284d", borderRadius: 1 }} />
        ))}
      </div>
    </div>
  );
}

// งบประมาณคงเหลือต่อหมวด — HP ที่ลดลงตามสัดส่วนที่ใช้ไป: caller passes pct = % ใช้ไปแล้ว, this
// flips it to % ที่เหลือ so the bar drains like actual HP as spending eats into the budget.
// label defaults to "HP" (every existing call site relies on that default unchanged) — overridable
// so BudgetMageCard.jsx's slime party can show each category's own name under its bar instead.
export function HpBar({ theme, spentPct, color, trackColor, label = "HP" }) {
  const remainingPct = 100 - Math.max(0, Math.min(100, spentPct));
  return <RpgBar theme={theme} pct={remainingPct} color={color} trackColor={trackColor} label={label} />;
}

// ความคืบหน้าการผ่อนชำระหนี้เดือนนี้ — เติมขึ้นเมื่อจ่ายตรงเวลา/ครบตามยอดที่ตั้งไว้
export function StaminaBar({ theme, paidPct, color, trackColor }) {
  return <RpgBar theme={theme} pct={paidPct} color={color} trackColor={trackColor} label="STAMINA" />;
}

// เป้าหมายออมเงินแต่ละ pocket — เติมขึ้นตามสัดส่วนที่ออมได้แล้วเทียบเป้าหมาย
export function QuestBar({ theme, pct, color, trackColor }) {
  return <RpgBar theme={theme} pct={pct} color={color} trackColor={trackColor} label="QUEST" />;
}
