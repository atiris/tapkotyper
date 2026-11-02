import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const URL = 'https://tapkotyper.com/';
const html = readFileSync('index.html', 'utf8');
const attr = (pattern: RegExp) => html.match(pattern)?.[1];

describe('SEO metadata', () => {
  it('names one address everywhere', () => {
    expect(attr(/<link rel="canonical" href="([^"]+)"/)).toBe(URL);
    expect(attr(/<meta property="og:url" content="([^"]+)"/)).toBe(URL);
    const json = attr(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(JSON.parse(json ?? '').url).toBe(URL);
  });

  it('points the share picture at an absolute address', () => {
    expect(attr(/<meta property="og:image" content="([^"]+)"/)).toBe(`${URL}og.png`);
  });

  it('gives crawlers the sitemap with the canonical address', () => {
    expect(readFileSync('public/robots.txt', 'utf8')).toContain(`Sitemap: ${URL}sitemap.xml`);
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain(`<loc>${URL}</loc>`);
  });
});
