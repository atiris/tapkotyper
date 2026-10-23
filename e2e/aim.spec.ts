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

test('a level waiting for letters names the ones that need accuracy', async ({ page }) => {
  await createProfile(page, 'Ema');
  await editProfile(page, 'p.progress.levels = { "w1-1": 3, "w1-2": 3 }; p.progress.scenesSeen.push("welcome");');
  // No world is done yet: no target range, the bubble offers own practice.
  await expect(page.locator('.aim-node')).toHaveCount(0);
  const locked = page.locator('.level-node.keys').first();
  await expect(locked.locator('.level-key')).toHaveAttribute('data-tip', /type these more accurately: f, j/);
  await locked.click();
  await expect(page.locator('.map-bubble .held-keys')).toContainText('type these more accurately: f, j');
  await expect(page.locator('.map-bubble .bubble-actions .btn')).toHaveText('Own practice');
});

test('a finished world opens its target range from the map', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  await editProfile(page, 'p.progress.levels = { "w1-1": 3, "w1-2": 3 }; p.progress.worldsDone = [0]; p.progress.introducedKeys = ["f", "j", " "]; p.progress.scenesSeen.push("welcome");');
  // The bubble of a waiting level now offers the range.
  await page.locator('.level-node.keys').first().click();
  await expect(page.locator('.map-bubble .bubble-actions .btn')).toHaveText('Target range');
  await page.locator('.island-meadow .aim-node').click();
  await expect(page.locator('.level-screen.world-meadow .hud-title')).toHaveText('Target range');
  // The get-ready card, then the first ring's word.
  await page.locator('.posture-card').waitFor();
  await page.keyboard.press('Space');
  let typed = 0;
  for (let i = 0; i < 200 && typed < 12; i++) {
    const next = await page.evaluate(() => document.querySelector<HTMLElement>('.kb-guide')?.dataset.next ?? '');
    if (next) {
      await typeChar(page, next);
      typed++;
    }
    await page.waitForTimeout(90);
  }
  expect(typed).toBe(12);
  expect(errors).toEqual([]);
});
