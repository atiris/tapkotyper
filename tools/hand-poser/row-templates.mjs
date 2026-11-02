// The owner's rows rule, applied to the home outlines by moving their points (no 3D, no Gemini):
// typing on the top row the back of the hand moves up half a row and the fingers curl; on the digit row a whole row and
// the fingers curl more; the thumbs move a little up and to the side. Writes the templates `top` and `num` of both
// hands, and the U pose of the right hand (`r2u0`: the top template with the index stretched from J to U).
// Usage: node tools/hand-poser/row-templates.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const DIR = 'public/hands';
const MIRROR_X = 389.5;
/** Measured on the home outlines (keyboard units): the fingertips' line, the knuckles' line, the left thumb's tip. */
const TIPS = 105, KNUCKLES = 238, THUMB = [357, 216], THUMB_REACH = 110;
/** Per row: how far the back of the hand moves up, the fingertips up, and the thumbs up and to the middle. */
const ROWS = {
  top: { back: 25, tip: 8, thumbUp: 12, thumbIn: 5 },
  num: { back: 50, tip: 15, thumbUp: 25, thumbIn: 10 },
};

const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v) => Math.min(1, Math.max(0, v));

/** A point's move for a row, on the left hand (the right hand is mirrored). */
function move([x, y], row) {
  const r = ROWS[row];
  // The back of the hand moves the whole way; along the fingers the move shrinks to the tips' (the fingers curl).
  let dy = y >= KNUCKLES ? r.back : r.tip + (r.back - r.tip) * clamp((y - TIPS) / (KNUCKLES - TIPS));
  let dx = 0;
  // The thumb: less up (it stays near the space bar) and a little towards the middle, blended out from its tip.
  const w = smooth(clamp(1 - Math.hypot(x - THUMB[0], y - THUMB[1]) / THUMB_REACH));
  dy = dy * (1 - w) + r.thumbUp * w;
  dx = r.thumbIn * w;
  return [x + dx, y - dy];
}

/** Moves every point of an SVG path (absolute commands, x y pairs). */
function warpPath(d, fn) {
  const nums = [...d.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
  let i = 0;
  return d.replace(/-?\d+(\.\d+)?/g, () => {
    const k = i++, first = k - (k % 2), [x, y] = fn([nums[first], nums[first + 1]]);
    return (k % 2 ? y : x).toFixed(1);
  });
}

/** An outline file with its paths moved and its name changed (its pose stays: the 3D home it came from). */
function warpFile(svg, name, fn) {
  return svg
    .replace(/(<path class="hand-(?:lines|creases)" d=")([^"]*)/g, (_, head, d) => head + warpPath(d, fn))
    .replace(/"name":"[^"]*"/, `"name":"${name}"`)
    .replace(/data-source="[a-z]*"/, 'data-source="edit"');
}

const home = { left: readFileSync(`${DIR}/left/home.svg`, 'utf8'), right: readFileSync(`${DIR}/right/home.svg`, 'utf8') };
const mirror = ([x, y]) => [2 * MIRROR_X - x, y];
for (const row of Object.keys(ROWS)) {
  writeFileSync(`${DIR}/left/${row}.svg`, warpFile(home.left, row, (p) => move(p, row)));
  writeFileSync(`${DIR}/right/${row}.svg`, warpFile(home.right, row, (p) => mirror(move(mirror(p), row))));
}

// U: the right hand's top template, its index stretched from J to U (the stretch grows from the knuckle to the tip).
const U = { tip: [462, 73], from: [477, 126 - ROWS.top.tip] };
/** The right index finger in the top template: left of its gap to the middle finger (a line from the tips to the knuckles). */
const indexGap = (y) => 498 + (y - 100) * 0.43;
function stretchIndex([x, y]) {
  const base = KNUCKLES - ROWS.top.back;
  if (x > indexGap(y) || x < 400 || y > base) return [x, y];
  const t = smooth(clamp((base - y) / (base - U.from[1])));
  return [x + (U.tip[0] - U.from[0]) * t, y + (U.tip[1] - U.from[1]) * t];
}
const top = readFileSync(`${DIR}/right/top.svg`, 'utf8');
writeFileSync(`${DIR}/right/r2u0.svg`, warpFile(top, 'r2u0', stretchIndex));

const list = Object.fromEntries(['left', 'right'].map((s) => [s, readdirSync(`${DIR}/${s}`).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort()]));
writeFileSync(`${DIR}/index.json`, `${JSON.stringify(list, null, 2)}\n`);
console.log('top, num (both hands), r2u0 written');
