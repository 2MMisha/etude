// Build-time source for the studio timetable.
//
// Since stage 6 (owner, 2026-11-17) the timetable is the CRM's: every build
// reads site_timetable() from the database (supabase/migrations/
// 20261211000000_site_timetable.sql) for the last week and the next five, and
// turns it into the same shape the Sheet used to give: group classes as they
// really are, master classes, private lessons (no student names) and rentals.
// The site rebuilds every hour (.github/workflows/deploy.yml), so changes made
// in the CRM reach the trainers' app, the studio TV and the calendar feeds.
//
// If the database can't be reached, the build falls back to the old Google
// Sheet, then to src/data/timetable.json (a saved copy), instead of failing.
import * as XLSX from 'xlsx';
import fallback from '../data/timetable.json';
import { parseTimetableWorkbook, minutesToTime, timeToMinutes, type Timetable, type TimetableItem } from './timetable';
import { SUPABASE_URL, SUPABASE_KEY } from './crmConfig';

/** The shared "לוח זמנים" spreadsheet. It must stay viewable by anyone with the link. */
export const TIMETABLE_SHEET_ID = '1mgk4XGmdvvTjJUij1tzKIBMwBSXvXK7XT74NrmVGmi0';

/** Weeks before this date in the sheet are ignored (older tabs use the pre-hall-row layout). */
const FIRST_DATE = '2026-10-18';

let cached: Promise<Timetable> | undefined;

/**
 * Read the timetable from the CRM (true) or still from the Google Sheet (false).
 * On since 2026-11-20: the owner marked the Sheet "moved to CRM" and the two
 * matched day by day except one group's time, settled with the owner.
 */
export const FROM_CRM = true;

export function getTimetable(): Promise<Timetable> {
  cached ??= (FROM_CRM ? fromCrm() : Promise.reject(new Error('the CRM is not the source yet')))
    .catch((err) => {
      if (FROM_CRM) console.warn(`[timetable] CRM unavailable (${err.message}) — using the Google Sheet`);
      return fromSheet();
    })
    .catch((err) => {
      console.warn(`[timetable] Google Sheet unavailable (${err.message}) — using src/data/timetable.json`);
      return fallback as Timetable;
    });
  return cached;
}

const isoPlus = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** The CRM's timetable, from last Sunday a week ago to five weeks ahead, in the Sheet's shape. */
async function fromCrm(): Promise<Timetable> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('no database configured');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
  const sunday = isoPlus(today, -new Date(`${today}T12:00:00Z`).getUTCDay());
  const d1 = isoPlus(sunday, -7);
  const d2 = isoPlus(sunday, 41);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/site_timetable`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ d1, d2 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows: { on_date: string; start_time: string; minutes: number; kind: string; title: string; trainer: string; hall: string }[] = await res.json();
  const days = [];
  for (let date = d1; date <= d2; date = isoPlus(date, 1)) {
    const items: TimetableItem[] = rows
      .filter((r) => r.on_date === date)
      .map((r) => {
        const start = r.start_time.slice(0, 5);
        return {
          start,
          end: minutesToTime(timeToMinutes(start) + r.minutes),
          title: r.kind === 'event' ? `★ ${r.title}` : r.title,
          // As the Sheet had it: the trainer's column; a rental is "<hall> (rent)"; no trainer = the whole hall.
          column: r.kind === 'rental' ? `${r.hall} (rent)` : r.trainer || r.hall,
          hall: r.hall || undefined,
        };
      });
    days.push({ date, weekday: new Date(`${date}T12:00:00Z`).getUTCDay(), items });
  }
  if (!rows.length) throw new Error('the CRM has no classes in these weeks');
  return { updatedAt: new Date().toISOString(), sourceFile: 'CRM', days };
}

async function fromSheet(): Promise<Timetable> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${TIMETABLE_SHEET_ID}/export?format=xlsx`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { cellFormula: true, sheetStubs: true });
  wb.SheetNames = wb.SheetNames.filter((name) => !/test/i.test(name)); // drafts like "TEST SCHEDULE"
  const { timetable, warnings } = parseTimetableWorkbook(wb, XLSX.utils, 'Google Sheet');
  for (const w of warnings) console.warn(`[timetable] ${w}`);
  // A tab copied from the previous week without updating its "Week of" cell
  // repeats that week's dates — keep the first tab for each date and say so.
  const seen = new Set<string>();
  const days = timetable.days.filter((d) => {
    if (!d.date || d.date < FIRST_DATE) return false;
    if (seen.has(d.date)) {
      console.warn(`[timetable] ${d.date} appears in more than one tab — check the "Week of" date in the sheet.`);
      return false;
    }
    seen.add(d.date);
    return true;
  });
  if (!days.length) throw new Error(`no dated days from ${FIRST_DATE} on`);
  return { ...timetable, days };
}
