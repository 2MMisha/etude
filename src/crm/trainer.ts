// /trainers/me/ — a trainer's own page inside the trainers' app. After signing
// in they see only what is theirs: their week as a table (private lessons and
// group classes), what is waiting for a word from them, a form to ask for a new
// lesson, and their earnings. Tapping a lesson or a class on the table opens
// what can be done with it: say what happened, ask to move or cancel, mark who
// came. Every call goes through the trainer_* functions in the database, which
// work out who is asking; this page cannot reach anyone else's data.
import { LANGS, LOCALE, getLang, setLang, t, type Key } from './i18n';
import { db, h, get, ok, nav, select, field, sureButton, flash, money, ltr, today, type Row } from './ui';
import { signInView, newPasswordView } from './auth';
import { attendanceBlock } from './attendance';
import { weekGrid, fitCards } from '../lib/weekGrid';
import type { TimetableItem } from '../lib/timetable';

const CHARGED = ['done', 'no_show', 'late_cancel'] as const;
const MARK: Record<string, string> = { done: '✓ ', no_show: '✗ ', late_cancel: '✗ ', requested: '? ' };
const view = document.getElementById('view')!;
const signOutBtn = document.getElementById('signOut') as HTMLButtonElement;
let signedIn: string | null | undefined; // undefined = not heard from Supabase yet
let recovering = false;
let week = ''; // the Sunday of the week on the table ('' = this week)
let picked = ''; // what was open before the last change, so its panel comes back

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = Sunday
const sundayOf = (iso: string) => addDays(iso, -weekdayOf(iso));
const hhmm = (time: string | null) => (time ?? '').slice(0, 5);
const plus = (time: string, mins: number) => {
  const [hh, mm] = time.split(':').map(Number);
  const x = Math.min(hh * 60 + mm + mins, 24 * 60 - 1);
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { timeZone: 'UTC', ...opts });
const dayText = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'numeric' });
const when = (l: Row) => ltr(`${dayText(l.held_on)} ${hhmm(l.start_time)}`);
const card = (key: Key) => h('p', { className: 'card sign', textContent: t(key) });
const done = (p: PromiseLike<boolean>) => p.then((okay) => { if (okay) nav.refresh(); });

interface Entry { key: string; item: TimetableItem; lesson?: Row; group?: Row }
type Part = HTMLElement | false | null | undefined | '';

