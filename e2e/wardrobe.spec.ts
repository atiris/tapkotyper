import { expect, test, type Page } from '@playwright/test';
import { createProfile } from './helpers';

/** Sets the player's wardrobe balance and limit in storage and opens the wardrobe. */
async function openWardrobe(page: Page, seconds: number, limit = true): Promise<void> {
  const id = page.url().split('/p/')[1];
  await page.evaluate(({ seconds, limit }) => {
    const data = JSON.parse(localStorage.getItem('tapkotyper:v1')!);
    data.profiles[0].progress.wardrobeSeconds = seconds;
    data.profiles[0].settings.wardrobeLimit = limit;
    localStorage.setItem('tapkotyper:v1', JSON.stringify(data));
  }, { seconds, limit });
  await page.goto(`./#/p/${id}/wardrobe`);
  await page.reload();
  await page.locator('.wardrobe-screen').waitFor();
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await createProfile(page, 'Satnik');
});

test('too little wardrobe time keeps the wardrobe locked, the character still plays', async ({ page }) => {
  await openWardrobe(page, 25);
  await expect(page.locator('.round-btn.timer')).toHaveCount(0);
  await expect(page.locator('.wardrobe-locked')).toContainText('3');
  await expect(page.locator('#buddy-name')).toBeDisabled();
  await expect(page.getByRole('button', { name: /náhodné oblečenie|random outfit/i })).toBeDisabled();
  await page.locator('.wardrobe-tapko').click();
  await page.locator('.wardrobe-tapko').press('Enter');
});

test('the countdown runs out and locks the wardrobe in place', async ({ page }) => {
  await openWardrobe(page, 95);
  const timer = page.locator('.round-btn.timer');
  await expect(timer).toHaveAttribute('role', 'timer');
  await expect(timer).toHaveText('');
  await expect(page.locator('#buddy-name')).toBeEnabled();
  await page.clock.runFor(5_000);
  await expect(timer).toHaveText('9');
  await page.clock.runFor(70_000);
  await expect(timer).toHaveText('2');
  await expect(timer).toHaveClass(/ending/);
  await expect(timer).not.toHaveClass(/fast/);
  await page.clock.runFor(10_000);
  await expect(timer).toHaveClass(/fast/);
  await page.clock.runFor(10_000);
  await expect(timer).toHaveCount(0);
  await expect(page.locator('.wardrobe-locked')).toBeVisible();
  await expect(page.locator('#buddy-name')).toBeDisabled();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].progress.wardrobeSeconds);
  expect(stored).toBe(0);
});

test('with the limit off there is no countdown and no lock', async ({ page }) => {
  await openWardrobe(page, 0, false);
  await expect(page.locator('.round-btn.timer')).toHaveCount(0);
  await expect(page.locator('.wardrobe-locked')).toBeHidden();
  await expect(page.locator('#buddy-name')).toBeEnabled();
});

test('character tiles show names on one line, a locked one says how many stars are missing', async ({ page }) => {
  await openWardrobe(page, 0, false);
  const kinds = page.locator('.buddy .kind');
  await expect(kinds.first().locator('.kind-name')).not.toHaveText(/★/);
  const lines = await kinds.locator('.kind-name').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(Math.max(...lines)).toBeLessThan(30);
  const locked = page.locator('.buddy .kind.locked').first();
  await expect(locked).toHaveAttribute('data-tip', /^\d+ more ★ and .+ is yours$/);
  await expect(locked.locator('.lock')).toHaveAttribute('data-tip', /more ★/);
  await expect(page.locator('.item.locked').first()).toHaveAttribute('data-tip', /.+/);
});
