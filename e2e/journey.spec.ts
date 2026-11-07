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
  // The compass is a badge at the bottom right of the story's last island; the level row has no journey node.
  const badge = page.locator('.story-dragon .island-egg .island-art .journey-badge');
  await badge.waitFor();
  await expect(egg.locator('.journey-node')).toHaveCount(0);
  await expect(page.locator('.story-dragon .journey-badge')).toHaveCount(1);
  await expect(badge).toHaveAttribute('data-tip', /Bronze for 1 ★, silver for 3 ★, gold for 5 ★/);
  await badge.click();
  await expect(page.locator('.hud-title')).toHaveText("Hero's journey");
  await expect(page.locator('.posture-card .posture-under')).toContainText('five stars need almost no mistakes');
  await expect(page.locator('.posture-card')).toContainText('The little dragon has hatched and wants to stay with you!');
  // Every panel met on the way shows the next part's world and its story.
  await page.evaluate(() => {
    const seen: string[] = [];
    const met = new WeakSet<Element>();
    (window as unknown as { panels: string[] }).panels = seen;
    new MutationObserver(() => {
      const panel = document.querySelector('.journey-panel');
      const pic = panel?.querySelector('.ec-img')?.getAttribute('src')?.replace(/.*ui-map-([a-z]+).*/, '$1');
      if (!panel || !pic || met.has(panel) || !panel.querySelector('.ec-text')) return;
      met.add(panel);
      seen.push(pic);
    }).observe(document.body, { childList: true, subtree: true });
  });
  expect(await playLevel(page, false)).toMatch(/%/);
  const panels = await page.evaluate(() => (window as unknown as { panels: string[] }).panels);
  expect(panels).toEqual(['dragons', 'planet', 'planet', 'space']);
  await expect(page.locator('.journey-done h2')).toHaveText("Hero's journey done!");
  const stars = Math.floor(Number((await page.locator('.journey-done .ec-under .stars').getAttribute('aria-label'))!.replace(/\D*([\d.]+).*/, '$1')));
  await page.locator('.end-card .ec-bot .btn').last().click();
  await badge.waitFor();
  // The badge's tier follows the best stars (the super player's filled progress may have more): bronze 1, silver 3, gold 5.
  const order = ['bronze', 'silver', 'gold'];
  const cls = (await badge.getAttribute('class'))!;
  expect(order.findIndex((x) => cls.includes(x))).toBeGreaterThanOrEqual(stars >= 5 ? 2 : stars >= 3 ? 1 : 0);
  expect(errors).toEqual([]);
});
