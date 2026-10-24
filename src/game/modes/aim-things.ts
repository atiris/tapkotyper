import type { Sfx } from '../../audio/audio';
import type { Rng } from '../../engine/rng';
import { hasImage } from '../../gfx/assets';
import { storyOf } from '../levels';

/**
 * What a thing does at the target:
 * - `bounce` bounces off and drops; `bounces` bounces off `n` times, each one smaller (or higher, a spring);
 * - `splat` leaves its splat on the board; `stick` stays where it hit for `hold` seconds, `jitter` shaking it;
 * - `top` sits on the board's top rim, then fades or flies off (`leave`);
 * - `away` flutters up and away; `hop` hops down and off to the right; `boomerang` flies back to Tapko;
 * - `slide` slides down and leaves a puddle; `burst` bursts into a puff; `dangle` hangs on a thread;
 * - `light` switches to its lit picture with a glow; `egg` has endings of its own.
 */
export type Effect = 'bounce' | 'bounces' | 'splat' | 'stick' | 'top' | 'away' | 'hop' | 'boomerang' | 'slide' | 'burst' | 'dangle' | 'light' | 'egg';

/** Particles at the impact. */
export type Burst = 'sparkle' | 'ketchup' | 'smoke' | 'stink' | 'dust' | 'sparks' | 'feathers' | 'splash' | 'splinters' | 'steam' | 'rain' | 'magic';

/** How the target's eyes look when they pop up. */
export type Eyes = 'worry' | 'wide' | 'happy' | 'dizzy' | 'squeeze';

export interface Thing {
  id: string;
  /** Its pictures; one is picked per throw. */
  pics: string[];
  /** 0 = every world, 1 = the robot story's worlds, 2 = the fairy story's; a world thing has `world` instead. */
  story: 0 | 1 | 2;
  /** The world (index) whose range alone throws it. */
  world?: number;
  sfx: Sfx;
  effect: Effect;
  /** Seconds it stays (stick, top, dangle, light), or how many bounces (bounces). */
  hold?: number;
  jitter?: 'buzz' | 'shake' | 'chatter';
  /** `top`: it flies off up and away (a bird) or hops down and runs off (the chick). */
  leave?: 'fly' | 'run';
  /** `bounces`: high hops (a spring), else smaller each time. */
  high?: boolean;
  burst?: Burst;
  /** The target wobbles; `stars` circle over it. */
  wobble?: boolean;
  stars?: boolean;
  /** The target flashes this color. */
  flash?: string;
  /** Something trails behind it in flight. */
  trail?: 'paper' | 'smoke';
  /** It points along its path instead of tumbling (an arrow, a rocket), or keeps upright (things with wings). */
  spin?: 'point' | 'none';
  /** The chance of its own `expect` lines (it has some in the texts) and the eyes they bring. */
  expect?: number;
  eyes?: Eyes;
  /** Size in flight against the common one. */
  scale?: number;
  /** The seven first things: drawn in code until their picture is there. */
  drawn?: boolean;
}

const SKY = ['#fff6a8', '#ffffff', '#ffd1f5'];

