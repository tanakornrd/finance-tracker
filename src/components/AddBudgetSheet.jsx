import React, { useState } from "react";
import { X } from "lucide-react";
import { createBudget } from "../api.js";
import { EXPENSE_CATS } from "../../shared/categories.js";
import { overlay, sheet, sheetHead, iconBtn, label, input, submitBtn } from "./sharedStyles.js";

// Controlled — used by both SafeToSpendCard (Dashboard quick-add) and the full Budgets page.
export default function AddBudgetSheet({ open, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ category: EXPENSE_CATS[0].name, monthlyLimit: "" });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await createBudget(form);
      setForm({ category: EXPENSE_CATS[0].name, monthlyLimit: "" });
      await onSaved();
    } catch (e2) {
      setErr(String(e2 && e2.message ? e2.message : e2));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={sheetHead}>
          <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>ตั้งงบประมาณ</span>
          <button onClick={onClose} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
        </div>
        <form onSubmit={submit}>
          <label style={label}>หมวดหมู่</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
            {EXPENSE_CATS.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
          </select>
          <label style={label}>วงเงินต่อเดือน (บาท)</label>
          <input type="number" inputMode="decimal" step="0.01" min="0" required autoFocus
            value={form.monthlyLimit} onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })}
            placeholder="0.00" style={input} />
          {err && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 8 }}>{err}</div>}
          <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? "กำลังบันทึก..." : "บันทึกงบประมาณ"}
          </button>
        </form>
      </div>
    </div>
  );
}
