import React from "react";
import { NavLink } from "react-router-dom";
import { NAV_TABS } from "../lib/navTabs.js";

export default function BottomNav() {
  return (
    // "bottom-nav" class is hidden by App.jsx's desktop breakpoint (>=1280px), where
    // Sidebar.jsx takes over navigation instead — this component's own JSX/logic is otherwise
    // untouched, so reverting to mobile-only just means deleting that one CSS rule later.
    //
    // Floating "glass pill" redesign (2026-08-07, mobile only, all themes) — was a full-width
    // bar flush with the screen edges/bottom; now floats with margin on every side, fully
    // rounded, translucent+blurred background. left/right/bottom/border-radius/background all
    // moved into the ".bottom-nav" CSS class (App.jsx) so the desktop breakpoint's own
    // `display:none` override lives alongside them — same reasoning as every other
    // breakpoint-dependent property in this app (an inline style here would always beat a
    // stylesheet media query regardless of specificity).
    <nav className="bottom-nav" style={styles.nav}>
      <div style={styles.inner}>
        {NAV_TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} style={styles.tab}>
            {({ isActive }) => (
              <>
                {/* Rounded highlight behind the active icon (the reference image's own look) —
                    a separate positioned layer behind the icon, not a background on the tab
                    itself, so it doesn't also stretch behind the label text underneath. */}
                <span style={{ ...styles.iconWrap, ...(isActive ? styles.iconWrapActive : {}) }}>
                  <Icon size={24} color={isActive ? "var(--color-primary)" : "var(--color-inkMuted)"} />
                </span>
                <span style={{ ...styles.label, color: isActive ? "var(--color-primary)" : "var(--color-inkMuted)" }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    // display/position/left/right/bottom/border-radius/background/backdrop-filter/box-shadow
    // all live in the ".bottom-nav" CSS class (App.jsx) now — see that rule's own comment for
    // why (color-mix() needs to read each theme's CSS custom properties, which only works from
    // an actual stylesheet rule, not a one-time inline style computed in JS).
    zIndex: 40,
  },
  inner: {
    width: "100%",
    display: "flex",
  },
  tab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "9px 2px 8px",
    textDecoration: "none",
  },
  // icon/label sizes bumped 2026-08-07 (feedback: too small/fiddly to tap) — icon 20->24,
  // iconWrap grown to match, label 10->12. Only ever rendered on mobile (".bottom-nav" is
  // display:none at the desktop breakpoint), so no separate desktop-size override is needed —
  // these values can never apply there regardless.
  iconWrap: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 40, height: 26, borderRadius: 999,
    marginBottom: 1,
  },
  iconWrapActive: {
    // color-mix() again (not a flat hex) so this tint follows --color-primary per-theme
    // automatically — same reasoning as ".bottom-nav" background in App.jsx.
    background: "color-mix(in srgb, var(--color-primary) 16%, transparent)",
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
  },
};
