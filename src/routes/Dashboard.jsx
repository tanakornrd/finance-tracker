import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Wallet, CreditCard, Target, TrendingUp, ArrowRightLeft } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { fetchTransactions, createTransaction, deleteTransaction, createAccount, fetchLatestTransaction } from "../api.js";
import { centsToDisplay, centsToPlain, parseToCents } from "../../shared/money.js";
import { THAI_MONTHS, THAI_WEEKDAYS_SHORT, parseISODate, toISODate } from "../../shared/dates.js";
import { EXPENSE_CATS, INCOME_CATS } from "../../shared/categories.js";
import { describeTransfer } from "../lib/transferLabel.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";
import { QuestBar, StaminaBar } from "../theme/rpgBars.jsx";
import {
  withinLastDays, mostFrequentCategories, mostFrequentAccounts,
  mostFrequentAccountForCategory, mostFrequentAmounts,
} from "../lib/quickPicks.js";
import SafeToSpendCard from "../components/SafeToSpendCard.jsx";
import MonthComparisonBar from "../components/MonthComparisonBar.jsx";
import PendingBillsCard from "../components/PendingBillsCard.jsx";
import RecommendationsCard from "../components/RecommendationsCard.jsx";
import WeeklyInsightCard from "../components/WeeklyInsightCard.jsx";
import MonthPickerSheet from "../components/MonthPickerSheet.jsx";
import NoEntryTodayBanner from "../components/NoEntryTodayBanner.jsx";
import WarriorMascot from "../components/mascot/WarriorMascot.jsx";
import { computeWeeklyInsight } from "../lib/weeklyInsight.js";
import {
  colors, iconChip, card, sectionHead, textBtn, txRow, txIcon, navBtn,
  overlay, sheet, sheetHead, iconBtn, label, input, submitBtn,
  kindToggle, kindBtn, kindActiveInc, kindActiveExp,
} from "../components/sharedStyles.js";

