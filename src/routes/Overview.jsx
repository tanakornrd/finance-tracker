import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { fetchTransactions } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { THAI_MONTHS, toISODate } from "../../shared/dates.js";
import { EXPENSE_CATS } from "../../shared/categories.js";
import { colors, card, sectionHead } from "../components/sharedStyles.js";
import { balanceBeforeMonth, sumDeltaForAccountInMonth, estimatePayoffMonths } from "../lib/debtCalc.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";
import { StaminaBar, QuestBar } from "../theme/rpgBars.jsx";

function monthKeyOf(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function monthLabelOf(d) { return `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`; }

function TrendTag({ deltaCents, goodWhen }) {
  if (deltaCents === 0) {
    return <span style={{ ...styles.trendTag, color: "var(--color-inkMuted)", background: "var(--color-divider)" }}><Minus size={11} /> ไม่เปลี่ยนแปลง</span>;
  }
  const isGood = goodWhen === "down" ? deltaCents < 0 : deltaCents > 0;
  const color = isGood ? "var(--color-success)" : "var(--color-danger)";
  const bg = isGood ? "var(--color-successTint)" : "var(--color-dangerTint)";
  const Icon = deltaCents > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{ ...styles.trendTag, color, background: bg }}>
      <Icon size={11} /> {centsToDisplay(Math.abs(deltaCents))}
    </span>
  );
}

