import { expect, test, type Page } from '@playwright/test';
import { createProfile, skipStories } from './helpers';

const SIZES = [{ width: 1366, height: 768 }, { width: 1024, height: 600 }];

async function noScroll(page: Page): Promise<void> {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
  expect(scroll).toBeLessThanOrEqual(inner);
}

async function addProfiles(page: Page, from: number, to: number): Promise<void> {
  for (let i = from; i <= to; i++) {
    await page.goto('./');
    await page.locator(i === 1 ? '.profile-card.new' : '.btn:has-text("Nový hráč"), .btn:has-text("New player"), .profile-card.new').first().click();
    await page.locator('#np-name').fill(`Kid${i}`);
    await page.locator('form button[type=submit]').click();
    await page.locator('.map-screen').waitFor();
  }
}

test('the start screen does not scroll with 1, 5 and 7 profiles', async ({ page }) => {
  await createProfile(page, 'Kid1');
  for (const [count, rows] of [[1, 1], [5, 1], [7, 2]]) {
    await addProfiles(page, count === 1 ? 2 : count === 5 ? 2 : 6, count);
    if (count === 1) { /* already created */ }
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await page.goto('./');
      await page.locator('.start-screen').waitFor();
      await noScroll(page);
      await expect(page.locator('.profile-row')).toHaveCount(rows);
      // The teacher, sound and help buttons are in the first viewport whatever the number of profiles.
      await expect(page.locator('.top-right .help-btn, .top-right .sound-btn')).toHaveCount(2);
      for (const b of await page.locator('.top-right .round-btn').all()) await expect(b).toBeInViewport();
      const newAsCard = count < 5;
      await expect(page.locator('.profile-card.new')).toHaveCount(newAsCard ? 1 : 0);
    }
  }
});

test('the new key card and the get-ready card fit and Esc skips the key', async ({ page }) => {
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.goto('./');
    await page.evaluate(() => localStorage.clear());
    await createProfile(page, 'Fit');
    await page.locator('.level-node.current').first().click({ force: true });
    await skipStories(page);
    const nk = page.locator('.newkey-card');
    await nk.waitFor();
    const box = (await nk.boundingBox())!;
    expect(box.height).toBeLessThan(size.height * 0.6);
    // Esc skips a key card; the keys of the lesson come one by one before the get-ready card.
    const posture = page.locator('.posture-card');
    for (let i = 0; i < 10 && !(await posture.count()); i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    await posture.waitFor();
    await noScroll(page);
    await expect(page.locator('.space-key')).toBeInViewport({ ratio: 1 });
  }
});

/** The sound button's distance from the top and the right edge of the window. */
async function soundOffset(page: Page): Promise<[number, number]> {
  await page.locator('.top-right .sound-btn').waitFor();
  return page.evaluate(() => {
    const r = document.querySelector('.top-right .sound-btn')!.getBoundingClientRect();
    return [Math.round(r.top), Math.round(document.documentElement.clientWidth - r.right)];
  });
}

test('the corner buttons sit at one offset and a level shows its place in the world', async ({ page }) => {
  await createProfile(page, 'Corner');
  const map = await soundOffset(page);
  const id = page.url().split('/p/')[1];
  await page.evaluate((pid) => { location.hash = `#/p/${pid}/wardrobe`; }, id);
  await page.locator('.wardrobe-screen').waitFor();
  expect(await soundOffset(page)).toEqual(map);
  await page.evaluate(() => { location.hash = '#/teacher'; });
  await page.locator('.teacher-screen').waitFor();
  expect(await soundOffset(page)).toEqual(map);
  await page.evaluate(() => { location.hash = '#/'; });
  await page.locator('.start-screen').waitFor();
  expect(await soundOffset(page)).toEqual(map);

  await page.evaluate((pid) => { location.hash = `#/p/${pid}`; }, id);
  await page.locator('.level-node.current').first().click({ force: true });
  await skipStories(page);
  const ring = page.locator('.hud .round-btn.place');
  await expect(ring).toHaveText('1');
  await expect(page.locator('.hud .level-dots')).toHaveCount(0);
});

test('the new player form has a 3 x 3 picker with a side column, closes with X, and the map welcomes once', async ({ page }) => {
  await page.goto('./');
  await page.locator('.profile-card.new').click();
  const kinds = page.locator('.np-pick .kind');
  await expect(kinds).toHaveCount(9);
  const [a, b, c, d] = await Promise.all([0, 1, 2, 3].map(async (i) => (await kinds.nth(i).boundingBox())!));
  expect(Math.abs(a.y - c.y)).toBeLessThan(2);
  expect(d.y).toBeGreaterThan(a.y + a.height - 2);
  expect(b.x).toBeGreaterThan(a.x);
  const side = (await page.locator('.np-side').boundingBox())!;
  expect(side.x).toBeGreaterThan(c.x + c.width);
  await page.setViewportSize({ width: 480, height: 800 });
  expect((await page.locator('.np-side').boundingBox())!.y).toBeGreaterThan((await kinds.nth(8).boundingBox())!.y);
  await noScrollX(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('.form .btn.ghost')).toHaveCount(0);
  await page.locator('.form .modal-x').click();
  await page.locator('.start-screen').waitFor();

  await createProfile(page, 'Ema');
  const welcome = page.locator('.welcome-card');
  await expect(welcome).toContainText('Ema');
  await welcome.locator('.modal-x').click();
  await expect(welcome).toHaveCount(0);
  await page.reload();
  await page.locator('.map-screen').waitFor();
  await expect(welcome).toHaveCount(0);

  // Start on the welcome plays Tapko's intro before the first level.
  await createProfile(page, 'Adam');
  await welcome.locator('.btn.primary').click();
  await expect(page.locator('.story-screen.world-meadow')).toBeVisible();
  await skipStories(page);
  await page.locator('.newkey-card, .posture-card').first().waitFor();
});

async function noScrollX(page: Page): Promise<void> {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
}
