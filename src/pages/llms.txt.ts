import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ALL_LANGS, LANGUAGES, localizePath } from '../lib/languages';
import { translations } from '../lib/translations';
import { SITE, freeTrialActive, olimOfferActive } from '../lib/site';

export const prerender = true;

const STATIC_ROUTES = [
  '/',
  '/about',
  '/classes',
  '/schedule',
  '/instructors',
  '/pricing',
  '/news',
  '/contact',
  '/privacy',
  '/terms',
  '/accessibility',
];

// Link text for each static route, from the site's own navigation labels.
function pageTitle(lang: (typeof ALL_LANGS)[number], route: string): string {
  const t = translations[lang];
  const key = route.replace(/^\//, '') || 'home';
  if (key in t.nav) return t.nav[key as keyof typeof t.nav];
  if (key in t.common) return t.common[key as keyof typeof t.common] as string;
  return key;
}

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
  const promoParts: string[] = [];
  if (freeTrialActive) {
    promoParts.push('the first group trial class is free');
  }
  if (olimOfferActive) {
    promoParts.push('new immigrants (Olim) get special subscription terms — contact the studio for details');
  }
  if (promoParts.length) {
    lines.push(`Current offers: ${promoParts.join('; ')}.`);
    lines.push('');
  }
  lines.push('The site is available in three languages: Hebrew (default), English, and Russian, at the paths below.');
  lines.push('');

  for (const lang of ALL_LANGS) {
    lines.push(`## ${LANGUAGES[lang].label} (${lang})`);
    lines.push('');
    for (const route of STATIC_ROUTES) {
      const url = `${SITE.siteUrl}${localizePath(lang, route)}`;
      lines.push(`- [${pageTitle(lang, route)}](${url})`);
    }
    for (const post of allNews) {
      const url = `${SITE.siteUrl}${localizePath(lang, `/news/${post.id}`)}`;
      lines.push(`- [${post.data.title[lang]}](${url})`);
    }
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
