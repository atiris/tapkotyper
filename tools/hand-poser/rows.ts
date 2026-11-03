import { type Finger, type KeyDef, LAYOUTS } from '../../src/keyboard/layouts';
import { type FingerScheme, fingerOf } from '../../src/keyboard/fingers';
import { POSE_NAME, type Side, VIEW, keyName, poseName } from '../../src/ui/hand-svg';
import { HANDS_CHANNEL } from '../../src/ui/hands';
import { FINGER_COLORS, KeyboardGuide, inkOn, textColorsOn } from '../../src/ui/keyboard-guide';
import '../../src/styles.css';
import { GAP, UNIT, withModifiers } from './board';
import { centerline } from './centerline';
import { outlineSvg, readOutline } from './outline-svg';
import type { FingerMove, HandPose, Outline, OutlineFile, Owners, Pose, RowMove, RowName, RowsState } from './rows-file';

/**
 * The hand tool (dev server only, /tools/hand-poser/): the home outline (once drawn by Gemini) moved by rules. Each finger's points move with that finger only: a correction of the home position (base), the row the hand
 * types on (it moves the whole hand and curls the fingers) and each key pose's own tilt and finger moves. The brush moves
 * the home outline's points; the paint gives points to a finger by hand. Saving writes the settings, the source outline
 * and the SVG of home and of every key pose for Tapko.
 */

type Pt = [number, number];
type Kind = 'lines' | 'creases';
interface Reach { w: number; s: number }
/** A path's commands and points; a curve's control point moves as the end point it belongs to (anchor). */
interface Path { parts: (string | null)[]; xy: Pt[]; anchor: number[]; w: Reach[][] }

const SIDES: Side[] = ['left', 'right'];
const KINDS: Kind[] = ['lines', 'creases'];
const SIDE_NAME: Record<Side, string> = { left: 'Ľavá ruka', right: 'Pravá ruka' };
const FINGERS = ['palec', 'ukazovák', 'prostredník', 'prstenník', 'malíček'];
const PALM = 5;
const ROW_NAMES: Record<RowName, string> = { bot: 'dolný rad', home: 'domovský rad', top: 'horný rad', num: 'číselný rad' };
/** The row a hand types on, by the keyboard's row (the bottom row's thumbs stay at home). */
const ROW_OF: RowName[] = ['num', 'top', 'home', 'bot', 'home'];

/**
 * Where a finger's joints lie along it, from the knuckle (0) to the tip (1): the knuckle at the back of the hand, the
 * joint between the 1st and 2nd bone, between the 2nd and 3rd, the tip (the thumb: its root at the wrist, its two
 * joints, the tip). The bones are about 45 %, 30 % and 25 % of the finger.
 */
const JOINTS = [0, 0.45, 0.75, 1];
/** A polyline's points at these fractions of its length. */
function resample(line: Pt[], at: number[]): Pt[] {
  const lens = line.slice(1).map((q, i) => Math.hypot(q[0] - line[i][0], q[1] - line[i][1])), total = lens.reduce((a, b) => a + b, 0);
  return at.map((t) => {
    let left = t * total, i = 0;
    while (i < lens.length - 1 && left > lens[i]) left -= lens[i++];
    const k = lens[i] ? left / lens[i] : 0;
    return [line[i][0] + (line[i + 1][0] - line[i][0]) * k, line[i][1] + (line[i + 1][1] - line[i][1]) * k];
  });
}
/** Each finger's axis on the home outline (its joints, JOINTS), thumb first: a first guess, fitted to the outline (fitAxes). */
const GUESS: Record<Side, Pt[][]> = Object.fromEntries(Object.entries({
  left: [
    [[275, 390], [318, 300], [352, 228]],
    [[275, 240], [292, 160], [308, 125]],
    [[219, 235], [230, 160], [250, 110]],
    [[164, 238], [178, 160], [197, 120]],
    [[125, 245], [131, 170], [133, 125]],
  ],
  right: [
    [[500, 390], [471, 300], [455, 228]],
    [[515, 240], [486, 155], [474, 130]],
    [[574, 235], [551, 155], [531, 112]],
    [[626, 240], [600, 155], [585, 115]],
    [[664, 245], [656, 160], [653, 125]],
  ],
} as Record<Side, Pt[][]>).map(([s, lines]) => [s, lines.map((l) => resample(l, JOINTS))])) as Record<Side, Pt[][]>;
/** The back of the hand's line: points nearest to it never move with a finger. A first guess; the owner may move it. */
const PALM_GUESS: Record<Side, Pt[]> = { left: [[110, 420], [150, 270], [250, 265], [292, 312]], right: [[680, 420], [640, 270], [540, 265], [505, 312]] };
const PALM_LINE = structuredClone(PALM_GUESS);
/** The wrist, the hand's turning point. */
const PIVOT: Record<Side, Pt> = { left: [145, 430], right: [636, 430] };
/** How softly a point belongs to the nearer axes (keyboard units): small, so a finger moves its own points only. */
const SIGMA = 5;
/** The axes fitted to the loaded outlines. */
const AXES = structuredClone(GUESS);
/**
 * Moves each finger's middle and tip point of its axis (not the thumb's) to the middle between that finger's outer
 * edges at their height, a few times over: points then split between neighbouring fingers along the real gap.
 */
function fitAxes(side: Side, xy: Pt[]): void {
  AXES[side] = structuredClone(GUESS[side]);
  for (let round = 0; round < 4; round++) {
    const own = xy.map((p) => {
      const near = [...AXES[side], PALM_LINE[side]].map((l) => nearOnLine(p, l).d);
      return near.indexOf(Math.min(...near));
    });
    for (let f = 1; f < 5; f++) {
      for (const j of [1, 2, 3]) {
        const v = AXES[side][f][j];
        const xs = xy.filter((p, i) => own[i] === f && Math.abs(p[1] - v[1]) < 12).map((p) => p[0]);
        if (xs.length >= 4) v[0] = (Math.min(...xs) + Math.max(...xs)) / 2;
      }
    }
  }
}

const move0 = (): FingerMove => ({ bend: 0, x: 0, y: 0, mid: 0 });
const moves = (o: Record<number, Partial<FingerMove>> = {}): FingerMove[] => FINGERS.map((_, f) => ({ ...move0(), ...o[f] }));
/** The home outline's corrections start at none: the outline is drawn as the home position should look. */
const BASE_DEFAULTS: Record<Side, FingerMove[]> = { left: moves(), right: moves() };
const zeroRow = (): RowMove => ({ up: 0, right: 0, tilt: 0, curl: 0, thumbRight: 0, thumbUp: 0, short: 0 });
const ROW_DEFAULTS: Record<RowName, Record<Side, RowMove>> = {
  bot: { left: { up: -15, right: 8, tilt: 0, curl: 20, thumbRight: 0, thumbUp: 10, short: 0 }, right: { up: -15, right: 8, tilt: 0, curl: 20, thumbRight: 0, thumbUp: 10, short: 0 } },
  home: { left: zeroRow(), right: zeroRow() },
  top: { left: { up: 25, right: 0, tilt: 0, curl: 17, thumbRight: 5, thumbUp: -13, short: 0 }, right: { up: 25, right: 0, tilt: 0, curl: 17, thumbRight: -5, thumbUp: -13, short: 0 } },
  num: { left: { up: 50, right: 0, tilt: 0, curl: 35, thumbRight: 10, thumbUp: -25, short: 0 }, right: { up: 50, right: 0, tilt: 0, curl: 35, thumbRight: -10, thumbUp: -25, short: 0 } },
};
type Field<K> = [key: K, label: string, lo: number, hi: number, step: number];
const ROW_FIELDS: Field<keyof RowMove>[] = [
  ['up', 'Ruka hore', -60, 80, 1], ['right', 'Ruka vpravo', -40, 40, 1], ['tilt', 'Odklon ruky (° vpravo)', -20, 20, 0.5],
  ['curl', 'Skrčenie prstov', -30, 60, 1], ['thumbRight', 'Palec vpravo', -40, 40, 1], ['thumbUp', 'Palec hore', -50, 40, 1],
  ['short', 'Chrbát ruky kratší', -40, 80, 1],
];
const FINGER_FIELDS: Field<keyof FingerMove>[] = [['bend', 'skrčiť / vystrieť', -40, 50, 1], ['x', 'koniec ← →', -40, 40, 1], ['y', 'koniec ↓ ↑', -40, 40, 1], ['mid', 'stred prsta ← →', -25, 25, 1]];

