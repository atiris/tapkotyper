import { type Finger, type KeyDef, LAYOUTS } from '../../src/keyboard/layouts';
import type { LayoutId } from '../../src/storage/schema';
import { type FingerScheme, fingerOf } from '../../src/keyboard/fingers';
import { POSE_NAME, type Side, VIEW, keyName, poseName } from '../../src/ui/hand-svg';
import { FINGER_COLORS } from '../../src/ui/finger-colors';
import { KeyboardGuide, inkOn, textColorsOn } from '../../src/ui/keyboard-guide';
import '../../src/styles.css';
import { GAP, UNIT, withModifiers } from './board';
import { centerline } from './centerline';
import { outlineSvg, readOutline } from './outline-svg';
import { HANDS_CHANNEL, NAIL_SOFT } from '../../src/ui/hands';
import { findNail } from './nails';
import type { FingerMove, HandLook, HandPose, Nail, Outline, OutlineFile, Owners, Pose, RowMove, RowName, RowsState } from './rows-file';

/**
 * The hand tool (dev server only, /tools/hand-poser/): the home outline (once drawn by Gemini) moved by rules. Each finger's points move with that finger only: a correction of the home position (base), the row the hand
 * types on (it moves the whole hand and curls the fingers) and each key pose's own tilt and finger moves. The brush moves
 * the home outline's points; the paint gives points to a finger by hand. Saving writes the settings, the source outline
 * and the SVG of home and of every key pose for Tapko.
 */

type Pt = [number, number];
type Kind = 'lines' | 'creases';
interface Reach { w: number; s: number }
/** A path's commands and points; a curve's control point moves with the finger of the end point it belongs to (anchor). */
interface Path { parts: (string | null)[]; xy: Pt[]; anchor: number[]; w: Reach[][] }

const SIDES: Side[] = ['left', 'right'];
const KINDS: Kind[] = ['lines', 'creases'];
const SIDE_NAME: Record<Side, string> = { left: 'Ľavá ruka', right: 'Pravá ruka' };
const FINGERS = ['palec', 'ukazovák', 'prostredník', 'prstenník', 'malíček'];
const PALM = 5;
const ROW_NAMES: Record<RowName, string> = { bot: 'dolný rad', home: 'domovský rad', top: 'horný rad', num: 'číselný rad', off: 'mimo klávesnice' };
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
const zeroRow = (): RowMove => ({ up: 0, right: 0, tilt: 0, curl: 0, thumbRight: 0, thumbUp: 0, short: 0, spread: 0, vee: 0 });
const ROW_DEFAULTS: Record<RowName, Record<Side, RowMove>> = {
  bot: { left: { up: -15, right: 8, tilt: 0, curl: 20, thumbRight: 0, thumbUp: 10, short: 0, spread: 0, vee: 0 }, right: { up: -15, right: 8, tilt: 0, curl: 20, thumbRight: 0, thumbUp: 10, short: 0, spread: 0, vee: 0 } },
  home: { left: zeroRow(), right: zeroRow() },
  top: { left: { up: 25, right: 0, tilt: 0, curl: 17, thumbRight: 5, thumbUp: -13, short: 0, spread: 0, vee: 0 }, right: { up: 25, right: 0, tilt: 0, curl: 17, thumbRight: -5, thumbUp: -13, short: 0, spread: 0, vee: 0 } },
  num: { left: { up: 50, right: 0, tilt: 0, curl: 35, thumbRight: 10, thumbUp: -25, short: 0, spread: 0, vee: 0 }, right: { up: 50, right: 0, tilt: 0, curl: 35, thumbRight: -10, thumbUp: -25, short: 0, spread: 0, vee: 0 } },
  // Beside the keyboard: each hand out to its side and a little lower, turned a little out, the fingers loose.
  off: { left: { up: -40, right: -330, tilt: -10, curl: -5, thumbRight: 0, thumbUp: 0, short: 0, spread: 0, vee: 0 }, right: { up: -40, right: 330, tilt: 10, curl: -5, thumbRight: 0, thumbUp: 0, short: 0, spread: 0, vee: 0 } },
};
/** The sliders' wider ranges beside the keyboard (the hands move far out). */
const OFF_RANGE: Partial<Record<keyof RowMove, [number, number]>> = { up: [-200, 150], right: [-600, 600], tilt: [-45, 45] };
/** A row's sliders: beside the keyboard with wider ranges. */
const rowFields = (row: RowName): Field<keyof RowMove>[] => ROW_FIELDS.map(([k, label, lo, hi, step]) => [k, label, ...(row === 'off' ? OFF_RANGE[k] ?? [lo, hi] : [lo, hi]), step] as Field<keyof RowMove>);
type Field<K> = [key: K, label: string, lo: number, hi: number, step: number];
const ROW_FIELDS: Field<keyof RowMove>[] = [
  ['up', 'Ruka hore', -80, 120, 1], ['right', 'Ruka vpravo', -80, 80, 1], ['tilt', 'Odklon ruky (° vpravo)', -20, 20, 0.5],
  ['curl', 'Skrčenie prstov', -60, 80, 1], ['thumbRight', 'Palec vpravo', -60, 60, 1], ['thumbUp', 'Palec hore', -50, 40, 1],
  ['short', 'Chrbát ruky kratší', -40, 80, 1], ['spread', 'Roztiahnutie prstov ← →', -160, 160, 1],
  ['vee', 'Prsty do V (°)', -20, 60, 0.5],
];
const FINGER_FIELDS: Field<keyof FingerMove>[] = [['bend', 'skrčiť / vystrieť', -80, 80, 1], ['x', 'koniec ← →', -80, 80, 1], ['y', 'koniec ↓ ↑', -60, 60, 1], ['mid', 'stred prsta ← →', -25, 25, 1]];

