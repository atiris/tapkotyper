import { expect, test } from '@playwright/test';
import { createProfile, playLevel, skipStories } from './helpers';

test('own words and a surprise from the parent reach the child\'s next level', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn.danger, .confirm .btn:not(.primary)').last().click();
  await page.locator('.tab[data-tab=own]').click();

  await page.locator('.own-words textarea').fill('lopta, ruka');
  await page.locator('.own-words textarea').blur();
  await expect(page.locator('.own-words .hint')).toContainText('2');
  await page.locator('.own-text select').selectOption('most');
  await expect(page.locator('.own-preview li')).toHaveCount(5);

  await page.locator('.tab[data-tab=surprises]').click();
  await page.locator('.surprise-form textarea').first().fill('Where is the treat?');
  await page.locator('.surprise-form textarea').nth(1).fill('Behind the fridge.');
  await page.locator('.surprise-form select').nth(1).selectOption('w1-1');
  await page.locator('.surprise-form .btn.primary').click();
  await expect(page.locator('.surprise-table tbody tr')).toHaveCount(1);

  await page.locator('.bar .btn').first().click();
  await page.locator('.map-side .btn.primary').click();
  await skipStories(page);
  // The first keys are introduced before the get-ready card.
  while (!(await page.locator('.posture-card').count())) {
    const sample = await page.locator('.newkey-card').getAttribute('data-sample', { timeout: 5000 }).catch(() => null);
    if (sample) await page.keyboard.type(sample.repeat(3), { delay: 60 });
    await page.waitForTimeout(400);
  }
  await expect(page.locator('.posture-card .surprise')).toContainText('Where is the treat?');
  const typed: string[] = [];
  await playLevel(page, false, typed);
  expect(typed.join('')).toMatch(/lopta|ruka/);
  await expect(page.locator('.results-card .surprise.ask')).toContainText('Where is the treat?');
  await expect(page.locator('.results-card .surprise.answer')).toHaveText('Behind the fridge.');
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].surprises[0].doneAt);
  expect(done).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(errors).toEqual([]);
});
