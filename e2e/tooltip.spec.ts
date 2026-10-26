import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

test('one tooltip: after a hover delay, at once for the next one, on Tab focus, gone on Esc', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  const tip = page.locator('#app-tip');
  const corner = page.locator('.map-screen .top-right .corner-row .round-btn');

  await page.mouse.move(5, 400);
  await corner.nth(1).hover();
  await page.waitForTimeout(200);
  await expect(tip).not.toHaveClass(/show/);
  await expect(tip).toHaveClass(/show/);
  await expect(tip).toHaveText(/^Sound/);
  // Right after, the neighbour shows at once.
  await corner.nth(0).hover();
  await page.waitForTimeout(150);
  await expect(tip).toHaveClass(/show/);
  await expect(tip).toHaveText('Settings for parents');
  // The tooltip stays inside the window, above or under its button.
  const box = (await tip.boundingBox())!, btn = (await corner.nth(0).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1366);
  expect(box.y >= btn.y + btn.height || box.y + box.height <= btn.y).toBe(true);
  await page.keyboard.press('Escape');
  await expect(tip).not.toHaveClass(/show/);

  // Keyboard focus shows it too.
  await page.mouse.move(5, 400);
  await page.waitForTimeout(1000);
  await corner.nth(0).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(tip).toHaveClass(/show/);
  await expect(corner.nth(0)).toHaveAttribute('aria-describedby', 'app-tip');
  await page.keyboard.press('Escape');
  await expect(tip).not.toHaveClass(/show/);
  expect(errors).toEqual([]);
});

test('no element keeps a native title', async ({ page }) => {
  await createProfile(page, 'Ema');
  const noTitles = () => page.evaluate(() => [...document.querySelectorAll('[title], svg title')].map((e) => e.outerHTML.slice(0, 80)));
  expect(await noTitles()).toEqual([]);
  await page.locator('.map-side .btn', { hasText: 'Me and my wardrobe' }).click();
  await page.locator('.wardrobe-screen').waitFor();
  expect(await noTitles()).toEqual([]);
  await page.locator('.bar .btn').first().click();
  await page.locator('.map-side .btn', { hasText: 'My progress' }).click();
  await page.locator('.modal').waitFor();
  expect(await noTitles()).toEqual([]);
  await page.keyboard.press('Escape');
  await page.locator('.map-screen .top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await page.locator('.parent-screen').waitFor();
  for (const tab of ['settings', 'dashboard']) {
    await page.locator(`.tab[data-tab=${tab}]`).click();
    expect(await noTitles()).toEqual([]);
  }
});
