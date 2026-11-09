import { app, go, reduceMotion, saveProfile } from '../app/app';
import { audio } from '../audio/audio';
import { accessories, imageUrl } from '../gfx/assets';
import { type Mood, SLOTS, otherMood, randomOutfit, tapkoElement, renderTapkoInto } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { levelById } from '../game/levels';
import { RANDOM_KIND_STARS, accessoryShown, friendStars, grantSecret, nextSecret, grantCompanions, hasAccessory, hasCompanion, masteredKeys, randomKindOpen, randomSlotKeys, randomSlotOpen, totalStars, unlockRules } from '../game/rewards';
import { practiceToOpen, spendWardrobe, wardrobeLimited, wardrobeLocked } from '../game/wardrobe-time';
import { COMPANION_KINDS } from '../storage/schema';
import { NICK_MAX } from '../storage/store';
import { button, h, icon, onEscape } from '../ui/dom';
import { cornerControls } from '../ui/chrome';
import { levelTitleWords, timerPic } from '../ui/hud';

/** The balance is saved this often (seconds) while the wardrobe is open, and on leaving it. */
const SAVE_EVERY = 10;

/**
 * The child's character and wardrobe: the nickname and a kind earned by stars; then one
 * item per body area, mixed freely; locked things show how this player earns them. A random tile
 * beside the kinds and in every body area, once earned, lets each mission choose anew; it stays on
 * beside the child's own pick, which "clear" and "random outfit" change without touching it. With the
 * wardrobe limit the time here is earned by practice and runs out; then nothing can change.
 */
