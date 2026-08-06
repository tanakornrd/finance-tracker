import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Wallet, CreditCard, Target, TrendingUp } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { fetchTransactions } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { parseISODate, toISODate } from "../../shared/dates.js";
import { EXPENSE_CATS, INCOME_CATS } from "../../shared/categories.js";
import { describeTransfer } from "../lib/transferLabel.js";
import { colors, iconChip, card, sectionHead, txRow, txIcon } from "../components/sharedStyles.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";
import { QuestBar } from "../theme/rpgBars.jsx";

const RANGES = [
  { key: "all", label: "ทั้งหมด" },
  { key: "month", label: "เดือนนี้" },
  { key: "3months", label: "3 เดือน" },
  { key: "year", label: "ปีนี้" },
  { key: "custom", label: "กำหนดเอง" },
];

const chipBtn = { padding: "7px 12px", borderRadius: 20, border: `1px solid ${colors.border}`, background: colors.white, color: colors.inkMuted, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" };
// Same `border` shorthand as chipBtn (not `borderColor`) — mixing shorthand and
// non-shorthand for the same property across a rerender trips a React style warning.
const chipBtnActive = { background: colors.primary, color: colors.white, border: `1px solid ${colors.primary}` };
const dateInput = { flex: 1, padding: "9px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.ink, fontSize: 13 };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AccountDetail() {
  const { theme } = useTheme();
  const { id } = useParams();
  const { accounts, loading } = useReferenceData();
  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState(todayStr());
  const [customTo, setCustomTo] = useState(todayStr());
  const [filtered, setFiltered] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  const account = accounts.find((a) => a.id === id);

  // Filtered server-side by accountId + date range — this page can show "ทั้งหมด" (full
  // history for one account), which would be wasteful to pull for every account up front.
  useEffect(() => {
    const now = new Date();
    let fromDate = null;
    let toDate = null;
    if (range === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === "3months") {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (range === "year") {
      fromDate = new Date(now.getFullYear(), 0, 1);
      toDate = new Date(now.getFullYear(), 11, 31);
    } else if (range === "custom") {
      fromDate = customFrom ? parseISODate(customFrom) : null;
      toDate = customTo ? parseISODate(customTo) : null;
    }
    const from = fromDate ? toISODate(fromDate) : undefined;
    const to = toDate ? toISODate(toDate) : undefined;

    setTxLoading(true);
    fetchTransactions({ accountId: id, from, to })
      .then(setFiltered)
      .finally(() => setTxLoading(false));
  }, [id, range, customFrom, customTo]);

  if (loading || txLoading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  if (!account) {
    return (
      <div style={{ ...card, textAlign: "center", color: "var(--color-inkMuted)" }}>
        ไม่พบบัญชีนี้ — <Link to="/accounts" style={{ color: "var(--color-primary)" }}>กลับไปหน้าสินทรัพย์</Link>
      </div>
    );
  }

  const isDebt = account.type === "debt";
  const isGoal = account.isGoalAccount;
  const isInvestment = account.isInvestmentAccount;
  const isSecondary = isGoal || isInvestment;

  return (
    <div>
      <div style={{ ...card, marginBottom: 18, textAlign: "center" }}>
        <div style={{ ...iconChip(isSecondary ? colors.secondaryTint : isDebt ? colors.dangerTint : colors.primaryTint, 44), margin: "0 auto" }}>
          {isGoal ? <Target size={20} color={colors.secondary} /> : isInvestment ? <TrendingUp size={20} color={colors.secondary} /> : isDebt ? <CreditCard size={20} color={colors.danger} /> : <Wallet size={20} color={colors.primary} />}
        </div>
        <div style={{ fontSize: 14, color: colors.ink, fontWeight: 600, marginTop: 8 }}>{account.name}</div>
        <div className="num" style={{ fontSize: 28, fontWeight: 600, color: isDebt ? colors.danger : isSecondary ? colors.secondary : colors.ink, marginTop: 4 }}>
          {centsToDisplay(account.balanceCents)}
        </div>
        {isDebt && <div style={{ fontSize: 11, color: colors.inkMuted, marginTop: 2 }}>ค้างชำระ</div>}
        {isGoal && (
          <>
            <div style={{ fontSize: 11, color: "var(--color-inkMuted)", marginTop: 2, marginBottom: 8 }}>เป้าหมาย {centsToDisplay(account.targetAmountCents)} · {account.targetDate}</div>
            {account.targetAmountCents > 0 && (
              <QuestBar
                theme={theme}
                pct={Math.min(100, (account.balanceCents / account.targetAmountCents) * 100)}
                color={colors.secondary}
                trackColor={colors.divider}
              />
            )}
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 8 }}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            style={{ ...chipBtn, ...(range === r.key ? chipBtnActive : {}) }}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={dateInput} />
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={dateInput} />
        </div>
      )}

      <div style={sectionHead} className="section-head">
        <span>รายการ</span>
        <span style={{ color: "var(--color-inkMuted)", fontSize: 12 }}>{filtered.length} รายการ</span>
      </div>
      <div style={card}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13, padding: "20px 0" }}>
            ไม่มีรายการในช่วงเวลานี้
          </div>
        ) : (
          filtered.map((t) => {
            const isTransfer = t.kind === "repay";
            const cat = !isTransfer ? (t.kind === "expense" ? EXPENSE_CATS : INCOME_CATS).find((c) => c.name === t.category) : null;
            const toAccountObj = isTransfer ? accounts.find((a) => a.id === t.toAccountId) : null;
            const otherAcc = accounts.find((a) => a.id === (t.accountId === id ? t.toAccountId : t.accountId));
            const isIncoming = t.toAccountId === id;
            const xfer = isTransfer ? describeTransfer(toAccountObj) : null;
            return (
              <Link key={t.id} to={`/transactions/${t.id}`} style={{ ...txRow, textDecoration: "none" }}>
                <div style={txIcon}><CategoryIcon theme={theme} name={t.category} fallback={isTransfer ? xfer.icon : (cat?.icon || "📦")} isTransfer={isTransfer} size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{isTransfer ? `${xfer.verb}${isIncoming ? "จาก" : "ไปยัง"} ${otherAcc?.name || ""}` : t.category}</div>
                  <div style={{ fontSize: 11, color: "var(--color-inkMuted)" }}>
                    {t.date}{t.note ? ` · ${t.note}` : ""}
                  </div>
                </div>
                <div className="num" style={{ fontSize: 14, fontWeight: 600, color: isTransfer ? "var(--color-ink)" : t.kind === "income" ? "var(--color-primary)" : "var(--color-danger)" }}>
                  {isTransfer ? "" : t.kind === "income" ? "+" : "-"}{centsToDisplay(t.amountCents)}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
