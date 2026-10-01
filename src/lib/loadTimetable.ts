// Build-time source for the studio timetable.
//
// The studio keeps its weekly grid in a shared Google Sheet ("לוח זמנים
// 2026-2027", one tab per week). Every build downloads it as .xlsx and parses
// it with the same parseTimetableWorkbook() the /admin/ Excel upload uses, so
// staff only edit the sheet — the site rebuilds on a schedule (see
// .github/workflows/deploy.yml) and picks up changes by itself.
//
// If the sheet can't be downloaded (no network, sharing turned off), the
// build falls back to src/data/timetable.json — the last Excel file uploaded
// through /admin/ — instead of failing.
import * as XLSX from 'xlsx';
import fallback from '../data/timetable.json';
import { parseTimetableWorkbook, type Timetable } from './timetable';

/** The shared "לוח זמנים" spreadsheet. It must stay viewable by anyone with the link. */
export const TIMETABLE_SHEET_ID = '1mgk4XGmdvvTjJUij1tzKIBMwBSXvXK7XT74NrmVGmi0';

/** Weeks before this date in the sheet are ignored. */
const FIRST_DATE = '2026-10-04';

let cached: Promise<Timetable> | undefined;

export function getTimetable(): Promise<Timetable> {
  cached ??= fromSheet().catch((err) => {
    console.warn(`[timetable] Google Sheet unavailable (${err.message}) — using src/data/timetable.json`);
    return fallback as Timetable;
  });
  return cached;
}

async function fromSheet(): Promise<Timetable> {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${TIMETABLE_SHEET_ID}/export?format=xlsx`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { cellFormula: true, sheetStubs: true });
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
