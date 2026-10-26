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
  await page.locator('.tab[data-tab=data]').click();
  await page.locator('.switch-btn').click();
  await expect(page.locator('.switch-list .profile-card')).toHaveCount(1);
  await page.locator('.switch-list .profile-card', { hasText: 'Anna' }).click();
  await expect(page.locator('.switch-btn')).toContainText('Anna');
  await expect(page.locator('.tab[data-tab=data]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.lock-dialog, .confirm')).toHaveCount(0);
});

test('with one profile the switch button is hidden', async ({ page }) => {
  await createProfile(page, 'Sam');
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await expect(page.locator('.parent-screen')).toBeVisible();
  await expect(page.locator('.switch-btn')).toHaveCount(0);
});

test('the parent question shows once on a double click, also while the settings still load', async ({ page }) => {
  await createProfile(page, 'Ema');
  await page.route('**/assets/parent-*.js', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.locator('.map-screen .top-right .round-btn').first().dblclick();
  const dialog = page.locator('.confirm');
  await expect(dialog).toHaveCount(1);
  // The page under the question is the loading look, never blank.
  await expect(page.locator('#app .boot')).toBeVisible();
  await page.waitForTimeout(600);
  await expect(dialog).toHaveCount(1);
  await dialog.getByRole('button', { name: 'Yes, open' }).click();
  await expect(page.locator('.parent-screen')).toBeVisible();
});

test('settings: nickname first and required, name optional, word language, key font, task legends, progress by story', async ({ page }) => {
  await createProfile(page, 'Ema');
  await page.locator('.top-right .round-btn').first().click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('tapkotyper:v1')!).profiles[0]);
  const typist = page.locator('.settings-grid fieldset').first();
  await expect(typist.locator('.field-label').first()).toHaveText(/^(Prezývka|Nickname)$/);
  const nick = typist.locator('.child-summary input');
  await nick.fill(' ');
  await nick.blur();
  await expect(typist.locator('.child-summary .error')).not.toBeEmpty();
  expect((await stored()).companion.name).toBe('Ema');
  const name = page.getByLabel(/^(Meno študenta|Student's name)/);
  await name.fill('Emka');
  await name.blur();
  expect((await stored()).name).toBe('Emka');
  await name.fill('');
  await name.blur();
  expect((await stored()).name).toBe('');
  await page.getByLabel(/^(Jazyk slov|Word language)/).first().selectOption('en');
  expect((await stored()).settings.wordLang).toBe('en');
  await expect(page.locator('body')).toHaveAttribute('data-keyfont', '');
  await page.getByRole('checkbox', { name: /\(l, I, 1\)/ }).uncheck();
  await expect(page.locator('body')).not.toHaveAttribute('data-keyfont');

  await page.locator('.tab[data-tab=task]').click();
  await expect(page.locator('.task-tab legend')).toHaveCount(2);
  for (const legend of await page.locator('.task-tab legend').allTextContents()) expect(legend).not.toContain('task.');

  await page.locator('.tab[data-tab=data]').click();
  await expect(page.locator('.data-tab legend')).toHaveText(['Profiles', 'Tools']);
  await expect(page.locator('.data-tab').getByRole('button', { name: 'Translate the game' })).toBeVisible();
});

test('the gear on the start page opens the settings without a profile; a student picked there opens the rest', async ({ page }) => {
  await createProfile(page, 'Nina');
  await page.goto('./');
  await page.locator('.start-screen .top-right').getByRole('button', { name: 'Settings for parents' }).click();
  await page.locator('.confirm .btn:not(.primary)').last().click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.locator('.parent-screen .tabs .tab')).toHaveCount(2);
  await expect(page.locator('.lock-group')).toBeVisible();
  await page.locator('.switch-btn').click();
  await page.locator('.switch-dialog .profile-card', { hasText: 'Nina' }).click();
  await expect(page.locator('.parent-screen .tabs .tab')).toHaveCount(6);
});
