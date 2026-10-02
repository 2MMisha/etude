// Trainers = the teacher columns of the timetable sheet; halls = the rental
// columns ("Big Hall (rent)" …). Each gets its own schedule page, print and
// calendar feed. A class merged across two columns belongs to both.
import { RENTAL_COLUMN, type Timetable, type TimetableItem } from './timetable';
import { slugify, type CalendarEvent } from './calendar';
import { SITE } from './site';

export interface Trainer {
  slug: string;
  name: string; // exactly as typed in the sheet
}

/** "all" = the whole studio (every column, rentals included). */
export const ALL_SLUG = 'all';
/** "rentals" = every rental column together. */
export const RENTALS_SLUG = 'rentals';

export const STUDIO_LOCATION = `ETUDE, ${SITE.address.street}, ${SITE.address.city}`;

const columnsOf = (item: TimetableItem) => item.column.split(' · ').map((c) => c.trim()).filter(Boolean);

function columnsFrom(tt: Timetable, rentals: boolean): Trainer[] {
  const names = new Set<string>();
  for (const day of tt.days)
    for (const item of day.items) for (const c of columnsOf(item)) if (RENTAL_COLUMN.test(c) === rentals) names.add(c);
  return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ slug: slugify(name), name }));
}

export const trainersFrom = (tt: Timetable) => columnsFrom(tt, false);
export const hallsFrom = (tt: Timetable) => columnsFrom(tt, true);

/** Dated days with only this trainer's items (or everything for "all"). */
export function daysFor(tt: Timetable, slug: string) {
  return tt.days
    .filter((d) => d.date)
    .map((d) => ({
      date: d.date as string,
      items:
        slug === ALL_SLUG
          ? d.items
          : slug === RENTALS_SLUG
            ? d.items.filter((i) => RENTAL_COLUMN.test(i.column))
            : d.items.filter((i) => columnsOf(i).some((c) => slugify(c) === slug)),
    }));
}

export function eventsFor(tt: Timetable, slug: string): CalendarEvent[] {
  return daysFor(tt, slug).flatMap((d) =>
    d.items.map((i) => ({
      date: d.date,
      start: i.start,
      end: i.end,
      title: i.title,
      description: i.column,
      location: STUDIO_LOCATION,
    }))
  );
}
