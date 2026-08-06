import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wallet, CreditCard, Target, TrendingUp, RotateCcw } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { updateAccount, deleteAccountPermanently } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { colors, card, sectionHead, overlay, sheet, sheetHead, label, input, submitBtn } from "../components/sharedStyles.js";
import ModalPortal from "../components/ModalPortal.jsx";

const CONFIRM_TEXT = "ลบถาวร";

const rowStyle = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--color-divider)" };
const restoreBtn = { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-primaryTint)", color: "var(--color-primary)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" };
const permDelBtn = { padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-dangerBorder)", background: "var(--color-dangerSoft)", color: "var(--color-danger)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" };

export default function Trash() {
  const { accounts, loading, refetch } = useReferenceData();
  const [err, setErr] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // account
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  const trashedAccounts = accounts.filter((a) => a.status === "trashed");

  async function restoreAccount(a) {
    setErr("");
    try {
      await updateAccount(a.id, { status: "active" });
      await refetch();
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
    }
  }

  function askPermanentDelete(item) {
    setPendingDelete(item);
    setConfirmText("");
    setErr("");
  }

  async function confirmPermanentDelete() {
    if (!pendingDelete || confirmText !== CONFIRM_TEXT) return;
    setBusy(true);
    setErr("");
    try {
      await deleteAccountPermanently(pendingDelete.id);
      await refetch();
      setPendingDelete(null);
      setConfirmText("");
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Link to="/accounts" style={{ display: "flex" }}><ArrowLeft size={20} color="var(--color-ink)" /></Link>
        <span className="page-title" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)" }}>ถังขยะ</span>
      </div>

      <div style={sectionHead} className="section-head"><span>บัญชี</span></div>
      {trashedAccounts.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "var(--color-inkMuted)", fontSize: 13, marginBottom: 16 }}>
          ไม่มีบัญชีในถังขยะ
        </div>
      ) : (
        <div style={{ ...card, marginBottom: 16 }}>
          {trashedAccounts.map((a) => (
            <div key={a.id} style={rowStyle}>
              {a.isGoalAccount ? <Target size={16} color={colors.secondary} /> : a.isInvestmentAccount ? <TrendingUp size={16} color={colors.secondary} /> : a.type === "debt" ? <CreditCard size={16} color={colors.danger} /> : <Wallet size={16} color={colors.primary} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "var(--color-ink)" }}>{a.name}</div>
                <div className="num" style={{ fontSize: 12, color: "var(--color-inkMuted)" }}>
                  {centsToDisplay(a.balanceCents)}{a.isGoalAccount ? ` / ${centsToDisplay(a.targetAmountCents)}` : ""}
                </div>
              </div>
              <button type="button" style={restoreBtn} onClick={() => restoreAccount(a)}>
                <RotateCcw size={12} style={{ marginRight: 4, verticalAlign: -2 }} />กู้คืน
              </button>
              <button type="button" style={permDelBtn} onClick={() => askPermanentDelete(a)}>ลบถาวร</button>
            </div>
          ))}
        </div>
      )}

      {err && <div style={{ color: "var(--color-danger)", fontSize: 12, textAlign: "center", marginTop: 8 }}>{err}</div>}

      {pendingDelete && (
        <ModalPortal>
        <div style={overlay} onClick={() => !busy && setPendingDelete(null)}>
          <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={sheetHead}>
              <span style={{ fontWeight: 600, color: "var(--color-danger)" }}>ลบถาวร: {pendingDelete.name}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--color-ink)", marginBottom: 12, lineHeight: 1.6 }}>
              การลบถาวรจะลบบัญชีนี้และธุรกรรมทั้งหมดที่ผูกกับบัญชีนี้
              <b> อย่างถาวร กู้คืนไม่ได้</b>
            </div>
            <label style={label}>พิมพ์ "{CONFIRM_TEXT}" เพื่อยืนยัน</label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              style={input}
              autoFocus
              placeholder={CONFIRM_TEXT}
            />
            {err && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 8 }}>{err}</div>}
            <button
              type="button"
              disabled={confirmText !== CONFIRM_TEXT || busy}
              style={{ ...submitBtn, background: "var(--color-danger)", opacity: confirmText !== CONFIRM_TEXT || busy ? 0.5 : 1 }}
              onClick={confirmPermanentDelete}
            >
              {busy ? "กำลังลบ..." : "ลบถาวร"}
            </button>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
