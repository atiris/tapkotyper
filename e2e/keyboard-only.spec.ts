import { type Page, expect, test } from '@playwright/test';
import { createProfile, playLevel, typeChar, untilPlay, NEW_PLAYER } from './helpers';

/** Presses Tab until the focused element has `text`; fails after a few tries. */
async function tabTo(page: Page, text: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    if ((await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText ?? '')).trim() === text) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`no focus on "${text}"`);
}

test('the whole game by keyboard only: a new player, a level, the results, ending a level, F-keys, help', async ({ browser }) => {
  // A whole level and a second one by keyboard: longer than one test's usual budget on a loaded machine.
  test.setTimeout(300_000);
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  // No players yet: the new player waits for Enter; the nickname field is ready to type into.
  await expect(page.locator(NEW_PLAYER).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#np-nick')).toBeFocused();
  await page.keyboard.type('Kiko');
  await page.keyboard.press('Enter');
  await page.locator('.map-screen').waitFor();

  // Ms Turtle asks whether to check the keys: Enter starts from the beginning and Continue takes the focus.
  await expect(page.locator('.placement-ask .btn.primary')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.placement-ask')).toHaveCount(0);
  // Continue is focused; the card before the first key closes with the space bar.
  await expect(page.locator('.map-side .btn.primary')).toBeFocused();
  await page.keyboard.press('Enter');
  await untilPlay(page, 'ready');
  await playLevel(page);
  await expect(page.locator('.end-card .ec-bot button').first()).toBeFocused();
  await page.locator('.end-card .ec-bot .btn').last().press('Enter');
  await expect(page.locator('.level-node.done')).toHaveCount(1);

  // Back on the map Continue is focused: the second level starts by Enter, its card too.
  await expect(page.locator('.map-side .btn.primary')).toBeFocused();
  await page.keyboard.press('Enter');
  await untilPlay(page, 'ready');
  await page.keyboard.press('Enter');
  await expect(page.locator('.posture-card')).toHaveCount(0);
  await expect.poll(() => page.locator('.kb-guide').getAttribute('data-next'), { timeout: 15_000 }).not.toBe('');
  await typeChar(page, (await page.locator('.kb-guide').getAttribute('data-next'))!);

  // F2 hides the keyboard guide and shows it again.
  await page.keyboard.press('F2');
  await expect(page.locator('.kb-guide')).toHaveClass(/hidden/);
  await page.keyboard.press('F2');
  await expect(page.locator('.kb-guide')).not.toHaveClass(/hidden/);

  // F1 pauses and opens help on a whole page; Back returns to the paused level, on Continue.
  await page.keyboard.press('F1');
  const back = page.locator('.level-help .bar').getByRole('button', { name: 'Back' });
  await expect(back).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.level-help')).toHaveCount(0);
  const pause = page.locator('.pause-card');
  await expect(pause.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();

  // Ending after a key asks first, with Continue focused; Stop typing leaves to the map.
  await tabTo(page, 'Stop typing');
  await page.keyboard.press('Enter');
  const ask = page.locator('.confirm-modal');
  await expect(ask).toContainText('This level will not count.');
  await expect(ask.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(ask).toHaveCount(0);
  await expect(pause).toBeVisible();
  await tabTo(page, 'Stop typing');
  await page.keyboard.press('Enter');
  await tabTo(page, 'Stop typing');
  await page.keyboard.press('Enter');
  await page.locator('.map-screen').waitFor();
  expect(errors).toEqual([]);
  await context.close();
});

test('a player is picked by a number key, the super password still works', async ({ page }) => {
  await createProfile(page, 'Ema');
  await createProfile(page, 'Šimon');
  await page.goto('./');
  await expect(page.locator('.profile-card').first()).toBeFocused();
  await expect(page.locator('.profile-card').nth(1)).toHaveAttribute('aria-label', '2: Šimon');
  await expect(page.locator('.profile-card').nth(1)).toHaveAttribute('data-tip', 'You can also pick this profile by typing the number 2');
  await expect(page.locator('.profile-card .profile-num').nth(1)).toHaveText('2');
  await page.keyboard.press('Digit2');
  await expect(page.locator('.map-hello')).toContainText('Šimon');
  // Letters never pick a player, so the super password reaches super mode.
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  await expect(page.locator('.map-hello')).toContainText('Super Tapko');
});

test('F4 steps the sound and says so, the tooltips name the keys', async ({ page }) => {
  await createProfile(page, 'Lea');
  const sound = page.locator('.map-screen .top-right .sound-btn');
  // The game starts silent.
  await expect(sound).toHaveAttribute('data-level', 'off');
  await expect(page.locator('.map-screen .top-right .help-btn')).toHaveAttribute('data-tip', 'Help (F1)');
  await page.keyboard.press('F4');
  await expect(sound).toHaveAttribute('data-level', 'normal');
  await expect(page.locator('.toast')).toHaveText('Sounds');
  await expect(sound).toHaveAttribute('data-tip', /^Sounds \(F4\)\nMusic: \S.*\nF8 plays another song$/);
  // F4 steps through all four levels; "only where it matters" says where sound plays and is silent on the map.
  await page.keyboard.press('F4');
  await page.keyboard.press('F4');
  await expect(sound).toHaveAttribute('data-level', 'important');
  await expect(sound).toHaveAttribute('data-tip', /^Only where it matters \(F4\)\nSound plays only in Rhythm and in dictation\.\nF8 plays another song$/);
  // A click opens the list of the levels, the current one chosen; Escape closes it.
  await sound.click();
  const items = page.locator('.sound-list [role=option]');
  await expect(items).toHaveText(['Sounds', 'Quiet sounds', 'Only where it matters', 'No sounds']);
  await expect(page.locator('.sound-list [aria-selected=true]')).toHaveAttribute('data-level', 'important');
  await page.keyboard.press('Escape');
  await expect(page.locator('.sound-list')).toHaveCount(0);
  await sound.click();
  await page.locator('.sound-list [data-level=normal]').click();
  await expect(sound).toHaveAttribute('data-level', 'normal');
  // F1 on the map opens help on its buttons; Escape goes back.
  await page.keyboard.press('F1');
  await expect(page.locator('.help-page .tab[aria-selected="true"]')).toHaveText('Interface');
  await page.keyboard.press('Escape');
  await page.locator('.map-screen').waitFor();
});

test('panel buttons answer their underlined letters, the leftmost is the default', async ({ page }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ida');
  await page.keyboard.press('Enter');
  await expect(page.locator('.placement-ask')).toHaveCount(0);
  await page.locator('.map-side .btn.primary').click();
  await untilPlay(page);
  await expect.poll(() => page.locator('.kb-guide').getAttribute('data-next'), { timeout: 15_000 }).not.toBe('');
  await typeChar(page, (await page.locator('.kb-guide').getAttribute('data-next'))!);

  // The pause card: every button has its letter underlined, Continue (leftmost) is focused.
  await page.locator('.hud').getByRole('button', { name: 'Pause' }).click();
  const pause = page.locator('.pause-card');
  const keep = pause.getByRole('button', { name: 'Continue', exact: true });
  await expect(keep).toBeFocused();
  await expect(keep).toHaveClass(/kbd-default/);
  await expect(keep.locator('u.hk')).toHaveText('C');
  await expect(pause.locator('.row .btn')).toHaveCount(4);
  await expect(pause.locator('.row .btn u.hk')).toHaveCount(4);
  await expect(pause.getByRole('button', { name: 'Stop typing' })).toHaveAttribute('aria-keyshortcuts', 't');

  // Its letter asks first; the question takes the keys: the pause card's own letter does nothing under it.
  await page.keyboard.press('t');
  const ask = page.locator('.confirm-modal');
  await expect(ask).toContainText('This level will not count.');
  await expect(ask.getByRole('button', { name: 'Continue', exact: true })).toBeFocused();
  await page.keyboard.press('q');
  await expect(ask).toBeVisible();
  await page.keyboard.press('c');
  await expect(ask).toHaveCount(0);
  await expect(pause.locator('h2')).toHaveText('Little pause');
  await page.keyboard.press('c');
  await expect(pause).toHaveCount(0);

  // The end card: the main button is the default; Esc peeks, letters act only while the card shows.
  await playLevel(page, false);
  const card = page.locator('.end-card');
  await expect(card.locator('.ec-bot .btn').first()).toBeFocused();
  await expect(card.locator('.ec-bot .btn').first()).toHaveClass(/kbd-default/);
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await page.keyboard.press('ArrowDown');
  await expect(card).toBeVisible();
  const home = card.locator('.ec-bot .btn.home');
  await page.keyboard.press((await home.getAttribute('aria-keyshortcuts'))!);
  await expect(page.locator('.level-node.done')).toHaveCount(1);

  // A dialog with a field: the field has the focus and keeps the letters.
  await page.locator('.top-right .settings-btn').click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await page.getByRole('button', { name: /^(Preložiť hru|Translate the game)$/ }).click();
  await page.getByRole('button', { name: /^New language$/ }).click();
  const name = page.locator('.tr-dialog input').first();
  await expect(name).toBeFocused();
  await page.keyboard.type('Ciao');
  await expect(name).toHaveValue('Ciao');
  await expect(page.locator('.tr-dialog')).toBeVisible();
  expect(errors).toEqual([]);
});
