import React, { useRef } from "react";
import { Calendar } from "lucide-react";
import { dateInput } from "./sharedStyles.js";

// Wraps every `<input type="date">` in the app (2026-08-08, replacing the raw input at every
// call site) — see dateInput's own comment in sharedStyles.js: `-webkit-appearance: none` there
// fixed the box overflowing its own width, but as a side effect it left Chrome's native
// calendar-picker-indicator icon still VISUALLY drawn while no longer reliably clickable
// (reported: "ไม่มีให้กดปฏิทิน" — looked present, did nothing). Rather than chase that
// browser-specific quirk, this renders its own always-clickable calendar button instead:
// `inputRef.current.showPicker()` (supported in every browser this app targets — Chrome 99+,
// Safari 16.4+/iOS 16.4+) opens the exact same native date picker the icon used to, just
// triggered from a button we control completely instead of a pseudo-element whose click
// behavior depends on `appearance`. The real native indicator itself is hidden globally
// (App.jsx's `input[type="date"]::-webkit-calendar-picker-indicator` rule) so there's only ever
// one calendar icon on screen, not two competing ones.
// style: applies to the OUTER wrapper (e.g. AccountDetail.jsx's two side-by-side date filters
// need `flex: 1` each to split their row evenly) — not merged into the input's own style, so a
// caller can't accidentally clobber the paddingRight this component depends on to keep its own
// calendar button from overlapping the typed date text.
export default function DateField({ value, onChange, required, style }) {
  const ref = useRef(null);
  return (
    <div style={{ position: "relative", ...style }}>
      <input
        ref={ref}
        type="date"
        required={required}
        value={value}
        onChange={onChange}
        style={{ ...dateInput, paddingRight: 38 }}
      />
      <button
        type="button"
        onClick={() => ref.current?.showPicker?.()}
        aria-label="เปิดปฏิทินเลือกวันที่"
        style={{
          position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", padding: 6, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Calendar size={16} color="var(--color-inkMuted)" />
      </button>
    </div>
  );
}
