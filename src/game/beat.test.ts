import { describe, expect, it } from 'vitest';
import { LAYOUTS, fingerFor } from '../keyboard/layouts';
import { Rng } from '../engine/rng';
import {
  CHANGE_S, PHRASE, TEMPI, W_START, accuracyCap, beatScore, beatsPerLetter, earnsNote, fallSeconds, judge, laneLetter, laneSetup,
  laneWeights, notesNow, phraseLanes, phraseStep, planChanges, rhythmWord, Song, startTempo, stepTempo, stepWindow, targetTempo, type Landing,
  type Lane,
} from './beat';

const sk = LAYOUTS['sk-qwertz'];
const finger = (ch: string) => fingerFor(sk, ch);
const world1 = laneSetup(['f', 'j', ' ', 'd', 'k'], finger);
const song = (lanes: Lane[], tempo: number, roundS = 60, changes = planChanges(lanes, 0, roundS)) =>
  new Song({ lanes, changes, weights: lanes.map(() => 1), tempo, rand: () => 0.42, roundS });
/** Plays the song to its end, the tempo going `dir` at every phrase. */
const playOut = (s: Song, dir: -1 | 0 | 1 = 0) => {
  for (let now = 0; !s.closed; now += 0.05) s.tick(now, () => dir);
  return s;
};

describe('lanes', () => {
  it('one lane per finger in keyboard order, never the thumbs; a finger keeps its letters in order', () => {
    expect(world1.map((l) => l.letters.join(''))).toEqual(['d', 'f', 'j', 'k']);
    expect(world1.map((l) => l.finger)).toEqual([2, 3, 6, 7]);
    const more = laneSetup(['f', 'j', 'd', 'k', 's', 'l', 'a', 'g', 'h'], finger);
    expect(more.map((l) => l.letters.join(''))).toEqual(['a', 's', 'd', 'fg', 'jh', 'k', 'l']);
  });

  it('the weakest third of the letters (at most three) comes a little more often', () => {
    expect(laneWeights([0.99, 0.9, 0.95, 0.97])).toEqual([1, 1.5, 1.5, 1]);
    expect(laneWeights([0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.96, 0.97, 0.98, 0.99]).filter((w) => w > 1)).toHaveLength(3);
  });
});

describe('tempo', () => {
  it('a new child starts at 30, others at 70 % of their usual speed, at most 60', () => {
    expect(startTempo(undefined, 0, '2026-11-07')).toBe(30);
    expect(startTempo(undefined, 60, '2026-11-07')).toBe(42);
    expect(startTempo(undefined, 300, '2026-11-07')).toBe(60);
  });

  it('a kept tempo is the next start, one step lower after a week without playing', () => {
    const kept = { tempo: 48, at: '2026-11-01', rhythm: 70, top: 48 };
    expect(startTempo(kept, 0, '2026-11-07')).toBe(48);
    expect(startTempo(kept, 0, '2026-11-20')).toBe(42);
    expect(startTempo({ ...kept, tempo: 30 }, 0, '2026-12-20')).toBe(30);
  });

  it('steps up only with high accuracy and catches, down with errors or misses; errors weigh more', () => {
    expect(phraseStep(0.96, 0.95)).toBe(1);
    expect(phraseStep(0.94, 1)).toBe(0);
    expect(phraseStep(0.84, 1)).toBe(-1);
    expect(phraseStep(1, 0.69)).toBe(-1);
    expect(stepTempo(120, 1)).toBe(120);
    expect(stepTempo(30, -1)).toBe(30);
    expect(stepTempo(60, 1)).toBe(70);
  });

  it('the target tempo is the story\'s words a minute as letters, on a step', () => {
    expect([8, 10, 12].map(targetTempo)).toEqual([42, 54, 60]);
  });

  it('the next letter is always in the air when one lands, and music below 60 plays double time', () => {
    for (const tempo of TEMPI) expect(fallSeconds(60 / tempo)).toBeGreaterThan(60 / tempo);
    expect(beatsPerLetter(54)).toBe(2);
    expect(beatsPerLetter(60)).toBe(1);
  });
});

