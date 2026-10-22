import { app, go, saveProfile } from '../app/app';
import { accessories, imageUrl } from '../gfx/assets';
import { SLOTS, tapkoElement, renderTapkoInto } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { friendStars, grantCompanions, hasAccessory, hasCompanion, totalStars, unlockRules } from '../game/rewards';
import { COMPANION_KINDS } from '../storage/schema';
import { NICK_MAX } from '../storage/store';
import { button, h, icon } from '../ui/dom';
import { cornerControls } from '../ui/chrome';
import { levelTitleWords } from '../ui/hud';

/**
 * The child's character and wardrobe: the nickname and a kind earned by stars; then one
 * item per body area, mixed freely; locked things show how this player earns them.
 */
export function wardrobeScreen(root: HTMLElement): void {
  const p = app.profile!;
  // Stars earned before friends could be earned count too.
  if (grantCompanions(p).length) saveProfile();
  const preview = tapkoElement(p.companion, 'happy', 280);
  // An empty nickname is allowed: the game then uses the player's name.
  const nick = h('input', { id: 'buddy-name', type: 'text', maxlength: String(NICK_MAX), value: p.companion.name, placeholder: p.name, autocomplete: 'off', spellcheck: 'false' });
  nick.addEventListener('input', () => {
    p.companion.name = nick.value.trim();
    saveProfile();
  });
  const stars = totalStars(p);
  const kinds = h('div', { class: 'kind-picker', role: 'radiogroup', 'aria-label': t('wardrobe.buddy') });
  const rules = new Map(unlockRules(p).map((r) => [r.acc, r.rule]));
  const howTo = (id: string): string => {
    const r = rules.get(id);
    if (!r) return '';
    if (r.kind === 'level') {
      const [w, l] = r.id.slice(1).split('-');
      return t('wardrobe.byLevel', { level: levelTitleWords(Number(w) - 1, Number(l) - 1) });
    }
    if (r.kind === 'world') return t('wardrobe.byWorld', { world: r.world + 1 });
    return t('wardrobe.byMastery', { n: r.keys });
  };
  const grid = h('div', { class: 'wardrobe-grid' });
  const render = () => {
    renderTapkoInto(preview, p.companion, 'happy');
    kinds.replaceChildren(...COMPANION_KINDS.map((k) => {
      const owned = hasCompanion(p, k);
      const on = p.companion.kind === k;
      const missing = t('wardrobe.kindLocked', { n: Math.max(1, friendStars(p, k) - stars) });
      return h('button', {
        class: `kind ${on ? 'on' : ''} ${owned ? '' : 'locked'}`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(on),
        'aria-label': owned ? t(`kinds.${k}`) : `${t(`kinds.${k}`)} (${missing})`,
        disabled: !owned,
        onClick: () => {
          p.companion.kind = k;
          p.avatar = k;
          saveProfile();
          render();
        },
      }, tapkoElement({ name: '', kind: k, accessories: [] }, 'idle', 72), owned ? null : h('span', { class: 'lock' }, icon('lock')),
        h('span', {}, owned ? t(`kinds.${k}`) : missing));
    }));
    grid.replaceChildren(...SLOTS.flatMap((slot) => {
      const items = accessories().filter((a) => a.slot === slot);
      if (!items.length) return [];
      return [h('section', { class: 'slot' },
        h('h3', {}, t(`slots.${slot}`)),
        h('div', { class: 'items' }, ...items.map((a) => {
          const owned = hasAccessory(p, a.id);
          const on = p.companion.accessories.includes(a.id);
          const src = imageUrl(`acc-${a.id}-thumb`) ?? imageUrl(`acc-${a.id}`);
          return h('button', {
            class: `item ${on ? 'on' : ''} ${owned ? '' : 'locked'}`,
            type: 'button',
            'aria-pressed': String(on),
            'aria-label': `${t(`items.${a.id}`)}${owned ? '' : ` (${howTo(a.id)})`}`,
            title: owned ? t(`items.${a.id}`) : howTo(a.id),
            disabled: !owned,
            onClick: () => {
              const others = p.companion.accessories.filter((id) => accessories().find((x) => x.id === id)?.slot !== slot);
              p.companion.accessories = on ? others : [...others, a.id];
              saveProfile();
              render();
            },
          }, src ? h('img', { src, alt: '' }) : null, owned ? null : h('span', { class: 'lock' }, icon('lock')));
        })))];
    }));
  };
  render();
  const owned = accessories().filter((a) => hasAccessory(p, a.id)).length;
  const star = imageUrl('ui-star');
  root.append(h('div', { class: 'screen wardrobe-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'), h('h1', {}, t('wardrobe.title'))),
    cornerControls(),
    h('div', { class: 'wardrobe-body' },
      h('div', { class: 'wardrobe-preview' }, preview,
        h('span', { class: 'star-count', role: 'img', 'aria-label': t('wardrobe.stars', { n: stars }) }, star ? h('img', { src: star, alt: '' }) : '★', String(stars)),
        h('p', {}, t('wardrobe.count', { n: owned, total: accessories().length })),
        button(t('wardrobe.clear'), () => { p.companion.accessories = []; saveProfile(); render(); }, 'btn ghost small')),
      h('div', { class: 'wardrobe-main' },
        h('section', { class: 'buddy' },
          h('h2', {}, t('wardrobe.buddy')),
          h('label', { for: 'buddy-name', class: 'field-label' }, t('wardrobe.name')), nick,
          kinds),
        h('h2', {}, t('wardrobe.wardrobe')),
        grid))));
}
