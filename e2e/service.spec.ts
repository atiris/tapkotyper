import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

test('the star menu fills in the super player\'s progress', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  await expect(page.locator('.map-hello')).toContainText('Super Tapko');
  await page.locator('.top-right .round-btn.super').click();
  await page.locator('.service-menu .menu-item', { hasText: 'Fill in progress' }).click();
  const dialog = page.locator('.service-dialog');
  await dialog.locator('input[type=number]').fill('15');
  await dialog.locator('select').selectOption('1');
  const sliders = dialog.locator('input[type=range]');
  for (const [i, v] of [[0, '60'], [1, '80'], [2, '50']] as const) await sliders.nth(i).fill(v);
  await dialog.locator('.btn.primary').click();
  await expect(page.locator('.toast')).toHaveText('The progress is filled in.');
  // Meadow and Rocket are finished: every level has a star, 60 % of their 30 stars in all.
  await expect(page.locator('.level-node.done')).toHaveCount(10);
  const stars = await page.locator('.level-node.done .mini-stars i.on').count();
  expect(stars).toBe(18);
  expect(errors).toEqual([]);
});

test('the super player removes the settings password without it, and the settings say when for a month', async ({ page }) => {
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
  await expect(page.locator('.service-menu .menu-item')).toHaveCount(2);
  await page.keyboard.press('Escape');
  // The super player's settings ask nothing and offer the removal.
  await page.locator('.top-right .round-btn').first().click();
  const group = page.locator('.lock-group');
  await expect(group.locator('.lock-note')).toHaveCount(0);
  await group.locator('.btn.danger').click();
  await expect(group.locator('.lock-note')).toHaveAttribute('aria-label', /The super account removed or changed the settings password on/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!));
  expect('parentLock' in stored).toBe(false);
  expect(Date.now() - stored.lockRemovedAt).toBeLessThan(60_000);

  // Lea's settings show the note too.
  await page.goto('./');
  await page.reload();
  await page.locator('.profile-card', { hasText: 'Lea' }).click();
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await expect(page.locator('.lock-group .lock-note')).toBeVisible();

  // A month later the warning is gone.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('tapkotyper:v1')!);
    data.lockRemovedAt -= 31 * 86_400_000;
    localStorage.setItem('tapkotyper:v1', JSON.stringify(data));
  });
  await page.goto('./');
  await page.reload();
  await page.locator('.profile-card', { hasText: 'Lea' }).click();
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await page.locator('.lock-group').waitFor();
  await expect(page.locator('.lock-group .lock-note')).toHaveCount(0);
});
