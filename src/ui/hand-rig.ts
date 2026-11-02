import { type KeyStep, type Layout, keyByCode, shiftKeyFor } from '../keyboard/layouts';

/**
 * The hands' skeleton (public/hands/rig.json, made by scripts/hands.mjs): the drawing's lines bound to bones, and the poses that
 * bend them. Seen from above, bending a joint tilts the bones after it down towards the keys, so they look shorter: each bone
 * has a resting tilt (the drawing's curled fingers) and its seen length is its true length times the cosine of its tilt.
 * Units are those of the full size keyboard (a key and its gap 58 wide, a row 50 high). The owner's rules for the hands are in
 * assets-src/PROMPTS.md, section 12; each is one of the named numbers below.
 */

export type Side = 'left' | 'right';
type Pt = [number, number];
export interface RiggedPath {
  cmds: string;
  pts: number[];
  /** Per point: bone A, its weight, bone B (bone f*3+i of finger f; -1 the palm). */
  w: number[];
}
export interface RigHand {
  skeleton: Record<string, Pt[]>;
  wrist: Pt;
  lines: RiggedPath[];
  creases: RiggedPath[];
  nails: (RiggedPath & { f: number })[];
}
export type Rig = Record<Side, RigHand>;

/** A finger's pose: its turn at the knuckle (radians, clockwise on screen) and the extra bend of its three joints. */
export interface FingerPose {
  spread: number;
  bend: [number, number, number];
}
export interface HandPose {
  /** The whole hand: a move and a turn around the wrist. */
  dx: number;
  dy: number;
  turn: number;
  fingers: Record<number, FingerPose>;
}

const FINGERS: Record<Side, number[]> = { left: [0, 1, 2, 3, 4], right: [5, 6, 7, 8, 9] };
const THUMB: Record<Side, number> = { left: 4, right: 5 };
/** The keys the fingertips rest on. */
const HOME_KEY: Record<number, string> = { 0: 'KeyA', 1: 'KeyS', 2: 'KeyD', 3: 'KeyF', 6: 'KeyJ', 7: 'KeyK', 8: 'KeyL', 9: 'Semicolon' };
/** Resting tilt of a finger's three bones (radians, summed along the finger), the thumb's flatter. */
const REST_TILT = [0.45, 0.95, 1.1];
const THUMB_TILT = [0.2, 0.3, 0.45];
const MAX_TILT = 1.25;
/** How a bend spreads over the joints when a fingertip has to reach a point. */
const BEND_SHARE: [number, number, number] = [0.35, 0.4, 0.25];

// ---- the owner's rules (assets-src/PROMPTS.md §12) ----
/** A home key pressed: the finger bends a little, tip and middle joint towards the palm. */
const PRESS_BEND: [number, number, number] = [0.05, 0.04, 0];
/** The little and ring fingers pressed come a little towards the index; the ring finger slides under the middle one. */
const PRESS_SPREAD: Record<number, number> = { 0: 0.05, 1: 0.07, 8: -0.07, 9: -0.05 };
/** The index pressed brings the middle finger very slightly closer. */
const INDEX_PULLS_MIDDLE = 0.03;
/** The space bar: the thumb of the hand that did not type the last key goes down. */
const THUMB_PRESS: [number, number, number] = [0.25, 0.2, 0.1];
/** A reach up with the index: the middle finger bends a little after it, the ring finger hardly; the thumb follows up and towards the reach; the hand up a hair. */
const REACH_UP = { middle: 0.18, ring: 0.06, thumbSpread: 0.08, thumbBend: -0.12, handUp: 6 };
/** The index far up to the side (T, Z): the other fingers curl until their last joints tuck under. */
const FAR_CURL: [number, number, number] = [0.1, 0.16, 0.12];
/** A nail hides when its bone tilts past this. */
const NAIL_HIDE = [1.05, 1.22];

