// The hidden student app (/student/): what students see of the timetable and
// the calendar feeds they can subscribe to — one per group (class title) and
// one per student name, each in a version per reminder time.
import { RENTAL_COLUMN, type Timetable, type TimetableItem } from './timetable';
import { slugify, type CalendarEvent } from './calendar';
import { STUDIO_LOCATION, trainersFrom } from './trainers';
import app from '../data/student-app.json';

/** Reminder choices, in minutes before the class (0 = no reminder). */
export const ALARMS = [0, 15, 60, 180, 1440];

/** "[TRIAL] Kids Beg 4–5" → "Kids Beg 4–5": a trial lesson belongs to its group. */
export const groupOf = (title: string) => title.replace(/^\s*\[[^\]]*\]\s*/, '').trim();

// A private lesson cell is typed as the student's name, optionally after a
// "Private" / "Ind." / "Индив." / "פרטי" prefix; a couple as "Sasha-Ira",
// "Masha & Dima", "Masha / Dima", "Маша и Дима"…
const PRIVATE_PREFIX = /^(?:private|priv|individual|indiv|ind|индивидуальн\S*|индив|инд|שיעור פרטי|פרטי)\.?\s*[:\-–—]?\s+/i;
const NAME_SEPARATOR = /\s*(?:&|\/|\+|,)\s*|\s+(?:и|and)\s+/i;
// "Sasha-Ira": single words joined by hyphens (unlike "Kids Adv 5-6").
const HYPHEN_NAMES = /^\p{L}{2,}(?:-\p{L}{2,})+$/u;

/** Student names in a class title, or none if it's a group. */
export function namesIn(title: string): string[] {
  const t = groupOf(title);
  const rest = t.replace(PRIVATE_PREFIX, '');
  if (HYPHEN_NAMES.test(rest)) return rest.split('-');
  const parts = rest.split(NAME_SEPARATOR).map((p) => p.trim()).filter(Boolean);
  // "Kids 4/5" is a group, not two names: every part must have letters.
  if (rest !== t || (parts.length > 1 && parts.every((p) => /\p{L}{2}/u.test(p)))) return parts;
  return [];
}

/** Groups (class titles) and student names (from private lessons) for the app's chips. */
export function chipsFrom(tt: Timetable) {
  const groups = new Set<string>();
  const names = new Set<string>();
  for (const d of studentDays(tt))
    for (const i of d.items) {
      const found = namesIn(i.title);
      if (found.length) found.forEach((n) => names.add(n));
      else groups.add(groupOf(i.title));
    }
  const sort = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
  return { groups: sort(groups), names: sort(names).filter((n) => !groups.has(n)) };
}

/** Classes and PRACTICE-type blocks, without hall rentals. */
export function studentDays(tt: Timetable) {
  return tt.days
    .filter((d) => d.date)
    .map((d) => ({ date: d.date as string, items: d.items.filter((i) => !RENTAL_COLUMN.test(i.column)) }));
}

export interface Feed {
  slug: string; // "g-kids-beg-4-5", "n-masha", "t-roman"
  name: string;
  kind: 'group' | 'name' | 'trainer';
  match: (i: TimetableItem) => boolean;
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();

export function feedsFrom(tt: Timetable): Feed[] {
  const { groups, names } = chipsFrom(tt);
  return [
    ...groups.map((g) => ({ slug: `g-${slugify(g)}`, name: g, kind: 'group' as const, match: (i: TimetableItem) => groupOf(i.title) === g })),
    ...names.map((n) => ({ slug: `n-${slugify(n)}`, name: n, kind: 'name' as const, match: (i: TimetableItem) => namesIn(i.title).some((x) => norm(x) === norm(n)) })),
    // No longer offered in the app (it shows groups and names only); still
    // built so calendars subscribed to them earlier keep updating.
    ...trainersFrom(tt).map((t) => ({
      slug: `t-${t.slug}`,
      name: t.name,
      kind: 'trainer' as const,
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

/** Monthly membership payment reminder (edited in /admin/, "Student app" tab). */
export interface PaymentSettings {
  active: boolean;
  day: number; // day of the month the membership is due, e.g. 10
  before: number; // days before it the countdown banner appears
  after: number; // days after it the banner stays
}

export const PAYMENT_DEFAULTS: PaymentSettings = { active: true, day: 10, before: 3, after: 3 };

export function paymentSettings(p?: Partial<PaymentSettings>): PaymentSettings {
  const s = { ...PAYMENT_DEFAULTS, ...p };
  const clamp = (n: number, lo: number, hi: number, d: number) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : d);
  return {
    active: s.active !== false,
    day: clamp(Number(s.day), 1, 28, PAYMENT_DEFAULTS.day),
    before: clamp(Number(s.before), 0, 14, PAYMENT_DEFAULTS.before),
    after: clamp(Number(s.after), 0, 14, PAYMENT_DEFAULTS.after),
  };
}

/** Payment reminder texts — app banner and the monthly calendar event. */
export const PAYMENT_TEXT = {
  he: { title: 'תשלום מנוי ETUDE', body: 'תזכורת: את המנוי החודשי משלמים עד ה-{day} בחודש.' },
  en: { title: 'ETUDE membership payment', body: 'Reminder: the monthly membership is paid by the {day} of each month.' },
  ru: { title: 'Оплата абонемента ETUDE', body: 'Напоминание: абонемент оплачивается до {day} числа каждого месяца.' },
} as const;

const ordinal = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

/** The reminder's body with the due day filled in. */
export const paymentBody = (lang: keyof typeof PAYMENT_TEXT, day: number) =>
  PAYMENT_TEXT[lang].body.replace('{day}', lang === 'en' ? ordinal(day) : String(day));

type Loc = { he: string; en: string; ru: string };
interface AppEvent { id: string; date: string; start?: string; end?: string; place?: string; title: Partial<Loc>; body?: Partial<Loc> }

const pick = (l: Partial<Loc> | undefined, lang: keyof Loc) => l?.[lang] || l?.he || l?.ru || l?.en || '';
/** The admin's light markup (richText.ts) as plain text, for calendar apps. */
const plain = (s: string) => s.replace(/!embed\(([^)\s]+)\)/g, '$1').replace(/!\[([^\]\n]*)\]\(([^)\s]+)\)/g, (_, c, u) => (c ? `${c} (${u})` : u)).replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, '$1 ($2)').replace(/\*\*|__|\*/g, '');
const later = (start: string, min: number) => {
  const [h, m] = start.split(':').map(Number);
  const t = Math.min(h * 60 + m + min, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** Studio events from /admin/, from a week ago on (the app hides past ones by itself); `text` is plain, for calendars. */
export function appEvents() {
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  return ((app as { events?: AppEvent[] }).events ?? [])
    .filter((e) => e.date && e.date >= weekAgo)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start || '').localeCompare(b.start || ''))
    .map((e) => ({
      id: e.id,
      date: e.date,
      start: e.start || '',
      // No end time → two hours, the length calendars get anyway.
      end: e.start ? (e.end && e.end > e.start ? e.end : later(e.start, 120)) : '',
      place: e.place || '',
      title: { he: pick(e.title, 'he'), en: pick(e.title, 'en'), ru: pick(e.title, 'ru') },
      body: { he: pick(e.body, 'he'), en: pick(e.body, 'en'), ru: pick(e.body, 'ru') },
      text: { he: plain(pick(e.body, 'he')), en: plain(pick(e.body, 'en')), ru: plain(pick(e.body, 'ru')) },
    }));
}
