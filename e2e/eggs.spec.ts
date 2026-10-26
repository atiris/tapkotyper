import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

test('secret words: a greeting brings Tapko, "parrot" a flying parrot, a story word the badge show', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');

  await page.keyboard.type('parrot');
  await expect(page.locator('.parrot-visit')).toHaveCount(1);

  await page.locator('.map-side .btn', { hasText: 'My progress' }).click();
  await page.locator('.progress-screen').waitFor();
  await page.keyboard.type('Robot');
  const show = page.locator('.badge-show');
  await expect(show.locator('.badge')).toBeVisible();
  await expect(show.locator('.badge-show-caption')).toContainText(/badge/i);
  await expect(show.locator('.modal-x')).toHaveCount(0);
  await show.click();
  await expect(show).toHaveCount(0);

  await page.locator('.bar .btn').first().click();
  await page.locator('.map-screen').waitFor();
  await page.locator('.bar .btn').first().click();
  await page.locator('.start-screen').waitFor();
  // The space inside the greeting does not start the focused player.
  await page.keyboard.type('good morning');
  await expect(page.locator('.tapko-visit')).toContainText('I am Tapko');
  await expect(page.locator('.start-screen')).toBeVisible();
  expect(errors).toEqual([]);
});
