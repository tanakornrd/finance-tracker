import { useEffect } from "react";
import { createPortal } from "react-dom";

// Renders its children into document.body instead of wherever it's mounted in the React tree.
// Every bottom-sheet modal in the app (Dashboard.jsx, TransactionDetail.jsx, AddBudgetSheet.jsx,
// PendingBillsCard.jsx, Upcoming.jsx, Accounts.jsx, Trash.jsx, MonthPickerSheet.jsx — all built
// on sharedStyles.js's `overlay`/`sheet`) needs this wrapper around its outermost overlay <div>.
//
// Why: App.jsx's ".app-container" has an explicit `position:relative; z-index:0` (added for an
// unrelated reason — see that file's comment, it's there so CastleBackground's z-index:-1 stays
// contained instead of escaping to the document root). Setting an explicit z-index is exactly
// what makes an element establish its own CSS stacking context. Once app-container is a
// stacking context, any z-index set on something INSIDE it (like the modal overlay's
// z-index:50) is only ever compared against other things also inside app-container — from
// outside, the entire app-container subtree is flattened to a single z-index:0. BottomNav
// (z-index:40) and ThemeSwitcher's FAB (z-index:42) are direct siblings of app-container, not
// descendants of it, so they compare against that flattened "0" — and win, regardless of how
// high the modal's own z-index is set. That's what let the bottom nav bar visually sit on top
// of the last ~70px of every modal, cutting off its submit button.
//
// Portaling the modal to document.body sidesteps the whole problem: it's no longer a descendant
// of app-container at all, so its z-index:50 is compared at the true top level, where it
// legitimately outranks both.
//
// Body scroll lock (2026-08-08): while ANY modal is mounted, the page behind it is frozen in
// place — position:fixed on <body> itself at its current scroll offset, not just
// overflow:hidden (overflow:hidden alone still lets iOS Safari's own "scroll the focused input
// into view" behavior nudge the underlying document when a text field inside the modal is
// focused, since that behavior operates on the real document scroll position, not on what's
// visually on top of it). Real-device symptom this fixes: focusing an input in the modal on iOS
// caused the DASHBOARD page behind it to visibly shift/show through the modal — the modal itself
// was never broken, the page underneath it was moving. A module-level counter (not a plain
// boolean) makes this safe if more than one ModalPortal is ever mounted at once (nesting isn't
// currently used anywhere in this app, but this way a future one doesn't silently unlock the
// page early when the inner one closes while the outer one is still open).
let lockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.overflow = "";
    window.scrollTo(0, savedScrollY);
  }
}

export default function ModalPortal({ children }) {
  useEffect(() => {
    lockBodyScroll();
    return unlockBodyScroll;
  }, []);

  return createPortal(children, document.body);
}
