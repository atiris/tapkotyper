import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

test('the magpie takes one range thing while the child was away, and the map tells it once', async ({ page }) => {
  await createProfile(page, 'Mia');
  // Two things found, the magpie's day long past; the child has not typed since it came last.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('tapkotyper:v1')!);
    Object.assign(data.profiles[0].progress, { rangeFinds: ['ladybug', 'rocket'], magpieDue: '2026-01-01', magpieTrained: -1 });
    localStorage.setItem('tapkotyper:v1', JSON.stringify(data));
  });
  await page.goto('./');
  await page.reload();
  await page.locator('.profile-card', { hasText: 'Mia' }).click();
  await page.locator('.map-screen').waitFor();
  await expect(page.locator('.map-bubble')).toContainText(/A magpie flew by and snatched one of your rare finds from the target range\. You can win it back at the target range of \S/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].progress);
  expect(stored.rangeFinds).toHaveLength(1);
  // Back again without typing: nothing more goes, nothing is told again.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('tapkotyper:v1')!);
    data.profiles[0].progress.magpieDue = '2026-01-01';
    localStorage.setItem('tapkotyper:v1', JSON.stringify(data));
  });
  await page.goto('./');
  await page.reload();
  await page.locator('.profile-card', { hasText: 'Mia' }).click();
  await page.locator('.map-screen').waitFor();
  await expect(page.locator('.map-bubble')).toBeHidden();
  const again = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].progress);
  expect(again.rangeFinds).toHaveLength(1);
});
