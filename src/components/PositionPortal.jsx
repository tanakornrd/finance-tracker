import { createPortal } from "react-dom";

// Plain portal to document.body — NO body scroll lock. This is what ModalPortal.jsx itself used
// to be before 2026-08-08's scroll-lock addition (see that file's own comment for why real
// dialogs need it). Split out (2026-08-08) once the scroll lock turned out to leak into places
// that were only ever using ModalPortal for its ORIGINAL job — escaping .app-container's stacking
// context so a fixed-position element's z-index compares at the true top level — not because they
// were an actual dialog blocking the page underneath.
//
// Concretely: WarriorMascot.jsx's and MageMascot.jsx's mobile speech bubbles portal themselves
// out for exactly that stacking-context reason, but they are not dialogs — nothing about them
// should stop the page behind them from scrolling. BudgetMageCard.jsx's mage shows its advice
// bubble essentially continuously (any time it has a message, which is nearly always), so once it
// was (indirectly) locking body scroll via ModalPortal, the Budgets page was permanently stuck
// unable to scroll — not just "while a bubble is open" the way a real modal's brief lock reads,
// but for the page's entire visit. That's the bug this component fixes: same portal-out behavior,
// none of the scroll-lock side effect.
export default function PositionPortal({ children }) {
  return createPortal(children, document.body);
}
