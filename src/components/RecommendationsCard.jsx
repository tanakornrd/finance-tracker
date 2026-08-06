import React, { useMemo } from "react";
import { Lightbulb, TrendingUp, AlertTriangle, TrendingDown } from "lucide-react";
import { centsToDisplay } from "../../shared/money.js";
import { daysInMonth } from "../../shared/dates.js";
import { colors, iconChip, sectionHead, card } from "./sharedStyles.js";

const NEGATIVE_STREAK_THRESHOLD = 3;
const CATEGORY_INCREASE_THRESHOLD = 0.2;

const tipRow = { display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0" };

function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

function categoryExpenseTotals(transactions, mKey) {
  const map = {};
  for (const t of transactions) {
    if (t.kind !== "expense" || t.date.slice(0, 7) !== mKey) continue;
    map[t.category] = (map[t.category] || 0) + t.amountCents;
  }
  return map;
}

// Longest run of consecutive days, ending today, where the "safe to spend today"
// figure (remaining budget divided by days left in the month) is negative.
function negativeSafeToSpendStreak(transactions, budgetTotalCents, year, month, today) {
  const dim = daysInMonth(year, month);
  const dayExpense = new Array(dim + 1).fill(0);
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    const [ty, tm, td] = t.date.split("-").map(Number);
    if (ty === year && tm - 1 === month) dayExpense[td] += t.amountCents;
  }
  let cumulative = 0;
  let streak = 0;
  for (let d = 1; d <= today; d++) {
    cumulative += dayExpense[d];
    const daysRemaining = dim - d + 1;
    const perDay = (budgetTotalCents - cumulative) / daysRemaining;
    streak = perDay < 0 ? streak + 1 : 0;
  }
  return streak;
}

export default function RecommendationsCard({ transactions, budgets, cursor, isCurrentMonth }) {
  const tips = useMemo(() => {
    const result = [];
    const mKey = monthKey(cursor);
    const prevCursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const prevMKey = monthKey(prevCursor);

    const curCatTotals = categoryExpenseTotals(transactions, mKey);
    const prevCatTotals = categoryExpenseTotals(transactions, prevMKey);

    for (const [cat, prevAmt] of Object.entries(prevCatTotals)) {
      if (prevAmt <= 0) continue;
      const curAmt = curCatTotals[cat] || 0;
      const change = (curAmt - prevAmt) / prevAmt;
      if (change > CATEGORY_INCREASE_THRESHOLD) {
        result.push({
          key: `cat-up-${cat}`,
          icon: <TrendingUp size={15} color={colors.accent} />,
          bg: colors.accentTint,
          text: `หมวด "${cat}" ใช้เงินเพิ่มขึ้น ${(change * 100).toFixed(0)}% จากเดือนก่อน (${centsToDisplay(prevAmt)} → ${centsToDisplay(curAmt)})`,
        });
      }
    }

    for (const b of budgets) {
      const spent = curCatTotals[b.category] || 0;
      if (spent >= b.monthlyLimitCents) {
        result.push({
          key: `budget-over-${b.id}`,
          icon: <AlertTriangle size={15} color={colors.danger} />,
          bg: colors.dangerTint,
          text: `ใช้เกินงบหมวด "${b.category}" ไปแล้ว ${centsToDisplay(spent - b.monthlyLimitCents)} — ลองปรับวงเงินหรือลดการใช้จ่ายหมวดนี้`,
        });
      }
    }

    if (isCurrentMonth && budgets.length > 0) {
      const today = new Date();
      const budgetTotalCents = budgets.reduce((s, b) => s + b.monthlyLimitCents, 0);
      const streak = negativeSafeToSpendStreak(transactions, budgetTotalCents, today.getFullYear(), today.getMonth(), today.getDate());
      if (streak >= NEGATIVE_STREAK_THRESHOLD) {
        result.push({
          key: "safe-to-spend-streak",
          icon: <TrendingDown size={15} color={colors.danger} />,
          bg: colors.dangerTint,
          text: `"ใช้ได้อีกวันนี้" ติดลบมา ${streak} วันติดต่อกัน — ลองทบทวนค่าใช้จ่ายหรือปรับงบประมาณ`,
        });
      }
    }

    return result;
  }, [transactions, budgets, cursor, isCurrentMonth]);

  return (
    <>
      <div style={sectionHead} className="section-head"><span>คำแนะนำ</span></div>
      {tips.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: colors.inkMuted, fontSize: 13 }}>
          <div style={{ ...iconChip(colors.accentTint, 40), margin: "0 auto 8px" }}>
            <Lightbulb size={20} color={colors.accent} />
          </div>
          <div>ยังไม่มีคำแนะนำพิเศษตอนนี้ ทุกอย่างดูโอเค</div>
        </div>
      ) : (
        <div style={card}>
          {tips.map((tip, i) => (
            <div key={tip.key} style={{ ...tipRow, borderBottom: i < tips.length - 1 ? `1px solid ${colors.divider}` : "none" }}>
              <div style={iconChip(tip.bg)}>{tip.icon}</div>
              <div style={{ fontSize: 12, color: colors.ink, lineHeight: 1.5, paddingTop: 4 }}>{tip.text}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
