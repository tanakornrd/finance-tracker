import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, X, ChevronLeft, ChevronRight, Wallet, CreditCard, ArrowRightLeft } from "lucide-react";

const STORAGE_KEY = "money-ledger:v2";

const EXPENSE_CATS = [
  { name: "ช้อปปิ้ง", icon: "🛍️" },
  { name: "อาหาร", icon: "🍔" },
  { name: "เดินทาง", icon: "🚗" },
  { name: "ที่พัก/บิล", icon: "💡" },
  { name: "สุขภาพ", icon: "💊" },
  { name: "บันเทิง", icon: "🎬" },
  { name: "การศึกษา", icon: "📚" },
  { name: "อื่นๆ", icon: "📦" },
];
const INCOME_CATS = [
  { name: "เงินเดือน", icon: "💼" },
  { name: "ฟรีแลนซ์", icon: "💻" },
  { name: "ของขวัญ", icon: "🎁" },
  { name: "อื่นๆ", icon: "📦" },
];
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function fmt(n) {
  const sign = n < 0 ? "-" : "";
  return sign + "฿" + Math.abs(Math.round(n)).toLocaleString("en-US");
}
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function FinanceLedger() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const [errDetail, setErrDetail] = useState("");
  const [storageStatus, setStorageStatus] = useState("checking");
  const [accounts, setAccounts] = useState([{ id: "cash", name: "เงินสด", type: "asset", balance: 0 }]);
  const [transactions, setTransactions] = useState([]);
  const [cursor, setCursor] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

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

  useEffect(() => {
    (async () => {
      // Step 1: load any existing data
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed.accounts) setAccounts(parsed.accounts);
          if (parsed.transactions) setTransactions(parsed.transactions);
        }
      } catch (e) {
        // first time opening — no saved data yet, that's fine
      } finally {
        setLoading(false);
      }

      // Step 2: round-trip self-test so we can see a real error instead of guessing
      try {
        const testVal = "ok-" + Date.now();
        const setRes = await window.storage.set(STORAGE_KEY + ":selftest", testVal, false);
        if (!setRes) throw new Error("storage.set returned null/false");
        const getRes = await window.storage.get(STORAGE_KEY + ":selftest", false);
        if (!getRes || getRes.value !== testVal) throw new Error("readback mismatch: " + JSON.stringify(getRes));
        setStorageStatus("ok");
      } catch (e) {
        setStorageStatus("fail");
        setErrDetail(String(e && e.message ? e.message : e));
      }
    })();
  }, []);

  async function persist(nextAccounts, nextTransactions) {
    setAccounts(nextAccounts);
    setTransactions(nextTransactions);
    setSaving(true);
    try {
      const result = await window.storage.set(
        STORAGE_KEY,
        JSON.stringify({ accounts: nextAccounts, transactions: nextTransactions }),
        false
      );
      setSaveErr(!result);
      if (!result) setErrDetail("storage.set returned null/false");
      return !!result;
    } catch (e) {
      setSaveErr(true);
      setErrDetail(String(e && e.message ? e.message : e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  const mKey = monthKey(cursor);
  const monthTx = useMemo(
    () => transactions.filter((t) => t.date.slice(0, 7) === mKey).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions, mKey]
  );
  const income = monthTx.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const repaid = monthTx.filter((t) => t.kind === "repay").reduce((s, t) => s + t.amount, 0);

  const assetAccounts = accounts.filter((a) => a.type === "asset");
  const debtAccounts = accounts.filter((a) => a.type === "debt");
  const totalAssets = assetAccounts.reduce((s, a) => s + a.balance, 0);
  const totalDebt = debtAccounts.reduce((s, a) => s + a.balance, 0);
  const netWorth = totalAssets - totalDebt;

  const catTotals = useMemo(() => {
    const m = {};
    monthTx.filter((t) => t.kind === "expense").forEach((t) => { m[t.category] = (m[t.category] || 0) + t.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);
  const maxCat = catTotals.length ? catTotals[0][1] : 1;

  async function submitTx(e) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) return;

    let nextAccounts = accounts;
    let tx;

    if (form.kind === "repay") {
      if (!form.toAccountId) return;
      tx = { id: Date.now().toString(), kind: "repay", amount: amt, accountId: form.accountId, toAccountId: form.toAccountId, date: form.date, note: form.note.trim() };
      nextAccounts = accounts.map((a) => {
        if (a.id === form.accountId) return { ...a, balance: a.balance - amt };
        if (a.id === form.toAccountId) return { ...a, balance: a.balance - amt };
        return a;
      });
    } else {
      tx = { id: Date.now().toString(), kind: form.kind, amount: amt, category: form.category, accountId: form.accountId, date: form.date, note: form.note.trim() };
      nextAccounts = accounts.map((a) =>
        a.id === form.accountId ? { ...a, balance: a.balance + (form.kind === "income" ? amt : -amt) } : a
      );
    }

    const ok = await persist(nextAccounts, [tx, ...transactions]);
    if (ok) {
      setForm({ ...form, amount: "", note: "" });
      setShowForm(false);
    }
  }

  async function deleteTx(tx) {
    let nextAccounts = accounts;
    if (tx.kind === "repay") {
      nextAccounts = accounts.map((a) => {
        if (a.id === tx.accountId) return { ...a, balance: a.balance + tx.amount };
        if (a.id === tx.toAccountId) return { ...a, balance: a.balance + tx.amount };
        return a;
      });
    } else {
      nextAccounts = accounts.map((a) =>
        a.id === tx.accountId ? { ...a, balance: a.balance - (tx.kind === "income" ? tx.amount : -tx.amount) } : a
      );
    }
    await persist(nextAccounts, transactions.filter((t) => t.id !== tx.id));
  }

  async function addAccount(e) {
    e.preventDefault();
    const name = newAcc.name.trim();
    if (!name) return;
    const id = "acc-" + Date.now();
    const ok = await persist([...accounts, { id, name, type: newAcc.type, balance: 0 }], transactions);
    if (ok) {
      setNewAcc({ name: "", type: "asset" });
      setShowAddAccount(false);
    }
  }

  const cats = form.kind === "expense" ? EXPENSE_CATS : INCOME_CATS;
  const expenseTargetAccounts = form.kind === "expense" ? accounts : assetAccounts;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; font-family: 'IBM Plex Sans Thai', sans-serif; }
        .num { font-family: 'Fraunces', serif; }
        .fade { animation: fadeUp .35s ease both; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform:none;} }
        .sheet { animation: slideUp .28s cubic-bezier(.22,1,.36,1) both; }
        @keyframes slideUp { from { transform: translateY(100%);} to { transform: translateY(0);} }
        button { cursor: pointer; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #C7D6EE; border-radius: 4px; }
        input:focus, select:focus { outline: 2px solid #1D4ED8; outline-offset: 1px; }
      `}</style>

      {loading ? (
        <div style={{ padding: 40, color: "#5B6B8C" }}>กำลังโหลด...</div>
      ) : (
        <div style={styles.container} className="fade">
          {storageStatus === "fail" && (
            <div style={styles.diagBanner}>
              ⚠️ ระบบบันทึกข้อมูลมีปัญหา: {errDetail || "ไม่ทราบสาเหตุ"}
              <div style={{ fontSize: 11, marginTop: 4, color: "#8A5A00" }}>
                ข้อมูลจะยังใช้งานได้ในหน้าจอนี้ แต่อาจไม่ถูกบันทึกไว้ข้ามเซสชัน — ส่งข้อความนี้กลับไปให้ผู้ช่วยได้เลยครับ
              </div>
            </div>
          )}
          <div style={styles.header}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: 2, color: "#5B6B8C", marginBottom: 2 }}>สมุดบัญชีของฉัน</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#0F2A5C" }}>บันทึกรายรับ-รายจ่าย</div>
            </div>
            <div style={styles.monthBadge}>
              <div style={{ fontSize: 10, color: "#FFFFFF", fontWeight: 700 }}>{cursor.getFullYear() + 543}</div>
              <div style={{ fontSize: 15, color: "#FFFFFF", fontWeight: 700 }}>{THAI_MONTHS[cursor.getMonth()]}</div>
            </div>
          </div>

          <div style={styles.monthNav}>
            <button style={styles.navBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
              <ChevronLeft size={16} color="#5B6B8C" />
            </button>
            <span style={{ color: "#5B6B8C", fontSize: 13 }}>{THAI_MONTHS[cursor.getMonth()]} {cursor.getFullYear() + 543}</span>
            <button style={styles.navBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
              <ChevronRight size={16} color="#5B6B8C" />
            </button>
          </div>

          <div style={styles.passbook}>
            <div style={styles.perforation} />
            <div style={{ padding: "20px 22px" }}>
              <div style={{ fontSize: 12, color: "#5B6B8C", marginBottom: 4 }}>ความมั่งคั่งสุทธิ (สินทรัพย์ − หนี้สิน)</div>
              <div className="num" style={{ fontSize: 34, fontWeight: 600, color: "#0F2A5C", marginBottom: 4 }}>{fmt(netWorth)}</div>
              <div style={{ fontSize: 12, color: "#5B6B8C", marginBottom: 16 }}>
                สินทรัพย์ {fmt(totalAssets)} · หนี้สิน {fmt(totalDebt)}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#5B6B8C" }}>รายรับเดือนนี้</div>
                  <div className="num" style={{ fontSize: 17, color: "#1D4ED8", fontWeight: 600 }}>+{fmt(income)}</div>
                </div>
                <div style={{ width: 1, background: "#DDE7F7" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#5B6B8C" }}>รายจ่ายเดือนนี้</div>
                  <div className="num" style={{ fontSize: 17, color: "#DC3D32", fontWeight: 600 }}>-{fmt(expense)}</div>
                </div>
                <div style={{ width: 1, background: "#DDE7F7" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#5B6B8C" }}>ชำระหนี้เดือนนี้</div>
                  <div className="num" style={{ fontSize: 17, color: "#0F2A5C", fontWeight: 600 }}>{fmt(repaid)}</div>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.sectionHead}>
            <span>สินทรัพย์</span>
            <button style={styles.textBtn} onClick={() => setShowAddAccount(true)}>+ เพิ่มบัญชี</button>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, marginBottom: 4 }}>
            {assetAccounts.map((a) => (
              <div key={a.id} style={styles.accCard}>
                <Wallet size={14} color="#1D4ED8" />
                <div style={{ fontSize: 12, color: "#5B6B8C", marginTop: 6 }}>{a.name}</div>
                <div className="num" style={{ fontSize: 16, color: "#0F2A5C", fontWeight: 600 }}>{fmt(a.balance)}</div>
              </div>
            ))}
          </div>

          {debtAccounts.length > 0 && (
            <>
              <div style={styles.sectionHead}><span>หนี้ผ่อนชำระ</span></div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {debtAccounts.map((a) => (
                  <div key={a.id} style={{ ...styles.accCard, borderColor: "#F3C6C0", background: "#FFF5F4" }}>
                    <CreditCard size={14} color="#DC3D32" />
                    <div style={{ fontSize: 12, color: "#5B6B8C", marginTop: 6 }}>{a.name}</div>
                    <div className="num" style={{ fontSize: 16, color: "#DC3D32", fontWeight: 600 }}>{fmt(a.balance)}</div>
                    <div style={{ fontSize: 10, color: "#5B6B8C" }}>ค้างชำระ</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {catTotals.length > 0 && (
            <>
              <div style={styles.sectionHead}><span>รายจ่ายตามหมวดหมู่</span></div>
              <div style={styles.card}>
                {catTotals.map(([cat, amt]) => {
                  const icon = EXPENSE_CATS.find((c) => c.name === cat)?.icon || "📦";
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: "#0F2A5C" }}>{icon} {cat}</span>
                        <span className="num" style={{ color: "#DC3D32" }}>{fmt(amt)}</span>
                      </div>
                      <div style={{ height: 5, background: "#EEF3FB", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(amt / maxCat) * 100}%`, background: "#DC3D32", borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={styles.sectionHead}>
            <span>รายการเดือนนี้</span>
            <span style={{ color: "#5B6B8C", fontSize: 12 }}>{monthTx.length} รายการ</span>
          </div>
          <div style={styles.card}>
            {monthTx.length === 0 ? (
              <div style={{ textAlign: "center", color: "#5B6B8C", fontSize: 13, padding: "20px 0" }}>
                ยังไม่มีรายการในเดือนนี้ — กด + เพื่อเริ่มบันทึก
              </div>
            ) : (
              monthTx.map((t) => {
                const isRepay = t.kind === "repay";
                const cat = !isRepay ? (t.kind === "expense" ? EXPENSE_CATS : INCOME_CATS).find((c) => c.name === t.category) : null;
                const acc = accounts.find((a) => a.id === t.accountId);
                const toAcc = isRepay ? accounts.find((a) => a.id === t.toAccountId) : null;
                return (
                  <div key={t.id} style={styles.txRow}>
                    <div style={styles.txIcon}>{isRepay ? "🔁" : (cat?.icon || "📦")}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "#0F2A5C" }}>{isRepay ? `ชำระ ${toAcc?.name || ""}` : t.category}</div>
                      <div style={{ fontSize: 11, color: "#5B6B8C" }}>
                        {t.date} · {isRepay ? `จาก ${acc?.name || "-"}` : acc?.name || "-"}
                        {t.note ? ` · ${t.note}` : ""}
                      </div>
                    </div>
                    <div className="num" style={{ fontSize: 14, fontWeight: 600, color: isRepay ? "#0F2A5C" : t.kind === "income" ? "#1D4ED8" : "#DC3D32" }}>
                      {isRepay ? "" : t.kind === "income" ? "+" : "-"}{fmt(t.amount)}
                    </div>
                    <button style={styles.delBtn} onClick={() => deleteTx(t)}><Trash2 size={14} color="#5B6B8C" /></button>
                  </div>
                );
              })
            )}
          </div>

          {saveErr && <div style={{ color: "#DC3D32", fontSize: 12, textAlign: "center", marginTop: 8 }}>บันทึกไม่สำเร็จ ลองอีกครั้ง</div>}
          <div style={{ height: 90 }} />
        </div>
      )}

      {!loading && (
        <button style={styles.fab} onClick={() => setShowForm(true)}>
          <Plus size={24} color="#FFFFFF" />
        </button>
      )}

      {showForm && (
        <div style={styles.overlay} onClick={() => setShowForm(false)}>
          <div style={styles.sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHead}>
              <span style={{ fontWeight: 600, color: "#0F2A5C" }}>เพิ่มรายการ</span>
              <button onClick={() => setShowForm(false)} style={styles.iconBtn}><X size={18} color="#5B6B8C" /></button>
            </div>
            <div style={styles.kindToggle}>
              <button style={{ ...styles.kindBtn, ...(form.kind === "expense" ? styles.kindActiveExp : {}) }}
                onClick={() => setForm({ ...form, kind: "expense", category: EXPENSE_CATS[0].name })}>รายจ่าย</button>
              <button style={{ ...styles.kindBtn, ...(form.kind === "income" ? styles.kindActiveInc : {}) }}
                onClick={() => setForm({ ...form, kind: "income", category: INCOME_CATS[0].name, accountId: assetAccounts[0]?.id || "cash" })}>รายรับ</button>
              {debtAccounts.length > 0 && (
                <button style={{ ...styles.kindBtn, ...(form.kind === "repay" ? styles.kindActiveRepay : {}) }}
                  onClick={() => setForm({ ...form, kind: "repay", accountId: assetAccounts[0]?.id || "cash", toAccountId: debtAccounts[0].id })}>
                  <ArrowRightLeft size={12} style={{ marginRight: 4, verticalAlign: -1 }} />ชำระหนี้
                </button>
              )}
            </div>
            <form onSubmit={submitTx}>
              <label style={styles.label}>จำนวนเงิน (บาท)</label>
              <input type="number" inputMode="decimal" step="0.01" min="0" required autoFocus
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0" style={styles.input} />

              {form.kind !== "repay" && (
                <>
                  <label style={styles.label}>หมวดหมู่</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={styles.input}>
                    {cats.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                  <label style={styles.label}>{form.kind === "expense" ? "จ่ายจากบัญชี / บัตร" : "เข้าบัญชี"}</label>
                  <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} style={styles.input}>
                    {expenseTargetAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.type === "debt" ? " (ผ่อนชำระ)" : ""}</option>)}
                  </select>
                </>
              )}

              {form.kind === "repay" && (
                <>
                  <label style={styles.label}>จ่ายจากบัญชี</label>
                  <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} style={styles.input}>
                    {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <label style={styles.label}>ไปชำระหนี้บัญชี</label>
                  <select value={form.toAccountId} onChange={(e) => setForm({ ...form, toAccountId: e.target.value })} style={styles.input}>
                    {debtAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </>
              )}

              <label style={styles.label}>วันที่</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={styles.input} />
              <label style={styles.label}>บันทึกเพิ่มเติม (ไม่บังคับ)</label>
              <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="เช่น ซื้อของที่ 7-11" style={styles.input} />
              <button type="submit" disabled={saving} style={{ ...styles.submitBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "บันทึกรายการ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showAddAccount && (
        <div style={styles.overlay} onClick={() => setShowAddAccount(false)}>
          <div style={styles.sheet} className="sheet" onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHead}>
              <span style={{ fontWeight: 600, color: "#0F2A5C" }}>เพิ่มบัญชี</span>
              <button onClick={() => setShowAddAccount(false)} style={styles.iconBtn}><X size={18} color="#5B6B8C" /></button>
            </div>
            <form onSubmit={addAccount}>
              <label style={styles.label}>ประเภทบัญชี</label>
              <div style={styles.kindToggle}>
                <button type="button" style={{ ...styles.kindBtn, ...(newAcc.type === "asset" ? styles.kindActiveInc : {}) }}
                  onClick={() => setNewAcc({ ...newAcc, type: "asset" })}>เงินสด / ธนาคาร</button>
                <button type="button" style={{ ...styles.kindBtn, ...(newAcc.type === "debt" ? styles.kindActiveExp : {}) }}
                  onClick={() => setNewAcc({ ...newAcc, type: "debt" })}>หนี้ผ่อนชำระ (เช่น PayLater)</button>
              </div>
              <label style={styles.label}>ชื่อบัญชี</label>
              <input type="text" required autoFocus value={newAcc.name}
                onChange={(e) => setNewAcc({ ...newAcc, name: e.target.value })}
                placeholder={newAcc.type === "debt" ? "เช่น Shopee PayLater" : "เช่น SCB, TrueMoney"} style={styles.input} />
              <button type="submit" disabled={saving} style={{ ...styles.submitBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "เพิ่มบัญชี"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#F3F7FD", display: "flex", justifyContent: "center", position: "relative" },
  container: { width: "100%", maxWidth: 480, padding: "24px 18px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  diagBanner: { background: "#FFF7E0", border: "1px solid #F0D584", color: "#8A5A00", fontSize: 12, borderRadius: 10, padding: "10px 12px", marginBottom: 14 },
  monthBadge: {
    width: 52, height: 52, borderRadius: "50%", background: "#1D4ED8",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 0 3px #F3F7FD, 0 0 0 4px #C7D6EE",
  },
  monthNav: { display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 16 },
  navBtn: { background: "none", border: "none", padding: 6 },
  passbook: { background: "#FFFFFF", borderRadius: 14, marginBottom: 22, position: "relative", overflow: "hidden", border: "1px solid #DDE7F7", boxShadow: "0 2px 10px rgba(15,42,92,0.06)" },
  perforation: { height: 6, width: "100%", backgroundImage: "radial-gradient(circle, #F3F7FD 2.5px, transparent 2.6px)", backgroundSize: "14px 6px", backgroundPosition: "top", background2: "#1D4ED8" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", color: "#0F2A5C", fontSize: 14, fontWeight: 600, margin: "18px 2px 10px" },
  textBtn: { background: "none", border: "none", color: "#1D4ED8", fontSize: 12, fontWeight: 600 },
  accCard: { background: "#FFFFFF", border: "1px solid #DDE7F7", borderRadius: 12, padding: "12px 16px", minWidth: 110, flexShrink: 0 },
  card: { background: "#FFFFFF", border: "1px solid #DDE7F7", borderRadius: 14, padding: 16 },
  txRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #EEF3FB" },
  txIcon: { width: 34, height: 34, borderRadius: 10, background: "#EEF3FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 },
  delBtn: { background: "none", border: "none", padding: 4 },
  fab: {
    position: "fixed", bottom: 24, right: "50%", transform: "translateX(calc(240px - 60px))",
    width: 52, height: 52, borderRadius: "50%", background: "#1D4ED8", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(29,78,216,0.35)",
  },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,42,92,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 },
  sheet: { width: "100%", maxWidth: 480, background: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, border: "1px solid #DDE7F7", borderBottom: "none", padding: "20px 20px 28px", maxHeight: "85vh", overflowY: "auto" },
  sheetHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  iconBtn: { background: "none", border: "none", padding: 4 },
  kindToggle: { display: "flex", gap: 8, marginBottom: 16 },
  kindBtn: { flex: 1, padding: "10px 4px", borderRadius: 10, border: "1px solid #DDE7F7", background: "#F3F7FD", color: "#5B6B8C", fontSize: 12, fontWeight: 600 },
  kindActiveExp: { background: "#FFF0EE", color: "#DC3D32", borderColor: "#DC3D32" },
  kindActiveInc: { background: "#EAF1FF", color: "#1D4ED8", borderColor: "#1D4ED8" },
  kindActiveRepay: { background: "#EEF3FB", color: "#0F2A5C", borderColor: "#0F2A5C" },
  label: { display: "block", fontSize: 12, color: "#5B6B8C", margin: "12px 0 6px" },
  input: { width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid #DDE7F7", background: "#F9FBFE", color: "#0F2A5C", fontSize: 14 },
  submitBtn: { width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 10, border: "none", background: "#1D4ED8", color: "#FFFFFF", fontWeight: 700, fontSize: 14 },
};