/** Every thing the range throws; the texts are `aim.things.<id>.*`. */
export const THINGS: Thing[] = [
  { id: 'pebble', pics: ['obj-aim-pebble'], story: 0, sfx: 'pop', effect: 'bounce', drawn: true },
  { id: 'screw', pics: ['obj-aim-screw'], story: 0, sfx: 'pop', effect: 'bounce', drawn: true },
  { id: 'fly', pics: ['obj-aim-fly'], story: 0, sfx: 'bzzt', effect: 'stick', hold: 6, jitter: 'buzz', spin: 'none', drawn: true },
  { id: 'tomato', pics: ['obj-aim-tomato'], story: 0, sfx: 'plop', effect: 'splat', burst: 'ketchup', drawn: true },
  { id: 'arrow', pics: ['obj-aim-arrow'], story: 0, sfx: 'pop', effect: 'bounce', spin: 'point', drawn: true },
  { id: 'duck', pics: ['obj-aim-duck'], story: 0, sfx: 'squeak', effect: 'bounce', drawn: true },
  { id: 'sock', pics: ['obj-aim-sock'], story: 0, sfx: 'pop', effect: 'bounce', drawn: true },
  { id: 'planet', pics: ['obj-planet-1', 'obj-planet-2', 'obj-planet-3', 'obj-planet-4', 'obj-planet-5'], story: 0, sfx: 'thud', effect: 'bounce', wobble: true, stars: true, scale: 1.15 },
  { id: 'egg', pics: ['obj-aim-egg'], story: 0, sfx: 'plop', effect: 'egg', spin: 'none' },
  { id: 'clock', pics: ['obj-aim-clock'], story: 0, sfx: 'ring', effect: 'stick', hold: 1.2, jitter: 'shake' },
  { id: 'cactus', pics: ['obj-aim-cactus'], story: 0, sfx: 'pop', effect: 'bounce', expect: 0.6, eyes: 'worry' },
  { id: 'toilet-paper', pics: ['obj-aim-toilet-paper'], story: 0, sfx: 'pop', effect: 'bounce', trail: 'paper' },
  { id: 'candle', pics: ['obj-aim-candle'], story: 0, sfx: 'whoosh', effect: 'bounce', burst: 'smoke', spin: 'none' },
  { id: 'cheese', pics: ['obj-aim-cheese'], story: 0, sfx: 'plop', effect: 'bounce', burst: 'stink' },
  { id: 'boomerang', pics: ['obj-aim-boomerang'], story: 0, sfx: 'whoosh', effect: 'boomerang' },
  { id: 'ice', pics: ['obj-aim-ice'], story: 0, sfx: 'pop', effect: 'slide' },
  { id: 'donut', pics: ['obj-aim-donut'], story: 0, sfx: 'plop', effect: 'bounce', expect: 0.4, eyes: 'happy' },
  { id: 'bulb', pics: ['obj-aim-bulb'], story: 0, sfx: 'pop', effect: 'light', hold: 1.5 },
  { id: 'teeth', pics: ['obj-aim-teeth'], story: 0, sfx: 'pop', effect: 'stick', hold: 1, jitter: 'chatter' },
  { id: 'diaper', pics: ['obj-aim-diaper'], story: 0, sfx: 'plop', effect: 'bounce', expect: 0.4, eyes: 'worry' },
  { id: 'cloud', pics: ['ui-start-cloud-1', 'ui-start-cloud-2'], story: 0, sfx: 'whoosh', effect: 'burst', burst: 'rain', spin: 'none', scale: 1.3 },
  { id: 'snack', pics: ['obj-aim-snack'], story: 0, sfx: 'plop', effect: 'bounce', expect: 0.25, eyes: 'worry' },
  { id: 'bottle', pics: ['obj-aim-bottle'], story: 0, sfx: 'plop', effect: 'bounce' },
  { id: 'pacifier', pics: ['obj-aim-pacifier'], story: 0, sfx: 'squeak', effect: 'bounce' },
  { id: 'chalk', pics: ['obj-aim-chalk'], story: 0, sfx: 'pop', effect: 'bounce', burst: 'dust', scale: 1.2 },
  { id: 'whistle', pics: ['obj-aim-whistle'], story: 0, sfx: 'whistle', effect: 'bounce' },
  { id: 'pingpong', pics: ['obj-aim-pingpong'], story: 0, sfx: 'pop', effect: 'bounces', hold: 3, scale: 0.75 },
  { id: 'bowling', pics: ['obj-aim-bowling'], story: 0, sfx: 'thud', effect: 'bounce', wobble: true, burst: 'splinters', expect: 0.4, eyes: 'worry' },
  { id: 'butterfly', pics: ['obj-butterfly', 'obj-butterfly-2', 'obj-butterfly-3'], story: 0, sfx: 'whoosh', effect: 'away', spin: 'none' },
  { id: 'spider', pics: ['obj-spider'], story: 0, sfx: 'pop', effect: 'dangle', hold: 1.5, spin: 'none', expect: 0.4, eyes: 'worry' },
  { id: 'hockey', pics: ['obj-aim-hockey'], story: 0, sfx: 'pop', effect: 'bounce', scale: 1.2 },
  { id: 'pillow', pics: ['obj-aim-pillow'], story: 0, sfx: 'plop', effect: 'bounce', burst: 'feathers' },
  { id: 'chicken', pics: ['obj-aim-chicken'], story: 0, sfx: 'squeak', effect: 'bounce' },
  { id: 'water-balloon', pics: ['obj-aim-water-balloon'], story: 0, sfx: 'plop', effect: 'burst', burst: 'splash' },
  { id: 'banana', pics: ['obj-aim-banana'], story: 0, sfx: 'plop', effect: 'bounce' },
  { id: 'battery', pics: ['obj-battery'], story: 1, sfx: 'bzzt', effect: 'bounce', burst: 'sparks' },
  { id: 'magnet', pics: ['obj-aim-magnet'], story: 1, sfx: 'pop', effect: 'stick', hold: 1.5 },
  { id: 'gear', pics: ['obj-gear'], story: 1, sfx: 'pop', effect: 'bounce' },
  { id: 'note', pics: ['obj-note1', 'obj-note2'], story: 2, sfx: 'note', effect: 'bounce', spin: 'none' },
  { id: 'frog', pics: ['obj-frog'], story: 2, sfx: 'squeak', effect: 'hop', spin: 'none' },
  { id: 'wand', pics: ['obj-aim-wand'], story: 2, sfx: 'note', effect: 'bounce', burst: 'magic', flash: '#f3d1ff' },
  // One thing of its own for every world.
  { id: 'ladybug', pics: ['obj-ladybug'], story: 0, world: 0, sfx: 'pop', effect: 'away', spin: 'none' },
  { id: 'rocket', pics: ['obj-rocket'], story: 0, world: 1, sfx: 'whoosh', effect: 'bounce', trail: 'smoke', spin: 'point', scale: 1.15 },
  { id: 'asteroid', pics: ['obj-asteroid-small'], story: 0, world: 2, sfx: 'thud', effect: 'bounce', wobble: true, burst: 'dust' },
  { id: 'chili', pics: ['obj-aim-chili'], story: 0, world: 3, sfx: 'whoosh', effect: 'bounce', burst: 'steam', flash: '#ff8a7a', expect: 0.4, eyes: 'worry' },
  { id: 'nest', pics: ['obj-nest'], story: 0, world: 4, sfx: 'plop', effect: 'top', hold: 2, spin: 'none' },
  { id: 'spring', pics: ['obj-spring'], story: 1, world: 5, sfx: 'squeak', effect: 'bounces', hold: 3, high: true },
  { id: 'wrench', pics: ['obj-aim-wrench'], story: 1, world: 6, sfx: 'pop', effect: 'bounce', scale: 1.1 },
  { id: 'umbrella', pics: ['obj-umbrella'], story: 1, world: 7, sfx: 'whoosh', effect: 'top', hold: 2, spin: 'none', scale: 1.2 },
  { id: 'robot', pics: ['obj-robot-small-3'], story: 1, world: 8, sfx: 'bzzt', effect: 'away', spin: 'none' },
  { id: 'toast', pics: ['obj-aim-toast'], story: 1, world: 9, sfx: 'pop', effect: 'bounce' },
  { id: 'flower', pics: ['obj-flower-open'], story: 2, world: 10, sfx: 'whoosh', effect: 'stick', hold: 2, expect: 0.4, eyes: 'happy' },
  { id: 'pinecone', pics: ['obj-aim-pinecone'], story: 2, world: 11, sfx: 'pop', effect: 'bounce' },
  { id: 'fish', pics: ['obj-aim-fish'], story: 2, world: 12, sfx: 'plop', effect: 'hop', burst: 'splash', spin: 'none' },
  { id: 'bird', pics: ['obj-bird'], story: 2, world: 13, sfx: 'note', effect: 'top', hold: 1.5, leave: 'fly', spin: 'none' },
  { id: 'crown', pics: ['obj-aim-crown'], story: 2, world: 14, sfx: 'note', effect: 'top', hold: 2, burst: 'sparkle', spin: 'none' },
];

