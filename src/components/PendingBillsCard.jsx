import React, { useMemo, useState } from "react";
import { X, Receipt } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { createRecurringBill } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { getPendingOccurrences } from "../lib/pendingBills.js";
import { EXPENSE_CATS } from "../../shared/categories.js";
import { sectionHead, textBtn, card, overlay, sheet, sheetHead, iconBtn, label, input, dateInput, submitBtn } from "./sharedStyles.js";
import ModalPortal from "./ModalPortal.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";

const ctaBtn = { padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--color-primary)", color: "var(--color-white)", fontWeight: 700, fontSize: 13 };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PendingBillsCard({ cursor }) {
  const { theme } = useTheme();
  const { recurringBills, recurringBillOccurrences, accounts, refetch } = useReferenceData();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    amount: "",
    category: EXPENSE_CATS[0].name,
    accountId: accounts.find((a) => a.status !== "trashed")?.id || "cash",
    frequency: "monthly",
    startDate: todayStr(),
  });

  const pendingThisMonth = useMemo(() => {
    const rangeStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const rangeEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return getPendingOccurrences(recurringBills, recurringBillOccurrences, rangeStart, rangeEnd);
  }, [recurringBills, recurringBillOccurrences, cursor]);

  async function submit(e) {
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

  return (
    <>
      <div style={sectionHead} className="section-head">
        <span>บิลรอจ่ายเดือนนี้</span>
        <button style={textBtn} onClick={() => setShowAdd(true)}>+ เพิ่มบิลประจำ</button>
      </div>

      {recurringBills.length === 0 ? (
        <div style={{ ...card, textAlign: "center" }}>
          <Receipt size={22} color="var(--color-primary)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "var(--color-inkMuted)", marginBottom: 10 }}>ยังไม่มีบิลประจำ</div>
          <button type="button" style={ctaBtn} onClick={() => setShowAdd(true)}>+ เพิ่มบิลประจำ</button>
        </div>
      ) : pendingThisMonth.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13 }}>
          ไม่มีบิลค้างจ่ายเดือนนี้
        </div>
      ) : (
        <div style={card}>
          {pendingThisMonth.map(({ bill, dueDate }, i) => {
            const icon = EXPENSE_CATS.find((c) => c.name === bill.category)?.icon || "🧾";
            const acc = accounts.find((a) => a.id === bill.accountId);
            return (
              <div
                key={`${bill.id}-${dueDate}`}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                  borderBottom: i < pendingThisMonth.length - 1 ? "1px solid var(--color-divider)" : "none",
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--color-divider)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  <CategoryIcon theme={theme} name={bill.category} fallback={icon} size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{bill.name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-inkMuted)" }}>ครบกำหนด {dueDate} · {acc?.name || "-"}</div>
                </div>
                <div className="num" style={{ fontSize: 14, fontWeight: 600, color: "var(--color-danger)" }}>
                  {centsToDisplay(bill.amountCents)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <ModalPortal>
        <div style={overlay} onClick={() => setShowAdd(false)}>
          <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={sheetHead}>
              <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>เพิ่มบิลประจำ</span>
              <button onClick={() => setShowAdd(false)} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
            </div>
            <form onSubmit={submit}>
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
              <input type="date" required value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={dateInput} />
              {err && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 8 }}>{err}</div>}
              <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "เพิ่มบิลประจำ"}
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
