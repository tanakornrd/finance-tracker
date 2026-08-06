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
export default function ModalPortal({ children }) {
  return createPortal(children, document.body);
}
