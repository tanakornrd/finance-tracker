import React, { useMemo, useState } from "react";
import { X, Receipt, Trash2 } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { createRecurringBill, payRecurringBillOccurrence, skipRecurringBillOccurrence, deleteRecurringBill } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { getPendingOccurrences } from "../lib/pendingBills.js";
import { EXPENSE_CATS } from "../../shared/categories.js";
import { card, sectionHead, textBtn, overlay, sheet, sheetHead, iconBtn, label, input, submitBtn } from "../components/sharedStyles.js";
import DateField from "../components/DateField.jsx";
import ModalPortal from "../components/ModalPortal.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";

const ctaBtn = { padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--color-primary)", color: "var(--color-white)", fontWeight: 700, fontSize: 13 };
const actionBtn = { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 11, fontWeight: 600 };
const payBtn = { ...actionBtn, background: "var(--color-primaryTint)", color: "var(--color-primary)", borderColor: "var(--color-primary)" };
const skipBtn = { ...actionBtn, background: "var(--color-primarySoft)", color: "var(--color-inkMuted)" };
const delBtn = { background: "none", border: "none", padding: 4 };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function BillSection({ title, entries, accounts, onPay, onSkip, onDelete, acting, theme }) {
  return (
    <>
      <div style={sectionHead} className="section-head"><span>{title}</span></div>
      {entries.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13, marginBottom: 16 }}>
          ไม่มีบิลในช่วงนี้
        </div>
      ) : (
        <div style={{ ...card, marginBottom: 16 }}>
          {entries.map(({ bill, dueDate }, i) => {
            const icon = EXPENSE_CATS.find((c) => c.name === bill.category)?.icon || "🧾";
            const acc = accounts.find((a) => a.id === bill.accountId);
            const key = `${bill.id}-${dueDate}`;
            const isActing = acting === key;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < entries.length - 1 ? "1px solid var(--color-divider)" : "none" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--color-divider)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  <CategoryIcon theme={theme} name={bill.category} fallback={icon} size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{bill.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-inkMuted)" }}>ครบกำหนด {dueDate} · {acc?.name || "-"}</div>
                  <div className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-danger)" }}>{centsToDisplay(bill.amountCents)}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <button type="button" style={payBtn} disabled={isActing} onClick={() => onPay(bill, dueDate)}>บันทึก</button>
                  <button type="button" style={skipBtn} disabled={isActing} onClick={() => onSkip(bill, dueDate)}>ข้าม</button>
                </div>
                <button type="button" style={delBtn} disabled={isActing} onClick={() => onDelete(bill)} title="ลบบิลประจำนี้">
                  <Trash2 size={14} color="var(--color-inkMuted)" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function Upcoming() {
  const { theme } = useTheme();
  const { recurringBills, recurringBillOccurrences, accounts, loading, refetch } = useReferenceData();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "", amount: "", category: EXPENSE_CATS[0].name,
    accountId: accounts.find((a) => a.status !== "trashed")?.id || "cash", frequency: "monthly", startDate: todayStr(),
  });

  const { next7, thisMonth, nextMonth } = useMemo(() => {
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in6days = new Date(today0.getFullYear(), today0.getMonth(), today0.getDate() + 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return {
      next7: getPendingOccurrences(recurringBills, recurringBillOccurrences, today0, in6days),
      thisMonth: getPendingOccurrences(recurringBills, recurringBillOccurrences, monthStart, monthEnd),
      nextMonth: getPendingOccurrences(recurringBills, recurringBillOccurrences, nextMonthStart, nextMonthEnd),
    };
  }, [recurringBills, recurringBillOccurrences]);

  async function handlePay(bill, dueDate) {
    const key = `${bill.id}-${dueDate}`;
    setActing(key);
    setErr("");
    try {
      await payRecurringBillOccurrence(bill.id, dueDate);
      await refetch();
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
    } finally {
      setActing(null);
    }
  }

  async function handleSkip(bill, dueDate) {
    const key = `${bill.id}-${dueDate}`;
    setActing(key);
    setErr("");
    try {
      await skipRecurringBillOccurrence(bill.id, dueDate);
      await refetch();
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
    } finally {
      setActing(null);
    }
  }

  async function handleDelete(bill) {
    setActing(bill.id);
    setErr("");
    try {
      await deleteRecurringBill(bill.id);
      await refetch();
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
    } finally {
      setActing(null);
    }
  }

  async function submitAdd(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await createRecurringBill(form);
      await refetch();
      setForm({ ...form, name: "", amount: "" });
      setShowAdd(false);
    } catch (e2) {
      setErr(String(e2 && e2.message ? e2.message : e2));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span className="page-title" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)" }}>ปฏิทิน / รายการที่จะถึง</span>
        <button style={textBtn} onClick={() => setShowAdd(true)}>+ เพิ่มบิลประจำ</button>
      </div>

      {recurringBills.length === 0 ? (
        <div style={{ ...card, textAlign: "center" }}>
          <Receipt size={22} color="var(--color-primary)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "var(--color-inkMuted)", marginBottom: 10 }}>ยังไม่มีบิลประจำ</div>
          <button type="button" style={ctaBtn} onClick={() => setShowAdd(true)}>+ เพิ่มบิลประจำ</button>
        </div>
      ) : (
        <>
          <BillSection title="7 วันข้างหน้า" entries={next7} accounts={accounts} onPay={handlePay} onSkip={handleSkip} onDelete={handleDelete} acting={acting} theme={theme} />
          <BillSection title="เดือนนี้" entries={thisMonth} accounts={accounts} onPay={handlePay} onSkip={handleSkip} onDelete={handleDelete} acting={acting} theme={theme} />
          <BillSection title="เดือนถัดไป" entries={nextMonth} accounts={accounts} onPay={handlePay} onSkip={handleSkip} onDelete={handleDelete} acting={acting} theme={theme} />
        </>
      )}

      {err && <div style={{ color: "var(--color-danger)", fontSize: 12, textAlign: "center", marginTop: 8 }}>{err}</div>}

      {showAdd && (
        <ModalPortal>
        <div style={overlay} onClick={() => setShowAdd(false)}>
          <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={sheetHead}>
              <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>เพิ่มบิลประจำ</span>
              <button onClick={() => setShowAdd(false)} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
            </div>
            <form onSubmit={submitAdd}>
              <label style={label}>ชื่อบิล</label>
              <input type="text" required autoFocus value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น ค่าไฟ" style={input} />
              <label style={label}>จำนวนเงิน (บาท)</label>
              <input type="number" inputMode="decimal" step="0.01" min="0" required
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00" style={input} />
              <label style={label}>หมวดหมู่</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
                {EXPENSE_CATS.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
              <label style={label}>จ่ายจากบัญชี</label>
              <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} style={input}>
                {accounts.filter((a) => a.status !== "trashed").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <label style={label}>ความถี่</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} style={input}>
                <option value="once">ครั้งเดียว</option>
                <option value="monthly">รายเดือน</option>
                <option value="weekly">รายสัปดาห์</option>
                <option value="yearly">รายปี</option>
              </select>
              <label style={label}>{form.frequency === "once" ? "วันครบกำหนด" : "เริ่มครบกำหนดวันที่"}</label>
              <DateField required value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              {err && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 8 }}>{err}</div>}
              <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "เพิ่มบิลประจำ"}
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
