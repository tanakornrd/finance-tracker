import React, { createContext, useContext, useEffect, useState } from "react";
import { THEMES, DEFAULT_THEME, THEME_CSS } from "../theme/themes.js";

const STORAGE_KEY = "financeTrackerTheme";
const MASCOT_ANIM_STORAGE_KEY = "financeTrackerMascotAnimation";
const SOUND_STORAGE_KEY = "financeTrackerMascotSound";
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

// Default OFF, full stop — unlike animation (which has no way to surprise/bother anyone nearby),
// sound can genuinely startle someone or feel out of place the moment this app is opened in a
// public or work setting. Opt-in only; no media-query equivalent to defer to here.
function readStoredSoundEnabled() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

// Applies the theme by setting data-theme on <html> (not just this subtree) — the CSS variables
// in THEME_CSS are scoped to :root[data-theme=...], and things like the scrollbar thumb color
// and the page's own background live outside the React tree's root div.
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [mascotAnimationEnabled, setMascotAnimationEnabledState] = useState(readStoredMascotAnimation);
  const [soundEnabled, setSoundEnabledState] = useState(readStoredSoundEnabled);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // <meta name="theme-color"> can't read CSS custom properties itself (App.jsx's
    // `html, body { background: var(--color-primarySoft) }` already keeps the page's own
    // background in sync with zero JS) — this reads the SAME variable, now that data-theme is
    // set, and copies its resolved value across so mobile browser chrome (where supported)
    // matches too, instead of staying on index.html's static default forever.
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      const color = getComputedStyle(document.documentElement).getPropertyValue("--color-primarySoft").trim();
      if (meta && color) meta.setAttribute("content", color);
    } catch {
      // Best-effort only — theme-color is a mobile-chrome nicety, not core functionality.
    }
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

  function setSoundEnabled(enabled) {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // persistence-is-a-nice-to-have, same as theme above
    }
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, themes: THEMES, mascotAnimationEnabled, setMascotAnimationEnabled, soundEnabled, setSoundEnabled }}
    >
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
