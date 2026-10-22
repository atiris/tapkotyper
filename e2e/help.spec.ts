import { expect, test } from '@playwright/test';
import { createProfile, typeChar, skipStories } from './helpers';

test('help opens from the map and from a paused level and goes back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');

  // Map -> help on the buttons tab -> another tab -> close.
  await page.locator('.map-top .help-btn').click();
  const help = page.locator('.help-page');
  await expect(help.locator('.tab[aria-selected="true"]')).toHaveText('Buttons');
  // Five map buttons and eleven level buttons (with the super star).
  await expect(help.locator('.help-icons li')).toHaveCount(16);
  expect(page.url()).toMatch(/\/help\/ui$/);
  await help.getByRole('tab', { name: 'How to type' }).click();
  await expect(help.locator('h2', { hasText: 'How to type' })).toBeVisible();
  expect(page.url()).toMatch(/\/help\/typing$/);
  await help.locator('.modal-x').click();
  await page.locator('.map-screen').waitFor();
  // Map -> help -> Escape.
  await page.locator('.map-top .help-btn').click();
  await help.waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.map-screen').waitFor();

  // Level -> pause -> help -> back to the paused level.
  await page.locator('.map-side .btn.primary').click();
  await skipStories(page);
  for (let i = 0; i < 100; i++) {
    const state = await page.evaluate(() => {
      const nk = document.querySelector<HTMLElement>('.newkey-card');
      if (nk) return { kind: 'newkey', key: nk.dataset.sample ?? '' };
      if (document.querySelector('.posture-card')) return { kind: 'ready', key: '' };
      if (document.querySelector('.mode-intro')) return { kind: 'intro', key: '' };
      // Play has started once the character stops waiting.
      return { kind: document.querySelector('.level-tapko.waiting') ? 'wait' : 'play', key: '' };
    });
    if (state.kind === 'play') break;
    if (state.kind === 'ready') await page.keyboard.press('Space');
    else if (state.kind === 'intro') await page.keyboard.press('Enter');
    else if (state.kind === 'newkey') await typeChar(page, state.key);
    await page.waitForTimeout(200);
  }
  await page.keyboard.press('Escape');
  const pause = page.locator('.pause-card');
  await pause.getByRole('button', { name: 'Help' }).click();
  await expect(page.locator('.help-overlay .help-page')).toBeVisible();
  await expect(page.locator('.help-overlay .tab[aria-selected="true"]')).toHaveText('How to type');
  await page.keyboard.press('Escape');
  await expect(page.locator('.help-overlay')).toHaveCount(0);
  await expect(pause).toBeVisible();
  await pause.getByRole('button', { name: 'Help' }).click();
  await page.locator('.help-overlay').locator('.modal-x').click();
  await expect(pause).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pause).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('help opens from the start page on the about tab, without a player', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // The visit counter stays out of the test.
  await page.route('**/goatcounter.com/**', (r) => r.abort());
  await page.goto('./');
  await page.locator('.start-screen .help-btn').click();
  const help = page.locator('.help-page');
  await expect(help.locator('.tab[aria-selected="true"]')).toHaveText('About TapkoTyper');
  await expect(help.getByRole('link', { name: 'Code on GitHub' })).toBeVisible();
  expect(page.url()).toMatch(/#\/help\/about$/);
  // Every tab renders, the settings tab with one section per settings tab.
  for (const tab of ['Buttons', 'How to type', 'How to progress', 'Settings']) {
    await help.getByRole('tab', { name: tab }).click();
    await expect(help.locator('.tab-panel h2').first()).toBeVisible();
  }
  await expect(help.locator('.help-section')).toHaveCount(7);
  expect(page.url()).toMatch(/#\/help\/settings$/);
  await help.locator('.modal-x').click();
  await page.locator('.start-screen').waitFor();
  // A tab in the address opens that tab.
  await page.goto('./#/help/progress');
  await expect(help.locator('.tab[aria-selected="true"]')).toHaveText('How to progress');
  await page.keyboard.press('Escape');
  await page.locator('.start-screen').waitFor();
  expect(errors).toEqual([]);
});
