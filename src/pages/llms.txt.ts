import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ALL_LANGS, LANGUAGES, localizePath } from '../lib/languages';
import { translations } from '../lib/translations';
import { SITE, freeTrialActive, olimOfferActive } from '../lib/site';
import { plainText } from '../lib/richText';

export const prerender = true;

const STATIC_ROUTES = [
  '/',
  '/about',
  '/classes',
  '/schedule',
  '/instructors',
  '/pricing',
  '/hall-rental',
  '/events',
  '/news',
  '/contact',
  '/privacy',
  '/terms',
  '/accessibility',
];

/** '/hall-rental' -> 'hallRental', '/' -> 'home' (the translations key for a route). */
function routeKey(route: string): string {
  return route.replace(/^\//, '').replace(/-(\w)/g, (_, c: string) => c.toUpperCase()) || 'home';
}

// One-line summary after each link: the page's search description, if it has one.
function pageDescription(lang: (typeof ALL_LANGS)[number], route: string): string | undefined {
  const page = translations[lang][routeKey(route) as keyof (typeof translations)['he']] as
    | { metaDescription?: string; metaDescriptionNoOlim?: string }
    | undefined;
  if (!page?.metaDescription) return undefined;
  return route === '/pricing' && !olimOfferActive ? page.metaDescriptionNoOlim : page.metaDescription;
}

/** First ~160 characters of a news post, cut at a word boundary. */
function excerpt(text: string): string {
  const plain = plainText(text).replace(/\s+/g, ' ').trim();
  return plain.length <= 160 ? plain : plain.slice(0, plain.lastIndexOf(' ', 157)) + '…';
}

// Link text for each static route, from the site's own navigation labels.
function pageTitle(lang: (typeof ALL_LANGS)[number], route: string): string {
  const t = translations[lang];
  const key = routeKey(route);
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
  lines.push(`Also known as: ${SITE.alternateNames.join(', ')}.`);
  lines.push('');
  lines.push(`Students come from ${SITE.areaServed.join(', ')}.`);
  lines.push('');
  lines.push(
    'Hall rental: two halls, 135 m² and 32 m², with parquet floors, a sound system, air conditioning and stage lighting — ' +
      'for rehearsals and practice, birthdays and parties, workshops and seminars, and photo or video shoots.'
  );
  lines.push('');
  lines.push(
    'Dance master classes for celebrations, held in the studio: birthdays, bachelorette parties, corporate team building ' +
      'and wedding first dances, in ballroom, Latin or social dance styles.'
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
      const desc = pageDescription(lang, route);
      lines.push(`- [${pageTitle(lang, route)}](${url})${desc ? `: ${desc}` : ''}`);
    }
    for (const post of allNews) {
      const url = `${SITE.siteUrl}${localizePath(lang, `/news/${post.id}`)}`;
      lines.push(`- [${post.data.title[lang]}](${url}): ${excerpt(post.data.body[lang])}`);
    }
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
