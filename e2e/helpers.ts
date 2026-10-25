import type { Page } from '@playwright/test';
import { ENTER, LAYOUTS, stepsFor } from '../src/keyboard/layouts';

/** Plays the open level like a child reading the finger guide, until the results card; `typed` collects the characters. */
export async function playLevel(page: Page, mistakes = true, typed: string[] = []): Promise<string> {
  for (let i = 0; i < 3000; i++) {
    const state = await page.evaluate(() => {
      const res = document.querySelector<HTMLElement>('.results-card');
      if (res) return { kind: 'results', text: res.innerText };
      const nk = document.querySelector<HTMLElement>('.newkey-card');
      if (nk) return { kind: 'newkey', key: nk.dataset.sample ?? '' };
      if (document.querySelector('.posture-card')) return { kind: 'ready' };
      if (document.querySelector('.mode-intro')) return { kind: 'intro' };
      return { kind: 'play', next: document.querySelector<HTMLElement>('.kb-guide')?.dataset.next ?? '' };
    });
    if (state.kind === 'results') return state.text!;
    if (state.kind === 'ready') await page.keyboard.press('Space');
    else if (state.kind === 'intro') await page.keyboard.press('Enter');
    else if (state.kind === 'newkey') await typeChar(page, state.key!);
    else if (state.next) {
      if (mistakes && typed.length % 13 === 4) await page.keyboard.type('q');
      await typeChar(page, state.next);
      typed.push(state.next);
    }
    await page.waitForTimeout(state.kind === 'play' ? 90 : 200);
  }
  throw new Error('level did not finish');
}

/**
 * Goes through a level's story scenes (Enter), new-key cards (typing the key) and intro card
 * until its get-ready card shows (`ready`) or, after Space on it, play has started (`play`).
 * No step budget: a loaded machine only takes longer, the test's timeout bounds it.
 */
export async function untilPlay(page: Page, until: 'ready' | 'play' = 'play'): Promise<void> {
  for (;;) {
    await page.locator('.story-screen, .newkey-card, .posture-card, .mode-intro, .level-tapko:not(.waiting)').first().waitFor({ state: 'attached' });
    const state = await page.evaluate(() => {
      const nk = document.querySelector<HTMLElement>('.newkey-card');
      if (nk) return { kind: 'newkey', key: nk.dataset.sample ?? '' };
      if (document.querySelector('.posture-card')) return { kind: 'ready', key: '' };
      if (document.querySelector('.mode-intro')) return { kind: 'intro', key: '' };
      if (document.querySelector('.story-screen')) return { kind: 'story', key: '' };
      return { kind: 'play', key: '' };
    });
    if (state.kind === until) return;
    if (state.kind === 'play') throw new Error('play started without a get-ready card');
    if (state.kind === 'ready') await page.keyboard.press('Space');
    else if (state.kind === 'newkey') await typeChar(page, state.key);
    else await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  }
}

/** One character as a child types it: a capital with Shift held; a letter off the US layout as a real key event of the Slovak key. */
export async function typeChar(page: Page, ch: string): Promise<void> {
  if (ch === ENTER) return page.keyboard.press('Enter');
  const [step, ...rest] = stepsFor(LAYOUTS['sk-qwertz'], ch);
  if (step && !rest.length && !/^[ -~]$/.test(ch)) {
    await page.evaluate(({ key, code, shiftKey }) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, code, shiftKey, bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { key, code, shiftKey, bubbles: true }));
    }, { key: ch, code: step.code, shiftKey: step.shift });
    return;
  }
  const capital = ch !== ch.toLowerCase();
  if (capital) await page.keyboard.down('Shift');
  await page.keyboard.type(ch);
  if (capital) await page.keyboard.up('Shift');
}

/** The start page's way to a new player: the big button before the first player, then the dashed card. */
export const NEW_PLAYER = '.start-card .btn.primary, .profile-card.new';

export async function createProfile(page: Page, name: string, layout?: string): Promise<void> {
  await page.goto('./');
  await page.locator(NEW_PLAYER).first().click();
  await page.locator('#np-nick').fill(name);
  if (layout) await page.locator('#np-layout').selectOption(layout);
  await page.locator('form button[type=submit]').click();
  await page.locator('.map-screen').waitFor();
}

/** Skips the story scenes before a level (the very first level has the intro and the world's scene). */
export async function skipStories(page: Page): Promise<void> {
  await page.locator('.story-screen').waitFor();
  while (await page.locator('.story-screen').count()) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }
}
