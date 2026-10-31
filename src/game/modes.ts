import type { LevelDef, LevelKind } from './levels';
import type { Mode } from './mode';
import type { LevelRuntime } from './runtime';

/** Builds a level's mode once its code is loaded. */
export type ModeMaker = (L: LevelRuntime) => Mode;

type ModeDef = LevelDef & { seconds?: number | null };

/** Each kind's code comes with the first level of it, so the main bundle does not grow with every world. */
const MODES: Record<LevelKind, (def: ModeDef) => Promise<ModeMaker>> = {
  meadow: () => import('./modes/meadow').then((m) => (L) => new m.MeadowMode(L)),
  hedgehog: () => import('./modes/meadow').then((m) => (L) => new m.HedgehogMode(L)),
  poppies: () => import('./modes/meadow-calm').then((m) => (L) => new m.PoppyMode(L)),
  invitation: () => import('./modes/meadow-calm').then((m) => (L) => new m.InvitationMode(L)),
  space: () => import('./modes/space').then((m) => (L) => new m.SpaceMode(L)),
  asteroid: () => import('./modes/space').then((m) => (L) => new m.AsteroidMode(L)),
  hop: () => import('./modes/space-calm').then((m) => (L) => new m.HopMode(L)),
  // The dragon story's hero's journey takes off from the planet's shore.
  command: (def) => (def.variant === 'journey' ? import('./modes/launch').then((m) => (L) => new m.LaunchMode(L)) : import('./modes/space-calm').then((m) => (L) => new m.CommandMode(L))),
  swamp: () => import('./modes/planet').then((m) => (L) => new m.SwampMode(L)),
  greatswamp: () => import('./modes/planet').then((m) => (L) => new m.GreatSwampMode(L)),
  crystals: () => import('./modes/planet-crystals').then((m) => (L) => new m.CrystalsMode(L)),
  spells: () => import('./modes/planet-crystals').then((m) => (L) => new m.SpellMode(L)),
  crossroads: () => import('./modes/planet-roads').then((m) => (L) => new m.CrossroadsMode(L)),
  flames: () => import('./modes/dragons').then((m) => (L) => new m.FlamesMode(L)),
  thicket: () => import('./modes/dragons').then((m) => (L) => new m.ThicketMode(L)),
  flight: () => import('./modes/dragons-flight').then((m) => (L) => new m.FlightMode(L)),
  lullaby: () => import('./modes/dragons-flight').then((m) => (L) => new m.LullabyMode(L)),
  takeoff: () => import('./modes/dragons-flight').then((m) => (L) => new m.TakeoffMode(L)),
  wind: () => import('./modes/egg').then((m) => (L) => new m.WindMode(L)),
  mud: () => import('./modes/egg').then((m) => (L) => new m.MudMode(L)),
  boulders: () => import('./modes/egg').then((m) => (L) => new m.BouldersMode(L)),
  spell: () => import('./modes/egg-spell').then((m) => (L) => new m.SpellRibbonMode(L)),
  copyloop: () => import('./modes/copy-loop').then((m) => (L) => new m.CopyLoopMode(L)),
  practice: (def) => import('./modes/practice').then((m) => (L) => new m.PracticeMode(L, def.seconds ?? null, def.phrases ?? null)),
  freetype: () => import('./modes/freetype').then((m) => (L) => new m.FreeTypeMode(L)),
  aim: () => import('./modes/aim').then((m) => (L) => new m.AimMode(L)),
  parrot: () => import('./modes/parrot').then((m) => (L) => new m.ParrotMode(L)),
};

export function loadMode(def: ModeDef): Promise<ModeMaker> {
  return MODES[def.kind](def);
}
