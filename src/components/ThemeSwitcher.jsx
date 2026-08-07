import React, { useState } from "react";
import { Palette, LogOut } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Fixed bottom-left — that corner is empty on every route, unlike the top corners which every
// page already uses for its title/month badge. Mobile-only (<1280px): at desktop widths this
// whole floating control is hidden (see App.jsx's ".theme-switcher-fab" CSS rule) in favor of
// ThemeMenuList rendered directly inside Sidebar.jsx.
//
// Anchored with a plain `left: 18px` (matching ".app-container"'s own horizontal padding —
// App.jsx) instead of the previous "center of viewport, then shift left by half the assumed
// 480px container width" calc: that math only kept the button on-screen when the viewport was
// wider than ~464px, which most real phones aren't, so the button rendered partly or fully off
// the left edge (unclickable) on an actual phone despite looking fine in a wide desktop
// browser. A fixed-pixel offset from the real screen edge has no such assumption to break.
const fabStyle = {
  position: "fixed",
  // 84 -> 108 (2026-08-07): the bottom nav became a taller floating pill sitting higher off the
  // screen edge (App.jsx's ".bottom-nav") — 84 was tuned for the old flush-to-the-edge bar and
  // now overlapped it.
  bottom: 108,
  left: 18,
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "var(--color-white)",
  border: "1px solid var(--color-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  zIndex: 42,
};

// Opens upward from the FAB, not downward — downward would run under the bottom nav bar.
const menuStyle = {
  position: "fixed",
  bottom: 160, // same +52 gap above fabStyle.bottom as before (136 - 84 = 52; 108 + 52 = 160)
  left: 18,
  background: "var(--color-white)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  padding: 6,
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
  zIndex: 42,
  minWidth: 160,
};

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: "9px 10px",
  borderRadius: 8,
  border: "none",
  background: "none",
  color: "var(--color-ink)",
  fontSize: 13,
  textAlign: "left",
};

const itemActiveStyle = { background: "var(--color-primaryTint)", color: "var(--color-primary)", fontWeight: 600 };
const dividerStyle = { height: 1, background: "var(--color-divider)", margin: "6px 4px" };
const toggleRowStyle = { ...itemStyle, justifyContent: "space-between", cursor: "pointer" };

// The actual theme list + animation toggle — no positioning of its own, so it can be dropped
// into a floating popover (mobile, below) or straight into Sidebar.jsx's flow (desktop) as-is.
export function ThemeMenuList({ onSelect }) {
  const { theme, setTheme, themes, mascotAnimationEnabled, setMascotAnimationEnabled, soundEnabled, setSoundEnabled } = useTheme();
  const { signOut } = useAuth();
  return (
    <>
      {themes.map((t) => (
        <button
          key={t.id}
          type="button"
          className="theme-menu-item"
          style={{ ...itemStyle, ...(t.id === theme ? itemActiveStyle : {}) }}
          onClick={() => {
            setTheme(t.id);
            onSelect?.();
          }}
        >
          <span>{t.emoji}</span>
          <span>{t.label}</span>
        </button>
      ))}
      <div style={dividerStyle} />
      <label style={toggleRowStyle}>
        <span>แอนิเมชันมาสคอต</span>
        <input
          type="checkbox"
          checked={mascotAnimationEnabled}
          onChange={(e) => setMascotAnimationEnabled(e.target.checked)}
        />
      </label>
      {/* Separate toggle from animation on purpose — sound is opt-in-only by default (see
          ThemeContext.jsx's readStoredSoundEnabled), unlike animation, since it can genuinely
          bother someone nearby in a way a silent visual bounce never does. */}
      <label style={toggleRowStyle}>
        <span>เสียงประกอบ</span>
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={(e) => setSoundEnabled(e.target.checked)}
        />
      </label>
      <div style={dividerStyle} />
      {/* Lives here (not a standalone floating button) so it's automatically positioned safely
          on every breakpoint the same way the theme list already is — mobile popover, desktop
          Sidebar — instead of being one more independently-floating fixed element that could
          collide with a page's own top-corner content (which is what happened when this was a
          separate always-visible button fixed to the top-right corner). */}
      <button
        type="button"
        className="theme-menu-item"
        style={{ ...itemStyle, color: "var(--color-danger)" }}
        onClick={() => {
          signOut();
          onSelect?.();
        }}
      >
        <LogOut size={14} />
        <span>ออกจากระบบ</span>
      </button>
    </>
  );
}

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);

  return (
    <div className="theme-switcher-fab">
      <button type="button" style={fabStyle} onClick={() => setOpen((o) => !o)} aria-label="เปลี่ยนธีม">
        <Palette size={17} color="var(--color-primary)" />
      </button>
      {open && (
        <>
          {/* Invisible full-screen layer to catch outside clicks and close the menu — same
              dismiss pattern as the overlay/sheet used for every other popover in the app. */}
          <div style={{ position: "fixed", inset: 0, zIndex: 41 }} onClick={() => setOpen(false)} />
          <div style={menuStyle}>
            <ThemeMenuList onSelect={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
