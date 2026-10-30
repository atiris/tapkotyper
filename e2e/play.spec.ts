import { expect, test } from '@playwright/test';
import { createProfile, playLevel, typeChar } from './helpers';

test('a new child plays the first level by typing and sees stars', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  await page.locator('.map-side .btn.primary').click();
  const text = await playLevel(page);
  expect(text).toMatch(/%/);
  // The character celebrated in place, not running off.
  await expect(page.locator('.level-tapko.celebrate')).toHaveCount(1);
  await expect(page.locator('.end-card .star.on').first()).toBeVisible();
  // Esc peeks at the last frame of the game under the card; a key that types nothing brings the card back with its focus (a letter would stay a while).
  const overlay = page.locator('.overlay.results');
  const first = page.locator('.end-card .ec-bot button').first();
  await expect(first).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(overlay).toHaveClass(/peek/);
  await expect(page.locator('.end-card')).toBeHidden();
  await expect(page.locator('.level-screen canvas').first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.end-card')).toBeVisible();
  await expect(first).toBeFocused();
  // The round X peeks too; the top bar works while peeking, a click on the stage brings the card back.
  await page.locator('.end-card .modal-x').click();
  await expect(page.locator('.end-card')).toBeHidden();
  await page.locator('.hud').getByRole('button', { name: 'Help in the level' }).click();
  await expect(page.locator('.level-help')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.level-help')).toHaveCount(0);
  await expect(page.locator('.end-card')).toBeHidden();
  await page.locator('.level-screen .stage-wrap').click({ position: { x: 20, y: 20 } });
  await expect(page.locator('.end-card')).toBeVisible();
  // Esc while peeking brings the card back, it never leaves.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.end-card')).toBeVisible();
  await page.locator('.end-card .ec-bot .btn').last().click();
  await expect(page.locator('.level-node.done')).toHaveCount(1);
  await page.locator('.map-tapko').click();
  await expect(page.locator('.stats-modal .progress-story').first().locator('.story-stars')).toHaveAttribute('aria-label', /: [1-3]$/);
  await page.locator('.stats-modal .tab[data-tab="keys"]').click();
  await page.locator('.heatmap .kb-key[data-heat]').first().click();
  await expect(page.locator('.stats-modal .key-detail')).toContainText('%');
  expect(errors).toEqual([]);
});

test('a quick child plays the first level until its minimum length, and the bar never runs ahead', async ({ page }) => {
  await createProfile(page, 'Rio');
  // The e2e build reads a shorter minimum from the address; the real one is two minutes.
  const url = new URL(page.url());
  url.search = '?minActive=60';
  await page.goto(url.toString());
  await page.locator('.map-side .btn.primary').click();
  const start = Date.now();
  const played = playLevel(page, false);
  await page.waitForTimeout(25_000);
  const width = await page.locator('.progress-fill').evaluate((el) => parseFloat((el as HTMLElement).style.width));
  expect(width).toBeLessThan(60);
  await played;
  expect(Date.now() - start).toBeGreaterThan(60_000);
});

test('a copied link opens the player directly', async ({ page, context }) => {
  await createProfile(page, 'Lea');
  expect(page.url()).toMatch(/#\/p\//);
  const p2 = await context.newPage();
  await p2.goto(page.url());
  await expect(p2.locator('.map-hello')).toContainText('Lea');
});

test('the super password typed fast on the start page opens everything', async ({ page }) => {
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  await expect(page.locator('.top-right .round-btn.super')).toBeVisible();
  await expect(page.locator('.level-node:disabled')).toHaveCount(0);
  await page.locator('.top-right .round-btn.super').click();
  await page.locator('.service-menu .menu-item', { hasText: 'End super mode' }).click();
  await expect(page.locator('.start-screen')).toBeVisible();
  await expect(page.locator('.top-right .round-btn.super')).toHaveCount(0);
});

test('the robot story is a second row on the map, and Bolt walks with the child in it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  await expect(page.locator('.story-row')).toHaveCount(3);
  await page.locator('.story-robot .level-node').first().click();
  // The world is not built yet: the card says so instead of its story.
  await expect(page.locator('.posture-card')).toContainText('still being made');
  await page.keyboard.press('Space');
  await expect(page.locator('.level-screen.world-junkyard[data-bolt="broken"]')).toBeVisible();
  await page.locator('.level-tapko:not(.waiting)').waitFor();
  await expect.poll(() => page.locator('.kb-guide').getAttribute('data-next')).not.toBe('');
  expect(errors).toEqual([]);
});

test('Enter sends the paws to type a few words', async ({ page }) => {
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  // The super player's progress is filled: Continue would go on.
  await page.locator('.level-node').first().click();
  await page.locator('.posture-card').waitFor();
  await page.keyboard.press('Space');
  await expect(page.locator('.paw-btn')).toHaveAttribute('data-charged', '3');
  await page.locator('.level-tapko:not(.waiting)').waitFor();
  await expect.poll(() => page.locator('.kb-guide').getAttribute('data-next')).not.toBe('');
  await page.keyboard.press('Enter');
  await expect(page.locator('.kb-guide.paws-on')).toBeVisible();
  await expect(page.locator('.paw-btn')).toHaveAttribute('data-charged', '2');
  await expect(page.locator('.kb-guide.paws-on')).toHaveCount(0, { timeout: 15000 });
});

test('a level left during its get-ready card does not swallow the next level\'s keys', async ({ page }) => {
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  // The super player's progress is filled: Continue would go on.
  await page.locator('.level-node').first().click();
  await page.locator('.posture-card').waitFor();
  await page.goBack();
  await page.locator('.map-screen').waitFor();
  await page.locator('.level-node').first().click();
  await page.locator('.posture-card').waitFor();
  await page.keyboard.press('Space');
  await page.locator('.level-tapko:not(.waiting)').waitFor();
  // The level listens on the window after all capturing cards; a key must get that far.
  await page.evaluate(() => window.addEventListener('keydown', () => document.body.dataset.reached = '1'));
  await page.keyboard.type('a');
  await expect(page.locator('body[data-reached]')).toHaveCount(1);
});

test('guest progress is forgotten in a new browser context', async ({ page, browser }) => {
  await page.goto('./');
  await page.locator('.start-screen .btn.ghost').first().click();
  await expect(page.locator('.map-screen')).toBeVisible();
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto('./');
  await expect(p2.locator('.profile-card:not(.new)')).toHaveCount(0);
  await other.close();
});

test('Escape closes the get-ready card like the space bar and starts the level', async ({ page }) => {
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  // The super player's progress is filled: Continue would go on.
  await page.locator('.level-node').first().click();
  await page.locator('.posture-card').waitFor();
  await expect(page.locator('.posture-card .modal-x')).toHaveAttribute('data-tip', 'Close and start (Esc)');
  await page.keyboard.press('Escape');
  await expect(page.locator('.posture-card')).toHaveCount(0);
  await expect(page.locator('.level-screen')).toBeVisible();
});

test('a world not built yet plays the cyclic copy and its level is finished by copying', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  await page.locator('.island-egg .level-node.super').click();
  await expect(page.locator('.posture-card')).toContainText('This level is still being made');
  await expect(page.locator('.level-screen.world-egg')).toBeVisible();
  expect(await playLevel(page)).toMatch(/%/);
  expect(errors).toEqual([]);
});