/** The particle colors of each burst. */
export const BURST_COLORS: Record<Burst, string[]> = {
  sparkle: SKY,
  ketchup: ['#e5534b', '#ff8a7a'],
  smoke: ['#d8d8d8', '#bfbfbf', '#f2f2f2'],
  stink: ['#a6d36b', '#c8e89a', '#8cbf4f'],
  dust: ['#ffffff', '#ece8df', '#d8d2c4'],
  sparks: ['#ffe14d', '#fff6a8', '#ffb23d'],
  feathers: ['#ffffff', '#f1f4f8', '#dfe7ef'],
  splash: ['#8fd3f4', '#bfe8ff', '#ffffff'],
  splinters: ['#b07a45', '#8a5e36', '#d9a36a'],
  steam: ['#ffffff', '#f0f0f0', '#ffd6cf'],
  rain: ['#8fd3f4', '#bfe8ff', '#ffffff'],
  magic: ['#f3d1ff', '#c9f2d4', '#bfe8ff', '#fff6a8'],
};

export const thing = (id: string): Thing => THINGS.find((th) => th.id === id)!;

/** Every world's own thing, in world order. */
export const WORLD_THINGS: Thing[] = THINGS.filter((th) => th.world != null).sort((a, b) => a.world! - b.world!);

/** A thing can be thrown: its picture is there (the first seven are drawn in code without one). */
function ready(th: Thing): boolean {
  return th.drawn || th.pics.some(hasImage);
}

