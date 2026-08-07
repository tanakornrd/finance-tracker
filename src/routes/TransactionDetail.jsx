import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, X } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { fetchTransaction, updateTransaction } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { formatDateTimeThai } from "../../shared/dates.js";
import { EXPENSE_CATS, INCOME_CATS } from "../../shared/categories.js";
import { describeTransfer } from "../lib/transferLabel.js";
import { card, overlay, sheet, sheetHead, iconBtn, label, input, dateInput, submitBtn, colors } from "../components/sharedStyles.js";
import ModalPortal from "../components/ModalPortal.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";
import MageMascot from "../components/mascot/MageMascot.jsx";

const row = { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--color-divider)" };
const rowLabel = { fontSize: 13, color: "var(--color-inkMuted)" };
const rowValue = { fontSize: 13, color: "var(--color-ink)", fontWeight: 600 };

const styles = {
  editBtn: { padding: "7px 12px", borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-white)", color: "var(--color-primary)", fontSize: 12, fontWeight: 600 },
};

export default function TransactionDetail() {
  const { theme } = useTheme();
  const { id } = useParams();
  const { accounts, loading: refLoading, refetch: refetchReference } = useReferenceData();
  const [tx, setTx] = useState(null);
  const [txLoading, setTxLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  // Same purpose as Dashboard.jsx's own mageFiring (MageMascot.jsx's `firing` mode) — set true
  // right after the edit sheet's save succeeds. Lives here, not inside the sheet, because the
  // sheet unmounts (onClose) the instant that happens.
  const [mageFiring, setMageFiring] = useState(false);

  function reload() {
    setTxLoading(true);
    setNotFound(false);
    return fetchTransaction(id)
      .then(setTx)
      .catch(() => setNotFound(true))
      .finally(() => setTxLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (refLoading || txLoading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  if (notFound || !tx) {
    return (
      <div style={{ ...card, textAlign: "center", color: "var(--color-inkMuted)" }}>
        ไม่พบรายการนี้ — <Link to="/transactions" style={{ color: "var(--color-primary)" }}>กลับไปหน้ารายการ</Link>
      </div>
    );
  }

  const isTransfer = tx.kind === "repay";
  const cat = !isTransfer ? (tx.kind === "expense" ? EXPENSE_CATS : INCOME_CATS).find((c) => c.name === tx.category) : null;
  const account = accounts.find((a) => a.id === tx.accountId);
  const toAccount = isTransfer ? accounts.find((a) => a.id === tx.toAccountId) : null;
  const xfer = isTransfer ? describeTransfer(toAccount) : null;
  const color = isTransfer ? "var(--color-ink)" : tx.kind === "income" ? "var(--color-primary)" : "var(--color-danger)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)" }}>รายละเอียดธุรกรรม</div>
        <button type="button" style={styles.editBtn} onClick={() => setShowEdit(true)}>
          <Pencil size={13} style={{ marginRight: 4, verticalAlign: -2 }} />แก้ไข
        </button>
      </div>

      <MageMascot firing={mageFiring} />

      <div style={{ ...card, textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 8, display: "flex", justifyContent: "center" }}>
          <CategoryIcon theme={theme} name={tx.category} fallback={isTransfer ? xfer.icon : (cat?.icon || "📦")} isTransfer={isTransfer} size={32} />
        </div>
        <div style={{ fontSize: 14, color: "var(--color-ink)", fontWeight: 600 }}>{isTransfer ? xfer.noun : tx.category}</div>
        <div className="num" style={{ fontSize: 30, fontWeight: 600, color, marginTop: 6 }}>
          {isTransfer ? "" : tx.kind === "income" ? "+" : "-"}{centsToDisplay(tx.amountCents)}
        </div>
      </div>

      <div style={card}>
        <div style={row}>
          <span style={rowLabel}>ประเภท</span>
          <span style={rowValue}>{isTransfer ? xfer.noun : (tx.kind === "income" ? "รายรับ" : "รายจ่าย")}</span>
        </div>
        <div style={row}>
          <span style={rowLabel}>วันที่</span>
          <span style={rowValue}>{tx.date}</span>
        </div>
        {tx.createdAt && (
          // Only shown when present — rows saved before this field existed have it as null and
          // intentionally show nothing here rather than a guessed time. Kept out of the main
          // Dashboard/Transactions list rows (those still show just the date, unchanged).
          <div style={row}>
            <span style={rowLabel}>เวลาที่บันทึก</span>
            <span style={rowValue}>{formatDateTimeThai(tx.createdAt)}</span>
          </div>
        )}
        {!isTransfer && (
          <div style={row}>
            <span style={rowLabel}>หมวดหมู่</span>
            <span style={rowValue}>{tx.category}</span>
          </div>
        )}
        <div style={row}>
          <span style={rowLabel}>{isTransfer ? "จ่ายจากบัญชี" : "บัญชี"}</span>
          <span style={rowValue}>
            <Link to={`/accounts/${tx.accountId}`} style={{ color: "var(--color-primary)" }}>{account?.name || "-"}</Link>
          </span>
        </div>
        {isTransfer && (
          <div style={row}>
            <span style={rowLabel}>ไปบัญชี</span>
            <span style={rowValue}>
              <Link to={`/accounts/${tx.toAccountId}`} style={{ color: "var(--color-primary)" }}>{toAccount?.name || "-"}</Link>
            </span>
          </div>
        )}
        {tx.isInstallment && tx.installmentInfo && (
          <>
            <div style={row}>
              <span style={rowLabel}>งวดผ่อน</span>
              <span style={rowValue}>
                {tx.installmentInfo.currentMonth ?? "-"} / {tx.installmentInfo.totalMonths ?? "-"}
              </span>
            </div>
            {tx.installmentInfo.monthlyAmountCents != null && (
              <div style={row}>
                <span style={rowLabel}>ยอดผ่อนต่อเดือน</span>
                <span style={rowValue}>{centsToDisplay(tx.installmentInfo.monthlyAmountCents)}</span>
              </div>
            )}
          </>
        )}
        <div style={{ ...row, borderBottom: "none" }}>
          <span style={rowLabel}>โน้ต</span>
          <span style={rowValue}>{tx.note || "-"}</span>
        </div>
      </div>

      {showEdit && (
        <EditTransactionSheet
          tx={tx}
          accounts={accounts}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await Promise.all([reload(), refetchReference()]);
            setMageFiring(true);
            setTimeout(() => setMageFiring(false), 1500);
          }}
        />
      )}
    </div>
  );
}