const rot = ([x, y]: Pt, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const len = (a: Pt) => Math.hypot(a[0], a[1]);

export const restPose = (side: Side): HandPose => ({
  dx: 0, dy: 0, turn: 0,
  fingers: Object.fromEntries(FINGERS[side].map((f) => [f, { spread: 0, bend: [0, 0, 0] }])),
});

/** A finger's joints as seen from above in a pose, and its bones' tilts. */
export function fingerJoints(hand: RigHand, side: Side, f: number, pose: HandPose): { joints: Pt[]; tilt: number[] } {
  const rest = hand.skeleton[f];
  const tilts = f === THUMB[side] ? THUMB_TILT : REST_TILT;
  const fp = pose.fingers[f] ?? { spread: 0, bend: [0, 0, 0] };
  const place = (p: Pt) => add(add(rot(sub(p, hand.wrist), pose.turn), hand.wrist), [pose.dx, pose.dy]);
  const joints: Pt[] = [place(rest[0])];
  const tilt: number[] = [];
  let bent = 0;
  for (let i = 0; i < 3; i++) {
    const seen = sub(rest[i + 1], rest[i]);
    const trueLen = len(seen) / Math.cos(tilts[i]);
    bent += fp.bend[i];
    const t = Math.max(0, Math.min(MAX_TILT, tilts[i] + bent));
    tilt.push(t);
    const dir = rot(scale(seen, 1 / len(seen)), pose.turn + fp.spread);
    joints.push(add(joints[i], scale(dir, trueLen * Math.cos(t))));
  }
  return { joints, tilt };
}

/** Bends a finger so its pad lands on `target`: its turn and one bend shared over its joints, the rest of its pose kept. */
export function reach(hand: RigHand, side: Side, f: number, pose: HandPose, target: Pt): HandPose {
  const base = pose.fingers[f] ?? { spread: 0, bend: [0, 0, 0] as [number, number, number] };
  let spread = base.spread, k = 0;
  const at = (sp: number, kk: number) => {
    const p = { ...pose, fingers: { ...pose.fingers, [f]: { spread: sp, bend: base.bend.map((b, i) => b + kk * BEND_SHARE[i]) as [number, number, number] } } };
    return { p, j: fingerJoints(hand, side, f, p).joints };
  };
  for (let i = 0; i < 30; i++) {
    const { j } = at(spread, k);
    const root = j[0], tip = j[3];
    const want = sub(target, root), have = sub(tip, root);
    spread += Math.atan2(want[1], want[0]) - Math.atan2(have[1], have[0]);
    const d = len(want) - len(have);
    const step = (len(sub(at(spread, k + 0.01).j[3], root)) - len(sub(at(spread, k).j[3], root))) / 0.01;
    if (Math.abs(step) > 1e-6) k = Math.max(-2.5, Math.min(2.5, k + d / step));
  }
  return at(spread, k).p;
}

const bendBy = (pose: HandPose, f: number, by: [number, number, number], spread = 0): HandPose => {
  const fp = pose.fingers[f] ?? { spread: 0, bend: [0, 0, 0] };
  return { ...pose, fingers: { ...pose.fingers, [f]: { spread: fp.spread + spread, bend: fp.bend.map((b, i) => b + by[i]) as [number, number, number] } } };
};

/** The middle of a key in full size units (the same grid as the on-screen keyboard). */
export function keyMiddle(layout: Layout, code: string): Pt | null {
  const UNIT = 58, GAP = 4, KEY_H = 46;
  for (const [r, row] of layout.rows.entries()) {
    let x = 0;
    for (const d of row) {
      x += (d.x ?? 0) * UNIT;
      if (d.code === code) return [x + ((d.w ?? 1) * UNIT - GAP) / 2, r * (KEY_H + GAP) + KEY_H / 2];
      x += (d.w ?? 1) * UNIT;
    }
  }
  return null;
}

/**
 * Both hands' poses for a press (null: both at rest). `lastHand`: the hand that typed the key before (the space bar's thumb is
 * the other one's).
 */
export function posesFor(rig: Rig, layout: Layout, step: KeyStep | null, lastHand: Side | null): Record<Side, HandPose> {
  const poses: Record<Side, HandPose> = { left: restPose('left'), right: restPose('right') };
  if (!step) return poses;
  const def = keyByCode(layout, step.code);
  if (!def) return poses;
  if (def.finger === 4 || def.finger === 5) {
    const side: Side = lastHand === 'right' ? 'left' : 'right';
    poses[side] = bendBy(poses[side], THUMB[side], THUMB_PRESS);
    return poses;
  }
  const f = def.finger, side: Side = f < 4 ? 'left' : 'right', toIndex = side === 'left' ? 1 : -1;
  const hand = rig[side];
  let pose = poses[side];
  if (HOME_KEY[f] === step.code) {
    pose = bendBy(pose, f, PRESS_BEND, PRESS_SPREAD[f] ?? 0);
    if (f === 3 || f === 6) pose = bendBy(pose, side === 'left' ? 2 : 7, [0, 0, 0], INDEX_PULLS_MIDDLE * toIndex);
  } else {
    const home = HOME_KEY[f] && keyMiddle(layout, HOME_KEY[f]), to = keyMiddle(layout, step.code);
    if (home && to) {
      const row = Math.round((to[1] - home[1]) / 50);
      if (row < 0) pose = { ...pose, dy: pose.dy - REACH_UP.handUp };
      const pad = hand.skeleton[f][3];
      pose = reach(hand, side, f, pose, add(pad, sub(to, home)));
      if (row < 0 && (f === 3 || f === 6)) {
        const middle = side === 'left' ? 2 : 7, ring = side === 'left' ? 1 : 8;
        pose = bendBy(pose, middle, scale3(BEND_SHARE, REACH_UP.middle));
        pose = bendBy(pose, ring, scale3(BEND_SHARE, REACH_UP.ring));
        pose = bendBy(pose, THUMB[side], scale3(BEND_SHARE, REACH_UP.thumbBend), REACH_UP.thumbSpread * -toIndex);
        // Far up to the side: the other fingers curl right in.
        if (Math.abs(to[0] - home[0]) > 20) for (const other of FINGERS[side]) if (other !== f && other !== THUMB[side]) pose = bendBy(pose, other, FAR_CURL);
      }
    }
  }
  poses[side] = pose;
  // A capital: the other hand's little finger on its Shift.
  const shift = shiftKeyFor(layout, step);
  const sdef = shift && keyByCode(layout, shift);
  if (sdef && shift) {
    const sSide: Side = sdef.finger < 5 ? 'left' : 'right';
    const home = keyMiddle(layout, HOME_KEY[sdef.finger]), to = keyMiddle(layout, shift);
    if (home && to && sSide !== side) poses[sSide] = reach(rig[sSide], sSide, sdef.finger, poses[sSide], add(rig[sSide].skeleton[sdef.finger][3], sub(to, home)));
  }
  return poses;
}
const scale3 = (v: [number, number, number], k: number): [number, number, number] => [v[0] * k, v[1] * k, v[2] * k];

/** A pose between two (t from 0 to 1), for moving from one to the next. */
export function blend(a: HandPose, b: HandPose, t: number): HandPose {
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    dx: mix(a.dx, b.dx), dy: mix(a.dy, b.dy), turn: mix(a.turn, b.turn),
    fingers: Object.fromEntries(Object.keys(b.fingers).map((f) => {
      const fa = a.fingers[Number(f)] ?? b.fingers[Number(f)], fb = b.fingers[Number(f)];
      return [f, { spread: mix(fa.spread, fb.spread), bend: fb.bend.map((v, i) => mix(fa.bend[i], v)) as [number, number, number] }];
    })),
  };
}

