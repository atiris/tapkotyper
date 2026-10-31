import { expect, test } from '@playwright/test';
import { NEW_PLAYER, playLevel } from './helpers';

test('a task travels by link to a child, and the result back to the teacher\'s table', async ({ browser }) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  const open = async () => {
    const page = await (await browser.newContext()).newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    return page;
  };

  // The teacher makes a one-minute task on the teacher page; it is kept there.
  const parent = await open();
  await parent.goto('./#/teacher/tasks');
  const form = parent.locator('.task-form');
  await form.locator('input[type=text]').first().fill('Zvieratá');
  await form.locator('input[type=text]').nth(1).fill('5.A');
  await form.locator('textarea').first().fill('lopta, ruka');
  await form.locator('input[type=range]').fill('1');
  await form.locator('.btn.primary').first().click();
  const taskLink = await parent.locator('.task-show .link-text').inputValue();
  expect(taskLink).toMatch(/#\/task\/[A-Za-z0-9_-]+$/);
  await expect(parent.locator('.task-show .qr svg')).toBeVisible();
  await parent.keyboard.press('Escape');
  await expect(parent.locator('.made-tasks li')).toContainText('Zvieratá');

  // A child on another computer opens it as a new player and plays it.
  const child = await open();
  await child.goto(taskLink);
  await expect(child.locator('.task-panel')).toContainText('Zvieratá');
  await child.locator(NEW_PLAYER).first().click();
  await child.locator('#np-nick').fill('Adam');
  await child.locator('form button[type=submit]').click();
  await child.locator('.map-screen').waitFor();
  await expect(child.locator('.task-card')).toContainText('Zvieratá');
  await child.locator('.task-card .btn.primary').click();
  const typed: string[] = [];
  await playLevel(child, false, typed);
  expect(typed.join('')).toMatch(/lopta|ruka/);
  // The task is done in this run: the hand-in is the main button and opens the task's own end card.
  await child.locator('.end-card .btn.primary').first().click();
  const handIn = child.locator('.end-card.task-done');
  await expect(handIn.locator('.ec-row', { hasText: 'Task' }).first()).toContainText('Zvieratá');
  const resultLink = await handIn.locator('.link-text').inputValue();
  expect(resultLink).toMatch(/#\/result\/[A-Za-z0-9_-]+$/);

  // The teacher opens the result link: one row in the table, kept after a reload.
  const teacher = await open();
  await teacher.goto(resultLink);
  await expect(teacher.locator('.teacher-screen [role=status]').first()).toContainText('Adam');
  await expect(teacher.locator('.sets-table .set-row')).toHaveCount(1);
  await expect(teacher.locator('.sets-table .set-row')).toContainText('Zvieratá');
  await expect(teacher.locator('.group-head')).toContainText('5.A');
  await teacher.reload();
  await expect(teacher.locator('.sets-table .set-row')).toHaveCount(1);
  // Kept in the mentor's IndexedDB, apart from the players' localStorage.
  expect(await teacher.evaluate(() => new Promise<string[]>((ok) => {
    const req = indexedDB.open('tapkotyper-mentor');
    req.onsuccess = () => {
      const all = req.result.transaction('results').objectStore('results').getAll();
      all.onsuccess = () => ok(all.result.map((r: { name: string }) => r.name));
    };
  }))).toEqual(['Adam']);
  expect(await teacher.evaluate(() => localStorage.getItem('tapkotyper:teacher'))).toBeNull();
  expect(errors).toEqual([]);
});
