// What changed on a /trainers/ schedule page between two versions — for the
// "what changed" popup in the trainers' app (src/components/TrainerSchedule.astro)
// and its push notification (scripts/notify-trainers.mjs). Lines are the same in
// every language: "+" a new class, "✕" a removed one, "a → b" a class that moved
// (same title, other time / hall / trainer), "+ 📅" a newly published week.
// Only a type import: Node runs this file as is (type stripping).
import type { TimetableItem } from './timetable';

type Day = { date: string; items: TimetableItem[] };

const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const key = (i: TimetableItem) => [i.start, i.end, i.title, i.hall ?? '', i.column].join('|');
const parts = (i: TimetableItem) => [`${i.start}–${i.end}`, i.hall ?? '', i.column];
const sunday = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
};

/** Change lines for the dates from `from` (ISO) on; `who` adds the trainer (pages with everyone). */
export function scheduleChanges(before: Day[], after: Day[], from: string, who = false): string[] {
  const old = new Map(before.map((d) => [d.date, d.items]));
  const line = (sign: string, date: string, i: TimetableItem) =>
    `${sign} ${dm(date)} ${i.start}–${i.end} ${i.title}${who ? ` · ${i.column}` : ''}`;
  const lines: string[] = [];
  const newWeeks = new Map<string, string>(); // Sunday → last new date
  for (const d of after) {
    if (d.date < from) continue;
    const was = old.get(d.date);
    if (!was) {
      // A new week, unless the old version had no current schedule at all (e.g. the
      // build fell back to an old saved copy) — then everything would look new.
      if (d.items.length && before.some((b) => b.date >= from)) newWeeks.set(sunday(d.date), d.date);
      continue;
    }
    const now = new Set(d.items.map(key));
    const had = new Set(was.map(key));
    const added = d.items.filter((i) => !had.has(key(i)));
    for (const r of was.filter((i) => !now.has(key(i)))) {
      const n = added.findIndex((a) => a.title === r.title);
      if (n < 0) {
        lines.push(line('✕', d.date, r));
        continue;
      }
      const [a] = added.splice(n, 1);
      const [pr, pa] = [parts(r), parts(a)];
      const diff = pr.map((_, k) => k).filter((k) => pr[k] !== pa[k]);
      lines.push(`${dm(d.date)} ${a.title}: ${diff.map((k) => pr[k]).join(' · ')} → ${diff.map((k) => pa[k]).join(' · ')}`);
    }
    for (const a of added) lines.push(line('+', d.date, a));
  }
  for (const [sun, last] of newWeeks) lines.push(`+ 📅 ${dm(sun > from ? sun : from)}–${dm(last)}`);
  return lines;
}

// Self-check: node src/lib/scheduleDiff.ts
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('scheduleDiff.ts')) {
  const i = (start: string, title: string, column = 'Roman'): TimetableItem => ({ start, end: `${Number(start.slice(0, 2)) + 1}:00`, title, column, hall: 'Big Hall' });
  const before = [{ date: '2026-10-20', items: [i('18:00', 'Latin'), i('19:00', 'Waltz')] }];
  const after = [
    { date: '2026-10-20', items: [i('19:00', 'Latin'), i('20:00', 'Tango')] },
    { date: '2026-10-25', items: [i('18:00', 'Latin')] },
  ];
  const got = scheduleChanges(before, after, '2026-10-19');
  const want = ['20.10 Latin: 18:00–19:00 → 19:00–20:00', '✕ 20.10 19:00–20:00 Waltz', '+ 20.10 20:00–21:00 Tango', '+ 📅 25.10–25.10'];
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error(`scheduleChanges: ${JSON.stringify(got)}`);
  if (scheduleChanges([], after, '2026-10-19').length) throw new Error('scheduleChanges: no old schedule → no lines');
  console.log('scheduleChanges ok');
}
