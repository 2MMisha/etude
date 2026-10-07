import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { localizePath } from '../lib/languages';
import { translations } from '../lib/translations';
import { SITE, freeTrialActive, olimOfferActive } from '../lib/site';
import { plainText } from '../lib/richText';

export const prerender = true;

// Everything an AI assistant needs to answer questions about ETUDE, in one
// file (English). Built from the same copy and content as the pages, so it
// stays current with edits made in /admin/.
export const GET: APIRoute = async () => {
  const t = translations.en;
  const url = (path: string) => `${SITE.siteUrl}${localizePath('en', path)}`;
  const instructors = (await getCollection('instructors')).sort((a, b) => a.data.order - b.data.order);
  const schedule = await getCollection('schedule');
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  schedule.sort((a, b) => DAYS.indexOf(a.data.day) - DAYS.indexOf(b.data.day) || a.data.startTime.localeCompare(b.data.startTime));
  // General FAQ: items[0] is the free trial, items[1] the Olim offer.
  const generalFaq = t.faq.items.filter((_, i) => (i === 0 ? freeTrialActive : i === 1 ? olimOfferActive : true));

  const L: string[] = [];
  const h = (title: string) => L.push('', `## ${title}`, '');
  const qa = (items: readonly { q: string; a: string }[]) => items.forEach((i) => L.push(`- Q: ${i.q}`, `  A: ${i.a}`));

  L.push(`# ${SITE.brandName} Dance School — full reference`);
  L.push('');
  L.push(`> ${t.schemaBusinessDescription}`);
  L.push('');
  L.push(`Also known as: ${SITE.alternateNames.join(', ')}.`);
  L.push(`Address: ${SITE.address.street}, ${SITE.address.city} ${SITE.address.postalCode}, ${SITE.address.country}.`);
  L.push(`Phone / WhatsApp: ${SITE.phoneDisplay}. Email: ${SITE.email}. Instagram: ${SITE.social.instagram}. Map: ${SITE.googleMapsUrl}`);
  L.push(`Open every day, ${SITE.hours.opens}–${SITE.hours.closes}. Students come from ${SITE.areaServed.join(', ')}.`);
  L.push(`Website (Hebrew default, also English and Russian): ${SITE.siteUrl}/he/`);

  h(`Classes (${url('/classes')})`);
  L.push(t.classes.intro);
  t.classes.categories.forEach((c) => L.push(`- ${c.title}: ${c.body}`));
  L.push('', `${t.classes.audiencesTitle}:`);
  t.classes.audiences.forEach((a) => L.push(`- ${a.title}: ${a.body}`));
  L.push('', `${t.classes.levelsTitle}:`);
  t.classes.levels.forEach((l) => L.push(`- ${l.title}: ${l.body}`));

  h(`Weekly schedule (${url('/schedule')})`);
  schedule.forEach((s) => {
    const d = s.data;
    L.push(`- ${d.day[0].toUpperCase()}${d.day.slice(1)} ${d.startTime}–${d.endTime}: ${d.className.en} (${d.level})`);
  });

  h(`Instructors (${url('/instructors')})`);
  instructors.forEach((p) => L.push(`- ${p.data.name.en}: ${p.data.bio.en.replace(/●\s*/g, '').replace(/\s*\n\s*/g, ' ').trim()}`));

  h(`Hall rental (${url('/hall-rental')})`);
  L.push(t.hallRental.intro);
  t.hallRental.halls.forEach((x) => L.push(`- ${x.title}: ${x.body}`));
  L.push(`- Equipment: ${t.hallRental.equipment.join(', ')}.`);
  t.hallRental.uses.forEach((x) => L.push(`- ${x.title}: ${x.body}`));
  L.push(t.hallRental.bookingBody);

  h(`Events and wedding first dance (${url('/events')})`);
  L.push(t.events.intro);
  t.events.occasions.forEach((x) => L.push(`- ${x.title}: ${x.body}`));
  L.push(`- Styles: ${t.events.styles.join(', ')}.`);

  h(`Pricing and registration (${url('/pricing')})`);
  L.push(t.pricing.intro);
  t.pricing.registrationSteps.forEach((s, i) => L.push(`${i + 1}. ${s}`));

  h('Frequently asked questions');
  qa(generalFaq);
  qa(t.classes.faq.items);
  qa(t.hallRental.faq.items);
  qa(t.events.faq.items);

  const news = (await getCollection('news')).sort((a, b) => b.data.date.localeCompare(a.data.date));
  if (news.length) {
    h(`News (${url('/news')})`);
    news.forEach((n) => L.push(`### ${n.data.title.en} (${n.data.date}, ${url(`/news/${n.id}`)})`, '', plainText(n.data.body.en), ''));
  }

  return new Response(L.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
