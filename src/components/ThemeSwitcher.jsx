import React, { useState } from "react";
import { Palette } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

// Fixed bottom-left, mirroring Dashboard's own bottom-right "+" FAB (same `bottom`, same
// centered-container math) — that corner is empty on every route, unlike the top corners
// which every page already uses for its title/month badge. Mobile-only (<1280px): at desktop
// widths this whole floating control is hidden (see App.jsx's ".theme-switcher-fab" CSS rule)
// in favor of ThemeMenuList rendered directly inside Sidebar.jsx.
const fabStyle = {
  position: "fixed",
  bottom: 84,
  left: "50%",
  transform: "translateX(calc(-240px + 8px))",
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
  bottom: 136,
  left: "50%",
  transform: "translateX(calc(-240px + 8px))",
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
  const { theme, setTheme, themes, mascotAnimationEnabled, setMascotAnimationEnabled } = useTheme();
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
