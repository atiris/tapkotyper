import { app, go } from '../app/app';
import { imageUrl } from '../gfx/assets';
import { fairyElement } from '../gfx/fairy';
import { robotElement } from '../gfx/robot';
import { t } from '../i18n/i18n';
import { STORIES, storyDone } from '../game/levels';
import type { Friend } from '../storage/schema';
import { button, h } from '../ui/dom';
import { cornerControls } from '../ui/chrome';

const LITTLE_ROBOTS = ['obj-robot-small-1', 'obj-robot-small-2', 'obj-robot-small-3'];
const FOREST_FRIENDS = ['obj-baby-bird', 'obj-firefly'];

/** One friend's picture: a dragon tinted by its hue, a little robot or forest friend by its order. */
function picture(f: Friend, i: number): HTMLElement | null {
  const src = f.kind === 'dragon' ? imageUrl('obj-dragon-baby-1')
    : imageUrl(f.kind === 'robot' ? LITTLE_ROBOTS[i % LITTLE_ROBOTS.length] : FOREST_FRIENDS[i % FOREST_FRIENDS.length]);
  if (src) return h('img', { src, alt: '', style: `filter:hue-rotate(${f.hue}deg)` });
  return f.kind === 'robot' ? robotElement({ look: 'robot2', raincoat: false }, 'happy', 120) : null;
}

/** Little friends helped in rescue missions: the dragons of story 1, the robots of story 2 and the forest friends of story 3. */
export function friendsScreen(root: HTMLElement): void {
  const p = app.profile!;
  const [dragonStory, robotStory, fairyStory] = STORIES;
  const group = (kind: Friend['kind'], first: HTMLElement | null) => {
    const list = p.progress.friends.filter((f) => f.kind === kind);
    if (!first && !list.length) return null;
    return h('section', { class: `friend-group friends-${kind}` },
      h('h2', {}, t(`friends.${kind}s`)),
      h('div', { class: 'dragon-grid' },
        first,
        ...list.map((f, i) => h('figure', { class: 'dragon' }, picture(f, i), h('figcaption', {}, f.name, h('small', {}, f.date))))));
  };
  const hatched = imageUrl('obj-dragon-hatched');
  const firstDragon = storyDone(p, dragonStory)
    ? h('figure', { class: 'dragon first' }, hatched ? h('img', { src: hatched, alt: '' }) : null, h('figcaption', {}, t('friends.firstDragon')))
    : null;
  const bolt = storyDone(p, robotStory)
    ? h('figure', { class: 'dragon first' }, robotElement({ look: 'robot2', raincoat: true }, 'happy', 120), h('figcaption', {}, t('friends.bolt')))
    : null;
  const melody = storyDone(p, fairyStory)
    ? h('figure', { class: 'dragon first' }, fairyElement('happy', 120), h('figcaption', {}, t('friends.melody')))
    : null;
  root.append(h('div', { class: 'screen dragons-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'), h('h1', {}, t('friends.title'))),
    cornerControls(),
    h('main', { class: 'panel friends-board' },
      group('dragon', firstDragon),
      group('robot', bolt),
      group('forest', melody),
      p.progress.friends.length ? null : h('div', { class: 'friends-empty' },
        h('div', { class: 'friends-teasers', 'aria-hidden': 'true' }, ...[...LITTLE_ROBOTS.slice(0, 1), 'obj-dragon-baby-1', ...FOREST_FRIENDS.slice(0, 1)].map((id) => {
          const src = imageUrl(id);
          return h('span', { class: 'teaser' }, src ? h('img', { src, alt: '' }) : '?');
        })),
        h('p', {}, t('friends.empty'))),
      h('div', { class: 'row center' }, button(t('map.rescue'), () => go('level', { id: 'rescue' }), 'btn primary', 'rescue')))));
}