async function home() {
  const summary = await get<Row | null>(db!.rpc('trainer_summary'));
  if (!summary) return card('notLinked');
  const start = week || sundayOf(today());
  const end = addDays(start, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [lessons, classes, lately, students, rates] = await Promise.all([
    get<Row[]>(db!.rpc('trainer_lessons', { d1: addDays(today(), -60), d2: addDays(today(), 365) })),
    get<Row[]>(db!.rpc('trainer_classes', { d1: start, d2: end })),
    get<Row[]>(db!.rpc('trainer_classes', { d1: addDays(today(), -14), d2: today() })), // to find classes not marked yet
    get<Row[]>(db!.rpc('trainer_students')),
    get<Row[]>(db!.rpc('trainer_rates_mine')),
  ]);
  document.getElementById('who')!.textContent = `ETUDE — ${summary.name}`;

  // ── My week as a table ──
  const onGrid = new Map<string, Entry[]>(dates.map((d) => [d, [
    ...classes.filter((c) => c.held_on === d).map((c): Entry => ({
      group: c, key: `g:${c.slot_id}:${c.on_date}`,
      item: { start: hhmm(c.start_time), end: plus(c.start_time, c.minutes), title: `${c.marked ? '✓ ' : c.held_on < today() ? '⚠ ' : ''}${c.group_name}`, column: t('groupClass'), hall: c.hall },
    })),
    ...lessons.filter((l) => l.held_on === d && l.start_time && l.status !== 'cancelled').map((l): Entry => ({
      lesson: l, key: `l:${l.id}`,
      item: { start: hhmm(l.start_time), end: plus(l.start_time, l.minutes), title: `${MARK[l.status] ?? (l.held_on < today() ? '⚠ ' : '')}${l.students ?? ''}`, column: t('privateLesson'), hall: l.hall },
    })),
  ]]));
  const nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
  const grid = h('div', { className: 'week' });
  // weekGrid() escapes every text it is given; the day heading is built from the date alone.
  grid.innerHTML = weekGrid({
    dates,
    byDate: new Map([...onGrid].map(([d, list]) => [d, list.map((e) => e.item)])),
    dayHead: (iso) => `<b>${fmt(iso, { weekday: 'short' })}</b> <span dir="ltr">${fmt(iso, { day: 'numeric', month: 'numeric' })}</span>`,
    hallName: (hall) => hall || '—',
    who: (item) => item.column,
    colorClass: (item) => (item.column === t('groupClass') ? 'c2' : 'c0'),
    isDone: (iso) => iso < today(),
    now: { date: today(), min: nowParts[0] * 60 + nowParts[1] },
    perDay: matchMedia('(max-width: 760px)').matches,
    noClasses: t('emptyList'),
  }) || `<p class="muted">${t('emptyList')}</p>`;
  setTimeout(() => fitCards(grid));

  // What can be done with a private lesson depends on where it stands.
  const lessonPanel = (l: Row): Part[] => {
    const box = h('div', { className: 'row' });
    const ask = (kind: 'move' | 'cancel') => {
      const date = h('input', { type: 'date', value: l.held_on, min: today(), ariaLabel: t('date') });
      const time = h('input', { type: 'time', step: 300, value: hhmm(l.start_time), ariaLabel: t('time') });
      const note = h('input', { type: 'text', placeholder: t('comment') });
      box.replaceChildren(...(kind === 'move' ? [date, time] : []), note, h('button', { type: 'button', className: 'primary', textContent: t('send'), onclick: () =>
        done(ok(db!.rpc('trainer_request_change', { lid: l.id, k: kind, d: kind === 'move' ? date.value : null, t: kind === 'move' ? time.value : null, n: note.value.trim() }))) }));
    };
    if (l.status === 'requested') box.append(sureButton(t('withdraw'), () => done(ok(db!.rpc('trainer_withdraw', { lid: l.id })))));
    else if (l.status === 'planned' && l.held_on <= today())
      box.append(...CHARGED.map((st) => h('button', { type: 'button', className: st === 'done' ? 'primary' : '', textContent: t(st), onclick: () => done(ok(db!.rpc('trainer_confirm', { lid: l.id, st }))) })));
    else if (l.status === 'planned')
      box.append(h('button', { type: 'button', textContent: t('askMove'), onclick: () => ask('move') }), h('button', { type: 'button', textContent: t('askCancel'), onclick: () => ask('cancel') }));
    return [
      h('p', { className: 'quote' }, when(l), ` · ${l.students ?? ''} · ${l.minutes}′`, l.hall && ` · ${l.hall}`, ` · ${t((l.status === 'requested' ? 'requested' : l.status) as Key)}`, l.note && h('small', {}, l.note),
        l.request && h('small', {}, l.request.kind === 'move' ? `${t('moveAsked')} ${dayText(l.request.new_date)} ${hhmm(l.request.new_time)}` : t('cancelAsked'))),
      box.childElementCount > 0 && box,
    ];
  };
  // A group class: once its day has come, mark who was there.
  const classPanel = (c: Row): Part[] => [
    h('p', { className: 'quote' }, `${c.group_name} · `, ltr(`${dayText(c.held_on)} ${hhmm(c.start_time)}–${plus(c.start_time, c.minutes)}`), ` · ${c.hall || '—'}`, Number(c.pay) > 0 && ' · ', Number(c.pay) > 0 && ltr(money(c.pay))),
    c.held_on <= today() && attendanceBlock(c.slot_id, c.on_date, true),
  ];
  const detail = h('div', { className: 'stack detail' });
  const open = (d: string, n: number, scroll: boolean) => {
    const e = onGrid.get(d)![n];
    picked = e.key;
    grid.querySelector('.is-picked')?.classList.remove('is-picked');
    grid.querySelector(`[data-ev="${d}|${n}"]`)?.classList.add('is-picked');
    detail.replaceChildren(...(e.lesson ? lessonPanel(e.lesson) : classPanel(e.group!)).filter((x): x is HTMLElement => !!x));
    if (scroll) detail.scrollIntoView({ block: 'nearest' });
  };
  grid.onclick = (ev) => {
    const hit = (ev.target as Element).closest<HTMLElement>('[data-ev]');
    if (!hit) return;
    const [d, n] = hit.dataset.ev!.split('|');
    open(d, Number(n), true);
  };
  for (const [d, list] of onGrid) {
    const n = list.findIndex((e) => e.key === picked);
    if (n >= 0) open(d, n, false);
  }
  /** Show the week of a date with one thing open on it. */
  const goTo = (iso: string, key: string) => {
    week = sundayOf(iso);
    picked = key;
    nav.refresh();
  };
  const weekCard = h('section', { className: 'card' },
    h('div', { className: 'row monthbar' },
      h('button', { type: 'button', textContent: '‹', ariaLabel: addDays(start, -7), onclick: () => { week = addDays(start, -7); nav.refresh(); } }),
      h('h1', {}, ltr(`${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(end, { day: 'numeric', month: 'short' })}`)),
      h('button', { type: 'button', textContent: '›', ariaLabel: addDays(start, 7), onclick: () => { week = addDays(start, 7); nav.refresh(); } }),
      !dates.includes(today()) && h('button', { type: 'button', textContent: t('thisWeek'), onclick: () => { week = ''; nav.refresh(); } })
    ),
    h('p', { className: 'muted', textContent: t('myWeekHint') }),
    h('div', { className: 'scroll' }, grid),
    detail
  );

  // ── Waiting for a word from me: lessons whose day has come, classes not marked yet ──
  const lessonsDue = lessons.filter((l) => l.status === 'planned' && l.held_on <= today());
  const classesDue = lately.filter((c) => !c.marked);
  const dueCard = (lessonsDue.length > 0 || classesDue.length > 0) && h('section', { className: 'card' },
    h('h2', { textContent: `${t('toConfirm')} (${lessonsDue.length + classesDue.length})` }),
    ...lessonsDue.map((l) => h('div', { className: 'row' },
      h('span', { className: 'grow' }, when(l), ` · ${l.students ?? ''} · ${l.minutes}′`),
      ...CHARGED.map((st) => h('button', { type: 'button', className: st === 'done' ? 'primary' : '', textContent: t(st), onclick: () => done(ok(db!.rpc('trainer_confirm', { lid: l.id, st }))) }))
    )),
    ...classesDue.map((c) => h('div', { className: 'row' },
      h('span', { className: 'grow' }, ltr(`${dayText(c.held_on)} ${hhmm(c.start_time)}`), ` · ${c.group_name}`),
      h('button', { type: 'button', className: 'primary', textContent: t('markAttendance'), onclick: () => goTo(c.held_on, `g:${c.slot_id}:${c.on_date}`) })
    ))
  );

  // ── Ask for a new lesson: it goes to the admin, at my own rate ──
  const options = students.map((s): [string, string] => [s.id, s.full_name]);
  const date = h('input', { type: 'date', value: today(), min: today(), required: true });
  const time = h('input', { type: 'time', step: 300, required: true });
  const minutes = select(rates.map((r): [string, string] => [String(r.minutes), `${r.minutes}′`]), String(rates[0]?.minutes ?? ''), () => {}, { required: true });
  const hall = select((summary.halls as string[]).map((x): [string, string] => [x, x]), summary.halls[0] ?? '', () => {});
  const others = [1, 2, 3].map((n) => select([['', '—'], ...options], '', () => {}, { ariaLabel: `${t('student')} ${n + 1}` }));
  const first = select([['', '—'], ...options], '', (v) => (others[0].value = students.find((s) => s.id === v)?.partner_id ?? ''), { required: true });
  const note = h('input', { type: 'text' });
  const form = h('form', { className: 'card' },
    h('h2', { textContent: t('askLesson') }),
    h('div', { className: 'grid' },
      field(t('date'), date), field(t('time'), time), field(t('minutes'), minutes), field(t('hall'), hall),
      field(t('student'), first), field(t('comment'), note, 'wide'),
      field(t('secondStudent'), h('div', { className: 'row' }, ...others), 'full')
    ),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('send') }))
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const group = [first.value, ...others.map((o) => o.value)].filter((id, i, all) => id && all.indexOf(id) === i);
    const id = await get<string>(db!.rpc('trainer_request_lesson', {
      l: { held_on: date.value, start_time: time.value, minutes: Number(minutes.value), hall: hall.value, note: note.value.trim() },
      student_ids: group,
    }));
    flash(t('saved'));
    goTo(date.value, `l:${id}`);
  };

  const recent = lessons.filter((l) => (CHARGED as readonly string[]).includes(l.status)).reverse().slice(0, 30);
  const earnings = h('section', { className: 'card' },
    h('h2', { textContent: t('myEarnings') }),
    h('p', { className: 'quote' }, `${t('earned')}: `, ltr(money(summary.earned)), ` · ${t('received')}: `, ltr(money(summary.paid)), ` · ${t('toReceive')}: `, ltr(money(summary.owed))),
    recent.length > 0 && h('div', { className: 'scroll' }, h('table', {}, h('tbody', {}, ...recent.map((l) => h('tr', {},
      h('td', {}, when(l)), h('td', {}, l.students ?? ''), h('td', {}, t(l.status as Key)), h('td', {}, ltr(money(l.trainer_pay)))
    )))))
  );

  return h('div', { className: 'stack' }, dueCard, weekCard, form, earnings);
}

