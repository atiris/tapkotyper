import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LANGS } from '../i18n/i18n';
import { SITE, aboutPage, aboutPath, aboutRedirect } from './about-page';

const URL = SITE;
const html = readFileSync('index.html', 'utf8');
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const attr = (page: string, pattern: RegExp) => page.match(pattern)?.[1];
const jsonLd = (page: string) => JSON.parse(attr(page, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/) ?? '');
const pages = LANGS.map((lang) => [lang, aboutPage(lang, JSON.parse(readFileSync(`public/i18n/${lang}.json`, 'utf8')))] as const);

describe('SEO metadata', () => {
  it('names one address everywhere', () => {
    expect(attr(html, /<link rel="canonical" href="([^"]+)"/)).toBe(URL);
    expect(attr(html, /<meta property="og:url" content="([^"]+)"/)).toBe(URL);
    expect(jsonLd(html).url).toBe(URL);
  });

  it('is found by the name Ťapko too', () => {
    expect(attr(html, /<title>([^<]+)<\/title>/)).toContain('Ťapko');
    expect(jsonLd(html).alternateName).toContain('Ťapko');
  });

  it('points the share picture at an absolute address', () => {
    expect(attr(html, /<meta property="og:image" content="([^"]+)"/)).toBe(`${URL}og.png`);
  });

  it('gives crawlers the sitemap with the game and one about page per language', () => {
    expect(readFileSync('public/robots.txt', 'utf8')).toContain(`Sitemap: ${URL}sitemap.xml`);
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([URL, ...LANGS.map((l) => `${URL}${aboutPath(l)}`)]);
  });
});

describe('about pages', () => {
  it.each(pages)('%s: no placeholder is left in the text', (_, page) => {
    expect(page.replace(/<script[\s\S]*?<\/script>|<style>[\s\S]*?<\/style>/g, '')).not.toMatch(/[{}]/);
  });

  it.each(pages)('%s: canonical, hreflang and structured data', (lang, page) => {
    const url = `${URL}${aboutPath(lang)}`;
    expect(attr(page, /<link rel="canonical" href="([^"]+)"/)).toBe(url);
    expect(attr(page, /<meta property="og:url" content="([^"]+)"/)).toBe(url);
    expect(attr(page, /<html lang="([^"]+)"/)).toBe(lang);
    for (const l of LANGS) expect(page).toContain(`<link rel="alternate" hreflang="${l}" href="${URL}${aboutPath(l)}">`);
    expect(page).toContain('hreflang="x-default"');
    for (const l of LANGS) expect(sitemap).toContain(`hreflang="${l}" href="${URL}${aboutPath(l)}"`);
    expect(jsonLd(page).inLanguage).toBe(lang);
  });

  it('the language pick sends to a page and is not indexed', () => {
    const page = aboutRedirect();
    expect(page).toContain('noindex');
    for (const l of LANGS) expect(page).toContain(`href="/${aboutPath(l)}"`);
  });
});
