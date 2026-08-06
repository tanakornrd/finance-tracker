import React from "react";
import { NavLink } from "react-router-dom";
import { NAV_TABS } from "../lib/navTabs.js";
import { ThemeMenuList } from "./ThemeSwitcher.jsx";

// Desktop-only (>=1280px, see App.jsx's ".app-sidebar" CSS rule — display:none below that,
// so this never renders/participates in layout on mobile at all). Persistent left nav replacing
// BottomNav.jsx for wide screens, plus the theme controls inline instead of behind a floating
// FAB, since a permanent sidebar has room to just show them.
export default function Sidebar() {
  return (
    <aside className="app-sidebar">
      <div style={styles.brand}>
        <div style={{ fontSize: 12, letterSpacing: 2, color: "var(--color-inkMuted)" }}>สมุดบัญชีของฉัน</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink)" }}>บันทึกรายรับ-รายจ่าย</div>
      </div>

      <nav style={styles.nav}>
        {NAV_TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} style={styles.link}>
            {({ isActive }) => (
              <div style={{ ...styles.linkInner, ...(isActive ? styles.linkInnerActive : {}) }}>
                <Icon size={18} color={isActive ? "var(--color-primary)" : "var(--color-inkMuted)"} />
                <span style={{ color: isActive ? "var(--color-primary)" : "var(--color-ink)", fontWeight: isActive ? 700 : 500 }}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={styles.settings}>
        <div style={styles.settingsLabel}>ธีม</div>
        <ThemeMenuList />
      </div>
    </aside>
  );
}

const styles = {
  brand: { padding: "8px 4px 20px", borderBottom: "1px solid var(--color-divider)", marginBottom: 12 },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  link: { textDecoration: "none" },
  linkInner: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, fontSize: 14 },
  linkInnerActive: { background: "var(--color-primaryTint)" },
  settings: { borderTop: "1px solid var(--color-divider)", marginTop: 12, paddingTop: 12 },
  settingsLabel: { fontSize: 11, color: "var(--color-inkMuted)", fontWeight: 600, padding: "0 10px 6px" },
};
