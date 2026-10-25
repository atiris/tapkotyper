import { expect, test, type Page } from '@playwright/test';
import { createProfile } from './helpers';

/** What a simulated run must not touch: the stored player's key statistics, sessions and totals. */
const statsOf = (page: Page, name: string) => page.evaluate((nick) => {
  const p = JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles.find((x: any) => x.companion.name === nick);
  return JSON.stringify([p.stats, p.progress.trainedSeconds, p.progress.levelsFinished, p.progress.starsEarned, p.progress.growthSeconds]);
}, name);

test('the star menu opens a level for a stored player and passes it by simulation, with the marks for good', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  await expect(page.locator('.map-hello')).toContainText('Super Tapko');
  // Super mode stays on for a stored player picked on the start page.
  await page.locator('.map-top .btn.ghost').first().click();
  await expect(page.locator('.start-screen .round-btn.super')).toBeVisible();
  await page.locator('.profile-card', { hasText: 'Ema' }).click();
  await expect(page.locator('.map-hello')).toContainText('Ema');
  const before = await statsOf(page, 'Ema');

  await page.locator('.top-right .round-btn.super').click();
  await page.locator('.service-menu .menu-item', { hasText: 'Open a level' }).click();
  await page.locator('.service-dialog button', { hasText: 'Meadow · level 3' }).click();
  const meadow = page.locator('.island-meadow .level-node');
  await expect(meadow.nth(2)).toHaveClass(/current/);
  await expect(meadow.nth(0).locator('.service-mark')).toBeVisible();
  await expect(meadow.nth(1).locator('.service-mark')).toBeVisible();
  await expect(page.locator('.map-hello .service-mark')).toBeVisible();

  // Continue starts the opened level (its node pulses, so it is never still for a click).
  await expect(page.locator('.map-side .btn.primary.big')).toHaveAttribute('data-tip', 'Meadow · level 3');
  await page.locator('.map-side .btn.primary.big').click();
  await page.locator('.posture-card').waitFor();
  await page.keyboard.press('Space');
  await expect.poll(() => page.locator('.kb-guide').getAttribute('data-next')).not.toBe('');
  await page.locator('.hud .round-btn.super').click();
  await page.locator('.service-menu .menu-item', { hasText: 'Pass with 1 mistake' }).click();
  await expect(page.locator('.hud .sim-tag')).toHaveText('Simulation');
  const results = page.locator('.results-card');
  await expect(results).toBeVisible({ timeout: 90_000 });
  await expect(results.locator('.sim-tag')).toHaveText('Simulation');
  await expect(results.locator('.fact.main')).not.toHaveText(/100 %/);

  await page.keyboard.press('Escape');
  await expect(meadow.nth(2).locator('.service-mark')).toBeVisible();
  expect(await statsOf(page, 'Ema')).toBe(before);

  // A reload ends super mode; the marks stay.
  await page.goto('./');
  await page.reload();
  await expect(page.locator('.profile-card', { hasText: 'Ema' }).locator('.service-mark')).toBeVisible();
  await expect(page.locator('.round-btn.super')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the star menu removes the settings password and ends super mode', async ({ page }) => {
  await createProfile(page, 'Lea');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('tapkotyper:v1')!);
    data.parentLock = { salt: '00', hash: '00' };
    localStorage.setItem('tapkotyper:v1', JSON.stringify(data));
  });
  await page.goto('./');
  await page.reload();
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  await page.locator('.top-right .round-btn.super').click();
  await expect(page.locator('.service-menu .menu-item', { hasText: 'Open a level' })).toHaveCount(0);
  await page.locator('.service-menu .menu-item', { hasText: 'Remove the settings password' }).click();
  await expect(page.locator('.toast')).toHaveText('The settings password is removed.');
  expect(await page.evaluate(() => 'parentLock' in JSON.parse(localStorage.getItem('tapkotyper:v1')!))).toBe(false);
  await page.locator('.top-right .round-btn.super').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.service-menu')).toHaveCount(0);
  await page.locator('.top-right .round-btn.super').click();
  await page.locator('.service-menu .menu-item', { hasText: 'End super mode' }).click();
  await expect(page.locator('.start-screen')).toBeVisible();
  await expect(page.locator('.round-btn.super')).toHaveCount(0);
});
