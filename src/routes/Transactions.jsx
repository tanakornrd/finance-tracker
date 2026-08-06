import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Download, Upload } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { fetchTransactions } from "../api.js";
import { centsToDisplay, centsToPlain } from "../../shared/money.js";
import { THAI_MONTHS } from "../../shared/dates.js";
import { EXPENSE_CATS, INCOME_CATS } from "../../shared/categories.js";
import MonthPickerSheet from "../components/MonthPickerSheet.jsx";
import { describeTransfer } from "../lib/transferLabel.js";
import { card, sectionHead, txRow, txIcon } from "../components/sharedStyles.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";
import ArcherMascot from "../components/mascot/ArcherMascot.jsx";
import StreakQuestModal from "../components/StreakQuestModal.jsx";
import { computeStreak } from "../lib/streak.js";

function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

const KIND_LABELS = { income: "รายรับ", expense: "รายจ่าย", repay: "โอน/ชำระ" };

const GROUP_TABS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "flow", label: "เงินเข้า-ออก" },
  { key: "debt", label: "หนี้สิน" },
];

// A 'repay'-kind row is only actually debt-related when a debt account is on one end of
// it — the same kind is also used for plain transfers and goal top-ups (see transferLabel.js).
function isDebtRelated(t, accounts) {
  const isDebtAcc = (id) => accounts.find((a) => a.id === id)?.type === "debt";
  if (t.kind === "repay") return isDebtAcc(t.accountId) || isDebtAcc(t.toAccountId);
  if (t.kind === "expense") return isDebtAcc(t.accountId);
  return false;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildCsv(rows, accounts) {
  const header = ["วันที่", "ประเภท", "หมวดหมู่", "บัญชี", "โอนไปบัญชี", "จำนวนเงิน", "โน้ต"];
  const lines = [header.map(csvEscape).join(",")];
  for (const t of rows) {
    const acc = accounts.find((a) => a.id === t.accountId);
    const toAcc = t.kind === "repay" ? accounts.find((a) => a.id === t.toAccountId) : null;
    const kindLabel = t.kind === "repay" ? describeTransfer(toAcc).noun : (KIND_LABELS[t.kind] || t.kind);
    lines.push(
      [
        t.date,
        kindLabel,
        t.category || "",
        acc?.name || "",
        toAcc?.name || "",
        centsToPlain(t.amountCents),
        t.note || "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\r\n");
}

function downloadCsv(csvText, filename) {
  // Leading BOM so Thai text opens correctly in Excel, which otherwise guesses the wrong encoding.
  const blob = new Blob(["﻿" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Transactions() {
  const { theme } = useTheme();
  const { accounts, loading: refLoading } = useReferenceData();
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const loading = refLoading || txLoading;
  const [searchQuery, setSearchQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState(null); // null = all months
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [groupTab, setGroupTab] = useState("all");
  const [showStreak, setShowStreak] = useState(false);

  // This page searches/exports across full history, so unlike every other route it does need
  // everything — but only once the user actually navigates here, not preloaded at app start.
  useEffect(() => {
    fetchTransactions().then(setTransactions).finally(() => setTxLoading(false));
  }, []);

  // Archer's click target (RPG party interactions, part 4) — reuses this page's own already-
  // fetched full transaction history (no extra request; see src/lib/streak.js for why no
  // separate table is needed either) rather than the STREAK_WINDOW_DAYS-scoped fetch the
  // original plan described, since this page already has everything.
  const streak = useMemo(() => computeStreak(transactions), [transactions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const mKey = monthFilter ? monthKey(monthFilter) : null;
    return transactions
      .filter((t) => !mKey || t.date.slice(0, 7) === mKey)
      .filter((t) => {
        if (groupTab === "all") return true;
        const isDebt = isDebtRelated(t, accounts);
        return groupTab === "debt" ? isDebt : !isDebt;
      })
      .filter((t) => {
        if (!q) return true;
        const amountStr = centsToPlain(t.amountCents);
        return (
          (t.category || "").toLowerCase().includes(q) ||
          (t.note || "").toLowerCase().includes(q) ||
          amountStr.includes(q)
        );
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, accounts, searchQuery, monthFilter, groupTab]);

  function handleExport() {
    const csv = buildCsv(filtered, accounts);
    const filename = monthFilter ? `transactions-${monthKey(monthFilter)}.csv` : "transactions-all.csv";
    downloadCsv(csv, filename);
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  const monthLabel = monthFilter
    ? `${THAI_MONTHS[monthFilter.getMonth()]} ${monthFilter.getFullYear() + 543}`
    : "ทั้งหมด";

  return (
    <div>
      <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", marginBottom: 18 }}>รายการทั้งหมด</div>

      {/* No `firing` prop (this page has no save action to react to, unlike MageMascot on
          Dashboard.jsx/TransactionDetail.jsx) but is clickable via onClick — opens
          StreakQuestModal (RPG party interactions, part 4), reusing the same "fire" animation
          as ArcherMascot's own firing mode. */}
      <ArcherMascot onClick={() => setShowStreak(true)} />

      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={16} color="var(--color-inkMuted)" style={{ position: "absolute", left: 12, top: 12 }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อร้าน, หมวดหมู่, จำนวนเงิน..."
          style={styles.searchInput}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {GROUP_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            style={groupTab === tab.key ? { ...styles.tabBtn, ...styles.tabBtnActive } : styles.tabBtn}
            onClick={() => setGroupTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" style={styles.filterBtn} onClick={() => setShowMonthPicker(true)}>
          📅 {monthLabel}
        </button>
        <button type="button" style={styles.filterBtn} onClick={handleExport}>
          <Download size={13} style={{ marginRight: 4, verticalAlign: -2 }} />Export CSV
        </button>
        <Link to="/import" style={{ ...styles.filterBtn, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Upload size={13} style={{ marginRight: 4 }} />นำเข้า CSV
        </Link>
      </div>

      <div style={sectionHead} className="section-head">
        <span>รายการ</span>
        <span style={{ color: "var(--color-inkMuted)", fontSize: 12 }}>{filtered.length} รายการ</span>
      </div>

      <div style={card}>
        {transactions.length === 0 ? (
          <div style={styles.emptyMsg}>ยังไม่มีรายการ — ไปที่หน้าหลักเพื่อเริ่มบันทึก</div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyMsg}>ไม่พบรายการที่ตรงกับตัวกรอง</div>
        ) : (
          filtered.map((t) => {
            const isTransfer = t.kind === "repay";
            const cat = !isTransfer ? (t.kind === "expense" ? EXPENSE_CATS : INCOME_CATS).find((c) => c.name === t.category) : null;
            const acc = accounts.find((a) => a.id === t.accountId);
            const toAcc = isTransfer ? accounts.find((a) => a.id === t.toAccountId) : null;
            const xfer = isTransfer ? describeTransfer(toAcc) : null;
            return (
              <Link key={t.id} to={`/transactions/${t.id}`} style={{ ...txRow, textDecoration: "none" }}>
                <div style={txIcon}><CategoryIcon theme={theme} name={t.category} fallback={isTransfer ? xfer.icon : (cat?.icon || "📦")} isTransfer={isTransfer} size={18} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{isTransfer ? `${xfer.toward} ${toAcc?.name || ""}` : t.category}</div>
                  <div style={{ fontSize: 11, color: "var(--color-inkMuted)" }}>
                    {t.date} · {isTransfer ? `จาก ${acc?.name || "-"}` : acc?.name || "-"}
                    {t.note ? ` · ${t.note}` : ""}
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

      <MonthPickerSheet
        open={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        year={monthFilter ? monthFilter.getFullYear() : new Date().getFullYear()}
        month={monthFilter ? monthFilter.getMonth() : null}
        onSelectMonth={(y, m) => { setMonthFilter(new Date(y, m, 1)); setShowMonthPicker(false); }}
        showAllOption
        onSelectAll={() => { setMonthFilter(null); setShowMonthPicker(false); }}
      />
      <StreakQuestModal
        open={showStreak}
        onClose={() => setShowStreak(false)}
        streakDays={streak.days}
        streakCapped={streak.capped}
      />
    </div>
  );
}

const styles = {
  searchInput: { width: "100%", padding: "11px 12px 11px 34px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-inputBg)", color: "var(--color-ink)", fontSize: 14 },
  filterBtn: { flex: 1, padding: "9px 4px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-white)", color: "var(--color-ink)", fontSize: 12, fontWeight: 600 },
  tabBtn: { flex: 1, padding: "9px 4px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-primarySoft)", color: "var(--color-ink)", fontSize: 12, fontWeight: 600 },
  tabBtnActive: { background: "var(--color-primary)", color: "var(--color-white)", borderColor: "var(--color-primary)" },
  emptyMsg: { textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13, padding: "20px 0" },
};