test('world badges sit on the map, grow with stars and line up on the progress shelf', async ({ page }) => {
  await createProfile(page, 'Bea');
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('tapkotyper:v1')!);
    const p = d.profiles[0];
    p.progress.worldsDone = [0, 1, 2];
    Object.assign(p.progress.levels, {
      'w1-1': 2, 'w1-2': 3, 'w1-3': 3, 'w1-4': 3, 'w1-5': 3,
      'w2-1': 3, 'w2-2': 3, 'w2-3': 2, 'w2-4': 2, 'w2-5': 2,
      'w3-1': 1, 'w3-2': 1, 'w3-3': 1, 'w3-4': 1, 'w3-5': 1,
    });
    localStorage.setItem('tapkotyper:v1', JSON.stringify(d));
  });
  await page.reload();
  await expect(page.locator('.island-meadow .badge.silver')).toBeVisible();
  await expect(page.locator('.island-space .badge.silver')).toBeVisible();
  await expect(page.locator('.island-planet .badge.bronze')).toBeVisible();
  await expect(page.locator('.island-dragons .badge')).toHaveCount(0);
  await page.locator('.island-meadow .level-node').first().click();
  expect(await playLevel(page, false)).toContain('A gold badge');
  await page.locator('.end-card .ec-bot .btn').last().click();
  await expect(page.locator('.island-meadow .badge.gold')).toBeVisible();
  await page.locator('.map-tapko').click();
  await expect(page.locator('.badge-shelf .badge')).toHaveCount(15);
  await expect(page.locator('.badge-shelf .badge.none')).toHaveCount(12);
  await expect(page.locator('.badge-shelf .badge.none').first()).toHaveAttribute('aria-label', 'Finish world 4');
});

