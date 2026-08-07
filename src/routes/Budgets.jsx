import React, { useEffect, useMemo, useState } from "react";
import { Trash2, PieChart } from "lucide-react";
import { useReferenceData } from "../context/ReferenceDataContext.jsx";
import { deleteBudget, fetchTransactions, updateSettings } from "../api.js";
import { centsToDisplay } from "../../shared/money.js";
import { toISODate, parseISODate, THAI_MONTHS } from "../../shared/dates.js";
import { EXPENSE_CATS } from "../../shared/categories.js";
import { FESTIVALS, festivalBySlug } from "../../shared/festivals.js";
import { card, sectionHead, textBtn } from "../components/sharedStyles.js";
import AddBudgetSheet from "../components/AddBudgetSheet.jsx";
import AddFestivalBudgetSheet from "../components/AddFestivalBudgetSheet.jsx";
import BudgetMageCard from "../components/BudgetMageCard.jsx";
import MageSpellOverlay from "../components/mascot/MageSpellOverlay.jsx";
import SlimeScanModal from "../components/SlimeScanModal.jsx";
import SlimeEnemy from "../components/mascot/SlimeEnemy.jsx";
import { resolveMonthTransition, computeSlimeRatio, computeCategorySlimeRatios } from "../lib/slimeStatus.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { CategoryIcon } from "../theme/arcadeIcons.jsx";
import { HpBar } from "../theme/rpgBars.jsx";

const ctaBtn = { padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--color-primary)", color: "var(--color-white)", fontWeight: 700, fontSize: 13 };

const COLOR_NORMAL = "var(--color-primary)";
const COLOR_WARN = "var(--color-accent)";
const COLOR_OVER = "var(--color-danger)";

function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

