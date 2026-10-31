import { expect, test } from '@playwright/test';
import { playLevel } from './helpers';

test("the dragon story's hero's journey goes back down to the rocket with a panel between its places, takes off and keeps its stars", async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Short parts, so the five places play in a minute or two.
  await page.goto('./?minActive=3');
  await page.locator('.start-screen').waitFor();
  await page.keyboard.type('supertapkotyper', { delay: 40 });
  const egg = page.locator('.story-dragon .island-egg .level-row');
  await egg.locator('.journey-node').waitFor();
  // The compass comes right after the crown, before the target range and the parrot.
  const nodes = await egg.locator('.level-node').evaluateAll((els) => els.map((e) => e.className));
  expect(nodes.findIndex((c) => c.includes('journey-node'))).toBe(nodes.findIndex((c) => c.includes('super')) + 1);
  expect(nodes.findIndex((c) => c.includes('aim-node'))).toBe(nodes.findIndex((c) => c.includes('journey-node')) + 1);
  await egg.locator('.journey-node').click();
  await expect(page.locator('.hud-title')).toHaveText("Hero's journey");
  await expect(page.locator('.posture-card .posture-under')).toContainText('98 %');
  await expect(page.locator('.posture-card')).toContainText('The little dragon has hatched!');
  // Every panel met on the way shows the next part's world and its story.
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as unknown as { panels: string[] }).panels = seen;
    new MutationObserver(() => {
      const panel = document.querySelector('.journey-panel');
      const pic = panel?.querySelector('.ec-img')?.getAttribute('src')?.replace(/.*ui-map-([a-z]+).*/, '$1');
      if (pic && panel?.querySelector('.ec-text') && seen[seen.length - 1] !== pic) seen.push(pic);
    }).observe(document.body, { childList: true, subtree: true });
  });
  expect(await playLevel(page, false)).toMatch(/%/);
  const panels = await page.evaluate(() => (window as unknown as { panels: string[] }).panels);
  expect(panels).toEqual(['dragons', 'planet', 'planet', 'space']);
  await expect(page.locator('.journey-done h2')).toHaveText("Hero's journey done!");
  const stars = Math.floor(Number((await page.locator('.journey-done .ec-under .stars').getAttribute('aria-label'))!.replace(/\D*([\d.]+).*/, '$1')));
  await page.locator('.end-card .ec-bot .btn').last().click();
  // The node keeps the best stars (the super player's filled progress may have more).
  expect(await egg.locator('.journey-node .mini-stars i.on').count()).toBeGreaterThanOrEqual(stars);
  expect(errors).toEqual([]);
});
