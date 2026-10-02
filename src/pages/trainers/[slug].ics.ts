// Subscribable calendar feed per trainer (/trainers/<slug>.ics) and for the
// whole studio (/trainers/all.ics). Calendar apps re-fetch it periodically, so
// changes in the Google Sheet reach subscribers after the next site rebuild.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getTimetable } from '../../lib/loadTimetable';
import { ALL_SLUG, eventsFor, trainersFrom } from '../../lib/trainers';
import { buildIcs } from '../../lib/calendar';

export const getStaticPaths: GetStaticPaths = async () => {
  const tt = await getTimetable();
  return [
    { params: { slug: ALL_SLUG }, props: { name: 'ETUDE' } },
    ...trainersFrom(tt).map((t) => ({ params: { slug: t.slug }, props: { name: `ETUDE — ${t.name}` } })),
  ];
};

export const GET: APIRoute = async ({ params, props }) => {
  const tt = await getTimetable();
  return new Response(buildIcs(eventsFor(tt, params.slug as string), props.name as string), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
