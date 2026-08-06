import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import BottomNav from "./components/BottomNav.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";
import LightningCornerDecoration from "./components/LightningCornerDecoration.jsx";
import CastleBackground from "./components/CastleBackground.jsx";
import SpeedsterMascot from "./components/mascot/SpeedsterMascot.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./routes/Login.jsx";

// Route-level code splitting: each page's JS only downloads when the user actually
// navigates there, instead of one bundle holding every route up front.
const Dashboard = lazy(() => import("./routes/Dashboard.jsx"));
const Overview = lazy(() => import("./routes/Overview.jsx"));
const Transactions = lazy(() => import("./routes/Transactions.jsx"));
const TransactionDetail = lazy(() => import("./routes/TransactionDetail.jsx"));
const Accounts = lazy(() => import("./routes/Accounts.jsx"));
const AccountDetail = lazy(() => import("./routes/AccountDetail.jsx"));
const Budgets = lazy(() => import("./routes/Budgets.jsx"));
const Upcoming = lazy(() => import("./routes/Upcoming.jsx"));
const Trash = lazy(() => import("./routes/Trash.jsx"));
const ImportStatement = lazy(() => import("./routes/ImportStatement.jsx"));

export default function App() {
  const { session, loading } = useAuth();

  // While Supabase checks localStorage for an existing session, render nothing rather than
  // flashing the Login page for an instant before a real session is found.
  if (loading) return null;
  // Every /api request requires this session's token (server/supabaseClient.js's requireAuth)
  // — nothing past this gate can reach real data while logged out.
  if (!session) return <Login />;

  return (
    // ".app-shell" is a flex row at every width — Sidebar is display:none below the desktop
    // breakpoint (removed from flow entirely, not just hidden), so ".app-container" naturally
    // fills/centers itself exactly as it did before Sidebar existed. Nothing below 1280px
    // changes: same DOM shape, same classes, same behavior as the original mobile-only layout.
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Press+Start+2P&family=Bangers&family=Racing+Sans+One&display=swap');
        * { box-sizing: border-box; font-family: 'IBM Plex Sans Thai', sans-serif; }
        .num { font-family: var(--font-num); }
        .fade { animation: fadeIn .35s ease both; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .sheet { animation: slideUp .28s cubic-bezier(.22,1,.36,1) both; }
        @keyframes slideUp { from { transform: translateY(100%);} to { transform: translateY(0);} }
        button { cursor: pointer; }
        a { color: inherit; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
        input:focus, select:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }

        /* SpeedsterMascot.jsx: dashes across ".app-container"'s full width, pauses off-screen,
           repeats. Percentage keyframes pack "run in → cross → exit → long pause" into one
           animation-duration instead of chaining separate animations, so it's a single
           always-running CSS timeline (cheap — no JS driving it). Leg/arm swing is a second,
           much faster, independent animation layered on top so the stride reads as running
           regardless of how slow the overall cross-screen pass is. */
        .mascot-dash { animation: mascotDash 9s linear infinite; }
        @keyframes mascotDash {
          0%   { left: -70px; opacity: 0; }
          4%   { opacity: 1; }
          40%  { left: calc(100% + 20px); opacity: 1; }
          44%  { opacity: 0; }
          100% { left: -70px; opacity: 0; }
        }
        .runner-leg-back, .runner-arm-front { animation: legSwingA 0.3s ease-in-out infinite; }
        .runner-leg-front, .runner-arm-back { animation: legSwingA 0.3s ease-in-out infinite reverse; }
        @keyframes legSwingA { 0%, 100% { transform: rotate(-22deg); } 50% { transform: rotate(22deg); } }

        /* KnightMascot.jsx (mounted inside Dashboard.jsx, next to the net-worth card — not
           globally here anymore): a slow, subtle standing-guard bob rather than a run cycle —
           the knight stands still rather than crossing the screen, so "idle" should read as
           alert-but-still rather than static. */
        .knight-guard { animation: knightBob 2.4s ease-in-out infinite; }
        @keyframes knightBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

        /* CastleBackground.jsx ambient decoration — not gated by the mascotAnimationEnabled
           toggle (that's specifically the mascot on/off switch), but still respects
           prefers-reduced-motion below like every other animation here. */
        .castle-star-twinkle { animation: castleStarTwinkle 3.4s ease-in-out infinite; }
        @keyframes castleStarTwinkle { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }

        .castle-torch-flicker { animation: castleTorchFlicker 2.6s ease-in-out infinite; }
        @keyframes castleTorchFlicker { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }

        .castle-banner-sway { animation: castleBannerSway 3.2s ease-in-out infinite; }
        @keyframes castleBannerSway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }

        @media (prefers-reduced-motion: reduce) {
          .mascot-dash { animation: none; }
          .runner-leg-back, .runner-leg-front, .runner-arm-front, .runner-arm-back { animation: none; }
          .knight-guard { animation: none; }
          .castle-star-twinkle { animation: none; }
          .castle-torch-flicker { animation: none; }
          .castle-banner-sway { animation: none; }
        }

        /* KnightMascot.jsx's speech bubble sits beside the net-worth card's own number, which
           can render arbitrarily wide — below ~560px there isn't reliable room for both next to
           each other no matter how far the bubble itself is shrunk (see its own comment). The
           knight stays visible at every width; only the bubble text drops out on narrow phones. */
        @media (max-width: 560px) {
          .knight-speech-bubble { display: none; }
        }

        /* Dashboard.jsx's net-worth card mascot mount. Two genuinely different positions, not
           just a scaled-down version of one: desktop has enough vertical room in the card to sit
           in the gap between the top net-worth figure and the income/expense/transfer row below
           it (both clear of any text); mobile's card is too short for that gap to exist at all,
           so the safe spot there is above the card entirely, in the blank margin between it and
           the month-nav row — overlapping only the card's own decorative top edge, never a
           number. */
        .knight-mount { position: absolute; top: 42%; transform: translateY(-50%); right: 4px; z-index: 6; }
        @media (max-width: 560px) {
          .knight-mount { top: -60px; transform: none; }
        }

        /* --- Desktop shell (added 2026-08-06) ---
           Everything above/below this block is untouched from the mobile-only layout; this is
           purely additive so ripping it back out later restores mobile-only exactly. */
        .app-shell { min-height: 100vh; background: var(--color-primarySoft); display: flex; }
        .app-sidebar { display: none; }
        /* z-index: 0 (not just position: relative) is deliberate — position alone with no
           z-index leaves z-index auto, which does NOT establish a new stacking context. Without
           an explicit z-index here, CastleBackground.jsx's z-index:-1 (see its own comment)
           doesn't stay scoped behind this container's own cards the way it looks like it should:
           it escapes to the nearest ancestor that DOES form a stacking context — which, since
           .app-shell/.app-sidebar are plain static-position elements, ends up being the
           document root — and paints behind .app-shell's own opaque background fill instead,
           making the castle backdrop (and anything else using a negative z-index here) invisible
           entirely rather than "behind the cards" as intended. */
        .app-container { width: 100%; max-width: 480px; margin: 0 auto; padding: 24px 18px 84px; position: relative; z-index: 0; }
        .bottom-nav { display: flex; }

        /* Dashboard.jsx's own "+" FAB — mobile math anchors it to the (always-centered-in-
           viewport) 480px column's right edge. At desktop that column isn't centered in the
           full viewport anymore (Sidebar shifts everything right), and its width also isn't a
           fixed number (flexbox may shrink ".app-container" below its max-width on the narrower
           end of the desktop range) — reliably computing "the column's actual right edge" from
           pure viewport-percentage CSS isn't possible in that case. Simplest correct fix: just
           pin it near the real screen corner on desktop instead of chasing the column. */
        .dashboard-fab { position: fixed; bottom: 84px; right: 50%; transform: translateX(calc(240px - 60px)); }

        /* Accounts.jsx's account cards — 2 columns on mobile (unchanged; this line reproduces
           what used to be an inline gridTemplateColumns), more columns once there's room. */
        .accounts-grid { grid-template-columns: repeat(2, 1fr); }

        @media (min-width: 1280px) {
          .app-sidebar {
            display: flex;
            flex-direction: column;
            width: 260px;
            flex-shrink: 0;
            position: sticky;
            top: 0;
            align-self: flex-start;
            height: 100vh;
            padding: 20px 16px;
            border-right: 1px solid var(--color-divider);
            background: var(--color-white);
          }
          .app-container { max-width: 1400px; padding: 32px 40px 48px; }
          .bottom-nav { display: none; }
          .theme-switcher-fab { display: none; }
          .dashboard-fab { bottom: 40px; right: 40px; transform: none; }

          /* Dashboard.jsx (Phase 2, 2026-08-06): same DOM order as mobile in every case below —
             only how that order is laid out into columns changes, so nothing needed to move in
             the JSX itself. */

          /* WeeklyInsightCard / SafeToSpendCard / MonthComparisonBar / PendingBillsCard /
             RecommendationsCard: flow top-to-bottom then wrap into a 2nd column (not an
             interleaved grid) via CSS multi-column — the simplest way to get "2 columns" out of
             a single stack of independently-sized cards without hand-placing each one. */
          .dash-columns { column-count: 2; column-gap: 20px; }
          .dash-columns > * { break-inside: avoid; margin-bottom: 16px; }

          /* Category breakdown next to the transaction list — explicit 2-column grid since
             there are exactly two blocks here, so there's no ordering ambiguity to worry about
             the way there is with ".dash-columns" above. */
          .dash-split { display: grid; grid-template-columns: 360px 1fr; gap: 24px; align-items: start; }

          /* Asset/debt/goal/investment account cards: horizontal-scrolling row on mobile
             (unchanged), wraps into a grid on desktop instead — the whole point of this pass is
             seeing more at once without scrolling. */
          /* !important here is deliberate, not a specificity workaround: the row's own inline
             style sets overflow-x:"auto" directly (Dashboard.jsx), which no normal-weight
             stylesheet rule could ever beat — !important is the one thing that legitimately
             outranks an inline declaration, which is exactly what's needed to turn scrolling
             off at this breakpoint without touching Dashboard.jsx's own style object. */
          .dash-acc-row { flex-wrap: wrap; overflow-x: visible !important; }
          .dash-acc-row > * { min-width: 150px; flex: 1 1 150px; }

          .accounts-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      <Sidebar />

      <div className="app-container fade">
        <CastleBackground />
        <LightningCornerDecoration />
        <SpeedsterMascot />

        <Suspense fallback={<div style={{ padding: 40, color: "var(--color-inkMuted)" }}>กำลังโหลด...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:id" element={<TransactionDetail />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/upcoming" element={<Upcoming />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="/import" element={<ImportStatement />} />
          </Routes>
        </Suspense>
      </div>

      <SignOutButton />
      <ThemeSwitcher />
      <BottomNav />
    </div>
  );
}

// Minimal, deliberately unobtrusive — this app has exactly one user per login, so "which
// account am I on" only matters as a quick way to switch/test, not a feature to design around.
function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <button
      type="button"
      onClick={() => signOut()}
      title="ออกจากระบบ"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 20,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: "var(--color-white)",
        color: "var(--color-inkMuted)",
        fontSize: 11,
      }}
    >
      ออกจากระบบ
    </button>
  );
}