/**
 * The palette tried first (FINGER_COLORS order: left little finger .. left thumb, right thumb .. right little finger):
 * brown, light blue, dark green, pink; grey thumbs; dark blue, red, light green, violet (the owner's wish, 2026-11-03).
 */
const PROPOSED_COLORS = ['#8c5a2b', '#56b4e9', '#1b7f4b', '#e87fb5', '#bbbbbb', '#bbbbbb', '#1f4fa0', '#d1352b', '#8fd14f', '#8e44ad'];
/** The lines' look at first: as Tapko drew them (grey, the thin lines 40 % see-through). */
const LOOK_DEFAULT: HandLook = {
  typing: { lines: { width: 3.2, color: '#5a5560', transparency: 0 }, creases: { width: 1.4, color: '#5a5560', transparency: 40 }, nails: { transparency: 0 } },
  off: { lines: { color: '#5a5560', transparency: 0 }, creases: { color: '#5a5560', transparency: 40 }, nails: { transparency: 0 } },
};
/** Filled nails only on the hands beside the keyboard, until the owner turns on more. */
const NAILS_DEFAULT = { rows: false, keys: false, off: true };
/** The palette in use here: the one being tried. */
const palette = (): string[] => st.colors ?? Object.values(FINGER_COLORS);
/** A hand's finger (0 the thumb .. 4 the little finger) as Tapko's Finger (0 left little finger .. 9 right little finger). */
const fingerIndex = (s: Side, f: number) => (s === 'left' ? 4 - f : 5 + f);
/** Which nails setting a pose follows: a key's press, the hands beside the keyboard, or a whole row. */
const nailKind = (id: string): 'keys' | 'off' | 'rows' => (keyOfPose(id) ? 'keys' : id === 'off' ? 'off' : 'rows');

/** The poses of whole rows (above the keyboard), each named by its row. */
const ROW_POSES: [RowName, string][] = [['home', 'Domov'], ['top', 'Horný rad'], ['num', 'Číselný rad'], ['bot', 'Dolný rad'], ['off', 'Mimo klávesnice']];
/** Each row's colour: its shadow under the poses made from it, and the dot on its badge (beside the keyboard: none, no pose is made from it). */
const ROW_COLOR: Partial<Record<RowName, string>> = { home: '#c75aa5', top: '#d0453a', bot: '#d0453a', num: '#3a6fd0' };
const handPose = (row: RowName): HandPose => ({ row, ...zeroRow(), f: moves() });
const basePose = (id: string, name: string, row: RowName): Pose => ({ id, name, on: true, left: handPose(row), right: handPose(row) });
const startState = (): RowsState => ({
  base: structuredClone(BASE_DEFAULTS),
  palm: { left: 0, right: 0 },
  palmSize: { left: 0, right: 0 },
  handSize: { left: 0, right: 0 },
  keepTips: { left: true, right: true },
  metacarpus: { left: 0, right: 0 },
  vee: { left: 0, right: 0 },
  rows: structuredClone(ROW_DEFAULTS),
  poses: ROW_POSES.map(([id, name]) => basePose(id, name, id)),
  owners: { left: { lines: {}, creases: {} }, right: { lines: {}, creases: {} } },
  colors: [...PROPOSED_COLORS],
  style: structuredClone(LOOK_DEFAULT),
  nails: { ...NAILS_DEFAULT },
});

