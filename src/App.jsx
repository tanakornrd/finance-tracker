import React, { Suspense, lazy, useState } from "react";
import { Routes, Route } from "react-router-dom";
import BottomNav from "./components/BottomNav.jsx";
import Sidebar from "./components/Sidebar.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";
import LightningCornerDecoration from "./components/LightningCornerDecoration.jsx";
import CastleBackground from "./components/CastleBackground.jsx";
import SpeedsterMascot from "./components/mascot/SpeedsterMascot.jsx";
import PartyLevelUpOverlay from "./components/mascot/PartyLevelUpOverlay.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useReferenceData } from "./context/ReferenceDataContext.jsx";
import { updateSettings } from "./api.js";
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
  const { accounts, settings, refetch } = useReferenceData();
  // Goal-completion celebration (RPG party interactions, part 5) — see
  // PartyLevelUpOverlay.jsx's own header comment for why this lives here (App.jsx, above every
  // route) rather than on any single page. null = nothing to celebrate right now.
  const [levelUpGoalNames, setLevelUpGoalNames] = useState(null);

  // Declared before the loading/session early returns below, same as the --app-vh effect —
  // unconditional hook call on every render (rules of hooks). Harmless pre-login: `accounts` is
  // still the ReferenceDataContext default ([]) at that point, so the length check below no-ops.
  React.useEffect(() => {
    if (!accounts || accounts.length === 0) return;
    const celebrated = new Set(settings.celebratedGoalIds || []);
    // "Reached" uses the exact same test Accounts.jsx's own "🎉 ถึงเป้าหมายแล้ว" badge does
    // (balanceCents >= targetAmountCents) — this doesn't introduce a second definition of what
    // counts as reaching a goal, just reacts to the same one Accounts.jsx already displays.
    const newlyReached = accounts.filter(
      (a) => a.isGoalAccount && a.status !== "trashed" && a.targetAmountCents > 0 && a.balanceCents >= a.targetAmountCents && !celebrated.has(a.id)
    );
    if (newlyReached.length === 0) return;
    setLevelUpGoalNames(newlyReached.map((a) => a.name));
    // Persisted immediately (not when the overlay closes) so a page refresh mid-celebration
    // still won't show it again — celebratedGoalIds is the source of truth for "already shown",
    // not whether the overlay happened to finish playing.
    updateSettings({ celebratedGoalIds: [...celebrated, ...newlyReached.map((a) => a.id)] }).then(refetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, settings.celebratedGoalIds]);

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

        /* WarriorMascot.jsx's click reaction (RPG party interactions, part 1) — a one-shot
           (not looping) sword-slash lunge, same idiom as ArcherMascot's archer-fire/MageMascot's
           mage-cast: React swaps the className from warrior-guard to warrior-slash and back
           (WarriorMascot.jsx itself resets it via onAnimationEnd here, since the click that
           triggers it is self-contained rather than driven by a parent's own save-success
           timer), so this only ever plays once per click. */
        .warrior-slash { animation: warriorSlash 0.5s ease-out; }
        @keyframes warriorSlash {
          0% { transform: translateX(0) rotate(0deg); }
          35% { transform: translateX(-8px) rotate(-12deg); }
          65% { transform: translateX(4px) rotate(8deg); }
          100% { transform: translateX(0) rotate(0deg); }
        }

        /* MageMascot.jsx (mounted inside BudgetMageCard.jsx): a gentle float instead of the
           warrior's bob — reads as a spellcaster hovering rather than a guard shifting weight,
           same "idle but alive, not static" purpose. */
        .mage-float { animation: mageFloat 3s ease-in-out infinite; }
        @keyframes mageFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

        /* MageMascot.jsx's reactive "firing" mode (Dashboard.jsx / TransactionDetail.jsx, via
           the "firing" prop) — a one-shot (not looping) cast animation, same idiom as
           ArcherMascot's archer-fire: React swaps the className from mage-float to mage-cast
           and back, so this only ever plays once per save. */
        .mage-cast { animation: mageCast 0.7s ease-out; }
        @keyframes mageCast {
          0% { transform: translateY(0) rotate(0deg); }
          30% { transform: translateY(-6px) rotate(-6deg); }
          60% { transform: translateY(2px) rotate(4deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }

        /* The magic orb glow (MageMascot.jsx's ".mage-orb-glow" div, not part of the art itself
           — see that component's comment) — a faint static glow while idle, and on firing
           ".firing" plays a spin-and-pulse so the orb visibly reacts too, not just the staff
           swing above. Percentages/position are tuned to roughly where the orb sits in
           mascot-mage.png (right of center, upper-middle). */
        .mage-orb-glow {
          position: absolute; left: 72%; top: 46%; width: 34%; height: 34%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,190,80,0.85) 0%, rgba(255,120,20,0.45) 45%, transparent 75%);
          opacity: 0.5;
          pointer-events: none;
        }
        .mage-orb-glow.firing { animation: mageOrbPulse 0.8s ease-out; }
        @keyframes mageOrbPulse {
          0% { transform: translate(-50%, -50%) scale(0.8) rotate(0deg); opacity: 0.5; }
          40% { transform: translate(-50%, -50%) scale(1.5) rotate(150deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1) rotate(300deg); opacity: 0.5; }
        }

        /* MageMascot.jsx's click "spell flash" (RPG party interactions, part 2 — only
           SafeToSpendCard.jsx's clickable instance ever renders this) — a bright burst covering
           the whole sprite right as the amount-entry modal opens, reading as "a burst of magic
           just before the modal opens" rather than a loading gate: the modal itself is opened
           in the very same click handler, not after this animation finishes, so this is purely
           decorative and adds zero latency. inset:0 + pointer-events:none so it can never block
           a second click. */
        .mage-click-flash { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle, #FFF8D6 0%, #FFD75E 40%, transparent 75%); pointer-events: none; animation: mageClickFlash 0.35s ease-out; }
        @keyframes mageClickFlash {
          0% { opacity: 0; transform: scale(0.6); }
          40% { opacity: 0.95; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.4); }
        }

        /* ArcherMascot.jsx: idle bob while waiting (same idiom as the warrior/mage), plus a
           one-shot (not infinite) recoil-and-release animation that plays once when a save
           succeeds — a quick lean back then snap forward, reading as "just fired an arrow"
           rather than a looping pose. React swaps the className from archer-idle to
           archer-fire and back (see the component), so this only ever plays once per save. */
        .archer-idle { animation: archerBob 2.6s ease-in-out infinite; }
        @keyframes archerBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .archer-fire { animation: archerFire 0.6s ease-out; }
        @keyframes archerFire {
          0% { transform: translateX(0) rotate(0deg); }
          30% { transform: translateX(-6px) rotate(-4deg); }
          60% { transform: translateX(2px) rotate(2deg); }
          100% { transform: translateX(0) rotate(0deg); }
        }

        /* MageMascot.jsx's own <img> size — see ".warrior-img" above for why this is a class,
           not an inline style: only a stylesheet rule can be overridden by a media query. This
           card is self-contained (BudgetMageCard.jsx), so unlike the warrior it never has to
           stay clear of someone else's numbers — just enough room to grow a bit on desktop. */
        .mage-img { width: clamp(64px, 18vw, 100px); height: clamp(64px, 18vw, 100px); }
        @media (min-width: 1280px) {
          .mage-img { width: 140px; height: 140px; }
        }

        /* ArcherMascot.jsx's own <img> size — deliberately smaller than the warrior/mage: this
           is a small reactive flourish inline near the top of a page, not a hero element with
           its own dedicated card. */
        .archer-img { width: clamp(48px, 12vw, 64px); height: clamp(48px, 12vw, 64px); }
        @media (min-width: 1280px) {
          .archer-img { width: 90px; height: 90px; }
        }

        /* SafeToSpendCard.jsx's own MageMascot mount ("ใช้ได้อีกวันนี้" card, Dashboard.jsx) —
           position mirrors WarriorMascot's corner mount on the net-worth card (absolute,
           vertically centered, clear of this card's own left-aligned text). Sized bigger than
           the budget page's mage via a descendant override of ".mage-img" scoped to this mount
           specifically — NOT a change to ".mage-img" itself, which stays exactly as-is for
           BudgetMageCard.jsx (kept where it was, unchanged, per instruction). */
        .scribe-mage-mount { position: absolute; top: 50%; right: 8px; transform: translateY(-50%); z-index: 0; }
        .scribe-mage-mount .mage-img { width: clamp(72px, 20vw, 120px); height: clamp(72px, 20vw, 120px); }
        @media (min-width: 1280px) {
          .scribe-mage-mount .mage-img { width: 160px; height: 160px; }
        }

        /* SlimeEnemy.jsx (Budgets.jsx): idle is a squish-wobble (fitting for a slime) instead
           of the other mascots' bob/float — a one-shot "poof" plays instead when "defeated" is
           true (React swaps the className, same idiom as archer-fire/mage-cast), scaling down
           to nothing while spinning slightly, then the component just stops rendering once its
           parent flips "defeated" back off (Budgets.jsx). */
        .slime-idle { animation: slimeWobble 1.8s ease-in-out infinite; }
        @keyframes slimeWobble {
          0%, 100% { transform: scale(1, 1); }
          50% { transform: scale(1.08, 0.9); }
        }
        .slime-defeat { animation: slimeDefeat 1.4s ease-out forwards; }
        @keyframes slimeDefeat {
          0% { transform: scale(1, 1) rotate(0deg); opacity: 1; }
          40% { transform: scale(1.3, 0.6) rotate(-8deg); opacity: 1; }
          100% { transform: scale(0, 0) rotate(20deg); opacity: 0; }
        }

        /* SlimeEnemy.jsx's click "scan" reaction (RPG party interactions, part 3 — only
           Budgets.jsx's page-header slime is ever clickable). A one-shot expanding ring —
           reads as a targeting reticle scanning the enemy, not a value change, so it doesn't
           need to touch the sprite's own transform (that's still whatever slime-idle/
           slime-defeat is doing). SlimeScanModal itself opens in the same click handler, not
           after this finishes, so it adds no latency. */
        .slime-scan-ring {
          position: absolute; inset: -6px; border-radius: 50%;
          border: 2px solid #4CD4FF; pointer-events: none;
          animation: slimeScanPulse 0.5s ease-out;
        }
        @keyframes slimeScanPulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.35); opacity: 0; }
        }

        /* SlimeEnemy.jsx's own <img> size — the one mascot in this app whose size is DATA-
           driven (src/lib/slimeStatus.js), not just responsive. width/height here are the
           normal per-breakpoint MAXIMUM (same clamp()-per-breakpoint idiom as every other
           mascot's own -img class) — the box is always laid out at that fixed max, so it never
           grows into the page title next to it no matter the ratio. The data-driven part is a
           transform:scale(var(--slime-scale)) shrinking DOWN from that reserved max, set
           inline by the component per-render. (An earlier version tried multiplying the
           clamp() itself via calc(clamp(...) * var(...)) for width/height directly — dropped
           after testing showed it not reliably taking effect; plain transform:scale() has none
           of that risk and also sidesteps any layout-overflow concern for free.) */
        .slime-img { width: clamp(48px, 14vw, 90px); height: clamp(48px, 14vw, 90px); transform: scale(var(--slime-scale, 0.3)); transform-origin: center; }
        @media (min-width: 1280px) {
          .slime-img { width: 140px; height: 140px; }
        }

        /* "party" variant — one per budgeted category, staged inside BudgetMageCard.jsx
           opposite MageMascot, like an enemy encounter. Deliberately the SAME max box as
           ".budget-mage-mount .mage-img" below (not ".mage-img"'s own default size) —
           SlimeEnemy.jsx's 0.5 baseline scale only reads as "half the mage's size" if both
           share the same reserved box to begin with. Keep these two rules' width/height in sync
           if either changes. */
        .slime-img-party { width: clamp(90px, 22vw, 130px); height: clamp(90px, 22vw, 130px); transform: scale(var(--slime-scale, 0.5)); transform-origin: center; }
        @media (min-width: 1280px) {
          .slime-img-party { width: 190px; height: 190px; }
        }

        /* BudgetMageCard.jsx's own MageMascot mount — bigger than MageMascot's default
           ".mage-img" size (used as-is on TransactionDetail.jsx and, via its own further
           override, SafeToSpendCard.jsx's ".scribe-mage-mount") via a descendant override
           scoped to this mount specifically, same idiom as ".scribe-mage-mount .mage-img"
           above. Sized to match ".slime-img-party" exactly — see that rule's own comment. */
        .budget-mage-mount .mage-img { width: clamp(90px, 22vw, 130px); height: clamp(90px, 22vw, 130px); }
        @media (min-width: 1280px) {
          .budget-mage-mount .mage-img { width: 190px; height: 190px; }
        }

        /* PartyLevelUpOverlay.jsx (RPG party interactions, part 5) — the "big" celebration,
           deliberately more elaborate than any single mascot's click reaction: a pulsing radial
           burst behind everything, the title text popping in with a bounce, and each of the 4
           character sprites bouncing in one after another (staggered via each <img>'s own
           inline animationDelay, set in the component). All three loop gently rather than
           firing once — this overlay auto-dismisses on its own timer (App.jsx/the component
           itself), so "loop while visible" reads better than a one-shot that would finish and
           leave everything static for however long is left before the auto-close. */
        .level-up-overlay { animation: levelUpFadeIn 0.25s ease-out; }
        @keyframes levelUpFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .level-up-burst {
          background: radial-gradient(circle, rgba(255,215,94,0.35) 0%, rgba(255,215,94,0.1) 40%, transparent 70%);
          animation: levelUpBurstPulse 1.8s ease-in-out infinite;
        }
        @keyframes levelUpBurstPulse {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        .level-up-title { animation: levelUpTitlePop 1.2s ease-in-out infinite; }
        @keyframes levelUpTitlePop {
          0%, 100% { transform: scale(1) rotate(-1deg); }
          50% { transform: scale(1.08) rotate(1deg); }
        }

        .level-up-char { animation: levelUpCharBounce 0.9s ease-in-out infinite; }
        @keyframes levelUpCharBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }

        /* MageSpellOverlay.jsx (RPG party interactions follow-up, generalized 2026-08-07 —
           originally Budgets.jsx-only as BudgetSpellOverlay.jsx, now shared with Dashboard.jsx's
           own transaction-save reaction too, each with its own message/timing). Casting ->
           message -> fading phases driven by the component's own timers, not a single CSS
           animation. Only ever mounted when mascotAnimationEnabled is true (each caller's own
           decision — the toggle-off/reduced-motion experience is a completely different, non-
           overlay path per caller), so nothing here needs its own mascotAnimationEnabled gate —
           but prefers-reduced-motion below still applies, since the user could have the in-app
           toggle on despite the OS asking for reduced motion. */
        .mage-spell-overlay { animation: mageSpellFadeIn 0.2s ease-out; }
        @keyframes mageSpellFadeIn { from { opacity: 0; } to { opacity: 1; } }
        /* Same specificity as .mage-spell-overlay above (both plain single classes) — wins by
           being declared later, since the component applies both classes together during the
           "fading" phase. */
        .mage-spell-overlay-fading { animation: mageSpellFadeOut 0.4s ease-in forwards; }
        @keyframes mageSpellFadeOut { from { opacity: 1; } to { opacity: 0; } }

        /* Loops for as long as the overlay is mounted (casting + message phases; keeps spinning
           underneath the fade-out too, which is invisible under it by the time it matters) —
           "ร่ายมนต์" needs to visibly keep going while the message bubble's own timer runs.
           .mage-spell-ring is now an <img> (mage-orb-ring.png, a crop of the real magic-circle
           art in mascot-mage.png's hand — see that file's own comment), not a CSS conic-gradient
           approximation — rotate() works identically on an img as it did on the old div. */
        .mage-spell-ring { animation: mageSpellRingSpin 2.4s linear infinite; }
        @keyframes mageSpellRingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .mage-spell-bubble { animation: mageSpellBubblePop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
        @keyframes mageSpellBubblePop {
          0% { opacity: 0; transform: scale(0.5) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Sparkle burst (MageSpellOverlay.jsx renders 8 of these, one per --spark-angle) — a
           radial fling-and-fade, CSS-only. rotate(var(--spark-angle)) then translateX() moves
           each dot outward along its own angle (a standard technique for a radial burst without
           needing 8 separate hand-written keyframes, one per direction). */
        .mage-spell-sparkles { position: absolute; inset: 0; pointer-events: none; }
        .mage-spell-spark {
          position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; border-radius: 50%;
          background: #FFD75E;
          animation: mageSpellSparkBurst 0.6s ease-out both;
        }
        @keyframes mageSpellSparkBurst {
          0% { transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateX(0) scale(0.4); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(var(--spark-angle)) translateX(46px) scale(1); opacity: 0; }
        }

        /* Card press feedback (useCardPress.js, 2026-08-07) — transform-only (no width/height/
           margin, so it never triggers layout/reflow on mobile). transition lives on the base
           ".press-card" class (always present on a pressable card) so the bounce-BACK is
           animated; ".press-active" (added only while actually pressed, via the hook's pressed
           state) is what actually applies the shrink — the press-down itself reads as
           near-instant since the browser starts that transition from whatever scale it's
           currently at, same as every other transform transition in this app. */
        .press-card { transition: transform 0.12s ease-out; }
        .press-active { transform: scale(0.98); }

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
          .warrior-slash { animation: none; }
          .mage-float { animation: none; }
          .mage-cast { animation: none; }
          .mage-orb-glow.firing { animation: none; }
          .mage-click-flash { animation: none; opacity: 0; }
          .archer-idle { animation: none; }
          .archer-fire { animation: none; }
          .slime-idle { animation: none; }
          .slime-defeat { animation: none; }
          .slime-scan-ring { animation: none; opacity: 0; }
          .level-up-overlay { animation: none; }
          .level-up-burst { animation: none; }
          .level-up-title { animation: none; }
          .level-up-char { animation: none; }
          .mage-spell-overlay { animation: none; }
          .mage-spell-overlay-fading { animation: none; opacity: 0; }
          .mage-spell-ring { animation: none; }
          .mage-spell-bubble { animation: none; }
          .mage-spell-spark { animation: none; opacity: 0; }
          .press-card { transition: none; }
          .press-active { transform: none; }
          .castle-star-twinkle { animation: none; }
          .castle-torch-flicker { animation: none; }
          .castle-banner-sway { animation: none; }
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
        /* Mobile-only (2026-08-07 feedback): moved up from the base 42% so his feet/standing
           ground line up with the bottom edge of the "สินทรัพย์ ... หนี้สิน" line above the
           divider, instead of hanging down into that divider's own row. First pass (20%) went
           too far up — 33% measured directly off the user's annotated screenshot (pixel-measured
           card top/height and his feet position at 20% to back out where the target line actually
           falls). Desktop keeps the base 42% untouched — this only matches below the desktop
           breakpoint. */
        @media (max-width: 1279px) {
          .warrior-mount { top: 33%; }
        }

        /* WarriorMascot.jsx's own <img> size: clamp() shrinks it with the viewport so it stays
           clear of the number on narrow phones, but with a 90px floor (not smaller — a too-tiny
           guard reads as an accident, not a mascot) and landing on 140px once there's a bit more
           room. Desktop is bigger still (see the min-width:1280px override below) — that's
           taller than this card's own height, which is why ".passbook-card" below switches
           overflow to visible at that same breakpoint, letting the mascot stand taller than the
           card instead of being clipped to it. Kept as a class (not inline on the <img>) so the
           desktop media query can win — an inline style always beats an external stylesheet rule
           of any specificity unless that rule uses !important, which this file deliberately
           avoids. */
        .warrior-img { width: clamp(90px, 26vw, 140px); height: clamp(90px, 26vw, 140px); }
        @media (min-width: 1280px) {
          /* 200px, not the 260px tried first — that was tall enough to reach up into the speech
             bubble/label text above it on real desktop widths. 200px is still a clear step up
             from the pre-enlargement 130px without covering anything. */
          .warrior-img { width: 200px; height: 200px; }
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

        /* html/body themselves (not just .app-shell below) — otherwise they keep the browser's
           default white, which shows at the edges on mobile during bounce-scroll/rubber-band
           overscroll (the page can render past 100vh momentarily) or behind the safe-area on
           notched phones, regardless of theme. Plain var(--color-primarySoft) here (no JS)
           means it just follows whichever theme is active automatically, same as every other
           themed color in this file — ThemeContext.jsx flips the data-theme attribute these
           variables key off, this rule doesn't need to know about themes at all. Desktop never
           shows this (no bounce-scroll there), so this is invisible/no-op at that breakpoint —
           not a desktop-layout change, just a correctness fix that only ever mattered on mobile. */
        html, body { background: var(--color-primarySoft); }

        /* Mobile-only "everything's a bit bigger" pass (2026-08-07 feedback) — CSS zoom, not
           transform:scale, and on <body> (not just .app-container) deliberately:
           - zoom triggers a real layout recalculation at the larger size, so tap targets grow
             along with the visuals instead of just LOOKING bigger while the actual hit area
             stays the original (smaller) size the way a pure visual transform would.
           - transform on an ancestor also turns it into the containing block for any
             position:fixed descendant, which would silently break BottomNav.jsx/the FABs'
             fixed positioning (they'd start being fixed relative to that ancestor instead of the
             viewport). zoom does neither — fixed elements keep behaving exactly as before, just
             rendered at the larger scale like everything else.
           - <body>, not .app-container, so this reaches EVERYTHING uniformly in one place —
             including BottomNav/the FABs (position:fixed, but still DOM descendants of body) and
             every modal (ModalPortal.jsx renders straight into document.body, so they're body's
             own children too) — not just the scrollable content column.
           1.17 ≈ the "~15-20% bigger" the user asked for. Gated to the mobile range only (same
           breakpoint as everywhere else in this file) — desktop is completely untouched, this
           selector doesn't even match there.

           --mobile-zoom-factor (2026-08-07 follow-up fix): the factor itself now lives in a CSS
           var, not just baked into this one rule — sharedStyles.js's overlay reads it back via
           calc(1 / var(--mobile-zoom-factor, 1)) to cancel this zoom out specifically for every
           bottom-sheet modal (ModalPortal.jsx renders them as direct children of this same zoomed
           body). Without that, overlay/sheet's height/maxHeight (sharedStyles.js's
           var(--app-vh, 100dvh)) is computed from the TRUE unzoomed viewport but then gets
           rendered 1.17x too tall as a zoomed descendant of body — pushing the sheet's lower
           portion (and the date field around where it sits) below the fold, unreachable by
           scroll, with drags falling through to the page behind it instead. Modals are
           deliberately excluded from the "everything's bigger" effect as the fix (they go back to
           their original, pre-zoom size) rather than trying to make the height math zoom-aware,
           since that path also has known zoom+touch/scroll-hit-testing quirks across browsers —
           not worth the risk for a cosmetic-only win on top of forms that must work reliably.
           Falls back to 1 (a no-op, calc(1/1)) wherever --mobile-zoom-factor isn't defined —
           desktop, or any future path that forgets to set it — so this can never accidentally
           double-zoom or invert on an unexpected width. */
        @media (max-width: 1279px) {
          :root { --mobile-zoom-factor: 1.17; }
          body { zoom: var(--mobile-zoom-factor); }
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
        /* padding-top: calc(24px + env(safe-area-inset-top)) (2026-08-07, mobile only — see the
           desktop override further down, which stays a plain 32px with no safe-area term since
           desktop browsers have no notch) — pairs with index.html's viewport-fit=cover: that
           meta tag lets the page extend its BACKGROUND under the status bar/notch, and this
           padding is what keeps the real content (page title, cards) starting safely below it
           instead of getting hidden behind it. CastleBackground.jsx (position:absolute; inset:0
           relative to this same .app-container) automatically extends into that padding too —
           no separate fix needed there, it was always sized off this container's own box. */
        /* bottom padding 84px -> 130px (2026-08-07, second pass — 110px still wasn't enough
           clearance on a real device): matches the FABs' own bottom offset bump below — the
           floating nav pill sits higher/taller than the old flush bar, so scrolled content
           needs more clearance to not tuck in behind it at the very end of a page. */
        .app-container { width: 100%; max-width: 480px; margin: 0 auto; padding: calc(24px + env(safe-area-inset-top)) 18px 130px; position: relative; z-index: 0; }
        /* Floating "glass pill" bottom nav (2026-08-07, mobile only, all themes) — was a
           full-width bar flush with the screen edges/bottom; now floats clear of every edge,
           fully rounded, translucent + blurred. left/right (not a centered fixed width) is what
           makes it a pill spanning "most of the screen with margin" like the reference image,
           rather than a small pill needing its own width/centering math; max-width caps it at
           the same 480px .app-container itself uses, so it doesn't stretch absurdly wide on a
           tablet-width phone still under the 1280px breakpoint.
           color-mix(in srgb, var(--color-white) X%, transparent) — not a flat rgba() — is what
           lets this read the theme's OWN card color and blend it toward transparent, so the
           glass tint automatically matches whichever of the 3 themes is active (arcade's dark
           card color, passbook's white, speedster's dark red-black) with no per-theme override
           needed; same trick used for the active-tab highlight in BottomNav.jsx's own styles.
           backdrop-filter needs the -webkit- prefix too — still required for Safari (iOS is the
           primary mobile target here). */
        .bottom-nav {
          display: flex;
          /* bottom raised from 14px (2026-08-07 feedback: sat too low/close to the edge) —
             max() still keeps it clear of the home-indicator area on notched phones either way. */
          position: fixed; left: 16px; right: 16px; bottom: max(26px, calc(env(safe-area-inset-bottom) + 14px));
          margin: 0 auto; max-width: 480px;
          justify-content: center;
          border-radius: 999px;
          /* 82% -> 55% (2026-08-07 feedback: wanted more see-through, less solid-looking). */
          background: color-mix(in srgb, var(--color-white) 55%, transparent);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        }

        /* Dashboard.jsx's own "+" FAB — mobile math anchors it to the (always-centered-in-
           viewport) 480px column's right edge. At desktop that column isn't centered in the
           full viewport anymore (Sidebar shifts everything right), and its width also isn't a
           fixed number (flexbox may shrink ".app-container" below its max-width on the narrower
           end of the desktop range) — reliably computing "the column's actual right edge" from
           pure viewport-percentage CSS isn't possible in that case. Simplest correct fix: just
           pin it near the real screen corner on desktop instead of chasing the column. */
        /* bottom: 84px -> 108px -> 150px (2026-08-07, second pass — still overlapped the pill
           on a real device at 108px): the bottom nav became a taller floating pill sitting
           higher off the screen edge (".bottom-nav" below) — 84px was tuned for the old
           flush-to-the-edge bar. */
        .dashboard-fab { position: fixed; bottom: 150px; right: 50%; transform: translateX(calc(240px - 60px)); }

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

          /* Bottom sheet -> centered modal on desktop (2026-08-07) — every modal in the app
             already renders a className="sheet" div (13 usages, sharedStyles.js's own sheet
             object supplies the inline styles) inside an overlay div with
             alignItems: "flex-end" (sharedStyles.js), which is what makes it slide up flush
             against the bottom edge on mobile. Rather than touching any of those 13 call sites
             (or overlay's own inline style, which has no className to hook at all), align-self
             here overrides just THIS flex child's own cross-axis alignment within that same
             flex-end container — centering it vertically without needing the parent overlay
             div to change at all. Full corner radius + a real bottom border restore the "actual
             dialog card" look now that it's not visually anchored to the screen edge anymore. */
          .sheet {
            align-self: center;
            border-radius: 20px;
            border-bottom: 1px solid var(--color-border);
            max-height: 85vh;
          }

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
      {levelUpGoalNames && (
        <PartyLevelUpOverlay goalNames={levelUpGoalNames} onClose={() => setLevelUpGoalNames(null)} />
      )}
    </div>
  );
}
