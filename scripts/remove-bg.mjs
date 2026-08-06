// Attempt 2 — see git history / conversation for attempt 1 (plain color-distance flood fill),
// which leaked through the character's soft/anti-aliased outline and erased most of the
// character too, since these are AI-generated images with blurred edges rather than crisp
// hard-edged pixel art.
//
// This version floods from the border but only through pixels that are themselves
// low-saturation (background is a grayscale R≈G≈B gradient; the character is colorful) —
// stops at the character's colored regions regardless of how blurry the transition is, instead
// of relying on a sharp color jump between adjacent pixels.

import { Jimp } from "jimp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "src", "assets");

const SATURATION_THRESHOLD = 22; // max(r,g,b) - min(r,g,b); below this counts as "grayscale enough to be background"

function saturation(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

async function removeBackground(filename) {
  const inPath = path.join(assetsDir, filename);
  const image = await Jimp.read(inPath);
  const { width, height } = image.bitmap;
  const data = image.bitmap.data;
  const idx = (x, y) => (y * width + x) * 4;

  const visited = new Uint8Array(width * height);
  const queue = [];
  function tryStart(x, y) {
    const i = y * width + x;
    if (visited[i]) return;
    const p = idx(x, y);
    if (saturation(data[p], data[p + 1], data[p + 2]) > SATURATION_THRESHOLD) return; // border pixel is already colorful — don't start there
    visited[i] = 1;
    queue.push(x, y);
  }
  for (let x = 0; x < width; x++) { tryStart(x, 0); tryStart(x, height - 1); }
  for (let y = 0; y < height; y++) { tryStart(0, y); tryStart(width - 1, y); }

  let removed = 0;
  let qi = 0;
  while (qi < queue.length) {
    const x = queue[qi++];
    const y = queue[qi++];
    const i = idx(x, y);
    data[i + 3] = 0;
    removed++;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (visited[ni]) continue;
      const p = idx(nx, ny);
      if (saturation(data[p], data[p + 1], data[p + 2]) > SATURATION_THRESHOLD) continue;
      visited[ni] = 1;
      queue.push(nx, ny);
    }
  }

  const outName = filename.replace(/\.png$/, "-transparent.png");
  await image.write(path.join(assetsDir, outName));
  console.log(`${filename}: removed ${removed}/${width * height} px (${((removed / (width * height)) * 100).toFixed(1)}%) -> ${outName}`);
}

await removeBackground("mascot-warrior.png");
await removeBackground("mascot-archer.png");
