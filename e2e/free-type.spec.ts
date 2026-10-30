import { expect, type Page, test } from '@playwright/test';
import { createProfile } from './helpers';

/** A browser voice for English that only writes down what it was asked to say. */
async function fakeVoice(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const said: string[] = [];
    (window as any).said = said;
    (window as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
    Object.defineProperty(window, 'speechSynthesis', { value: {
      getVoices: () => [{ lang: 'en-US', localService: true, name: 'Test' }],
      addEventListener: () => undefined,
      speak: (u: { text: string }) => said.push(u.text),
      cancel: () => undefined,
    } });
  });
}

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

const shown = (page: Page) => page.locator('.level-screen .sr-only[role=status]');

/** Keys count once play has started (the world's pictures are loaded). */
const started = (page: Page) => page.locator('.level-tapko:not(.waiting)').waitFor({ state: 'attached' });

test('just typing shows what was typed after a pause and counts nothing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  // One open world: it starts there at once, no game cards.
  await page.locator('.map-side .btn', { hasText: 'Just typing' }).click();
  await expect(page.locator('.level-screen.world-meadow .hud-title')).toHaveText('Just typing');
  await expect(page.locator('.posture-card')).toHaveCount(0);
  await expect(page.locator('.hud .progress')).toHaveCount(0);
  await started(page);
  await expect(page.locator('.level-screen .bubble')).toHaveText('Type whatever you like here. This typing does not count in the statistics.');
  await page.keyboard.type('mama');
  await expect(shown(page)).toHaveText('mama', { timeout: 4000 });
  // Backspace edits, Enter shows at once.
  await page.keyboard.type('pesx');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  await expect(shown(page)).toHaveText('pes', { timeout: 500 });
  // Leaving after typing shows its end card: the words, the time and the last text.
  await page.keyboard.press('Escape');
  const card = page.locator('.end-card.free-done');
  await expect(card.locator('h2')).toHaveText('Free typing finished!');
  await expect(card.locator('.ec-under')).toHaveText('2 words');
  await expect(card.locator('.ec-row', { hasText: 'Last sentence' })).toContainText('pes');
  await expect(card.locator('.ec-bot .btn.primary')).toContainText('Keep typing');
  await expect(card.locator('.ec-bot .btn').last()).toContainText('To the map');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.map-screen')).toBeVisible();
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].stats);
  expect(stats.keys).toEqual({});
  expect(stats.sessions).toEqual([]);
  expect(errors).toEqual([]);
});

test('the place is picked from the open worlds and changed while typing', async ({ page }) => {
  await createProfile(page, 'Lea');
  await editProfile(page, 'p.progress.worldsDone = [0];');
  await page.locator('.map-side .btn', { hasText: 'Just typing' }).click();
  const picker = page.locator('.place-picker-modal');
  await expect(picker.locator('.place-tile')).toHaveText(['Meadow', 'Rocket']);
  await picker.getByRole('button', { name: 'Rocket' }).click();
  await expect(page.locator('.level-screen.world-space')).toBeVisible();
  await page.getByRole('button', { name: 'Change the place' }).click();
  await expect(picker.locator('.place-tile.on')).toHaveText('Rocket');
  // Keys typed while the picker is open do not count.
  await page.keyboard.type('ab');
  await picker.getByRole('button', { name: 'Meadow' }).click();
  await expect(page.locator('.level-screen.world-meadow')).toBeVisible();
  // The X leaves.
  await page.getByRole('button', { name: 'Back to the map' }).click();
  await expect(page.locator('.map-screen')).toBeVisible();
  const keys = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].stats.keys);
  expect(keys.a).toBeUndefined();
});

test('typed words are read aloud only when the parent allows it', async ({ page }) => {
  await fakeVoice(page);
  await createProfile(page, 'Sam');
  await page.locator('.map-side .btn', { hasText: 'Just typing' }).click();
  const read = page.getByRole('button', { name: 'Read aloud' });
  await started(page);
  await read.click();
  await expect(read).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.type('cat');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).said)).toEqual(['cat']);
  await page.keyboard.press('Escape');

  await editProfile(page, 'p.settings.speakTyped = false;');
  await page.locator('.map-side .btn', { hasText: 'Just typing' }).click();
  await started(page);
  await expect(read).toBeHidden();
  await page.keyboard.type('dog');
  await page.keyboard.press('Enter');
  await expect(shown(page)).toHaveText('dog');
  expect(await page.evaluate(() => (window as any).said)).toEqual([]);
});