export default function Overview() {
  const { theme } = useTheme();
  const { accounts, budgets: allBudgets, loading: refLoading } = useReferenceData();
  // allBudgets mixes category budgets and festival budgets now (2026-08-08, ชุด 4.1 — see
  // server/routes/budgets.js's own comment). Everything below this page already computed
  // (totalBudgetCents, the category progress list) assumes category-only, same reasoning as
  // every other consumer of useReferenceData().budgets.
  const budgets = allBudgets.filter((b) => !b.festivalStartDate);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const loading = refLoading || txLoading;

  const now = new Date();
  const mDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prev2Date = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const mKey = monthKeyOf(mDate);
  const prevMKey = monthKeyOf(prevDate);
  const prev2MKey = monthKeyOf(prev2Date);

  // Fixed to the real current month (this page has no month navigation) — every calculation
  // below only ever looks at mKey/prevMKey, so that's all that needs to be fetched.
  useEffect(() => {
    const from = toISODate(prevDate);
    const to = toISODate(new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0));
    setTxLoading(true);
    fetchTransactions({ from, to }).then(setTransactions).finally(() => setTxLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.type])), [accounts]);
  const activeAccounts = accounts.filter((a) => a.status !== "trashed");
  const assetAccounts = activeAccounts.filter((a) => a.type === "asset");
  const debtAccounts = activeAccounts.filter((a) => a.type === "debt");

  // --- Net worth now vs start of this month (reconstructed from the transaction log) ---
  const netWorth = useMemo(() => {
    const totalAssetsNow = assetAccounts.reduce((s, a) => s + a.balanceCents, 0);
    const totalDebtNow = debtAccounts.reduce((s, a) => s + a.balanceCents, 0);
    const assetsStart = assetAccounts.reduce(
      (s, a) => s + balanceBeforeMonth(a.balanceCents, transactions, a.id, typeById, mKey),
      0
    );
    const debtStart = debtAccounts.reduce(
      (s, a) => s + balanceBeforeMonth(a.balanceCents, transactions, a.id, typeById, mKey),
      0
    );
    return {
      now: totalAssetsNow - totalDebtNow,
      start: assetsStart - debtStart,
      totalAssetsNow,
      totalDebtNow,
    };
  }, [assetAccounts, debtAccounts, transactions, typeById, mKey]);

  // --- Debt totals at 3 points in time, to detect a 2-month-in-a-row increase ---
  const debtTrend = useMemo(() => {
    let totalNow = 0, totalStartOfM = 0, totalStartOfPrevM = 0;
    const perAccount = debtAccounts.map((a) => {
      const startOfM = balanceBeforeMonth(a.balanceCents, transactions, a.id, typeById, mKey);
      const startOfPrevM = balanceBeforeMonth(startOfM, transactions, a.id, typeById, prevMKey);
      totalNow += a.balanceCents;
      totalStartOfM += startOfM;
      totalStartOfPrevM += startOfPrevM;
      return { account: a, now: a.balanceCents, startOfM };
    });
    return {
      perAccount,
      deltaThisMonth: totalNow - totalStartOfM,
      deltaPrevMonth: totalStartOfM - totalStartOfPrevM,
      totalNow,
    };
  }, [debtAccounts, transactions, typeById, mKey, prevMKey]);

  // --- Expense categories charged directly to debt accounts (for the "why did debt grow" advice) ---
  function debtExpenseCategoryTotals(monthKey) {
    const debtAccountIds = new Set(debtAccounts.map((a) => a.id));
    const map = {};
    for (const t of transactions) {
      if (t.kind !== "expense") continue;
      if (t.date.slice(0, 7) !== monthKey) continue;
      if (!debtAccountIds.has(t.accountId)) continue;
      map[t.category] = (map[t.category] || 0) + t.amountCents;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }
  const thisMonthDebtCats = useMemo(() => debtExpenseCategoryTotals(mKey), [transactions, debtAccounts, mKey]);

  // --- Advice (rule-based) ---
  const advice = useMemo(() => {
    const items = [];
    if (debtTrend.deltaThisMonth > 0 && thisMonthDebtCats.length > 0) {
      const [topCat, topAmt] = thisMonthDebtCats[0];
      items.push(`หนี้รวมเพิ่มขึ้น ${centsToDisplay(debtTrend.deltaThisMonth)} เดือนนี้ — ส่วนใหญ่มาจากหมวด "${topCat}" (${centsToDisplay(topAmt)})`);
    } else if (debtTrend.deltaThisMonth > 0) {
      items.push(`หนี้รวมเพิ่มขึ้น ${centsToDisplay(debtTrend.deltaThisMonth)} เดือนนี้`);
    }

    for (const { account } of debtTrend.perAccount) {
      if (!account.monthlyPaymentCents) continue;
      const paidThisMonth = transactions
        .filter((t) => t.kind === "repay" && t.toAccountId === account.id && t.date.slice(0, 7) === mKey)
        .reduce((s, t) => s + t.amountCents, 0);
      if (paidThisMonth < account.monthlyPaymentCents) {
        items.push(
          `"${account.name}" ชำระไปแล้ว ${centsToDisplay(paidThisMonth)} เดือนนี้ ต่ำกว่ายอดผ่อนที่ตั้งไว้ (${centsToDisplay(account.monthlyPaymentCents)}) — จะหมดหนี้ช้าลงกว่าแผน`
        );
      }
    }

    if (debtTrend.deltaThisMonth > 0 && debtTrend.deltaPrevMonth > 0) {
      const cats = thisMonthDebtCats.length > 0 ? thisMonthDebtCats : debtExpenseCategoryTotals(prevMKey);
      if (cats.length > 0) {
        items.push(`หนี้มีแนวโน้มเพิ่มขึ้นต่อเนื่อง 2 เดือนติดกัน — ลองลดรายจ่ายหมวด "${cats[0][0]}" ที่จ่ายผ่านบัญชีหนี้ดูก่อน`);
      } else {
        items.push(`หนี้มีแนวโน้มเพิ่มขึ้นต่อเนื่อง 2 เดือนติดกัน — ลองทบทวนรายจ่ายที่จ่ายผ่านบัญชีหนี้`);
      }
    }
    return items;
  }, [debtTrend, thisMonthDebtCats, transactions, mKey, prevMKey]);

  // --- Savings goals summary. Goal accounts are real accounts funded by transfer
  // transactions, so (unlike the old disconnected savings_goals table) a month-over-month
  // trend can be reconstructed from the transaction log the same way as net worth/debt.
  const goalAccounts = activeAccounts.filter((a) => a.isGoalAccount);
  const totalSavedCents = goalAccounts.reduce((s, a) => s + a.balanceCents, 0);
  const totalTargetCents = goalAccounts.reduce((s, a) => s + (a.targetAmountCents || 0), 0);
  const savingsPct = totalTargetCents > 0 ? Math.min(100, (totalSavedCents / totalTargetCents) * 100) : 0;
  const savedStartOfM = useMemo(
    () => goalAccounts.reduce((s, a) => s + balanceBeforeMonth(a.balanceCents, transactions, a.id, typeById, mKey), 0),
    [goalAccounts, transactions, typeById, mKey]
  );
  const savingsDeltaThisMonth = totalSavedCents - savedStartOfM;

  // --- Investment accounts summary. Same reconstruction-from-transaction-log approach as
  // savings goals above — investment accounts are just flagged asset accounts too.
  const investmentAccounts = activeAccounts.filter((a) => a.isInvestmentAccount);
  const totalInvestedCents = investmentAccounts.reduce((s, a) => s + a.balanceCents, 0);
  const investedStartOfM = useMemo(
    () => investmentAccounts.reduce((s, a) => s + balanceBeforeMonth(a.balanceCents, transactions, a.id, typeById, mKey), 0),
    [investmentAccounts, transactions, typeById, mKey]
  );
  const investedDeltaThisMonth = totalInvestedCents - investedStartOfM;

  // --- Budget vs actual, this month vs last month ---
  function spentByCategory(monthKey) {
    const map = {};
    for (const t of transactions) {
      if (t.kind !== "expense" || t.date.slice(0, 7) !== monthKey) continue;
      map[t.category] = (map[t.category] || 0) + t.amountCents;
    }
    return map;
  }
  const spentThisMonth = useMemo(() => spentByCategory(mKey), [transactions, mKey]);
  const spentPrevMonth = useMemo(() => spentByCategory(prevMKey), [transactions, prevMKey]);
  const totalBudgetCents = budgets.reduce((s, b) => s + b.monthlyLimitCents, 0);
  const totalSpentThisMonth = budgets.reduce((s, b) => s + (spentThisMonth[b.category] || 0), 0);
  const totalSpentPrevMonth = budgets.reduce((s, b) => s + (spentPrevMonth[b.category] || 0), 0);

  if (loading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  return (
    <div>
      <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>ภาพรวม</div>
      <div style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 18 }}>{monthLabelOf(mDate)} เทียบกับ {monthLabelOf(prevDate)}</div>

      {/* Net worth */}
      <div style={card}>
        <div style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>ความมั่งคั่งสุทธิ</div>
        <div className="num" style={{ fontSize: 28, fontWeight: 600, color: "var(--color-ink)", marginBottom: 8 }}>{centsToDisplay(netWorth.now)}</div>
        <TrendTag deltaCents={netWorth.now - netWorth.start} goodWhen="up" />
        <div style={{ fontSize: 11, color: "var(--color-inkMuted)", marginTop: 8 }}>
          สินทรัพย์ {centsToDisplay(netWorth.totalAssetsNow)} · หนี้สิน {centsToDisplay(netWorth.totalDebtNow)}
        </div>
      </div>

      {/* Debt */}
      <div style={sectionHead} className="section-head"><span>ภาพรวมหนี้สิน</span></div>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>หนี้รวมปัจจุบัน</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600, color: debtTrend.totalNow > 0 ? "var(--color-danger)" : "var(--color-ink)" }}>
              {centsToDisplay(debtTrend.totalNow)}
            </div>
            {debtTrend.totalNow < 0 && <div style={{ fontSize: 11, color: "var(--color-inkMuted)" }}>มีเครดิต/จ่ายล่วงหน้าอยู่</div>}
          </div>
          <TrendTag deltaCents={debtTrend.deltaThisMonth} goodWhen="down" />
        </div>

        {debtAccounts.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13, padding: "12px 0" }}>ไม่มีบัญชีหนี้ที่ใช้งานอยู่</div>
        ) : (
          <div style={{ marginTop: 14 }}>
            {debtAccounts.map((a) => {
              const owed = Math.max(0, a.balanceCents);
              const payoff = estimatePayoffMonths(owed, a.interestRate, a.interestRateType, a.monthlyPaymentCents);
              // Same "on track this month" measure the advice text above already uses —
              // there's no stored original loan amount to compute lifetime payoff % from.
              const paidThisMonth = transactions
                .filter((t) => t.kind === "repay" && t.toAccountId === a.id && t.date.slice(0, 7) === mKey)
                .reduce((s, t) => s + t.amountCents, 0);
              const staminaPct = a.monthlyPaymentCents > 0
                ? Math.min(100, (paidThisMonth / a.monthlyPaymentCents) * 100)
                : (paidThisMonth > 0 ? 100 : 0);
              return (
                <div key={a.id} style={{ padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>{a.name}</span>
                    <span className="num" style={{ color: a.balanceCents > 0 ? "var(--color-danger)" : "var(--color-ink)" }}>{centsToDisplay(a.balanceCents)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-inkMuted)", display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <span>ดอกเบี้ย {a.interestRate != null ? `${a.interestRate}% / ${a.interestRateType === "yearly" ? "ปี" : "เดือน"}` : "ไม่ระบุ"}</span>
                    <span>ผ่อน {a.monthlyPaymentCents != null ? `${centsToDisplay(a.monthlyPaymentCents)} / เดือน` : "ไม่ระบุ"}</span>
                  </div>
                  {theme === "arcade" && a.monthlyPaymentCents > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <StaminaBar theme={theme} paidPct={staminaPct} color="var(--color-danger)" trackColor="var(--color-divider)" />
                    </div>
                  )}
                  {payoff && (
                    payoff.neverPaysOff ? (
                      <div style={{ fontSize: 11, color: "var(--color-danger)", marginTop: 4 }}>⚠️ ยอดผ่อนไม่พอจ่ายดอกเบี้ย — หนี้จะไม่มีวันหมดถ้าจ่ายเท่านี้ต่อไป</div>
                    ) : payoff.months > 0 ? (
                      <div style={{ fontSize: 11, color: "var(--color-primary)", marginTop: 4 }}>คาดว่าจะหมดหนี้ในอีก ~{payoff.months} เดือน (ถ้าจ่ายตามแผนนี้ต่อเนื่อง)</div>
                    ) : null
                  )}
                </div>
              );
            })}
          </div>
        )}

        {advice.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)", marginBottom: 6 }}>คำแนะนำ</div>
            {advice.map((msg, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 6, display: "flex", gap: 6 }}>
                <span>💡</span><span>{msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Savings goals */}
      <div style={sectionHead} className="section-head"><span>เป้าหมายเงินออม</span></div>
      <div style={card}>
        {goalAccounts.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13 }}>ยังไม่มีเป้าหมายเงินออม</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <span className="num" style={{ color: "var(--color-ink)", fontWeight: 600, fontSize: 14 }}>{centsToDisplay(totalSavedCents)}</span>
                <span className="num" style={{ color: "var(--color-inkMuted)", marginLeft: 8 }}>เป้าหมายรวม {centsToDisplay(totalTargetCents)}</span>
              </div>
              <TrendTag deltaCents={savingsDeltaThisMonth} goodWhen="up" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <QuestBar theme={theme} pct={savingsPct} color="var(--color-primary)" trackColor="var(--color-divider)" />
            </div>
            {goalAccounts.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>
                <span>{a.name}</span>
                <span className="num">{centsToDisplay(a.balanceCents)} / {centsToDisplay(a.targetAmountCents)}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Investments */}
      <div style={sectionHead} className="section-head"><span>เงินลงทุน</span></div>
      <div style={card}>
        {investmentAccounts.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13 }}>ยังไม่มีบัญชีเงินลงทุน</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <span className="num" style={{ color: colors.secondary, fontWeight: 600, fontSize: 14 }}>{centsToDisplay(totalInvestedCents)}</span>
              <TrendTag deltaCents={investedDeltaThisMonth} goodWhen="up" />
            </div>
            {investmentAccounts.map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>
                <span>{a.name}</span>
                <span className="num">{centsToDisplay(a.balanceCents)}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Budget */}
      <div style={sectionHead} className="section-head"><span>งบประมาณ</span></div>
      <div style={card}>
        {budgets.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13 }}>ยังไม่ได้ตั้งงบประมาณ</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--color-inkMuted)", marginBottom: 4 }}>ใช้ไปเดือนนี้ / งบรวม</div>
                <div className="num" style={{ fontSize: 18, fontWeight: 600, color: totalSpentThisMonth > totalBudgetCents ? "var(--color-danger)" : "var(--color-ink)" }}>
                  {centsToDisplay(totalSpentThisMonth)} / {centsToDisplay(totalBudgetCents)}
                </div>
              </div>
              <TrendTag deltaCents={totalSpentThisMonth - totalSpentPrevMonth} goodWhen="down" />
            </div>
            {budgets.map((b) => {
              const spent = spentThisMonth[b.category] || 0;
              const spentPrev = spentPrevMonth[b.category] || 0;
              const over = spent > b.monthlyLimitCents;
              const icon = EXPENSE_CATS.find((c) => c.name === b.category)?.icon || "📦";
              return (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "var(--color-ink)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <CategoryIcon theme={theme} name={b.category} fallback={icon} size={14} /> {b.category}
                  </span>
                  <span className="num" style={{ color: over ? "var(--color-danger)" : "var(--color-inkMuted)" }}>
                    {centsToDisplay(spent)} <span style={{ color: "var(--color-inkFaint)" }}>(เดือนก่อน {centsToDisplay(spentPrev)})</span>
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  trendTag: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20 },
};