// Amount/category/date/account/note are editable; kind (income/expense/repay) is not — matching
// what was actually asked for. Editing re-derives the account balance server-side by reversing
// the old effect and applying the new one (see editTx in transactions.js), so this form never
// touches balance_cents directly.
function EditTransactionSheet({ tx, accounts, onClose, onSaved }) {
  const isTransfer = tx.kind === "repay";
  const cats = tx.kind === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const activeAccounts = accounts.filter((a) => a.status !== "trashed");
  // Same account-eligibility rules as the "add transaction" form on Dashboard.jsx.
  const accountOptions = isTransfer
    ? activeAccounts // read-only for transfers (toAccountId isn't editable here) — just show current
    : tx.kind === "expense"
    ? activeAccounts.filter((a) => !a.isGoalAccount && !a.isInvestmentAccount)
    : activeAccounts.filter((a) => a.type === "asset" && !a.isGoalAccount && !a.isInvestmentAccount);

  const [amount, setAmount] = useState(String(tx.amountCents / 100));
  const [category, setCategory] = useState(tx.category || "");
  const [accountId, setAccountId] = useState(tx.accountId);
  const [date, setDate] = useState(tx.date);
  const [note, setNote] = useState(tx.note || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const payload = { amount, accountId, date, note };
      if (!isTransfer) payload.category = category;
      await updateTransaction(tx.id, payload);
      onSaved();
    } catch (e2) {
      setErr(e2.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
    <div style={overlay} onClick={onClose}>
      <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={sheetHead}>
          <span style={{ fontWeight: 600, color: colors.ink }}>แก้ไขรายการ</span>
          <button onClick={onClose} style={iconBtn}><X size={18} color={colors.inkMuted} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <label style={label}>จำนวนเงิน (บาท)</label>
          {/* No autoFocus (removed) — see Dashboard.jsx's amount input for why. */}
          <input type="number" inputMode="decimal" step="0.01" min="0" required
            value={amount} onChange={(e) => setAmount(e.target.value)} style={input} />

          {!isTransfer && (
            <>
              <label style={label}>หมวดหมู่</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
                {cats.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </>
          )}

          <label style={label}>{isTransfer ? "จ่ายจากบัญชี (แก้ผ่านหน้านี้ไม่ได้)" : "บัญชี"}</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={input} disabled={isTransfer}>
            {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {isTransfer && (
            <div style={{ fontSize: 11, color: colors.inkMuted, marginTop: 4 }}>
              รายการโอน/ชำระยังแก้บัญชีต้นทาง-ปลายทางจากหน้านี้ไม่ได้ — ถ้าต้องแก้บัญชี ให้ลบแล้วสร้างรายการใหม่แทน
            </div>
          )}

          <label style={label}>วันที่</label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} style={dateInput} />

          <label style={label}>โน้ต</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={input} />

          {err && <div style={{ color: colors.danger, fontSize: 12, marginTop: 10, textAlign: "center" }}>{err}</div>}

          <button type="submit" style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
