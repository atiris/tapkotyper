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
  await editProfile(page, 'p.progress.levels = { "w1-1": 3, "w1-2": 3 }; p.progress.worldsDone = [0]; p.progress.introducedKeys = ["f", "j", " "]; p.progress.scenesSeen.push("welcome");');
  const node = page.locator('.island-meadow .parrot-node');
  await expect(node).not.toHaveClass(/home/);
  await expect(page.locator('.map-hello .parrot-badge')).toHaveCount(0);
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
  await expect(page.locator('.parrot-done h2')).toHaveText('The parrot learned your words!');
  await expect(page.locator('.parrot-done .badge-fact')).toContainText('Parrot badge');
  await page.locator('.parrot-done .btn', { hasText: 'Map' }).click();
  await expect(node).toHaveClass(/home/);
  await expect(page.locator('.map-hello .parrot-badge')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('a parrot left alone too long flies away and the map says so', async ({ page }) => {
  await createProfile(page, 'Ema');
  await editProfile(page, 'p.progress.worldsDone = [0, 1]; p.progress.parrots = [0, 1]; p.progress.parrotBest = 2; p.progress.parrotWonAt = "2026-01-01"; p.progress.parrotCheckedAt = "2026-01-01"; p.progress.scenesSeen.push("welcome");');
  await expect(page.locator('.map-bubble')).toContainText('Your parrot flew away from');
  await expect(page.locator('.parrot-node.home')).toHaveCount(1);
  await expect(page.locator('.map-hello .parrot-badge')).toHaveCount(0);
  // Told once.
  await page.reload();
  await page.locator('.map-screen').waitFor();
  await expect(page.locator('.map-bubble')).toBeHidden();
});
