import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Page, expect, test } from '@playwright/test';
import qrcode from 'qrcode-generator';
import { resultCode } from '../src/share/result';

const result = (name: string, group?: string, title = 'Zvieratá') => ({ taskId: `t-${title}`, title, ...(group && { group }), name, date: '2026-10-21', minutes: 2, accuracy: 90, cpm: 50, weak: [['ô', 70]] as [string, number][] });
const linkOf = async (name: string, group?: string, title?: string) => `http://localhost:4173/tapkotyper/#/result/${await resultCode(result(name, group, title))}`;

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

/** Pastes a result link and waits for the page to answer. */
async function paste(page: Page, link: string, name: string) {
  await page.locator('.teacher-screen form input').fill(link);
  await page.locator('.teacher-screen form .btn.primary').click();
  await expect(page.locator('.teacher-screen [role=status]').first()).toContainText(name);
}

test('a code in front of the camera is added once, as one set', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./#/teacher');
  await page.locator('.scan-start input').fill('6.C');
  await page.locator('.scan-start .btn.primary').click();
  await expect(page.locator('.scan-list li')).toHaveCount(1, { timeout: 20_000 });
  await expect(page.locator('.scan-list li')).toContainText('Ema');
  // Still in front of the camera, but not added again.
  await page.waitForTimeout(1500);
  await expect(page.locator('.scan-list li')).toHaveCount(1);
  await page.locator('.scan-card .btn.primary').click();
  await expect(page.locator('.scan-card')).toHaveCount(0);
  // The scan wrote the child into the group being scanned; its set is open with the writer.
  await expect(page.locator('.group-head')).toContainText('6.C');
  await expect(page.locator('.sets-table .set-row')).toHaveCount(1);
  await expect(page.locator('.sets-table .set-row')).toContainText('zvládli 1 z 1');
  await expect(page.locator('.set-writers tr')).toContainText('Ema');
  expect(errors).toEqual([]);
});

test('groups: links within 20 minutes form one set; filter, assign, export respect the filter; tabs have addresses', async ({ page }) => {
  await page.goto('./#/teacher');
  await expect(page.locator('.teacher-empty')).toContainText('odkaz s výsledkom');
  await paste(page, await linkOf('Ema', '5.A'), 'Ema');
  await paste(page, await linkOf('Eva', '5.A'), 'Eva');
  await paste(page, await linkOf('Adam', '5.B'), 'Adam');
  await paste(page, await linkOf('Zora'), 'Zora');
  await paste(page, await linkOf('Ján'), 'Ján');
  // The same link again adds nothing.
  await paste(page, await linkOf('Ján'), 'Ján');
  await expect(page.locator('.teacher-screen [role=status]').first()).toContainText('už je');
  await expect(page.locator('.chips .chip')).toHaveText(['Všetky', '5.A', '5.B', 'Bez skupiny']);
  await expect(page.locator('.group-head > span:first-child')).toHaveText(['5.A', '5.B', 'Bez skupiny']);
  await expect(page.locator('.group-head').first()).toContainText('1 sada · 2 pisatelia');
  await expect(page.locator('.sets-table .set-row')).toHaveCount(3);

  await page.locator('.chips .chip', { hasText: '5.A' }).click();
  await expect(page.locator('.sets-table .set-row')).toHaveCount(1);
  await expect(page.locator('.sets-table .set-row td').nth(4)).toHaveText('2');
  const csv = async () => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.locator('.teacher-actions .btn').first().click()]);
    return (await import('node:fs/promises')).readFile((await d.path())!, 'utf8');
  };
  expect((await csv()).trim().split('\n')).toHaveLength(3);
  // A click on the day opens the set's writers.
  await page.locator('.set-day').click();
  await expect(page.locator('.set-writers tr')).toHaveText([/Ema/, /Eva/]);

  // The set without a group goes to 5.B, and moves there whole.
  await page.locator('.chips .chip', { hasText: 'Bez skupiny' }).click();
  await page.locator('.sets-table tbody input[type=checkbox]').check();
  page.once('dialog', (d) => void d.accept('5.B'));
  await page.locator('.teacher-actions .btn', { hasText: 'Priradiť' }).click();
  await expect(page.locator('.chips .chip')).toHaveText(['Všetky', '5.A', '5.B']);
  await page.locator('.chips .chip', { hasText: '5.B' }).click();
  await expect(page.locator('.sets-table .set-row')).toHaveCount(2);

  // Each tab has its own address, so Back returns to the one before.
  await page.locator('.tab[data-tab=writers]').click();
  await expect(page).toHaveURL(/#\/teacher\/writers$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/teacher$/);
  await expect(page.locator('.tab[aria-selected=true]')).toHaveAttribute('data-tab', 'groups');
});

