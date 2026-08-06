// Shared visual patterns from the passbook theme, reused by Dashboard.jsx's own widgets
// and the newer self-contained cards (SafeToSpendCard, MonthComparisonBar,
// PendingBillsCard) so each doesn't redefine the same overlay/sheet/input styles.

// Design tokens — every color used across the app, named once. Each one is a CSS custom
// property (defined per-theme in ThemeContext.jsx's <style> block) rather than a literal hex,
// so switching themes just swaps the --color-* values at :root — every consumer of `colors`
// (and every file that was hardcoding these same hex values directly, now converted to the
// same var() calls) repaints without any component needing to know a theme exists.
export const colors = {
  ink: "var(--color-ink)", // headings, primary numbers
  inkMuted: "var(--color-inkMuted)", // secondary text, labels
  inkFaint: "var(--color-inkFaint)", // faintest text (e.g. "(เดือนก่อน ...)" asides)
  white: "var(--color-white)", // card/surface background — name is literal only in the default theme

  primary: "var(--color-primary)",
  primaryTint: "var(--color-primaryTint)",
  primarySoft: "var(--color-primarySoft)", // page background
  border: "var(--color-border)",
  divider: "var(--color-divider)",
  inputBg: "var(--color-inputBg)",
  ring: "var(--color-ring)",

  // Red is kept strictly functional (debt, overspend) across every theme — never used as a
  // brand/identity color, so a theme swap never has to reinterpret what "danger" means.
  danger: "var(--color-danger)",
  dangerTint: "var(--color-dangerTint)",
  dangerSoft: "var(--color-dangerSoft)",
  dangerBorder: "var(--color-dangerBorder)",

  // "Growing money" contexts (goals, investments) — a second accent distinct from primary/danger.
  secondary: "var(--color-secondary)",
  secondaryTint: "var(--color-secondaryTint)",
  secondarySoft: "var(--color-secondarySoft)",
  secondaryBorder: "var(--color-secondaryBorder)",

  // The one hue meant to visually pop — warning banners and, deliberately, positive/achievement
  // highlights (goal reached, target hit) — "notable", not just "caution".
  accent: "var(--color-accent)",
  accentTint: "var(--color-accentTint)",
  accentBorder: "var(--color-accentBorder)",
  accentInk: "var(--color-accentInk)",

  success: "var(--color-success)",
  successTint: "var(--color-successTint)",
};

export const card = { background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 16, boxShadow: "0 1px 3px rgba(15,42,92,0.05)" };
export const sectionHead = { display: "flex", justifyContent: "space-between", alignItems: "center", color: colors.ink, fontSize: 14, fontWeight: 600, margin: "18px 2px 10px" };
export const textBtn = { background: "none", border: "none", color: colors.primary, fontSize: 12, fontWeight: 600 };
export const txRow = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${colors.divider}` };
export const txIcon = { width: 34, height: 34, borderRadius: 10, background: colors.divider, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 };

// A small tinted circular chip for an icon — the same treatment txIcon already uses,
// generalized so cards for different account/tip types can each get their own tint.
export function iconChip(bg, size = 34) {
  return { width: size, height: size, borderRadius: size >= 30 ? 10 : 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
}

export const achievementBadge = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: colors.accentTint, color: colors.accentInk, fontSize: 12, fontWeight: 700, border: `1px solid ${colors.accentBorder}` };

export const navBtn = { background: "none", border: "none", padding: 6 };
export const yearSwitch = { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 16 };
export const monthGrid = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 };
export const monthGridBtn = { padding: "12px 4px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.primarySoft, color: colors.ink, fontSize: 13, fontWeight: 600 };
export const monthGridBtnActive = { background: colors.primary, color: colors.white, borderColor: colors.primary };

// Expense/income/transfer type toggle — identical base shared by Dashboard.jsx and
// Accounts.jsx; each file still defines its own extra "active" variant on top (e.g.
// kindActiveGoal, kindActiveRepay) for the options only it has.
export const kindToggle = { display: "flex", gap: 8, marginBottom: 16 };
export const kindBtn = { flex: 1, padding: "10px 4px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.primarySoft, color: colors.inkMuted, fontSize: 12, fontWeight: 600 };
export const kindActiveInc = { background: colors.primaryTint, color: colors.primary, borderColor: colors.primary };
export const kindActiveExp = { background: colors.dangerTint, color: colors.danger, borderColor: colors.danger };

export const overlay = { position: "fixed", inset: 0, background: "rgba(15,42,92,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 };
export const sheet = { width: "100%", maxWidth: 480, background: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, border: `1px solid ${colors.border}`, borderBottom: "none", padding: "20px 20px 28px", maxHeight: "85vh", overflowY: "auto" };
export const sheetHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
export const iconBtn = { background: "none", border: "none", padding: 4 };
export const label = { display: "block", fontSize: 12, color: colors.inkMuted, margin: "12px 0 6px" };
export const input = { width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.ink, fontSize: 14 };
export const submitBtn = { width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 10, border: "none", background: colors.primary, color: colors.white, fontWeight: 700, fontSize: 14 };
