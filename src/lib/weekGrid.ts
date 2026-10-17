// A week of the timetable drawn as a time grid: one column per day, split into
// a lane per hall, each class placed by its start/end — so what runs at the
// same time sits side by side and the lane says which hall. Hours with nothing
// in them are folded into a thin band. Shared by /trainers/ and the admin
// (styles in src/styles/week-grid.css).
import { RENTAL_COLUMN, timeToMinutes, type TimetableItem } from './timetable';

export interface WeekGridOptions {
  dates: string[]; // ISO dates, Sunday → Saturday
  byDate: Map<string, TimetableItem[]>;
  dayHead: (iso: string) => string; // HTML
  hallName: (hall: string) => string;
  who: (item: TimetableItem) => string; // line under the title ('' = none)
  colorClass: (item: TimetableItem) => string;
  isDone?: (iso: string, item: TimetableItem) => boolean;
  now?: { date: string; min: number };
  perDay?: boolean; // narrow screens: every day its own grid, stacked
  fitHeight?: number; // px for the grid body: the hour height is chosen to fill it (the studio TV)
  noClasses: string;
}

const HOUR_PX = 64; // px per hour
const GAP = 16; // px for a folded stretch of empty hours
const PAD = 10; // px above the first hour, so its label isn't clipped

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

interface Placed {
  item: TimetableItem;
  n: number; // index in the day's items
  col: number;
  of: number;
}

// Classes overlapping inside one lane share its width.
function place(list: { item: TimetableItem; n: number }[]): Placed[] {
  const out: Placed[] = [];
  let cols: number[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const p of cluster) p.of = cols.length;
    cluster = [];
    cols = [];
  };
  for (const x of [...list].sort((a, b) => a.item.start.localeCompare(b.item.start))) {
    const s = timeToMinutes(x.item.start);
    const e = timeToMinutes(x.item.end);
    if (s >= clusterEnd) flush();
    let col = cols.findIndex((end) => end <= s);
    if (col < 0) col = cols.push(e) - 1;
    else cols[col] = e;
    const p = { ...x, col, of: 1 };
    cluster.push(p);
    out.push(p);
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
}

