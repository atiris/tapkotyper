import { expect, type Page, test } from '@playwright/test';
import { createProfile, typeChar, untilPlay } from './helpers';

/** Changes the stored first profile and opens its map again, with `?fast` (a round of half a minute). */
async function editProfile(page: Page, change: string): Promise<void> {
  await page.evaluate((body) => {
    const data = JSON.parse(localStorage.getItem('tapkotyper:v1')!);
    new Function('p', body)(data.profiles[0]);
    localStorage.setItem('tapkotyper:v1', JSON.stringify(data));
  }, change);
  await page.goto(page.url().replace(/\?fast/, '').replace('#', '?fast#'));
  await page.locator('.map-screen').waitFor();
}

/** Four letters ready: their last presses all right. */
const READY = `p.progress.unlockedKeys = ['f', 'j', ' ', 'd', 'k']; p.progress.introducedKeys = ['f', 'j', ' ', 'd', 'k'];
  for (const k of ['f', 'j', 'd', 'k']) p.stats.keys[k] = { presses: 40, errors: 0, recent: Array(40).fill(400), recentWrong: [], days: [] };`;

test('Rytmus opens in the meadow with four ready letters and a round ends on its card', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  const node = page.locator('.island-meadow .rhythm-node');
  // Closed at first, after the parrot; its tooltip says when it opens.
  await expect(node).toBeDisabled();
  await expect(node).toHaveAttribute('data-tip', /at least 4 letters/);
  await expect(page.locator('.island-meadow .level-row > *').last()).toHaveClass(/rhythm-node/);
  await expect(page.locator('.island-space .rhythm-node')).toHaveCount(0);
  await editProfile(page, READY);
  await expect(node).toBeEnabled();
  await node.click();
  await expect(page.locator('.level-screen.world-meadow .hud-title')).toHaveText('Rhythm');
  await untilPlay(page, 'ready');
  await expect(page.locator('.posture-card')).toContainText('Tapko catches it');
  await page.keyboard.press('Space');
  // The top bar: accuracy, rhythm, tempo; no speed gauge here.
  await expect(page.locator('.hud .tempo-ring')).toHaveAttribute('aria-label', 'Tempo: 30 letters per minute');
  await expect(page.locator('.hud .round-btn.speed')).toHaveCount(0);
  // A child who presses the next letter's key again and again: early presses wait, each letter is caught as its window opens.
  let wrong = false;
  for (let i = 0; i < 1500 && !(await page.locator('.rhythm-done').count()); i++) {
    const next = await page.evaluate(() => document.querySelector<HTMLElement>('.kb-guide')?.dataset.next ?? '');
    if (next) {
      await typeChar(page, !wrong && i > 40 ? (next === 'k' ? 'd' : 'k') : next);
      if (i > 40) wrong = true;
    }
    await page.waitForTimeout(60);
  }
  await expect(page.locator('.rhythm-done h2')).toHaveText('Rhythm round done!');
  const rows = page.locator('.rhythm-done .ec-row');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText('Accuracy');
  await expect(rows.nth(1)).toContainText(/Rhythm\s*\d+ of 100/);
  await expect(rows.nth(2)).toContainText('30 letters');
  await expect(rows.nth(3)).toContainText(/Letters caught\s*\d+ of \d+/);
  // The basket at its fill, once its pictures are made (the card keeps its square without them).
  const pic = page.locator('.rhythm-done .ec-img');
  if (await pic.count()) await expect(pic).toHaveAttribute('src', /obj-rhythm-basket-/);
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].progress.rhythm['0']);
  expect(kept.tempo).toBeGreaterThanOrEqual(30);
  await page.locator('.end-card .ec-bot .btn').last().click();
  await expect(node).toBeEnabled();
  expect(errors).toEqual([]);
});
