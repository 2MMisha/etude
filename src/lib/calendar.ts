// "Add to calendar" helpers for the timetable: iCalendar (.ics) files and
// Google Calendar links. Shared by the build-time .ics feeds
// (/trainers/<slug>.ics — subscribable, they update with every site rebuild)
// and the trainer page's per-class buttons in the browser.
//
// All times are studio-local (Asia/Jerusalem), so a class at 18:00 stays at
// 18:00 for anyone, wherever their phone thinks it is, across DST changes.

export const STUDIO_TZ = 'Asia/Jerusalem';

export interface CalendarEvent {
  date: string; // "2026-10-05"
  start: string; // "18:00"
  end: string; // "19:00"
  title: string;
  description?: string;
  location?: string;
}

/** URL-safe id for a timetable column label: "Small Hall (rent)" → "small-hall-rent". */
export function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'column'
  );
}

const stamp = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

/** Fold lines at 75 octets as RFC 5545 asks (some calendar apps reject longer lines). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n ');
}

// Israel: summer time from the Friday before the last Sunday of March (02:00),
// back on the last Sunday of October (02:00).
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${STUDIO_TZ}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0300',
  'TZNAME:IDT',
  'DTSTART:19700327T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=FR;BYMONTHDAY=23,24,25,26,27,28,29',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0300',
  'TZOFFSETTO:+0200',
  'TZNAME:IST',
  'DTSTART:19701025T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

function eventUid(e: CalendarEvent): string {
  return `${e.date}-${e.start.replace(':', '')}-${slugify(e.title)}-${slugify(e.description || '')}@etude.ristar.co`;
}

/** A complete .ics calendar for the given events. */
export function buildIcs(events: CalendarEvent[], calendarName: string): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ETUDE Dance School//Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    `X-WR-TIMEZONE:${STUDIO_TZ}`,
    // Ask subscribed calendars to re-check every few hours.
    'REFRESH-INTERVAL;VALUE=DURATION:PT4H',
    'X-PUBLISHED-TTL:PT4H',
    ...VTIMEZONE,
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${eventUid(e)}`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${STUDIO_TZ}:${stamp(e.date, e.start)}`,
      `DTEND;TZID=${STUDIO_TZ}:${stamp(e.date, e.end)}`,
      `SUMMARY:${escapeIcs(e.title)}`
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeIcs(e.description)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcs(e.location)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** "Add to Google Calendar" link for one event. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(e.date, e.start)}/${stamp(e.date, e.end)}`,
    ctz: STUDIO_TZ,
  });
  if (e.description) params.set('details', e.description);
  if (e.location) params.set('location', e.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
