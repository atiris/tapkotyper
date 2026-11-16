import { describe, expect, it } from 'vitest';
import { type LevelRoute, levelPath, parseLevelPath } from './level-route';

describe('level addresses', () => {
  const both: [LevelRoute, string][] = [
    [{ id: 'w6-3' }, 'w6/l3'],
    [{ id: 'parrot', world: 5 }, 'w6/parrot'],
    [{ id: 'aim', world: 0 }, 'w1/aim'],
    [{ id: 'rhythm', world: 14 }, 'w15/rhythm'],
    [{ id: 'freetype', world: 2 }, 'w3/freetype'],
    [{ id: 'journey', story: 'dragon' }, 'w5/journey'],
    [{ id: 'journey', story: 'robot' }, 'w10/journey'],
    [{ id: 'practice' }, 'practice'],
    [{ id: 'practice', text: true }, 'text'],
    [{ id: 'placement' }, 'placement'],
    [{ id: 'task', task: 'abc' }, 'task/abc'],
  ];

  it('names the world first, then the level, and reads back the same level', () => {
    for (const [r, path] of both) {
      expect(levelPath(r).join('/')).toBe(path);
      expect(parseLevelPath(path.split('/'))).toEqual(r);
    }
  });

  it('names nothing for a level or world that does not exist', () => {
    for (const path of ['w6/l9', 'w99/parrot', 'w0/aim', 'w4/journey', 'w6', 'w6/dragons', 'nothing', '']) {
      expect(parseLevelPath(path.split('/').filter(Boolean))).toBeNull();
    }
  });
});
