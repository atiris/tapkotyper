import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

const ringValue = async (page: import('@playwright/test').Page) => Number(await page.locator('.tr-ring .rb-num').textContent());

test('the translator asks the parent question on its own address', async ({ page }) => {
  await page.goto('./#/translate');
  await expect(page.locator('.confirm-modal')).toBeVisible();
  await page.locator('.confirm .btn.primary').click();
  await expect(page.locator('.start-screen')).toBeVisible();
  await expect(page.locator('.translate-screen')).toHaveCount(0);
});

test('a parent starts a language, translates, exports, imports and plays it', async ({ page }, info) => {
  await createProfile(page, 'Ema');
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await page.getByRole('button', { name: /^(Preložiť hru|Translate the game)$/ }).click();
  await expect(page.locator('.translate-screen')).toBeVisible();

  // A new language, prefilled from English: every field still untranslated.
  await page.getByRole('button', { name: /^New language$/ }).click();
  const form = page.locator('.tr-dialog');
  await form.locator('input').nth(0).fill('Deutsch');
  await form.locator('input').nth(1).fill('de');
  await form.locator('select').first().selectOption('en');
  await form.locator('button[type=submit]').click();
  await expect(page.locator('.tr-target')).toHaveValue(/.+/);
  // English above the fields, Slovak as the second sample.
  await page.locator('.tr-sample').selectOption('en');
  await page.locator('.tr-sample2').selectOption('sk');
  await page.locator('.tr-prefill').selectOption('en');
  await page.getByRole('button', { name: /^Prefill$/ }).click();
  await expect(page.locator('textarea[data-field="common.ok"]')).toHaveValue('OK');
  expect(await ringValue(page)).toBe(0);
  await expect(page.locator('.tr-input.open').first()).toBeVisible();

  // Typing one field raises the percentage.
  await page.locator('#tr-s-map').scrollIntoViewIfNeeded();
  const hello = page.locator('textarea[data-field="map.hello"]');
  await hello.fill('Hallo, {name}!');
  expect(await ringValue(page)).toBeGreaterThan(0);
  await expect(hello.locator('xpath=..')).not.toHaveClass(/open/);

  // The ring goes to the first untranslated field; reached by the keyboard it shows its samples.
  await page.locator('.tr-ring').click();
  const firstId = await page.locator('textarea.tr-field:focus').getAttribute('data-field');
  const first = page.locator('.tr-input', { has: page.locator(`textarea[data-field="${firstId}"]`) });
  const area = first.locator('textarea');
  await area.press('Alt+I');
  await expect(page.locator('#tr-pop')).toContainText('English');
  await expect(page.locator('#tr-pop')).toContainText('Slovenčina');
  await expect(page.locator('#tr-pop')).toContainText(firstId!);
  await expect(first.locator('a.tr-act')).toHaveAttribute('href', /github\.com\/search/);

  // Copy from the second sample keeps it untranslated; marking it done, undo and redo.
  await area.press('Alt+Shift+C');
  await expect(first).toHaveClass(/open/);
  const copied = await area.inputValue();
  expect(copied).not.toBe('');
  await first.locator('.tr-mark').click();
  await expect(first).not.toHaveClass(/open/);
  await first.locator('.tr-undo').click();
  await expect(first).toHaveClass(/open/);
  await first.locator('.tr-redo').click();
  await expect(first).not.toHaveClass(/open/);
  await area.fill('Okay');
  await area.press('Control+Z');
  await expect(area).toHaveValue(copied);
  await area.press('Control+Y');
  await expect(area).toHaveValue('Okay');

  // Alt+N goes on to the next untranslated field; Tab skips the buttons to the next field.
  await area.press('Alt+N');
  await expect(page.locator('textarea.tr-field:focus')).not.toHaveAttribute('data-field', firstId!);
  await area.focus();
  await area.press('Tab');
  await expect(page.locator(':focus')).toHaveClass(/tr-field/);
  await expect(page.locator('#tr-pop')).toBeVisible();

  // A pool gets a variant and loses it again.
  await page.locator('#tr-s-aim').scrollIntoViewIfNeeded();
  const pool = page.locator('.tr-item[data-key="aim.lines.center"]');
  // The section fills in once it comes near the view: thousands of fields, slow on a loaded machine.
  await expect(pool.locator('.tr-add')).toBeVisible({ timeout: 30_000 });
  const variants = await pool.locator('.tr-var').count();
  await pool.locator('.tr-add').click();
  await expect(pool.locator('.tr-var')).toHaveCount(variants + 1);
  await pool.locator('.tr-remove').last().click();
  await expect(pool.locator('.tr-var')).toHaveCount(variants);

  // Export the pairs, change a line in the file, import it back.
  await page.getByRole('button', { name: /^Export$/ }).click();
  const download = page.waitForEvent('download');
  await page.locator('.tr-menu .btn').first().click();
  const text = readFileSync((await (await download).path())!, 'utf8');
  expect(text).toContain('@map.hello\nen: Hi, {name}!\nde: Hallo, {name}!');
  const edited = info.outputPath('de.txt');
  writeFileSync(edited, text.replace('de: Hallo, {name}!', 'de: Hallo du, {name}!'));
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /^Import$/ }).click();
  await (await chooser).setFiles(edited);
  await page.locator('.tr-dialog .btn.primary').click();
  await expect(page.locator('.tr-dialog')).toHaveCount(0);
  await page.locator('#tr-s-map').scrollIntoViewIfNeeded();
  await expect(page.locator('textarea[data-field="map.hello"]')).toHaveValue('Hallo du, {name}!');

  // The own language is picked in the settings and plays on the map.
  await page.locator('.translate-screen .bar .btn').first().click();
  await expect(page.locator('.parent-screen')).toBeVisible();
  const langSelect = page.locator('.parent-screen select').first();
  await expect(langSelect.locator('option', { hasText: 'Deutsch' })).toHaveCount(1);
  await langSelect.selectOption({ label: 'Deutsch' });
  await expect(page.locator('.parent-screen')).toBeVisible();
  await page.locator('.parent-screen .bar .btn').first().click();
  await expect(page.locator('.map-hello')).toHaveText('Hallo du, Ema!');

  // The round language button lists only official languages.
  await page.goto('./');
  await page.locator('.top-right .lang-btn').click();
  await expect(page.locator('.lang-list')).toBeVisible();
  await expect(page.locator('.lang-list')).not.toContainText('Deutsch');
});

test('the translator fits a phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('./#/translate');
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await expect(page.locator('.translate-screen .tr-section').first()).toBeVisible();
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth);
  expect(scroll).toBe(false);
});