async function render() {
  signOutBtn.hidden = !signedIn;
  signOutBtn.textContent = t('signOut');
  document.getElementById('toSchedule')!.textContent = t('toSchedule');
  document.getElementById('langs')!.replaceChildren(
    ...LANGS.map((l) => h('button', { type: 'button', textContent: l.toUpperCase(), ariaPressed: String(l === getLang()), onclick: () => { setLang(l); render(); } }))
  );
  if (!db) return view.replaceChildren(card('notConnected'));
  if (recovering) return view.replaceChildren(newPasswordView(() => { recovering = false; render(); }));
  if (!signedIn) return view.replaceChildren(signInView());
  try {
    view.replaceChildren(await home());
  } catch (e) {
    view.replaceChildren(h('p', { className: 'card msg bad', textContent: e instanceof Error ? e.message : String(e) }));
  }
}

nav.refresh = async () => {
  const y = scrollY;
  await render();
  scrollTo(0, y);
};

setLang(getLang());
signOutBtn.onclick = () => db?.auth.signOut();
if (db) {
  db.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') recovering = true;
    // Supabase repeats SIGNED_IN whenever the tab regains focus; only a change of person redraws.
    const who = session?.user.id ?? null;
    if (who === signedIn && event !== 'PASSWORD_RECOVERY') return;
    signedIn = who;
    setTimeout(render); // outside the callback: Supabase holds a lock while it runs
  });
} else render();
