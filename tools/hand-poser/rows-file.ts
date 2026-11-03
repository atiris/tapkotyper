import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { POSE_NAME, type Side } from '../../src/ui/hand-svg';
import { type Outline, outlineSvg, readOutline } from './outline-svg';

export type { Outline };

/**
 * The hand tool's files (the page tools/hand-poser/index.html): the settings (rows.json), the source outline of each
 * hand's home position (outline/<side>.svg, the brush's edits written into it) and the outlines Tapko draws, made from
 * them (public/hands/<side>/<name>.svg: home and every key pose).
 */

const HERE = 'tools/hand-poser';
const STATE = join(HERE, 'rows.json');
const OUTLINE = (s: Side) => join(HERE, 'outline', `${s}.svg`);
const HANDS = 'public/hands';
const SIDES: Side[] = ['left', 'right'];
/** The mark of a file made here: a later save removes such a file whose pose is gone. */
const SOURCE = 'rows';

/** One finger's moves in keyboard units: bend (+ curls, the tip towards the knuckle), the tip sideways and up, the middle sideways. */
export interface FingerMove { bend: number; x: number; y: number; mid: number }
/** Where a whole hand goes on a row: up, right, its tilt (degrees, + clockwise), the fingers' curl, the thumb's move. */
export interface RowMove { up: number; right: number; tilt: number; curl: number; thumbRight: number; thumbUp: number }
export type RowName = 'bot' | 'home' | 'top' | 'num';
export interface HandPose { row: RowName; tilt: number; f: FingerMove[] }
export interface Pose { id: string; name: string; on: boolean; left: HandPose; right: HandPose }
/** The point numbers of an outline's path that belong to a finger by hand (0 the thumb .. 4 the little finger, 5 the palm). */
export type Owners = Record<string, number>;
export interface RowsState {
  base: Record<Side, FingerMove[]>;
  rows: Record<RowName, Record<Side, RowMove>>;
  poses: Pose[];
  owners: Record<Side, { lines: Owners; creases: Owners }>;
}
export interface OutlineFile extends Outline { side: Side; name: string }

/** The saved settings (null: none yet) and each hand's source outline (the home outline, until the first save). */
export function readRows(): { state: RowsState | null; outline: Record<Side, Outline> } {
  const state = existsSync(STATE) ? (JSON.parse(readFileSync(STATE, 'utf8')) as RowsState) : null;
  const outline = Object.fromEntries(SIDES.map((s) => [s, readOutline(readFileSync(existsSync(OUTLINE(s)) ? OUTLINE(s) : join(HANDS, s, 'home.svg'), 'utf8'))])) as Record<Side, Outline>;
  return { state, outline };
}

const slashes = (file: string) => file.split('\\').join('/');

/** A pose's outline for Tapko. */
function writeHand(f: OutlineFile): string {
  const file = join(HANDS, f.side, `${f.name}.svg`);
  writeFileSync(file, outlineSvg(f.side, f, SOURCE));
  return slashes(file);
}

/** Saves the settings, the source outlines and every pose's outline; removes the outlines made here whose pose is gone. */
export function saveRows(state: RowsState, outline: Record<Side, Outline>, files: OutlineFile[]): { written: string[]; removed: string[] } {
  if (!files.every((f) => SIDES.includes(f.side) && POSE_NAME.test(f.name))) throw new Error('bad pose names');
  writeFileSync(STATE, `${JSON.stringify(state, null, 1)}\n`);
  for (const s of SIDES) writeFileSync(OUTLINE(s), outlineSvg(s, outline[s], 'outline'));
  const written = files.map(writeHand);
  const removed: string[] = [];
  for (const s of SIDES) {
    for (const name of readdirSync(join(HANDS, s))) {
      const file = slashes(join(HANDS, s, name));
      if (!name.endsWith('.svg') || written.includes(file)) continue;
      if (readFileSync(file, 'utf8').includes(`data-source="${SOURCE}"`)) {
        rmSync(file);
        removed.push(file);
      }
    }
  }
  return { written, removed };
}