// "13 เม.ย." — compact, no year, for the festival budget row's date-range label (its own card
// already gives the festival name/icon; the year would just be visual noise there). Uses
// parseISODate (local-time split), not `new Date(str)`, same reasoning as every other date-only
// string in this app — see shared/dates.js's own comment on why.
function toShortThaiDate(isoDateStr) {
  const d = parseISODate(isoDateStr);
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]}`;
}

export default function Budgets() {
  const { theme, mascotAnimationEnabled } = useTheme();
  const { budgets, loading: refLoading, refetch, settings } = useReferenceData();
  // `budgets` (from context) mixes two kinds of row now (2026-08-08, ชุด 4.1) — see
  // server/routes/budgets.js's own comment on how a festival row differs. Split once here so
  // every existing category-budget computation below (slime ratios, the progress list, the
  // month-transition check) keeps seeing exactly what it always saw — none of that code needed
  // to change, it just reads categoryBudgets instead of the raw mixed list.
  const categoryBudgets = useMemo(() => budgets.filter((b) => !b.festivalStartDate), [budgets]);
  const festivalBudgets = useMemo(() => budgets.filter((b) => b.festivalStartDate), [budgets]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddFestival, setShowAddFestival] = useState(false);
  const [showScan, setShowScan] = useState(false);
  // Spent-per-festival (2026-08-08, ชุด 4.1) — a festival budget covers ALL spending in its own
  // date range, not one category, so it needs its own fetch per row (fetchTransactions({from,
  // to}) already returns every kind/category in range — this just sums the expense ones), not
  // the monthTx/spentByCategory this page already loads for the CURRENT calendar month (a
  // festival's date range has nothing to do with month boundaries — สงกรานต์ spans April 13-15
  // regardless of which "month" the budget page is showing). { [budgetId]: spentCents }.
  const [festivalSpent, setFestivalSpent] = useState({});
  // MageSpellOverlay trigger — only this page's own "ตั้งงบประมาณ" form (below), not the
  // quick-add version embedded in SafeToSpendCard on Dashboard.jsx, per the RPG interactions
  // follow-up request scoping this to the Budgets page specifically. Two DIFFERENT reactions to
  // the same save event, not one feature with a stripped-down fallback: showSpell is the full
  // animated overlay (mascotAnimationEnabled on); mageFiring is a brief, motion-free "บันทึกไว้
  // แล้วนะ!" bubble on the small inline mage in BudgetMageCard (toggle off / reduced motion) —
  // only ever one of the two fires per save, see onSaved below.
  const [showSpell, setShowSpell] = useState(false);
  const [mageFiring, setMageFiring] = useState(false);
  const [err, setErr] = useState("");
  const [monthTx, setMonthTx] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [slimeJustDefeated, setSlimeJustDefeated] = useState(false);
  // Categories whose slime (in BudgetMageCard's party) just got defeated (see
  // resolveMonthTransition's defeatedCategories) — a Set, not a single bool like
  // slimeJustDefeated, since more than one category can resolve at once.
  const [defeatedCategories, setDefeatedCategories] = useState(new Set());

  // Only this month's expenses are needed to show spent-vs-limit, not the full history.
  useEffect(() => {
    const now = new Date();
    const from = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    setTxLoading(true);
    fetchTransactions({ from, to }).then(setMonthTx).finally(() => setTxLoading(false));
  }, []);

  // One fetch per festival budget row, in parallel — see festivalSpent's own comment above for
  // why this can't reuse monthTx. Keyed off festivalBudgets' ids/dates (not the whole `budgets`
  // array) so this only re-fires when a festival budget is actually added/edited/removed, not on
  // every unrelated refetch (e.g. saving a plain category budget).
  useEffect(() => {
    if (festivalBudgets.length === 0) {
      setFestivalSpent({});
      return;
    }
    let cancelled = false;
    Promise.all(
      festivalBudgets.map((b) =>
        fetchTransactions({ from: b.festivalStartDate, to: b.festivalEndDate }).then((txs) => [
          b.id,
          txs.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amountCents, 0),
        ])
      )
    ).then((pairs) => {
      if (!cancelled) setFestivalSpent(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festivalBudgets.map((b) => `${b.id}:${b.festivalStartDate}:${b.festivalEndDate}`).join(",")]);

  // SlimeEnemy's month-transition check (src/lib/slimeStatus.js) — runs once per app load,
  // and does nothing (skips straight past resolveMonthTransition's early-out) on every load
  // after the first one in a given month. Depends on settings.slimeLastSeenMonth specifically
  // (not the whole `settings` object or `budgets`) so it doesn't re-fire on every unrelated
  // reference-data refetch — only when the stored month actually changes, which happens at
  // most once per real month boundary.
  useEffect(() => {
    if (refLoading) return;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (settings.slimeLastSeenMonth === currentMonth) return;

    (async () => {
      let prevMonthTransactions = [];
      // Only worth fetching last month's data when there's an actual prior check to compare
      // against and budgets to compare it with — resolveMonthTransition's own early-out covers
      // the "nothing to resolve" cases, but skipping the fetch here avoids a pointless request.
      if (settings.slimeLastSeenMonth && categoryBudgets.length > 0) {
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const from = toISODate(new Date(prevDate.getFullYear(), prevDate.getMonth(), 1));
        const to = toISODate(new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0));
        prevMonthTransactions = await fetchTransactions({ from, to });
      }
      const result = resolveMonthTransition({
        today: now,
        budgets: categoryBudgets,
        prevMonthTransactions,
        storedLastSeenMonth: settings.slimeLastSeenMonth,
        storedCarryOverCents: settings.slimeCarryOverCents || 0,
        storedCategoryCarryOver: settings.slimeCategoryCarryOver || {},
      });
      if (!result.changed) return;
      await updateSettings({
        slimeCarryOverCents: result.carryOverCents,
        slimeCategoryCarryOver: result.categoryCarryOver,
        slimeLastSeenMonth: result.newLastSeenMonth,
      });
      await refetch();
      // 1.6s — matches the ".slime-defeat" CSS animation's own run time (App.jsx) plus a small
      // buffer, same idiom as every other mascot's firing-animation timer. Both the overall and
      // per-category defeat flags share that same timing/reset.
      if (result.defeated) {
        setSlimeJustDefeated(true);
        setTimeout(() => setSlimeJustDefeated(false), 1600);
      }
      if (result.defeatedCategories.length > 0) {
        setDefeatedCategories(new Set(result.defeatedCategories));
        setTimeout(() => setDefeatedCategories(new Set()), 1600);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refLoading, settings.slimeLastSeenMonth]);

  const spentByCategory = useMemo(() => {
    const mKey = monthKey(new Date());
    const map = {};
    for (const t of monthTx) {
      if (t.kind !== "expense" || t.date.slice(0, 7) !== mKey) continue;
      map[t.category] = (map[t.category] || 0) + t.amountCents;
    }
    return map;
  }, [monthTx]);

  const slimeRatio = useMemo(
    () => computeSlimeRatio({ budgets: categoryBudgets, thisMonthTransactions: monthTx, today: new Date(), carryOverCents: settings.slimeCarryOverCents || 0 }),
    [categoryBudgets, monthTx, settings.slimeCarryOverCents]
  );

  const categorySlimeRatios = useMemo(
    () => computeCategorySlimeRatios({ budgets: categoryBudgets, thisMonthTransactions: monthTx, today: new Date(), categoryCarryOver: settings.slimeCategoryCarryOver || {} }),
    [categoryBudgets, monthTx, settings.slimeCategoryCarryOver]
  );

  async function handleDelete(budget) {
    try {
      await deleteBudget(budget.id);
      await refetch();
    } catch (e) {
      setErr(String(e && e.message ? e.message : e));
    }
  }

  if (refLoading || txLoading) {
    return <div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 2px 6px" }}>
        <div className="page-title" style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)" }}>งบประมาณ</div>
        {/* Plain document flow, not stacked over anything — so there's no risk of it ever
            covering a number, unlike the other mascots' absolutely-positioned card mounts,
            which needed that care specifically because they DO sit on top of a card's content. */}
        <SlimeEnemy ratio={slimeRatio} defeated={slimeJustDefeated} onClick={() => setShowScan(true)} />
      </div>
      <div style={{ fontSize: 12, color: "var(--color-inkMuted)", margin: "0 2px 18px", lineHeight: 1.6 }}>
        ตั้งวงเงินใช้จ่ายสูงสุดต่อเดือนแยกตามหมวดหมู่ แล้วระบบจะคำนวณให้ว่าใช้ไปแล้วเท่าไหร่
        เทียบกับวงเงินที่ตั้งไว้ ช่วยให้คุมค่าใช้จ่ายแต่ละหมวดไม่ให้บานปลาย
      </div>

      <BudgetMageCard
        budgets={categoryBudgets}
        spentByCategory={spentByCategory}
        categorySlimeRatios={categorySlimeRatios}
        defeatedCategories={defeatedCategories}
        firing={mageFiring}
      />

      <div style={sectionHead} className="section-head">
        <span>ตั้งวงเงิน</span>
        <button style={textBtn} onClick={() => setShowAdd(true)}>+ ตั้งงบประมาณ</button>
      </div>

      {categoryBudgets.length === 0 ? (
        <div style={{ ...card, textAlign: "center" }}>
          <PieChart size={22} color="var(--color-primary)" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: "var(--color-inkMuted)", marginBottom: 10 }}>ยังไม่ได้ตั้งงบประมาณ</div>
          <button type="button" style={ctaBtn} onClick={() => setShowAdd(true)}>+ ตั้งงบประมาณ</button>
        </div>
      ) : (
        <>
        <div style={sectionHead} className="section-head"><span>ดูความคืบหน้า</span></div>
        <div style={card}>
          {categoryBudgets.map((b, i) => {
            const spentCents = spentByCategory[b.category] || 0;
            const pct = Math.min(150, (spentCents / b.monthlyLimitCents) * 100);
            const over = spentCents >= b.monthlyLimitCents;
            const warn = !over && pct >= 80;
            const color = over ? COLOR_OVER : warn ? COLOR_WARN : COLOR_NORMAL;
            const icon = EXPENSE_CATS.find((c) => c.name === b.category)?.icon || "📦";
            return (
              <div key={b.id} style={{ marginBottom: i < categoryBudgets.length - 1 ? 18 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--color-ink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <CategoryIcon theme={theme} name={b.category} fallback={icon} size={16} /> {b.category}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="num" style={{ color }}>
                      {centsToDisplay(spentCents)} / {centsToDisplay(b.monthlyLimitCents)}
                    </span>
                    <button style={{ background: "none", border: "none", padding: 2 }} onClick={() => handleDelete(b)}>
                      <Trash2 size={13} color="var(--color-inkMuted)" />
                    </button>
                  </div>
                </div>
                <HpBar theme={theme} spentPct={Math.min(100, pct)} color={color} trackColor="var(--color-divider)" />
                {over && (
                  <div style={{ fontSize: 11, color: COLOR_OVER, marginTop: 4 }}>
                    ⚠️ ใช้เกินงบแล้ว {centsToDisplay(spentCents - b.monthlyLimitCents)}
                  </div>
                )}
                {warn && (
                  <div style={{ fontSize: 11, color: COLOR_WARN, marginTop: 4 }}>
                    ⚠️ ใช้ไปแล้ว {pct.toFixed(0)}% ของงบ
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* งบเทศกาล (ชุด 4.1) — a whole-period budget, not per-category, so its progress row shows
          spend-vs-limit for the FESTIVAL'S OWN date range (festivalSpent, computed above) rather
          than spentByCategory (which is scoped to the current calendar month and keyed by
          category — neither axis matches what a festival budget covers). */}
      <div style={sectionHead} className="section-head">
        <span>🎉 งบเทศกาล</span>
        <button style={textBtn} onClick={() => setShowAddFestival(true)}>+ ตั้งงบเทศกาล</button>
      </div>
      {festivalBudgets.length === 0 ? (
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "var(--color-inkMuted)", marginBottom: 10 }}>ยังไม่ได้ตั้งงบเทศกาล</div>
          <button type="button" style={ctaBtn} onClick={() => setShowAddFestival(true)}>+ ตั้งงบเทศกาล</button>
        </div>
      ) : (
        <div style={card}>
          {festivalBudgets.map((b, i) => {
            const f = festivalBySlug(b.category);
            const spentCents = festivalSpent[b.id] || 0;
            const pct = Math.min(150, (spentCents / b.monthlyLimitCents) * 100);
            const over = spentCents >= b.monthlyLimitCents;
            const warn = !over && pct >= 80;
            const color = over ? COLOR_OVER : warn ? COLOR_WARN : COLOR_NORMAL;
            return (
              <div key={b.id} style={{ marginBottom: i < festivalBudgets.length - 1 ? 18 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "var(--color-ink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {f ? `${f.icon} ${f.name}` : b.category}
                    <span style={{ color: "var(--color-inkFaint)", fontWeight: 400 }}>
                      ({toShortThaiDate(b.festivalStartDate)}–{toShortThaiDate(b.festivalEndDate)})
                    </span>
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="num" style={{ color }}>
                      {centsToDisplay(spentCents)} / {centsToDisplay(b.monthlyLimitCents)}
                    </span>
                    <button style={{ background: "none", border: "none", padding: 2 }} onClick={() => handleDelete(b)}>
                      <Trash2 size={13} color="var(--color-inkMuted)" />
                    </button>
                  </div>
                </div>
                <HpBar theme={theme} spentPct={Math.min(100, pct)} color={color} trackColor="var(--color-divider)" />
                {over && (
                  <div style={{ fontSize: 11, color: COLOR_OVER, marginTop: 4 }}>
                    ⚠️ ใช้เกินงบเทศกาลแล้ว {centsToDisplay(spentCents - b.monthlyLimitCents)}
                  </div>
                )}
                {warn && (
                  <div style={{ fontSize: 11, color: COLOR_WARN, marginTop: 4 }}>
                    ⚠️ ใช้ไปแล้ว {pct.toFixed(0)}% ของงบเทศกาล
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {err && <div style={{ color: "var(--color-danger)", fontSize: 12, textAlign: "center", marginTop: 8 }}>{err}</div>}

      <AddFestivalBudgetSheet
        open={showAddFestival}
        onClose={() => setShowAddFestival(false)}
        onSaved={async () => {
          setShowAddFestival(false);
          await refetch();
        }}
      />

      <AddBudgetSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={async () => {
          // The save itself (createBudget, inside AddBudgetSheet) has already fully completed by
          // the time onSaved runs. The visual reaction fires FIRST, before refetch() — measured
          // on the live deploy, refetch() alone (re-fetching budgets + this month's transactions)
          // can take several seconds over a real network, and awaiting it before showing anything
          // made a successful save look like nothing had happened at all for that whole stretch.
          // refetch() still runs (so the numbers on screen catch up), just no longer gates
          // whether/when the overlay or bubble appears.
          setShowAdd(false);
          if (mascotAnimationEnabled) {
            setShowSpell(true);
          } else {
            // No overlay at all in this case (not a stripped-down version of it) — just the
            // small inline mage in BudgetMageCard showing its message briefly, no motion. 1500ms
            // matches the same duration Dashboard.jsx/TransactionDetail.jsx already use for
            // their own (non-overlay) mageFiring bubbles.
            setMageFiring(true);
            setTimeout(() => setMageFiring(false), 1500);
          }
          await refetch();
        }}
      />
      {showSpell && (
        <MageSpellOverlay
          message="บันทึกไว้แล้วนะ! ✨"
          castingMs={1800}
          messageMs={1500}
          fadeMs={400}
          onClose={() => setShowSpell(false)}
        />
      )}
      <SlimeScanModal
        open={showScan}
        onClose={() => setShowScan(false)}
        budgets={categoryBudgets}
        spentByCategory={spentByCategory}
      />
    </div>
  );
}
