// The weekly schedule table: one week as a time grid (the same grid the
// trainers' page uses) with the group classes, which repeat every week, and
// that week's private lessons, by day, time and hall. Click a private lesson to
// confirm, move or cancel it; the form under the grid schedules a new one.
import { getLang, t, LOCALE, type Key } from '../i18n';
import { db, h, get, ok, nav, select, field, sureButton, flash, money, ltr, today, type Row } from '../ui';
import { weekGrid, fitCards } from '../../lib/weekGrid';
import type { TimetableItem } from '../../lib/timetable';

const CHARGED = ['done', 'no_show', 'late_cancel'] as const;
const MARK: Record<string, string> = { done: '✓ ', no_show: '✗ ', late_cancel: '✗ ' };
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = Sunday
const hhmm = (time: string) => time.slice(0, 5);
const plus = (time: string, mins: number) => {
  const [hh, mm] = time.split(':').map(Number);
  const x = Math.min(hh * 60 + mm + mins, 24 * 60 - 1);
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { timeZone: 'UTC', ...opts });

interface Entry { item: TimetableItem; lesson?: Row; slot?: Row }

export async function scheduleView(arg?: string) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(arg ?? '') ? (arg as string) : today();
  const start = addDays(day, -weekdayOf(day));
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [lessons, slots, trainers, rates, students, settings, waiting] = await Promise.all([
    get<Row[]>(db!.from('lessons').select('*, trainers(full_name), lesson_students(students(full_name))').gte('held_on', start).lt('held_on', addDays(start, 7)).order('held_on').order('start_time')),
    get<Row[]>(db!.from('group_slots').select('*, groups!inner(name, archived), trainers(full_name)').eq('groups.archived', false)),
    get<Row[]>(db!.from('trainers').select('id, full_name').eq('archived', false).order('full_name')),
    get<Row[]>(db!.from('trainer_rates').select('*').order('minutes')),
    get<Row[]>(db!.from('students').select('id, full_name, partner_id').eq('archived', false).order('full_name')),
    get<Row[]>(db!.from('settings').select('value').eq('id', 'halls')),
    get<Row[]>(db!.from('lessons').select('held_on').eq('status', 'planned').lt('held_on', today()).order('held_on').limit(100)),
  ]);
  const halls: string[] = settings[0]?.value ?? [];
  const names = (l: Row) => l.lesson_students.map((x: Row) => x.students.full_name).join(' + ');

  // What goes on the grid: every group slot on its weekday, and the week's
  // lessons that have a time and aren't cancelled.
  const entries = new Map<string, Entry[]>(dates.map((d) => [d, [
    ...slots.filter((s) => s.weekday === weekdayOf(d)).map((s): Entry => ({
      slot: s,
      item: { start: hhmm(s.start_time), end: plus(s.start_time, s.minutes), title: s.groups.name, column: s.trainers?.full_name ?? '', hall: s.hall },
    })),
    ...lessons.filter((l) => l.held_on === d && l.start_time && l.status !== 'cancelled').map((l): Entry => ({
      lesson: l,
      item: {
        start: hhmm(l.start_time), end: plus(l.start_time, l.minutes), column: l.trainers.full_name, hall: l.hall,
        title: `${MARK[l.status] ?? (l.held_on < today() ? '⚠ ' : '')}${names(l)}`, // ⚠ = its day has passed and nobody said what happened
      },
    })),
  ]]));
  const offGrid = lessons.filter((l) => !l.start_time || l.status === 'cancelled');

  const nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
  const grid = h('div', { className: 'week' });
  // weekGrid() escapes every text it is given; the day heading below is built from the date alone.
  grid.innerHTML = weekGrid({
    dates,
    byDate: new Map([...entries].map(([d, list]) => [d, list.map((e) => e.item)])),
    dayHead: (iso) => `<b>${fmt(iso, { weekday: 'short' })}</b> <span dir="ltr">${fmt(iso, { day: 'numeric', month: 'numeric' })}</span>`,
    hallName: (hall) => hall || '—',
    who: (item) => item.column,
    colorClass: (item) => `c${Math.max(0, trainers.findIndex((x) => x.full_name === item.column)) % 6}`,
    isDone: (iso) => iso < today(),
    now: { date: today(), min: nowParts[0] * 60 + nowParts[1] },
    perDay: matchMedia('(max-width: 760px)').matches,
    noClasses: t('emptyList'),
  }) || `<p class="muted">${t('emptyList')}</p>`;
  setTimeout(() => fitCards(grid)); // once it is on the page and has a size

  const setStatus = async (l: Row, status: string) => {
    if (await ok(db!.rpc('set_lesson_status', { lid: l.id, new_status: status }))) nav.refresh();
  };
  const actions = (l: Row) => [
    ...(l.status === 'planned'
      ? [
          ...CHARGED.map((st) => h('button', { type: 'button', className: st === 'done' ? 'primary' : '', textContent: t(st), onclick: () => setStatus(l, st) })),
          h('button', { type: 'button', textContent: t('cancelLesson'), onclick: () => setStatus(l, 'cancelled') }),
        ]
      : [h('button', { type: 'button', textContent: `↺ ${t('backToPlanned')}`, onclick: () => setStatus(l, 'planned') })]),
    sureButton(t('del'), async () => { if (await ok(db!.from('lessons').delete().eq('id', l.id))) nav.refresh(); }),
  ];

  // The panel under the grid: what was clicked, and what can be done with it.
  const detail = h('div', { className: 'stack' });
  const show = (e: Entry) => {
    if (e.slot) {
      return detail.replaceChildren(h('p', { className: 'quote' },
        `${e.slot.groups.name} · ${WEEKDAY(e.slot.weekday)} `, ltr(`${e.item.start}–${e.item.end}`),
        ` · ${e.slot.hall || '—'} · ${e.slot.trainers?.full_name ?? '—'} · `, h('a', { href: '#/settings', textContent: t('editInSettings') })
      ));
    }
    const l = e.lesson!;
    const move = (patch: Row) => ok(db!.from('lessons').update(patch).eq('id', l.id)).then((done) => { if (done) nav.refresh(); });
    const parts: (HTMLElement | false)[] = [
      h('p', { className: 'quote' },
        `${names(l)} · ${l.trainers.full_name} ${l.minutes}′ · `, ltr(money(l.price)), ` (${t('trainerGets')}: `, ltr(money(l.trainer_pay)), `) · ${t(l.status as Key)}`,
        l.note && h('small', {}, l.note)
      ),
      // A planned lesson can still be moved; a confirmed one keeps its place.
      l.status === 'planned' && h('div', { className: 'row' },
        h('input', { type: 'date', value: l.held_on, ariaLabel: t('date'), onchange: (ev: Event) => move({ held_on: (ev.target as HTMLInputElement).value }) }),
        h('input', { type: 'time', step: 300, value: hhmm(l.start_time), ariaLabel: t('time'), onchange: (ev: Event) => move({ start_time: (ev.target as HTMLInputElement).value }) }),
        select([['', '—'], ...halls.map((x): [string, string] => [x, x])], l.hall, (v) => move({ hall: v }), { ariaLabel: t('hall') })
      ),
      h('div', { className: 'row' }, ...actions(l)),
    ];
    detail.replaceChildren(...parts.filter((x): x is HTMLElement => !!x));
    detail.scrollIntoView({ block: 'nearest' });
  };
  grid.onclick = (ev) => {
    const card = (ev.target as Element).closest<HTMLElement>('[data-ev]');
    if (!card) return;
    const [d, n] = card.dataset.ev!.split('|');
    grid.querySelector('.is-picked')?.classList.remove('is-picked');
    card.classList.add('is-picked');
    show(entries.get(d)![Number(n)]);
  };

  // The form. Choosing a trainer offers that trainer's lesson lengths; the
  // first student's dance partner is offered as the second; up to four share a lesson.
  const studentOptions = students.map((s): [string, string] => [s.id, s.full_name]);
  const date = h('input', { type: 'date', value: dates.includes(today()) ? today() : start, required: true });
  const time = h('input', { type: 'time', step: 300, required: true });
  const minutes = h('select', { required: true });
  const price = h('input', { type: 'number', step: 'any', min: 0, className: 'num' });
  const rateOf = () => rates.find((r) => r.trainer_id === trainer.value && String(r.minutes) === minutes.value);
  const showRate = () => (price.placeholder = rateOf() ? String(Number(rateOf()!.price)) : '');
  const trainer = select([['', '—'], ...trainers.map((x): [string, string] => [x.id, x.full_name])], '', (v) => {
    minutes.replaceChildren(...rates.filter((r) => r.trainer_id === v).map((r) => h('option', { value: String(r.minutes), textContent: String(r.minutes) })));
    showRate();
  }, { required: true });
  minutes.onchange = showRate;
  const hall = select(halls.map((x): [string, string] => [x, x]), halls[0] ?? '', () => {});
  const others = [1, 2, 3].map((n) => select([['', '—'], ...studentOptions], '', () => {}, { ariaLabel: `${t('student')} ${n + 1}` }));
  const first = select([['', '—'], ...studentOptions], '', (v) => (others[0].value = students.find((s) => s.id === v)?.partner_id ?? ''), { required: true });
  const note = h('input', { type: 'text' });
  const form = h('form', { className: 'stack' },
    h('h2', { textContent: t('scheduleLesson') }),
    h('div', { className: 'grid' },
      field(t('date'), date), field(t('time'), time), field(t('trainer'), trainer), field(t('minutes'), minutes),
      field(t('hall'), hall), field(t('student'), first), field(t('price'), price), field(t('comment'), note),
      field(t('secondStudent'), h('div', { className: 'row' }, ...others), 'full')
    ),
    h('p', { className: 'muted', textContent: t('lessonPriceHint') }),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('scheduleLesson') }))
  );
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const group = [first.value, ...others.map((o) => o.value)].filter((id, i, all) => id && all.indexOf(id) === i);
    await get(db!.rpc('record_lesson', {
      l: { trainer_id: trainer.value, held_on: date.value, start_time: time.value, minutes: Number(minutes.value), hall: hall.value, price: price.value, note: note.value.trim() },
      student_ids: group,
    }));
    flash(t('saved'));
    // Show the week the lesson landed in: a new address redraws by itself, the same one needs a nudge.
    const target = `#/lessons/${date.value}`;
    if (location.hash === target) nav.refresh();
    else location.hash = target;
  };

  // Weeks that still hold a planned lesson whose day has passed.
  const overdue = [...new Set(waiting.map((l) => addDays(l.held_on, -weekdayOf(l.held_on))))];
  return h('div', { className: 'stack' },
    h('section', { className: 'card' },
      h('div', { className: 'row monthbar' },
        h('a', { href: `#/lessons/${addDays(start, -7)}`, className: 'btn', textContent: '‹', ariaLabel: addDays(start, -7) }),
        h('h1', {}, ltr(`${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(dates[6], { day: 'numeric', month: 'short', year: 'numeric' })}`)),
        h('a', { href: `#/lessons/${addDays(start, 7)}`, className: 'btn', textContent: '›', ariaLabel: addDays(start, 7) }),
        !dates.includes(today()) && h('a', { href: '#/lessons', className: 'btn', textContent: t('thisWeek') })
      ),
      overdue.length > 0 && h('p', { className: 'warn' }, `${t('needsConfirming')} `,
        ...overdue.flatMap((w, i) => [i > 0 && ', ', h('a', { href: `#/lessons/${w}`, textContent: fmt(w, { day: 'numeric', month: 'short' }) })])),
      h('div', { className: 'scroll' }, grid),
      detail,
      offGrid.length > 0 && h('div', { className: 'stack' },
        h('h3', { textContent: t('cancelledList') }),
        ...offGrid.map((l) => h('div', { className: 'row' },
          h('span', { className: 'grow muted' }, ltr(`${fmt(l.held_on, { weekday: 'short', day: 'numeric', month: 'numeric' })}${l.start_time ? ` ${hhmm(l.start_time)}` : ''}`), ` · ${l.trainers.full_name} · ${names(l)} · ${t(l.status as Key)}`),
          ...actions(l)
        ))
      )
    ),
    h('section', { className: 'card' }, form)
  );
}

/** "Sunday" … "Saturday" in the screen's language (1 January 2023 was a Sunday). */
export const WEEKDAY = (n: number) => new Date(Date.UTC(2023, 0, 1 + n)).toLocaleDateString(LOCALE[getLang()], { weekday: 'long', timeZone: 'UTC' });
