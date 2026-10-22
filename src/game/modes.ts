import type { LevelDef } from './levels';
import type { Mode } from './mode';
import { WaveMode, ShieldMode } from './modes/dragons';
import { MoleMode, SlopeMode } from './modes/egg';
import { BirdsMode, OwlMode } from './modes/forestpath';
import { BudsMode, FlowerMode } from './modes/garden';
import { JunkMode, KnotMode } from './modes/junkyard';
import { LiliesMode, ReflectionMode } from './modes/lilylake';
import { FreeTypeMode } from './modes/freetype';
import { HedgehogMode, MeadowMode } from './modes/meadow';
import { FirefliesMode, LastSongMode } from './modes/moonball';
import { NotesMode, TreeSongMode } from './modes/musictree';
import { BoulderMode, SignsMode, SwampMode } from './modes/planet';
import { PracticeMode } from './modes/practice';
import { RainMode, StormMode } from './modes/raintown';
import { DoorsMode, GateMode } from './modes/robocity';
import { RoomsMode, WelcomeMode } from './modes/robohome';
import { AsteroidMode, SpaceMode } from './modes/space';
import { BatteryMode, BeltMode } from './modes/workshop';
import type { LevelRuntime } from './runtime';

export function createMode(def: LevelDef & { seconds?: number | null }, L: LevelRuntime): Mode {
  switch (def.kind) {
    case 'meadow': return new MeadowMode(L);
    case 'hedgehog': return new HedgehogMode(L);
    case 'space': return new SpaceMode(L);
    case 'asteroid': return new AsteroidMode(L);
    case 'swamp': return new SwampMode(L);
    case 'signs': return new SignsMode(L);
    case 'boulder': return new BoulderMode(L);
    case 'shield': return new ShieldMode(L);
    case 'wave': return new WaveMode(L);
    case 'slope': return new SlopeMode(L);
    case 'mole': return new MoleMode(L);
    case 'junk': return new JunkMode(L);
    case 'knot': return new KnotMode(L);
    case 'belt': return new BeltMode(L);
    case 'battery': return new BatteryMode(L);
    case 'rain': return new RainMode(L);
    case 'storm': return new StormMode(L);
    case 'doors': return new DoorsMode(L);
    case 'gate': return new GateMode(L);
    case 'rooms': return new RoomsMode(L);
    case 'welcome': return new WelcomeMode(L);
    case 'buds': return new BudsMode(L);
    case 'flower': return new FlowerMode(L);
    case 'birds': return new BirdsMode(L);
    case 'owl': return new OwlMode(L);
    case 'lilies': return new LiliesMode(L);
    case 'reflection': return new ReflectionMode(L);
    case 'notes': return new NotesMode(L);
    case 'treesong': return new TreeSongMode(L);
    case 'fireflies': return new FirefliesMode(L);
    case 'lastsong': return new LastSongMode(L);
    case 'practice': return new PracticeMode(L, def.seconds ?? null, def.phrases ?? null);
    case 'freetype': return new FreeTypeMode(L);
  }
}
