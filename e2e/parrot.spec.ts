import { expect, type Page, test } from '@playwright/test';
import { createProfile, typeChar } from './helpers';

/** Changes the stored profile and reloads the map. */
async function editProfile(page: Page, change: string): Promise<void> {
  await page.evaluate((body) => {
    const data = JSON.parse(localStorage.getItem('tapkotyper:v1')!);
    new Function('p', body)(data.profiles[0]);
    localStorage.setItem('tapkotyper:v1', JSON.stringify(data));
  }, change);
  await page.reload();
  await page.locator('.map-screen').waitFor();
}

test('a finished world\'s parrot learns the words and brings the badge', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  await editProfile(page, 'p.progress.levels = { "w1-1": 3, "w1-2": 3 }; p.progress.worldsDone = [0]; p.progress.introducedKeys = ["f", "j", " "];');
  const node = page.locator('.island-meadow .parrot-node');
  await expect(node).not.toHaveClass(/home/);
  await expect(page.locator('.map-hero .aro-perch')).toHaveCount(0);
  await node.click();
  await expect(page.locator('.level-screen.world-meadow .hud-title')).toHaveText('Parrot');
  await page.locator('.posture-card').waitFor();
  await page.keyboard.press('Space');
  let wrong = false;
  for (let i = 0; i < 600 && !(await page.locator('.parrot-done').count()); i++) {
    const next = await page.evaluate(() => document.querySelector<HTMLElement>('.kb-guide')?.dataset.next ?? '');
    if (next) {
      // One slip brings the word twice more; the round still ends.
      await typeChar(page, !wrong && next !== 'k' ? 'k' : next);
      wrong = true;
    }
    await page.waitForTimeout(60);
  }
  await expect(page.locator('.parrot-done h2')).toHaveText('Repeating with the parrot!');
  await expect(page.locator('.parrot-done .badge-fact')).toContainText('Parrot badge');
  await expect(page.locator('.parrot-done .fact', { hasText: 'While repeating' })).toHaveCount(1);
  await expect(page.locator('.parrot-done .modal-x')).toBeVisible();
  // Escape peeks under the card, a second Escape goes to the map.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(node).toHaveClass(/home/);
  // Aro, the badge's parrot, lands on his perch left of Tapko and says hello.
  await expect(page.locator('.map-hero .aro-perch')).toHaveCount(1);
  await expect(page.locator('.aro-say')).toBeVisible({ timeout: 10000 });
  expect(errors).toEqual([]);
});

test('too many mistakes send the parrot away: the round ends with its empty perch', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  await editProfile(page, 'p.progress.worldsDone = [0]; p.progress.parrots = [0]; p.progress.parrotBest = 1; p.progress.introducedKeys = ["f", "j", " "];');
  const node = page.locator('.island-meadow .parrot-node');
  await expect(node).toHaveClass(/home/);
  await node.click();
  await page.locator('.posture-card').waitFor();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !!document.querySelector<HTMLElement>('.kb-guide')?.dataset.next);
  // The story's first world bears five mistakes; the sixth sends the parrot off.
  for (let i = 0; i < 6; i++) await typeChar(page, 'k');
  await expect(page.locator('.parrot-done .bubble')).toHaveText('Your parrot flew away. Try again, slowly and carefully.');
  await expect(page.locator('.parrot-done .parrot-done-pic')).toHaveAttribute('src', /ui-act-parrot-perch/);
  await expect(page.locator('.parrot-done .btn.primary')).toContainText('Play again');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(node).not.toHaveClass(/home/);
  await expect(node.locator('img')).toHaveAttribute('src', /obj-parrot-perch-short/);
  expect(errors).toEqual([]);
});

test('a parrot left alone too long flies away and the map says so', async ({ page }) => {
  await createProfile(page, 'Ema');
  await editProfile(page, 'p.progress.worldsDone = [0, 1]; p.progress.parrots = [0, 1]; p.progress.parrotBest = 2; p.progress.parrotWonAt = "2026-01-01"; p.progress.parrotCheckedAt = "2026-01-01"; p.progress.parrotPerched = true;');
  await expect(page.locator('.map-bubble')).toContainText('Your parrot flew away from');
  await expect(page.locator('.parrot-node.home')).toHaveCount(1);
  // Aro says goodbye and flies off; his empty perch stays while this map is shown.
  await expect(page.locator('.aro-say')).toBeVisible();
  await expect(page.locator('.aro.away')).toHaveCount(1, { timeout: 5000 });
  // Told once, and the next map has no perch.
  await page.reload();
  await page.locator('.map-screen').waitFor();
  await expect(page.locator('.map-bubble')).toBeHidden();
  await expect(page.locator('.map-hero .aro-perch')).toHaveCount(0);
  // My progress counts the parrots at home against the most at once.
  await page.locator('.map-side .btn', { hasText: 'My progress' }).click();
  await expect(page.locator('.progress-screen .sum-chip', { hasText: 'max' })).toHaveText('1 max 2');
});
