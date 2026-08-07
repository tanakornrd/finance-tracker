import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { fetchTransactions, importTransactions } from "../api.js";
import { parseToCents } from "../../shared/money.js";
import { EXPENSE_CATS, INCOME_CATS } from "../../shared/categories.js";
import { card, sectionHead, label, input, submitBtn, colors } from "../components/sharedStyles.js";
import DateField from "../components/DateField.jsx";

// Best-effort ISO normalization for the two formats Thai bank/app exports actually use.
// Anything else is left blank — the preview step's date input is a real <input type="date">,
// so an unrecognized format just shows up empty and the user fills it in by hand rather than
// silently importing a wrong date.
function normalizeDateGuess(raw) {
  const s = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "";
}

// Statement amounts are sometimes signed (-123.45) or parenthesized ((123.45)) for outgoing
// money — used only as a *default guess* for kind; every row stays editable in the preview.
function guessKindAndAmount(raw) {
  const s = String(raw ?? "").trim().replace(/,/g, "");
  const negative = /^-/.test(s) || /^\(.*\)$/.test(s);
  const cleaned = s.replace(/^-/, "").replace(/[()]/g, "");
  let cents = null;
  try {
    cents = parseToCents(cleaned);
  } catch {
    cents = null;
  }
  return { kind: negative ? "expense" : "income", amountAbs: cleaned, valid: cents != null && cents > 0 };
}

let rowSeq = 0;

