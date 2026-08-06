import React from "react";
import { NavLink } from "react-router-dom";
import { NAV_TABS } from "../lib/navTabs.js";

export default function BottomNav() {
  return (
    // "bottom-nav" class is hidden by App.jsx's desktop breakpoint (>=1280px), where
    // Sidebar.jsx takes over navigation instead — this component's own JSX/logic is otherwise
    // untouched, so reverting to mobile-only just means deleting that one CSS rule later.
    <nav className="bottom-nav" style={styles.nav}>
      <div style={styles.inner}>
        {NAV_TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} style={styles.tab}>
            {({ isActive }) => (
              <>
                <Icon size={20} color={isActive ? "var(--color-primary)" : "var(--color-inkMuted)"} />
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
    // display is set via the ".bottom-nav" CSS class (App.jsx), not inline — an inline value
    // here would win over any stylesheet rule for the same property regardless of specificity,
    // which would make the desktop breakpoint's "display: none" unable to hide this at all.
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    background: "var(--color-white)",
    borderTop: "1px solid var(--color-border)",
    boxShadow: "0 -2px 10px rgba(15,42,92,0.06)",
    zIndex: 40,
  },
  inner: {
    width: "100%",
    maxWidth: 480,
    display: "flex",
  },
  tab: {
    flex: 1,
    maxWidth: 96,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    padding: "10px 4px 8px",
    textDecoration: "none",
  },
  tabActive: {},
  label: {
    fontSize: 10,
    fontWeight: 600,
  },
};
