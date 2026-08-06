import React, { useEffect, useMemo, useState } from "react";
import { Trash2, PieChart } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { deleteBudget, fetchTransactions } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { toISODate } from "../../shared/dates.js";
import { EXPENSE_CATS } from "../../shared/categories.js";
import { card, sectionHead, textBtn } from "../components/sharedStyles.js";
import AddBudgetSheet from "../components/AddBudgetSheet.jsx";
import BudgetMageCard from "../components/BudgetMageCard.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";
import { HpBar } from "../theme/rpgBars.jsx";

const ctaBtn = { padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--color-primary)", color: "var(--color-white)", fontWeight: 700, fontSize: 13 };

const COLOR_NORMAL = "var(--color-primary)";
const COLOR_WARN = "var(--color-accent)";
const COLOR_OVER = "var(--color-danger)";

function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

export default function Budgets() {
  const { theme } = useTheme();
  const { budgets, loading: refLoading, refetch } = useReferenceData();
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState("");
  const [monthTx, setMonthTx] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  // Only this month's expenses are needed to show spent-vs-limit, not the full history.
  useEffect(() => {
    const now = new Date();
    const from = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    setTxLoading(true);
    fetchTransactions({ from, to }).then(setMonthTx).finally(() => setTxLoading(false));
  }, []);

  const spentByCategory = useMemo(() => {
    const mKey = monthKey(new Date());
    const map = {};
    for (const t of monthTx) {
      if (t.kind !== "expense" || t.date.slice(0, 7) !== mKey) continue;
      map[t.category] = (map[t.category] || 0) + t.amountCents;
    }
    return map;
  }, [monthTx]);

  async function handleDelete(budget) {
    try {
      await deleteBudget(budget.id);
      await refetch();
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
    }
  }

  if (refLoading || txLoading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  return (
    <div>
      <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", margin: "0 2px 6px" }}>งบประมาณ</div>
      <div style={{ fontSize: 12, color: "var(--color-inkMuted)", margin: "0 2px 18px", lineHeight: 1.6 }}>
        ตั้งวงเงินใช้จ่ายสูงสุดต่อเดือนแยกตามหมวดหมู่ แล้วระบบจะคำนวณให้ว่าใช้ไปแล้วเท่าไหร่
        เทียบกับวงเงินที่ตั้งไว้ ช่วยให้คุมค่าใช้จ่ายแต่ละหมวดไม่ให้บานปลาย
      </div>

      <BudgetMageCard budgets={budgets} spentByCategory={spentByCategory} />

      <div style={sectionHead} className="section-head">
        <span>ตั้งวงเงิน</span>
        <button style={textBtn} onClick={() => setShowAdd(true)}>+ ตั้งงบประมาณ</button>
      </div>

      {budgets.length === 0 ? (
        <div style={{ ...card, textAlign: "center" }}>
          <PieChart size={22} color="var(--color-primary)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "var(--color-inkMuted)", marginBottom: 10 }}>ยังไม่ได้ตั้งงบประมาณ</div>
          <button type="button" style={ctaBtn} onClick={() => setShowAdd(true)}>+ ตั้งงบประมาณ</button>
        </div>
      ) : (
        <>
        <div style={sectionHead} className="section-head"><span>ดูความคืบหน้า</span></div>
        <div style={card}>
          {budgets.map((b, i) => {
            const spentCents = spentByCategory[b.category] || 0;
            const pct = Math.min(150, (spentCents / b.monthlyLimitCents) * 100);
            const over = spentCents >= b.monthlyLimitCents;
            const warn = !over && pct >= 80;
            const color = over ? COLOR_OVER : warn ? COLOR_WARN : COLOR_NORMAL;
            const icon = EXPENSE_CATS.find((c) => c.name === b.category)?.icon || "📦";
            return (
              <div key={b.id} style={{ marginBottom: i < budgets.length - 1 ? 18 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--color-ink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CategoryIcon theme={theme} name={b.category} fallback={icon} size={16} /> {b.category}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="num" style={{ color }}>
                      {centsToDisplay(spentCents)} / {centsToDisplay(b.monthlyLimitCents)}
                    </span>
                    <button style={{ background: "none", border: "none", padding: 2 }} onClick={() => handleDelete(b)}>
                      <Trash2 size={13} color="var(--color-inkMuted)" />
                    </button>
                  </div>
                </div>
                <HpBar theme={theme} spentPct={Math.min(100, pct)} color={color} trackColor="var(--color-divider)" />
                {over && (
                  <div style={{ fontSize: 11, color: COLOR_OVER, marginTop: 4 }}>
                    ⚠️ ใช้เกินงบแล้ว {centsToDisplay(spentCents - b.monthlyLimitCents)}
                  </div>
                )}
                {warn && (
                  <div style={{ fontSize: 11, color: COLOR_WARN, marginTop: 4 }}>
                    ⚠️ ใช้ไปแล้ว {pct.toFixed(0)}% ของงบ
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}

      {err && <div style={{ color: "var(--color-danger)", fontSize: 12, textAlign: "center", marginTop: 8 }}>{err}</div>}

      <AddBudgetSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={async () => { await refetch(); setShowAdd(false); }}
      />
    </div>
  );
}