test('on a phone the preview and Hotovo are in view with the counter', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/teacher');
  await page.locator('.scan-start input').fill('3.A');
  await page.locator('.scan-start .btn.primary').click();
  await expect(page.locator('.scan-title')).toHaveText('Skenovanie · 3.A');
  await expect(page.locator('.scan-total')).toHaveText('1 načítaný', { timeout: 20_000 });
  await expect(page.locator('.scan-frame')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.scan-done')).toBeInViewport({ ratio: 1 });
  await page.locator('.scan-done .btn.primary').click();
  await expect(page.locator('.scan-card')).toHaveCount(0);
  // The set is a card that opens its own page.
  await page.locator('.group-block .child-row').click();
  await expect(page).toHaveURL(/#\/teacher\/set\//);
  await expect(page.locator('.set-screen h1')).toHaveText('3.A');
  await expect(page.locator('.set-writer-list .child-row')).toContainText('Ema');
  await page.goBack();
  await expect(page.locator('.group-block .child-row')).toHaveCount(1);
});

test('writers: sorting, search and a writer\'s detail with charts, on a computer and on a phone', async ({ page }) => {
  await page.goto('./#/teacher/writers');
  const add = (r: ReturnType<typeof result>) => resultCode(r).then((code) => paste(page, `http://localhost:4173/tapkotyper/#/result/${code}`, r.name));
  await add({ ...result('Ema', '3.A', 'Domáce'), accuracy: 96, cpm: 74 });
  await add({ ...result('Jakub', '3.A', 'Domáce'), accuracy: 81, cpm: 80 });
  await add({ ...result('Adam', '3.A', 'Domáce'), accuracy: 70, cpm: 41 });
  await add({ ...result('Jakub', '3.A', 'Horný rad'), accuracy: 60, cpm: 50, date: '2026-10-22' });
  const names = () => page.locator('.teacher-table tbody .child-link');
  await expect(names()).toHaveText(['Adam', 'Ema', 'Jakub']);
  // Jakub's change from the first hand-in to the last.
  await expect(page.locator('.teacher-table tbody tr', { hasText: 'Jakub' }).locator('.delta')).toHaveText(['−21', '−30']);
  await page.locator('.sort-btn', { hasText: 'Presnosť' }).click();
  await expect(page.locator('th[aria-sort=descending]')).toContainText('Presnosť');
  await expect(names()).toHaveText(['Ema', 'Jakub', 'Adam']);
  await page.locator('.sort-btn', { hasText: 'Presnosť' }).click();
  await expect(names()).toHaveText(['Adam', 'Jakub', 'Ema']);
  await page.locator('.writer-search').fill('jak');
  await expect(names()).toHaveText(['Jakub']);
  await page.locator('.writer-search').fill('');

  // The detail: every hand-in, the change, two charts; Back returns to the same list.
  await page.locator('.teacher-table .child-link', { hasText: 'Jakub' }).click();
  const card = page.locator('.child-screen');
  await expect(card.locator('h1')).toHaveText('Jakub');
  await expect(card.locator('.child-tasks li')).toHaveCount(2);
  await expect(card.locator('.child-tile').first()).toContainText('71 %');
  await expect(card.locator('.child-charts svg')).toHaveCount(2);
  await page.goBack();
  await expect(names()).toHaveText(['Adam', 'Jakub', 'Ema']);

  // A phone: cards with sort chips, the sorted value big on the right.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.teacher-table')).toBeHidden();
  await page.locator('.sort-chips .chip', { hasText: 'Presnosť' }).click();
  await expect(page.locator('.child-row-big')).toHaveText(['96 %', '71 %', '70 %']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('.child-row', { hasText: 'Adam' }).click();
  await page.locator('.child-screen .btn', { hasText: 'Odstrániť pisateľa' }).click();
  await page.locator('.confirm .btn.danger').click();
  await expect(page.locator('.child-row')).toHaveCount(2);
});

test('files: save as .tapko, delete all, load it back, again adds nothing, old results are named', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./#/teacher');
  await paste(page, await linkOf('Ema', '5.A'), 'Ema');
  await paste(page, await linkOf('Eva', '5.A'), 'Eva');
  await page.locator('.tab[data-tab=files]').click();
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('.btn', { hasText: 'Uložiť všetko ako .tapko' }).click()]);
  expect(d.suggestedFilename()).toMatch(/^tapkotyper-\d{4}-\d{2}-\d{2}\.tapko$/);
  const file = (await d.path())!;

  // Vymazať…: every age shows what it would take; all data takes everything.
  await page.locator('.btn', { hasText: 'Vymazať…' }).click();
  await expect(page.locator('.wipe-dialog .radio-card')).toHaveCount(7);
  await page.locator('.wipe-dialog .radio-card', { hasText: 'Všetky údaje' }).click();
  await expect(page.locator('.wipe-dialog .radio-card', { hasText: 'Všetky údaje' })).toContainText('1 sada · 2 výsledky');
  await page.locator('.wipe-dialog .btn.danger').click();
  await expect(page.locator('.wipe-dialog')).toHaveCount(0);
  await page.locator('.tab[data-tab=groups]').click();
  await expect(page.locator('.teacher-empty')).toBeVisible();

  await page.locator('.tab[data-tab=files]').click();
  await page.locator('.teacher-panel input[type=file]').setInputFiles(file);
  await expect(page.locator('.teacher-panel [role=status]')).toContainText('pribudli 2 výsledky');
  await page.locator('.teacher-panel input[type=file]').setInputFiles(file);
  await expect(page.locator('.teacher-panel [role=status]')).toContainText('pribudlo 0 výsledkov');
  await expect(page.locator('.files-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.files-table tbody tr').first()).toContainText('nič nové');
  await page.locator('.tab[data-tab=groups]').click();
  await expect(page.locator('.sets-table .set-row')).toHaveCount(1);

  // Results older than a year are named: they stay 7 days.
  await page.locator('.tab[data-tab=files]').click();
  const old = JSON.stringify({ format: 'tapkotyper-mentor', version: 1, exportedAt: '2025-01-01T00:00:00Z', sets: [], results: [{ ...result('Stará'), date: '2024-01-01', id: 'old1', intact: true, sum: 'x' }] });
  await page.locator('.teacher-panel input[type=file]').setInputFiles({ name: 'old.tapko', mimeType: 'application/x-tapkotyper', buffer: Buffer.from(old) });
  await expect(page.locator('.teacher-panel [role=status]')).toContainText('1 výsledok je starší ako rok. Bude dostupný ešte 7 dní');
  // Another format loads nothing.
  await page.locator('.teacher-panel input[type=file]').setInputFiles({ name: 'x.tapko', mimeType: 'application/json', buffer: Buffer.from('{"format":"other"}') });
  await expect(page.locator('.teacher-panel [role=status]')).toContainText('nie je súbor TapkoTyper');
  expect(errors).toEqual([]);
});