describe('catch window', () => {
  it('reaches as far before the beat as after it', () => {
    expect(judge(9.64, 10, 1, 0.35)).toBe('early');
    expect(judge(9.65, 10, 1, 0.35)).toBe('catch');
    expect(judge(10.35, 10, 1, 0.35)).toBe('catch');
    expect(judge(10.36, 10, 1, 0.35)).toBe('late');
    // Even the widest windows of two beats never overlap.
    expect(judge(10.49, 11, 1, 0.5)).toBe('early');
  });

  it('grows after a step down, up to half a beat, and narrows back after a step up', () => {
    expect(stepWindow(W_START, -1)).toBe(0.4);
    expect(stepWindow(0.5, -1)).toBe(0.5);
    expect(stepWindow(0.4, 1)).toBe(W_START);
    expect(stepWindow(W_START, 1)).toBe(W_START);
    expect(stepWindow(0.45, 0)).toBe(0.45);
  });
});

describe('song', () => {
  it('lands one letter per letter beat, a count-in bar first, a closing bar after the last landing', () => {
    const s = playOut(song(world1, 42));
    const T = 60 / 42;
    expect(s.bars[0].kind).toBe('count');
    expect(s.drops[0].land).toBeCloseTo(s.bars[0].start + 4 * s.bars[0].beat);
    for (let i = 1; i < s.drops.length; i++) expect(s.drops[i].land - s.drops[i - 1].land).toBeCloseTo(T);
    expect(s.drops[s.drops.length - 1].land).toBeLessThanOrEqual(60);
    const end = s.bars[s.bars.length - 1];
    expect(end.kind).toBe('end');
    expect(end.start).toBeCloseTo(s.drops[s.drops.length - 1].land + T);
    // Double time below 60: two music beats per letter.
    expect(s.bars[1].beat).toBeCloseTo(T / 2);
  });

  it('changes the tempo only between phrases, by one step each', () => {
    const s = playOut(song(world1, 30, 120), 1);
    expect(s.phrases.map((p) => p.tempo).slice(0, 4)).toEqual([30, 36, 42, 48]);
    for (const d of s.drops) expect(d.T).toBeCloseTo(60 / s.phrases[d.phrase].tempo);
    for (const p of s.phrases.slice(1)) {
      const prev = s.drops[p.first - 1];
      expect(p.start - prev.land).toBeCloseTo(prev.T);
    }
    // Every letter leaves its cloud before it lands and after the song started.
    for (const d of s.drops) expect(d.land - d.release).toBeGreaterThan(d.T * 0.9);
  });

  it('a hard round grows a phrase for each step down, a third at most, and widens its window', () => {
    const easy = playOut(song(world1, 60, 60), 0);
    const hard = playOut(song(world1, 60, 60), -1);
    expect(hard.roundS).toBeGreaterThan(easy.roundS);
    expect(hard.roundS).toBeLessThanOrEqual(80);
    expect(hard.drops[hard.drops.length - 1].land).toBeGreaterThan(easy.drops[easy.drops.length - 1].land);
    expect(hard.phrases.map((p) => p.w).slice(0, 4)).toEqual([0.35, 0.4, 0.45, 0.5]);
    for (const d of hard.drops) expect(d.w).toBe(hard.phrases[d.phrase].w);
  });

  it('starts with the index fingers in turn, then mirror pairs, then neighbours of one hand', () => {
    const lanes = (p: number) => phraseLanes(p, world1, [1, 1, 1, 1], () => 0.5, false).map((i) => world1[i].letters[0]).join('');
    expect(lanes(0).slice(0, 4)).toBe('fjfj');
    expect(lanes(1).slice(0, 4)).toBe('dkfj');
    expect(lanes(2).slice(0, 8)).toBe('dfdfkjkj');
    expect(lanes(3)).toHaveLength(PHRASE);
  });

  it('free phrases are dictionary words of the lanes\' letters when there are enough of them', () => {
    const lanes = laneSetup(['a', 's', 'd', 'f', 'j', 'k', 'l'], finger);
    const letters = lanes.map((l) => l.letters[0]);
    const spell = (out: number[]) => out.map((i) => letters[i]).join('');
    const rng = new Rng(5);
    const free = spell(phraseLanes(5, lanes, lanes.map(() => 1), () => rng.next(), false, ['sad', 'las', 'kal', 'zub'], letters));
    expect(free).toHaveLength(PHRASE);
    // Only the words the letters make: never "zub"; a short tail fills with letters.
    expect(free.slice(0, 15)).toMatch(/^(sad|las|kal)+$/);
    // Too few words: letters as before.
    const few = spell(phraseLanes(5, lanes, lanes.map(() => 1), () => rng.next(), false, ['sad', 'zub'], letters));
    expect(few).toHaveLength(PHRASE);
    expect(few).not.toMatch(/^(sad)+/);
  });

  it('free phrases never repeat a letter right away in the first half of the round', () => {
    const rng = new Rng(7);
    const free = phraseLanes(5, world1, [1, 1.5, 1, 1], () => rng.next(), false);
    for (let i = 1; i < free.length; i++) expect(free[i]).not.toBe(free[i - 1]);
  });
});