/** Settings saved before a field existed get its default (no migrations: a new field starts at nothing). */
function withDefaults(state: RowsState): RowsState {
  for (const r of Object.keys(ROW_DEFAULTS) as RowName[]) state.rows[r] ??= structuredClone(ROW_DEFAULTS[r]);
  state.palmSize ??= { left: 0, right: 0 };
  state.keepTips ??= { left: true, right: true };
  state.metacarpus ??= { left: 0, right: 0 };
  state.vee ??= { left: 0, right: 0 };
  state.handSize ??= { left: 0, right: 0 };
  state.colors ??= [...PROPOSED_COLORS];
  state.nails ??= { ...NAILS_DEFAULT };
  state.style ??= structuredClone(LOOK_DEFAULT);
  for (const kind of ['typing', 'off'] as const) state.style[kind].nails ??= { transparency: 0 };
  for (const r of Object.keys(state.rows) as RowName[]) for (const s of SIDES) state.rows[r][s] = { ...zeroRow(), ...state.rows[r][s] };
  for (const [id, name] of ROW_POSES) if (!state.poses.some((p) => p.id === id)) state.poses.push(basePose(id, name, id));
  for (const s of SIDES) {
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
/**
 * How much a point moves with each finger (the one given by hand, or the nearest axes; the back of the hand's line never
 * moves) and where it lies along every finger.
 */
function reach(side: Side, p: Pt, owner?: number): Reach[] {
  const along = (f: number) => nearOnLine(p, AXES[side][f]).s;
  if (owner === PALM) return FINGERS.map((_, f) => ({ w: 0, s: along(f) }));
  if (owner != null && owner >= 0) return FINGERS.map((_, f) => ({ w: f === owner ? 1 : 0, s: along(f) }));
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
/** The middle of the four fingertips across and up: a bigger palm grows around its x, a bigger hand around both. */
const TIPS_X = {} as Record<Side, number>;
const TIPS_Y = {} as Record<Side, number>;
/**
 * How far a finger's tip goes when the fingers spread: the finger on the far side of the move stays (to the right:
 * the leftmost one), the others go the more the farther they are from it, the opposite one all the way.
 */
function fan(side: Side, f: number, spread: number): number {
  const fromLeft = side === 'left' ? 4 - f : f - 1;
  return spread > 0 ? (spread * fromLeft) / 3 : (spread * (3 - fromLeft)) / 3;
}
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
  TIPS_X[s] = AXES[s].slice(1).reduce((sum, line) => sum + line.at(-1)![0], 0) / 4;
  TIPS_Y[s] = AXES[s].slice(1).reduce((sum, line) => sum + line.at(-1)![1], 0) / 4;
  findNails(s);
}
/** How big a nail can be (keyboard units from its middle, along the finger and across). */
const FINGER_NAIL = { along: 11, across: 11 }, THUMB_NAIL = { along: 17, across: 11 };
/** Each finger's nail on the home outline (keyboard units), with how its points move (with that finger only). */
const NAILS = {} as Record<Side, ({ pts: Pt[]; w: Reach[][] } | null)[]>;
/** The nails found again around each finger's tip point (after the outline, a brush stroke or the axes changed). */
function findNails(s: Side): void {
  const d = (k: Kind) => draw(src[s][k], src[s][k].xy.map((_, i) => edited(s, k, i)));
  const lines = [{ d: d('lines'), width: widths[s]?.lines ?? 0 }, { d: d('creases'), width: widths[s]?.creases ?? 0 }];
  NAILS[s] = AXES[s].map((axis, f) => {
    // The thumb's nail is longer and wider than the fingers'.
    const tip = axis.at(-1)!, before = axis.at(-2)!, len = Math.hypot(tip[0] - before[0], tip[1] - before[1]) || 1;
    const pts = findNail(lines, tip, [(tip[0] - before[0]) / len, (tip[1] - before[1]) / len], f === 0 ? THUMB_NAIL : FINGER_NAIL);
    return pts && { pts, w: pts.map((p) => FINGERS.map((_, g) => ({ w: g === f ? 1 : 0, s: g === f ? nearOnLine(p, axis).s : 0 }))) };
  });
}
/** A nail's polygon as a closed path. */
const nailPath = (pts: Pt[]) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')} Z`;
/** A pose's nails (both hands, or one hand in its own pose), as closed paths in their fingers' colours. */
function posedNails(pose: Pose, side?: Side, hp?: HandPose): (Nail & { pts: Pt[] })[] {
  const out: (Nail & { pts: Pt[] })[] = [];
  for (const s of side ? [side] : SIDES) {
    NAILS[s]?.forEach((n, f) => {
      if (!n) return;
      const pts = n.pts.map((p, i) => movePoint(s, p, n.w[i], hp ?? pose[s]));
      out.push({ finger: fingerIndex(s, f), color: palette()[fingerIndex(s, f)], d: nailPath(pts), pts });
    });
  }
  return out;
}
const ownerOf = (s: Side, k: Kind, i: number): number | undefined => st.owners[s][k][i];
function weigh(s: Side, k: Kind): void {
  const path = src[s][k];
  for (const i of path.xy.keys()) {
    const a = path.anchor[i], r = reach(s, path.xy[a], ownerOf(s, k, a));
    // A control point moves with its end point's fingers, but as far as its own place along them: where a finger's
    // move turns or stretches its lines, the curve's handles turn with them and the line stays smooth.
    path.w[i] = a === i ? r : r.map((q, f) => ({ w: q.w, s: nearOnLine(path.xy[i], AXES[s][f]).s }));
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t), clamp = (x: number) => Math.min(1, Math.max(0, x));
/** Each finger's way from its tip to its knuckle (a unit vector): where a bend moves its points. */
const unitDirs = (s: Side) => AXES[s].map((l) => {
  const b = l[0], t = l.at(-1)!, n = Math.hypot(b[0] - t[0], b[1] - t[1]);
  return [(b[0] - t[0]) / n, (b[1] - t[1]) / n] as Pt;
});
const UNIT_DIR = {} as Record<Side, Pt[]>;
/**
 * A finger's sideways move turns it (it keeps its width): the turn grows from nothing a little below its knuckle
 * (TURN_DEEP of its length deep in the back of the hand, the thumb at its root) to all of it at TURN_ROOT along it.
 */
const TURN_ROOT = 0.35, TURN_DEEP = 0.25;
/** How far around a finger's knuckle (of its length) the back of the hand turns a little with it. */
const TURN_NEAR = 0.4;
/** How much wider the back of the hand gets at the knuckles per degree of the V. */
const VEE_WIDEN = 0.003;
/**
 * How much each of the four fingers turns when they go apart in a V, against the little finger's turn: the middle finger
 * stays, the others turn away from it the more the farther their knuckle is (+ the tip to the right).
 */
function veeShare(side: Side, f: number): number {
  const k = (g: number) => AXES[side][g][0][0], far = k(4) - k(2);
  return far ? (k(f) - k(2)) / Math.abs(far) : 0;
}
/** Where along each finger its joint between the 1st and 2nd bone lies (0 the knuckle, 1 the tip). */
const MID_AT = {} as Record<Side, number[]>;
/** How much the "middle of the finger" move reaches a place along it: most at the joint between the 1st and 2nd bone. */
const midBump = (s: number, at: number) => Math.exp(-(((s - at) / 0.18) ** 2));

/** One point of a hand in a pose: the fingers move (base correction, row curl and thumb, the pose's own moves), then the hand tilts and shifts. */
function movePoint(side: Side, p: Pt, w: Reach[], hp: HandPose): Pt {
  const row = st.rows[hp.row][side];
  let x = p[0], y = p[1];
  // The row's moves of the whole hand and the pose's small ones on top.
  const both = (k: keyof RowMove) => row[k] + hp[k];
  // A bigger palm: the back of the hand grows from the line of the knuckles (around the fingertips' middle), each
  // finger only at its root, the fingertips stay on their keys.
  const size = st.palmSize[side] / 100;
  if (size) {
    let grow = 1;
    for (let f = 0; f < 5; f++) grow -= w[f].w * clamp(w[f].s);
    x += (x - TIPS_X[side]) * size * grow;
    y += (y - KNUCKLE_Y[side]) * size * grow;
  }
  // The back of the hand shorter (as if lifted): below the knuckles it is pressed towards them, the most at the wrist.
  // The metacarpus shorter: between the knuckles and where the thumb joins the palm the hand is pressed together, below
  // it all goes up by the whole of it, and so does the whole thumb (it goes forward).
  const short = st.palm[side] + both('short'), knuckles = KNUCKLE_Y[side], meta = st.metacarpus[side], join = AXES[side][0][0][1];
  const back = (py: number, thumb: number) => {
    let q = py;
    if (short && q > knuckles) q -= (short * (q - knuckles)) / (WRIST_Y - knuckles);
    if (meta) q -= meta * (thumb + (1 - thumb) * clamp((py - knuckles) / (join - knuckles)));
    return q;
  };
  y = back(y, w[0].w);
  // Apart in a V: the back of the hand widens at the knuckles (less towards the wrist), each finger with its knuckle;
  // the thumb only at its root.
  const vee = st.vee[side] + both('vee');
  // A bigger hand grows around the fingertips' middle (after the fingers' moves); with the tips kept, each finger turns
  // back in by as much as its tip would go out.
  const grow = st.handSize[side] / 100, keep = st.keepTips[side] && grow ? 1 / (1 + grow) - 1 : 0;
  const knuckle = (f: number): Pt => {
    const k = AXES[side][f][0];
    return [k[0] + (k[0] - TIPS_X[side]) * size, back(k[1] + (k[1] - KNUCKLE_Y[side]) * size, f ? 0 : 1)];
  };
  let shift = 0;
  if (vee) {
    const mid = (knuckle(1)[0] + knuckle(4)[0]) / 2, widen = vee * VEE_WIDEN;
    const at = (px: number, py: number) => (px - mid) * widen * smooth(clamp((WRIST_Y - py) / (WRIST_Y - knuckles)));
    let fingers = 0;
    for (let f = 1; f < 5; f++) if (w[f].s > 0) { fingers += w[f].w; shift += w[f].w * at(...knuckle(f)); }
    shift += (1 - fingers - (w[0].s > 0 ? w[0].w : 0)) * at(x, y) + (w[0].s > 0 ? w[0].w * at(x, y) * (1 - smooth(clamp(w[0].s))) : 0);
  }
  // Each finger: bent (its tip towards the knuckle), then turned around a point a little below its knuckle so that its
  // tip lands where the sideways moves and the V put it, and made longer or shorter along itself to reach it. A turn
  // keeps the finger's width; the back of the hand near the knuckle turns a little with it.
  const px = x, py = y, palm = 1 - w.reduce((sum, q) => sum + q.w, 0);
  for (let f = 0; f < 5; f++) {
    const { w: wf, s } = w[f];
    const mine = hp.f[f], base = st.base[side][f], u = UNIT_DIR[side][f];
    const end = AXES[side][f].at(-1)!, tip: Pt = f ? end : [end[0], back(end[1], 1)];
    const k = knuckle(f), len = Math.hypot(tip[0] - k[0], tip[1] - k[1]);
    const deep = f ? TURN_DEEP : 0;
    const near = f && palm > 1e-4 ? palm * Math.exp(-((Math.hypot(px - k[0], py - k[1]) / (TURN_NEAR * len)) ** 2)) : 0;
    const turnW = wf + near, turnAt = smooth(clamp((s + deep) / (TURN_ROOT + deep)));
    if (turnW < 1e-4 || turnAt <= 0) continue;
    const bend = mine.bend + base.bend + (f ? both('curl') : 0);
    const dx = mine.x + base.x + (f ? fan(side, f, both('spread')) + (tip[0] - TIPS_X[side]) * keep : both('thumbRight')), dy = mine.y + base.y + (f ? 0 : both('thumbUp'));
    const pivot: Pt = [k[0] + u[0] * deep * len, k[1] + u[1] * deep * len];
    // The bent tip from the pivot, and where it should go.
    const from: Pt = [tip[0] + u[0] * bend - pivot[0], tip[1] + u[1] * bend - pivot[1]], to: Pt = [from[0] + dx, from[1] - dy];
    const turn = Math.atan2(from[0] * to[1] - from[1] * to[0], from[0] * to[0] + from[1] * to[1]) + (f ? (vee * veeShare(side, f) * Math.PI) / 180 : 0);
    const longer = Math.hypot(...to) - Math.hypot(...from), fingerAt = wf * (s > 0 ? 1 : 0);
    const bx = px + fingerAt * u[0] * bend * s - pivot[0], by = py + fingerAt * u[1] * bend * s - pivot[1];
    const a = turnW * turn * turnAt, c = Math.cos(a), sn = Math.sin(a);
    const m = fingerAt * (mine.mid + base.mid) * midBump(s, MID_AT[side][f]), stretch = fingerAt * longer * clamp(s);
    x += pivot[0] + bx * c - by * sn - px + stretch * -(u[0] * c - u[1] * sn) + m;
    y += pivot[1] + bx * sn + by * c - py + stretch * -(u[0] * sn + u[1] * c);
  }
  x += shift;
  // A bigger hand: all of it, the same in every direction around the fingertips' middle.
  x += (x - TIPS_X[side]) * grow;
  y += (y - TIPS_Y[side]) * grow;
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
const layoutSel = $<HTMLSelectElement>('layout'), schemeSel = $<HTMLSelectElement>('scheme'), codesBox = $<HTMLInputElement>('codes'), lookSel = $<HTMLSelectElement>('kbLook');
try {
  layoutSel.value = localStorage.getItem('hand-rows-layout') || layoutSel.value;
  schemeSel.value = localStorage.getItem('hand-rows-scheme') || schemeSel.value;
  codesBox.checked = localStorage.getItem('hand-rows-codes') === '1';
  lookSel.value = localStorage.getItem('hand-rows-look') || lookSel.value;
} catch { /* the defaults */ }
// A layout no longer offered (Slovak QWERTZ): the first one.
if (!layoutSel.value) layoutSel.selectedIndex = 0;
const board = () => withModifiers(LAYOUTS[layoutSel.value as LayoutId]);
const scheme = () => schemeSel.value as FingerScheme;
interface KeyBox { def: KeyDef; name: string; row: number; key: HTMLElement }
let keyBoxes: KeyBox[] = [];
const stageBox = $('stageBox');
function drawBoard(): void {
  // How the keyboard shows under the hands: as in Tapko, only the keys' outlines, grey, or not at all.
  if (!lookSel.value) lookSel.selectedIndex = 0;
  for (const o of lookSel.options) stageBox.classList.toggle(`kb-${o.value}`, o.value === lookSel.value);
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
      // The codes the poses' names use instead of the characters (by the key's place: the top row's Y is y0 on every layout).
      if (codesBox.checked && def.code !== 'Space') {
        key.querySelector('.kb-label')!.textContent = name;
        key.querySelector('.kb-shift')?.remove();
      }
      // The finger's colour by the chosen fingering (Tapko's keyboard colours the standard one).
      const color = palette()[fingerOf(def, scheme())], [bg, ink] = textColorsOn(color);
      key.style.setProperty('--finger', color);
      key.style.setProperty('--finger-ink', inkOn(color));
      key.style.setProperty('--next-bg', bg);
      key.style.setProperty('--next-ink', ink);
      // The space bar is pressed by either thumb: its two halves are the two hands' poses.
      if (def.code === 'Space') {
        key.title = 'sp, ľavá polovica sl: ľavý palec (l1sl), pravá sr: pravý palec (r1sr)';
        for (const [side, pose] of [['left', 'l1sl'], ['right', 'r1sr']]) {
          const half = Object.assign(document.createElement('span'), { className: `sp-half ${side}`, textContent: pose.slice(2) });
          half.dataset.pose = pose;
          key.append(half);
        }
      }
      const box = { def, name, row: r, key };
      key.addEventListener('click', (e) => { if (tool() === 'keys') pickKey(box, e); });
      keyBoxes.push(box);
    }
  }
  markKeys();
}
for (const sel of [layoutSel, schemeSel, codesBox, lookSel]) sel.addEventListener('change', () => {
  try {
    localStorage.setItem('hand-rows-look', lookSel.value);
    localStorage.setItem('hand-rows-layout', layoutSel.value);
    localStorage.setItem('hand-rows-scheme', schemeSel.value);
    localStorage.setItem('hand-rows-codes', codesBox.checked ? '1' : '0');
  } catch { /* not kept */ }
  drawBoard();
});
const keyOfPose = (id: string) => (/^[lr][1-5]/.test(id) ? id.slice(2) : null);
/** The shown pose's key lit; a green dot on every key with a pose here. */
function markKeys(): void {
  const key = keyOfPose(current), have = new Set(st.poses.map((p) => keyOfPose(p.id)));
  for (const k of keyBoxes) {
    const halves = k.key.querySelectorAll<HTMLElement>('.sp-half');
    k.key.classList.toggle('pose-key', k.name === key && !halves.length);
    k.key.classList.toggle('has-pose', have.has(k.name) && !halves.length);
    // The space bar: each half for its own thumb's pose.
    for (const h of halves) {
      h.classList.toggle('pose-key', current === h.dataset.pose);
      h.classList.toggle('has-pose', st.poses.some((p) => p.id === h.dataset.pose));
    }
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
  // The shown pose's key again: back to the home position (to watch the move between them).
  if (id === current) { setPlaying(false); show('home'); return; }
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

// The nails' edges a little soft, as in Tapko (src/ui/hands.ts).
el('feGaussianBlur', { stdDeviation: NAIL_SOFT }, el('filter', { id: 'nail-soft' }, el('defs', {})));
const ghost = el('g', {}), nailsG = el('g', { class: 'nails-layer', filter: 'url(#nail-soft)' }), hands = el('g', {}), dotsG = el('g', {}), axesG = el('g', { display: 'none' });
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
/**
 * The lines' look: their widths while typing (every hand's middle lines, so also the files'), and the shown pose's
 * colours and transparency (beside the keyboard its own).
 */
function applyLook(): void {
  const look = st.style ?? LOOK_DEFAULT, t = look.typing;
  for (const s of SIDES) if (widths[s]) widths[s] = { lines: t.lines.width ?? 3.2, creases: t.creases.width ?? 1.4 };
  const shown = nailKind(current) === 'off' ? look.off : look.typing;
  for (const [part, l] of Object.entries(shown)) {
    if ('color' in l) stageBox.style.setProperty(`--${part}-color`, l.color);
    stageBox.style.setProperty(`--${part}-alpha`, String(1 - l.transparency / 100));
  }
}
/**
 * The shown pose's parent as a shadow, in its row's colour: a key's pose is made from its row's pose (each hand its
 * own), a whole row's pose (and the hands beside the keyboard) from the home position.
 */
function drawGhost(): void {
  applyLook();
  styleHands();
  const pose = poseById(current), key = !!keyOfPose(current);
  for (const s of SIDES) {
    const row = key ? pose[s].row : 'home';
    ghostPaths[s].setAttribute('d', draw(src[s].lines, posedSide(s, poseById(row)[s]).lines));
    (ghostPaths[s] as SVGElement).style.setProperty('--ghost-color', ROW_COLOR[row] ?? ROW_COLOR.home!);
  }
}

let current = 'home', shown: Posed | null = null, anim = 0;
const poseById = (id: string) => st.poses.find((p) => p.id === id) ?? st.poses[0];
function render(xy: Posed): void {
  for (const s of SIDES) for (const k of KINDS) paths[s][k].setAttribute('d', draw(src[s][k], xy[s][k]));
  drawDots(xy);
  drawNails();
}
/** The shown pose's nails, filled in their fingers' colours when its kind of pose has them. */
function drawNails(): void {
  nailsG.replaceChildren();
  if (!st.nails?.[nailKind(current)]) return;
  for (const n of posedNails(poseById(current))) el('path', { d: n.d, fill: n.color }, nailsG);
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
const fingerColor = (s: Side, f: number) => (f === PALM ? '#777' : palette()[fingerIndex(s, f)]);
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
  applyLook();
  markKeys();
  for (const b of document.querySelectorAll<HTMLElement>('.rows-chip')) b.classList.toggle('now', b.dataset.id === id);
  deleteBtn.hidden = !keyOfPose(id);
  // Beside the keyboard the view is wider.
  stageBox.classList.toggle('wide', SIDES.some((s) => poseById(id)[s].row === 'off'));
  if (fresh) {
    buildPanels();
    foldPanels();
  }
  renderAxes();
  drawGhost();
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
  // The home outline changed (brush, outline, base): the nails are found again.
  if (ghostToo) for (const s of SIDES) findNails(s);
  shown = posed(poseById(current));
  render(shown);
  renderAxes();
  drawGhost();
  changed();
}
addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });

// The base and row panels stay folded while a key pose is shown, open for a whole row's pose; a click on the title folds or opens one.
const FOLDED = ['basePanel', 'rowPanel'];
const foldPanels = () => { for (const id of FOLDED) $(id).classList.toggle('folded', !!keyOfPose(current)); };
for (const id of FOLDED) $(id).querySelector('.fold-title')!.addEventListener('click', () => $(id).classList.toggle('folded'));

// ---- poses: the strip and the cycle ----

const posesEl = $('poses'), rowPosesEl = $('rowPoses');
/** The poses: the whole rows above the keyboard, the keys' poses below it (with a tick: in the cycle). */
function buildChips(): void {
  posesEl.replaceChildren();
  rowPosesEl.replaceChildren();
  for (const p of st.poses) {
    const key = !!keyOfPose(p.id);
    const chip = Object.assign(document.createElement('span'), { className: `rows-chip${p.id === current ? ' now' : ''}`, tabIndex: 0 });
    chip.dataset.id = p.id;
    chip.setAttribute('role', 'button');
    if (key) {
      const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: p.on, title: 'V striedaní' });
      box.addEventListener('click', (e) => { e.stopPropagation(); p.on = box.checked; changed(); });
      chip.append(box);
    }
    const color = key ? undefined : ROW_COLOR[p.id as RowName];
    if (color) chip.append(Object.assign(document.createElement('span'), { className: 'rows-dot', style: `background: ${color}`, title: 'Farba tieňa pôz z tohto radu' }));
    chip.append(p.name);
    // The shown pose's badge again: back to the home position.
    const pick = () => { setPlaying(false); show(p.id === current && key ? 'home' : p.id); };
    chip.addEventListener('click', pick);
    chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    (key ? posesEl : rowPosesEl).append(chip);
  }
}
let playing = false, timer = 0;
const playBtn = $<HTMLButtonElement>('play'), stepIn = $<HTMLInputElement>('step');
const stepS = () => Math.max(0.2, Number(stepIn.value) || 1);
// The shown key pose is removed by its own button at the end of the row (its SVG goes at the next save).
const deleteBtn = $<HTMLButtonElement>('deletePose');
deleteBtn.addEventListener('click', () => {
  if (!keyOfPose(current) || !confirm(`Zmazať pózu ${current}? Pri uložení zmizne aj jej SVG.`)) return;
  st.poses = st.poses.filter((p) => p.id !== current);
  buildChips();
  show('home', false);
  changed();
});
/** The cycle plays the keys' poses only (ticked), not the whole rows. */
function next(): void {
  const list = st.poses.filter((p) => p.on && keyOfPose(p.id));
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
$<HTMLInputElement>('ghost').addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked;
  ghost.setAttribute('display', on ? 'inline' : 'none');
  rowPosesEl.classList.toggle('no-ghost', !on);
});
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
    slider(palm, `palm-size-${s}`, [s, 'Veľkosť dlane (%)', -15, 25, 0.5], st.palmSize, 0, () => redraw(true));
    slider(palm, `hand-size-${s}`, [s, 'Veľkosť ruky (%)', -15, 25, 0.5], st.handSize, 0, () => redraw(true));
    const keep = Object.assign(document.createElement('label'), { className: 'rows-keep' });
    const box = Object.assign(document.createElement('input'), { type: 'checkbox', id: `keep-tips-${s}`, checked: st.keepTips[s] });
    box.addEventListener('change', () => { st.keepTips[s] = box.checked; redraw(true); });
    keep.title = 'Ak je to zapnuté a ruka sa zväčší, prsty sa ako kompenzácia zúžia do V, aby poloha špičiek prstov ostala približne zachovaná.';
    keep.append(box, ' udržať špičky');
    palm.append(keep);
    slider(palm, `metacarpus-${s}`, [s, 'Metakarpus kratší', -30, 60, 1], st.metacarpus, 0, () => redraw(true));
    (palm.lastElementChild as HTMLElement).title =
      'Časť ruky medzi hánkami prstov a miestom, kde sa palec pripája k dlani. Kratší: zápästie sa priblíži k hánkam a palec sa posunie dopredu.';
    slider(palm, `vee-${s}`, [s, 'Prsty do V (°)', -20, 60, 0.5], st.vee, 0, () => redraw(true));
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
    for (const fld of rowFields(hp.row)) slider(rs, `row-${hp.row}-${s}-${fld[0]}`, fld, st.rows[hp.row][s], ROW_DEFAULTS[hp.row][s][fld[0]], redraw);
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
    for (const [k, label, lo, hi] of rowFields(hp.row)) slider(whole, `pose-${s}-${k}`, [k, label, lo / 2, hi / 2, 0.5], hp, 0, redraw);
    pc.append(head, whole);
    fingerBlocks(pc, s, hp.f, moves(), 'f', redraw);
    poseEl.append(pc);
  }
}
$('baseReset').addEventListener('click', () => { st.base = structuredClone(BASE_DEFAULTS); st.palm = { left: 0, right: 0 }; st.palmSize = { left: 0, right: 0 }; st.handSize = { left: 0, right: 0 }; st.keepTips = { left: true, right: true }; st.metacarpus = { left: 0, right: 0 }; st.vee = { left: 0, right: 0 }; buildBase(); redraw(true); });
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
      'Palec, špička: v strede nechtu (okolo neho sa nájde a vyfarbí necht). Tu je pohyb palca najväčší.',
    ][j] + '<br><small>Os vedie stredom palca. Body obrysu najbližšie k nej sa hýbu s palcom.</small>';
  }
  return [
    `${Name}, kĺb pri chrbte ruky: v strede koreňa prsta, vo výške zárezov medzi prstami. Tu sa pohyb prsta začína.`,
    `${Name}, kĺb medzi 1. a 2. článkom: v strede prsta na tomto kĺbe. Tu pôsobí posuvník „stred prsta“.`,
    `${Name}, kĺb medzi 2. a 3. článkom: v strede prsta na tomto kĺbe.`,
    `${Name}, špička: v strede nechtu (okolo neho sa nájde a vyfarbí necht). Tu je pohyb prsta najväčší.`,
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
      `${SIDE_NAME[s]}: ponechať opravy základnej polohy (prsty, chrbát ruky, metakarpus, V) aj na novom obryse?\n\n` +
      'OK: ponechať, všetko sa prepočíta s novým obrysom.\nZrušiť: vynulovať, nový obrys je domovská poloha tak, ako je nakreslený.\n\n' +
      'Rady a pózy ostanú v každom prípade; body priradené prstom ručne sa zrušia (nový obrys má iné body).',
    );
    if (!keep) {
      st.base[s] = moves();
      st.palm[s] = 0;
      st.vee[s] = 0;
      st.metacarpus[s] = 0;
      buildBase();
    }
    replaceOutline(s, o);
    say(`${SIDE_NAME[s]}: obrys načítaný${moved ? `, posunutý o ${moved} podľa okraja palca` : ''}, ${asked ? `, opravy základnej polohy ${keep ? 'ponechané' : 'vynulované'}` : ''}, ulož ho`);
  });
}
/** Whether a hand has any correction of its home position (a finger moved, the back of the hand or the metacarpus shorter, the fingers in a V). */
const hasBase = (s: Side) => !!st.palm[s] || !!st.vee[s] || !!st.metacarpus[s] || st.base[s].some((m) => Object.values(m).some((v) => v !== 0));
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

