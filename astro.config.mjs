// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';

// News post dates (src/content/news/<id>.json) — used as <lastmod> for each
// post, and the newest one for the pages that list news.
const newsDates = Object.fromEntries(
  readdirSync('src/content/news')
    .filter((f) => f.endsWith('.json'))
    .map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(`src/content/news/${f}`, 'utf8')).date])
);
// Future-dated posts aren't built yet (src/lib/news.ts), so leave them out.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
const latestNews = Object.values(newsDates).filter((d) => d <= today).sort().pop();

// Relative weight and expected change rate per page (path without language).
const SITEMAP_RULES = [
  { match: /^\/$/, priority: 1.0, changefreq: 'weekly' },
  { match: /^\/(classes|schedule|pricing)\/$/, priority: 0.9, changefreq: 'weekly' },
  { match: /^\/(contact|instructors|about|hall-rental|events)\/$/, priority: 0.8, changefreq: 'monthly' },
  { match: /^\/news\/$/, priority: 0.7, changefreq: 'daily' },
  { match: /^\/news\/[^/]+\/$/, priority: 0.6, changefreq: 'monthly' },
  { match: /^\/(privacy|terms|accessibility)\/$/, priority: 0.3, changefreq: 'yearly' },
];

// https://astro.build/config
export default defineConfig({
  site: 'https://etude.ristar.co',
  output: 'static',
  // Matches how GitHub Pages serves directory-index pages (see localizePath).
  trailingSlash: 'always',
  // Inline the (small) CSS into each page so it doesn't block the first paint.
  build: { inlineStylesheets: 'always' },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'he',
        // Same language-only codes as the pages' <link hreflang> tags (Seo.astro);
        // the two must agree or Google may ignore the pair.
        locales: {
          he: 'he',
          en: 'en',
          ru: 'ru',
        },
      },
      filter: (page) => !page.includes('/admin') && !page.includes('/display') && !page.includes('/trainers') && page !== 'https://etude.ristar.co/',
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/^\/(he|en|ru)(?=\/)/, '');
        const rule = SITEMAP_RULES.find((r) => r.match.test(path));
        if (rule) {
          item.priority = rule.priority;
          item.changefreq = /** @type {any} */ (rule.changefreq);
        }
        // Only real content dates — a build timestamp on every page would make
        // Google ignore <lastmod> altogether.
        const post = path.match(/^\/news\/([^/]+)\/$/);
        const date = post ? newsDates[post[1]] : path === '/' || path === '/news/' ? latestNews : undefined;
        if (date) item.lastmod = new Date(`${date}T00:00:00Z`).toISOString();
        return item;
      },
    }),
  ],
});
