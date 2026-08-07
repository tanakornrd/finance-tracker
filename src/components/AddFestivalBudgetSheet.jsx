import React, { useState } from "react";
import { X } from "lucide-react";
import { createBudget } from "../api.js";
import { FESTIVALS } from "../../shared/festivals.js";
import { overlay, sheet, sheetHead, iconBtn, label, input, dateInput, submitBtn } from "./sharedStyles.js";
import ModalPortal from "./ModalPortal.jsx";

// "งบเทศกาล" (ชุด 4.1) — same upsert-by-category flow as AddBudgetSheet.jsx, just POSTing
// festivalStartDate/festivalEndDate alongside a festival slug (instead of a real category name)
// as `category` — see server/routes/budgets.js's own comment for why that's the same column,
// not a new one. createBudget() itself needed zero changes (it's a plain passthrough).
export default function AddFestivalBudgetSheet({ open, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ slug: FESTIVALS[0].slug, startDate: "", endDate: "", amount: "" });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await createBudget({
        category: form.slug,
        monthlyLimit: form.amount,
        festivalStartDate: form.startDate,
        festivalEndDate: form.endDate,
      });
      setForm({ slug: FESTIVALS[0].slug, startDate: "", endDate: "", amount: "" });
      await onSaved();
    } catch (e2) {
      setErr(String(e2 && e2.message ? e2.message : e2));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <ModalPortal>
      <div style={overlay} onClick={onClose}>
        <div style={sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
          <div style={sheetHead}>
            <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>ตั้งงบเทศกาล</span>
            <button onClick={onClose} style={iconBtn}><X size={18} color="var(--color-inkMuted)" /></button>
          </div>
          <form onSubmit={submit}>
            <label style={label}>เลือกเทศกาล</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FESTIVALS.map((f) => (
                <button
                  type="button"
                  key={f.slug}
                  onClick={() => setForm({ ...form, slug: f.slug })}
                  style={{
                    padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: `1px solid ${form.slug === f.slug ? "var(--color-primary)" : "var(--color-border)"}`,
                    background: form.slug === f.slug ? "var(--color-primaryTint)" : "var(--color-primarySoft)",
                    color: form.slug === f.slug ? "var(--color-primary)" : "var(--color-inkMuted)",
                  }}
                >
                  {f.icon} {f.name}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>วันที่เริ่ม</label>
                <input type="date" required value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={dateInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>วันที่สิ้นสุด</label>
                <input type="date" required value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })} style={dateInput} />
              </div>
            </div>

            <label style={label}>งบที่ตั้ง (บาท)</label>
            <input type="number" inputMode="decimal" step="0.01" min="0" required
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00" style={input} />

            {err && <div style={{ color: "var(--color-danger)", fontSize: 12, marginTop: 8 }}>{err}</div>}
            <button type="submit" disabled={saving} style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }}>
              {saving ? "กำลังบันทึก..." : "บันทึกงบเทศกาล"}
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
