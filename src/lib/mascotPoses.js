// Random pose pools for the arcade theme's Dashboard mascots (WarriorMascot in the net-worth
// card, MageMascot in SafeToSpendCard's "ใช้ได้อีกวันนี้" card). Dashboard.jsx picks ONE index per
// pool on mount (useState's lazy initializer runs exactly once, not on every re-render) and keeps
// it fixed until the page is reloaded — see Dashboard.jsx's own comment where these are consumed.
//
// Index 0 is always the original, most-tested pose (the one every screenshot/feedback round in
// this codebase's history was actually checked against) — kept first so it's the obvious fallback
// if this array is ever indexed defensively, not because the pick logic favors it.
//
// All image files are pose photos the user (ป้อ) supplied directly from their own asset folder —
// per CLAUDE.md's mascot rule, nothing here is generated art. Adding a pose 8/9/... later is just
// dropping a new cropped PNG into src/assets/warrior|mage/ and pushing its import below; nothing
// else in Dashboard.jsx/WarriorMascot.jsx/MageMascot.jsx needs to change.

import warriorGuard from "../assets/mascot-warrior.png";
import warriorIdle from "../assets/warrior/idle.png";
import warriorAttack from "../assets/warrior/attack.png";
import warriorCelebrate from "../assets/warrior/celebrate.png";
import warriorVictorySlime from "../assets/warrior/victory-slime.png";
import warriorProud from "../assets/warrior/proud.png";
import warriorWorried from "../assets/warrior/worried.png";

export const WARRIOR_POSES = [
  warriorGuard,
  warriorIdle,
  warriorAttack,
  warriorCelebrate,
  warriorVictorySlime,
  warriorProud,
  warriorWorried,
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
  mageStaff,
  mageSummon,
  mageMeditate,
  mageClock,
  mageConfused,
  magePortalWalk,
  mageStandingCalm,
  magePortalRing,
];