test('the fairy story is a third row; Melody floats with the child', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A few seconds of copying, so the child's own keys count.
  await page.goto('./?minActive=8');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  const row = page.locator('.story-fairy');
  await expect(row.locator('.story-name')).toHaveText('Melody the Fairy');
  await expect(row.locator('.island')).toHaveCount(5);
  await row.locator('.island-forestpath .level-node').first().click();
  await expect(page.locator('.level-screen.world-forestpath[data-fairy="melody"]')).toBeVisible();
  expect(await playLevel(page, false)).toMatch(/%/);
  expect(errors).toEqual([]);
});

test('free practice with a diacritic key is played to the results card', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema', 'sk-qwertz');
  await page.locator('.map-side .btn', { hasText: 'Own typing' }).click();
  const picker = page.locator('.practice-keys-modal');
  await picker.locator('input[type=range]').fill('4');
  await expect(picker.locator('.kb-key[aria-label="ô"]')).toHaveAttribute('aria-pressed', 'true');
  await picker.getByRole('button', { name: 'Start' }).click();
  const typed: string[] = [];
  for (let i = 0; i < 600 && !typed.includes('ô'); i++) {
    const state = await page.evaluate(() => ({
      control: document.querySelector<HTMLElement>('.controlkey-card')?.dataset.key ?? '',
      newkey: document.querySelector<HTMLElement>('.newkey-card')?.dataset.sample ?? '',
      ready: !!document.querySelector('.posture-card, .keys-intro'),
      next: document.querySelector<HTMLElement>('.kb-guide')?.dataset.next ?? '',
    }));
    if (state.ready) await page.keyboard.press('Space');
    else if (state.control) await page.keyboard.press(state.control);
    else if (state.newkey || state.next) {
      await typeChar(page, state.newkey || state.next);
      if (!state.newkey) typed.push(state.next);
    }
    await page.waitForTimeout(90);
  }
  expect(typed).toContain('ô');
  await page.locator('.hud').getByRole('button', { name: 'Stop typing' }).click();
  await expect(page.locator('.end-card')).toBeVisible();
  expect(errors).toEqual([]);
});

test('staying a while after a level keeps typing until it is ended on the pause card and leaves the stars alone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Mia');
  await page.locator('.map-side .btn.primary').click();
  await playLevel(page);
  const node = page.locator('.level-node').first();
  // Whole stars only: the card shows a half star too, which is never saved.
  const stars = await page.locator('.end-card .star.on:not([src*="half"])').count();
  // The main action keeps the focus; staying is one of the other buttons.
  await expect(page.locator('.end-card .ec-bot button').first()).toBeFocused();
  await page.locator('.end-card button', { hasText: 'A while more' }).click();
  await expect(page.locator('.level-screen .bubble')).toContainText('Press Esc');
  await expect(page.locator('.posture-card')).toHaveCount(0);
  for (let i = 0; i < 25; i++) {
    const next = await page.locator('.kb-guide').getAttribute('data-next');
    if (next) await typeChar(page, next);
    await page.waitForTimeout(90);
  }
  // Esc pauses; the level is done, so the next level comes first and the end is there too.
  await page.keyboard.press('Escape');
  const pause = page.locator('.pause-card');
  await expect(pause.locator('.btn.primary')).toBeFocused();
  await expect(pause.locator('.btn.primary')).toContainText('Next level');
  await pause.getByRole('button', { name: 'Stop typing' }).click();
  const card = page.locator('.end-card.stay-done');
  await expect(card.locator('h2')).toHaveText('Easy round finished!');
  await expect(card).toContainText('%');
  await expect(card.locator('.star')).toHaveCount(0);
  // The next level is the main button, the map always last.
  await expect(card.locator('.ec-bot button').first()).toBeFocused();
  await expect(card.locator('.ec-bot button').first()).toContainText('Next level');
  await card.locator('.ec-bot button').last().click();
  await expect(node.locator('.mini-stars i.on')).toHaveCount(stars);
  expect(errors).toEqual([]);
});