// ---- the fingers' colours and the nails ----

const COLOR_NAMES = ['ľ. malíček', 'ľ. prstenník', 'ľ. prostredník', 'ľ. ukazovák', 'ľ. palec', 'p. palec', 'p. ukazovák', 'p. prostredník', 'p. prstenník', 'p. malíček'];
/** The palette being tried: the keyboard here and the nails show it at once; Tapko gets it only when approved. */
function buildColors(): void {
  const host = $('colorInputs');
  host.replaceChildren();
  palette().forEach((c, i) => {
    const label = document.createElement('label');
    const input = Object.assign(document.createElement('input'), { type: 'color', value: c, id: `color-${i}` });
    input.addEventListener('input', () => {
      st.colors = palette().map((x, j) => (j === i ? input.value : x));
      drawBoard();
      redraw();
    });
    label.append(input, COLOR_NAMES[i]);
    // The thumbs share the space bar: an arrow gives this thumb's colour to the other one.
    if (i === 4 || i === 5) {
      const other = i === 4 ? 5 : 4;
      const copy = Object.assign(document.createElement('button'), {
        type: 'button', className: 'copy-color', textContent: i === 4 ? '→' : '←',
        title: `Preniesť túto farbu na ${COLOR_NAMES[other]}`,
      });
      copy.addEventListener('click', (e) => {
        e.preventDefault();
        st.colors = palette().map((x, j) => (j === other ? palette()[i] : x));
        buildColors();
        drawBoard();
        redraw();
      });
      label.append(copy);
    }
    host.append(label);
  });
  for (const [id, kind] of [['nailsRows', 'rows'], ['nailsKeys', 'keys'], ['nailsOff', 'off']] as const) $<HTMLInputElement>(id).checked = !!st.nails?.[kind];
}
for (const [id, kind] of [['nailsRows', 'rows'], ['nailsKeys', 'keys'], ['nailsOff', 'off']] as const) {
  $<HTMLInputElement>(id).addEventListener('change', (e) => {
    st.nails = { ...(st.nails ?? NAILS_DEFAULT), [kind]: (e.target as HTMLInputElement).checked };
    redraw();
  });
}
$('colorsFromTapko').addEventListener('click', () => {
  st.colors = Object.values(FINGER_COLORS);
  buildColors();
  drawBoard();
  redraw();
});
$('colorsApply').addEventListener('click', async () => {
  if (!confirm('Zapísať tieto farby do Tapka? Zmenia sa klávesy, označenia prstov aj nechty v hre.')) return;
  const r = await fetch('/__hand-poser/finger-colors', { method: 'POST', body: JSON.stringify({ colors: palette() }) });
  const res = (await r.json()) as { ok: boolean; error?: string };
  say(res.ok ? 'Farby zapísané do Tapka (src/ui/finger-colors.ts); ulož aj nastavenia' : res.error ?? 'Nepodarilo sa', !res.ok);
});

