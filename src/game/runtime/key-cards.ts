import { app, layout, saveProfile } from '../../app/app';
import { enterAfter, homeKey } from '../../keyboard/layouts';
import { keysToIntroduce } from '../../learning/lessons';
import type { KeyboardGuide } from '../../ui/keyboard-guide';
import { type ControlKey, showControlKey, showHomeRow, showKeysIntro, showNewKey } from '../cards';
import type { LevelDef } from '../levels';

/** A control key's card, once per profile; it never counts among the learned keys. */
async function controlKey(host: HTMLElement, id: ControlKey): Promise<void> {
  const p = app.profile!, seen = `key-${id}`;
  if (p.progress.scenesSeen.includes(seen)) return;
  p.progress.scenesSeen.push(seen);
  saveProfile();
  await showControlKey(host, id, layout(), p);
}

/**
 * The cards before play that teach keys: each new key, the home row once F and J are known, Tab
 * and Backspace. Returns the new keys shown (they count as introduced once play begins), or null
 * when the level was left (`gone`) in between.
 */
export async function keyCards(host: HTMLElement, guide: KeyboardGuide, kind: LevelDef['kind'], gone: () => boolean): Promise<string[] | null> {
  const p = app.profile!;
  const lay = layout();
  const shown: string[] = [];
  const homeKeys = [homeKey(lay, 3), homeKey(lay, 6)];
  const known = (k: string | null) => !!k && (p.progress.introducedKeys.includes(k) || shown.includes(k));
  for (const key of keysToIntroduce(p)) {
    if (gone()) return null;
    // The very first key card is preceded by why key cards come and how they close.
    if (!p.progress.introducedKeys.length && !shown.length) await showKeysIntro(host, p);
    // Esc comes before the first key: it stops the game and closes every card.
    if (!gone()) await controlKey(host, 'escape');
    if (gone()) return null;
    await showNewKey(host, key, lay, guide, p);
    shown.push(key);
    // Once F and J are both known, the home row is taught, before they are used in play.
    if (homeKeys.includes(key) && homeKeys.every(known)) await showHomeRow(host, lay, guide, p);
  }
  if (gone()) return null;
  // Tab comes a level after Enter (which comes with the right little finger's home key): together they get around any page without a mouse.
  if (p.progress.introducedKeys.includes(enterAfter(lay))) await controlKey(host, 'tab');
  if (gone()) return null;
  // The first crossroads teaches Backspace: here it takes back a choice, it never fixes a typo.
  if (kind === 'crossroads') await controlKey(host, 'backspace');
  return gone() ? null : shown;
}
