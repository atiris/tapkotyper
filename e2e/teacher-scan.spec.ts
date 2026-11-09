import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';
import qrcode from 'qrcode-generator';
import { resultCode } from '../src/share/result';

const result = (name: string, group?: string, title = 'Zvieratá') => ({ taskId: `t-${title}`, title, ...(group && { group }), name, date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [['ô', 70]] as [string, number][] });
const linkOf = async (name: string, group?: string, title?: string) => `http://localhost:4173/#/result/${await resultCode(result(name, group, title))}`;

/** A y4m video (the fake camera feed) of white frames holding one QR code per link, side by side. */
function qrVideo(file: string, links: string[], width: number, height: number): void {
  const luma = Buffer.alloc(width * height, 255);
  const slot = Math.floor(width / links.length);
  links.forEach((link, n) => {
    const code = qrcode(0, 'L');
    code.addData(link, 'Byte');
    code.make();
    const size = code.getModuleCount();
    const quiet = 4;
    const scale = Math.floor(Math.min(slot, height) / (size + 2 * quiet));
    const x0 = n * slot + Math.floor((slot - scale * size) / 2);
    const y0 = Math.floor((height - scale * size) / 2);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (!code.isDark(r, c)) continue;
      for (let y = 0; y < scale; y++) luma.fill(0, (y0 + r * scale + y) * width + x0 + c * scale, (y0 + r * scale + y) * width + x0 + (c + 1) * scale);
    }
  });
  const chroma = Buffer.alloc((width / 2) * (height / 2) * 2, 128);
  const frame = Buffer.concat([Buffer.from('FRAME\n'), luma, chroma]);
  writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(frame)]));
}

const dir = join(tmpdir(), 'tapkotyper-e2e-qr');
mkdirSync(dir, { recursive: true });
const feed = join(dir, 'one.y4m');
qrVideo(feed, [await linkOf('Ema', '5.A')], 640, 480);

