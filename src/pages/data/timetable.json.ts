// Serves the studio timetable (from the Google Sheet, see lib/loadTimetable.ts)
// at /data/timetable.json, so the in-studio /display/ screen can poll it and
// pick up changes after each scheduled rebuild without being reloaded.
import type { APIRoute } from 'astro';
import { getTimetable } from '../../lib/loadTimetable';

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getTimetable()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