describe('lane changes', () => {
  it('needs a second letter of the same finger: the first world has none', () => {
    expect(planChanges(world1, 1)).toEqual([]);
  });

  it('spreads the story\'s changes over the round and keeps the lane empty while its cloud changes', () => {
    const lanes = laneSetup(['f', 'j', 'd', 'k', 'g'], finger);
    const changes = planChanges(lanes, 2, 120);
    expect(changes.map((c) => [Math.round(c.at), lanes[c.lane].letters[0], c.letter])).toEqual([[40, 'f', 'g'], [80, 'f', 'f']]);
    const s = playOut(song(lanes, 60, 120, changes));
    for (const c of changes) {
      expect(s.drops.some((d) => d.lane === c.lane && d.release <= c.at + CHANGE_S && d.land >= c.at)).toBe(false);
    }
    const after = s.drops.filter((d) => d.lane === changes[0].lane && d.release > changes[0].at && d.release < changes[1].at);
    expect(after.length).toBeGreaterThan(0);
    expect(new Set(after.map((d) => d.letter))).toEqual(new Set(['g']));
    expect(laneLetter(lanes, changes, changes[0].lane, 10)).toBe('f');
  });
});

describe('beat measure', () => {
  const run = (offsets: (number | null)[], T = 1): Landing[] => offsets.map((o) => ({ offset: o === null ? null : o * T, T }));
  const jitter = (n: number, spread: number, lean = 0) => Array.from({ length: n }, (_, i) => lean + spread * Math.sin(i * 2.3));

  it('a steady child scores high, also with a steady lean early: the lean is the child\'s own', () => {
    expect(beatScore(run(jitter(40, 0.04)), 1)).toBeGreaterThanOrEqual(90);
    expect(beatScore(run(jitter(40, 0.04, -0.15)), 1)).toBeGreaterThanOrEqual(90);
  });

  it('is the same at every tempo, measured in beats', () => {
    expect(beatScore(run(jitter(30, 0.1), 0.5), 1)).toBe(beatScore(run(jitter(30, 0.1), 2), 1));
  });

  it('scattered catches score low, misses cost their share', () => {
    const scattered = beatScore(run(jitter(40, 0.35)), 1)!;
    expect(scattered).toBeLessThan(30);
    const steady = beatScore(run(jitter(40, 0.04)), 1)!;
    const half = beatScore(run(jitter(40, 0.04).map((o, i) => (i % 2 ? null : o))), 1)!;
    expect(half).toBeLessThanOrEqual(Math.ceil(steady / 2));
  });

  it('accuracy comes first: at 85 % the rhythm shows at most 50, from 95 % no cap', () => {
    expect(beatScore(run(jitter(40, 0.02)), 0.85)).toBeLessThanOrEqual(50);
    expect(accuracyCap(0.96)).toBe(100);
    expect(accuracyCap(0.75)).toBe(0);
  });

  it('needs enough landings for a score', () => {
    expect(beatScore(run(jitter(11, 0.02)), 1)).toBeNull();
    expect(beatScore(run([null, null, null, null, null, null, null, null, null, null, null, null]), 1)).toBe(0);
  });

  it('names the score in a child\'s words', () => {
    expect([10, 40, 70, 90].map(rhythmWord)).toEqual(['searching', 'nice', 'smooth', 'clockwork']);
  });
});

describe('rhythm notes', () => {
  it('a round with rhythm 80 and accuracy 95 % earns one', () => {
    expect(earnsNote(80, 0.95)).toBe(true);
    expect(earnsNote(79, 1)).toBe(false);
    expect(earnsNote(100, 0.94)).toBe(false);
    expect(earnsNote(null, 1)).toBe(false);
  });

  it('one fades for every three days without a round: played Monday, all on Thursday, one fewer on Friday', () => {
    const monday = '2026-11-02';
    expect(notesNow(5, monday, '2026-11-05')).toBe(5);
    expect(notesNow(5, monday, '2026-11-06')).toBe(4);
    expect(notesNow(5, monday, '2026-11-08')).toBe(4);
    expect(notesNow(5, monday, '2026-11-09')).toBe(3);
    expect(notesNow(5, monday, '2026-11-12')).toBe(2);
    expect(notesNow(1, monday, '2026-12-30')).toBe(0);
    expect(notesNow(0, null, '2026-11-06')).toBe(0);
  });
});