// ---- the lines' look ----

/** One kind of line's (or the nails') settings: width (typing lines only), colour (lines only), transparency in per cent. */
function lookRow(host: Element, title: string, l: { width?: number; color?: string; transparency: number }, id: string): void {
  const row = Object.assign(document.createElement('div'), { className: 'look-row' });
  row.append(Object.assign(document.createElement('span'), { textContent: title }));
  const field = (label: string, input: HTMLInputElement, set: (v: string) => void) => {
    const lab = document.createElement('label');
    lab.append(label, input);
    input.addEventListener('input', () => { set(input.value); redraw(true); });
    row.append(lab);
  };
  // Beside the keyboard the width stays the typing one: an empty cell keeps the columns.
  if (l.width == null) row.append(document.createElement('span'));
  if (l.width != null) field('hrúbka', Object.assign(document.createElement('input'), { type: 'number', min: '0.2', max: '10', step: '0.1', value: String(l.width), id: `${id}-w` }), (v) => { l.width = Number(v) || l.width; });
  if (l.color == null) row.append(document.createElement('span'));
  else field('farba', Object.assign(document.createElement('input'), { type: 'color', value: l.color, id: `${id}-c` }), (v) => { l.color = v; });
  field('priehľadnosť %', Object.assign(document.createElement('input'), { type: 'number', min: '0', max: '100', step: '5', value: String(l.transparency), id: `${id}-t` }), (v) => { l.transparency = Math.min(100, Math.max(0, Number(v) || 0)); });
  host.append(row);
}
function buildLook(): void {
  const host = $('lookInputs'), look = (st.style ??= structuredClone(LOOK_DEFAULT));
  host.replaceChildren();
  // Two columns: over the keyboard (typing) and beside it.
  for (const [kind, title] of [['typing', 'Nad klávesnicou (písanie)'], ['off', 'Mimo klávesnice']] as const) {
    const col = Object.assign(document.createElement('div'), { className: 'look-col' });
    col.append(Object.assign(document.createElement('h4'), { textContent: title }));
    lookRow(col, 'hrubé čiary', look[kind].lines, `look-${kind}-lines`);
    lookRow(col, 'tenké čiary', look[kind].creases, `look-${kind}-creases`);
    lookRow(col, 'nechty', look[kind].nails, `look-${kind}-nails`);
    host.append(col);
  }
}

