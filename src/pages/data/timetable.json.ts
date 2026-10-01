// Serves the uploaded studio timetable (src/data/timetable.json, written by
// the /admin/ panel) at /data/timetable.json, so the in-studio /display/
// screen can poll it and pick up a new upload without being reloaded.
import type { APIRoute } from 'astro';
import timetable from '../../data/timetable.json';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(timetable), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
