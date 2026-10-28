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
  command: () => import('./modes/space-calm').then((m) => (L) => new m.CommandMode(L)),
  swamp: () => import('./modes/planet').then((m) => (L) => new m.SwampMode(L)),
  greatswamp: () => import('./modes/planet').then((m) => (L) => new m.GreatSwampMode(L)),
  crystals: () => import('./modes/planet-crystals').then((m) => (L) => new m.CrystalsMode(L)),
  spells: () => import('./modes/planet-crystals').then((m) => (L) => new m.SpellMode(L)),
  crossroads: () => import('./modes/planet-roads').then((m) => (L) => new m.CrossroadsMode(L)),
  shield: () => import('./modes/dragons').then((m) => (L) => new m.ShieldMode(L)),
  wave: () => import('./modes/dragons').then((m) => (L) => new m.WaveMode(L)),
  slope: () => import('./modes/egg').then((m) => (L) => new m.SlopeMode(L)),
  mole: () => import('./modes/egg').then((m) => (L) => new m.MoleMode(L)),
  junk: () => import('./modes/junkyard').then((m) => (L) => new m.JunkMode(L)),
  knot: () => import('./modes/junkyard').then((m) => (L) => new m.KnotMode(L)),
  belt: () => import('./modes/workshop').then((m) => (L) => new m.BeltMode(L)),
  battery: () => import('./modes/workshop').then((m) => (L) => new m.BatteryMode(L)),
  rain: () => import('./modes/raintown').then((m) => (L) => new m.RainMode(L)),
  storm: () => import('./modes/raintown').then((m) => (L) => new m.StormMode(L)),
  doors: () => import('./modes/robocity').then((m) => (L) => new m.DoorsMode(L)),
  gate: () => import('./modes/robocity').then((m) => (L) => new m.GateMode(L)),
  rooms: () => import('./modes/robohome').then((m) => (L) => new m.RoomsMode(L)),
  welcome: () => import('./modes/robohome').then((m) => (L) => new m.WelcomeMode(L)),
  buds: () => import('./modes/garden').then((m) => (L) => new m.BudsMode(L)),
  flower: () => import('./modes/garden').then((m) => (L) => new m.FlowerMode(L)),
  birds: () => import('./modes/forestpath').then((m) => (L) => new m.BirdsMode(L)),
  owl: () => import('./modes/forestpath').then((m) => (L) => new m.OwlMode(L)),
  lilies: () => import('./modes/lilylake').then((m) => (L) => new m.LiliesMode(L)),
  reflection: () => import('./modes/lilylake').then((m) => (L) => new m.ReflectionMode(L)),
  notes: () => import('./modes/musictree').then((m) => (L) => new m.NotesMode(L)),
  treesong: () => import('./modes/musictree').then((m) => (L) => new m.TreeSongMode(L)),
  fireflies: () => import('./modes/moonball').then((m) => (L) => new m.FirefliesMode(L)),
  lastsong: () => import('./modes/moonball').then((m) => (L) => new m.LastSongMode(L)),
  practice: (def) => import('./modes/practice').then((m) => (L) => new m.PracticeMode(L, def.seconds ?? null, def.phrases ?? null)),
  freetype: () => import('./modes/freetype').then((m) => (L) => new m.FreeTypeMode(L)),
  aim: () => import('./modes/aim').then((m) => (L) => new m.AimMode(L)),
  parrot: () => import('./modes/parrot').then((m) => (L) => new m.ParrotMode(L)),
};

export function loadMode(def: ModeDef): Promise<ModeMaker> {
  return MODES[def.kind](def);
}
