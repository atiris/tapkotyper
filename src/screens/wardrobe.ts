import { app, go, reduceMotion, saveProfile } from '../app/app';
import { accessories, hasImage, imageUrl } from '../gfx/assets';
import { type Mood, SLOTS, tapkoElement, renderTapkoInto } from '../gfx/tapko';
import { t } from '../i18n/i18n';
import { friendStars, grantCompanions, hasAccessory, hasCompanion, totalStars, unlockRules } from '../game/rewards';
import { practiceToOpen, spendWardrobe, wardrobeLimited, wardrobeLocked } from '../game/wardrobe-time';
import { COMPANION_KINDS, type Profile } from '../storage/schema';
import { NICK_MAX } from '../storage/store';
import { button, h, icon } from '../ui/dom';
import { cornerControls } from '../ui/chrome';
import { levelTitleWords, timerPic } from '../ui/hud';

/** The balance is saved this often (seconds) while the wardrobe is open, and on leaving it. */
const SAVE_EVERY = 10;

/** For every body area: half the time nothing, else one of the owned items of that area. */
function randomOutfit(p: Profile): string[] {
  return SLOTS.flatMap((slot) => {
    const owned = accessories().filter((a) => a.slot === slot && hasAccessory(p, a.id));
    if (!owned.length || Math.random() < 0.5) return [];
    return [owned[Math.floor(Math.random() * owned.length)].id];
  });
}

/**
 * The child's character and wardrobe: the nickname and a kind earned by stars; then one
 * item per body area, mixed freely; locked things show how this player earns them. With the
 * wardrobe limit the time here is earned by practice and runs out; then nothing can change.
 */
export function wardrobeScreen(root: HTMLElement): () => void {
  const p = app.profile!;
  // Stars earned before friends could be earned count too.
  if (grantCompanions(p).length) saveProfile();
  let locked = wardrobeLocked(p);
  let mood: Mood = 'happy';
  const preview = tapkoElement(p.companion, mood, 280);
  // A click makes the character jump or pull a face, also while locked; the face is never stored.
  const tickle = h('button', { class: 'wardrobe-tapko', type: 'button', 'aria-label': t('wardrobe.tickle'), onClick: () => {
    if (!reduceMotion() && Math.random() < 0.5) {
      preview.classList.remove('jump');
      void preview.offsetWidth;
      preview.classList.add('jump');
      return;
    }
    const moods = (['idle', 'happy', 'thinking', 'surprised'] as Mood[])
      .filter((m) => m !== mood && (m !== 'surprised' || hasImage(`tapko-${p.companion.kind}-surprised`)));
    mood = moods[Math.floor(Math.random() * moods.length)];
    renderTapkoInto(preview, p.companion, mood);
  } }, preview);
  preview.addEventListener('animationend', () => preview.classList.remove('jump'));
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
  const clear = button(t('wardrobe.clear'), () => { p.companion.accessories = []; saveProfile(); render(); }, 'btn ghost small');
  const random = button(t('wardrobe.random'), () => { p.companion.accessories = randomOutfit(p); saveProfile(); render(); }, 'btn ghost small');
  const lockLine = h('p', { class: 'wardrobe-locked', role: 'status' });
  const render = () => {
    renderTapkoInto(preview, p.companion, mood);
    nick.disabled = clear.disabled = random.disabled = locked;
    lockLine.hidden = !locked;
    lockLine.textContent = locked ? t('wardrobe.locked', { n: practiceToOpen(p) }) : '';
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
  };
  render();
  // The countdown runs only while the wardrobe is shown and the page is visible; at 0 it locks in place.
  const timer = wardrobeLimited(p) && !locked ? timerPic(p.progress.wardrobeSeconds) : null;
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
    timer!.el.remove();
    locked = true;
    saveProfile();
    render();
  };
  const interval = timer ? setInterval(tick, 1000) : undefined;
  const owned = accessories().filter((a) => hasAccessory(p, a.id)).length;
  const star = imageUrl('ui-star');
  root.append(h('div', { class: 'screen wardrobe-screen' },
    h('header', { class: 'bar' }, button(t('common.back'), () => go('map'), 'btn ghost small', 'back'), h('h1', {}, t('wardrobe.title')), timer?.el),
    cornerControls(),
    h('div', { class: 'wardrobe-body' },
      h('div', { class: 'wardrobe-preview' }, tickle,
        h('span', { class: 'star-count', role: 'img', 'aria-label': t('wardrobe.stars', { n: stars }) }, star ? h('img', { src: star, alt: '' }) : '★', String(stars)),
        h('p', {}, t('wardrobe.count', { n: owned, total: accessories().length })),
        h('div', { class: 'row' }, clear, random),
        lockLine),
      h('div', { class: 'wardrobe-main' },
        h('section', { class: 'buddy' },
          h('h2', {}, t('wardrobe.buddy')),
          h('label', { for: 'buddy-name', class: 'field-label' }, t('wardrobe.name')), nick,
          kinds),
        h('h2', {}, t('wardrobe.wardrobe')),
        grid))));
  return () => {
    clearInterval(interval);
    if (timer) saveProfile();
  };
}
