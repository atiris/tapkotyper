import { STORIES, type StoryDef, isLevelUnlocked, isWorldUnlocked, journeyOpen, levelById } from '../game/levels';
import type { Profile } from '../storage/schema';

/** What a level's address names: the level's id, the world of a world's side game, the story of a hero's journey, a teacher's task. */
export interface LevelRoute {
  id: string;
  world?: number;
  story?: StoryDef['id'];
  task?: string;
  text?: boolean;
}

/** The world's side games, each at `w<world>/<game>`. */
const SIDE = ['aim', 'parrot', 'rhythm', 'freetype'];

/**
 * The address parts after `play`, the world first as the map numbers it: `w6/l3` a story level, `w6/parrot` a world's
 * side game, `w5/journey` the journey of the story ending with that world; `practice`, `text`, `placement`, `task/<id>`.
 */
export function levelPath(r: LevelRoute): string[] {
  const story = /^w(\d+)-(\d+)$/.exec(r.id);
  if (story) return [`w${story[1]}`, `l${story[2]}`];
  if (SIDE.includes(r.id) && r.world != null) return [`w${r.world + 1}`, r.id];
  const journey = r.id === 'journey' && STORIES.find((s) => s.id === r.story);
  if (journey) return [`w${journey.worlds[journey.worlds.length - 1] + 1}`, 'journey'];
  if (r.id === 'task' && r.task) return ['task', r.task];
  if (r.id === 'practice' && r.text) return ['text'];
  return ['practice', 'placement'].includes(r.id) ? [r.id] : [];
}

/** The level an address names (the parts after `play`); null when it names none. */
export function parseLevelPath(parts: string[]): LevelRoute | null {
  const [a, b] = parts;
  const w = /^w(\d+)$/.exec(a ?? '');
  if (w) {
    const world = Number(w[1]) - 1;
    const l = /^l(\d+)$/.exec(b ?? '');
    if (l) return levelById(`w${world + 1}-${l[1]}`) ? { id: `w${world + 1}-${l[1]}` } : null;
    if (b && SIDE.includes(b) && world >= 0 && levelById(`w${world + 1}-1`)) return { id: b, world };
    const story = b === 'journey' && STORIES.find((s) => s.worlds[s.worlds.length - 1] === world);
    return story ? { id: 'journey', story: story.id } : null;
  }
  if (a === 'task' && b) return { id: 'task', task: b };
  if (a === 'text') return { id: 'practice', text: true };
  return a === 'practice' || a === 'placement' ? { id: a } : null;
}

/** The world a level of an address belongs to; null for one of no world (practice, a task, the placement). */
export function routeWorld(r: LevelRoute): number | null {
  if (r.world != null) return r.world;
  const level = levelById(r.id);
  if (level) return level.world;
  const story = r.id === 'journey' && STORIES.find((s) => s.id === r.story);
  return story ? story.worlds[story.worlds.length - 1] : null;
}

/** Whether the player may start the level of an address now, as from the map. */
export function routeOpen(p: Profile, r: LevelRoute): boolean {
  const level = levelById(r.id);
  if (level) return isLevelUnlocked(p, level);
  if (SIDE.includes(r.id)) return r.world != null && isWorldUnlocked(p, r.world);
  const story = r.id === 'journey' && STORIES.find((s) => s.id === r.story);
  if (r.id === 'journey') return !!story && journeyOpen(p, story);
  if (r.id === 'task') return p.tasks.some((x) => x.id === r.task);
  return true;
}
