// The hidden student app (/student/): what students see of the timetable and
// the calendar feeds they can subscribe to — one per group (class title) and
// one per trainer, each in a version per reminder time.
import { RENTAL_COLUMN, type Timetable, type TimetableItem } from './timetable';
import { slugify, type CalendarEvent } from './calendar';
import { STUDIO_LOCATION, trainersFrom } from './trainers';

/** Reminder choices, in minutes before the class (0 = no reminder). */
export const ALARMS = [0, 15, 60, 180, 1440];

/** "[TRIAL] Kids Beg 4–5" → "Kids Beg 4–5": a trial lesson belongs to its group. */
export const groupOf = (title: string) => title.replace(/^\s*\[[^\]]*\]\s*/, '').trim();

/** Classes and PRACTICE-type blocks, without hall rentals. */
export function studentDays(tt: Timetable) {
  return tt.days
    .filter((d) => d.date)
    .map((d) => ({ date: d.date as string, items: d.items.filter((i) => !RENTAL_COLUMN.test(i.column)) }));
}

export interface Feed {
  slug: string; // "g-kids-beg-4-5", "t-roman"
  name: string;
  match: (i: TimetableItem) => boolean;
}

export function feedsFrom(tt: Timetable): Feed[] {
  const groups = new Set(studentDays(tt).flatMap((d) => d.items.map((i) => groupOf(i.title))));
  return [
    ...[...groups].sort().map((g) => ({ slug: `g-${slugify(g)}`, name: g, match: (i: TimetableItem) => groupOf(i.title) === g })),
    ...trainersFrom(tt).map((t) => ({
      slug: `t-${t.slug}`,
      name: t.name,
      match: (i: TimetableItem) => i.column.split(' · ').some((c) => c.trim() === t.name),
    })),
  ];
}

export function feedEvents(tt: Timetable, feed: Feed): CalendarEvent[] {
  return studentDays(tt).flatMap((d) =>
    d.items.filter(feed.match).map((i) => ({
      date: d.date,
      start: i.start,
      end: i.end,
      title: i.title,
      description: i.column,
      location: STUDIO_LOCATION,
    }))
  );
}
