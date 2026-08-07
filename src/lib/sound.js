// 8-bit-style blips generated on the fly with the Web Audio API — no audio files at all, so
// this adds zero bytes to the page's load size. A single shared AudioContext is created lazily
// (only on the first actual play call, from inside a click handler — browsers require a user
// gesture before audio can start, which every caller here already has) and reused after that.
let ctx = null;
function getCtx() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null; // very old/unsupported browser — fail silently, no sound
    ctx = new AudioContextClass();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// One short square-wave tone with a fast attack/decay envelope (avoids the audible "click" a
// hard on/off would make) — the basic building block every preset below is made of.
function tone(audioCtx, { freq, start, duration, gain = 0.15, type = "square" }) {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime + start);
  gainNode.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + start + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + duration);
  osc.connect(gainNode).connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + duration + 0.02);
}

// One preset per mascot's click reaction, tuned to loosely match its own personality — a low
// quick blip for the warrior's slash, a brighter chime for the mage's spell, a short double-
// blip "sonar" for the slime's scan, a quick high twang for the archer's shot. Level-up is
// deliberately the biggest (a short ascending arpeggio), matching it being the "bigger than any
// single interaction" celebration the RPG-interactions plan asked for.
const PRESETS = {
  warriorSlash: (c) => tone(c, { freq: 180, start: 0, duration: 0.12, type: "square" }),
  mageCast: (c) => {
    tone(c, { freq: 520, start: 0, duration: 0.1, type: "triangle" });
    tone(c, { freq: 780, start: 0.08, duration: 0.15, type: "triangle" });
  },
  slimeScan: (c) => {
    tone(c, { freq: 900, start: 0, duration: 0.06, type: "square", gain: 0.1 });
    tone(c, { freq: 900, start: 0.09, duration: 0.06, type: "square", gain: 0.1 });
  },
  archerFire: (c) => tone(c, { freq: 1100, start: 0, duration: 0.08, type: "sawtooth", gain: 0.1 }),
  levelUp: (c) => {
    [523, 659, 784, 1046].forEach((freq, i) => tone(c, { freq, start: i * 0.09, duration: 0.16, type: "square", gain: 0.14 }));
  },
  // Card press feedback (2026-08-07) — deliberately the shortest/quietest preset here: this can
  // fire on nearly any card tap across the whole app (not one mascot's occasional reaction), so
  // it needs to read as a light acknowledgment tick, not compete with or resemble the RPG
  // mascots' own bigger sounds.
  cardTap: (c) => tone(c, { freq: 600, start: 0, duration: 0.045, type: "square", gain: 0.06 }),
};

// Callers already gate this on the soundEnabled toggle (ThemeContext) themselves — same pattern
// as mascotAnimationEnabled gating animation classes — so this function itself doesn't read any
// settings, just plays. Wrapped in try/catch: browser audio can throw for all sorts of
// environment reasons (no audio hardware, permissions, an exotic browser), and a sound effect
// failing should never be able to break the click it's attached to.
export function playSound(name) {
  try {
    const audioCtx = getCtx();
    if (!audioCtx) return;
    const preset = PRESETS[name];
    if (preset) preset(audioCtx);
  } catch {
    // Sound is a nice-to-have, not worth surfacing an error over — same reasoning as this
    // codebase's other localStorage try/catch fallbacks.
  }
}
