import { app, go, saveProfile, type ScreenName } from '../app/app';
import { audio } from '../audio/audio';
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
  /** Tapko's mood; a mood without pictures for the kind falls back to happy. */
  mood?: Mood;
  /** Bolt in story 2. */
  bolt?: RobotState & { mood: RobotMood };
  /** Melody in story 3. */
  fairy?: FairyMood;
}

const SCENES: Record<string, SceneDef> = {
  invitation: { world: 'meadow', sprites: ['obj-rocket'], tapko: true, envelope: true },
  landing: { world: 'space', sprites: ['obj-planet-3', 'obj-rocket'], tapko: true },
  force: { world: 'planet', sprites: ['obj-crystal-amber', 'obj-crystal-rose', 'obj-crystal-aqua'], tapko: true, sparkles: true },
  egg: { world: 'dragons', sprites: ['obj-egg-plain', 'obj-firepit'], tapko: true, sparkles: true },
  hatched: { world: 'egg', sprites: ['obj-dragon-hatched'], tapko: true, sparkles: true },
  friends: { world: 'junkyard', sprites: [], tapko: true, mood: 'surprised', bolt: { look: 'broken', raincoat: false, mood: 'happy' }, sparkles: true },
  legs: { world: 'workshop', sprites: [], tapko: true, bolt: { look: 'robot2', raincoat: false, mood: 'happy' }, sparkles: true },
  raincoat: { world: 'raintown', sprites: [], tapko: true, bolt: { look: 'robot2', raincoat: true, mood: 'happy' }, sparkles: true },
  key: { world: 'robocity', sprites: ['obj-door-open'], tapko: true, bolt: { look: 'robot2', raincoat: true, mood: 'happy' }, sparkles: true },
  home: { world: 'robohome', sprites: ['obj-vacuum-robot', 'obj-toaster-robot', 'obj-robot-small-1'], tapko: true, bolt: { look: 'robot2', raincoat: true, mood: 'happy' }, sparkles: true },
  wreath: { world: 'garden', sprites: ['obj-big-flower-open'], tapko: true, fairy: 'happy', sparkles: true },
  feather: { world: 'forestpath', sprites: ['obj-bird'], tapko: true, fairy: 'happy', sparkles: true },
  lily: { world: 'lilylake', sprites: ['obj-lily', 'obj-frog'], tapko: true, fairy: 'happy', sparkles: true },
  harp: { world: 'musictree', sprites: ['obj-note'], tapko: true, fairy: 'happy', sparkles: true },
  wings: { world: 'moonball', sprites: ['obj-firefly', 'obj-baby-bird'], tapko: true, fairy: 'happy', sparkles: true },
};

interface StoryParams {
  scene: string;
  next: ScreenName;
}

/** A story reward scene: a few lines and a gentle animation; Skip, the X or Esc ends it. */
export function storyScreen(root: HTMLElement, params: StoryParams): () => void {
  const p = app.profile!;
  const def = SCENES[params.scene];
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
    def.sparkles ? h('div', { class: 'sparkles', 'aria-hidden': 'true' }, ...Array.from({ length: 14 }, (_, k) => h('i', { style: `--k:${k}` }))) : null);
  const seen = (scene: string) => {
    if (p.progress.scenesSeen.includes(scene)) return;
    p.progress.scenesSeen.push(scene);
    if (!p.progress.rewards.includes(scene)) p.progress.rewards.push(scene);
    saveProfile();
  };
  const finish = () => {
    seen(params.scene);
    go(params.next);
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
    h('div', { class: 'story-box' }, closeButton(finish, t('common.skip')), text, dots, h('div', { class: 'row' }, button(t('common.skip'), finish), nextBtn)));
  root.append(screen);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if ((e.key === ' ' || e.key === 'Enter') && document.activeElement !== nextBtn) { e.preventDefault(); i++; show(); }
  };
  window.addEventListener('keydown', onKey);
  if (!lines.length) queueMicrotask(finish);
  else show();
  nextBtn.focus();
  return () => window.removeEventListener('keydown', onKey);
}