/** The things open at this world's range: the story 1 set everywhere, the story 2 and 3 things in their worlds; no world things. */
export function storyPool(world: number): Thing[] {
  const story = ['dragon', 'robot', 'fairy'].indexOf(storyOf(world).id);
  return THINGS.filter((th) => th.world == null && (th.story === 0 || th.story === story) && ready(th));
}

/** The world's own thing, when its picture is there. */
export function worldThing(world: number): Thing | null {
  const th = WORLD_THINGS.find((w) => w.world === world);
  return th && ready(th) ? th : null;
}

/** About one throw of five is the world's thing. */
const WORLD_SHARE = 0.2;

/** The next thing: the world's own one first, then now and then; else one from the story pool; never the same twice in a row. */
export function nextThing(world: number, rng: Rng, prev: Thing | null): Thing {
  const own = worldThing(world);
  if (own && (!prev || (prev !== own && rng.chance(WORLD_SHARE)))) return own;
  const pool = storyPool(world).filter((th) => th !== prev);
  return rng.pick(pool);
}

/** How good the hit was: 0 wrong keys is the middle, then one, then two. */
export type Tier = 'center' | 'one' | 'two';

export function tierOf(errors: number): Tier {
  return errors <= 0 ? 'center' : errors === 1 ? 'one' : 'two';
}

/** The points a tier says (`{n}` in its lines): one wrong key 85-95, two 75-85. */
export function tierPoints(tier: Tier, rng: Rng): number {
  return tier === 'center' ? 100 : tier === 'one' ? rng.int(85, 95) : rng.int(75, 85);
}

/** Lines drawn from a shuffled bag per list, so no line comes twice in a row. */
export class Bags {
  private bags = new Map<string, string[]>();
  private last = new Map<string, string>();

  constructor(private readonly rng: Rng) {}

  /** The next line of `key` (`lines` are its texts). */
  next(key: string, lines: string[]): string {
    if (!lines.length) return '';
    let bag = this.bags.get(key);
    if (!bag?.length) {
      bag = [...lines];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng.next() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // A new bag never starts with the line the old one ended with.
      if (bag.length > 1 && bag[bag.length - 1] === this.last.get(key)) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      this.bags.set(key, bag);
    }
    const line = bag.pop()!;
    this.last.set(key, line);
    return line;
  }
}
