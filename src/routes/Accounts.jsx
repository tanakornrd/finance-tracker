import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, CreditCard, Target, TrendingUp, Pencil, Trash2, X, Archive } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { createAccount, updateAccount } from "../api.js";
import { centsToDisplay, centsToPlain } from "../../shared/money.js";
import { getPendingOccurrences } from "../lib/pendingBills.js";
import {
  colors, iconChip, sectionHead, textBtn, overlay, sheet, sheetHead, iconBtn, label, input, submitBtn,
  kindToggle, kindBtn, kindActiveInc, kindActiveExp,
} from "../components/sharedStyles.js";
import ModalPortal from "../components/ModalPortal.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { QuestBar } from "../theme/rpgBars.jsx";

const accCard = { background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 16px", minWidth: 0, boxShadow: "0 1px 3px rgba(15,42,92,0.05)" };
const kindActiveSecondary = { background: colors.secondaryTint, color: colors.secondary, borderColor: colors.secondary };
// gridTemplateColumns is intentionally NOT here — it's driven by the ".accounts-grid" CSS class
// (App.jsx) instead, so the desktop breakpoint's column-count override can actually take effect.
// An inline value for it would always win over any stylesheet rule, same reasoning as
// BottomNav.jsx's "display" and Dashboard.jsx's "+" FAB position, elsewhere in this project.
const rowWrap = { display: "grid", gap: 10, marginBottom: 16 };
const cardActions = { display: "flex", gap: 6, marginTop: 8 };
const miniIconBtn = { padding: "4px 8px", borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.inputBg };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Accounts() {
  const { theme } = useTheme();
  const { accounts, recurringBills, recurringBillOccurrences, loading, refetch } = useReferenceData();
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [newAcc, setNewAcc] = useState({ name: "", type: "asset", targetAmount: "", targetDate: todayStr() });
  const [editingAccount, setEditingAccount] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDebt, setEditDebt] = useState({ interestRate: "", interestRateType: "monthly", monthlyPayment: "", dueDay: "" });
  const [editGoal, setEditGoal] = useState({ targetAmount: "", targetDate: "" });

  const reservedByAccount = useMemo(() => {
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const pending = getPendingOccurrences(recurringBills, recurringBillOccurrences, rangeStart, rangeEnd);
    const map = {};
    for (const { bill } of pending) {
      map[bill.accountId] = (map[bill.accountId] || 0) + bill.amountCents;
    }
    return map;
  }, [recurringBills, recurringBillOccurrences]);

  async function submit(e) {
    e.preventDefault();
    const name = newAcc.name.trim();
    if (!name) return;
    setSaving(true);
    setErr("");
    try {
      const payload = { name, type: newAcc.type };
      if (newAcc.type === "goal") {
        payload.targetAmount = newAcc.targetAmount;
        payload.targetDate = newAcc.targetDate;
      }
      await createAccount(payload);
      await refetch();
      setNewAcc({ name: "", type: "asset", targetAmount: "", targetDate: todayStr() });
      setShowAdd(false);
    } catch (e2) {
      setErr(String(e2 && e2.message ? e2.message : e2));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(a) {
    setEditName(a.name);
    setEditDebt({
      interestRate: a.interestRate != null ? String(a.interestRate) : "",
      interestRateType: a.interestRateType || "monthly",
      monthlyPayment: a.monthlyPaymentCents != null ? centsToPlain(a.monthlyPaymentCents) : "",
      dueDay: a.dueDay != null ? String(a.dueDay) : "",
    });
    setEditGoal({
      targetAmount: a.targetAmountCents != null ? centsToPlain(a.targetAmountCents) : "",
      targetDate: a.targetDate || todayStr(),
    });
    setEditingAccount(a);
  }

  async function submitEdit(e) {
    e.preventDefault();
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    setErr("");
    try {
      const payload = { name };
      if (editingAccount.type === "debt") {
        payload.interestRate = editDebt.interestRate.trim() === "" ? null : parseFloat(editDebt.interestRate);
        payload.interestRateType = editDebt.interestRate.trim() === "" ? null : editDebt.interestRateType;
        payload.monthlyPayment = editDebt.monthlyPayment.trim() === "" ? null : editDebt.monthlyPayment;
        payload.dueDay = editDebt.dueDay.trim() === "" ? null : parseInt(editDebt.dueDay, 10);
      }
      if (editingAccount.isGoalAccount) {
        payload.targetAmount = editGoal.targetAmount;
        payload.targetDate = editGoal.targetDate;
      }
      await updateAccount(editingAccount.id, payload);
      await refetch();
      setEditingAccount(null);
    } catch (e2) {
      setErr(String(e2 && e2.message ? e2.message : e2));
    } finally {
      setSaving(false);
    }
  }

  async function trashAccount(a) {
    try {
      await updateAccount(a.id, { status: "trashed" });
      await refetch();
    } catch (e2) {
      setErr(String(e2 && e2.message ? e2.message : e2));
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  const assetAccounts = accounts.filter((a) => a.type === "asset" && !a.isGoalAccount && !a.isInvestmentAccount && a.status !== "trashed");
  const debtAccounts = accounts.filter((a) => a.type === "debt" && a.status !== "trashed");
  const goalAccounts = accounts.filter((a) => a.isGoalAccount && a.status !== "trashed");
  const investmentAccounts = accounts.filter((a) => a.isInvestmentAccount && a.status !== "trashed");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: colors.ink }}>สินทรัพย์และหนี้สิน</div>
        <Link to="/trash" style={{ display: "flex", alignItems: "center", gap: 4, color: colors.inkMuted, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
          <Archive size={14} />ถังขยะ
        </Link>
      </div>

      <div style={sectionHead} className="section-head">
        <span>สินทรัพย์</span>
        <button style={textBtn} onClick={() => setShowAdd(true)}>+ เพิ่มบัญชี</button>
      </div>
      <div className="accounts-grid" style={rowWrap}>
        {assetAccounts.map((a) => {
          const reservedCents = reservedByAccount[a.id] || 0;
          const availableCents = a.balanceCents - reservedCents;
          return (
            <div key={a.id} style={accCard}>
              <Link to={`/accounts/${a.id}`} style={{ textDecoration: "none", display: "block" }}>
                <div style={iconChip(colors.primaryTint)}><Wallet size={15} color={colors.primary} /></div>
                <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>{a.name}</div>
                <div className="num" style={{ fontSize: 16, color: colors.ink, fontWeight: 600 }}>{centsToDisplay(a.balanceCents)}</div>
                {reservedCents > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: colors.inkMuted, marginTop: 4 }}>กันไว้จ่าย {centsToDisplay(reservedCents)}</div>
                    <div style={{ fontSize: 11, color: availableCents < 0 ? colors.danger : colors.primary, fontWeight: 600 }}>
                      ใช้ได้จริง {centsToDisplay(availableCents)}
                    </div>
                  </>
                )}
              </Link>
              <div style={cardActions}>
                <button type="button" style={miniIconBtn} onClick={() => openEdit(a)}><Pencil size={12} color={colors.inkMuted} /></button>
                <button type="button" style={miniIconBtn} onClick={() => trashAccount(a)}><Trash2 size={12} color={colors.inkMuted} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {debtAccounts.length > 0 && (
        <>
          <div style={sectionHead} className="section-head"><span>หนี้ผ่อนชำระ</span></div>
          <div className="accounts-grid" style={rowWrap}>
            {debtAccounts.map((a) => (
              <div key={a.id} style={{ ...accCard, borderColor: colors.dangerBorder, background: colors.dangerSoft }}>
                <Link to={`/accounts/${a.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <div style={iconChip(colors.dangerTint)}><CreditCard size={15} color={colors.danger} /></div>
                  <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>{a.name}</div>
                  <div className="num" style={{ fontSize: 16, color: colors.danger, fontWeight: 600 }}>{centsToDisplay(a.balanceCents)}</div>
                  <div style={{ fontSize: 10, color: colors.inkMuted }}>ค้างชำระ</div>
                </Link>
                <div style={cardActions}>
                  <button type="button" style={miniIconBtn} onClick={() => openEdit(a)}><Pencil size={12} color={colors.inkMuted} /></button>
                  <button type="button" style={miniIconBtn} onClick={() => trashAccount(a)}><Trash2 size={12} color={colors.inkMuted} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {goalAccounts.length > 0 && (
        <>
          <div style={sectionHead} className="section-head"><span>เป้าหมายออม</span></div>
          <div className="accounts-grid" style={rowWrap}>
            {goalAccounts.map((a) => {
              const pct = a.targetAmountCents > 0 ? Math.min(100, (a.balanceCents / a.targetAmountCents) * 100) : 0;
              const reached = a.targetAmountCents > 0 && a.balanceCents >= a.targetAmountCents;
              return (
                <div key={a.id} style={{ ...accCard, borderColor: colors.secondaryBorder, background: colors.secondarySoft }}>
                  <Link to={`/accounts/${a.id}`} style={{ textDecoration: "none", display: "block" }}>
                    <div style={iconChip(colors.secondaryTint)}><Target size={15} color={colors.secondary} /></div>
                    <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>{a.name}</div>
                    <div className="num" style={{ fontSize: 16, color: colors.secondary, fontWeight: 600 }}>{centsToDisplay(a.balanceCents)}</div>
                    <div style={{ fontSize: 10, color: colors.inkMuted, marginBottom: 6 }}>
                      {reached ? "🎉 ถึงเป้าหมายแล้ว" : `เป้าหมาย ${centsToDisplay(a.targetAmountCents)} · ${a.targetDate}`}
                    </div>
                    <QuestBar theme={theme} pct={pct} color={colors.secondary} trackColor={colors.divider} />
                  </Link>
                  <div style={cardActions}>
                    <button type="button" style={miniIconBtn} onClick={() => openEdit(a)}><Pencil size={12} color={colors.inkMuted} /></button>
                    <button type="button" style={miniIconBtn} onClick={() => trashAccount(a)}><Trash2 size={12} color={colors.inkMuted} /></button>
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
          <div className="accounts-grid" style={rowWrap}>
            {investmentAccounts.map((a) => (
              <div key={a.id} style={{ ...accCard, borderColor: colors.secondaryBorder, background: colors.secondarySoft }}>
                <Link to={`/accounts/${a.id}`} style={{ textDecoration: "none", display: "block" }}>
                  <div style={iconChip(colors.secondaryTint)}><TrendingUp size={15} color={colors.secondary} /></div>
                  <div style={{ fontSize: 12, color: colors.inkMuted, marginTop: 8 }}>{a.name}</div>
                  <div className="num" style={{ fontSize: 16, color: colors.secondary, fontWeight: 600 }}>{centsToDisplay(a.balanceCents)}</div>
                </Link>
                <div style={cardActions}>
                  <button type="button" style={miniIconBtn} onClick={() => openEdit(a)}><Pencil size={12} color={colors.inkMuted} /></button>
                  <button type="button" style={miniIconBtn} onClick={() => trashAccount(a)}><Trash2 size={12} color={colors.inkMuted} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAdd && (
        <ModalPortal>
        <div style={overlay} onClick={() => setShowAdd(false)}>
          <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={sheetHead}>
              <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>เพิ่มบัญชี</span>
              <button onClick={() => setShowAdd(false)} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
            </div>
            <form onSubmit={submit}>
              <label style={label}>ประเภทบัญชี</label>
              <div style={kindToggle}>
                <button type="button" style={{ ...kindBtn, ...(newAcc.type === "asset" ? kindActiveInc : {}) }}
                  onClick={() => setNewAcc({ ...newAcc, type: "asset" })}>เงินสด / ธนาคาร</button>
                <button type="button" style={{ ...kindBtn, ...(newAcc.type === "debt" ? kindActiveExp : {}) }}
                  onClick={() => setNewAcc({ ...newAcc, type: "debt" })}>หนี้ผ่อนชำระ</button>
                <button type="button" style={{ ...kindBtn, ...(newAcc.type === "goal" ? kindActiveSecondary : {}) }}
                  onClick={() => setNewAcc({ ...newAcc, type: "goal" })}>เป้าหมายออม</button>
                <button type="button" style={{ ...kindBtn, ...(newAcc.type === "investment" ? kindActiveSecondary : {}) }}
                  onClick={() => setNewAcc({ ...newAcc, type: "investment" })}>เงินลงทุน</button>
              </div>
              <label style={label}>ชื่อบัญชี</label>
              <input type="text" required autoFocus value={newAcc.name}
                onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                placeholder={
                  newAcc.type === "debt" ? "เช่น Shopee PayLater"
                  : newAcc.type === "goal" ? "เช่น เที่ยวญี่ปุ่น"
                  : newAcc.type === "investment" ? "เช่น กองทุนหุ้น, หุ้น SET50"
                  : "เช่น SCB, TrueMoney"
                } style={input} />
              {newAcc.type === "goal" && (
                <>
                  <label style={label}>ยอดเป้าหมาย (บาท)</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0" required
                    value={newAcc.targetAmount} onChange={(e) => setNewAcc({ ...newAcc, targetAmount: e.target.value })}
                    placeholder="0.00" style={input} />
                  <label style={label}>วันที่ต้องการให้ถึงเป้าหมาย</label>
                  <input type="date" required value={newAcc.targetDate}
                    onChange={(e) => setNewAcc({ ...newAcc, targetDate: e.target.value })} style={input} />
                </>
              )}
              {err && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 8 }}>{err}</div>}
              <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "เพิ่มบัญชี"}
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {editingAccount && (
        <ModalPortal>
        <div style={overlay} onClick={() => setEditingAccount(null)}>
          <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={sheetHead}>
              <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>แก้ไขบัญชี</span>
              <button onClick={() => setEditingAccount(null)} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
            </div>
            <form onSubmit={submitEdit}>
              <label style={label}>ชื่อบัญชี</label>
              <input type="text" required autoFocus value={editName}
                onChange={(e) => setEditName(e.target.value)} style={input} />

              {editingAccount.type === "debt" && (
                <>
                  <label style={label}>อัตราดอกเบี้ย (%) (ไม่บังคับ)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="number" inputMode="decimal" step="0.01" min="0"
                      value={editDebt.interestRate}
                      onChange={(e) => setEditDebt({ ...editDebt, interestRate: e.target.value })}
                      placeholder="0.00" style={{ ...input, flex: 1 }} />
                    <select value={editDebt.interestRateType}
                      onChange={(e) => setEditDebt({ ...editDebt, interestRateType: e.target.value })}
                      style={{ ...input, flex: 1 }}>
                      <option value="monthly">ต่อเดือน</option>
                      <option value="yearly">ต่อปี</option>
                    </select>
                  </div>
                  <label style={label}>ยอดผ่อนต่อเดือนที่วางแผนไว้ (บาท) (ไม่บังคับ)</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0"
                    value={editDebt.monthlyPayment}
                    onChange={(e) => setEditDebt({ ...editDebt, monthlyPayment: e.target.value })}
                    placeholder="0.00" style={input} />
                  <label style={label}>วันครบกำหนดจ่ายในแต่ละเดือน (1-31) (ไม่บังคับ)</label>
                  <input type="number" step="1" min="1" max="31"
                    value={editDebt.dueDay}
                    onChange={(e) => setEditDebt({ ...editDebt, dueDay: e.target.value })}
                    placeholder="เช่น 5" style={input} />
                </>
              )}

              {editingAccount.isGoalAccount && (
                <>
                  <label style={label}>ยอดเป้าหมาย (บาท)</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0" required
                    value={editGoal.targetAmount}
                    onChange={(e) => setEditGoal({ ...editGoal, targetAmount: e.target.value })}
                    style={input} />
                  <label style={label}>วันที่ต้องการให้ถึงเป้าหมาย</label>
                  <input type="date" required value={editGoal.targetDate}
                    onChange={(e) => setEditGoal({ ...editGoal, targetDate: e.target.value })} style={input} />
                </>
              )}

              {err && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 8 }}>{err}</div>}
              <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
