// Two themes for now (per the initial validation pass — see ThemeContext.jsx): the original
// "สมุดบัญชี" (passbook) look, and a new "อาร์เขด 8-บิต" (8-bit arcade) look. Adding a further
// theme later is just another entry here + another :root[data-theme="..."] block below; no
// component code needs to change, since every component already reads colors through the
// --color-* custom properties (see sharedStyles.js).
//
// Scope note: only color and number-font swap per theme for this first pass. Icons stay as
// lucide-react's default set in both themes — re-skinning icons per theme is a larger, separate
// change (every icon import becomes a theme-aware lookup) deferred until these two themes are
// validated, per the plan agreed with the user.
// "speedster" is a color-and-vibe homage to a well-known red/yellow superhero, deliberately
// named/labeled generically rather than with the trademarked character name — color palettes
// aren't copyrightable, but the actual name and logo are, so this stays on the safe side of
// "inspired by" without claiming any official license or reproducing artwork.
//
// "spiderhero" (ฮีโร่ใยแมงมุม) previously lived here too — removed per the user's decision to
// drop it (design work on its mascot never landed). Its color block, .num override, mascot
// component, and corner-web decoration are all gone from this codebase, not just unlisted here;
// see ThemeContext.jsx's readStoredTheme() for how a browser that still has "spiderhero" saved
// in localStorage from before this removal falls back to DEFAULT_THEME automatically rather
// than erroring.
export const THEMES = [
  { id: "passbook", label: "สมุดบัญชี", emoji: "📘" },
  { id: "arcade", label: "อาร์เขด 8-บิต", emoji: "🕹️" },
  { id: "speedster", label: "นักวิ่งสายฟ้า", emoji: "⚡" },
];

export const DEFAULT_THEME = "passbook";

