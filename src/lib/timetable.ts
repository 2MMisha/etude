// Studio timetable, read from the shared Google Sheet at build time (see
// loadTimetable.ts).
//
// The spreadsheet is the studio's own weekly grid: one sheet per week, a row
// of day names (SUNDAY…SATURDAY, each merged across several columns), a row
// of dates under it, a row of column labels (teachers / halls), then one row
// per 15-minute slot with the time in the first column. A class is a filled
// cell; its length is the height of its merged range. Titles and labels are
// kept exactly as typed in the sheet.
import type { WorkBook, WorkSheet, CellObject, Range } from 'xlsx';

export interface TimetableItem {
  start: string; // "18:00"
  end: string; // "19:00"
  title: string; // cell text, e.g. "Adv Hobby Gr"
  column: string; // column label(s), e.g. "Roman" or "Small Hall (rent)"
}

export interface TimetableDay {
  date: string | null; // ISO "2026-10-04"; null when the sheet has no date row
  weekday: number; // 0 = Sunday … 6 = Saturday
  items: TimetableItem[];
}

export interface Timetable {
  updatedAt: string; // ISO timestamp of the upload
  sourceFile: string; // original Excel file name
  days: TimetableDay[];
}

// Day-name spellings recognised in the header row (EN / HE / RU).
const WEEKDAY_NAMES: string[][] = [
  ['sunday', 'sun', 'ראשון', 'יום ראשון', 'воскресенье', 'вс'],
  ['monday', 'mon', 'שני', 'יום שני', 'понедельник', 'пн'],
  ['tuesday', 'tue', 'שלישי', 'יום שלישי', 'вторник', 'вт'],
  ['wednesday', 'wed', 'רביעי', 'יום רביעי', 'среда', 'ср'],
  ['thursday', 'thu', 'חמישי', 'יום חמישי', 'четверг', 'чт'],
  ['friday', 'fri', 'שישי', 'יום שישי', 'пятница', 'пт'],
  ['saturday', 'sat', 'שבת', 'יום שבת', 'суббота', 'сб'],
];

/** Columns whose label matches this are rentals, not studio classes — hidden on the public site. */
export const RENTAL_COLUMN = /\brent\b|השכרה|аренд/i;

function weekdayOf(text: string): number {
  const t = text.trim().toLowerCase().replace(/[.:]/g, '');
  return WEEKDAY_NAMES.findIndex((names) => names.includes(t));
}