export default function ImportStatement() {
  const navigate = useNavigate();
  const { accounts, loading: refLoading } = useReferenceData();
  const activeAccounts = accounts.filter((a) => a.status !== "trashed");

  const [step, setStep] = useState("upload"); // upload -> mapping -> preview
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState(null);
  const [parseErr, setParseErr] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({ date: "", amount: "", note: "" });
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [done, setDone] = useState(null);

  function handleBack() {
    if (step === "preview") return setStep("mapping");
    if (step === "mapping") return setStep("upload");
    navigate(-1);
  }

  function handleFileChange(e) {
    setFile(e.target.files[0] || null);
    setParseErr("");
  }

  function handleParseFile() {
    if (!file) return;
    setParseErr("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^﻿/, "").trim(),
      complete: (results) => {
        if (!results.data.length || !results.meta.fields?.length) {
          setParseErr("อ่านไฟล์ไม่สำเร็จ หรือไฟล์ไม่มีข้อมูล");
          return;
        }
        const fields = results.meta.fields;
        setHeaders(fields);
        setRawRows(results.data);
        const guessCol = (keywords) => fields.find((h) => keywords.some((k) => h.toLowerCase().includes(k)));
        setMapping({
          date: guessCol(["date", "วันที่"]) || fields[0],
          amount: guessCol(["amount", "จำนวน", "เงิน"]) || fields[1] || fields[0],
          note: guessCol(["desc", "detail", "รายละเอียด", "note", "memo"]) || "",
        });
        setStep("mapping");
      },
      error: (err) => setParseErr(err.message || "อ่านไฟล์ไม่สำเร็จ"),
    });
  }

  async function handleConfirmMapping() {
    // Fetched once here (not per row) so duplicate-checking against existing history doesn't
    // hit the API dozens of times for a large statement.
    const existing = await fetchTransactions({ accountId });

    const built = rawRows.map((r) => {
      const dateRaw = r[mapping.date];
      const amountRaw = r[mapping.amount];
      const noteRaw = mapping.note ? r[mapping.note] : "";
      const date = normalizeDateGuess(dateRaw);
      const { kind, amountAbs, valid } = guessKindAndAmount(amountRaw);
      let amountCents = null;
      try {
        amountCents = parseToCents(amountAbs);
      } catch {
        amountCents = null;
      }
      const isDuplicate = !!(date && amountCents && existing.some((t) => t.date === date && t.amountCents === amountCents));
      return {
        _id: `r${rowSeq++}`,
        _rawDate: dateRaw,
        date,
        kind,
        amount: amountAbs,
        category: "",
        note: noteRaw || "",
        include: valid && !!date && !isDuplicate,
        isDuplicate,
      };
    });
    setRows(built);
    setStep("preview");
  }

  function updateRow(id, patch) {
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, ...patch } : r)));
  }

  const includedRows = rows.filter((r) => r.include);
  const invalidIncluded = includedRows.filter((r) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || "")) return true;
    let cents;
    try {
      cents = parseToCents(r.amount);
    } catch {
      return true;
    }
    if (!cents || cents <= 0) return true;
    if (!r.category) return true;
    return false;
  });

  async function handleImport() {
    setSaveErr("");
    if (includedRows.length === 0) {
      setSaveErr("ยังไม่ได้เลือกรายการที่จะนำเข้า");
      return;
    }
    if (invalidIncluded.length > 0) {
      setSaveErr(`มี ${invalidIncluded.length} รายการที่ข้อมูลไม่ครบ (วันที่/จำนวนเงิน/หมวดหมู่) — แก้ไขหรือเอาออกจากที่เลือกก่อน`);
      return;
    }
    setSaving(true);
    try {
      const payload = includedRows.map((r) => ({
        kind: r.kind,
        amount: r.amount,
        accountId,
        date: r.date,
        category: r.category,
        note: r.note,
      }));
      const res = await importTransactions(payload);
      setDone({ saved: res.ids.length, skipped: (res.skipped || []).length });
    } catch (e) {
      setSaveErr(e.message || "นำเข้าไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  if (refLoading) return <div style={{ padding: 40, color: colors.inkMuted }}>กำลังโหลด...</div>;

  if (done != null) {
    return (
      <div>
        <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: colors.ink, marginBottom: 18 }}>นำเข้าสำเร็จ</div>
        <div style={card}>
          <div style={{ textAlign: "center", padding: "20px 0", fontSize: 14, color: colors.ink }}>
            ✅ บันทึกจริง {done.saved} รายการ
            {done.skipped > 0 && (
              <div style={{ marginTop: 6, color: colors.inkMuted, fontSize: 13 }}>
                ⏭️ ข้ามเพราะซ้ำ {done.skipped} รายการ (วันที่และจำนวนเงินตรงกับรายการที่มีอยู่แล้ว)
              </div>
            )}
          </div>
          <button style={submitBtn} onClick={() => navigate("/transactions")}>ไปที่หน้ารายการ</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <button onClick={handleBack} style={{ background: "none", border: "none", padding: 4 }}>
          <ArrowLeft size={20} color={colors.ink} />
        </button>
        <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: colors.ink }}>นำเข้า statement (CSV)</div>
      </div>

      {step === "upload" && (
        <div style={card}>
          <label style={label}>เลือกบัญชีที่จะนำเข้า</label>
          <select style={input} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">-- เลือกบัญชี --</option>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <label style={label}>ไฟล์ CSV</label>
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} style={input} />

          {parseErr && <div style={{ color: colors.danger, fontSize: 12, marginTop: 8 }}>{parseErr}</div>}

          <button
            style={{ ...submitBtn, opacity: !accountId || !file ? 0.5 : 1 }}
            disabled={!accountId || !file}
            onClick={handleParseFile}
          >
            อ่านไฟล์และไปขั้นถัดไป
          </button>
        </div>
      )}

      {step === "mapping" && (
        <div style={card}>
          <div style={{ fontSize: 13, color: colors.inkMuted, marginBottom: 12 }}>
            เลือกว่าคอลัมน์ไหนในไฟล์คือข้อมูลอะไร (ดูตัวอย่างแถวด้านล่างประกอบ)
          </div>

          <label style={label}>คอลัมน์วันที่</label>
          <select style={input} value={mapping.date} onChange={(e) => setMapping({ ...mapping, date: e.target.value })}>
            {headers.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>

          <label style={label}>คอลัมน์จำนวนเงิน</label>
          <select style={input} value={mapping.amount} onChange={(e) => setMapping({ ...mapping, amount: e.target.value })}>
            {headers.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>

          <label style={label}>คอลัมน์รายละเอียด/โน้ต (ไม่บังคับ)</label>
          <select style={input} value={mapping.note} onChange={(e) => setMapping({ ...mapping, note: e.target.value })}>
            <option value="">-- ไม่ใช้ --</option>
            {headers.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>

          <div style={{ marginTop: 14, fontSize: 12, color: colors.inkMuted }}>ตัวอย่างข้อมูล 3 แถวแรก:</div>
          <div style={{ overflowX: "auto", marginTop: 6 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
              <thead>
                <tr>{headers.map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 3).map((r, i) => (
                  <tr key={i}>{headers.map((h) => <td key={h} style={styles.td}>{String(r[h] ?? "")}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <button style={submitBtn} onClick={handleConfirmMapping}>ดูตัวอย่างรายการ</button>
        </div>
      )}

      {step === "preview" && (
        <>
          <div style={sectionHead} className="section-head">
            <span>ตรวจสอบก่อนบันทึก</span>
            <span style={{ color: colors.inkMuted, fontSize: 12 }}>เลือกแล้ว {includedRows.length}/{rows.length}</span>
          </div>

          {rows.some((r) => r.isDuplicate) && (
            <div style={styles.warnBanner}>
              <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
              พบ {rows.filter((r) => r.isDuplicate).length} รายการที่วันที่+จำนวนเงินตรงกับที่มีอยู่แล้วในบัญชีนี้ — ระบบไม่ติ๊กให้อัตโนมัติ
              ถ้าต้องการนำเข้าซ้ำจริงๆ ให้ติ๊กเลือกเอง
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r) => {
              const cats = r.kind === "expense" ? EXPENSE_CATS : INCOME_CATS;
              return (
                <div key={r._id} style={{ ...card, ...(r.isDuplicate ? styles.dupCard : {}), opacity: r.include ? 1 : 0.55 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <input type="checkbox" checked={r.include} onChange={(e) => updateRow(r._id, { include: e.target.checked })} />
                    <div style={{ flex: 1, fontSize: 11, color: colors.inkMuted }}>{r._rawDate} · {r.note || "-"}</div>
                    {r.isDuplicate && <span style={styles.dupTag}>อาจซ้ำ</span>}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <button
                      type="button"
                      style={{ ...styles.miniKindBtn, ...(r.kind === "expense" ? styles.miniKindActiveExp : {}) }}
                      onClick={() => updateRow(r._id, { kind: "expense", category: "" })}
                    >
                      รายจ่าย
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.miniKindBtn, ...(r.kind === "income" ? styles.miniKindActiveInc : {}) }}
                      onClick={() => updateRow(r._id, { kind: "income", category: "" })}
                    >
                      รายรับ
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ ...label, margin: "0 0 4px" }}>วันที่</label>
                      <DateField value={r.date} onChange={(e) => updateRow(r._id, { date: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ ...label, margin: "0 0 4px" }}>จำนวนเงิน (บาท)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        style={input}
                        value={r.amount}
                        onChange={(e) => updateRow(r._id, { amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <label style={{ ...label, margin: "8px 0 4px" }}>หมวดหมู่</label>
                  <select style={input} value={r.category} onChange={(e) => updateRow(r._id, { category: e.target.value })}>
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {cats.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>

                  <label style={{ ...label, margin: "8px 0 4px" }}>โน้ต</label>
                  <input type="text" style={input} value={r.note} onChange={(e) => updateRow(r._id, { note: e.target.value })} />
                </div>
              );
            })}
          </div>

          {saveErr && <div style={{ color: colors.danger, fontSize: 12, textAlign: "center", marginTop: 12 }}>{saveErr}</div>}

          <button style={{ ...submitBtn, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleImport}>
            {saving ? "กำลังบันทึก..." : `ยืนยันนำเข้า ${includedRows.length} รายการ`}
          </button>
          <div style={{ height: 40 }} />
        </>
      )}
    </div>
  );
}

const styles = {
  th: { textAlign: "left", padding: "4px 8px", borderBottom: `1px solid ${colors.border}`, color: colors.inkMuted, whiteSpace: "nowrap" },
  td: { padding: "4px 8px", borderBottom: `1px solid ${colors.divider}`, color: colors.ink, whiteSpace: "nowrap" },
  warnBanner: { background: colors.accentTint, border: `1px solid ${colors.accentBorder}`, color: colors.accentInk, borderRadius: 10, padding: "10px 12px", fontSize: 12, marginBottom: 12 },
  dupCard: { borderColor: colors.accentBorder, background: colors.accentTint },
  dupTag: { fontSize: 10, fontWeight: 700, color: colors.accentInk, background: colors.white, border: `1px solid ${colors.accentBorder}`, borderRadius: 8, padding: "2px 6px" },
  miniKindBtn: { flex: 1, padding: "6px 4px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.primarySoft, color: colors.inkMuted, fontSize: 11, fontWeight: 600 },
  miniKindActiveExp: { background: colors.dangerTint, color: colors.danger, borderColor: colors.danger },
  miniKindActiveInc: { background: colors.primaryTint, color: colors.primary, borderColor: colors.primary },
};
