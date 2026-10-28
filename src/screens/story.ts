import { app, go, saveProfile, type ScreenName } from '../app/app';
import { audio } from '../audio/audio';
import { glovesFallback } from '../game/modes/meadow';
import { hasImage, imageUrl } from '../gfx/assets';
import { type FairyMood, fairyElement } from '../gfx/fairy';
import { type Mood, tapkoElement } from '../gfx/tapko';
import { type RobotMood, type RobotState, robotElement } from '../gfx/robot';
import { t, tList } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { cornerControls } from '../ui/chrome';
import { button, closeButton, h } from '../ui/dom';

interface SceneDef {
  world: string;
  sprites: string[];
  tapko?: boolean;
  envelope?: boolean;
  sparkles?: boolean;
  gloves?: boolean;
  /** Tapko's mood; a mood without pictures for the kind falls back to happy. */
  mood?: Mood;
  /** Bolt in story 2. */
  bolt?: RobotState & { mood: RobotMood };
  /** Melody in story 3. */
  fairy?: FairyMood;
}

/** Tapko's goalkeeper gloves: the owner's art when it is there, else the code-drawn ones of the meadow levels. */
function gloves(): HTMLElement {
  const src = imageUrl('obj-gloves');
  if (src) return h('div', { class: 'story-gloves' }, h('img', { src, alt: '' }));
  const cv = document.createElement('canvas');
  cv.width = cv.height = 180;
  const g = cv.getContext('2d')!;
  g.translate(90, 90);
  glovesFallback(g, 180, 180);
  return h('div', { class: 'story-gloves' }, cv);
}

const SCENES: Record<string, SceneDef> = {
  intro: { world: 'meadow', sprites: [], tapko: true, gloves: true },
  world1: { world: 'meadow', sprites: ['obj-bee', 'obj-butterfly', 'obj-ladybug'] },
  invitation: { world: 'meadow', sprites: ['obj-rocket'], tapko: true, envelope: true },
  world2: { world: 'space', sprites: ['obj-rocket', 'obj-planet-2'] },
  landing: { world: 'space', sprites: ['obj-planet-3', 'obj-rocket'], tapko: true },
  world3: { world: 'planet', sprites: ['obj-swamp-stone', 'obj-crystal-amber'], tapko: true },
  force: { world: 'planet', sprites: ['obj-crystal-amber', 'obj-crystal-rose', 'obj-crystal-aqua'], tapko: true, sparkles: true },
  world4: { world: 'dragons', sprites: ['obj-dragon-baby-1', 'obj-dragon-baby-2', 'obj-dragon-baby-3'] },
  egg: { world: 'dragons', sprites: ['obj-egg', 'obj-dragon-baby-2'], tapko: true, sparkles: true },
  world5: { world: 'egg', sprites: ['obj-egg'], tapko: true },
  hatched: { world: 'egg', sprites: ['obj-dragon-hatched'], tapko: true, sparkles: true },
  world6: { world: 'junkyard', sprites: ['obj-tire', 'obj-crate', 'obj-can'], tapko: true },
  friends: { world: 'junkyard', sprites: [], tapko: true, mood: 'surprised', bolt: { look: 'broken', raincoat: false, mood: 'happy' }, sparkles: true },
  world7: { world: 'workshop', sprites: ['obj-gear', 'obj-bolt', 'obj-wheel'], bolt: { look: 'robot', raincoat: false, mood: 'idle' } },
  legs: { world: 'workshop', sprites: [], tapko: true, bolt: { look: 'robot2', raincoat: false, mood: 'happy' }, sparkles: true },
  world8: { world: 'raintown', sprites: ['obj-raindrop', 'obj-umbrella'], bolt: { look: 'robot2', raincoat: false, mood: 'worried' } },
  raincoat: { world: 'raintown', sprites: [], tapko: true, bolt: { look: 'robot2', raincoat: true, mood: 'happy' }, sparkles: true },
  world9: { world: 'robocity', sprites: ['obj-door', 'obj-panel'], bolt: { look: 'robot2', raincoat: true, mood: 'idle' } },
  key: { world: 'robocity', sprites: ['obj-door-open'], tapko: true, bolt: { look: 'robot2', raincoat: true, mood: 'happy' }, sparkles: true },
  world10: { world: 'robohome', sprites: ['obj-lamp'], tapko: true, bolt: { look: 'robot2', raincoat: true, mood: 'idle' } },
  home: { world: 'robohome', sprites: ['obj-vacuum-robot', 'obj-toaster-robot', 'obj-robot-small-1'], tapko: true, bolt: { look: 'robot2', raincoat: true, mood: 'happy' }, sparkles: true },
  world11: { world: 'garden', sprites: ['obj-bud'], tapko: true, fairy: 'curious' },
  wreath: { world: 'garden', sprites: ['obj-big-flower-open'], tapko: true, fairy: 'happy', sparkles: true },
  world12: { world: 'forestpath', sprites: ['obj-bird', 'obj-owl'], fairy: 'singing' },
  feather: { world: 'forestpath', sprites: ['obj-bird'], tapko: true, fairy: 'happy', sparkles: true },
  world13: { world: 'lilylake', sprites: ['obj-lily-pad', 'obj-frog'], fairy: 'idle' },
  lily: { world: 'lilylake', sprites: ['obj-lily', 'obj-frog'], tapko: true, fairy: 'happy', sparkles: true },
  world14: { world: 'musictree', sprites: ['obj-note'], tapko: true, fairy: 'singing' },
  harp: { world: 'musictree', sprites: ['obj-note'], tapko: true, fairy: 'happy', sparkles: true },
  world15: { world: 'moonball', sprites: ['obj-firefly'], fairy: 'singing' },
  wings: { world: 'moonball', sprites: ['obj-firefly', 'obj-baby-bird'], tapko: true, fairy: 'happy', sparkles: true },
};

