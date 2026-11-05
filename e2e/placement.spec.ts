import { type Page, expect, test } from '@playwright/test';
import { createProfile, playLevel } from './helpers';

/** The stored progress of the only player. */
const progress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].progress);

test('Ms Turtle asks once whether to check the keys; No changes nothing', async ({ page }) => {
  await createProfile(page, 'Ema');
  const ask = page.locator('.placement-ask');
  await expect(ask).toContainText('Do you already know the keyboard');
  await expect(ask.locator('.btn.primary')).toBeFocused();
  await ask.locator('.btn').nth(1).click();
  await expect(ask).toContainText('all fingers without looking');
  await ask.locator('.btn.primary').click();
  await expect(ask).toContainText('from the start');
  await ask.locator('.btn.primary').click();
  await expect(ask).toHaveCount(0);
  expect((await progress(page)).unlockedKeys).toEqual(['f', 'j', ' ']);
  // Asked once: the next map shows the turtle's first tip instead.
  await page.reload();
  await page.locator('.map-screen').waitFor();
  await expect(page.locator('.placement-ask')).toHaveCount(0);
  await expect(page.locator('.teacher-tip')).toBeVisible();
});

test('the check runs without the keyboard and ends on its card; it opens no stars', async ({ page }) => {
  await createProfile(page, 'Ben');
  // `?fast` cuts the check's four minutes to a sixth.
  await page.goto(page.url().replace('/#', '/?fast#'));
  const ask = page.locator('.placement-ask');
  await ask.locator('.btn').nth(1).click();
  await ask.locator('.btn').nth(1).click();
  await expect(page.locator('.hud-title')).toHaveText('Keyboard check');
  await expect(page.locator('.kb-guide')).toBeHidden();
  await playLevel(page, false);
  const card = page.locator('.placement-done');
  await expect(card.locator('h2')).toHaveText('Keyboard check');
  await expect(card.locator('.ec-row').first()).toContainText('Strong keys');
  await card.locator('.ec-bot .btn').last().click();
  await page.locator('.map-screen').waitFor();
  const p = await progress(page);
  expect(p.levels).toEqual({});
  expect(p.worldsDone).toEqual([]);
  expect(p.unlockedKeys.slice(0, 3)).toEqual(['f', 'j', ' ']);
});
