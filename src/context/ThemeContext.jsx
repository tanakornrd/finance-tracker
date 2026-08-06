import React, { createContext, useContext, useEffect, useState } from "react";
import { THEMES, DEFAULT_THEME, THEME_CSS } from "../theme/themes.js";

const STORAGE_KEY = "financeTrackerTheme";
const MASCOT_ANIM_STORAGE_KEY = "financeTrackerMascotAnimation";
const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === stored) ? stored : DEFAULT_THEME;
  } catch {
    // localStorage can throw in some private-browsing modes — fall back rather than crash the app.
    return DEFAULT_THEME;
  }
}

// Default off if the OS/browser already asked for reduced motion — matches the user's own
// accessibility setting instead of overriding it with an "on" default, even before they've
// touched the in-app toggle at all.
function readStoredMascotAnimation() {
  try {
    const stored = localStorage.getItem(MASCOT_ANIM_STORAGE_KEY);
    if (stored === "on") return true;
    if (stored === "off") return false;
  } catch {
    // fall through to the media-query default below
  }
  try {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

// Applies the theme by setting data-theme on <html> (not just this subtree) — the CSS variables
// in THEME_CSS are scoped to :root[data-theme=...], and things like the scrollbar thumb color
// and the page's own background live outside the React tree's root div.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [mascotAnimationEnabled, setMascotAnimationEnabledState] = useState(readStoredMascotAnimation);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Same as above — persistence is a nice-to-have, not worth crashing over.
    }
  }, [theme]);

  function setTheme(id) {
    if (THEMES.some((t) => t.id === id)) setThemeState(id);
  }

  function setMascotAnimationEnabled(enabled) {
    setMascotAnimationEnabledState(enabled);
    try {
      localStorage.setItem(MASCOT_ANIM_STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // persistence-is-a-nice-to-have, same as theme above
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, mascotAnimationEnabled, setMascotAnimationEnabled }}>
      <style>{THEME_CSS}</style>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
