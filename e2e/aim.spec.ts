import { readFileSync } from 'node:fs';
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

for (const [width, height] of [[1024, 600], [1366, 768], [1920, 1080]]) {
  test(`Tapko names the thrown thing and the target answers the hit, never over a word (${width}x${height})`, async ({ page }) => {
    const en = JSON.parse(readFileSync('public/i18n/en.json', 'utf8'));
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await createProfile(page, 'Ema');
    await editProfile(page, 'p.progress.levels = { "w1-1": 3, "w1-2": 3 }; p.progress.worldsDone = [0]; p.progress.introducedKeys = ["f", "j", " "]; p.progress.scenesSeen.push("welcome");');
    // The pebble every throw, so the lines are known.
    await page.evaluate(() => history.replaceState(null, '', `${location.pathname}?aimThing=pebble${location.hash}`));
    await page.locator('.island-meadow .aim-node').click();
    await page.locator('.posture-card').waitFor();
    await page.keyboard.press('Space');
    const said = page.locator('.level-screen p[role=status]');
    const typeNext = async () => {
      const next = await page.evaluate(() => document.querySelector<HTMLElement>('.kb-guide')?.dataset.next ?? '');
      if (next) await typeChar(page, next);
      return next;
    };
    // The launch word: Tapko's call comes the moment it is typed.
    await expect.poll(typeNext).not.toBe('');
    while (!(await said.textContent())) {
      await typeNext();
      await page.waitForTimeout(40);
    }
    expect(en.aim.things.pebble.launch).toContain(await said.textContent());
    // Every ring and the target in time and without a wrong key: a bullseye line.
    const hitLines = [...en.aim.lines.center, ...en.aim.things.pebble.hit];
    for (let i = 0; i < 300 && !hitLines.includes(await said.textContent()); i++) {
      await typeNext();
      await page.waitForTimeout(60);
    }
    expect(hitLines).toContain(await said.textContent());
    const log = await page.evaluate(() => (window as any).speechLog);
    expect(log.frames).toBeGreaterThan(20);
    expect(log.overlaps).toBe(0);
    expect(errors).toEqual([]);
  });
}
