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

test('Rytmus is open with the meadow and a round ends on its card', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  const node = page.locator('.island-meadow .rhythm-node');
  // Open with the meadow, after the parrot; a closed world's says it opens with that world. Every world has one.
  await expect(node).toBeEnabled();
  await expect(page.locator('.island-space .rhythm-node')).toHaveAttribute('data-tip', /Opens with this world/);
  await expect(page.locator('.island-meadow .level-row > *').last()).toHaveClass(/rhythm-node/);
  await expect(page.locator('.rhythm-node')).toHaveCount(15);
  await editProfile(page, `${READY} p.progress.worldsDone = [0];`);
  await node.click();
  await expect(page.locator('.level-screen.world-meadow .hud-title')).toHaveText('Rhythm');
  await untilPlay(page, 'ready');
  await expect(page.locator('.posture-card')).toContainText('one rhythm note');
  await page.keyboard.press('Space');
  // The sound is off: a card asks to turn it on, "everywhere" is the default and Enter takes it.
  const ask = page.locator('.rhythm-sound');
  await expect(ask).toContainText('the rhythm comes with music');
  await expect(ask.locator('.modal-x')).toBeVisible();
  await expect(ask.locator('.btn.kbd-default')).toHaveText(/Turn on everywhere/);
  await page.keyboard.press('Enter');
  await expect(ask).toHaveCount(0);
  await expect(page.locator('.hud .sound-btn')).toHaveAttribute('data-level', 'normal');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].settings.sound)).toBe('normal');
  // The top bar: all three rings whatever the settings, the speed ring with the tempo.
  await expect(page.locator('.hud .round-btn.accuracy')).toHaveAttribute('aria-label', 'Accuracy: 100 %');
  await expect(page.locator('.hud .round-btn.rhythm')).toHaveAttribute('aria-label', /^Rhythm: listening/);
  await expect(page.locator('.hud .round-btn.speed')).toHaveAttribute('aria-label', 'Speed: 30 letters per minute');
  // A child who presses the next letter's key again and again: presses before the band are errors, one in the band catches.
  let wrong = false;
  for (let i = 0; i < 1500 && !(await page.locator('.rhythm-done').count()); i++) {
    const next = await page.evaluate(() => document.querySelector<HTMLElement>('.kb-guide')?.dataset.next ?? '');
    if (next) {
      await typeChar(page, !wrong && i > 40 ? (next === 'k' ? 'd' : 'k') : next);
      if (i > 40) wrong = true;
    }
    await page.waitForTimeout(60);
  }
  await expect(page.locator('.rhythm-done h2')).toHaveText('Typing in rhythm!');
  const rows = page.locator('.rhythm-done .ec-row');
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(0)).toContainText('Accuracy');
  // A short ?fast round may be too short for a score.
  await expect(rows.nth(1)).toContainText(/Rhythm\s*(\d+ of 100|–)/);
  await expect(rows.nth(2)).toContainText('30 letters');
  await expect(rows.nth(3)).toContainText(/Letters caught\s*\d+ of \d+/);
  // What the round did to the tempo: the next round faster, the same or slower, with its tempo.
  await expect(rows.nth(4)).toContainText(/Next round\s*(faster|same tempo|slower): \d+ letters/);
  // The basket full of letters (the card keeps its square without its picture).
  const pic = page.locator('.rhythm-done .ec-img');
  if (await pic.count()) await expect(pic).toHaveAttribute('src', /obj-rhythm-basket-full/);
  // The child's one tempo, where every world's next round starts.
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].progress.rhythmTempo);
  expect(kept).toBeGreaterThanOrEqual(30);
  await page.locator('.end-card .ec-bot .btn').last().click();
  await expect(node).toBeEnabled();
  expect(errors).toEqual([]);
});

test('with the sound only where it matters Rytmus starts without asking', async ({ page }) => {
  await createProfile(page, 'Ema');
  await editProfile(page, `${READY} p.progress.worldsDone = [0]; p.settings.sound = 'important';`);
  const node = page.locator('.island-meadow .rhythm-node');
  await node.click();
  await untilPlay(page, 'ready');
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  await expect(page.locator('.rhythm-sound')).toHaveCount(0);
  await expect(page.locator('.hud .sound-btn')).toHaveAttribute('data-level', 'important');
});

test('Escape on the sound card keeps the sound off and the round goes on', async ({ page }) => {
  await createProfile(page, 'Ema');
  await editProfile(page, `${READY} p.progress.worldsDone = [0];`);
  await page.locator('.island-meadow .rhythm-node').click();
  await untilPlay(page, 'ready');
  await page.keyboard.press('Space');
  await expect(page.locator('.rhythm-sound')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.rhythm-sound')).toHaveCount(0);
  await page.waitForFunction(() => !!document.querySelector<HTMLElement>('.kb-guide')?.dataset.next);
  await expect(page.locator('.hud .sound-btn')).toHaveAttribute('data-level', 'off');
});