function grid(o: WeekGridOptions, dates: string[]): string {
  const itemsOf = (d: string) => o.byDate.get(d) ?? [];
  const all = dates.flatMap(itemsOf);
  const hours = [
    ...new Set(
      all.flatMap((i) => {
        const s = Math.floor(timeToMinutes(i.start) / 60);
        const e = Math.ceil(timeToMinutes(i.end) / 60);
        return Array.from({ length: Math.max(1, e - s) }, (_, k) => s + k);
      })
    ),
  ].sort((a, b) => a - b);
  const lanes = [...new Set(all.map((i) => i.hall ?? ''))].sort();

  const gapCount = hours.filter((h, k) => k && h !== hours[k - 1] + 1).length;
  const HOUR = o.fitHeight ? Math.max(24, (o.fitHeight - 2 * PAD - gapCount * GAP) / hours.length) : HOUR_PX;
  const top = new Map<number, number>();
  const gaps: number[] = [];
  const ends: number[] = [];
  let y = PAD;
  hours.forEach((h, k) => {
    if (k && h !== hours[k - 1] + 1) {
      ends.push(hours[k - 1] + 1);
      gaps.push(y);
      y += GAP;
    }
    top.set(h, y);
    y += HOUR;
  });
  if (hours.length) ends.push(hours[hours.length - 1] + 1);
  const height = y + PAD;
  const yOf = (m: number, end = false) => {
    const h = Math.floor((end ? m - 1 : m) / 60);
    return (top.get(h) ?? PAD) + ((m - h * 60) / 60) * HOUR;
  };

  const lines =
    hours.map((h) => `<i class="wg-hr" style="top:${top.get(h)}px"></i>`).join('') +
    gaps.map((g) => `<i class="wg-gap" style="top:${g}px;height:${GAP}px"></i>`).join('');
  const axis =
    hours.map((h) => `<span style="top:${top.get(h)}px">${hh(h)}</span>`).join('') +
    ends.map((h) => `<span style="top:${yOf(h * 60, true)}px">${hh(h)}</span>`).join('');

  const head = (d: string) => {
    const today = o.now?.date === d ? ' is-today' : '';
    const empty = !itemsOf(d).length && o.perDay ? `<span class="wg-none">${esc(o.noClasses)}</span>` : '';
    const laneHead =
      lanes.length > 1
        ? `<span class="wg-lanes-head">${lanes.map((l) => `<span>${esc(o.hallName(l))}</span>`).join('')}</span>`
        : '';
    const none = itemsOf(d).length ? '' : ' wg-head--empty';
    return `<div class="wg-head${today}${none}">${o.dayHead(d)}${empty}${laneHead}</div>`;
  };

  const body = (d: string) => {
    const items = itemsOf(d).map((item, n) => ({ item, n }));
    const today = o.now?.date === d;
    const now =
      today && top.has(Math.floor(o.now!.min / 60)) ? `<i class="wg-now" style="top:${yOf(o.now!.min)}px"></i>` : '';
    const laneHtml = lanes
      .map((l) => {
        const evs = place(items.filter((x) => (x.item.hall ?? '') === l))
          .map(({ item, n, col, of }) => {
            const t = yOf(timeToMinutes(item.start));
            const h = Math.max(22, yOf(timeToMinutes(item.end), true) - t);
            const rent = RENTAL_COLUMN.test(item.column);
            const who = o.who(item);
            const cls = [
              'wg-ev',
              rent ? 'is-rent' : o.colorClass(item),
              o.isDone?.(d, item) ? 'is-done' : '',
              h < 44 ? 'is-short' : '',
            ].join(' ');
            const tip = [`${item.start}–${item.end}`, item.title, who, item.hall].filter(Boolean).join(' · ');
            return `<button type="button" class="${cls}" data-ev="${d}|${n}" title="${esc(tip)}"
              style="top:${t}px;height:${h - 2}px;inset-inline-start:calc(100% * ${col} / ${of});inline-size:calc(100% / ${of} - 2px)">
              <span class="wg-ev__time" dir="ltr">${item.start}–${item.end}</span>
              <span class="wg-ev__title" dir="auto">${rent ? '🔑 ' : ''}${esc(item.title)}</span>
              ${who ? `<span class="wg-ev__who" dir="auto">${esc(who)}</span>` : ''}
            </button>`;
          })
          .join('');
        return `<div class="wg-lane">${evs}</div>`;
      })
      .join('');
    return `<div class="wg-body${today ? ' is-today' : ''}" style="height:${height}px">${lines}${now}<div class="wg-lanes">${laneHtml}</div></div>`;
  };

  if (!hours.length)
    return o.perDay ? `<div class="wg wg--empty">${dates.map(head).join('')}</div>` : '';
  return `<div class="wg" style="--days:${dates.length}">
    <div></div>${dates.map(head).join('')}
    <div class="wg-axis" style="height:${height}px">${axis}</div>${dates.map(body).join('')}
  </div>`;
}

/** Shrinks the text of every class card whose content doesn't fit its box (narrow lanes, short classes). */
export function fitCards(root: ParentNode, min = 7) {
  for (const el of root.querySelectorAll<HTMLElement>('.wg-ev')) {
    el.style.fontSize = '';
    el.classList.remove('is-tight');
    const time = el.querySelector<HTMLElement>('.wg-ev__time')!;
    let size = parseFloat(el.ownerDocument.defaultView!.getComputedStyle(el).fontSize);
    const overflows = () =>
      el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 || time.scrollWidth > time.clientWidth + 1;
    while (overflows() && size > min) el.style.fontSize = `${(size -= 0.5)}px`;
    // Still too much at the smallest size: break long words and drop the trainer line (the colour says who).
    if (overflows()) el.classList.add('is-tight');
  }
}

export function weekGrid(o: WeekGridOptions): string {
  return o.perDay ? o.dates.map((d) => grid(o, [d])).join('') : grid(o, o.dates);
}
