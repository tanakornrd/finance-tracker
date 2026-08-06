import React from "react";
import { centsToDisplay } from "../../shared/money.js";
import { card } from "./sharedStyles.js";

export default function MonthComparisonBar({ thisMonthExpenseCents, prevMonthExpenseCents, thisLabel, prevLabel }) {
  if (thisMonthExpenseCents === 0 && prevMonthExpenseCents === 0) return null;

  let badge;
  if (prevMonthExpenseCents === 0) {
    badge = <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>ใหม่</span>;
  } else {
    const pct = ((thisMonthExpenseCents - prevMonthExpenseCents) / prevMonthExpenseCents) * 100;
    const up = pct > 0;
    badge = (
      <span style={{ fontSize: 12, fontWeight: 700, color: up ? "var(--color-danger)" : "var(--color-primary)" }}>
        {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
      </span>
    );
  }

  const max = Math.max(thisMonthExpenseCents, prevMonthExpenseCents, 1);

  return (
    <div style={{ ...card, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 600 }}>รายจ่ายเดือนนี้ vs เดือนก่อน</span>
        {badge}
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: "var(--color-inkMuted)" }}>{prevLabel}</span>
          <span className="num" style={{ color: "var(--color-inkMuted)" }}>{centsToDisplay(prevMonthExpenseCents)}</span>
        </div>
        <div style={{ height: 6, background: "var(--color-divider)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(prevMonthExpenseCents / max) * 100}%`, background: "var(--color-ring)", borderRadius: 3 }} />
        </div>
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: "var(--color-ink)" }}>{thisLabel}</span>
          <span className="num" style={{ color: "var(--color-ink)" }}>{centsToDisplay(thisMonthExpenseCents)}</span>
        </div>
        <div style={{ height: 6, background: "var(--color-divider)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(thisMonthExpenseCents / max) * 100}%`, background: "var(--color-primary)", borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}
