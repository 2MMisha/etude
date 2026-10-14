// /student/cal/events-<lang>.ics — every studio event from /admin/ ("Students'
// app" → Events), subscribable from the app; a reminder a day before each one.
import type { APIRoute, GetStaticPaths } from 'astro';
import { buildIcs } from '../../../lib/calendar';
import { STUDIO_LOCATION } from '../../../lib/trainers';
import { appEvents } from '../../../lib/student';
import { ALL_LANGS, type Lang } from '../../../lib/languages';

const NAME = { he: 'אירועי ETUDE', en: 'ETUDE events', ru: 'События ETUDE' };

export const getStaticPaths: GetStaticPaths = () => ALL_LANGS.map((lang) => ({ params: { lang } }));

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const events = appEvents().map((e) => ({
    date: e.date,
    start: e.start || '00:00',
    end: e.end || e.start || '00:00',
    allDay: !e.start,
    title: e.title[lang],
    description: e.text[lang],
    location: e.place || STUDIO_LOCATION,
    alarms: [1440],
  }));
  return new Response(buildIcs(events, NAME[lang]), { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
