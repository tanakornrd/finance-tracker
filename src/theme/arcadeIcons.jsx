import React from "react";

// RPG pixel-art icon set for the "arcade" theme (8-bit) — swaps the plain emoji used by
// shared/categories.js for a hand-drawn blocky sprite when (and only when) the active theme is
// "arcade". Every other theme keeps rendering the original emoji untouched: <CategoryIcon> below
// is the single call site every consumer switches through, so this file is the only place that
// needs to know the RPG mapping exists.
//
// Icons are drawn on a small fixed grid of 1x1 SVG <rect>s (crisp/pixelated on purpose — no
// anti-aliasing, no curves) rather than as freehand paths, matching the blocky "8-bit sprite"
// look the rest of the arcade theme goes for. Colors are fixed retro-palette hexes rather than
// theme CSS vars, deliberately: these are meant to read as their own little sprite (gold coin,
// red potion, etc.) regardless of which accent color the rest of arcade's UI happens to use.
function PixelIcon({ grid, palette, size = 20 }) {
  const rows = grid.length;
  const cols = grid[0].length;
  const cells = [];
  for (let y = 0; y < rows; y++) {
    const row = grid[y];
    for (let x = 0; x < cols; x++) {
      const ch = row[x];
      const fill = palette[ch];
      if (!fill) continue; // "." (and anything undefined) stays transparent
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated", display: "block" }}
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
}

// k = outline, everything else is per-icon. Kept to 8x8 so every sprite reads clearly even at
// the ~18-20px sizes txIcon/iconChip render icons at.
const GOLD = "#FFD700", GOLD_DK = "#B8860B", BROWN = "#8B5A2B", BROWN_DK = "#5C3A1A";
const OUTLINE = "#1A1030";

export const ARCADE_CATEGORY_ICONS = {
  // ช้อปปิ้ง → coin purse
  "ช้อปปิ้ง": {
    palette: { k: OUTLINE, b: BROWN, d: BROWN_DK, y: GOLD },
    grid: [
      "..kkkk..",
      ".kbbbbk.",
      "kbbbbbbk",
      "kbdyydbk",
      "kbbbbbbk",
      "kbbbbbbk",
      ".kbbbbk.",
      "..kkkk..",
    ],
  },
  // อาหาร → roasted drumstick
  "อาหาร": {
    palette: { k: OUTLINE, m: "#D97B3F", n: "#B8592A", w: "#F0E6D2" },
    grid: [
      "....kk..",
      "...kmmk.",
      "..kmnmk.",
      ".kmnmk..",
      "kmnmkk..",
      "kmwwk...",
      ".kwwk...",
      "..kk....",
    ],
  },
  // เดินทาง → travel boot
  "เดินทาง": {
    palette: { k: OUTLINE, l: "#7A4A28", d: "#4A2E18" },
    grid: [
      "..kk....",
      ".kllk...",
      ".kllk...",
      ".kllk...",
      ".kllk...",
      "klllkkkk",
      "kddddddk",
      ".kkkkkk.",
    ],
  },
  // ที่พัก/บิล → bill scroll
  "ที่พัก/บิล": {
    palette: { k: OUTLINE, w: "#F0E6C0", t: "#8A7A4A" },
    grid: [
      ".kkkkkk.",
      "kwwwwwwk",
      "kwttttwk",
      "kwwwwwwk",
      "kwttttwk",
      "kwwwwwwk",
      "kwttttwk",
      ".kkkkkk.",
    ],
  },
  // สุขภาพ → health potion
  "สุขภาพ": {
    palette: { k: OUTLINE, g: "#9D8FC7", p: "#FF3864", h: "#FF7A99" },
    grid: [
      "..kk....",
      ".kggk...",
      ".kkkk...",
      "kppppk..",
      "kphppppk",
      "kpppppk.",
      "kppppppk",
      ".kkkkk..",
    ],
  },
  // บันเทิง → dice
  "บันเทิง": {
    palette: { k: OUTLINE, w: "#F5F3FF", d: "#1A1030" },
    grid: [
      "kkkkkkkk",
      "kwwwwwwk",
      "kwd..dwk",
      "kw....wk",
      "kw..d.wk",
      "kwd..dwk",
      "kwwwwwwk",
      "kkkkkkkk",
    ],
  },
  // การศึกษา → spellbook
  "การศึกษา": {
    palette: { k: OUTLINE, p: "#7A5CFA", w: "#F0E6C0" },
    grid: [
      ".kkkkkk.",
      "kppppppk",
      "kpwkkwpk",
      "kpwwwwpk",
      "kpwkkwpk",
      "kpwwwwpk",
      "kppppppk",
      ".kkkkkk.",
    ],
  },
  // อื่นๆ → mystery key
  "อื่นๆ": {
    palette: { k: OUTLINE, y: GOLD, d: GOLD_DK },
    grid: [
      "..kkk...",
      ".kyyyk..",
      "kyydyyk.",
      ".kyyyk..",
      "..kyk...",
      "..kyk...",
      ".kykyk..",
      "..kyk...",
    ],
  },
  // เงินเดือน (income) → shield of duty
  "เงินเดือน": {
    palette: { k: OUTLINE, c: "#00E5FF", d: "#0A8FA3" },
    grid: [
      ".kkkkkk.",
      "kcccccck",
      "kcdcccdk",
      "kccdcck.",
      "kcdcccdk",
      "k.cccc.k",
      ".k.cc.k.",
      "..kkkk..",
    ],
  },
  // ฟรีแลนซ์ (income) → adventurer's sword
  "ฟรีแลนซ์": {
    palette: { k: OUTLINE, s: "#D9D9E8", y: GOLD },
    grid: [
      "....kk..",
      "...kssk.",
      "..kssk..",
      ".kssk...",
      "kssk....",
      "kykk....",
      ".ykk....",
      "..kk....",
    ],
  },
  // ของขวัญ (income) → gift box, kept close to the original emoji since it already fits
  "ของขวัญ": {
    palette: { k: OUTLINE, r: "#FF3864", g: GOLD },
    grid: [
      ".kkkkkk.",
      "krrrrrrk",
      "krrgggrk",
      "krrgggrk",
      "kkkgkkk.",
      "krrgggrk",
      "krrgggrk",
      ".kkkkkk.",
    ],
  },
};

// name -> emoji fallback used for a transfer row, which isn't a "category" at all (see the
// `describeTransfer` usages this mirrors) — kept separate from the map above since transfers
// aren't keyed by category name.
export const ARCADE_TRANSFER_ICON = {
  palette: { k: OUTLINE, y: GOLD, s: "#D9D9E8" },
  grid: [
    "........",
    "..kyyk..",
    ".kyyyyk.",
    "kyykkyyk",
    "kyykkyyk",
    ".kyyyyk.",
    "..kyyk..",
    "........",
  ],
};

// Single call site every consumer swaps to: pass the category's own emoji as `fallback` so
// every non-arcade theme (and any category with no pixel sprite drawn yet, e.g. a future
// category) renders exactly as it always has.
export function CategoryIcon({ theme, name, fallback, size = 18, isTransfer = false }) {
  const sprite = isTransfer ? ARCADE_TRANSFER_ICON : ARCADE_CATEGORY_ICONS[name];
  if (theme === "arcade" && sprite) {
    return <PixelIcon grid={sprite.grid} palette={sprite.palette} size={size} />;
  }
  return <span aria-hidden="true">{fallback}</span>;
}