interface StoryParams {
  scene: string;
  next: ScreenName;
  nextParams?: any;
}

/** Short skippable story scene: a few lines and a gentle animation. */
export function storyScreen(root: HTMLElement, params: StoryParams): () => void {
  const p = app.profile!;
  const def = SCENES[params.scene] ?? SCENES.intro;
  const lines = tList(`story.scenes.${params.scene}`, { name: nickname(p) });
  audio.music(def.world);
  let i = 0;
  const bg = imageUrl(`bg-${def.world}-far`);
  const text = h('p', { class: 'story-text', 'aria-live': 'polite' });
  const dots = h('div', { class: 'story-dots' }, ...lines.map(() => h('i')));
  const stage = h('div', { class: 'story-stage' },
    ...def.sprites.map((s, k) => {
      const src = imageUrl(s);
      return src ? h('img', { class: 'story-sprite', src, alt: '', style: `--k:${k}` }) : null;
    }),
    def.envelope ? h('div', { class: 'envelope', 'aria-hidden': 'true' }, h('span', {}, '★')) : null,
    def.tapko ? h('div', { class: 'story-tapko' }, tapkoElement(p.companion, def.mood && hasImage(`tapko-${p.companion.kind}-${def.mood}`) ? def.mood : 'happy', 220)) : null,
    def.bolt ? h('div', { class: 'story-bolt' }, robotElement(def.bolt, def.bolt.mood, 180)) : null,
    def.fairy ? h('div', { class: 'story-melody' }, fairyElement(def.fairy, 160)) : null,
    def.gloves ? gloves() : null,
    def.sparkles ? h('div', { class: 'sparkles', 'aria-hidden': 'true' }, ...Array.from({ length: 14 }, (_, k) => h('i', { style: `--k:${k}` }))) : null);
  const seen = (scene: string) => {
    if (p.progress.scenesSeen.includes(scene)) return;
    p.progress.scenesSeen.push(scene);
    if (!p.progress.rewards.includes(scene) && !scene.startsWith('world') && scene !== 'intro') p.progress.rewards.push(scene);
    saveProfile();
  };
  const finish = () => {
    seen(params.scene);
    go(params.next, params.nextParams ?? {});
  };
  /** Skipping skips the scenes chained after this one too (the intro, then the first world's scene). */
  const skip = () => {
    let at: StoryParams = params;
    seen(at.scene);
    while (at.next === 'story' && at.nextParams) {
      at = at.nextParams;
      seen(at.scene);
    }
    go(at.next, at.nextParams ?? {});
  };
  const show = () => {
    if (i >= lines.length) return finish();
    text.textContent = lines[i];
    text.classList.remove('in');
    void text.offsetWidth;
    text.classList.add('in');
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k <= i));
    nextBtn.querySelector('span:not(.icon)')!.textContent = i === lines.length - 1 ? t('common.continue') : t('story.next');
  };
  const nextBtn = button(t('story.next'), () => { i++; show(); }, 'btn primary', 'next');
  const screen = h('div', { class: `screen story-screen world-${def.world}`, style: bg ? `--bg:url("${bg}")` : '' },
    cornerControls(),
    stage,
    h('div', { class: 'story-box' }, closeButton(skip, t('common.skip')), text, dots, h('div', { class: 'row' }, button(t('common.skip'), skip), nextBtn)));
  root.append(screen);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); skip(); }
    else if ((e.key === ' ' || e.key === 'Enter') && document.activeElement !== nextBtn) { e.preventDefault(); i++; show(); }
  };
  window.addEventListener('keydown', onKey);
  if (!lines.length) queueMicrotask(finish);
  else show();
  nextBtn.focus();
  return () => window.removeEventListener('keydown', onKey);
}
