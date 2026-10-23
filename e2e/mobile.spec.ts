import { type Page, expect, test } from '@playwright/test';
import { createProfile } from './helpers';

test.use({ locale: 'sk-SK' });

const screenOf = (page: Page) => page.evaluate(() => document.querySelector<HTMLElement>('#app')!.dataset.screen);

test.describe('a phone without a keyboard', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('asks for a keyboard, lets the teacher in, guards the rest, and a key lifts the gate', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./');
    const gate = page.locator('.teacher-big', { hasText: 'Chýba klávesnica' });
    await expect(gate).toContainText('TapkoTyper potrebuje skutočnú klávesnicu');
    // Silent until the player turns the sound on.
    await expect(page.locator('.sound-btn')).toHaveAttribute('data-level', 'off');
    // No players, no guest, no new player or import while the gate is up.
    await expect(page.locator('.profile-card, .start-screen .row .btn')).toHaveCount(0);
    await gate.tap();
    await expect(page.locator('.modal .keyboard-gate')).toContainText('Pripoj klávesnicu');
    await page.locator('.modal-x').tap();

    for (const route of ['#/new', '#/p/someone/wardrobe', '#/help/typing']) {
      await page.evaluate((r) => { location.hash = r; }, route);
      await expect.poll(() => screenOf(page)).toBe(route.startsWith('#/help') ? 'help' : 'start');
    }
    await page.evaluate(() => { location.hash = '#/'; });
    await page.locator('.teacher-big', { hasText: 'Pre mentorov' }).tap();
    await expect(page.locator('.teacher-screen')).toBeVisible();
    await page.goBack();
    await expect(gate).toBeVisible();

    await page.keyboard.press('a');
    await expect(gate).toHaveCount(0);
    await expect(page.locator('.profile-card.new')).toBeVisible();
    // Remembered for the session.
    await page.reload();
    await expect(page.locator('.profile-card.new')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test('a computer is never gated', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.profile-card.new')).toBeVisible();
  await expect(page.locator('.start-screen.gated')).toHaveCount(0);
});

test('the title fits on one line under the corner buttons at every width', async ({ page }) => {
  await page.goto('./');
  await page.locator('.start-screen .title').waitFor();
  for (const width of [320, 390, 600, 899, 900, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const r = await page.evaluate(() => {
      const title = document.querySelector<HTMLElement>('.start-screen .title')!;
      const t = title.getBoundingClientRect();
      const hit = [...document.querySelectorAll('.top-right button, .top-right .lang-switch')].filter((e) => e.getClientRects().length).some((e) => {
        const b = e.getBoundingClientRect();
        return b.bottom > t.top && b.top < t.bottom && b.right > t.left && b.left < t.right;
      });
      return { fits: title.scrollWidth <= title.clientWidth, hit, scroll: document.documentElement.scrollWidth > innerWidth };
    });
    expect(r, `${width} px`).toEqual({ fits: true, hit: false, scroll: false });
  }
});

test('the corner by width: switch, round language button, Menu', async ({ page }) => {
  await page.goto('./');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('.top-right .lang-switch')).toBeVisible();
  await expect(page.locator('.top-right .menu-btn')).toBeHidden();

  await page.setViewportSize({ width: 760, height: 800 });
  await expect(page.locator('.top-right .lang-switch')).toBeHidden();
  const lang = page.locator('.top-right .lang-btn');
  await expect(lang).toHaveAttribute('aria-label', 'Jazyk: slovenčina');
  await lang.click();
  await expect(page.locator('.top-right .lang-btn')).toHaveAttribute('aria-label', 'Language: English');
  await page.locator('.top-right .lang-btn').click();
  await expect(page.locator('.top-right .lang-btn')).toHaveAttribute('aria-label', 'Jazyk: slovenčina');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.top-right .corner-row')).toBeHidden();
  const menu = page.locator('.top-right .menu-btn');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const items = page.locator('.corner-menu-panel [role=menuitem]');
  await expect(items).toHaveText([/Jazyk: slovenčina/, 'Pre mentorov', /^Zvuk/, 'Celá obrazovka', 'Pomoc']);
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.corner-menu-panel')).toHaveCount(0);
  await expect(menu).toBeFocused();
  // A click outside closes it; an item does its job and closes it.
  await menu.click();
  await page.mouse.click(8, 600);
  await expect(page.locator('.corner-menu-panel')).toHaveCount(0);
  await menu.click();
  await items.filter({ hasText: 'Pre mentorov' }).click();
  await expect(page.locator('.teacher-screen')).toBeVisible();
});

test('the menu carries a screen\'s own buttons on a phone', async ({ page }) => {
  await createProfile(page, 'Ema');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.top-right .menu-btn').click();
  await page.locator('.corner-menu-panel [role=menuitem]').first().click();
  // The map's first corner button is the parent's settings.
  await expect(page.locator('.confirm, .parent-screen').first()).toBeVisible();
});

test('the QR screen: the name first, one size for the padding and the gaps, closes by the button and by a click', async ({ page }) => {
  await createProfile(page, 'Ema');
  const welcome = page.locator('.welcome-card .modal-x');
  if (await welcome.count()) await welcome.click();
  for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await page.locator('.map-side .btn', { hasText: 'Môj postup' }).click();
    await page.locator('.stats-code .btn').click();
    const view = page.locator('.big-code');
    await expect(view.locator('.big-code-caption')).toHaveText(/^Ema\s*·\s*Celé moje štatistiky$/);
    const m = await page.evaluate(() => {
      const v = document.querySelector('.big-code')!;
      const border = parseFloat(getComputedStyle(v).borderTopWidth);
      const box = v.getBoundingClientRect();
      const cap = document.querySelector('.big-code-caption')!.getBoundingClientRect();
      const qr = document.querySelector('.big-code .qr')!.getBoundingClientRect();
      const [a, b] = [...document.querySelectorAll('.big-code-actions .btn')].map((e) => e.getBoundingClientRect());
      const side = Math.abs(a.top - b.top) < 2;
      // A tall window centers the block; the padding is the smaller of the two sides.
      const pad = Math.min(cap.top - box.top - border, cap.left - box.left - border);
      return [pad, qr.top - cap.bottom, Math.min(a.top, b.top) - qr.bottom, side ? b.left - a.right : b.top - a.bottom];
    });
    for (const gap of m.slice(1)) expect(Math.abs(gap - m[0]), `${size.width}: ${m}`).toBeLessThanOrEqual(1);
    await view.locator('.big-code-copy').click();
    await expect(view).toBeVisible();
    await view.locator('.big-code-close').click();
    await expect(view).toHaveCount(0);
    await page.locator('.stats-code .btn').click();
    await view.click({ position: { x: 30, y: 30 } });
    await expect(view).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
});
