import { expect, test } from '@playwright/test';
import { createProfile, typeChar, untilPlay } from './helpers';

const next = (page: import('@playwright/test').Page) => page.locator('.kb-guide').getAttribute('data-next');

test('sticky finger: the right index holds J while the left hand types, letting go waits', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createProfile(page, 'Ema');
  await page.locator('.map-side .btn', { hasText: 'Own typing' }).click();
  const picker = page.locator('.practice-keys-modal');
  const chip = picker.locator('.chip[data-style="sticky"]');
  // f, j and space only: too few keys of each hand, the chip says why.
  await expect(chip).toHaveAttribute('aria-disabled', 'true');
  await expect(chip).toHaveAttribute('data-tip', 'First choose at least 4 keys of each hand.');
  for (const k of ['d', 'k', 's', 'l', 'a', 'h']) await picker.locator(`.kb-key[aria-label="${k}"]`).click();
  await expect(chip).toHaveAttribute('aria-disabled', 'false');
  await chip.click();
  await expect(picker.locator('.pk-style-hint')).toHaveText('One finger holds its key, the others type.');
  await picker.getByRole('button', { name: 'Start' }).click();
  await untilPlay(page);

  // The round starts once J is held.
  const line = page.locator('.hold-line');
  await expect(line).toHaveText('Put your finger back on J and hold it.');
  await expect(page.locator('.kb-key.hold-up')).toHaveCount(1);
  await page.keyboard.down('j');
  await expect(line).toBeHidden();
  await expect(page.locator('.kb-key.held')).toHaveCount(1);

  // Only the left hand's keys come, and J's own press typed nothing.
  const typed: string[] = [];
  for (let i = 0; i < 12; i++) {
    const ch = await next(page);
    expect(ch).toBeTruthy();
    typed.push(ch!);
    await typeChar(page, ch!);
    await page.waitForTimeout(60);
  }
  expect(new Set(typed.filter((c) => !['f', 'd', 's', 'a'].includes(c)))).toEqual(new Set());

  // Letting J go: the line asks for it back, keys meanwhile do nothing, the scene stands.
  await page.keyboard.up('j');
  await expect(line).toBeVisible();
  const waitingFor = await next(page);
  await typeChar(page, waitingFor!);
  await typeChar(page, 'q');
  expect(await next(page)).toBe(waitingFor);
  // Pressing J again goes on at once, with the same key due.
  await page.keyboard.down('j');
  await expect(line).toBeHidden();
  await typeChar(page, waitingFor!);
  await page.keyboard.up('j');
  expect(errors).toEqual([]);
});
