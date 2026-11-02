import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../keyboard/layouts';
import { type Rig, drawHand, fingerJoints, keyMiddle, posesFor, restPose } from './hand-rig';
import { handOf } from './hands';

const sk = LAYOUTS['sk-qwertz'];
const rig = JSON.parse(readFileSync('public/hands/rig.json', 'utf8')) as Rig;
const pad = (side: 'left' | 'right', f: number, pose = restPose(side)) => fingerJoints(rig[side], side, f, pose).joints[3];
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('hands', () => {
  it('finds a key on the real 15-unit grid in full size units', () => {
    expect(keyMiddle(sk, 'KeyQ')).toEqual([1.5 * 58 + 27, 50 + 23]);
    expect(keyMiddle(sk, 'KeyJ')).toEqual([1.75 * 58 + 6 * 58 + 27, 100 + 23]);
    expect(keyMiddle(sk, 'Nope')).toBeNull();
  });

  it('tells the hand of a key; the space bar is the thumbs\'', () => {
    expect(handOf(sk, 'KeyF')).toBe('left');
    expect(handOf(sk, 'KeyU')).toBe('right');
    expect(handOf(sk, 'Space')).toBeNull();
  });

  it('at rest the skeleton draws the drawing as it is', () => {
    const drawn = drawHand(rig.left, 'left', restPose('left'));
    const first = rig.left.lines[0];
    expect(drawn.lines.startsWith(first.cmds.replace('#', `${first.pts[0].toFixed(1)} ${first.pts[1].toFixed(1)}`).slice(0, 10))).toBe(true);
  });

  it('a reach puts the typing fingertip on its key, one key up from home', () => {
    const poses = posesFor(rig, sk, { code: 'KeyU', shift: false }, null);
    const want = [pad('right', 6)[0] + keyMiddle(sk, 'KeyU')![0] - keyMiddle(sk, 'KeyJ')![0], pad('right', 6)[1] - 50];
    expect(dist(pad('right', 6, poses.right), want)).toBeLessThan(3);
  });

  it('a home key pressed moves only its finger (and the middle finger a hair for the index)', () => {
    const poses = posesFor(rig, sk, { code: 'KeyS', shift: false }, null);
    expect(dist(pad('left', 1, poses.left), pad('left', 1))).toBeGreaterThan(2);
    for (const f of [0, 2, 3]) expect(dist(pad('left', f, poses.left), pad('left', f))).toBeLessThan(0.01);
    expect(poses.right).toEqual(restPose('right'));
  });

  it('the space bar bends the thumb of the hand that did not type the last key', () => {
    expect(posesFor(rig, sk, { code: 'Space', shift: false }, 'left').right.fingers[5].bend[0]).toBeGreaterThan(0);
    expect(posesFor(rig, sk, { code: 'Space', shift: false }, 'right').left.fingers[4].bend[0]).toBeGreaterThan(0);
  });
});
