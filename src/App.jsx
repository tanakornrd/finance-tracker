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

  // Keeps a `--app-vh` CSS var on <html> in sync with the actual visible height, refreshed
  // on the visualViewport's own resize/scroll events (fires when the on-screen keyboard opens/
  // closes, not just on real window resizes). This exists because `dvh` alone (used by
  // sharedStyles.js's `overlay`/`sheet`) turned out not to be enough on iOS Safari: WebKit's
  // dynamic viewport units track browser-chrome show/hide (the URL bar), but do NOT shrink for
  // the software keyboard — only `window.visualViewport` reports that. `--app-vh` is the
  // authoritative, keyboard-aware source; `dvh` stays in sharedStyles.js only as the fallback
  // value for the instant before this effect's first run. Declared before the loading/session
  // early returns below so it's an unconditional hook call on every render (rules of hooks) —
  // harmless to also run on the Login screen, which has no modals.
  React.useEffect(() => {
    const vv = window.visualViewport;
    function setAppVh() {
      const h = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h}px`);
    }
    setAppVh();
    const target = vv || window;
    target.addEventListener("resize", setAppVh);
    target.addEventListener("scroll", setAppVh);
    return () => {
      target.removeEventListener("resize", setAppVh);
      target.removeEventListener("scroll", setAppVh);
    };
  }, []);

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

        /* WarriorMascot.jsx (mounted inside Dashboard.jsx, next to the net-worth card — not
           globally here anymore): a slow, subtle standing-guard bob rather than a run cycle —
           the warrior stands still rather than crossing the screen, so "idle" should read as
           alert-but-still rather than static. */
        .warrior-guard { animation: warriorBob 2.4s ease-in-out infinite; }
        @keyframes warriorBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

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
          .warrior-guard { animation: none; }
          .castle-star-twinkle { animation: none; }
          .castle-torch-flicker { animation: none; }
          .castle-banner-sway { animation: none; }
        }

        /* WarriorMascot.jsx's speech bubble sits beside the net-worth card's own number, which
           can render arbitrarily wide — below ~560px there isn't reliable room for both next to
           each other no matter how far the bubble itself is shrunk (see its own comment). The
           warrior stays visible at every width; only the bubble text drops out on narrow phones. */
        @media (max-width: 560px) {
          .warrior-speech-bubble { display: none; }
        }

        /* Dashboard.jsx's net-worth card mascot mount: standing beside the net-worth number,
           full opacity, at every width — not a background layer. right:4px + top:42%
           (translateY(-50%) to center on that point) lands it in the blank space to the right
           of the number at both breakpoints, since the card's text content is identical (same
           DOM/CSS) at every width, just narrower. z-index:0 is deliberately BELOW the numbers
           content div's own zIndex:1 (Dashboard.jsx) as a safety net — the net-worth figure can
           render arbitrarily wide (an unbounded real balance, not a fixed-width label), so on a
           narrow phone with a long number it's possible for the two to overlap; z-index makes
           sure the number wins that overlap and stays fully readable rather than the mascot
           covering digits. */
        .warrior-mount { position: absolute; top: 42%; transform: translateY(-50%); right: 4px; z-index: 0; }

        /* WarriorMascot.jsx's own <img> size: clamp() shrinks it with the viewport so it stays
           clear of the number on narrow phones, landing on 130px once there's room (~810px+).
           Desktop doubles that (see the min-width:1280px override below) — that's bigger than
           this card's own height, which is why ".passbook-card" below switches overflow to
           visible at that same breakpoint, letting the mascot stand taller than the card instead
           of being clipped to it. Kept as a class (not inline on the <img>) so the desktop media
           query can win — an inline style always beats an external stylesheet rule of any
           specificity unless that rule uses !important, which this file deliberately avoids. */
        .warrior-img { width: clamp(56px, 16vw, 130px); height: clamp(56px, 16vw, 130px); }
        @media (min-width: 1280px) {
          .warrior-img { width: 260px; height: 260px; }
        }

        /* Base: clips the card's own perforation strip + (at mobile widths) the mascot to its
           rounded corners, same as before this mascot ever existed. Desktop switches to visible
           specifically so the now much taller mascot (see ".warrior-img" above) can stand above/
           below the card's own edge instead of being cut off — nothing else in this card relies
           on the clip at that width. */
        .passbook-card { overflow: hidden; }
        @media (min-width: 1280px) {
          .passbook-card { overflow: visible; }
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

      <ThemeSwitcher />
      <BottomNav />
    </div>
  );
}