// Thai body text stays on IBM Plex Sans Thai in every theme deliberately — 'Press Start 2P'
// (and most pixel/display fonts) has no Thai glyphs at all, so forcing it app-wide would make
// every Thai label fall back silently and look inconsistent with the numbers. Instead the pixel
// font is scoped to `.num` only (App.jsx) — that class already wraps just currency figures/digits,
// which are always Latin characters, so the theme fully reaches the money on screen without ever
// touching Thai text.
export const THEME_CSS = `
:root[data-theme="passbook"] {
  --color-ink: #0F2A5C;
  --color-inkMuted: #5B6B8C;
  --color-inkFaint: #B7C3DA;
  --color-white: #FFFFFF;

  --color-primary: #1D4ED8;
  --color-primaryTint: #EAF1FF;
  --color-primarySoft: #F3F7FD;
  --color-border: #DDE7F7;
  --color-divider: #EEF3FB;
  --color-inputBg: #F9FBFE;
  --color-ring: #C7D6EE;

  --color-danger: #DC3D32;
  --color-dangerTint: #FFF0EE;
  --color-dangerSoft: #FFF5F4;
  --color-dangerBorder: #F3C6C0;

  --color-secondary: #0D9488;
  --color-secondaryTint: #E0F5F3;
  --color-secondarySoft: #F5FCFB;
  --color-secondaryBorder: #B9E4DE;

  --color-accent: #E8A33D;
  --color-accentTint: #FFF7E6;
  --color-accentBorder: #F0D584;
  --color-accentInk: #8A5A00;

  --color-success: #1D8A4E;
  --color-successTint: #E9F7EF;

  --font-num: 'Fraunces', serif;
  --scrollbar-thumb: #C7D6EE;
}

/* 8-bit arcade: dark cabinet background, neon accents. "white" (the card/surface role used
   throughout the app) is remapped to a dark purple surface here — every card, sheet, and input
   background repaints automatically since they all read colors.white rather than a literal
   color, without any component caring that "white" no longer means white. */
:root[data-theme="arcade"] {
  --color-ink: #F5F3FF;
  --color-inkMuted: #9D8FC7;
  --color-inkFaint: #5A4E85;
  --color-white: #1A1030;

  --color-primary: #00E5FF;
  --color-primaryTint: #0A2E3D;
  --color-primarySoft: #0D0221;
  --color-border: #3D2E6B;
  --color-divider: #2A1F4D;
  --color-inputBg: #150A2E;
  --color-ring: #4B3A85;

  --color-danger: #FF3864;
  --color-dangerTint: #3D0A1A;
  --color-dangerSoft: #2A0512;
  --color-dangerBorder: #7A1F3D;

  --color-secondary: #39FF14;
  --color-secondaryTint: #0F2E0A;
  --color-secondarySoft: #0A1F08;
  --color-secondaryBorder: #1F5C14;

  --color-accent: #FFD700;
  --color-accentTint: #3D3005;
  --color-accentBorder: #7A5C0A;
  --color-accentInk: #FFD700;

  --color-success: #39FF14;
  --color-successTint: #0F2E0A;

  /* Money figures and transaction text stay on the same readable serif every other theme's
     ".num" uses — Press Start 2P is reserved for headings/buttons only (see the
     [data-theme="arcade"] .page-title/.section-head/button rule below), never for amounts a
     user actually has to read quickly. No scale-down hack needed here (unlike the pixel-font
     version this replaced) since Fraunces is the same width class already tuned for passbook's
     tightest columns. */
  --font-num: 'Fraunces', serif;
  --scrollbar-thumb: #4B3A85;

  /* Castle/dungeon backdrop tokens — CastleBackground.jsx reads these instead of hardcoding
     colors, so retheming the dungeon later (or reusing the component for another dark theme)
     is just new values here. Brightened from the first pass (lighter stone, lower overlay,
     stronger torch glow) per the "too dark/flat" feedback — --castle-overlay dropping from 0.55
     to 0.32 is the main lever, since every other layer here only ever shows through it. */
  --castle-sky-top: #140b2e;
  --castle-sky-bottom: #2d1f52;
  --castle-star: #f5f3ff;
  --castle-moon: #fff6d8;
  --castle-moon-glow: rgba(255, 246, 216, 0.3);
  --castle-far: #3a2a5c;
  --castle-stone: #3a2a5c;
  --castle-stone-dark: #241a3d;
  --castle-mortar: #180f2b;
  --castle-torch: #ffb347;
  --castle-torch-glow: rgba(255, 160, 60, 0.5);
  --castle-window: #7fd8ff;
  --castle-window-warm: #ffd166;
  --castle-flag: #ff3864;
  --castle-moss: #2f6b3a;
  --castle-overlay: rgba(10, 5, 22, 0.32);
}

/* Pixel font scoped to headings and button labels only, per the agreed plan — never to money
   amounts or transaction/description text (those stay on --font-num / the app's default Thai
   sans, see above and App.jsx's global "*" font-family rule). ".page-title" and
   ".section-head" are plain marker classes added alongside each route's existing inline style
   object (see sharedStyles.js's sectionHead and each route's own page-title style) — they add
   no visual styling of their own, just a hook for this selector.
   The fallback chain keeps 'IBM Plex Sans Thai' right after the pixel font (instead of falling
   through to a generic monospace) because Press Start 2P has zero Thai glyphs: the browser
   still picks the pixel font for every Latin letter/digit it *does* cover, and transparently
   drops to the readable Thai font per-glyph for the Thai text mixed into the same heading —
   there's no need to hand-split Thai/English words to get both effects at once. */
[data-theme="arcade"] .page-title,
[data-theme="arcade"] .section-head,
[data-theme="arcade"] .section-head *,
[data-theme="arcade"] button {
  font-family: 'Press Start 2P', 'IBM Plex Sans Thai', monospace;
}

/* Press Start 2P is ~2.5x wider per character than IBM Plex Sans Thai at the same font-size —
   every heading/button here sets its own px font-size inline or via a shared style object, so a
   plain CSS font-size couldn't win against that (inline always wins over a normal-weight rule).
   !important is the deliberate exception: it's the one thing that legitimately outranks an
   inline declaration, which is exactly what's needed to hand headings/buttons a much smaller
   pixel-appropriate size without touching every inline style object individually. */
[data-theme="arcade"] .page-title { font-size: 15px !important; letter-spacing: 0.5px; }
[data-theme="arcade"] .section-head, [data-theme="arcade"] .section-head * { font-size: 10px !important; letter-spacing: 0.5px; }
[data-theme="arcade"] button { font-size: 10px !important; letter-spacing: 0.5px; }

/* Every heading/button label in this app is Thai text (occasionally mixed with a Latin word or
   a number) — and Press Start 2P has zero Thai glyphs, so the rule above alone leaves Thai
   headings looking completely unchanged (100% fallback font, no pixel look at all) even though
   the font-family is "correctly" applied. A hard-edged, un-blurred text-shadow doesn't care what
   glyphs are being drawn — it reads as a chunky pixel-game bevel on Thai script exactly as well
   as on Latin, so it's what actually delivers "looks 8-bit" for the headings/buttons that matter
   most in this app, with the real pixel font layered on top for the Latin/digit runs it does
   cover (item counts, "HP"/"STAMINA"/"QUEST" labels, dates). */
[data-theme="arcade"] .page-title,
[data-theme="arcade"] .section-head,
[data-theme="arcade"] button {
  /* A hard (non-blurred), gold-tinted offset shadow — the classic "retro game text" look, built
     entirely from a shadow so it doesn't depend on the font having a matching glyph the way the
     pixel font itself does. Deliberately colored rather than black: arcade's page/card
     backgrounds are both already near-black, so a black shadow would just disappear into them —
     gold (this theme's accent/treasure color) is what actually reads against that background. */
  text-shadow: 2px 2px 0 rgba(255, 215, 0, 0.45);
}

/* ThemeSwitcher.jsx's own theme-picker list ("อาร์เขด 8-บิต", "นักวิ่งสายฟ้า", ...) is built from
   button elements for click-target/accessibility reasons, not because it's a "button label" in
   the page-action sense the three rules above are meant for — it got swept up in that blanket
   button-type selector anyway and ended up pixel-tiny (10px, monospace) next to its own "ธีม"
   heading. The ".theme-menu-item" class (added in ThemeSwitcher.jsx) opts these back out: a
   class selector combined with the [data-theme] attribute one is more specific than a bare type
   selector (button), so this reliably wins regardless of source order, no extra !important-
   stacking needed beyond matching what it's overriding. */
[data-theme="arcade"] .theme-menu-item {
  font-family: 'IBM Plex Sans Thai', sans-serif !important;
  font-size: 15px !important;
  letter-spacing: normal !important;
  text-shadow: none !important;
}

/* Red/yellow speedster theme — dark "night city" background with electric yellow primary and a
   racing/motion display font on numbers. */
:root[data-theme="speedster"] {
  --color-ink: #FFF8E7;
  --color-inkMuted: #D9B98A;
  --color-inkFaint: #8A6F45;
  --color-white: #1F0A08;

  --color-primary: #EE1B24;
  --color-primaryTint: #4D0A0C;
  --color-primarySoft: #150505;
  --color-border: #5C2020;
  --color-divider: #3D1515;
  --color-inputBg: #240A0A;
  --color-ring: #8A3A1A;

  --color-danger: #FF6B35;
  --color-dangerTint: #3D1D0A;
  --color-dangerSoft: #241000;
  --color-dangerBorder: #8A4520;

  --color-secondary: #FFD400;
  --color-secondaryTint: #3D3000;
  --color-secondarySoft: #241D00;
  --color-secondaryBorder: #7A6300;

  --color-accent: #FFD400;
  --color-accentTint: #3D3000;
  --color-accentBorder: #7A6300;
  --color-accentInk: #FFD400;

  --color-success: #39FF88;
  --color-successTint: #0A3D1D;

  --font-num: 'Racing Sans One', 'Fraunces', serif;
  --scrollbar-thumb: #8A3A1A;
}

[data-theme="speedster"] .num {
  display: inline-block;
  transform: scale(0.85);
  transform-origin: left center;
  letter-spacing: 0.5px;
  overflow-wrap: anywhere;
}
`;
