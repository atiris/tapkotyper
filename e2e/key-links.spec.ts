import { expect, test } from '@playwright/test';
import { createProfile } from './helpers';

test("a key's statistics have a link: from a closed world's missing keys, its keyboard and the address", async ({ page }) => {
  await createProfile(page, 'Ola');
  await page.locator('.island.locked .island-art').first().click();
  const missing = page.locator('.world-keys-panel p.wk-missing');
  await expect(missing).toBeVisible();
  // The keys stand in the sentence's own line, as links.
  const first = missing.locator('a.key-cap').first();
  const key = (await first.textContent())!;
  const top = async (sel: string) => (await page.locator(sel).first().boundingBox())!.y;
  expect(Math.abs((await top('.wk-missing b')) - (await top('.wk-missing a.key-cap'))) < 12).toBe(true);
  await first.click();
  await expect(page.locator('.progress-screen')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/progress/keys/${encodeURIComponent(key)}$`));
  await expect(page.locator('.progress-screen .tab[data-tab=keys]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.progress-screen .key-detail .big-key')).toHaveText(key);
  await expect(page.locator('.heatmap .kb-key.selected')).toHaveCount(1);

  // Another key picked on the page moves the address; the whole keyboard drops the key from it.
  await page.locator('.heatmap .kb-key', { hasText: /^k$/i }).first().click();
  const other = (await page.locator('.progress-screen .key-detail .big-key').textContent())!;
  expect(other).toBe('k');
  await expect(page).toHaveURL(new RegExp(`/progress/keys/${encodeURIComponent(other)}$`));
  await page.reload();
  await expect(page.locator('.progress-screen .key-detail .big-key')).toHaveText(other);
  await page.locator('.kb-slots .kb-tool').last().click();
  await expect(page).toHaveURL(/\/progress\/keys$/);
  await page.locator('.progress-screen .tab[data-tab=progress]').click();
  await expect(page).toHaveURL(/\/progress$/);

  // A key of the world's keyboard opens its statistics too.
  await page.locator('.progress-screen .bar .btn.ghost').first().click();
  await page.locator('.island.locked .island-art').first().click();
  await page.locator('.world-kb .kb-key[data-stat].wk-need').first().click();
  await expect(page).toHaveURL(/\/progress\/keys\/[^/]+$/);
  await expect(page.locator('.progress-screen .key-detail .big-key')).toBeVisible();
});
