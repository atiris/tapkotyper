import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
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

test('a code in front of the camera is added once', async ({ page }) => {
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
  await expect(page.locator('.teacher-table tbody tr:not(.task-row):not(.group-row)')).toHaveCount(1);
  // The scan wrote the child into the group being scanned, with a summary of the group.
  await expect(page.locator('.teacher-table .group-row')).toContainText('6.C');
  await expect(page.locator('.teacher-table .group-row')).toContainText('zvládli 1 z 1');
  expect(errors).toEqual([]);
});

test('groups: filter, assign, export respect the filter', async ({ page }) => {
  await page.goto('./#/teacher');
  await expect(page.locator('.teacher-empty li')).toHaveCount(3);
  for (const link of [await linkOf('Ema', '5.A'), await linkOf('Adam', '5.B'), await linkOf('Zora'), await linkOf('Ján')]) {
    await page.locator('.teacher-screen form input').fill(link);
    await page.locator('.teacher-screen form .btn.primary').click();
    await expect(page.locator('.teacher-screen [role=status]')).toContainText('Pridaný');
  }
  await expect(page.locator('.teacher-count')).toContainText('4 výsledkov');
  await expect(page.locator('.chips .chip')).toHaveText(['Všetky', '5.A', '5.B', 'Bez skupiny']);
  await expect(page.locator('.teacher-table .group-row')).toHaveText([/^5.A/, /^5.B/, /^Bez skupiny/]);

  await page.locator('.chips .chip', { hasText: '5.A' }).click();
  await expect(page.locator('.teacher-table tbody tr:not(.task-row):not(.group-row)')).toHaveCount(1);
  const csv = async () => {
    const [d] = await Promise.all([page.waitForEvent('download'), page.locator('.teacher-actions .btn').first().click()]);
    return (await import('node:fs/promises')).readFile((await d.path())!, 'utf8');
  };
  expect((await csv()).trim().split('\n')).toHaveLength(2);

  // The two without a group go to 5.B.
  await page.locator('.chips .chip', { hasText: 'Bez skupiny' }).click();
  await page.locator('.teacher-table tbody input[type=checkbox]').first().check();
  await page.locator('.teacher-table tbody input[type=checkbox]').last().check();
  page.once('dialog', (d) => void d.accept('5.B'));
  await page.locator('.teacher-actions .btn', { hasText: 'Priradiť' }).click();
  await page.locator('.chips .chip', { hasText: '5.B' }).click();
  await expect(page.locator('.teacher-table tbody tr:not(.task-row):not(.group-row)')).toHaveCount(3);
  await expect(page.locator('.chips .chip')).toHaveText(['Všetky', '5.A', '5.B']);
});
