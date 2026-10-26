import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

test('secret words: the logo hint brings Tapko, the range hint a flying thing, the parrot hint a parrot, a story word the badge show', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');

  await page.keyboard.type('target');
  await expect(page.locator('.range-visit')).toHaveCount(1);
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
  // The first word of the logo's hint ("Hi, I'm Tapko.").
  await expect(page.locator('.card-logo')).toHaveAttribute('data-tip', "Hi, I'm Tapko.");
  await page.keyboard.type('hi');
  await expect(page.locator('.tapko-visit')).toContainText('I am Tapko');
  await expect(page.locator('.start-screen')).toBeVisible();
  expect(errors).toEqual([]);
});