const handPose = (row: RowName): HandPose => ({ row, ...zeroRow(), f: moves() });
const basePose = (id: string, name: string, row: RowName): Pose => ({ id, name, on: true, left: handPose(row), right: handPose(row) });
const startState = (): RowsState => ({
  base: structuredClone(BASE_DEFAULTS),
  palm: { left: 0, right: 0 },
  rows: structuredClone(ROW_DEFAULTS),
  poses: [basePose('home', 'Domov', 'home'), basePose('top', 'Horný rad', 'top'), basePose('num', 'Číselný rad', 'num'), basePose('bot', 'Dolný rad', 'bot')],
  owners: { left: { lines: {}, creases: {} }, right: { lines: {}, creases: {} } },
});

/** Settings saved before a field existed get its default (no migrations: a new field starts at nothing). */
function withDefaults(state: RowsState): RowsState {
  for (const s of SIDES) {
    for (const r of Object.keys(state.rows) as RowName[]) state.rows[r][s].short ??= 0;
    for (const p of state.poses) p[s] = { ...zeroRow(), ...p[s] };
  }
  return state;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const statusEl = $('status');
const say = (text: string, error = false) => { statusEl.textContent = text; statusEl.classList.toggle('error', error); };

// ---- outlines: paths whose points move ----

/**
 * A path (absolute commands, x y pairs) split into its commands and points. A cubic curve's first control point belongs
 * to the point the curve starts from, its second to the point it ends at: a long smooth edge has its control points far
 * from the curve, nearer another finger, and they must not move with that finger.
 */
function parse(d: string): Omit<Path, 'w'> {
  const parts: (string | null)[] = [], nums: number[] = [], cmds: string[] = [];
  let cmd = 'M';
  for (const m of d.matchAll(/([A-Za-z])|(-?\d*\.?\d+(?:e-?\d+)?)/g)) {
    if (m[1]) { parts.push(m[1]); cmd = m[1]; continue; }
    parts.push(null);
    nums.push(Number(m[2]));
    if (nums.length % 2 === 0) cmds.push(cmd);
  }
  const xy: Pt[] = [], anchor: number[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) xy.push([nums[i], nums[i + 1]]);
  let inCurve = 0;
  cmds.forEach((c, i) => {
    if (c !== 'C') { inCurve = 0; anchor.push(i); return; }
    const at = inCurve++ % 3;
    anchor.push(at === 0 ? Math.max(0, i - 1) : at === 1 ? i + 1 : i);
  });
  return { parts, xy, anchor };
}
function draw(path: { parts: (string | null)[] }, xy: Pt[]): string {
  let k = 0, out = '';
  for (const p of path.parts) {
    if (p) { out += p; continue; }
    const pt = xy[k >> 1];
    out += `${(k % 2 ? pt[1] : pt[0]).toFixed(1)} `;
    k++;
  }
  return out.trim();
}
/** The nearest place on a polyline: the distance and how far along it (0 the start, 1 the end; beyond them outside). */
function nearOnLine(p: Pt, line: Pt[]): { d: number; s: number } {
  let best = { d: Infinity, s: 0 }, run = 0;
  const lens = line.slice(1).map((q, i) => Math.hypot(q[0] - line[i][0], q[1] - line[i][1])), total = lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    const a = line[i], b = line[i + 1], vx = b[0] - a[0], vy = b[1] - a[1];
    const t = ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (lens[i] * lens[i]);
    const tc = Math.min(1, Math.max(0, t)), d = Math.hypot(p[0] - a[0] - vx * tc, p[1] - a[1] - vy * tc);
    let along = run + tc * lens[i];
    if (i === 0 && t < 0) along = t * lens[i];
    if (i === lens.length - 1 && t > 1) along = run + t * lens[i];
    if (d < best.d) best = { d, s: along / total };
    run += lens[i];
  }
  return best;
}
/** How much a point moves with each finger: the one given by hand, or the nearest axes (the back of the hand's line never moves). */
function reach(side: Side, p: Pt, owner?: number): Reach[] {
  if (owner === PALM) return FINGERS.map(() => ({ w: 0, s: 0 }));
  if (owner != null && owner >= 0) return FINGERS.map((_, f) => ({ w: f === owner ? 1 : 0, s: f === owner ? nearOnLine(p, AXES[side][f]).s : 0 }));
  const near = [...AXES[side], PALM_LINE[side]].map((l) => nearOnLine(p, l)), dmin = Math.min(...near.map((n) => n.d));
  const w = near.map((n) => Math.exp(-(n.d * n.d - dmin * dmin) / (SIGMA * SIGMA))), sum = w.reduce((a, b) => a + b, 0);
  return near.slice(0, 5).map((n, i) => ({ w: w[i] / sum, s: n.s }));
}

let st = startState();
/** Each hand's outline as the page edits it: the source paths, the brush's moves per point (x y pairs). */
const src = {} as Record<Side, Record<Kind, Path>>;
const edits = {} as Record<Side, Record<Kind, number[]>>;
const axisReach = {} as Record<Side, Reach[][][]>;
/** The line of the knuckles (the four fingers' axes start there) and the wrist at the picture's bottom: the back of the hand between them. */
const KNUCKLE_Y = {} as Record<Side, number>;
const WRIST_Y = VIEW.y + VIEW.h;
/** Each hand's line widths when its outline is middle lines (undefined: filled bands, as traced). */
const widths = {} as Record<Side, Outline['width']>;
/** The longest piece of a line (keyboard units) the hand moves as one: about a fifth of a finger's length. */
const PIECE = 8;
/**
 * A path (absolute M, L, C, Z) with its long pieces split into short ones of the same shape. A finger's move grows
 * from nothing at its knuckle to all of it at its tip; a long curve, moved only at its two ends, then bends into steps,
 * many short ones follow the move smoothly.
 */
