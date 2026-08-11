// Random pose pools for the arcade theme's Dashboard mascots (WarriorMascot in the net-worth
// card, MageMascot in SafeToSpendCard's "ใช้ได้อีกวันนี้" card). Dashboard.jsx picks ONE entry per
// pool on mount (useState's lazy initializer runs exactly once, not on every re-render) and keeps
// it fixed until the page is reloaded — see Dashboard.jsx's own comment where these are consumed.
//
// Each entry is {src, dx, dy, scale} — NOT just a URL (2026-08-11, per-pose tuning pass). A single
// shared position/size formula turned out not to work: every source photo has the character
// framed differently within its own canvas (some centered, some off to one side; some with
// decoration — sparkles, a summon circle, question marks — extending further above/beside the
// character than others), so the same box that looks right for one pose puts another visibly out
// of place. dx/dy (px, added on TOP of the shared CSS position via `transform: translate()`) and
// scale (multiplier, added via the same transform) are per-pose corrections tuned by hand, live
// against the actual deployed page, so each individual pose reads as well-placed/well-sized on its
// own — not because they all share one formula. 0/0/1 (no correction needed) for poses whose own
// framing already matches the shared baseline.
//
// Index 0 is always the original, most-tested pose (the one every screenshot/feedback round in
// this codebase's history was actually checked against) — kept first so it's the obvious fallback
// if this array is ever indexed defensively, not because the pick logic favors it.
//
// All image files are pose photos the user (ป้อ) supplied directly from their own asset folder —
// per CLAUDE.md's mascot rule, nothing here is generated art. Adding a pose 8/9/... later means
// dropping a new cropped PNG into src/assets/warrior|mage/, importing it below, and hand-tuning
// its own dx/dy/scale live the same way this whole pool was — nothing else in Dashboard.jsx/
// WarriorMascot.jsx/MageMascot.jsx needs to change.

import warriorGuard from "../assets/mascot-warrior.png";
import warriorIdle from "../assets/warrior/idle.png";
import warriorAttack from "../assets/warrior/attack.png";
import warriorCelebrate from "../assets/warrior/celebrate.png";
import warriorVictorySlime from "../assets/warrior/victory-slime.png";
import warriorProud from "../assets/warrior/proud.png";
import warriorWorried from "../assets/warrior/worried.png";

export const WARRIOR_POSES = [
  { src: warriorGuard, dx: 0, dy: 0, scale: 1 },
  { src: warriorIdle, dx: 0, dy: 0, scale: 1 },
  { src: warriorAttack, dx: 0, dy: 0, scale: 1 },
  { src: warriorCelebrate, dx: 0, dy: 0, scale: 1 },
  { src: warriorVictorySlime, dx: 0, dy: 0, scale: 1 },
  { src: warriorProud, dx: 0, dy: 0, scale: 1 },
  { src: warriorWorried, dx: 0, dy: 0, scale: 1 },
];

import mageStaff from "../assets/mascot-mage.png";
import mageSummon from "../assets/mage/summon.png";
import mageMeditate from "../assets/mage/meditate.png";
import mageClock from "../assets/mage/clock.png";
import mageConfused from "../assets/mage/confused.png";
import magePortalWalk from "../assets/mage/portal-walk.png";
import mageStandingCalm from "../assets/mage/standing-calm.png";
import magePortalRing from "../assets/mage/portal-ring.png";

export const MAGE_POSES = [
  { src: mageStaff, dx: 0, dy: 0, scale: 1 },
  { src: mageSummon, dx: 0, dy: 0, scale: 1 },
  { src: mageMeditate, dx: 0, dy: 0, scale: 1 },
  { src: mageClock, dx: 0, dy: 0, scale: 1 },
  { src: mageConfused, dx: 0, dy: 0, scale: 1 },
  { src: magePortalWalk, dx: 0, dy: 0, scale: 1 },
  { src: mageStandingCalm, dx: 0, dy: 0, scale: 1 },
  { src: magePortalRing, dx: 0, dy: 0, scale: 1 },
];
