import { type Page, expect, test } from '@playwright/test';

// A first visit's start page shows from the start texts alone (src/i18n/start-texts.ts): with the
// whole files held back, the page and what opens on it look up no text the start texts lack.

/** The start page of a first visit with the whole texts held back; returns the texts it looked up late. */
async function firstVisit(page: Page, lang: string): Promise<string[]> {
  const late: string[] = [];
  page.on('console', (m) => { if (m.text().startsWith('i18n:')) late.push(m.text()); });
  await page.route(/\/i18n\/(sk|en)\.json$/, (route) => route.abort());
  await page.goto(`./?lang=${lang}`);
  await page.evaluate((lang) => localStorage.setItem('tapkotyper:v1', JSON.stringify({ language: lang })), lang);
  await page.reload();
  await page.locator('.start-screen').waitFor();
  return late;
}

/** Hovers every control in the corner, so each tip shows. */
async function tips(page: Page): Promise<void> {
  for (const b of await page.locator('.top-right .corner-row > button:visible').all()) {
    await b.hover();
    await page.waitForTimeout(150);
  }
}

for (const lang of ['sk', 'en']) {
  test.describe(lang, () => {
    test(`a computer's start page has all its texts (${lang})`, async ({ page }) => {
      const late = await firstVisit(page, lang);
      await tips(page);
      await page.locator('.card-logo').hover();
      await page.waitForTimeout(150);
      // The language list opens and closes.
      await page.locator('.top-right .lang-btn:visible').click();
      await page.locator('.lang-list').waitFor();
      await page.keyboard.press('Escape');
      expect(late).toEqual([]);
    });

    test.describe('phone', () => {
      test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
      test(`a phone's start page has all its texts (${lang})`, async ({ page }) => {
        const late = await firstVisit(page, lang);
        await page.locator('.start-screen.gated').waitFor();
        // The menu in the corner and the keyboard question, by touch: a key would lift the gate.
        const menu = page.locator('.top-right .menu-btn:visible');
        if (await menu.count()) {
          await menu.tap();
          await page.waitForTimeout(150);
          await menu.tap();
        }
        await page.locator('.start-more .teacher-big').last().tap();
        await page.locator('.modal .keyboard-gate').waitFor();
        expect(late).toEqual([]);
      });
    });
  });
}