// ---- saving ----

const tapko = new BroadcastChannel(HANDS_CHANNEL);
/** The steps Tapko plays between rest and home. */
const REST_STEPS = 4;
async function save(): Promise<void> {
  const files: OutlineFile[] = [];
  const nailsOn = (kind: 'keys' | 'off' | 'rows') => !!st.nails?.[kind];
  const out = (side: Side, name: string, hp: HandPose, kind: 'keys' | 'off' | 'rows') => {
    const xy = posedSide(side, hp);
    files.push({
      side, name, lines: draw(src[side].lines, xy.lines), creases: draw(src[side].creases, xy.creases),
      ...(widths[side] ? { width: widths[side] } : {}), ...(nailsOn(kind) ? { nails: posedNails(homePose, side, hp).map(({ pts: _, ...n }) => n) } : {}),
    });
  };
  for (const s of SIDES) out(s, 'home', homePose[s], 'rows');
  // Beside the keyboard is Tapko's rest, and the steps on the way from it to home (rest1 nearest rest).
  const off = poseById('off');
  for (const s of SIDES) {
    out(s, 'rest', off[s], 'off');
    const from = posedSide(s, off[s]), to = posedSide(s, homePose[s]);
    for (let k = 1; k <= REST_STEPS; k++) {
      const t = k / (REST_STEPS + 1), mix = (a: Pt[], b: Pt[]) => a.map((p, i): Pt => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
      // The nails on the way: drawn while the hands are still beside the keyboard (the first half of the way).
      const home = posedNails(homePose, s);
      const nails = nailsOn('off') && t <= 0.5 ? posedNails(off, s).map((n, i) => ({ ...n, d: nailPath(mix(n.pts, home[i].pts)) })) : undefined;
      files.push({ side: s, name: `rest${k}`, lines: draw(src[s].lines, mix(from.lines, to.lines)), creases: draw(src[s].creases, mix(from.creases, to.creases)), ...(widths[s] ? { width: widths[s] } : {}), ...(nails ? { nails: nails.map(({ pts: _, ...n }) => n) } : {}) });
    }
  }
  for (const p of st.poses) {
    const key = keyOfPose(p.id);
    if (key) { const side: Side = p.id[0] === 'l' ? 'left' : 'right'; out(side, p.id, p[side], 'keys'); }
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
  buildColors();
  buildLook();
  drawGhost();
  onTool();
  show('home', false);
  // Tapko's paw button (dev server) opens the pose of the key typed last: ?pose=<side>/<name>.
  const asked = new URLSearchParams(location.search).get('pose')?.split('/')[1];
  if (asked) openPose(asked);
  dirty = false;
  say(res.state ? 'Nastavenia načítané' : 'Prvé spustenie: pôvodné hodnoty, ulož ich');
})();
