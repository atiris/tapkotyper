import { type Page, expect, test } from '@playwright/test';
import { contrastMisses } from './contrast';
import { playLevel, skipStories, untilPlay } from './helpers';

test.use({ locale: 'sk-SK' });

const look = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1') ?? '{}').theme);

/** Players straight in the store, so a start page can be checked with any number of them. */
async function seed(page: Page, players: number, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate(({ players, theme }) => {
    const kinds = ['fox', 'cat', 'bunny', 'owl', 'dog', 'bear', 'panda'];
    const profiles = kinds.slice(0, players).map((kind, i) => ({ id: `p${i}`, name: `Hráč ${i + 1}`, progress: {}, settings: {}, companion: { name: `Hráč ${i + 1}`, kind } }));
    localStorage.setItem('tapkotyper:v1', JSON.stringify({ version: 5, profiles, lastProfileId: null, language: 'sk', theme }));
  }, { players, theme });
  await page.reload();
  await page.locator('.start-screen').waitFor();
}

test('the theme follows the system until the button picks one, which stays after a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  expect(await look(page)).toBe('light');
  // A new device has stored nothing yet and follows the system.
  expect(await stored(page)).toBeUndefined();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => look(page)).toBe('dark');
  const button = page.locator('.top-right .theme-btn');
  await expect(button).toHaveAttribute('aria-label', 'Svetlý režim');
  await button.click();
  expect(await look(page)).toBe('light');
  expect(await stored(page)).toBe('light');
  await expect(button).toHaveAttribute('aria-label', 'Tmavý režim');
  await page.reload();
  expect(await look(page)).toBe('light');
  // A stored choice no longer follows the system.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await look(page)).toBe('light');
  await page.locator('.top-right .theme-btn').click();
  expect(await stored(page)).toBe('dark');
});

test('a dark reload paints dark before the app has started', async ({ page }) => {
  await page.goto('./');
  await seed(page, 0, 'dark');
  // The app's code waits; the page is already dark without it.
  await page.route('**/assets/*.js', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('./', { waitUntil: 'commit' });
  await page.waitForFunction(() => document.body);
  const early = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.documentElement).backgroundColor, booting: document.body.classList.contains('booting') }));
  expect(early).toEqual({ theme: 'dark', bg: 'rgb(23, 22, 49)', booting: true });
});

for (const theme of ['light', 'dark'] as const) {
  test(`the start page fits, keeps its slogan on two lines and its sky off the text (${theme})`, async ({ page }) => {
    await page.goto('./');
    const sizes = [{ width: 1366, height: 768 }, { width: 1024, height: 600 }, { width: 820, height: 1180 }];
    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const players of [0, 1, 3, 5, 7]) {
        await seed(page, players, theme);
        const r = await page.evaluate(() => {
          const texts = [...document.querySelectorAll('.start-wrap h1, .start-wrap p, .start-wrap li, .start-wrap h2, .start-card')].map((e) => e.getBoundingClientRect());
          const pieces = [...document.querySelectorAll('.sky-piece:not([hidden])')].map((e) => e.getBoundingClientRect());
          const lines = [...document.querySelectorAll<HTMLElement>('.slogan > span')].map((s) => s.getBoundingClientRect().height / parseFloat(getComputedStyle(s).lineHeight));
          return {
            scroll: document.body.scrollHeight > innerHeight || document.body.scrollWidth > document.body.clientWidth,
            lines: lines.map(Math.round),
            hit: pieces.some((p) => texts.some((t) => p.right > t.left && p.left < t.right && p.bottom > t.top && p.top < t.bottom)),
            sun: !!document.querySelector('.sky-sun:not([hidden])'),
          };
        });
        // A tablet's one column may scroll with seven players.
        const scroll = size.width < 900 && players === 7 ? r.scroll : false;
        expect(r, `${size.width}x${size.height}, ${players} players`).toEqual({ scroll, lines: [1, 1], hit: false, sun: true });
      }
    }
  });
}

test('the phone without a keyboard fits in both looks', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, colorScheme, locale: 'sk-SK' });
    const page = await ctx.newPage();
    await page.goto('./');
    await page.locator('.start-screen.gated').waitFor();
    expect(await look(page)).toBe(colorScheme);
    const r = await page.evaluate(() => ({
      scroll: document.body.scrollHeight > innerHeight || document.body.scrollWidth > document.body.clientWidth,
      order: [...document.querySelectorAll('.start-more .teacher-big')].map((b) => b.classList.contains('alt')),
    }));
    expect(r).toEqual({ scroll: false, order: [false, true] });
    expect(await contrastMisses(page)).toEqual([]);
    await ctx.close();
  }
});

test('MIT · Atiris is white on the meadow and lights up on hover and focus, never underlined', async ({ page }) => {
  await page.goto('./');
  for (const [theme, lit] of [['light', 'rgb(255, 255, 255)'], ['dark', 'rgb(255, 246, 204)']] as const) {
    await seed(page, 1, theme);
    const sig = page.locator('.start-sig');
    await expect(sig).toHaveText('MIT · Atiris');
    await expect(sig).toHaveCSS('color', 'rgb(255, 255, 255)');
    await sig.hover();
    await expect(sig).toHaveCSS('color', lit);
    await expect(sig).toHaveCSS('opacity', '1');
    await expect(sig).toHaveCSS('text-decoration-line', 'none');
    await page.mouse.move(1, 1);
    await sig.focus();
    await expect(sig).toHaveCSS('color', lit);
  }
});