function subdivide(d: string): string {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) ?? [];
  const f = (n: number) => String(Math.round(n * 100) / 100);
  const out: string[] = [];
  let i = 0, cmd = '', p: Pt = [0, 0], start: Pt = [0, 0];
  const num = () => Number(tokens[i++]);
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    if (cmd === 'Z' || cmd === 'z') { out.push('Z'); p = start; cmd = ''; continue; }
    if (cmd === 'M') { p = start = [num(), num()]; out.push(`M${f(p[0])} ${f(p[1])}`); cmd = 'L'; continue; }
    if (cmd === 'L') {
      const e: Pt = [num(), num()], n = Math.max(1, Math.ceil(dist(p, e) / PIECE));
      for (let k = 1; k <= n; k++) { const q = lerp(p, e, k / n); out.push(`L${f(q[0])} ${f(q[1])}`); }
      p = e;
      continue;
    }
    if (cmd === 'C') {
      let c: Pt[] = [p, [num(), num()], [num(), num()], [num(), num()]];
      const n = Math.max(1, Math.ceil((dist(c[0], c[1]) + dist(c[1], c[2]) + dist(c[2], c[3]) + dist(c[0], c[3])) / 2 / PIECE));
      // De Casteljau: cut off 1/k of what is left, n times.
      for (let k = n; k >= 1; k--) {
        const t = 1 / k, a = lerp(c[0], c[1], t), b = lerp(c[1], c[2], t), e = lerp(c[2], c[3], t);
        const ab = lerp(a, b, t), be = lerp(b, e, t), m = lerp(ab, be, t);
        out.push(`C${f(a[0])} ${f(a[1])} ${f(ab[0])} ${f(ab[1])} ${f(m[0])} ${f(m[1])}`);
        c = [m, be, e, c[3]];
      }
      p = c[0];
      continue;
    }
    i++;
  }
  return out.join(' ');
}
function loadSide(s: Side, o: Outline): void {
  // Short pieces only (the shape stays): every finger's move then bends its lines smoothly.
  o = { ...o, lines: subdivide(o.lines), creases: subdivide(o.creases) };
  const lines = parse(o.lines);
  widths[s] = o.width;
  const paths = { lines, creases: parse(o.creases) };
  src[s] = Object.fromEntries(KINDS.map((k) => [k, { ...paths[k], w: [] }])) as unknown as Record<Kind, Path>;
  edits[s] = Object.fromEntries(KINDS.map((k) => [k, new Array(paths[k].xy.length * 2).fill(0)])) as Record<Kind, number[]>;
  setAxes(s);
}
/**
 * A hand's axes: the owner's own when set (with a point on every joint), else fitted to the outline (middle lines lie
 * in the middle of their bands too).
 */
function setAxes(s: Side): void {
  const own = st.axes?.[s];
  if (own && own.fingers.every((l) => l.length === JOINTS.length)) {
    AXES[s] = structuredClone(own.fingers);
    PALM_LINE[s] = structuredClone(own.palm);
  } else {
    if (st.axes) delete st.axes[s];
    PALM_LINE[s] = structuredClone(PALM_GUESS[s]);
    fitAxes(s, src[s].lines.xy);
  }
  refreshAxes(s);
}
/** After the axes changed: each point's finger again, the fingers' directions, the line of the knuckles. */
function refreshAxes(s: Side): void {
  UNIT_DIR[s] = unitDirs(s);
  MID_AT[s] = AXES[s].map((l) => {
    const lens = l.slice(1).map((q, i) => Math.hypot(q[0] - l[i][0], q[1] - l[i][1]));
    return lens[0] / lens.reduce((a, b) => a + b, 0);
  });
  for (const k of KINDS) weigh(s, k);
  axisReach[s] = AXES[s].map((line) => line.map((p) => reach(s, p)));
  KNUCKLE_Y[s] = AXES[s].slice(1).reduce((sum, line) => sum + line[0][1], 0) / 4;
}
const ownerOf = (s: Side, k: Kind, i: number): number | undefined => st.owners[s][k][i];
function weigh(s: Side, k: Kind): void {
  const path = src[s][k];
  for (const i of path.xy.keys()) { const a = path.anchor[i]; path.w[i] = reach(s, path.xy[a], ownerOf(s, k, a)); }
}

const smooth = (t: number) => t * t * (3 - 2 * t), clamp = (x: number) => Math.min(1, Math.max(0, x));
/** Each finger's way from its tip to its knuckle (a unit vector): where a bend moves its points. */
const unitDirs = (s: Side) => AXES[s].map((l) => {
  const b = l[0], t = l.at(-1)!, n = Math.hypot(b[0] - t[0], b[1] - t[1]);
  return [(b[0] - t[0]) / n, (b[1] - t[1]) / n] as Pt;
});
const UNIT_DIR = {} as Record<Side, Pt[]>;
/** Where along each finger its joint between the 1st and 2nd bone lies (0 the knuckle, 1 the tip). */
const MID_AT = {} as Record<Side, number[]>;
/** How much the "middle of the finger" move reaches a place along it: most at the joint between the 1st and 2nd bone. */
const midBump = (s: number, at: number) => Math.exp(-(((s - at) / 0.18) ** 2));

/** One point of a hand in a pose: the fingers move (base correction, row curl and thumb, the pose's own moves), then the hand tilts and shifts. */
function movePoint(side: Side, p: Pt, w: Reach[], hp: HandPose): Pt {
  const row = st.rows[hp.row][side];
  let x = p[0], y = p[1];
  // The back of the hand looks shorter (lifted): below the knuckles it is pressed towards them, the most at the wrist.
  // The row's moves of the whole hand and the pose's small ones on top.
  const both = (k: keyof RowMove) => row[k] + hp[k];
  const short = st.palm[side] + both('short'), knuckles = KNUCKLE_Y[side];
  if (short && y > knuckles) y -= (short * (y - knuckles)) / (WRIST_Y - knuckles);
  for (let f = 0; f < 5; f++) {
    const { w: wf, s } = w[f];
    if (wf < 1e-4 || s <= 0) continue;
    const mine = hp.f[f], base = st.base[side][f], u = UNIT_DIR[side][f];
    const bend = mine.bend + base.bend + (f ? both('curl') : 0);
    const dx = mine.x + base.x + (f ? 0 : both('thumbRight')), dy = mine.y + base.y + (f ? 0 : both('thumbUp'));
    const r = smooth(clamp(s)), m = (mine.mid + base.mid) * midBump(s, MID_AT[side][f]);
    x += wf * (u[0] * bend * s + dx * r + m);
    y += wf * (u[1] * bend * s - dy * r);
  }
  const a = (both('tilt') * Math.PI) / 180, [cx, cy] = PIVOT[side];
  return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a) + both('right'), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a) - both('up')];
}
const edited = (s: Side, k: Kind, i: number): Pt => { const p = src[s][k].xy[i], e = edits[s][k]; return [p[0] + e[2 * i], p[1] + e[2 * i + 1]]; };
type Posed = Record<Side, Record<Kind, Pt[]>>;
const posedSide = (s: Side, hp: HandPose) => Object.fromEntries(KINDS.map((k) => [k, src[s][k].xy.map((_, i) => movePoint(s, edited(s, k, i), src[s][k].w[i], hp))])) as Record<Kind, Pt[]>;
const posed = (pose: Pose): Posed => ({ left: posedSide('left', pose.left), right: posedSide('right', pose.right) });

// ---- the keyboard: Tapko's own, with the bottom row's modifiers ----