export function minutesToTime(m: number): string {
  const mm = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function excelSerialToIso(serial: number): string {
  const ms = Math.round(serial) * 86400000 + Date.UTC(1899, 11, 30);
  return new Date(ms).toISOString().slice(0, 10);
}

function textOf(cell: CellObject | undefined): string {
  // 'z' = stub (styled but empty, or a formula with no cached value)
  if (!cell || cell.t === 'z' || cell.v == null) return '';
  return String(cell.w ?? cell.v).trim();
}

/** Parse a date cell: Excel serial, JS Date, or "dd/mm[/yyyy]" text. */
function dateOf(cell: CellObject | undefined, fallbackYear: number): string | null {
  if (!cell || cell.v == null) return null;
  if (cell.t === 'n' && typeof cell.v === 'number' && cell.v > 20000) return excelSerialToIso(cell.v);
  if (cell.t === 'd' && cell.v instanceof Date) {
    const d = cell.v;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const m = String(cell.v).match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (!m) return null;
  let year = m[3] ? Number(m[3]) : fallbackYear;
  if (year < 100) year += 2000;
  return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

/**
 * Time of a slot row, in minutes after midnight. Handles a time value, a
 * "18:15" string, or the sheet's own formula
 * `=TIME(7,0,0)+(ROW()-5)*TIME(0,15,0)` (files saved by Google Sheets often
 * carry no cached value for it, so we evaluate the formula ourselves).
 */
function rowTimeOf(cell: CellObject | undefined, row1: number): number | null {
  if (!cell) return null;
  if (cell.t === 'n' && typeof cell.v === 'number') {
    const frac = cell.v % 1;
    if (cell.v < 1 || frac > 0) return Math.round(frac * 1440);
  }
  if (cell.t === 'd' && cell.v instanceof Date) return cell.v.getHours() * 60 + cell.v.getMinutes();
  if (cell.t !== 'z' && cell.v != null) {
    const m = String(cell.v).match(/^(\d{1,2}):(\d{2})/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
  }
  if (cell.f) {
    const f = cell.f.replace(/\s+/g, '').toUpperCase();
    const m = f.match(/TIME\((\d+),(\d+),(\d+)\)\+\(ROW\(\)-(\d+)\)\*TIME\((\d+),(\d+),(\d+)\)/);
    if (m) {
      const base = Number(m[1]) * 60 + Number(m[2]);
      const step = Number(m[5]) * 60 + Number(m[6]);
      return base + (row1 - Number(m[4])) * step;
    }
    const single = f.match(/^TIME\((\d+),(\d+),(\d+)\)$/);
    if (single) return Number(single[1]) * 60 + Number(single[2]);
  }
  return null;
}

export interface ParseResult {
  timetable: Timetable;
  warnings: string[];
}

interface Utils {
  decode_range: (ref: string) => Range;
  encode_cell: (cell: { r: number; c: number }) => string;
}

function parseSheet(ws: WorkSheet, sheetName: string, utils: Utils, warnings: string[]): TimetableDay[] {
  if (!ws['!ref']) return [];
  const range = utils.decode_range(ws['!ref']);
  const merges: Range[] = ws['!merges'] || [];
  const cell = (r: number, c: number) => ws[utils.encode_cell({ r, c })] as CellObject | undefined;
  const mergeAt = (r: number, c: number) => merges.find((m) => m.s.r === r && m.s.c === c);

  // 1. Header row: the first row naming at least three weekdays.
  let headerRow = -1;
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 15) && headerRow < 0; r++) {
    let found = 0;
    for (let c = range.s.c; c <= range.e.c; c++) if (weekdayOf(textOf(cell(r, c))) >= 0) found++;
    if (found >= 3) headerRow = r;
  }
  if (headerRow < 0) {
    warnings.push(`Sheet "${sheetName}": no row with day names (SUNDAY, MONDAY…) found — skipped.`);
    return [];
  }

  const headers: { weekday: number; c0: number; c1: number }[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const wd = weekdayOf(textOf(cell(headerRow, c)));
    if (wd >= 0) headers.push({ weekday: wd, c0: c, c1: mergeAt(headerRow, c)?.e.c ?? c });
  }
  // Unmerged headers: a day runs until the column before the next day.
  headers.forEach((h, i) => {
    if (h.c1 === h.c0 && headers[i + 1]) h.c1 = headers[i + 1].c0 - 1;
  });
  const firstDayCol = headers[0].c0;
  const timeCol = firstDayCol > range.s.c ? firstDayCol - 1 : range.s.c;

  // 2. Optional date row, then the column-label row.
  const yearHint = Number((sheetName.match(/20\d\d/) || [])[0]) || new Date().getFullYear();
  let dateRow = -1;
  for (let r = headerRow + 1; r <= headerRow + 2 && dateRow < 0; r++) {
    if (headers.some((h) => dateOf(cell(r, h.c0), yearHint))) dateRow = r;
  }
  const labelRow = (dateRow >= 0 ? dateRow : headerRow) + 1;
  const labelOf = (c: number) => textOf(cell(labelRow, c)) || `#${c - firstDayCol + 1}`;

  // 3. Slot times for every row below the labels; fill gaps from the step.
  const firstDataRow = labelRow + 1;
  const times: (number | null)[] = [];
  for (let r = firstDataRow; r <= range.e.r + 1; r++) times[r] = rowTimeOf(cell(r, timeCol), r + 1);
  let step = 15;
  for (let r = firstDataRow; r < range.e.r; r++) {
    const a = times[r], b = times[r + 1];
    if (a != null && b != null && b > a) { step = b - a; break; }
  }
  for (let r = firstDataRow; r <= range.e.r + 1; r++) {
    if (times[r] == null && r > firstDataRow && times[r - 1] != null) times[r] = (times[r - 1] as number) + step;
  }
  for (let r = range.e.r; r >= firstDataRow; r--) {
    if (times[r] == null && times[r + 1] != null) times[r] = (times[r + 1] as number) - step;
  }
  if (times[firstDataRow] == null) {
    warnings.push(`Sheet "${sheetName}": could not read the times in column ${String.fromCharCode(65 + timeCol)} — skipped.`);
    return [];
  }

  // 4. Classes: every filled cell inside a day's columns.
  const days: TimetableDay[] = headers.map((h) => ({
    date: dateRow >= 0 ? dateOf(cell(dateRow, h.c0), yearHint) : null,
    weekday: h.weekday,
    items: [],
  }));
  headers.forEach((h, i) => {
    for (let r = firstDataRow; r <= range.e.r; r++) {
      for (let c = h.c0; c <= h.c1; c++) {
        const title = textOf(cell(r, c));
        if (!title) continue;
        const m = mergeAt(r, c);
        const lastRow = m ? m.e.r : r;
        const lastCol = m ? Math.min(m.e.c, h.c1) : c;
        const labels: string[] = [];
        for (let cc = c; cc <= lastCol; cc++) labels.push(labelOf(cc));
        const start = times[r] as number;
        const end = (times[lastRow + 1] ?? (times[lastRow] as number) + step) as number;
        days[i].items.push({ start: minutesToTime(start), end: minutesToTime(end), title, column: labels.join(' · ') });
      }
    }
    days[i].items.sort((a, b) => a.start.localeCompare(b.start) || a.column.localeCompare(b.column));
  });
  return days;
}

/**
 * Parse every sheet of an uploaded workbook. `utils` is SheetJS's XLSX.utils.
 * Read the file with XLSX.read(data, { cellFormula: true, sheetStubs: true })
 * — without sheetStubs, formula cells that have no cached value are dropped.
 */
export function parseTimetableWorkbook(wb: WorkBook, utils: Utils, sourceFile: string): ParseResult {
  const warnings: string[] = [];
  const days: TimetableDay[] = [];
  for (const name of wb.SheetNames) days.push(...parseSheet(wb.Sheets[name], name, utils, warnings));
  if (!days.length) warnings.push('No days were found in this file.');
  return {
    timetable: { updatedAt: new Date().toISOString(), sourceFile, days: sortDays(days) },
    warnings,
  };
}

function sortDays(days: TimetableDay[]): TimetableDay[] {
  return [...days].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.weekday - b.weekday);
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The classes for a given local date: the exact dated day if the timetable
 * has it, otherwise the most recent uploaded day with the same weekday (a
 * regular week repeats) — flagged so the screen can say so.
 */
export function dayFor(tt: Timetable, date: Date): { day: TimetableDay | null; fromTemplate: boolean } {
  const iso = isoOf(date);
  const exact = tt.days.find((d) => d.date === iso);
  if (exact) return { day: exact, fromTemplate: false };
  const sameWeekday = tt.days
    .filter((d) => d.weekday === date.getDay() && (!d.date || d.date < iso))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  return { day: sameWeekday[0] ?? null, fromTemplate: !!sameWeekday[0] };
}

/** Sunday-to-Saturday week (ISO dates) containing `date`. */
export function weekOf(date: Date): string[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => isoOf(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
}