test('the language button lists the languages by their own names', async ({ page }) => {
  await page.goto('./');
  const button = page.locator('.top-right .lang-btn');
  await expect(button).toHaveAttribute('aria-label', 'Jazyk: Slovenčina');
  await button.click();
  const items = page.locator('.lang-list [role=option]');
  await expect(items).toHaveText(['Slovenčina', 'English']);
  await expect(items.first()).toHaveAttribute('aria-selected', 'true');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.lang-list')).toHaveCount(0);
  await expect(button).toBeFocused();
  // A second click on the button closes it; Tab out of it closes it too.
  await button.click();
  await button.click();
  await expect(page.locator('.lang-list')).toHaveCount(0);
  await button.click();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('.lang-list')).toHaveCount(0);
  await button.click();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.top-right .lang-btn')).toHaveAttribute('aria-label', 'Language: English');
  await expect(page.locator('.top-right .lang-btn')).toBeFocused();
  await expect(page.locator('.slogan')).toContainText('Ten fingers,');
  // A click outside closes it; on a phone the same list opens from the Menu.
  await page.locator('.top-right .lang-btn').click();
  await page.mouse.click(10, 400);
  await expect(page.locator('.lang-list')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.top-right .menu-btn').click();
  await page.locator('.corner-menu-panel [role=menuitem]', { hasText: 'Language: English' }).click();
  await expect(page.locator('.lang-list [role=option]')).toHaveText(['Slovenčina', 'English']);
  await page.keyboard.press('Escape');
  await expect(page.locator('.top-right .menu-btn')).toBeFocused();
});

/** Every visible text of the screen reaches WCAG AA in the dark look, once its pop-ins and fades end. */
async function readable(page: Page, where: string): Promise<void> {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => undefined))));
  expect(await contrastMisses(page), where).toEqual([]);
}

test('in the dark look every screen reads well', async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(20_000);
  await page.goto('./');
  await seed(page, 0, 'dark');
  await readable(page, 'start');
  await page.locator('.start-card .btn.primary').click();
  await readable(page, 'new player');
  await page.locator('#np-nick').fill('Ema');
  await page.locator('form button[type=submit]').click();
  await page.locator('.map-screen').waitFor();
  await readable(page, 'map');
  await page.locator('.map-tapko').click();
  await readable(page, 'progress');
  await page.keyboard.press('Escape');
  for (const [sub, where] of [['wardrobe', 'wardrobe'], ['help', 'help']] as const) {
    await page.evaluate((sub) => { location.hash = location.hash.replace(/^(#\/p\/[^/]+).*$/, `$1/${sub}`); }, sub);
    await page.locator(`.${where}-screen`).waitFor();
    await readable(page, where);
  }
  for (const tab of ['typing', 'progress', 'settings', 'mentoring', 'about']) {
    await page.locator(`.help-screen .tab[data-tab="${tab}"]`).click();
    await readable(page, `help ${tab}`);
  }
  await page.evaluate(() => { location.hash = location.hash.replace(/^(#\/p\/[^/]+).*$/, '$1'); });
  await page.locator('.map-screen').waitFor();
  await page.locator('.top-right .round-btn.control').first().click();
  await page.locator('.modal').waitFor();
  await readable(page, 'parent question');
  await page.locator('.modal .btn', { hasText: 'Áno, otvoriť' }).click();
  await page.locator('.parent-screen').waitFor();
  for (const tab of await page.locator('.parent-screen .tabs .tab').all()) {
    await tab.click();
    await readable(page, `settings ${await tab.textContent()}`);
  }
  await page.goto('./#/teacher');
  await page.locator('.teacher-screen').waitFor();
  await readable(page, 'mentors');
  await page.goto('./');
  await page.locator('.profile-card').first().click();
  await page.locator('.map-side .btn', { hasText: 'Vlastné cvičenie' }).click();
  await page.locator('.practice-keys-modal').waitFor();
  await readable(page, 'practice keys');
  await page.keyboard.press('Escape');
  await page.locator('.map-side .btn', { hasText: 'Len chcem písať' }).click();
  await page.locator('.level-screen .bubble:not(.hidden)').waitFor();
  await readable(page, 'free typing');
  await page.goto('./');
  await page.locator('.profile-card').first().click();
  await page.locator('.map-side .btn.primary').click();
  await page.locator('.story-screen').waitFor();
  await readable(page, 'story');
  await skipStories(page);
  await untilPlay(page, 'ready');
  await readable(page, 'get ready');
  await page.keyboard.press('Space');
  await page.locator('.level-tapko:not(.waiting)').waitFor();
  await readable(page, 'level');
  await page.keyboard.press('Escape');
  await page.locator('.pause-card').waitFor();
  await readable(page, 'pause');
  await page.keyboard.press('Escape');
  await playLevel(page, false);
  await readable(page, 'results');
});