export function wardrobeScreen(root: HTMLElement): () => void {
  const p = app.profile!;
  // Stars earned before friends could be earned count too.
  if (grantCompanions(p).length) saveProfile();
  let locked = wardrobeLocked(p);
  let mood: Mood = 'happy';
  const preview = tapkoElement(p.companion, mood, 280);
  // Clicks in this visit since the last secret accessory was found.
  let clicks = 0;
  /** Enough clicks find the next secret (a moustache, then a big beard): it replaces the one owned and, unless the wardrobe is locked, is worn at once. */
  const findSecret = (): boolean => {
    const next = nextSecret(p);
    if (!next || !accessories().some((a) => a.id === next[0]) || ++clicks < next[1]) return false;
    clicks = 0;
    const [id] = next;
    grantSecret(p, id);
    if (!locked) {
      const slot = accessories().find((a) => a.id === id)!.slot;
      p.companion.accessories = [...p.companion.accessories.filter((x) => accessories().find((a) => a.id === x)?.slot !== slot), id];
    }
    saveProfile();
    audio.sfx('reward');
    mood = 'happy';
    render();
    return true;
  };
  // A click makes the character jump or pull a face, also while locked; the face is never stored.
  const tickle = h('button', { class: 'wardrobe-tapko', type: 'button', 'aria-label': t('wardrobe.tickle'), onClick: () => {
    if (findSecret()) return;
    if (!reduceMotion() && Math.random() < 0.5) {
      preview.classList.remove('jump');
      void preview.offsetWidth;
      preview.classList.add('jump');
      return;
    }
    mood = otherMood(p.companion.kind, mood);
    renderTapkoInto(preview, p.companion, mood);
  } }, preview);
  preview.addEventListener('animationend', () => preview.classList.remove('jump'));
  // The nickname is required: an empty field keeps the last one and shows it again on leaving.
  const nick = h('input', { id: 'buddy-name', type: 'text', maxlength: String(NICK_MAX), value: p.companion.name, required: true, autocomplete: 'off', spellcheck: 'false' });
  nick.addEventListener('input', () => {
    const v = nick.value.trim();
    if (!v) return;
    p.companion.name = v;
    saveProfile();
  });
  nick.addEventListener('blur', () => { nick.value = p.companion.name; });
  const stars = totalStars(p);
  const kinds = h('div', { class: 'kind-picker', role: 'radiogroup', 'aria-label': t('wardrobe.buddy') });
  const rules = new Map(unlockRules(p).map((r) => [r.acc, r.rule]));
  const howTo = (id: string): string => {
    const r = rules.get(id);
    if (!r) return '';
    if (r.kind === 'level') {
      const l = levelById(r.id);
      const level = l ? levelTitleWords(l.world, l.index) : '';
      return r.perfect ? t('wardrobe.byLevelOrPerfect', { level, n: r.perfect }) : t('wardrobe.byLevel', { level });
    }
    if (r.kind === 'world') return t('wardrobe.byWorld', { world: r.world + 1 });
    return t('wardrobe.byStars', { n: r.stars, have: p.progress.starsEarned });
  };
  const grid = h('div', { class: 'wardrobe-grid' });
  const clear = button(t('wardrobe.clear'), () => { p.companion.accessories = []; saveProfile(); render(); }, 'btn ghost small');
  const random = button(t('wardrobe.random'), () => { p.companion.accessories = randomOutfit((id) => hasAccessory(p, id)); saveProfile(); render(); }, 'btn ghost small');
  // A random tile: earned or locked with what it still needs; on, it stays checked beside the child's own pick.
  const randomTile = (cls: string, on: boolean, open: boolean, tipText: string, toggle: () => void) => h('button', {
    class: `${cls} random ${on ? 'on' : ''} ${open ? '' : 'locked'}`,
    type: 'button',
    'aria-pressed': open ? String(on) : null,
    'aria-disabled': open ? null : 'true',
    'aria-label': `${t('wardrobe.randomTile')}: ${tipText}`,
    tip: tipText,
    disabled: locked,
    onClick: () => {
      if (!open) return;
      toggle();
      saveProfile();
      render();
    },
  }, h('span', { class: 'random-mark', 'aria-hidden': 'true' }, '?'), open ? null : h('span', { class: 'lock' }, icon('lock')));
  const render = () => {
    renderTapkoInto(preview, p.companion, mood);
    const kindOpen = randomKindOpen(p);
    const kindTile = randomTile('kind', p.companion.randomKind, kindOpen,
      kindOpen ? t('wardrobe.randomKind') : t('wardrobe.randomKindNeed', { n: RANDOM_KIND_STARS - p.progress.starsEarned }),
      () => { p.companion.randomKind = !p.companion.randomKind; });
    nick.disabled = clear.disabled = random.disabled = locked;
    kinds.replaceChildren(...COMPANION_KINDS.map((k) => {
      const owned = hasCompanion(p, k);
      const on = p.companion.kind === k;
      const name = t(`kinds.${k}`);
      const need = owned ? '' : t('wardrobe.kindNeed', { n: Math.max(1, friendStars(p, k) - stars), name });
      // A locked tile stays focusable and hoverable, so its tooltip can say what is missing.
      return h('button', {
        class: `kind ${on ? 'on' : ''} ${owned ? '' : 'locked'}`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(on),
        'aria-label': owned ? name : `${name}: ${need}`,
        'aria-disabled': owned ? null : 'true',
        tip: need || null,
        disabled: locked,
        onClick: () => {
          if (!owned) return;
          p.companion.kind = k;
          p.avatar = k;
          saveProfile();
          render();
        },
      }, tapkoElement({ name: '', kind: k, accessories: [] }, 'idle', 72), owned ? null : h('span', { class: 'lock', tip: need }, icon('lock')),
        h('span', { class: 'kind-name' }, name));
    }), kindTile);
    const mastered = masteredKeys(p), slotKeys = randomSlotKeys(p);
    const slotTile = (slot: (typeof SLOTS)[number]) => {
      const open = randomSlotOpen(p, slot), on = p.companion.randomSlots.includes(slot);
      return randomTile('item', on, open,
        open ? t('wardrobe.randomSlot') : t('wardrobe.randomSlotNeed', { n: slotKeys[slot], have: mastered }),
        () => { p.companion.randomSlots = on ? p.companion.randomSlots.filter((x) => x !== slot) : [...p.companion.randomSlots, slot]; });
    };
    grid.replaceChildren(...SLOTS.flatMap((slot) => {
      const items = accessories().filter((a) => a.slot === slot && accessoryShown(p, a.id));
      if (!items.length) return [];
      return [h('section', { class: 'slot' },
        h('h3', {}, t(`slots.${slot}`)),
        h('div', { class: 'items' }, slotTile(slot), ...items.map((a) => {
          const owned = hasAccessory(p, a.id);
          const on = p.companion.accessories.includes(a.id);
          const src = imageUrl(`acc-${a.id}-thumb`) ?? imageUrl(`acc-${a.id}`);
          return h('button', {
            class: `item ${on ? 'on' : ''} ${owned ? '' : 'locked'}`,
            type: 'button',
            'aria-pressed': String(on),
            'aria-label': `${t(`items.${a.id}`)}${owned ? '' : ` (${howTo(a.id)})`}`,
            'aria-disabled': owned ? null : 'true',
            tip: owned ? t(`items.${a.id}`) : howTo(a.id),
            disabled: locked,
            onClick: () => {
              if (!owned) return;
              const others = p.companion.accessories.filter((id) => accessories().find((x) => x.id === id)?.slot !== slot);
              p.companion.accessories = on ? others : [...others, a.id];
              saveProfile();
              render();
            },
          }, src ? h('img', { src, alt: '' }) : null, owned ? null : h('span', { class: 'lock', tip: howTo(a.id) }, icon('lock')));
        })))];
    }));
    const shown = accessories().filter((a) => accessoryShown(p, a.id));
    count.textContent = t('wardrobe.count', { n: shown.filter((a) => hasAccessory(p, a.id)).length, total: shown.length });
  };
  const count = h('p', {});
  render();
  // The countdown runs only while the wardrobe is shown and the page is visible; at 0 it locks in place
  // and the clock turns into a lock that says how to open the wardrobe again.
  const timer = wardrobeLimited(p) ? timerPic(p.progress.wardrobeSeconds, t('wardrobe.timerNote')) : null;
  const lockTimer = () => timer!.lock(t('wardrobe.locked', { n: practiceToOpen(p) }));
  if (timer && locked) lockTimer();
  let ticks = 0;
  const tick = () => {
    if (document.hidden) return;
    spendWardrobe(p, 1);
    timer!.set(p.progress.wardrobeSeconds);
    if (p.progress.wardrobeSeconds > 0) {
      if (++ticks % SAVE_EVERY === 0) saveProfile();
      return;
    }
    clearInterval(interval);
    lockTimer();
    locked = true;
    saveProfile();
    render();
  };
  const interval = timer && !locked ? setInterval(tick, 1000) : undefined;
  const star = imageUrl('ui-star'), earned = imageUrl('ui-stars-earned');
  root.append(h('div', { class: 'screen wardrobe-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'), h('h1', {}, t('wardrobe.title'))),
    cornerControls(),
    h('div', { class: 'wardrobe-body' },
      h('div', { class: 'wardrobe-preview' }, timer?.el, tickle,
        h('div', { class: 'star-counts' },
          h('span', { class: 'star-count', role: 'img', 'aria-label': t('wardrobe.stars', { n: stars }), tip: t('wardrobe.starsTip') }, star ? h('img', { src: star, alt: '' }) : '★', String(stars)),
          h('span', { class: 'star-count', role: 'img', 'aria-label': t('progress.starsEarned', { n: p.progress.starsEarned }), tip: t('wardrobe.starsEarnedTip') }, earned ? h('img', { src: earned, alt: '' }) : '★', String(p.progress.starsEarned))),
        count,
        h('div', { class: 'row' }, clear, random)),
      h('div', { class: 'wardrobe-main' },
        h('section', { class: 'buddy' },
          h('h2', {}, t('wardrobe.buddy')),
          h('label', { for: 'buddy-name', class: 'field-label' }, t('wardrobe.name')), nick,
          kinds),
        h('h2', {}, t('wardrobe.wardrobe')),
        grid))));
  root.querySelector<HTMLElement>('.bar .btn')!.focus();
  const offEscape = onEscape(() => go('map'));
  return () => {
    offEscape();
    clearInterval(interval);
    if (timer) saveProfile();
  };
}
