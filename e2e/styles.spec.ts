import { type Page, expect, test } from '@playwright/test';
import { createProfile, skipStories, typeChar } from './helpers';

/** Goes through the new-key cards and the get-ready card until play starts. */
async function startRun(page: Page): Promise<void> {
  for (let i = 0; i < 40; i++) {
    const state = await page.evaluate(() => {
      const nk = document.querySelector<HTMLElement>('.newkey-card');
      if (nk) return { kind: 'newkey', key: nk.dataset.sample ?? '' };
      if (document.querySelector('.posture-card')) return { kind: 'ready', key: '' };
      return { kind: document.querySelector('.level-tapko:not(.waiting)') ? 'play' : 'wait', key: '' };
    });
    if (state.kind === 'play') return;
    if (state.kind === 'ready') await page.keyboard.press('Space');
    else if (state.kind === 'newkey') await typeChar(page, state.key);
    await page.waitForTimeout(200);
  }
  throw new Error('play did not start');
}

async function openPicker(page: Page, style: string): Promise<void> {
  await page.locator('.map-side .btn', { hasText: 'Own practice' }).click();
  const picker = page.locator('.practice-keys-modal');
  await expect(picker.locator('.pk-styles .chip.on')).toHaveText('Copy');
  await picker.locator('.pk-styles .chip', { hasText: style }).click();
  await expect(picker.locator('.pk-styles .chip.on')).toHaveText(style);
}

const nextKey = (page: Page) => page.locator('.kb-guide').getAttribute('data-next');

test('dictation: the voice says the target, a wrong key reveals it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // A voice that writes down what it says.
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as any).__spoken = spoken;
    const voice = { lang: 'en-US', localService: true, name: 'Test', voiceURI: 'test', default: true };
    Object.defineProperty(window, 'speechSynthesis', {
      value: { getVoices: () => [voice], speak: (u: { text: string }) => spoken.push(u.text), cancel() {}, addEventListener() {} },
    });
    (window as any).SpeechSynthesisUtterance = class { constructor(public text: string) {} };
  });
  await createProfile(page, 'Ema');
  await openPicker(page, 'Dictation');
  await page.locator('.practice-keys-modal').getByRole('button', { name: 'Start' }).click();
  await startRun(page);
  const heard = async (n: number) => {
    await expect.poll(() => page.evaluate(() => (window as any).__spoken.length)).toBeGreaterThanOrEqual(n);
    return page.evaluate((i) => (window as any).__spoken[i - 1] as string, n);
  };
  // The first target is heard, its letters stay hidden: the guide keeps the key secret.
  const first = await heard(1);
  await expect.poll(() => nextKey(page)).toBe('');
  for (const ch of first) await typeChar(page, ch);
  // The second: a wrong key shows it, and the guide lights the next key from then on.
  const second = await heard(2);
  await page.keyboard.type('q');
  await expect.poll(() => nextKey(page)).toBe(second[0]);
  for (const ch of second) await typeChar(page, ch);
  await heard(3);
  // The reading-aloud button is hidden: the voice is the task.
  await expect(page.locator('.read-btn')).toBeHidden();
  await page.locator('.hud').getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('.results-card')).toContainText('By ear without a mistake: 1 of 2');
  expect(errors).toEqual([]);
});

test('memory: keys wait while the target shows, a mistake shows it again', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // What the label draws as letters in the last frame (dots are no letters).
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype;
    let frame: string[] = [];
    const fill = proto.fillText;
    proto.fillText = function (text: string, ...rest: [number, number]) {
      if (text.length === 1) frame.push(text);
      return fill.call(this, text, ...rest);
    };
    const clear = proto.clearRect;
    proto.clearRect = function (...args: [number, number, number, number]) {
      (window as any).__letters = frame.join('');
      frame = [];
      return clear.apply(this, args);
    };
  });
  await createProfile(page, 'Lea');
  await openPicker(page, 'Remember it');
  // Letters only, so every target is one word.
  await page.locator('.practice-keys-modal .kb-key[aria-label="space bar"]').click();
  await page.locator('.practice-keys-modal').getByRole('button', { name: 'Start' }).click();
  await startRun(page);
  const letters = () => page.evaluate(() => (window as any).__letters as string);
  await expect.poll(letters).not.toBe('');
  const word = await letters();
  // A key while it shows is not counted.
  await typeChar(page, word[0]);
  await expect(page.locator('.bubble')).toContainText('Wait until it hides.');
  // Hidden: dots only, then typing starts.
  await expect.poll(letters, { timeout: 10_000 }).toBe('');
  await typeChar(page, word[0]);
  await expect.poll(letters).toBe(word[0]);
  // A mistake shows the whole target again, the typed letter stays.
  await page.keyboard.type('q');
  await expect.poll(letters).toBe(word);
  await expect.poll(letters, { timeout: 10_000 }).toBe(word[0]);
  for (const ch of word.slice(1)) await typeChar(page, ch);
  await expect(page.locator('.hud')).toBeVisible();
  await page.locator('.hud').getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('.results-card')).toContainText('From memory without a mistake: 0 of 1');
  expect(errors).toEqual([]);
});

test('the place ring in a story level looks like the rhythm ring', async ({ page }) => {
  await createProfile(page, 'Ring');
  await page.locator('.level-node.current').first().click({ force: true });
  await skipStories(page);
  const look = (sel: string) => page.locator(sel).evaluate((el) => {
    const s = getComputedStyle(el);
    return { radius: s.borderRadius, padding: s.padding, width: s.width, height: s.height, background: s.backgroundColor };
  });
  await page.locator('.hud .round-btn.place').waitFor();
  expect(await look('.hud .round-btn.place')).toEqual(await look('.hud .round-btn.rhythm'));
});