test.use({
  locale: 'sk-SK',
  permissions: ['camera'],
  launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${feed}`] },
});

/** Pastes result links on the link page, each answered in the list or the message. */
async function paste(page: Page, ...links: string[]) {
  if (!page.url().includes('#/teacher/link')) await page.goto('./#/teacher/link');
  for (const link of links) {
    const before = await page.locator('.scan-list li').count();
    await page.locator('#link-input').fill(link);
    await page.getByRole('button', { name: 'Spracovať' }).click();
    await expect(async () => {
      expect((await page.locator('.scan-list li').count()) > before || /už je/.test(await page.locator('#link-msg').innerText())).toBe(true);
    }).toPass();
  }
}

test('a code in front of the camera is added once, and Hotovo shows its students', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./#/teacher');
  await page.getByRole('button', { name: 'Naskenovať QR' }).click();
  await expect(page).toHaveURL(/#\/teacher\/scan$/);
  await expect(page.locator('.scan-list li')).toHaveCount(1, { timeout: 20_000 });
  await expect(page.locator('.scan-list li')).toContainText('Ema');
  await expect(page.locator('.scan-count')).toHaveText('1 načítaný');
  // Still in front of the camera, but not added again.
  await page.waitForTimeout(1500);
  await expect(page.locator('.scan-list li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Hotovo' }).click();
  // The new student joined the task's group; the students of this scan are in view.
  await expect(page).toHaveURL(/#\/teacher\/eval\/students$/);
  await expect(page.locator('.teacher-toolbar select')).toHaveValue('5.A');
  await expect(page.locator('.writers-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.writers-table tbody tr')).toContainText('Ema');
  await page.locator('.teacher-sub button', { hasText: 'Skupiny' }).click();
  await expect(page.locator('.sets-table .set-row')).toHaveCount(1);
  await expect(page.locator('.sets-table .set-row')).toContainText('zvládli 1 z 1');
  // Výsledky lists it among the newest, under its group.
  await page.locator('.teacher-top button', { hasText: 'Výsledky' }).click();
  await expect(page.locator('.recent-group')).toContainText('Skupina 5.A');
  await expect(page.locator('.recent-row')).toContainText('Ema');
  expect(errors).toEqual([]);
});

test('groups: links within 20 minutes form one set; the filter and the export follow it; parts have addresses', async ({ page }) => {
  await page.goto('./#/teacher');
  await expect(page.locator('.recent-none')).toBeVisible();
  await paste(page, await linkOf('Ema', '5.A'), await linkOf('Eva', '5.A'), await linkOf('Adam', '5.B'), await linkOf('Zora'), await linkOf('Ján'));
  await expect(page.locator('.scan-list li')).toHaveCount(5);
  // The same link again adds nothing; a bad one says so and the field empties.
  await paste(page, await linkOf('Ján'));
  await expect(page.locator('#link-msg')).toContainText('už je');
  await page.locator('#link-input').fill('nič');
  await page.getByRole('button', { name: 'Spracovať' }).click();
  await expect(page.locator('#link-msg')).toHaveText('Odkaz je nesprávny, nepodarilo sa ho spracovať.');
  await expect(page.locator('#link-input')).toHaveValue('');
  // One result taken back.
  await page.locator('.scan-list li', { hasText: 'Zora' }).getByRole('button', { name: 'Zrušiť tento výsledok' }).click();
  await expect(page.locator('.scan-list li')).toHaveCount(4);
  await page.getByRole('button', { name: 'Hotovo' }).click();

  await page.locator('.teacher-sub button', { hasText: 'Skupiny' }).click();
  const filter = page.locator('.teacher-toolbar select');
  await expect(filter.locator('option')).toHaveText(['Všetky skupiny', '5.A', '5.B', 'Bez skupiny']);
  await expect(page.locator('.sets-table .set-row')).toHaveCount(3);
  await filter.selectOption('5.A');
  await expect(page.locator('.sets-table .set-row')).toHaveCount(1);
  await expect(page.locator('.sets-table .set-row td').nth(4)).toHaveText('2');
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('.teacher-toolbar .btn', { hasText: 'Stiahnuť CSV' }).click()]);
  expect((await (await import('node:fs/promises')).readFile((await d.path())!, 'utf8')).trim().split('\n')).toHaveLength(3);
  // A click on the row opens the set's students.
  await page.locator('.sets-table .set-row').click();
  await expect(page.locator('.set-writers tr')).toHaveText([/Ema/, /Eva/]);

  // Each part has its own address, so Back returns to the one before.
  await page.locator('.teacher-sub button', { hasText: 'Študenti' }).click();
  await expect(page).toHaveURL(/#\/teacher\/eval\/students$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/teacher\/eval\/groups$/);
  await expect(page.locator('.teacher-sub button[aria-current=page]')).toHaveText('Skupiny');
  // The tabs' old addresses still lead to their parts.
  await page.goto('./#/teacher/writers');
  await expect(page.locator('.teacher-sub button[aria-current=page]')).toHaveText('Študenti');
});

test('on a phone the scan fills the screen: the camera, the list and the buttons in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/teacher');
  await page.getByRole('button', { name: 'QR sken' }).click();
  await expect(page.locator('.teacher-screen > .bar')).toBeHidden();
  await expect(page.locator('.scan-count')).toHaveText('1 načítaný', { timeout: 20_000 });
  await expect(page.locator('.scan-frame')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.scan-actions')).toBeInViewport({ ratio: 1 });
  const frame = (await page.locator('.scan-frame').boundingBox())!;
  expect(frame.y + frame.height).toBeLessThanOrEqual(844 * 0.6);
  // Zrušiť asks, then takes the scan back.
  await page.getByRole('button', { name: 'Zrušiť', exact: true }).click();
  await page.locator('.confirm .btn.danger').click();
  await expect(page).toHaveURL(/#\/teacher$/);
  await expect(page.locator('.recent-none')).toBeVisible();

  // Scanned again and done: a set is a row that opens its own page, closed by its X.
  await page.getByRole('button', { name: 'QR sken' }).click();
  await expect(page.locator('.scan-count')).toHaveText('1 načítaný', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Hotovo' }).click();
  await page.locator('.teacher-sub button', { hasText: 'Skupiny' }).click();
  await page.locator('.teacher-rows .teacher-row').click();
  await expect(page).toHaveURL(/#\/teacher\/set\//);
  await expect(page.locator('.own-head h1')).toHaveText('Zvieratá');
  await expect(page.locator('.teacher-rows .teacher-row')).toContainText('Ema');
  await page.locator('.own-head .modal-x').click();
  await expect(page).toHaveURL(/#\/teacher\/eval\/groups$/);
});

test('students: sorting, search, moving ticked ones into a new group, and a card with charts on a computer and a phone', async ({ page }) => {
  await page.goto('./#/teacher');
  const codes = await Promise.all([
    resultCode({ ...result('Ema', '3.A', 'Domáce'), accuracy: 96, cpm: 74 }),
    resultCode({ ...result('Jakub', '3.A', 'Domáce'), accuracy: 81, cpm: 80 }),
    resultCode({ ...result('Adam', '3.A', 'Domáce'), accuracy: 70, cpm: 41 }),
    resultCode({ ...result('Jakub', '3.A', 'Horný rad'), accuracy: 60, cpm: 50, date: '2026-10-22' }),
  ]);
  await paste(page, ...codes.map((c) => `http://localhost:4173/#/result/${c}`));
  await page.getByRole('button', { name: 'Hotovo' }).click();
  await page.locator('.teacher-toolbar select').selectOption({ label: 'Všetky skupiny' });
  const names = () => page.locator('.writers-table tbody .child-link');
  await expect(names()).toHaveText(['Adam', 'Ema', 'Jakub']);
  await page.locator('.sort-btn', { hasText: 'Presnosť' }).click();
  await expect(page.locator('th[aria-sort=descending]')).toContainText('Presnosť');
  await expect(names()).toHaveText(['Ema', 'Jakub', 'Adam']);
  await page.locator('.sort-btn', { hasText: 'Presnosť' }).click();
  await expect(names()).toHaveText(['Adam', 'Jakub', 'Ema']);
  await page.locator('.writer-search').fill('jak');
  await expect(names()).toHaveText(['Jakub']);
  await page.locator('.writer-search').fill('');

  // Two ticked students move into a group named in a small dialog.
  await page.locator('.writers-table tbody tr', { hasText: 'Adam' }).locator('input[type=checkbox]').check();
  await page.locator('.writers-table tbody tr', { hasText: 'Ema' }).locator('input[type=checkbox]').check();
  await expect(page.locator('.move-bar')).toContainText('Vybraní: 2');
  await page.locator('.move-bar select').first().selectOption({ label: 'Nová skupina…' });
  await page.locator('.move-bar .btn.primary').click();
  await page.locator('.teacher-dialog input').fill('4.B');
  await page.keyboard.press('Enter');
  await expect(page.locator('.writers-table tbody tr', { hasText: 'Adam' })).toContainText('4.B');
  await expect(page.locator('.writers-table tbody tr', { hasText: 'Jakub' })).toContainText('3.A');

  // The card: every hand-in, the tiles, two charts; Back returns to the same list.
  await page.locator('.writers-table .child-link', { hasText: 'Jakub' }).click();
  await expect(page.locator('.crumbs h2')).toHaveText('Jakub');
  await expect(page.locator('.student-hand-ins tbody tr')).toHaveCount(2);
  await expect(page.locator('.child-tile').first()).toContainText('71 %');
  await expect(page.locator('.student-trend svg')).toHaveCount(2);
  await page.goBack();
  await expect(names()).toHaveText(['Adam', 'Jakub', 'Ema']);

  // A phone: rows; the card is a page of its own with the name and a round X, Esc closes it.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.teacher-table')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.teacher-rows .teacher-row', { hasText: 'Adam' }).click();
  await expect(page.locator('.phone-head h1')).toHaveText('Adam');
  await expect(page.locator('.crumbs')).toBeHidden();
  await expect(page.locator('.teacher-top')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/#\/teacher\/eval\/students$/);

  // Opened from the list, a reload still closes back to it.
  await page.locator('.teacher-rows .teacher-row', { hasText: 'Adam' }).click();
  await expect(page.locator('.phone-head h1')).toHaveText('Adam');
  const card = new URL(page.url()).hash;
  await page.reload();
  await page.locator('.phone-head .modal-x').click();
  await expect(page).toHaveURL(/#\/teacher\/eval\/students$/);
  // Reached by its address after leaving the page, the X opens the list instead of going back out.
  await page.getByRole('button', { name: 'Späť' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.evaluate((hash) => { location.hash = hash; }, card);
  await page.locator('.phone-head .modal-x').click();
  await expect(page).toHaveURL(/#\/teacher\/eval\/students$/);
});

test('data: export as tt-….tapko, delete all, import it back, again adds nothing; a deleted file takes its results; groups merge', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./#/teacher');
  await paste(page, await linkOf('Ema', '5.A'), await linkOf('Eva', '5a'), await linkOf('Ivo', '6.B'));
  await page.goto('./#/teacher/eval/data');
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export výsledkov' }).click()]);
  expect(d.suggestedFilename()).toMatch(/^tt-\d{14}\.tapko$/);
  const file = (await d.path())!;

  await page.getByRole('button', { name: 'Zmazať všetky dáta' }).click();
  await page.locator('.teacher-dialog .btn.critical').click();
  await page.locator('.teacher-top button', { hasText: 'Výsledky' }).click();
  await expect(page.locator('.recent-none')).toBeVisible();

  await page.goto('./#/teacher/eval/data');
  await page.getByRole('button', { name: 'Import výsledkov' }).click();
  await expect(page).toHaveURL(/#\/teacher\/eval\/import$/);
  await page.locator('.drop-zone input[type=file]').setInputFiles(file);
  await expect(page.locator('.teacher-note')).toHaveText(/je v poriadku, výsledky sú načítané/);
  await page.locator('.drop-zone input[type=file]').setInputFiles(file);
  await expect(page.locator('.teacher-note')).toHaveText(/je v poriadku/);
  await page.goto('./#/teacher/eval/files');
  await expect(page.locator('.files-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.files-table tbody tr').first()).toContainText('nič nové');
  // "5a" joined "5.A" when it came in.
  await page.goto('./#/teacher/eval/students');
  await expect(page.locator('.writers-table tbody tr', { hasText: 'Eva' })).toContainText('5.A');

  // Merging 6.B into 5.A leaves one group.
  await page.goto('./#/teacher/eval/data');
  await page.getByRole('button', { name: 'Zlúčiť skupiny' }).click();
  await page.locator('.teacher-dialog select').first().selectOption('6.B');
  await page.locator('.teacher-dialog select').nth(1).selectOption('5.A');
  await page.locator('.teacher-dialog .btn.primary').click();
  await page.goto('./#/teacher/eval/groups');
  await expect(page.locator('.teacher-toolbar select option')).toHaveText(['Všetky skupiny', '5.A']);

  // Both files deleted: what came only from them goes.
  for (let i = 0; i < 2; i++) {
    await page.goto('./#/teacher/eval/data');
    await page.getByRole('button', { name: 'Zmazať súbory' }).click();
    await page.locator('.teacher-dialog .btn.danger').click();
  }
  await page.goto('./#/teacher');
  await expect(page.locator('.recent-none')).toBeVisible();

  // Another format loads nothing.
  await page.goto('./#/teacher/eval/import');
  await page.locator('.drop-zone input[type=file]').setInputFiles({ name: 'x.tapko', mimeType: 'application/json', buffer: Buffer.from('{"format":"other"}') });
  await expect(page.locator('.teacher-note')).toContainText('nie je súbor TapkoTyper');
  expect(errors).toEqual([]);
});
