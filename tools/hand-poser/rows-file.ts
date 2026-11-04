import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { POSE_NAME, type Side } from '../../src/ui/hand-svg';
import { type Drawing, type Outline, outlineSvg, readOutline } from './outline-svg';

export type { Drawing, Outline };

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
/**
 * Where a whole hand goes on a row: up, right, its tilt (degrees, + clockwise), the fingers' curl, the thumb's move, and
 * how much shorter the back of the hand looks (as if lifted; keyboard units at the wrist), and the fingers spread
 * sideways (+ to the right: the leftmost finger stays, the others fan out; - to the left: the rightmost stays), and
 * apart in a V (degrees of the little finger's turn at its knuckle; the back of the hand widens at the knuckles).
 */
export interface RowMove { up: number; right: number; tilt: number; curl: number; thumbRight: number; thumbUp: number; short: number; spread: number; vee: number }
/** The keyboard's rows a hand types on, and `off`: the hands lying beside the keyboard (Tapko's `rest`). */
export type RowName = 'bot' | 'home' | 'top' | 'num' | 'off';
/** A hand in a key pose: its row, the small moves of the whole hand added to the row's, and its fingers' moves. */
export interface HandPose extends RowMove { row: RowName; f: FingerMove[] }
export interface Pose { id: string; name: string; on: boolean; left: HandPose; right: HandPose }
/** The point numbers of an outline's path that belong to a finger by hand (0 the thumb .. 4 the little finger, 5 the palm). */
export type Owners = Record<string, number>;
export interface RowsState {
  base: Record<Side, FingerMove[]>;
  /** The home position's back of the hand made shorter (keyboard units at the wrist). */
  palm: Record<Side, number>;
  /** Each hand's palm size in per cent over the drawing: the back of the hand grows, the fingertips stay on their keys. */
  palmSize: Record<Side, number>;
  /** Each whole hand's size in per cent over the drawing, the same in every direction around the fingertips' middle. */
  handSize: Record<Side, number>;
  /** A bigger hand's fingers turn towards each other (as a V) so that their tips stay about where they were. */
  keepTips: Record<Side, boolean>;
  /**
   * The home position's metacarpus shorter (keyboard units): the back of the hand between the knuckles and where the
   * thumb joins the palm; the wrist comes nearer the knuckles and the thumb goes forward with it.
   */
  metacarpus: Record<Side, number>;
  /** The home position's fingers apart in a V (degrees, as a row's). */
  vee: Record<Side, number>;
  rows: Record<RowName, Record<Side, RowMove>>;
  poses: Pose[];
  owners: Record<Side, { lines: Owners; creases: Owners }>;
  /** Each finger's axis (its joints and tip; thumb first) and the back of the hand's line as the owner set them; none: fitted to the outline. */
  axes?: Partial<Record<Side, { fingers: [number, number][][]; palm: [number, number][] }>>;
  /** The palette being tried (FINGER_COLORS order), until it is approved for Tapko. */
  colors?: string[];
  /** Which poses get filled nails: the whole rows, the keys' presses, the hands beside the keyboard. */
  nails?: { rows: boolean; keys: boolean; off: boolean };
  /** The lines' widths while typing (the files' stroke-width), their colours and transparency and the nails' transparency (src/ui/hand-style.ts). */
  style?: HandLook;
}
export interface LineLook { width?: number; color: string; transparency: number }
/** The filled nails' transparency in per cent. */
export interface NailLook { transparency: number }
export interface HandLook { typing: { lines: LineLook; creases: LineLook; nails: NailLook }; off: { lines: LineLook; creases: LineLook; nails: NailLook } }
/** A nail filled in its finger's colour (Finger 0-9, as FINGER_COLORS). */
export interface Nail { finger: number; d: string; color: string }
export interface OutlineFile extends Outline { side: Side; name: string; nails?: Nail[] }

/** The saved settings (null: none yet) and each hand's source outline (the home outline, until the first save). */
export function readRows(): { state: RowsState | null; outline: Record<Side, Drawing> } {
  const state = existsSync(STATE) ? (JSON.parse(readFileSync(STATE, 'utf8')) as RowsState) : null;
  const outline = Object.fromEntries(SIDES.map((s) => [s, readOutline(readFileSync(existsSync(OUTLINE(s)) ? OUTLINE(s) : join(HANDS, s, 'home.svg'), 'utf8'))])) as Record<Side, Drawing>;
  return { state, outline };
}

const slashes = (file: string) => file.split('\\').join('/');

/** A pose's outline for Tapko. */
function writeHand(f: OutlineFile): string {
  const file = join(HANDS, f.side, `${f.name}.svg`);
  writeFileSync(file, outlineSvg(f.side, f, SOURCE, f.nails));
  return slashes(file);
}

const STYLE_FILE = 'src/ui/hand-style.ts';
/** The lines' colours and transparency and the nails' transparency written into Tapko (src/ui/hand-style.ts), the file's words kept. */
export function writeHandStyle(look: HandLook): void {
  const line = (l: LineLook) => {
    if (!/^#[0-9a-f]{6}$/i.test(l.color) || !(l.transparency >= 0 && l.transparency <= 100)) throw new Error('bad line style');
    return `{ color: '${l.color}', transparency: ${l.transparency} }`;
  };
  const nails = (n: NailLook) => {
    if (!(n.transparency >= 0 && n.transparency <= 100)) throw new Error('bad nail style');
    return `{ transparency: ${n.transparency} }`;
  };
  const body = [
    '{',
    `  typing: { lines: ${line(look.typing.lines)}, creases: ${line(look.typing.creases)}, nails: ${nails(look.typing.nails)} },`,
    `  off: { lines: ${line(look.off.lines)}, creases: ${line(look.off.creases)}, nails: ${nails(look.off.nails)} },`,
    '}',
  ].join('\n');
  const source = readFileSync(STYLE_FILE, 'utf8');
  const start = source.indexOf('} = {') + 4, end = source.indexOf('};', start);
  if (start < 4 || end < 0) throw new Error('HAND_STYLE not found');
  writeFileSync(STYLE_FILE, source.slice(0, start) + body + source.slice(end + 1));
}

const COLORS_FILE = 'src/ui/finger-colors.ts';
/** The approved palette written into Tapko (src/ui/finger-colors.ts), the file's words kept. */
export function writeFingerColors(colors: string[]): void {
  if (colors.length !== 10 || !colors.every((c) => /^#[0-9a-f]{6}$/i.test(c))) throw new Error('bad colours');
  const body = `{
  0: '${colors[0]}', 1: '${colors[1]}', 2: '${colors[2]}', 3: '${colors[3]}', 4: '${colors[4]}',
  5: '${colors[5]}', 6: '${colors[6]}', 7: '${colors[7]}', 8: '${colors[8]}', 9: '${colors[9]}',
}`;
  const source = readFileSync(COLORS_FILE, 'utf8');
  const start = source.indexOf('= {'), end = source.indexOf('};', start);
  if (start < 0 || end < 0) throw new Error('FINGER_COLORS not found');
  writeFileSync(COLORS_FILE, source.slice(0, start + 2) + body + source.slice(end + 1));
}

/** Saves the settings, the source outlines and every pose's outline; removes the outlines made here whose pose is gone. */
export function saveRows(state: RowsState, outline: Record<Side, Outline>, files: OutlineFile[]): { written: string[]; removed: string[] } {
  if (!files.every((f) => SIDES.includes(f.side) && POSE_NAME.test(f.name))) throw new Error('bad pose names');
  writeFileSync(STATE, `${JSON.stringify(state, null, 1)}\n`);
  if (state.style) writeHandStyle(state.style);
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
