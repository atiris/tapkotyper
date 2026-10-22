import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

test('parent changes settings, exports and imports into a fresh browser', async ({ page, browser }) => {
  await createProfile(page, 'Tomas');
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn.danger, .confirm .btn:not(.primary)').last().click();
  await expect(page.locator('.parent-screen')).toBeVisible();
  await page.getByRole('checkbox', { name: /^(Bez časového tlaku|No time pressure)/ }).check();
  await page.locator('.tab[data-tab=data]').click();
  const download = page.waitForEvent('download');
  await page.locator('.data-tab .btn').first().click();
  const file = await (await download).path();

  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto('./');
  await p2.locator('.start-screen .btn.ghost').nth(1).click();
  await p2.locator('.import input[type=file]').setInputFiles(file!);
  await p2.locator('.import .btn.primary').click();
  await expect(p2.locator('.profile-card', { hasText: 'Tomas' })).toBeVisible();
  const imported = await p2.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0].settings.noTimePressure);
  expect(imported).toBe(true);
  await other.close();
});

test('a settings password locks every way into the parent screen', async ({ page }) => {
  await createProfile(page, 'Ema');
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  const group = page.locator('.lock-group');
  await group.locator('input[type=password]').nth(0).fill('mama1');
  await group.locator('input[type=password]').nth(1).fill('mama2');
  await group.locator('.btn.primary').click();
  await expect(group.locator('.lock-msg.error')).toBeVisible();
  await group.locator('input[type=password]').nth(1).fill('mama1');
  await group.locator('.btn.primary').click();
  await expect(group.locator('.btn.danger')).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).parentLock);
  expect(stored.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(stored)).not.toContain('mama1');

  await page.locator('.parent-screen .bar .btn').first().click();
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.lock-input').fill('wrong');
  await page.keyboard.press('Enter');
  await expect(page.locator('.lock-dialog .error')).not.toBeEmpty();
  await expect(page.locator('.parent-screen')).toHaveCount(0);
  await page.locator('.lock-input').fill('mama1');
  await page.locator('.lock-dialog .btn.primary').click();
  await expect(page.locator('.parent-screen')).toBeVisible();

  // The address of the settings asks too.
  await page.reload();
  await expect(page.locator('.lock-dialog')).toBeVisible();
  await page.locator('.lock-dialog .btn:not(.primary)').click();
  await expect(page.locator('.map-screen')).toBeVisible();
});

test('the parent area switches to another child and keeps the tab', async ({ page }) => {
  await createProfile(page, 'Anna');
  await createProfile(page, 'Boris');
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await expect(page.locator('.switch-btn')).toContainText('Boris');
  await page.locator('.tab[data-tab=dashboard]').click();
  await expect(page.locator('.level-cell').first().locator('.star')).toHaveCount(3);
  await page.locator('.switch-btn').click();
  await expect(page.locator('.switch-list .profile-card')).toHaveCount(1);
  await page.locator('.switch-list .profile-card', { hasText: 'Anna' }).click();
  await expect(page.locator('.switch-btn')).toContainText('Anna');
  await expect(page.locator('.tab[data-tab=dashboard]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.lock-dialog, .confirm')).toHaveCount(0);
});

test('with one profile the switch button is hidden', async ({ page }) => {
  await createProfile(page, 'Sam');
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await expect(page.locator('.parent-screen')).toBeVisible();
  await expect(page.locator('.switch-btn')).toHaveCount(0);
});
