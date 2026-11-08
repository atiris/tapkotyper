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
  await expect(page.locator('.teacher-tip')).toContainText('The app you have open right now is called Tapko. On the left is your character');
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

test('asked for in the settings, Ms Turtle offers the check after the next level; any answer ends the wish', async ({ page }) => {
  await createProfile(page, 'Ema');
  await page.locator('.placement-ask .btn.primary').click();
  await page.locator('.top-right .settings-btn').click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await page.locator('.tab[data-tab=keys]').click();
  // The check starts only from My progress; the keys tab only asks the turtle to offer it.
  await expect(page.getByRole('button', { name: 'Check what the student knows' })).toHaveCount(0);
  await page.getByRole('checkbox', { name: /^Offer the keyboard check after the next finished level/ }).check();
  await page.locator('.parent-screen .bar .btn').first().click();
  await page.locator('.map-screen').waitFor();
  await expect(page.locator('.placement-ask')).toHaveCount(0);
  await page.locator('.map-side .btn.primary').click();
  await playLevel(page, false);
  await page.locator('.end-card .ec-bot .btn').last().click();
  const ask = page.locator('.placement-ask');
  await expect(ask).toContainText('Hi Ema, I can see you are trying very hard.');
  await expect(ask.locator('.row .btn')).toHaveText(['Check me', 'Go on']);
  await ask.locator('.row .btn').nth(1).click();
  await expect(ask).toHaveCount(0);
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].settings);
  expect(settings.offerPlacement).toBe(false);
});
