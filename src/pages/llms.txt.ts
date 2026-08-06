import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ALL_LANGS, LANGUAGES, localizePath } from '../lib/languages';
import { translations } from '../lib/translations';
import { SITE } from '../lib/site';

export const prerender = true;

const STATIC_ROUTES = [
  '/',
  '/about',
  '/classes',
  '/schedule',
  '/instructors',
  '/gallery',
  '/pricing',
  '/news',
  '/contact',
];

export const GET: APIRoute = async () => {
  const allNews = await getCollection('news');

  const lines: string[] = [];
  lines.push(`# ${SITE.brandNameLocalized.en} (${SITE.brandNameLocalized.he} / ${SITE.brandNameLocalized.ru})`);
  lines.push('');
  lines.push(`> ${translations.en.schemaBusinessDescription}`);
  lines.push('');
  lines.push(
    `${SITE.brandNameLocalized.en} is a ballroom and Latin dance school located at ${SITE.address.street}, ${SITE.address.city}, ${SITE.address.country}. ` +
      `Phone/WhatsApp: ${SITE.phoneDisplay}. Email: ${SITE.email}. Open every day, ${SITE.hours.opens}–${SITE.hours.closes}. ` +
      `Instagram: ${SITE.social.instagram}.`
  );
  lines.push('');
  lines.push('The site is available in three languages: Hebrew (default), English, and Russian, at the paths below.');
  lines.push('');

  for (const lang of ALL_LANGS) {
    lines.push(`## ${LANGUAGES[lang].label} (${lang})`);
    lines.push('');
    for (const route of STATIC_ROUTES) {
      const url = `${SITE.siteUrl}${localizePath(lang, route)}`;
      lines.push(`- ${url}`);
    }
    for (const post of allNews) {
      const url = `${SITE.siteUrl}${localizePath(lang, `/news/${post.id}`)}`;
      lines.push(`- ${url} — ${post.data.title[lang]}`);
    }
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