/** Each bone's move from rest to the pose: where a point of the drawing goes (-1: the palm, the hand's own move). */
function boneMoves(hand: RigHand, side: Side, pose: HandPose): { map: (bone: number, p: Pt) => Pt; tilt: Record<number, number[]> } {
  const palm = (p: Pt) => add(add(rot(sub(p, hand.wrist), pose.turn), hand.wrist), [pose.dx, pose.dy]);
  const bones = new Map<number, (p: Pt) => Pt>();
  const tilt: Record<number, number[]> = {};
  for (const f of FINGERS[side]) {
    const rest = hand.skeleton[f];
    const { joints, tilt: t } = fingerJoints(hand, side, f, pose);
    tilt[f] = t;
    for (let i = 0; i < 3; i++) {
      const a = rest[i], ra = sub(rest[i + 1], a), rl = len(ra), d = scale(ra, 1 / rl), n: Pt = [-d[1], d[0]];
      const A = joints[i], pa = sub(joints[i + 1], A), pl = len(pa) || 1e-6, D = scale(pa, 1 / pl), Nn: Pt = [-D[1], D[0]];
      const k = pl / rl;
      bones.set(f * 3 + i, (p) => {
        const v = sub(p, a), u = v[0] * d[0] + v[1] * d[1], w = v[0] * n[0] + v[1] * n[1];
        return add(add(A, scale(D, u * k)), scale(Nn, w));
      });
    }
  }
  return { map: (bone, p) => (bone < 0 ? palm(p) : bones.get(bone)!(p)), tilt };
}

/** A rigged path bent into a pose, as SVG path data. */
function bent(path: RiggedPath, map: (bone: number, p: Pt) => Pt): string {
  let i = 0;
  return path.cmds.replace(/#/g, () => {
    const p: Pt = [path.pts[i * 2], path.pts[i * 2 + 1]];
    const [b1, w1, b2] = [path.w[i * 3], path.w[i * 3 + 1], path.w[i * 3 + 2]];
    const a = map(b1, p), b = w1 < 1 ? map(b2, p) : a;
    i++;
    return `${(a[0] * w1 + b[0] * (1 - w1)).toFixed(1)} ${(a[1] * w1 + b[1] * (1 - w1)).toFixed(1)}`;
  });
}

/** A hand drawn in a pose: its outline, creases and nails (each with its finger and how visible it is). */
export function drawHand(hand: RigHand, side: Side, pose: HandPose): { lines: string; creases: string; nails: { d: string; f: number; seen: number }[] } {
  const { map, tilt } = boneMoves(hand, side, pose);
  return {
    lines: hand.lines.map((p) => bent(p, map)).join(' '),
    creases: hand.creases.map((p) => bent(p, map)).join(' '),
    nails: hand.nails.map((n) => {
      const t = tilt[n.f]?.[2] ?? 0;
      return { d: bent(n, map), f: n.f, seen: Math.max(0, Math.min(1, (NAIL_HIDE[1] - t) / (NAIL_HIDE[1] - NAIL_HIDE[0]))) };
    }),
  };
}