const NS = 'http://www.w3.org/2000/svg';
/** The hands over the keys: placed on Tapko's keyboard as Tapko places them (src/ui/hands.ts). */
const svg = document.createElementNS(NS, 'svg');
svg.setAttribute('viewBox', `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
svg.classList.add('rows-hands');
const BOARD_W = 15 * UNIT - GAP;
svg.style.left = `${(VIEW.x / BOARD_W) * 100}%`;
svg.style.top = `calc(${VIEW.y / BOARD_W} * 100cqw)`;
svg.style.width = `${(VIEW.w / BOARD_W) * 100}%`;
const el = (n: string, a: Record<string, string | number>, parent: Element = svg) => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, String(a[k]));
  parent.append(e);
  return e;
};
const layoutSel = $<HTMLSelectElement>('layout'), schemeSel = $<HTMLSelectElement>('scheme');
try {
  layoutSel.value = localStorage.getItem('hand-rows-layout') || layoutSel.value;
  schemeSel.value = localStorage.getItem('hand-rows-scheme') || schemeSel.value;
} catch { /* the defaults */ }
const board = () => withModifiers(LAYOUTS[layoutSel.value as 'us-qwerty' | 'sk-qwertz']);
const scheme = () => schemeSel.value as FingerScheme;
interface KeyBox { def: KeyDef; name: string; row: number; key: HTMLElement }
let keyBoxes: KeyBox[] = [];
const stageBox = $('stageBox');
function drawBoard(): void {
  const b = board(), guide = new KeyboardGuide(b);
  stageBox.replaceChildren(guide.el);
  guide.el.querySelector('.kb')!.append(svg);
  keyBoxes = [];
  for (const [r, row] of b.rows.entries()) {
    for (const def of row) {
      const key = guide.keyEl(def.code);
      if (!key || def.base === 'enter-top') continue;
      const name = keyName(b, def.code) ?? '';
      key.title = name;
      // The finger's colour by the chosen fingering (Tapko's keyboard colours the standard one).
      const color = FINGER_COLORS[fingerOf(def, scheme())], [bg, ink] = textColorsOn(color);
      key.style.setProperty('--finger', color);
      key.style.setProperty('--finger-ink', inkOn(color));
      key.style.setProperty('--next-bg', bg);
      key.style.setProperty('--next-ink', ink);
      const box = { def, name, row: r, key };
      key.addEventListener('click', (e) => { if (tool() === 'keys') pickKey(box, e); });
      keyBoxes.push(box);
    }
  }
  markKeys();
}
for (const sel of [layoutSel, schemeSel]) sel.addEventListener('change', () => {
  try { localStorage.setItem('hand-rows-layout', layoutSel.value); localStorage.setItem('hand-rows-scheme', schemeSel.value); } catch { /* not kept */ }
  drawBoard();
});
const keyOfPose = (id: string) => (/^[lr][1-5]/.test(id) ? id.slice(2) : null);
/** The shown pose's key lit; a green dot on every key with a pose here. */
function markKeys(): void {
  const key = keyOfPose(current), have = new Set(st.poses.map((p) => keyOfPose(p.id)));
  for (const k of keyBoxes) {
    k.key.classList.toggle('pose-key', k.name === key);
    k.key.classList.toggle('has-pose', have.has(k.name));
  }
}
/** A key clicked: the pose of the hand and finger that press it (the space bar: the thumb on the clicked half), opened or added. */
function pickKey(k: KeyBox, e: MouseEvent): void {
  const r = k.key.getBoundingClientRect();
  const finger: Finger = k.def.code === 'Space' ? (e.clientX < r.left + r.width / 2 ? 4 : 5) : fingerOf(k.def, scheme());
  const id = poseName(board(), k.def.code, finger);
  if (id) openPose(id);
}
/** A key pose shown; one not here yet is added, its hand on the key's row. */
function openPose(id: string): void {
  if (!POSE_NAME.test(id) || !keyOfPose(id)) return;
  if (!st.poses.some((p) => p.id === id)) {
    const pose = basePose(id, id, 'home'), at = keyBoxes.find((k) => k.name === keyOfPose(id));
    pose[id[0] === 'l' ? 'left' : 'right'].row = ROW_OF[at?.row ?? 2];
    st.poses.push(pose);
    changed();
    buildChips();
  }
  setPlaying(false);
  show(id);
}

// ---- the hands ----

const ghost = el('g', {}), hands = el('g', {}), dotsG = el('g', {}), axesG = el('g', { display: 'none' });
const brushRing = el('circle', { class: 'brush', r: 12, cx: -999, cy: -999, display: 'none' });
const paths = {} as Record<Side, Record<Kind, Element> & { axes: Element[] }>;
const ghostPaths = {} as Record<Side, Element>;
for (const s of SIDES) {
  ghostPaths[s] = el('path', { class: 'ghost' }, ghost);
  paths[s] = {
    creases: el('path', { class: 'crease' }, hands), lines: el('path', { class: 'hand' }, hands),
    axes: [...AXES[s], PALM_LINE[s]].map((_, f) => el('polyline', { class: f === PALM ? 'rows-axis palm' : 'rows-axis' }, axesG)),
  };
}
/** The axes' points to drag (shown in the "upraviť osi" mode). */
const handlesG = el('g', {});
const homePose = basePose('home', 'Domov', 'home');
/** How each hand's paths are drawn: filled bands, or middle lines as strokes of their width. */
function styleHands(): void {
  for (const s of SIDES) {
    const w = widths[s];
    for (const [e, width] of [[paths[s].lines, w?.lines], [paths[s].creases, w?.creases], [ghostPaths[s], w?.lines]] as const) {
      e.classList.toggle('middle', !!w);
      if (w) e.setAttribute('stroke-width', String(width)); else e.removeAttribute('stroke-width');
    }
  }
}
function drawGhost(): void {
  styleHands();
  const g = posed(homePose);
  for (const s of SIDES) ghostPaths[s].setAttribute('d', draw(src[s].lines, g[s].lines));
}

let current = 'home', shown: Posed | null = null, anim = 0;
const poseById = (id: string) => st.poses.find((p) => p.id === id) ?? st.poses[0];
function render(xy: Posed): void {
  for (const s of SIDES) for (const k of KINDS) paths[s][k].setAttribute('d', draw(src[s][k], xy[s][k]));
  drawDots(xy);
}
/** Where an axis point shows in the shown pose (the back of the hand's line never moves with a finger). */
const axisAt = (s: Side, f: number, j: number): Pt => {
  const pose = poseById(current);
  return f === PALM ? movePoint(s, PALM_LINE[s][j], FINGERS.map(() => ({ w: 0, s: 0 })), pose[s]) : movePoint(s, AXES[s][f][j], axisReach[s][f][j], pose[s]);
};
function renderAxes(): void {
  handlesG.replaceChildren();
  const editing = tool() === 'axes';
  for (const s of SIDES) {
    [...AXES[s], PALM_LINE[s]].forEach((line, f) => {
      const pts = line.map((_, j) => axisAt(s, f, j));
      paths[s].axes[f].setAttribute('points', pts.map((p) => p.join(',')).join(' '));
      if (editing) for (const p of pts) el('circle', { class: 'axis-handle', cx: p[0], cy: p[1], r: 4, fill: fingerColor(s, f) }, handlesG);
    });
  }
}
/** Which finger each point moves with, in the finger's colour (grey: the back of the hand). */
const fingerColor = (s: Side, f: number) => (f === PALM ? '#777' : FINGER_COLORS[(s === 'left' ? 4 - f : 5 + f) as Finger]);
const showDots = $<HTMLInputElement>('dots');
function drawDots(xy: Posed): void {
  dotsG.replaceChildren();
  if (!showDots.checked) return;
  for (const s of SIDES) for (const k of KINDS) {
    src[s][k].w.forEach((w, i) => {
      if (src[s][k].anchor[i] !== i) return;
      let best = PALM, most = 0.5;
      w.forEach((r, f) => { if (r.w > most && r.s > 0) { best = f; most = r.w; } });
      const own = ownerOf(s, k, i) != null;
      el('circle', { class: 'dot', cx: xy[s][k][i][0], cy: xy[s][k][i][1], r: own ? 2.2 : 1.6, fill: fingerColor(s, best) }, dotsG);
    });
  }
}
showDots.addEventListener('change', () => { if (shown) drawDots(shown); });
function show(id: string, blend = $<HTMLInputElement>('smooth').checked): void {
  const fresh = id !== current;
  current = id;
  markKeys();
  for (const b of document.querySelectorAll<HTMLElement>('#poses .rows-chip')) b.classList.toggle('now', b.dataset.id === id);
  if (fresh) buildPanels();
  renderAxes();
  const from = shown, to = posed(poseById(id));
  cancelAnimationFrame(anim);
  if (!from || !blend || matchMedia('(prefers-reduced-motion: reduce)').matches) { shown = to; render(to); return; }
  const t0 = performance.now(), dur = Math.min(280, stepS() * 500);
  const mix = (t: number): Posed => Object.fromEntries(SIDES.map((s) => [s, Object.fromEntries(KINDS.map((k) => [k, from[s][k].map((p, i) => [p[0] + (to[s][k][i][0] - p[0]) * t, p[1] + (to[s][k][i][1] - p[1]) * t])]))])) as Posed;
  const tick = (now: number) => {
    const t = smooth(clamp((now - t0) / dur));
    shown = mix(t);
    render(shown);
    if (t < 1) anim = requestAnimationFrame(tick);
  };
  anim = requestAnimationFrame(tick);
}
let dirty = false;
function changed(): void {
  if (!dirty) say('Neuložené zmeny');
  dirty = true;
}
function redraw(ghostToo = false): void {
  cancelAnimationFrame(anim);
  shown = posed(poseById(current));
  render(shown);
  renderAxes();
  if (ghostToo) drawGhost();
  changed();
}
addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });

// ---- poses: the strip and the cycle ----

const posesEl = $('poses');
function buildChips(): void {
  posesEl.replaceChildren();
  for (const p of st.poses) {
    const chip = Object.assign(document.createElement('span'), { className: `rows-chip${p.id === current ? ' now' : ''}`, tabIndex: 0 });
    chip.dataset.id = p.id;
    chip.setAttribute('role', 'button');
    const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: p.on, title: 'V striedaní' });
    box.addEventListener('click', (e) => { e.stopPropagation(); p.on = box.checked; changed(); });
    chip.append(box, p.name);
    if (keyOfPose(p.id)) {
      const x = Object.assign(document.createElement('button'), { className: 'x', textContent: '×', title: 'Odstrániť pózu (pri uložení zmizne aj jej SVG)' });
      x.addEventListener('click', (e) => {
        e.stopPropagation();
        st.poses = st.poses.filter((q) => q !== p);
        if (current === p.id) current = '';
        buildChips();
        show(current || 'home', false);
        changed();
      });
      chip.append(x);
    }
    const pick = () => { setPlaying(false); show(p.id); };
    chip.addEventListener('click', pick);
    chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    posesEl.append(chip);
  }
}
let playing = false, timer = 0;
const playBtn = $<HTMLButtonElement>('play'), stepIn = $<HTMLInputElement>('step');
const stepS = () => Math.max(0.2, Number(stepIn.value) || 1);
function next(): void {
  const list = st.poses.filter((p) => p.on);
  if (!list.length) return;
  show(list[(list.findIndex((p) => p.id === current) + 1) % list.length].id);
}
function setPlaying(p: boolean): void {
  playing = p;
  playBtn.textContent = p ? 'Pauza' : 'Prehrať';
  clearInterval(timer);
  if (p) timer = window.setInterval(next, stepS() * 1000);
}
playBtn.addEventListener('click', () => setPlaying(!playing));
stepIn.addEventListener('change', () => { if (playing) setPlaying(true); });
$<HTMLInputElement>('ghost').addEventListener('change', (e) => ghost.setAttribute('display', (e.target as HTMLInputElement).checked ? 'inline' : 'none'));
$<HTMLInputElement>('axes').addEventListener('change', (e) => axesG.setAttribute('display', (e.target as HTMLInputElement).checked ? 'inline' : 'none'));

// ---- sliders ----

function slider<T>(parent: Element, id: string, [key, label, lo, hi, step]: Field<keyof T>, obj: T, base: number, onChange: () => void): void {
  const box = Object.assign(document.createElement('div'), { className: 's' });
  box.innerHTML = `<label for="${id}">${label}</label><output for="${id}"></output><input type="range" id="${id}" min="${lo}" max="${hi}" step="${step}">`;
  const input = box.querySelector('input')!, out = box.querySelector('output')!;
  const get = () => obj[key] as number, set = (v: number) => { (obj[key] as number) = v; };
  const sync = () => { input.value = String(get()); out.textContent = String(get()); box.classList.toggle('changed', get() !== base); };
  sync();
  input.addEventListener('input', () => { set(Number(input.value)); sync(); onChange(); });
  input.addEventListener('dblclick', () => { set(base); sync(); onChange(); });
  parent.append(box);
}
function fingerBlocks(parent: Element, side: Side, list: FingerMove[], bases: FingerMove[], idp: string, onChange: () => void): void {
  FINGERS.forEach((name, f) => {
    const box = Object.assign(document.createElement('div'), { className: 'finger' });
    box.innerHTML = `<h3>${name}</h3>`;
    const sl = Object.assign(document.createElement('div'), { className: 'sliders' });
    for (const fld of FINGER_FIELDS) slider(sl, `${idp}-${side}-${f}-${fld[0]}`, fld, list[f], bases[f][fld[0]], onChange);
    box.append(sl);
    parent.append(box);
  });
}
const column = (title: string) => {
  const col = Object.assign(document.createElement('div'), { className: 'hand-col' });
  col.innerHTML = `<h3>${title}</h3>`;
  return col;
};
function buildBase(): void {
  const host = $('baseHands');
  host.replaceChildren();
  for (const s of SIDES) {
    const col = column(SIDE_NAME[s]);
    const palm = Object.assign(document.createElement('div'), { className: 'sliders' });
    slider(palm, `palm-${s}`, [s, 'Chrbát ruky kratší', -40, 80, 1], st.palm, 0, () => redraw(true));
    col.append(palm);
    fingerBlocks(col, s, st.base[s], BASE_DEFAULTS[s], 'base', () => redraw(true));
    host.append(col);
  }
}
function buildPanels(): void {
  const pose = poseById(current);
  $('poseTitle').textContent = `Póza ${pose.name}`;
  const rowsEl = $('rowHands'), poseEl = $('poseHands');
  rowsEl.replaceChildren();
  poseEl.replaceChildren();
  const names = SIDES.map((s) => ROW_NAMES[pose[s].row]);
  $('rowTitle').textContent = names[0] === names[1] ? `Rad: ${names[0]}` : `Rady: ${names[0]} / ${names[1]}`;
  for (const s of SIDES) {
    const hp = pose[s];
    const rc = column(`${SIDE_NAME[s]}, ${ROW_NAMES[hp.row]}`);
    const rs = Object.assign(document.createElement('div'), { className: 'sliders' });
    for (const fld of ROW_FIELDS) slider(rs, `row-${hp.row}-${s}-${fld[0]}`, fld, st.rows[hp.row][s], ROW_DEFAULTS[hp.row][s][fld[0]], redraw);
    rc.append(rs);
    rowsEl.append(rc);

    const pc = Object.assign(document.createElement('div'), { className: 'hand-col' });
    const head = Object.assign(document.createElement('div'), { className: 'head' });
    head.innerHTML = `<h3>${SIDE_NAME[s]}</h3>`;
    const sel = Object.assign(document.createElement('select'), { id: `row-of-${s}` });
    sel.setAttribute('aria-label', `Rad, ${SIDE_NAME[s]}`);
    for (const r of Object.keys(ROW_NAMES) as RowName[]) sel.append(new Option(ROW_NAMES[r], r, false, r === hp.row));
    sel.addEventListener('change', () => { hp.row = sel.value as RowName; buildPanels(); redraw(); });
    const reset = Object.assign(document.createElement('button'), { textContent: 'Reset ruky' });
    reset.addEventListener('click', () => { Object.assign(hp, handPose(hp.row)); buildPanels(); redraw(); });
    head.append(sel, reset);
    // The whole hand's small moves in this pose, added to its row's (the same kinds, finer steps).
    const whole = Object.assign(document.createElement('div'), { className: 'sliders' });
    for (const [k, label, lo, hi] of ROW_FIELDS) slider(whole, `pose-${s}-${k}`, [k, label, lo / 2, hi / 2, 0.5], hp, 0, redraw);
    pc.append(head, whole);
    fingerBlocks(pc, s, hp.f, moves(), 'f', redraw);
    poseEl.append(pc);
  }
}
$('baseReset').addEventListener('click', () => { st.base = structuredClone(BASE_DEFAULTS); st.palm = { left: 0, right: 0 }; buildBase(); redraw(true); });
$('poseReset').addEventListener('click', () => { const p = poseById(current); for (const s of SIDES) Object.assign(p[s], handPose(p[s].row)); buildPanels(); redraw(); });
$('rowReset').addEventListener('click', () => {
  const p = poseById(current);
  for (const s of SIDES) st.rows[p[s].row][s] = structuredClone(ROW_DEFAULTS[p[s].row][s]);
  buildPanels();
  redraw(true);
});

// ---- the mouse on the outline: the brush moves points, the paint gives them to a finger, the axes are dragged ----

const radiusIn = $<HTMLInputElement>('radius'), undoBtn = $<HTMLButtonElement>('undo'), paintFinger = $<HTMLSelectElement>('paintFinger');
const tool = () => (document.querySelector<HTMLInputElement>('input[name="tool"]:checked')?.value ?? 'keys') as 'keys' | 'brush' | 'paint' | 'axes';
const undoStack: { edits: typeof edits; owners: RowsState['owners']; axes: RowsState['axes'] }[] = [];
const snapshot = () => ({ edits: structuredClone(edits), owners: structuredClone(st.owners), axes: structuredClone(st.axes) });
function onTool(): void {
  const t = tool();
  stageBox.classList.toggle('keys-tool', t === 'keys');
  stageBox.classList.toggle('brush-tool', t === 'brush' || t === 'paint');
  stageBox.classList.toggle('axes-tool', t === 'axes');
  brushRing.setAttribute('display', t === 'brush' || t === 'paint' ? 'inline' : 'none');
  if (t === 'paint' && !showDots.checked) { showDots.checked = true; if (shown) drawDots(shown); }
  // The axes are edited on the home position, their lines shown.
  if (t === 'axes') {
    $<HTMLInputElement>('axes').checked = true;
    axesG.setAttribute('display', 'inline');
    if (current !== 'home') show('home', false);
  }
  if (t !== 'keys') setPlaying(false);
  renderAxes();
}
for (const r of document.querySelectorAll<HTMLInputElement>('input[name="tool"]')) r.addEventListener('change', onTool);
radiusIn.addEventListener('input', () => { $('radiusOut').textContent = radiusIn.value; brushRing.setAttribute('r', radiusIn.value); });
const toSvg = (e: MouseEvent): Pt => { const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse()); return [pt.x, pt.y]; };
let dragAt: Pt | null = null;
/** The points (of the shown pose) under the brush, with how strongly. */
function* under(at: Pt, kinds: Kind[]): Generator<[Side, Kind, number, number]> {
  const R = Number(radiusIn.value);
  for (const s of SIDES) for (const k of kinds) {
    const now = shown![s][k];
    for (let i = 0; i < now.length; i++) {
      const d = Math.hypot(now[i][0] - at[0], now[i][1] - at[1]);
      if (d < R) yield [s, k, i, smooth(1 - d / R)];
    }
  }
}
function paint(at: Pt): void {
  const f = Number(paintFinger.value), touched = new Set<string>();
  for (const [s, k, i] of under(at, KINDS)) {
    if (src[s][k].anchor[i] !== i) continue;
    const owners: Owners = st.owners[s][k];
    if (f < 0) delete owners[i]; else owners[i] = f;
    touched.add(`${s}.${k}`);
  }
  // A control point follows its end point's finger: the whole path is weighed again.
  for (const key of touched) { const [s, k] = key.split('.') as [Side, Kind]; weigh(s, k); }
}
/** The axis point being dragged: its hand, finger (PALM: the back of the hand's line) and number. */
let dragAxis: { s: Side; f: number; j: number } | null = null;
function nearestHandle(at: Pt): typeof dragAxis {
  let best: typeof dragAxis = null, bestD = 10;
  for (const s of SIDES) [...AXES[s], PALM_LINE[s]].forEach((line, f) => line.forEach((_, j) => {
    const p = axisAt(s, f, j), d = Math.hypot(p[0] - at[0], p[1] - at[1]);
    if (d < bestD) { bestD = d; best = { s, f, j }; }
  }));
  return best;
}
/** What an axis point is and where it belongs (the hint over it before it is dragged). */
function axisHint(f: number, j: number): string {
  if (f === PALM) {
    return [
      'Chrbát ruky 1: pri zápästí na strane malíčka, na chrbte ruky asi pol klávesu od obrysu (nie na čiare obrysu).',
      'Chrbát ruky 2: pod koreňom malíčka, kúsok pod zárezom medzi malíčkom a prstenníkom.',
      'Chrbát ruky 3: pod koreňmi prostredníka a ukazováka, kúsok pod zárezmi medzi prstami.',
      'Chrbát ruky 4: v záreze medzi ukazovákom a palcom.',
    ][j] + '<br><small>Čiara chrbta ruky vedie po chrbte ruky kúsok pod koreňmi prstov. Body obrysu bližšie k nej ako k osi niektorého prsta patria chrbtu ruky: s prstami sa nehýbu.</small>';
  }
  const name = FINGERS[f], Name = `${name[0].toUpperCase()}${name.slice(1)}`;
  if (f === 0) {
    return [
      'Palec, koreň: pri zápästí, kde palec vychádza z ruky. Tu sa pohyb palca začína.',
      'Palec, 1. kĺb: v strede palca na kĺbe, kde sa končí dlhá kosť pri zápästí.',
      'Palec, 2. kĺb: v strede palca na kĺbe pred posledným článkom.',
      'Palec, špička: v strede bruška pri končeku. Tu je pohyb palca najväčší.',
    ][j] + '<br><small>Os vedie stredom palca. Body obrysu najbližšie k nej sa hýbu s palcom.</small>';
  }
  return [
    `${Name}, kĺb pri chrbte ruky: v strede koreňa prsta, vo výške zárezov medzi prstami. Tu sa pohyb prsta začína.`,
    `${Name}, kĺb medzi 1. a 2. článkom: v strede prsta na tomto kĺbe. Tu pôsobí posuvník „stred prsta“.`,
    `${Name}, kĺb medzi 2. a 3. článkom: v strede prsta na tomto kĺbe.`,
    `${Name}, špička: v strede bruška pri končeku. Tu je pohyb prsta najväčší.`,
  ][j] + '<br><small>Os vedie stredom prsta cez jeho kĺby. Body obrysu najbližšie k nej sa hýbu s týmto prstom.</small>';
}
const hintEl = Object.assign(document.createElement('div'), { className: 'axis-hint', hidden: true });
document.body.append(hintEl);
svg.addEventListener('pointerleave', () => { hintEl.hidden = true; });
svg.addEventListener('pointermove', (e) => {
  const p = toSvg(e);
  brushRing.setAttribute('cx', String(p[0]));
  brushRing.setAttribute('cy', String(p[1]));
  // Over an axis point (not dragging it yet): what it is and where it belongs.
  const over = tool() === 'axes' && !dragAt ? nearestHandle(p) : null;
  hintEl.hidden = !over;
  if (over) {
    hintEl.innerHTML = `<b>${SIDE_NAME[over.s]}</b>: ${axisHint(over.f, over.j)}`;
    hintEl.style.left = `${e.clientX + 14}px`;
    hintEl.style.top = `${e.clientY + 14}px`;
  }
  if (!dragAt || !shown) return;
  if (dragAxis) {
    const { s, f, j } = dragAxis, v = f === PALM ? PALM_LINE[s][j] : AXES[s][f][j];
    v[0] += p[0] - dragAt[0];
    v[1] += p[1] - dragAt[1];
    st.axes = { ...st.axes, [s]: { fingers: structuredClone(AXES[s]), palm: structuredClone(PALM_LINE[s]) } };
    refreshAxes(s);
  } else if (tool() === 'brush') {
    const dx = p[0] - dragAt[0], dy = p[1] - dragAt[1];
    for (const [s, k, i, w] of under(dragAt, KINDS)) { edits[s][k][2 * i] += dx * w; edits[s][k][2 * i + 1] += dy * w; }
  } else paint(p);
  dragAt = p;
  shown = posed(poseById(current));
  render(shown);
  if (dragAxis) renderAxes();
});
svg.addEventListener('pointerdown', (e) => {
  if (tool() === 'keys') return;
  e.preventDefault();
  cancelAnimationFrame(anim);
  shown = posed(poseById(current));
  const at = toSvg(e);
  if (tool() === 'axes') {
    dragAxis = nearestHandle(at);
    if (!dragAxis) return;
  }
  undoStack.push(snapshot());
  if (undoStack.length > 40) undoStack.shift();
  undoBtn.disabled = false;
  dragAt = at;
  if (tool() === 'paint') paint(dragAt);
  svg.setPointerCapture(e.pointerId);
});
const endDrag = () => { if (!dragAt) return; dragAt = null; dragAxis = null; redraw(true); };
svg.addEventListener('pointerdown', () => { hintEl.hidden = true; });
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);
/** Each hand's axes as the state says (the owner's, or fitted to the outline again). */
const applyAxes = () => { for (const s of SIDES) setAxes(s); };
undoBtn.addEventListener('click', () => {
  const last = undoStack.pop();
  if (!last) return;
  for (const s of SIDES) for (const k of KINDS) edits[s][k] = last.edits[s][k];
  st.owners = last.owners;
  st.axes = last.axes;
  applyAxes();
  undoBtn.disabled = !undoStack.length;
  redraw(true);
});
$('axesAuto').addEventListener('click', () => {
  undoStack.push(snapshot());
  undoBtn.disabled = false;
  st.axes = undefined;
  applyAxes();
  redraw(true);
});
$('clearEdits').addEventListener('click', () => {
  undoStack.push(snapshot());
  undoBtn.disabled = false;
  for (const s of SIDES) for (const k of KINDS) edits[s][k].fill(0);
  redraw(true);
});

// ---- the outline as an SVG, to edit elsewhere and load back ----

const outlineOf = (s: Side): Outline => {
  const d = (k: Kind) => draw(src[s][k], src[s][k].xy.map((_, i) => edited(s, k, i)));
  return { lines: d('lines'), creases: d('creases'), ...(widths[s] ? { width: widths[s] } : {}) };
};
// The outline as an SVG file, to edit elsewhere (Inkscape) and load back: the system's own open and save dialogs.
type Picker = { getFile(): Promise<File>; createWritable(): Promise<{ write(d: Blob): Promise<void>; close(): Promise<void> }> };
const pickers = window as unknown as {
  showOpenFilePicker?: (o: object) => Promise<Picker[]>;
  showSaveFilePicker?: (o: object) => Promise<Picker>;
};
const SVG_TYPE = { types: [{ description: 'SVG', accept: { 'image/svg+xml': ['.svg'] } }] };
const cancelled = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';
/** An SVG file's text, chosen in the open dialog (null: none chosen). */
async function openSvg(): Promise<string | null> {
  if (pickers.showOpenFilePicker) {
    try {
      const [h] = await pickers.showOpenFilePicker(SVG_TYPE);
      return await (await h.getFile()).text();
    } catch (e) {
      if (cancelled(e)) return null;
    }
  }
  // Browsers without the dialog: a file input.
  return new Promise((done) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.svg,image/svg+xml' });
    input.addEventListener('change', () => void (input.files?.[0]?.text() ?? Promise.resolve(null)).then(done));
    input.click();
  });
}
/** Writes an SVG where the save dialog says; true when saved. */
async function saveSvg(text: string, name: string): Promise<boolean> {
  const blob = new Blob([text], { type: 'image/svg+xml' });
  if (pickers.showSaveFilePicker) {
    try {
      const h = await pickers.showSaveFilePicker({ suggestedName: name, ...SVG_TYPE });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      return true;
    } catch (e) {
      if (cancelled(e)) return false;
    }
  }
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
for (const [id, s] of [['downloadLeft', 'left'], ['downloadRight', 'right']] as const) {
  $(id).addEventListener('click', async () => {
    if (await saveSvg(outlineSvg(s, outlineOf(s), 'outline'), `hand-${s}.svg`)) say(`${SIDE_NAME[s]}: obrys uložený do súboru`);
  });
}
for (const [id, s] of [['loadLeft', 'left'], ['loadRight', 'right']] as const) {
  $(id).addEventListener('click', async () => {
    const text = await openSvg();
    if (text == null) return;
    const o = readOutline(text);
    if (!o.lines) return say('V súbore nie je žiadna cesta (path)', true);
    // An editor's default hairline is no width meant for the hands: the present ones stay.
    if (!o.width || o.width.lines < MIN_WIDTH) o.width = widths[s] ?? { lines: 3.2, creases: 1.4 };
    const moved = placeLike(s, o);
    // The rows and the poses always stay (they move whatever outline there is). The home position's corrections were
    // made for the outline before: a new drawing may already be the home position itself, or only a better line.
    const asked = hasBase(s);
    const keep = !asked || confirm(
      `${SIDE_NAME[s]}: ponechať opravy základnej polohy (prsty, chrbát ruky) aj na novom obryse?\n\n` +
      'OK: ponechať, všetko sa prepočíta s novým obrysom.\nZrušiť: vynulovať, nový obrys je domovská poloha tak, ako je nakreslený.\n\n' +
      'Rady a pózy ostanú v každom prípade; body priradené prstom ručne sa zrušia (nový obrys má iné body).',
    );
    if (!keep) {
      st.base[s] = moves();
      st.palm[s] = 0;
      buildBase();
    }
    replaceOutline(s, o);
    say(`${SIDE_NAME[s]}: obrys načítaný${moved ? `, posunutý o ${moved} podľa okraja palca` : ''}, ${asked ? `, opravy základnej polohy ${keep ? 'ponechané' : 'vynulované'}` : ''}, ulož ho`);
  });
}
/** Whether a hand has any correction of its home position (a finger moved, the back of the hand shorter). */
const hasBase = (s: Side) => !!st.palm[s] || st.base[s].some((m) => Object.values(m).some((v) => v !== 0));
/** Thinner outline lines (keyboard units) than this come from an editor's default, not from the owner. */
const MIN_WIDTH = 1.5;
/** A drawing this far (keyboard units) from the hand's place was drawn elsewhere (another page area in the editor). */
const ELSEWHERE = 40;
/**
 * An outline drawn elsewhere is moved onto the hand's place: its outermost point on the thumb's side (the left hand's
 * rightmost, the right hand's leftmost) onto the present outline's. Returns how far it moved ('' when in place).
 */
function placeLike(s: Side, o: Outline): string {
  const thumbEdge = (path: Omit<Path, 'w'>, at: (i: number) => Pt) => {
    let best: Pt | null = null;
    path.xy.forEach((_, i) => {
      if (path.anchor[i] !== i) return;
      const p = at(i);
      if (!best || (s === 'left' ? p[0] > best[0] : p[0] < best[0])) best = p;
    });
    return best as Pt | null;
  };
  // Split as the hand is (loadSide), so the same drawing finds the same edge point and loads to the same place.
  const fresh = parse(subdivide(o.lines));
  const from = thumbEdge(fresh, (i) => fresh.xy[i]), to = thumbEdge(src[s].lines, (i) => edited(s, 'lines', i));
  if (!from || !to || Math.hypot(to[0] - from[0], to[1] - from[1]) < ELSEWHERE) return '';
  const dx = to[0] - from[0], dy = to[1] - from[1];
  o.lines = shiftPath(o.lines, dx, dy);
  o.creases = shiftPath(o.creases, dx, dy);
  return `${Math.round(dx)}, ${Math.round(dy)}`;
}
/** A path (absolute commands, x y pairs) moved by dx, dy. */
const shiftPath = (d: string, dx: number, dy: number) => {
  let i = 0;
  return d.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (n) => (Math.round((Number(n) + (i++ % 2 ? dy : dx)) * 100) / 100).toString());
};
/** A hand's new outline: other points, so the fingers given by hand and the undo steps no longer fit. */
function replaceOutline(s: Side, o: Outline): void {
  undoStack.length = 0;
  undoBtn.disabled = true;
  st.owners[s] = { lines: {}, creases: {} };
  loadSide(s, o);
  redraw(true);
}
// Bands into middle lines: one stroke per line, so moving a finger bends its lines instead of tearing a band's two edges apart.
$('centerline').addEventListener('click', () => {
  for (const s of SIDES) {
    if (widths[s]) continue;
    const band = outlineOf(s), lines = centerline(band.lines), creases = centerline(band.creases);
    replaceOutline(s, { lines: lines.d, creases: creases.d, width: { lines: lines.width, creases: creases.width } });
  }
  say('Obrys je zo stredových čiar; body prstom priraď prípadne znova a ulož ho');
});

// ---- saving ----

const tapko = new BroadcastChannel(HANDS_CHANNEL);
async function save(): Promise<void> {
  const files: OutlineFile[] = [];
  const out = (side: Side, name: string, hp: HandPose) => {
    const xy = posedSide(side, hp);
    files.push({ side, name, lines: draw(src[side].lines, xy.lines), creases: draw(src[side].creases, xy.creases), ...(widths[side] ? { width: widths[side] } : {}) });
  };
  for (const s of SIDES) out(s, 'home', homePose[s]);
  for (const p of st.poses) {
    const key = keyOfPose(p.id);
    if (key) { const side: Side = p.id[0] === 'l' ? 'left' : 'right'; out(side, p.id, p[side]); }
  }
  const outline = { left: outlineOf('left'), right: outlineOf('right') };
  say('Ukladám…');
  const r = await fetch('/__hand-poser/rows-save', { method: 'POST', body: JSON.stringify({ state: st, outline, files }) });
  const res = (await r.json()) as { ok: boolean; error?: string; written?: string[]; removed?: string[] };
  if (!res.ok) return say(res.error ?? 'Nepodarilo sa uložiť', true);
  // The brush's moves are now in the source outline.
  for (const s of SIDES) loadSide(s, outline[s]);
  undoStack.length = 0;
  undoBtn.disabled = true;
  dirty = false;
  tapko.postMessage('saved');
  redraw(true);
  dirty = false;
  say(`Uložené: ${res.written!.length} SVG${res.removed!.length ? `, zmazané ${res.removed!.join(', ')}` : ''}`);
}
$('save').addEventListener('click', () => void save());
addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void save(); } });

// ---- start ----

(async () => {
  const r = await fetch('/__hand-poser/rows');
  const res = (await r.json()) as { ok: boolean; state: RowsState | null; outline: Record<Side, Outline> };
  if (res.state) st = withDefaults({ ...startState(), ...res.state });
  for (const s of SIDES) loadSide(s, res.outline[s]);
  drawBoard();
  buildChips();
  buildBase();
  buildPanels();
  drawGhost();
  onTool();
  show('home', false);
  // Tapko's paw button (dev server) opens the pose of the key typed last: ?pose=<side>/<name>.
  const asked = new URLSearchParams(location.search).get('pose')?.split('/')[1];
  if (asked) openPose(asked);
  dirty = false;
  say(res.state ? 'Nastavenia načítané' : 'Prvé spustenie: pôvodné hodnoty, ulož ich');
})();