function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}
function dayLabel(dateStr) {
  if (dateStr === todayStr()) return "วันนี้";
  if (dateStr === yesterdayStr()) return "เมื่อวาน";
  const d = parseISODate(dateStr);
  return `${THAI_WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

export default function Dashboard() {
  const { theme } = useTheme();
  const { accounts, budgets, loading: refLoading, error, refetch: refetchReference } = useReferenceData();
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [errDetail, setErrDetail] = useState("");
  const [cursor, setCursor] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [form, setForm] = useState({
    kind: "expense",
    amount: "",
    category: EXPENSE_CATS[0].name,
    accountId: "cash",
    toAccountId: "",
    date: todayStr(),
    note: "",
  });
  const [newAcc, setNewAcc] = useState({ name: "", type: "asset" });

  const mKey = monthKey(cursor);
  const prevCursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  const prevMKey = monthKey(prevCursor);

  // Dashboard only ever needs the viewed month plus the one before it (for the MoM comparison
  // card and recommendations) — never the full transaction history, which only grows over time.
  const [rangeTx, setRangeTx] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState(null);

  const loadRangeTx = useCallback(async () => {
    const from = toISODate(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    const to = toISODate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    try {
      const rows = await fetchTransactions({ from, to });
      setRangeTx(rows);
      setTxError(null);
    } catch (e) {
      setTxError(String(e && e.message ? e.message : e));
    }
  }, [cursor]);

  useEffect(() => {
    setTxLoading(true);
    loadRangeTx().finally(() => setTxLoading(false));
  }, [loadRangeTx]);

  // Separate from rangeTx on purpose: rangeTx follows whatever month the calendar cursor is on
  // (prev/next arrows change it), but the quick-pick suggestions (frequent category/account/
  // amount, category→account pairing) always mean "the real last 30 days from today", regardless
  // of which month the user happens to be browsing. Fetched once on mount; a freshly-saved
  // transaction is appended locally in submitTx below rather than re-fetched, so a brand-new
  // entry can immediately count toward "frequent" without a round-trip.
  const [last30Tx, setLast30Tx] = useState([]);
  useEffect(() => {
    const now = new Date();
    const from = toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
    const to = toISODate(now);
    fetchTransactions({ from, to }).then(setLast30Tx).catch(() => {});
  }, []);

  // Bumped after every successful save so NoEntryTodayBanner re-checks immediately instead of
  // only on the next full page load.
  const [entrySavedSignal, setEntrySavedSignal] = useState(0);

  const loading = refLoading || txLoading;

  const monthTx = useMemo(
    () => rangeTx.filter((t) => t.date.slice(0, 7) === mKey).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [rangeTx, mKey]
  );
  const incomeCents = monthTx.filter((t) => t.kind === "income").reduce((s, t) => s + t.amountCents, 0);
  const expenseCents = monthTx.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amountCents, 0);
  const transferredCents = monthTx.filter((t) => t.kind === "repay").reduce((s, t) => s + t.amountCents, 0);

  // monthTx is sorted newest-first and Array#sort is stable, so same-date items stay adjacent —
  // a single pass is enough to bucket them into day groups without re-sorting.
  const dayGroups = useMemo(() => {
    const groups = [];
    let current = null;
    for (const t of monthTx) {
      if (!current || current.date !== t.date) {
        current = { date: t.date, items: [], netCents: 0 };
        groups.push(current);
      }
      current.items.push(t);
      if (t.kind === "income") current.netCents += t.amountCents;
      else if (t.kind === "expense") current.netCents -= t.amountCents;
    }
    return groups;
  }, [monthTx]);

  const today = new Date();
  const isCurrentMonth = cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();

  const prevMonthExpenseCents = rangeTx
    .filter((t) => t.kind === "expense" && t.date.slice(0, 7) === prevMKey)
    .reduce((s, t) => s + t.amountCents, 0);
  const thisMonthLabel = `${THAI_MONTHS[cursor.getMonth()]} ${cursor.getFullYear() + 543}`;
  const prevMonthLabel = `${THAI_MONTHS[prevCursor.getMonth()]} ${prevCursor.getFullYear() + 543}`;

  const activeAccounts = accounts.filter((a) => a.status !== "trashed");
  const assetAccounts = activeAccounts.filter((a) => a.type === "asset" && !a.isGoalAccount && !a.isInvestmentAccount);
  const debtAccounts = activeAccounts.filter((a) => a.type === "debt");
  const goalAccounts = activeAccounts.filter((a) => a.isGoalAccount);
  const investmentAccounts = activeAccounts.filter((a) => a.isInvestmentAccount);
  const investedCents = investmentAccounts.reduce((s, a) => s + a.balanceCents, 0);
  const totalAssetsCents = assetAccounts.reduce((s, a) => s + a.balanceCents, 0) + goalAccounts.reduce((s, a) => s + a.balanceCents, 0) + investedCents;
  const totalDebtCents = debtAccounts.reduce((s, a) => s + a.balanceCents, 0);
  const netWorthCents = totalAssetsCents - totalDebtCents;

  const catTotals = useMemo(() => {
    const m = {};
    monthTx.filter((t) => t.kind === "expense").forEach((t) => { m[t.category] = (m[t.category] || 0) + t.amountCents; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);
  const maxCat = catTotals.length ? catTotals[0][1] : 1;

  // Any account except the one currently selected as the transfer source.
  const transferDestinations = activeAccounts.filter((a) => a.id !== form.accountId);

  async function submitTx(e) {
    e.preventDefault();
    let amt;
    try {
      amt = parseToCents(form.amount);
    } catch (err) {
      setSaveErr(true);
      setErrDetail(String(err.message));
      return;
    }
    if (!amt || amt <= 0) return;
    if (form.kind === "transfer" && !form.toAccountId) return;

    const payload =
      form.kind === "transfer"
        ? { kind: "transfer", amount: form.amount, accountId: form.accountId, toAccountId: form.toAccountId, date: form.date, note: form.note.trim() }
        : { kind: form.kind, amount: form.amount, category: form.category, accountId: form.accountId, date: form.date, note: form.note.trim() };

    setSaving(true);
    try {
      await createTransaction(payload);
      await Promise.all([refetchReference(), loadRangeTx()]);
      setSaveErr(false);

      // Fold the just-saved row into last30Tx locally (rather than re-fetching) so a
      // brand-new entry counts toward the quick-pick suggestions immediately — only when its
      // date actually falls in the real last-30-days window, since the date field can be
      // backdated arbitrarily far in the past.
      const cutoff = toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 29));
      if (form.date >= cutoff) {
        setLast30Tx((prev) => [
          {
            id: `local-${Date.now()}`,
            kind: form.kind === "transfer" ? "repay" : form.kind,
            amountCents: amt,
            category: form.kind === "transfer" ? null : form.category,
            accountId: form.accountId,
            toAccountId: form.kind === "transfer" ? form.toAccountId : null,
            date: form.date,
            note: form.note.trim(),
          },
          ...prev,
        ]);
      }
      // Lets NoEntryTodayBanner re-check right away instead of waiting for the next page load.
      setEntrySavedSignal((n) => n + 1);

      setForm({ ...form, amount: "", note: "" });
      setShowForm(false);
    } catch (err) {
      setSaveErr(true);
      setErrDetail(String(err && err.message ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTx(tx) {
    try {
      await deleteTransaction(tx.id);
      await Promise.all([refetchReference(), loadRangeTx()]);
      setSaveErr(false);
    } catch (err) {
      setSaveErr(true);
      setErrDetail(String(err && err.message ? err.message : err));
    }
  }

  async function addAccount(e) {
    e.preventDefault();
    const name = newAcc.name.trim();
    if (!name) return;

    setSaving(true);
    try {
      await createAccount({ name, type: newAcc.type });
      await refetchReference();
      setSaveErr(false);
      setNewAcc({ name: "", type: "asset" });
      setShowAddAccount(false);
    } catch (err) {
      setSaveErr(true);
      setErrDetail(String(err && err.message ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  const cats = form.kind === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const expenseTargetAccounts = form.kind === "expense" ? activeAccounts.filter((a) => !a.isGoalAccount && !a.isInvestmentAccount) : assetAccounts;

  // --- Quick-entry suggestions (last real 30 days, not the calendar-cursor's month) ---
  const last30 = withinLastDays(last30Tx, new Date(), 30);
  const frequentCategories = form.kind !== "transfer" ? mostFrequentCategories(last30, form.kind, 5) : [];
  const frequentAccountIds = mostFrequentAccounts(last30, 3, expenseTargetAccounts.map((a) => a.id));
  const frequentAccounts = frequentAccountIds.map((id) => expenseTargetAccounts.find((a) => a.id === id)).filter(Boolean);
  const frequentAmounts = mostFrequentAmounts(last30, 5);

  // Warrior mascot's speech bubble (arcade theme only) — reuses the same rolling-7-days-vs-
  // previous-7-days category comparison WeeklyInsightCard.jsx already computes for the other
  // two mascot themes, off last30Tx (30 days comfortably covers the 14 it needs) instead of a
  // separate fetch.
  const weeklyInsight = useMemo(() => computeWeeklyInsight(last30Tx, new Date()), [last30Tx]);

  // Selecting a category (from either the quick-pick row or the dropdown) also looks up which
  // account that category was most often paired with in the last 30 days and fills it in — the
  // user can still change it manually afterward, this only sets a starting guess.
  function selectCategory(categoryName) {
    const pairedAccountId = mostFrequentAccountForCategory(last30, categoryName);
    setForm((f) => ({
      ...f,
      category: categoryName,
      accountId: pairedAccountId && expenseTargetAccounts.some((a) => a.id === pairedAccountId) ? pairedAccountId : f.accountId,
    }));
  }

  // Copies every field from the most-recently-saved transaction (any kind) into the form, with
  // today's date always overriding whatever date that old transaction had — the user still has
  // to press "บันทึกรายการ" themselves, nothing here saves automatically.
  async function redoLastTransaction() {
    try {
      const latest = await fetchLatestTransaction();
      if (!latest) return;
      const uiKind = latest.kind === "repay" ? "transfer" : latest.kind;
      setForm((f) => ({
        ...f,
        kind: uiKind,
        amount: centsToPlain(latest.amountCents),
        category: latest.category || (uiKind === "income" ? INCOME_CATS[0].name : EXPENSE_CATS[0].name),
        accountId: latest.accountId,
        toAccountId: latest.toAccountId || "",
        note: "",
        date: todayStr(),
      }));
    } catch (err) {
      setSaveErr(true);
      setErrDetail(String(err && err.message ? err.message : err));
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: colors.inkMuted }}>กำลังโหลด...</div>;
  }

  return (
    <div>
      {(error || txError) && (
        <div style={styles.diagBanner}>
          ⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: {error || txError}
          <div style={{ fontSize: 11, marginTop: 4, color: colors.accentInk }}>
            ตรวจสอบว่า backend (npm run dev:server) กำลังทำงานอยู่ที่พอร์ต 3001
          </div>
        </div>
      )}
      <NoEntryTodayBanner refreshSignal={entrySavedSignal} />
      <div style={styles.header}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 2, color: colors.inkMuted, marginBottom: 2 }}>สมุดบัญชีของฉัน</div>
          <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: colors.ink }}>บันทึกรายรับ-รายจ่าย</div>
        </div>
        <button
          style={styles.monthBadge}
          onClick={() => setShowMonthPicker(true)}
        >
          <div style={{ fontSize: 10, color: colors.white, fontWeight: 700 }}>{cursor.getFullYear() + 543}</div>
          <div style={{ fontSize: 15, color: colors.white, fontWeight: 700 }}>{THAI_MONTHS[cursor.getMonth()]}</div>
        </button>
      </div>

      <div style={styles.monthNav}>
        <button style={navBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <ChevronLeft size={16} color={colors.inkMuted} />
        </button>
        <span style={{ color: colors.inkMuted, fontSize: 13 }}>{THAI_MONTHS[cursor.getMonth()]} {cursor.getFullYear() + 543}</span>
        <button style={navBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <ChevronRight size={16} color={colors.inkMuted} />
        </button>
      </div>

      {/* position:relative here (not on styles.passbook itself, which has overflow:hidden for
          its own perforation-strip clipping) so WarriorMascot + its speech bubble can hang
          outside the card's own top edge without being clipped by that overflow:hidden. */}
      <div style={{ position: "relative" }}>
        <div style={styles.passbook}>
          <div style={styles.perforation} />
          <div style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: 12, color: colors.inkMuted, marginBottom: 4 }}>ความมั่งคั่งสุทธิ (สินทรัพย์ − หนี้สิน)</div>
          <div className="num" style={{ fontSize: 34, fontWeight: 600, color: colors.ink, marginBottom: 4 }}>{centsToDisplay(netWorthCents)}</div>
          <div style={{ fontSize: 12, color: colors.inkMuted, marginBottom: 16 }}>
            สินทรัพย์ {centsToDisplay(totalAssetsCents)} · หนี้สิน {centsToDisplay(totalDebtCents)}
            {investedCents > 0 && <> · ลงทุน {centsToDisplay(investedCents)}</>}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {/* minWidth: 0 overrides flexbox's default min-width:auto, which otherwise keeps
                each column at least as wide as its number's unbroken text — needed now that
                the arcade theme's pixel number-font is wide enough to overflow a 1/3 column. */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: colors.inkMuted }}>รายรับเดือนนี้</div>
              <div className="num" style={{ fontSize: 17, color: colors.primary, fontWeight: 600 }}>+{centsToDisplay(incomeCents)}</div>
            </div>
            <div style={{ width: 1, background: colors.border }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: colors.inkMuted }}>รายจ่ายเดือนนี้</div>
              <div className="num" style={{ fontSize: 17, color: colors.danger, fontWeight: 600 }}>-{centsToDisplay(expenseCents)}</div>
            </div>
            <div style={{ width: 1, background: colors.border }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: colors.inkMuted }}>โอน/ชำระเดือนนี้</div>
              <div className="num" style={{ fontSize: 17, color: colors.ink, fontWeight: 600 }}>{centsToDisplay(transferredCents)}</div>
            </div>
          </div>
        </div>
        </div>
        {/* Positioning lives in the ".warrior-mount" CSS class (App.jsx), not inline here — it
            needs a genuinely different position on narrow mobile (above the card, clear of
            every number) vs. desktop (in the gap between the top figure and the income/expense/
            transfer row), and inline styles can't be overridden by a media query, only by
            another inline style, so a class is the only way to let CSS pick per breakpoint. */}
        <div className="warrior-mount">
          <WarriorMascot message={weeklyInsight.message} />
        </div>
      </div>

      {/* Single column on mobile (unchanged) — CSS multi-column at desktop (".dash-columns" in
          App.jsx) flows these same cards, same DOM order, into 2 columns instead of reordering
          them, so nothing about the mobile reading order or these components' own code changes. */}
      <div className="dash-columns">
        <WeeklyInsightCard />
        <SafeToSpendCard isCurrentMonth={isCurrentMonth} expenseCentsSoFar={expenseCents} />
        <MonthComparisonBar
          thisMonthExpenseCents={expenseCents}
          prevMonthExpenseCents={prevMonthExpenseCents}
          thisLabel={thisMonthLabel}
          prevLabel={prevMonthLabel}
        />
        <PendingBillsCard cursor={cursor} />
        <RecommendationsCard transactions={rangeTx} budgets={budgets} cursor={cursor} isCurrentMonth={isCurrentMonth} />
      </div>

      <div style={sectionHead} className="section-head">
        <span>สินทรัพย์</span>
        <button style={textBtn} onClick={() => setShowAddAccount(true)}>+ เพิ่มบัญชี</button>
      </div>
      <div className="dash-acc-row" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, marginBottom: 4 }}>
        {assetAccounts.map((a) => (
          <div key={a.id} style={styles.accCard}>
            <div style={iconChip(colors.primaryTint)}><Wallet size={15} color={colors.primary} /></div>
            <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>{a.name}</div>
            <div className="num" style={{ fontSize: 16, color: colors.ink, fontWeight: 600 }}>{centsToDisplay(a.balanceCents)}</div>
          </div>
        ))}
      </div>

      {debtAccounts.length > 0 && (
        <>
          <div style={sectionHead} className="section-head"><span>หนี้ผ่อนชำระ</span></div>
          <div className="dash-acc-row" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {debtAccounts.map((a) => {
              // Stamina = how much of this month's set monthly payment has actually gone in —
              // there's no stored original loan amount to measure lifetime payoff % against
              // (see the plan discussion), so this reads as "on track this month" instead.
              const paidThisMonth = monthTx
                .filter((t) => t.kind === "repay" && t.toAccountId === a.id)
                .reduce((s, t) => s + t.amountCents, 0);
              const staminaPct = a.monthlyPaymentCents > 0
                ? Math.min(100, (paidThisMonth / a.monthlyPaymentCents) * 100)
                : (paidThisMonth > 0 ? 100 : 0);
              return (
                <div key={a.id} style={{ ...styles.accCard, borderColor: colors.dangerBorder, background: colors.dangerSoft }}>
                  <div style={iconChip(colors.dangerTint)}><CreditCard size={15} color={colors.danger} /></div>
                  <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>{a.name}</div>
                  <div className="num" style={{ fontSize: 16, color: colors.danger, fontWeight: 600 }}>{centsToDisplay(a.balanceCents)}</div>
                  <div style={{ fontSize: 10, color: colors.inkMuted, marginBottom: theme === "arcade" ? 4 : 0 }}>ค้างชำระ</div>
                  {theme === "arcade" && a.monthlyPaymentCents > 0 && (
                    <StaminaBar theme={theme} paidPct={staminaPct} color={colors.danger} trackColor={colors.divider} />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {goalAccounts.length > 0 && (
        <>
          <div style={sectionHead} className="section-head"><span>เป้าหมายออม</span></div>
          <div className="dash-acc-row" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {goalAccounts.map((a) => {
              const pct = a.targetAmountCents > 0 ? Math.min(100, (a.balanceCents / a.targetAmountCents) * 100) : 0;
              return (
                <div key={a.id} style={{ ...styles.accCard, borderColor: colors.secondaryBorder, background: colors.secondarySoft, minWidth: 130 }}>
                  <div style={iconChip(colors.secondaryTint)}><Target size={15} color={colors.secondary} /></div>
                  <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>{a.name}</div>
                  <div className="num" style={{ fontSize: 16, color: colors.secondary, fontWeight: 600 }}>{centsToDisplay(a.balanceCents)}</div>
                  <div style={{ marginTop: 4 }}>
                    <QuestBar theme={theme} pct={pct} color={colors.secondary} trackColor={colors.divider} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {investmentAccounts.length > 0 && (
        <>
          <div style={sectionHead} className="section-head"><span>เงินลงทุน</span></div>
          <div className="dash-acc-row" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {investmentAccounts.map((a) => (
              <div key={a.id} style={{ ...styles.accCard, borderColor: colors.secondaryBorder, background: colors.secondarySoft }}>
                <div style={iconChip(colors.secondaryTint)}><TrendingUp size={15} color={colors.secondary} /></div>
                <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>{a.name}</div>
                <div className="num" style={{ fontSize: 16, color: colors.secondary, fontWeight: 600 }}>{centsToDisplay(a.balanceCents)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Side-by-side at desktop (".dash-split" in App.jsx) — stacked in the same order on
          mobile (unchanged). Category breakdown naturally renders shorter than the transaction
          list; align-items:start (in the CSS) keeps each column's own height instead of
          stretching the shorter one to match. */}
      <div className="dash-split">
        <div className="dash-split-left">
          {catTotals.length > 0 && (
            <>
              <div style={sectionHead} className="section-head"><span>รายจ่ายตามหมวดหมู่</span></div>
              <div style={card}>
                {catTotals.map(([cat, amtCents]) => {
                  const icon = EXPENSE_CATS.find((c) => c.name === cat)?.icon || "📦";
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: colors.ink, display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <CategoryIcon theme={theme} name={cat} fallback={icon} size={16} /> {cat}
                        </span>
                        <span className="num" style={{ color: colors.danger }}>{centsToDisplay(amtCents)}</span>
                      </div>
                      <div style={{ height: 5, background: colors.divider, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(amtCents / maxCat) * 100}%`, background: colors.danger, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="dash-split-right">
          <div style={sectionHead} className="section-head">
            <span>รายการเดือนนี้</span>
            <span style={{ color: colors.inkMuted, fontSize: 12 }}>{monthTx.length} รายการ</span>
          </div>
          {monthTx.length === 0 ? (
            <div style={card}>
              <div style={{ textAlign: "center", color: colors.inkMuted, fontSize: 13, padding: "20px 0" }}>
                ยังไม่มีรายการในเดือนนี้ — กด + เพื่อเริ่มบันทึก
              </div>
            </div>
          ) : (
            dayGroups.map((g, gi) => (
              <div key={g.date} style={{ ...card, marginBottom: gi < dayGroups.length - 1 ? 10 : 0 }}>
                <div style={styles.dayHeader}>
                  <span>{dayLabel(g.date)}</span>
                  {g.netCents !== 0 && (
                    <span className="num" style={{ color: g.netCents >= 0 ? colors.primary : colors.danger }}>
                      {g.netCents >= 0 ? "+" : ""}{centsToDisplay(g.netCents)}
                    </span>
                  )}
                </div>
                {g.items.map((t) => {
                  const isTransfer = t.kind === "repay";
                  const cat = !isTransfer ? (t.kind === "expense" ? EXPENSE_CATS : INCOME_CATS).find((c) => c.name === t.category) : null;
                  const acc = accounts.find((a) => a.id === t.accountId);
                  const toAcc = isTransfer ? accounts.find((a) => a.id === t.toAccountId) : null;
                  const xfer = isTransfer ? describeTransfer(toAcc) : null;
                  return (
                    <div key={t.id} style={txRow}>
                      <div style={txIcon}>
                        <CategoryIcon theme={theme} name={t.category} fallback={isTransfer ? xfer.icon : (cat?.icon || "📦")} isTransfer={isTransfer} size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: colors.ink }}>{isTransfer ? `${xfer.toward} ${toAcc?.name || ""}` : t.category}</div>
                        <div style={{ fontSize: 11, color: colors.inkMuted }}>
                          {isTransfer ? `จาก ${acc?.name || "-"}` : acc?.name || "-"}
                          {t.note ? ` · ${t.note}` : ""}
                        </div>
                      </div>
                      <div className="num" style={{ fontSize: 14, fontWeight: 600, color: isTransfer ? colors.ink : t.kind === "income" ? colors.primary : colors.danger }}>
                        {isTransfer ? "" : t.kind === "income" ? "+" : "-"}{centsToDisplay(t.amountCents)}
                      </div>
                      <button style={iconBtn} onClick={() => deleteTx(t)}><Trash2 size={14} color={colors.inkMuted} /></button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {saveErr && <div style={{ color: colors.danger, fontSize: 12, textAlign: "center", marginTop: 8 }}>บันทึกไม่สำเร็จ: {errDetail || "ลองอีกครั้ง"}</div>}
      <div style={{ height: 90 }} />

      <button className="dashboard-fab" style={styles.fab} onClick={() => setShowForm(true)}>
        <Plus size={24} color={colors.white} />
      </button>

      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={sheetHead}>
              <span style={{ fontWeight: 600, color: colors.ink }}>เพิ่มรายการ</span>
              <button onClick={() => setShowForm(false)} style={iconBtn}><X size={18} color={colors.inkMuted} /></button>
            </div>
            <button type="button" style={styles.redoBtn} onClick={redoLastTransaction}>
              🔁 จดซ้ำจากรายการล่าสุด
            </button>
            <div style={kindToggle}>
              <button style={{ ...kindBtn, ...(form.kind === "expense" ? kindActiveExp : {}) }}
                onClick={() => setForm({ ...form, kind: "expense", category: EXPENSE_CATS[0].name })}>รายจ่าย</button>
              <button style={{ ...kindBtn, ...(form.kind === "income" ? kindActiveInc : {}) }}
                onClick={() => setForm({ ...form, kind: "income", category: INCOME_CATS[0].name, accountId: assetAccounts[0]?.id || "cash" })}>รายรับ</button>
              <button style={{ ...kindBtn, ...(form.kind === "transfer" ? styles.kindActiveRepay : {}) }}
                onClick={() => setForm({ ...form, kind: "transfer", accountId: assetAccounts[0]?.id || "cash", toAccountId: "" })}>
                <ArrowRightLeft size={12} style={{ marginRight: 4, verticalAlign: -1 }} />โอน/ชำระ
              </button>
            </div>
            <form onSubmit={submitTx}>
              <label style={label}>จำนวนเงิน (บาท)</label>
              <input type="number" inputMode="decimal" step="0.01" min="0" required autoFocus
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00" style={input} />
              {frequentAmounts.length > 0 && (
                <div style={styles.quickPickRow}>
                  {frequentAmounts.map((cents) => (
                    <button key={cents} type="button" style={styles.quickPickAmountBtn}
                      onClick={() => setForm((f) => ({ ...f, amount: centsToPlain(cents) }))}>
                      {/* ฿ and the digits are two separate spans with an explicit flex gap
                          between them, not one string relying on letter-spacing — letter-spacing
                          alone (tried first) adds the same tiny gap after *every* character
                          (including between digits, and before the decimal point), which wasn't
                          enough specifically between ฿ and the first digit to stop them reading
                          as cramped/touching. An explicit gap guarantees a real, fixed-width
                          break at exactly that one spot regardless of font metrics.
                          fontFamily+fontSize inline both win outright here: neither is fought by
                          any !important rule, since the theme's blanket pixel-button rule (which
                          IS !important) only ever sets those properties on the <button> element
                          itself, not on this span — the span's own inline declarations simply
                          override what it would otherwise have inherited. Press Start 2P has no
                          ฿ glyph at all, so keeping both parts on the same explicit font (the
                          app's normal money font, same as ".num" elsewhere) is what actually
                          stops the mismatched-font rendering that read as "overlapping" — the
                          gap alone wasn't the whole fix. */}
                      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3, fontFamily: "var(--font-num)", fontSize: 13 }}>
                        <span>฿</span>
                        <span>{centsToPlain(cents)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {form.kind !== "transfer" && (
                <>
                  <label style={label}>หมวดหมู่</label>
                  {frequentCategories.length > 0 && (
                    <div style={styles.quickPickRow}>
                      {frequentCategories.map((catName) => {
                        const catInfo = cats.find((c) => c.name === catName);
                        return (
                          <button key={catName} type="button"
                            style={{ ...styles.quickPickBtn, ...(form.category === catName ? styles.quickPickBtnActive : {}) }}
                            onClick={() => selectCategory(catName)}>
                            {catInfo?.icon} {catName}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <select value={form.category} onChange={(e) => selectCategory(e.target.value)} style={input}>
                    {cats.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                  <label style={label}>{form.kind === "expense" ? "จ่ายจากบัญชี / บัตร" : "เข้าบัญชี"}</label>
                  {frequentAccounts.length > 0 && (
                    <div style={styles.quickPickRow}>
                      {frequentAccounts.map((a) => (
                        <button key={a.id} type="button"
                          style={{ ...styles.quickPickBtn, ...(form.accountId === a.id ? styles.quickPickBtnActive : {}) }}
                          onClick={() => setForm((f) => ({ ...f, accountId: a.id }))}>
                          {a.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} style={input}>
                    {expenseTargetAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.type === "debt" ? " (ผ่อนชำระ)" : ""}</option>)}
                  </select>
                </>
              )}

              {form.kind === "transfer" && (
                <>
                  <label style={label}>จ่ายจากบัญชี</label>
                  <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value, toAccountId: "" })} style={input}>
                    {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <label style={label}>โอนไปบัญชี</label>
                  <select value={form.toAccountId} onChange={(e) => setForm({ ...form, toAccountId: e.target.value })} style={input}>
                    <option value="">เลือกบัญชีปลายทาง</option>
                    {transferDestinations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}{a.type === "debt" ? " (ผ่อนชำระ)" : a.isGoalAccount ? " (เป้าหมายออม)" : ""}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label style={label}>วันที่</label>
              <div style={styles.quickPickRow}>
                <button type="button" style={{ ...styles.quickPickBtn, ...(form.date === todayStr() ? styles.quickPickBtnActive : {}) }}
                  onClick={() => setForm((f) => ({ ...f, date: todayStr() }))}>วันนี้</button>
                <button type="button" style={{ ...styles.quickPickBtn, ...(form.date === yesterdayStr() ? styles.quickPickBtnActive : {}) }}
                  onClick={() => setForm((f) => ({ ...f, date: yesterdayStr() }))}>เมื่อวาน</button>
              </div>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={input} />
              <label style={label}>บันทึกเพิ่มเติม (ไม่บังคับ)</label>
              <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="เช่น ซื้อของที่ 7-11" style={input} />
              <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "บันทึกรายการ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddAccount && (
        <div style={overlay} onClick={() => setShowAddAccount(false)}>
          <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={sheetHead}>
              <span style={{ fontWeight: 600, color: colors.ink }}>เพิ่มบัญชี</span>
              <button onClick={() => setShowAddAccount(false)} style={iconBtn}><X size={18} color={colors.inkMuted} /></button>
            </div>
            <form onSubmit={addAccount}>
              <label style={label}>ประเภทบัญชี</label>
              <div style={kindToggle}>
                <button type="button" style={{ ...kindBtn, ...(newAcc.type === "asset" ? kindActiveInc : {}) }}
                  onClick={() => setNewAcc({ ...newAcc, type: "asset" })}>เงินสด / ธนาคาร</button>
                <button type="button" style={{ ...kindBtn, ...(newAcc.type === "debt" ? kindActiveExp : {}) }}
                  onClick={() => setNewAcc({ ...newAcc, type: "debt" })}>หนี้ผ่อนชำระ (เช่น PayLater)</button>
              </div>
              <label style={label}>ชื่อบัญชี</label>
              <input type="text" required autoFocus value={newAcc.name}
                onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                placeholder={newAcc.type === "debt" ? "เช่น Shopee PayLater" : "เช่น SCB, TrueMoney"} style={input} />
              <div style={{ fontSize: 11, color: colors.inkMuted, marginTop: 8 }}>อยากเพิ่มเป้าหมายออมหรือเงินลงทุน? ไปที่หน้า "สินทรัพย์" แล้วกด + เพิ่มบัญชี</div>
              <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "เพิ่มบัญชี"}
              </button>
            </form>
          </div>
        </div>
      )}

      <MonthPickerSheet
        open={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        year={cursor.getFullYear()}
        month={cursor.getMonth()}
        onSelectMonth={(y, m) => { setCursor(new Date(y, m, 1)); setShowMonthPicker(false); }}
        showAllOption={false}
      />
    </div>
  );
}

const styles = {
  diagBanner: { background: colors.accentTint, border: `1px solid ${colors.accentBorder}`, color: colors.accentInk, fontSize: 12, borderRadius: 10, padding: "10px 12px", marginBottom: 14 },
  // Quick-entry shortcuts (date/category/account/amount) — a row of pill buttons that sit
  // above each field's normal input/select, never replacing it.
  // marginTop matters most right after the amount <input> — that one has no label sitting
  // between it and this row (unlike the category/account rows, which already get some breathing
  // room from label's own bottom margin), so without it the buttons sat touching the input box.
  quickPickRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 8 },
  quickPickBtn: { padding: "6px 10px", borderRadius: 20, border: `1px solid ${colors.border}`, background: colors.primarySoft, color: colors.ink, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  // Extra horizontal padding vs. quickPickBtn — the arcade theme's pixel font runs noticeably
  // wider per character than this button was originally sized for (see the amount button's own
  // inline-style comment for why the *text* itself is exempted from that font; the button's own
  // padding still needs a bit more room regardless, since the pixel font shows up on siblings/
  // borders even where the text inside doesn't use it).
  quickPickAmountBtn: { padding: "8px 14px", borderRadius: 20, border: `1px solid ${colors.border}`, background: colors.primarySoft, color: colors.ink, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  // Full "border" shorthand here (not just borderColor) — mixing a shorthand property
  // (quickPickBtn's `border: "1px solid ..."`) with only its longhand override on the merged
  // object is what React's dev-mode warns about ("Removing borderColor border") when a button
  // toggles active/inactive, even though both actually render fine.
  quickPickBtnActive: { background: colors.primaryTint, color: colors.primary, border: `1px solid ${colors.primary}` },
  redoBtn: { width: "100%", padding: "9px 0", borderRadius: 10, border: `1px dashed ${colors.border}`, background: colors.primarySoft, color: colors.primary, fontSize: 12, fontWeight: 600, marginBottom: 14 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  monthBadge: {
    width: 52, height: 52, borderRadius: "50%", background: colors.primary, border: "none",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    boxShadow: `0 0 0 3px ${colors.primarySoft}, 0 0 0 4px ${colors.ring}`,
  },
  monthNav: { display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 16 },
  passbook: {
    background: colors.white,
    borderRadius: 14, marginBottom: 22, position: "relative", overflow: "hidden",
    border: `1px solid ${colors.border}`, boxShadow: "0 4px 16px rgba(15,42,92,0.08)",
  },
  perforation: { height: 6, width: "100%", backgroundImage: `radial-gradient(circle, ${colors.primarySoft} 2.5px, transparent 2.6px)`, backgroundSize: "14px 6px", backgroundPosition: "top" },
  accCard: { background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 16px", minWidth: 110, flexShrink: 0, boxShadow: "0 1px 3px rgba(15,42,92,0.05)" },
  dayHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 700, color: colors.inkMuted, padding: "0 0 8px", marginBottom: 4, borderBottom: `1px solid ${colors.divider}` },
  // position/bottom/right/transform live in the ".dashboard-fab" CSS class (App.jsx) instead of
  // here — an inline value for those would win over the desktop breakpoint's override no matter
  // what the stylesheet says, same reasoning as BottomNav.jsx's "display" property.
  fab: {
    width: 52, height: 52, borderRadius: "50%", background: colors.primary, border: "none",
    display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(29,78,216,0.35)",
    zIndex: 41,
  },
  kindActiveRepay: { background: colors.divider, color: colors.ink, borderColor: colors.ink },
};
