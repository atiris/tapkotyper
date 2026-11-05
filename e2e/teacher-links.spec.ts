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

  // The teacher makes a task on the teacher page that ends when its words are typed, with every letter of them taught first; it is kept there.
  const parent = await open();
  await parent.goto('./#/teacher/tasks/new');
  const form = parent.locator('.task-form');
  await form.locator('input[type=text]').first().fill('Zvieratá');
  await form.locator('select').first().selectOption({ label: 'New group…' });
  await parent.locator('.teacher-dialog input').fill('5.A');
  await parent.keyboard.press('Enter');
  await expect(form.locator('select').first()).toHaveValue('5.A');
  await form.locator('textarea').first().fill('lopta, ruka');
  await form.getByRole('group', { name: 'Limit' }).getByRole('button', { name: 'Text', exact: true }).click();
  await form.locator('.switch-field input[type=checkbox]').nth(1).uncheck();
  await form.getByRole('button', { name: 'Save as a new task' }).click();
  // Saving opens the task beside the prepared ones: its QR code and its link.
  await expect(parent).toHaveURL(/#\/teacher\/task\//);
  await expect(parent.locator('.task-open .qr svg')).toBeVisible();
  const taskLink = await parent.locator('.task-open textarea').inputValue();
  expect(taskLink).toMatch(/#\/task\/[A-Za-z0-9_-]+$/);
  await parent.keyboard.press('Escape');
  await expect(parent.locator('.ready-table tbody tr')).toContainText('Zvieratá');

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
  expect(typed.join('')).toContain('lopta');
  expect(typed.join('')).toContain('ruka');
  // The task is done in this run: the hand-in is the main button and opens the task's own end card.
  await child.locator('.end-card .btn.primary').first().click();
  const handIn = child.locator('.end-card.task-done');
  await expect(handIn.locator('.ec-row', { hasText: 'Task' }).first()).toContainText('Zvieratá');
  const resultLink = await handIn.locator('.link-text').inputValue();
  expect(resultLink).toMatch(/#\/result\/[A-Za-z0-9_-]+$/);

  // The teacher opens the result link: the result is among the newest, in the task's group, kept after a reload.
  const teacher = await open();
  await teacher.goto(resultLink);
  await expect(teacher.locator('.teacher-msg')).toContainText('Adam');
  await expect(teacher.locator('.recent-group')).toContainText('5.A');
  await expect(teacher.locator('.recent-row')).toHaveCount(1);
  await expect(teacher.locator('.recent-row')).toContainText('Zvieratá');
  await teacher.reload();
  await expect(teacher.locator('.recent-row')).toHaveCount(1);
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
