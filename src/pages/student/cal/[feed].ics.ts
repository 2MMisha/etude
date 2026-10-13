// /student/cal/<feed>-<minutes>.ics — subscribable calendar of one group or
// trainer for the student app, with a reminder <minutes> before each class.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getTimetable } from '../../../lib/loadTimetable';
import { buildIcs } from '../../../lib/calendar';
import { ALARMS, feedEvents, feedsFrom } from '../../../lib/student';

export const getStaticPaths: GetStaticPaths = async () => {
  const tt = await getTimetable();
  return feedsFrom(tt).flatMap((f) => ALARMS.map((m) => ({ params: { feed: `${f.slug}-${m}` }, props: { slug: f.slug, alarm: m } })));
};

export const GET: APIRoute = async ({ props }) => {
  const tt = await getTimetable();
  const feed = feedsFrom(tt).find((f) => f.slug === props.slug)!;
  return new Response(buildIcs(feedEvents(tt, feed), `ETUDE — ${feed.name}`, props.alarm as number), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
