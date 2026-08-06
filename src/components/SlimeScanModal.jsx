import React from "react";
import { X } from "lucide-react";
import { overlay, sheet, sheetHead, iconBtn } from "./sharedStyles.js";
import ModalPortal from "./ModalPortal.jsx";
import { centsToDisplay } from "../../shared/money.js";
import { EXPENSE_CATS } from "../../shared/categories.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";
import { HpBar } from "../theme/rpgBars.jsx";

const COLOR_NORMAL = "var(--color-primary)";
const COLOR_WARN = "var(--color-accent)";
const COLOR_OVER = "var(--color-danger)";

// The slime page-header mascot's click target (Budgets.jsx, RPG party interactions part 3) — an
// "enemy scan" breakdown of every budgeted category, reusing exactly the budgets/spentByCategory
// data Budgets.jsx already computes for its own progress list (no extra fetch). Same
// overlay/sheet/HpBar building blocks as every other modal/progress-bar in the app; the "scan"
// framing here is just presentation (labels, ordering, tone) over the same real numbers, not a
// different data source.
export default function SlimeScanModal({ open, onClose, budgets, spentByCategory }) {
  if (!open) return null;

  // Worst-first — a scan report leads with the threat, not an alphabetical list.
  const rows = [...budgets]
    .map((b) => {
      const spentCents = spentByCategory[b.category] || 0;
      const pct = spentCents / b.monthlyLimitCents;
      return { ...b, spentCents, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  return (
    <ModalPortal>
      <div style={overlay} onClick={onClose}>
        <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
          <div style={sheetHead}>
            <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>🔍 สแกนศัตรู — สถานะงบประมาณ</span>
            <button onClick={onClose} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
          </div>
          {rows.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-inkMuted)", textAlign: "center", padding: "20px 0" }}>
              ยังไม่ได้ตั้งงบประมาณเลย ไม่มีอะไรให้สแกน
            </div>
          ) : (
            rows.map((r, i) => <ScanRow key={r.id} row={r} last={i === rows.length - 1} />)
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

function ScanRow({ row, last }) {
  const { theme } = useTheme();
  const { category, spentCents, monthlyLimitCents, pct } = row;
  const over = pct >= 1;
  const warn = !over && pct >= 0.8;
  const color = over ? COLOR_OVER : warn ? COLOR_WARN : COLOR_NORMAL;
  const statusText = over
    ? `⚠️ เกินงบแล้ว ${centsToDisplay(spentCents - monthlyLimitCents)}`
    : warn
    ? `⚠️ ใกล้เกินงบ — ใช้ไป ${Math.round(pct * 100)}%`
    : "✅ ยังคุมอยู่";
  const icon = EXPENSE_CATS.find((c) => c.name === category)?.icon || "📦";

  return (
    <div style={{ marginBottom: last ? 0 : 16, paddingBottom: last ? 0 : 16, borderBottom: last ? "none" : "1px solid var(--color-divider)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: "var(--color-ink)", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
          <CategoryIcon theme={theme} name={category} fallback={icon} size={16} /> {category}
        </span>
        <span className="num" style={{ color, fontSize: 13 }}>
          {centsToDisplay(spentCents)} / {centsToDisplay(monthlyLimitCents)}
        </span>
      </div>
      <HpBar theme={theme} spentPct={Math.min(100, pct * 100)} color={color} trackColor="var(--color-divider)" />
      <div style={{ fontSize: 11, color, marginTop: 4 }}>{statusText}</div>
    </div>
  );
}
