import { expect, test } from '@playwright/test';
import { createProfile, typeChar, untilPlay } from './helpers';

test('free practice starts with a key picker and uses only the chosen keys', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  await page.locator('.map-side .btn', { hasText: 'Own typing' }).click();
  const picker = page.locator('.practice-keys-modal');
  // Opens with the child's active keys: f, j and space, the first step.
  await expect(picker.locator('.pk-step')).toHaveText(/^step 1 of \d+$/);
  await expect(picker.locator('.pk-count')).toHaveText('3 keys');
  await expect(picker.locator('.kb-key.picked')).toHaveCount(3);
  // The next step adds d, k and s.
  await picker.locator('input[type=range]').fill('2');
  await expect(picker.locator('.pk-count')).toHaveText('6 keys');
  await expect(picker.locator('.kb-key[aria-label="d"]')).toHaveAttribute('aria-pressed', 'true');
  // A click takes s away again: own choice.
  await picker.locator('.kb-key[aria-label="s"]').click();
  await expect(picker.locator('.pk-step')).toHaveText('own choice');
  await expect(picker.locator('.pk-count')).toHaveText('5 keys');
  // Too few letters: the start waits.
  for (const k of ['f', 'j', 'd']) await picker.locator(`.kb-key[aria-label="${k}"]`).click();
  await expect(picker.getByRole('button', { name: 'Start' })).toBeDisabled();
  await picker.locator('.kb-key[aria-label="f"]').press('Enter');
  await expect(picker.getByRole('button', { name: 'Start' })).toBeEnabled();
  await picker.getByRole('button', { name: 'Start' }).click();

  // The chosen keys: f, k and space.
  const typed: string[] = [];
  for (let i = 0; i < 400 && typed.length < 30; i++) {
    const state = await page.evaluate(() => {
      if (document.querySelector('.keys-intro')) return { kind: 'ready', key: '' };
      const ck = document.querySelector<HTMLElement>('.controlkey-card');
      if (ck) return { kind: 'control', key: ck.dataset.key ?? '' };
      const nk = document.querySelector<HTMLElement>('.newkey-card');
      if (nk) return { kind: 'newkey', key: nk.dataset.sample ?? '' };
      if (document.querySelector('.posture-card')) return { kind: 'ready', key: '' };
      return { kind: 'play', key: document.querySelector<HTMLElement>('.kb-guide')?.dataset.next ?? '' };
    });
    if (state.kind === 'ready') await page.keyboard.press('Space');
    else if (state.kind === 'control') await page.keyboard.press(state.key);
    else if (state.key) {
      await typeChar(page, state.key);
      if (state.kind === 'play') typed.push(state.key);
    }
    await page.waitForTimeout(state.kind === 'play' ? 90 : 200);
  }
  expect(typed.length).toBeGreaterThanOrEqual(30);
  expect(new Set(typed.filter((c) => !['f', 'k', ' '].includes(c)))).toEqual(new Set());
  expect(errors).toEqual([]);
});

test('Escape closes the key picker', async ({ page }) => {
  await createProfile(page, 'Lea');
  await page.locator('.map-side .btn', { hasText: 'Own typing' }).click();
  await expect(page.locator('.practice-keys-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.practice-keys-modal')).toHaveCount(0);
  await expect(page.locator('.map-screen')).toBeVisible();
});

test('waiting in a level without keys counts no typing time', async ({ page }) => {
  test.setTimeout(60_000);
  await createProfile(page, 'Ema');
  await page.locator('.map-side .btn', { hasText: 'Own typing' }).click();
  await page.locator('.practice-keys-modal').getByRole('button', { name: 'Start' }).click();
  await untilPlay(page);
  // 12 s without a key, then two keys: each key adds at most 5 s.
  await page.waitForTimeout(12_000);
  for (let i = 0; i < 2; i++) await typeChar(page, await page.locator('.kb-guide').getAttribute('data-next') ?? 'f');
  await page.waitForTimeout(3000);
  await page.locator('.hud').getByRole('button', { name: 'Stop typing' }).click();
  await expect(page.locator('.end-card .ec-under')).toHaveText('less than 1 min');
  const p = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0]);
  expect(p.stats.sessions).toHaveLength(1);
  expect(p.stats.sessions[0].seconds).toBeGreaterThan(0);
  expect(p.stats.sessions[0].seconds).toBeLessThanOrEqual(10);
  expect(p.progress.trainedSeconds).toBe(p.stats.sessions[0].seconds);
  await page.locator('.end-card .ec-bot .btn').last().click();
  await page.locator('.map-side .btn', { hasText: 'My progress' }).click();
  await expect(page.locator('.progress-screen .sum-chip[aria-label^="Days with practice"]')).toHaveText('1/14');
  await expect(page.locator('.progress-screen .sum-chip[aria-label^="Typing time"]')).toHaveText('0 min');
});
