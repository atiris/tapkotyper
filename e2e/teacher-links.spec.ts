import { expect, test } from '@playwright/test';
import { createProfile, playLevel } from './helpers';

test('a task travels by link to a child, and the result back to the teacher\'s table', async ({ browser }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  const open = async () => {
    const page = await (await browser.newContext()).newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    return page;
  };

  // The parent builds a one-minute practice task.
  const parent = await open();
  await createProfile(parent, 'Ema');
  await parent.locator('.top-right .round-btn').first().click();
  await parent.locator('.confirm .btn:not(.primary)').last().click();
  await parent.locator('.tab[data-tab=task]').click();
  await parent.locator('.task-new input[type=text]').first().fill('Zvieratá');
  await parent.locator('.task-new input[type=text]').nth(1).fill('5.A');
  await parent.locator('.task-new textarea').first().fill('lopta, ruka');
  await parent.locator('.task-new input[type=range]').fill('1');
  await parent.locator('.task-new .btn.primary').first().click();
  const taskLink = await parent.locator('.task-out .link-text').inputValue();
  expect(taskLink).toMatch(/#\/task\/[A-Za-z0-9_-]+$/);
  await expect(parent.locator('.task-out .qr svg')).toBeVisible();

  // A child on another computer opens it as a new player and plays it.
  const child = await open();
  await child.goto(taskLink);
  await expect(child.locator('.task-summary')).toContainText('Zvieratá');
  await child.locator('.profile-card.new').click();
  await child.locator('#np-name').fill('Adam');
  await child.locator('form button[type=submit]').click();
  await child.locator('.map-screen').waitFor();
  await expect(child.locator('.task-card')).toContainText('Zvieratá');
  await child.locator('.task-card .btn.primary').click();
  const typed: string[] = [];
  await playLevel(child, false, typed);
  expect(typed.join('')).toMatch(/lopta|ruka/);
  await expect(child.locator('.results-card .task-line')).toContainText('Zvieratá');
  await child.locator('.results-card .btn.primary').first().click();
  const resultLink = await child.locator('.hand-in .link-text').inputValue();
  expect(resultLink).toMatch(/#\/result\/[A-Za-z0-9_-]+$/);

  // The teacher opens the result link: one row in the table, kept after a reload.
  const teacher = await open();
  await teacher.goto(resultLink);
  await expect(teacher.locator('.teacher-screen [role=status]')).toContainText('Adam');
  await expect(teacher.locator('.teacher-table tbody tr:not(.task-row):not(.group-row)')).toHaveCount(1);
  await expect(teacher.locator('.teacher-table .task-row')).toContainText('Zvieratá');
  await expect(teacher.locator('.teacher-table .group-row')).toContainText('5.A');
  await teacher.reload();
  await expect(teacher.locator('.teacher-table tbody tr:not(.task-row):not(.group-row)')).toHaveCount(1);
  expect(errors).toEqual([]);
});
