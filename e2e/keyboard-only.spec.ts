import { type Page, expect, test } from '@playwright/test';
import { createProfile, playLevel, typeChar } from './helpers';

/** Presses Tab until the focused element has `text`; fails after a few tries. */
async function tabTo(page: Page, text: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    if ((await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText ?? '')).trim() === text) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`no focus on "${text}"`);
}

/** Goes on until the get-ready card of a level shows: story scenes by Enter, a new key's card by typing it. */
async function untilReady(page: Page): Promise<void> {
  for (let i = 0; i < 60 && !(await page.locator('.posture-card').count()); i++) {
    const sample = await page.locator('.newkey-card').getAttribute('data-sample', { timeout: 100 }).catch(() => null);
    if (sample) await typeChar(page, sample);
    else if (await page.locator('.story-screen').count()) await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  }
  await page.locator('.posture-card').waitFor();
}

test('the whole game by keyboard only: a new player, a level, the results, ending a level, F-keys, help', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  // No players yet: the new player waits for Enter; the nickname field is ready to type into.
  await expect(page.locator('.profile-card.new')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#np-nick')).toBeFocused();
  await page.keyboard.type('Kiko');
  await page.keyboard.press('Enter');
  await page.locator('.map-screen').waitFor();

  // The welcome's start is focused; the intro stories go on by Enter.
  await expect(page.locator('.welcome-card .btn.primary')).toBeFocused();
  await page.keyboard.press('Enter');
  await untilReady(page);
  await playLevel(page);
  await expect(page.locator('.results-card .row.center button').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.level-node.done')).toHaveCount(1);

  // Back on the map Continue is focused: the second level starts by Enter, its card too.
  await expect(page.locator('.map-side .btn.primary')).toBeFocused();
  await page.keyboard.press('Enter');
  await untilReady(page);
  await page.keyboard.press('Enter');
  await expect(page.locator('.posture-card')).toHaveCount(0);
  if (await page.locator('.mode-intro').count()) await page.keyboard.press('Enter');
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
  await expect(pause.getByRole('button', { name: 'Continue' })).toBeFocused();

  // Ending after a key asks first, with Continue focused; End leaves to the map.
  await tabTo(page, 'End level');
  await page.keyboard.press('Enter');
  const ask = page.locator('.confirm-modal');
  await expect(ask).toContainText('This level will not count.');
  await expect(ask.getByRole('button', { name: 'Continue' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(ask).toHaveCount(0);
  await expect(pause).toBeVisible();
  await tabTo(page, 'End level');
  await page.keyboard.press('Enter');
  await tabTo(page, 'End');
  await page.keyboard.press('Enter');
  await page.locator('.map-screen').waitFor();
  expect(errors).toEqual([]);
  await context.close();
});

test('a player is picked by a number key or by typing the nickname', async ({ page }) => {
  await createProfile(page, 'Ema');
  await createProfile(page, 'Šimon');
  await page.goto('./');
  await expect(page.locator('.profile-card').first()).toBeFocused();
  await expect(page.locator('.profile-card').nth(1)).toHaveAttribute('aria-label', '2: Šimon');
  await expect(page.locator('.profile-card .profile-num').nth(1)).toHaveText('2');
  await page.keyboard.press('Digit2');
  await expect(page.locator('.map-hello')).toContainText('Šimon');
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  // Without the accent and in small letters; the letters show under the question.
  await page.keyboard.type('e');
  await expect(page.locator('.typed-pick')).toHaveText('e');
  await page.keyboard.type('m');
  await expect(page.locator('.map-hello')).toContainText('Ema');
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('si');
  await expect(page.locator('.map-hello')).toContainText('Šimon');
});

test('F4 steps the sound and says so, the tooltips name the keys', async ({ page }) => {
  await createProfile(page, 'Lea');
  const sound = page.locator('.map-top .sound-btn');
  await expect(sound).toHaveAttribute('data-level', 'normal');
  await expect(sound).toHaveAttribute('data-tip', 'Sound: normal (F4)');
  await expect(page.locator('.map-top .help-btn')).toHaveAttribute('data-tip', 'Help (F1)');
  await page.keyboard.press('F4');
  await expect(sound).toHaveAttribute('data-level', 'quiet');
  await expect(page.locator('.toast')).toHaveText('Sound: quiet');
  // F1 on the map opens help on its buttons; Escape goes back.
  await page.keyboard.press('F1');
  await expect(page.locator('.help-page .tab[aria-selected="true"]')).toHaveText('Buttons');
  await page.keyboard.press('Escape');
  await page.locator('.map-screen').waitFor();
});
