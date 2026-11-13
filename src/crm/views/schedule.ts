// The weekly schedule table: one week as a time grid (the same grid the
// trainers' page uses) with everything that happens in the studio — group
// classes (weekly, with any change made for one date), private lessons and
// hall rentals — by day, time and hall. Click anything on the grid to change
// it; the forms under the grid add a private lesson or a rental.
import { getLang, t, LOCALE, type Key } from '../i18n';
import { db, h, get, ok, nav, select, field, sureButton, flash, money, ltr, today, type Row } from '../ui';
import { weekGrid, fitCards } from '../../lib/weekGrid';
import type { TimetableItem } from '../../lib/timetable';
import { SITE } from '../../lib/site';
import { attendanceBlock } from '../attendance';

const CHARGED = ['done', 'no_show', 'late_cancel'] as const;
const METHODS = ['cash', 'transfer', 'bit', 'cheque', 'standing_order'] as const;
/** What was open before the last change, so the panel comes back after the redraw. */
let picked = '';
const MARK: Record<string, string> = { done: '✓ ', no_show: '✗ ', late_cancel: '✗ ', requested: '? ' };
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
const dayText = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'numeric' });
/** "Sunday" … "Saturday" in the screen's language (1 January 2023 was a Sunday). */
export const WEEKDAY = (n: number) => new Date(Date.UTC(2023, 0, 1 + n)).toLocaleDateString(LOCALE[getLang()], { weekday: 'long', timeZone: 'UTC' });

/** The public page where people sign themselves up to a one-time group. */
const signupLink = (eventId: string) => `${SITE.siteUrl}/signup/?e=${eventId}`;

interface Entry { key: string; item: TimetableItem; lesson?: Row; group?: Row; rental?: Row; event?: Row }
type Part = HTMLElement | false | null | undefined | '';

export async function scheduleView(arg?: string) {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(arg ?? '') ? (arg as string) : today();
  const start = addDays(day, -weekdayOf(day));
  const end = addDays(start, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [lessons, classes, slots, rentals, trainers, rates, students, settings, waiting, events, entries, guestPaid, entryPrices, asked, changes, sessions] = await Promise.all([
    get<Row[]>(db!.from('lessons').select('*, trainers(full_name), lesson_students(students(full_name))').gte('held_on', start).lte('held_on', end).order('held_on').order('start_time')),
    get<Row[]>(db!.rpc('group_classes_between', { d1: start, d2: end })),
    get<Row[]>(db!.from('group_slots').select('*')),
    get<Row[]>(db!.from('rentals').select('*').gte('held_on', start).lte('held_on', end)),
    get<Row[]>(db!.from('trainers').select('id, full_name').eq('archived', false).order('full_name')),
    get<Row[]>(db!.from('trainer_rates').select('*').order('minutes')),
    get<Row[]>(db!.from('students').select('id, full_name, partner_id').eq('archived', false).order('full_name')),
    get<Row[]>(db!.from('settings').select('value').eq('id', 'halls')),
    get<Row[]>(db!.from('lessons').select('held_on').eq('status', 'planned').lt('held_on', today()).order('held_on').limit(100)),
    get<Row[]>(db!.from('events').select('*').gte('held_on', start).lte('held_on', end)),
    get<Row[]>(db!.from('entries').select('*, students(full_name, client_id)').gte('held_on', start).lte('held_on', end).order('created_at')),
    get<Row[]>(db!.from('payments').select('amount, entry_id, rental_id').eq('voided', false).or('entry_id.not.is.null,rental_id.not.is.null')),
    get<Row[]>(db!.from('prices').select('amount').eq('kind', 'entry')),
    // Waiting for a decision, whatever week they are in: lessons trainers asked for, and their requests to move or cancel.
    get<Row[]>(db!.from('lessons').select('*, trainers(full_name), lesson_students(students(full_name))').eq('status', 'requested').order('held_on').order('start_time')),
    get<Row[]>(db!.from('lesson_requests').select('*, lessons(held_on, start_time, minutes, trainers(full_name), lesson_students(students(full_name)))').eq('status', 'pending').order('created_at')),
    // Group classes already marked as taken place (a class moved within a week or so keeps its own date).
    get<Row[]>(db!.from('class_sessions').select('slot_id, held_on').gte('held_on', addDays(start, -60)).lte('held_on', addDays(end, 60))),
  ]);
  const tookPlace = (c: Row) => sessions.some((x) => x.slot_id === c.slot_id && x.held_on === c.on_date);
  const entryPrice = Number(entryPrices[0]?.amount ?? 0);
  const halls: string[] = settings[0]?.value ?? [];
  const hallOptions: [string, string][] = [['', '—'], ...halls.map((x): [string, string] => [x, x])];
  const trainerOptions = trainers.map((x): [string, string] => [x.id, x.full_name]);
  const trainerName = (id: string | null) => trainers.find((x) => x.id === id)?.full_name ?? '';
  const names = (l: Row) => l.lesson_students.map((x: Row) => x.students.full_name).join(' + ');
  const done = (p: PromiseLike<boolean>) => p.then((okay) => { if (okay) nav.refresh(); });

  // What goes on the grid: group classes as they really are that day, the
  // week's lessons that have a time and aren't cancelled, and the rentals.
  const onGrid = new Map<string, Entry[]>(dates.map((d) => [d, [
    ...classes.filter((c) => c.held_on === d && !c.cancelled).map((c): Entry => ({
      group: c, key: `g:${c.slot_id}:${c.on_date}`,
      item: { start: hhmm(c.start_time), end: plus(c.start_time, c.minutes), title: `${tookPlace(c) ? '✓ ' : ''}${c.changed ? '✎ ' : ''}${c.group_name}`, column: trainerName(c.trainer_id), hall: c.hall }, // ✓ = took place, ✎ = changed for this date
    })),
    ...lessons.filter((l) => l.held_on === d && l.start_time && l.status !== 'cancelled').map((l): Entry => ({
      lesson: l, key: `l:${l.id}`,
      item: {
        start: hhmm(l.start_time), end: plus(l.start_time, l.minutes), column: l.trainers.full_name, hall: l.hall,
        title: `${MARK[l.status] ?? (l.held_on < today() ? '⚠ ' : '')}${names(l)}`, // ⚠ = its day has passed and nobody said what happened
      },
    })),
    // The grid draws a card as a rental when its "column" says so (t('rent') does, in all three languages).
    ...rentals.filter((r) => r.held_on === d).map((r): Entry => ({
      rental: r, key: `r:${r.id}`,
      item: { start: hhmm(r.start_time), end: plus(r.start_time, r.minutes), title: r.who, column: t('rent'), hall: r.hall },
    })),
    ...events.filter((e) => e.held_on === d).map((e): Entry => ({
      event: e, key: `e:${e.id}`,
      item: { start: hhmm(e.start_time), end: plus(e.start_time, e.minutes), title: `★ ${e.title}`, column: trainerName(e.trainer_id), hall: e.hall }, // ★ = a one-time group
    })),
  ]]));

  const nowParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
  const grid = h('div', { className: 'week' });
  // weekGrid() escapes every text it is given; the day heading below is built from the date alone.
  grid.innerHTML = weekGrid({
    dates,
    byDate: new Map([...onGrid].map(([d, list]) => [d, list.map((e) => e.item)])),
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

  // ── Money from someone who is not a client: a method, an amount, and straight to the confirmation ──
  const paidFor = (key: 'entry_id' | 'rental_id', id: string) => guestPaid.filter((p) => p[key] === id).reduce((s, p) => s + Number(p.amount), 0);
  const guestPay = (payer: string, what: string, amount: number, ref: Row) => {
    const method = select(METHODS.map((m): [string, string] => [m, t(m)]), 'cash', () => {});
    const sum = h('input', { type: 'number', min: 0, step: 'any', className: 'num', value: amount, ariaLabel: t('amount') });
    return h('span', { className: 'row' }, method, sum, h('button', { type: 'button', className: 'primary', textContent: t('recordPayment'), onclick: async () => {
      if (!(Number(sum.value) > 0)) return flash(t('needAmount'), true);
      const id = await get<string>(db!.rpc('record_payment', { p: { payer_name: payer, what, amount: Number(sum.value), method: method.value, ...ref }, lines: [] }));
      location.hash = `#/receipt/${id}`;
    } }));
  };

  // ── One-time entries, to a one-time group or to a regular class on a date ──
  // A client's student gets it on their account; a guest is a name and pays here.
  const entriesBlock = (target: Row, defaultAmount: number, what: string): Part[] => {
    const list = entries.filter((e) => (target.event_id ? e.event_id === target.event_id : e.group_id === target.group_id && e.held_on === target.held_on));
    const guestName = h('input', { type: 'text', placeholder: t('name') });
    const who = select([['', t('guest')], ...students.map((s): [string, string] => [s.id, s.full_name])], '', (v) => (guestName.hidden = !!v));
    const amount = h('input', { type: 'number', min: 0, step: 'any', className: 'num', value: defaultAmount, ariaLabel: t('amount') });
    return [
      h('h3', { textContent: `${t('entries')} (${list.length})` }),
      ...list.map((e) => {
        const paid = paidFor('entry_id', e.id);
        return h('div', { className: 'row' },
          h('span', { className: 'grow' },
            e.students ? h('a', { href: `#/client/${e.students.client_id}/pay`, textContent: e.students.full_name }) : e.guest_name,
            e.phone && ' · ', e.phone && h('a', { href: `tel:${e.phone}`, dir: 'ltr', textContent: e.phone }), ' · ', ltr(money(e.amount)),
            e.online && h('small', {}, t('signedOnline')),
            // What they filled in on the sign-up page, beyond the name and phone.
            (e.details?.email || e.details?.id_number || e.details?.comment) && h('small', {},
              [e.details.email, e.details.id_number && `${t('idNumber')}: ${e.details.id_number}`, e.details.comment].filter(Boolean).join(' · ')),
            e.students ? h('small', {}, t('onClientAccount')) : paid >= Number(e.amount) && h('small', {}, `✓ ${t('paid')}`)
          ),
          !e.students && paid < Number(e.amount) && guestPay(e.guest_name, what, Number(e.amount) - paid, { entry_id: e.id }),
          sureButton('×', () => done(ok(db!.from('entries').delete().eq('id', e.id))), { title: t('del'), ariaLabel: t('del') })
        );
      }),
      h('div', { className: 'row' }, who, guestName, amount, h('button', { type: 'button', textContent: t('addEntry'), onclick: async () => {
        if (!who.value && !guestName.value.trim()) return flash(t('needName'), true);
        await get(db!.rpc('add_entry', { e: { ...target, student_id: who.value, guest_name: who.value ? '' : guestName.value.trim(), amount: Number(amount.value) || 0 } }));
        flash(t('saved'));
        nav.refresh();
      } })),
    ];
  };

  // ── One-time groups (master classes) ──
  const eventPanel = (e: Row): Part[] => {
    const save = (patch: Row) => done(ok(db!.from('events').update(patch).eq('id', e.id)));
    const onChange = (key: string, numeric = false) => (ev: Event) => {
      const v = (ev.target as HTMLInputElement).value.trim();
      if (v) save({ [key]: numeric ? Number(v) : v });
    };
    return [
      h('p', { className: 'quote' }, `★ ${e.title} · `, ltr(`${dayText(e.held_on)} ${hhmm(e.start_time)}–${plus(e.start_time, e.minutes)}`), ` · ${e.hall || '—'} · ${trainerName(e.trainer_id) || '—'} · `, ltr(money(e.price))),
      h('div', { className: 'grid' },
        field(t('title'), h('input', { type: 'text', value: e.title, onchange: onChange('title') })),
        field(t('date'), h('input', { type: 'date', value: e.held_on, onchange: onChange('held_on') })),
        field(t('time'), h('input', { type: 'time', step: 300, value: hhmm(e.start_time), onchange: onChange('start_time') })),
        field(t('minutes'), h('input', { type: 'number', min: 1, className: 'num', value: e.minutes, onchange: onChange('minutes', true) })),
        field(t('hall'), select(hallOptions, e.hall, (v) => save({ hall: v }))),
        field(t('trainer'), select([['', '—'], ...trainerOptions], e.trainer_id ?? '', (v) => save({ trainer_id: v || null }))),
        field(t('pricePerEntry'), h('input', { type: 'number', min: 0, step: 'any', className: 'num', value: Number(e.price), onchange: onChange('price', true) }))
      ),
      // Online sign-up: off by default. When on, anyone with the link can add themselves as a guest (name and phone).
      h('div', { className: 'row' },
        h('label', { className: 'tick' }, h('input', { type: 'checkbox', checked: e.public_signup, onchange: (ev: Event) => save({ public_signup: (ev.target as HTMLInputElement).checked }) }), t('openSignup')),
        h('label', { className: 'tick' }, t('capacity'), h('input', { type: 'number', min: 1, className: 'num', value: e.capacity ?? '', onchange: (ev: Event) => { const v = (ev.target as HTMLInputElement).value; save({ capacity: v === '' ? null : Number(v) }); } }))
      ),
      e.public_signup && h('div', { className: 'row' },
        h('input', { type: 'text', readOnly: true, value: signupLink(e.id), ariaLabel: t('shareLink'), dir: 'ltr', onfocus: (ev: Event) => (ev.target as HTMLInputElement).select() }),
        h('button', { type: 'button', textContent: t('copyLink'), onclick: () => navigator.clipboard.writeText(signupLink(e.id)).then(() => flash(t('copied'))) }),
        h('a', { className: 'btn', href: signupLink(e.id), target: '_blank', rel: 'noopener', textContent: t('open') })
      ),
      ...entriesBlock({ event_id: e.id }, Number(e.price), `${e.title}, ${dayText(e.held_on)}`),
      h('div', { className: 'row' }, sureButton(t('del'), () => done(ok(db!.from('events').delete().eq('id', e.id))))),
    ];
  };

  // ── Private lessons ──
  const setStatus = (l: Row, status: string) => done(ok(db!.rpc('set_lesson_status', { lid: l.id, new_status: status })));
  const lessonActions = (l: Row) => [
    // Asked for by the trainer: approve it (it becomes planned) or reject it (it goes).
    ...(l.status === 'requested'
      ? [h('button', { type: 'button', className: 'primary', textContent: t('approve'), onclick: () => setStatus(l, 'planned') })]
      : l.status === 'planned'
      ? [
          ...CHARGED.map((st) => h('button', { type: 'button', className: st === 'done' ? 'primary' : '', textContent: t(st), onclick: () => setStatus(l, st) })),
          h('button', { type: 'button', textContent: t('cancelLesson'), onclick: () => setStatus(l, 'cancelled') }),
        ]
      : [h('button', { type: 'button', textContent: `↺ ${t('backToPlanned')}`, onclick: () => setStatus(l, 'planned') })]),
    sureButton(t(l.status === 'requested' ? 'reject' : 'del'), () => done(ok(db!.from('lessons').delete().eq('id', l.id)))),
  ];
  const lessonPanel = (l: Row): Part[] => {
    const move = (patch: Row) => done(ok(db!.from('lessons').update(patch).eq('id', l.id)));
    // Another trainer means that trainer's price and pay for the same length.
    const changeTrainer = (id: string, el: HTMLSelectElement) => {
      const r = rates.find((x) => x.trainer_id === id && x.minutes === l.minutes);
      if (!r) {
        el.value = l.trainer_id;
        return flash(t('noRate'), true);
      }
      move({ trainer_id: id, price: r.price, trainer_pay: r.pay_kind === 'fixed' ? r.pay_value : Math.round(Number(r.price) * Number(r.pay_value)) / 100 });
    };
    return [
      h('p', { className: 'quote' },
        `${names(l)} · ${l.trainers.full_name} ${l.minutes}′ · `, ltr(money(l.price)), ` (${t('trainerGets')}: `, ltr(money(l.trainer_pay)), `) · ${t(l.status as Key)}`,
        l.note && h('small', {}, l.note)
      ),
      // A planned lesson can still be moved or given to another trainer; a confirmed one keeps its place.
      (l.status === 'planned' || l.status === 'requested') && h('div', { className: 'grid' },
        field(t('date'), h('input', { type: 'date', value: l.held_on, onchange: (ev: Event) => move({ held_on: (ev.target as HTMLInputElement).value }) })),
        field(t('time'), h('input', { type: 'time', step: 300, value: hhmm(l.start_time), onchange: (ev: Event) => move({ start_time: (ev.target as HTMLInputElement).value }) })),
        field(t('hall'), select(hallOptions, l.hall, (v) => move({ hall: v }))),
        field(t('trainer'), select(trainerOptions, l.trainer_id, changeTrainer))
      ),
      h('div', { className: 'row' }, ...lessonActions(l)),
    ];
  };

  // ── Group classes: a change for this one date, or for every week ──
  const classPanel = (c: Row): Part[] => {
    const slot = slots.find((s) => s.id === c.slot_id)!;
    const once = (patch: Row) => done(ok(db!.from('group_slot_changes').upsert({ slot_id: c.slot_id, on_date: c.on_date, ...patch }, { onConflict: 'slot_id,on_date' })));
    const always = (patch: Row) => done(ok(db!.from('group_slots').update(patch).eq('id', slot.id)));
    return [
      h('p', { className: 'quote' }, `${c.group_name} · `, ltr(`${dayText(c.held_on)} ${hhmm(c.start_time)}–${plus(c.start_time, c.minutes)}`), ` · ${c.hall || '—'} · ${trainerName(c.trainer_id) || '—'}`),
      h('h3', {}, `${t('onlyThisDate')} `, ltr(dayText(c.on_date))),
      h('div', { className: 'grid' },
        field(t('date'), h('input', { type: 'date', value: c.held_on, onchange: (ev: Event) => once({ new_date: (ev.target as HTMLInputElement).value || null }) })),
        field(t('time'), h('input', { type: 'time', step: 300, value: hhmm(c.start_time), onchange: (ev: Event) => { const v = (ev.target as HTMLInputElement).value; if (v) once({ start_time: v }); } })),
        field(t('hall'), select(hallOptions, c.hall, (v) => once({ hall: v }))),
        field(t('trainer'), select([['', '—'], ...trainerOptions], c.trainer_id ?? '', (v) => once({ trainer_id: v || null })))
      ),
      h('div', { className: 'row' },
        h('button', { type: 'button', textContent: t('cancelClass'), onclick: () => once({ cancelled: true }) }),
        c.changed && h('button', { type: 'button', textContent: `↺ ${t('backToUsual')}`, onclick: () => done(ok(db!.from('group_slot_changes').delete().eq('slot_id', c.slot_id).eq('on_date', c.on_date))) })
      ),
      h('h3', { textContent: t('everyWeek') }),
      h('div', { className: 'grid' },
        field(t('weekday'), select([0, 1, 2, 3, 4, 5, 6].map((n): [string, string] => [String(n), WEEKDAY(n)]), String(slot.weekday), (v) => always({ weekday: Number(v) }))),
        field(t('time'), h('input', { type: 'time', step: 300, value: hhmm(slot.start_time), onchange: (ev: Event) => { const v = (ev.target as HTMLInputElement).value; if (v) always({ start_time: v }); } })),
        field(t('minutes'), h('input', { type: 'number', min: 1, className: 'num', value: slot.minutes, onchange: (ev: Event) => { const v = Number((ev.target as HTMLInputElement).value); if (v > 0) always({ minutes: v }); } })),
        field(t('hall'), select(hallOptions, slot.hall, (v) => always({ hall: v }))),
        field(t('trainer'), select([['', '—'], ...trainerOptions], slot.trainer_id ?? '', (v) => always({ trainer_id: v || null }))),
        field(t('classPay'), h('input', { type: 'number', min: 0, step: 'any', className: 'num', value: Number(slot.class_pay), onchange: (ev: Event) => always({ class_pay: Number((ev.target as HTMLInputElement).value) || 0 }) }))
      ),
      // Who came. Saving it is what says the class took place, and earns its trainer the class pay.
      attendanceBlock(c.slot_id, c.on_date, false),
      ...entriesBlock({ group_id: c.group_id, held_on: c.held_on }, entryPrice, `${t('oneTimeEntry')}: ${c.group_name}, ${dayText(c.held_on)}`),
    ];
  };

  // ── Hall rentals ──
  const rentalPanel = (r: Row): Part[] => {
    const save = (patch: Row) => done(ok(db!.from('rentals').update(patch).eq('id', r.id)));
    const text = (key: string, type = 'text', props: Row = {}) =>
      h('input', { type, value: r[key] ?? '', ...props, onchange: (ev: Event) => { const v = (ev.target as HTMLInputElement).value.trim(); if (v || key === 'price' || key === 'note') save({ [key]: key === 'price' ? (v === '' ? null : Number(v)) : key === 'minutes' ? Number(v) : v }); } });
    const paid = paidFor('rental_id', r.id);
    return [
      h('p', { className: 'quote' }, `🔑 ${r.who} · `, ltr(`${dayText(r.held_on)} ${hhmm(r.start_time)}–${plus(r.start_time, r.minutes)}`), ` · ${r.hall || '—'}`, r.price != null && ' · ', r.price != null && ltr(money(r.price))),
      h('div', { className: 'grid' },
        field(t('who'), text('who')), field(t('date'), text('held_on', 'date')),
        field(t('time'), h('input', { type: 'time', step: 300, value: hhmm(r.start_time), onchange: (ev: Event) => { const v = (ev.target as HTMLInputElement).value; if (v) save({ start_time: v }); } })),
        field(t('minutes'), text('minutes', 'number', { min: 1, className: 'num' })),
        field(t('hall'), select(hallOptions, r.hall, (v) => save({ hall: v }))),
        field(t('price'), text('price', 'number', { min: 0, step: 'any', className: 'num' })),
        field(t('comment'), text('note'), 'wide')
      ),
      r.price != null && (paid >= Number(r.price)
        ? h('p', { className: 'muted' }, `✓ ${t('paid')}: `, ltr(money(paid)))
        : h('div', { className: 'row' }, h('span', {}, `${t('owed')}: `, ltr(money(Number(r.price) - paid))),
            guestPay(r.who, `${t('rentals')}${r.hall ? `, ${r.hall}` : ''}, ${dayText(r.held_on)} ${hhmm(r.start_time)}–${plus(r.start_time, r.minutes)}`, Number(r.price) - paid, { rental_id: r.id }))),
      h('div', { className: 'row' }, sureButton(t('del'), () => done(ok(db!.from('rentals').delete().eq('id', r.id))))),
    ];
  };

  // The panel under the grid: what was clicked, and what can be done with it.
  const detail = h('div', { className: 'stack detail' });
  const open = (d: string, n: number, scroll: boolean) => {
    const e = onGrid.get(d)![n];
    picked = e.key;
    grid.querySelector('.is-picked')?.classList.remove('is-picked');
    grid.querySelector(`[data-ev="${d}|${n}"]`)?.classList.add('is-picked');
    const parts = e.lesson ? lessonPanel(e.lesson) : e.group ? classPanel(e.group) : e.event ? eventPanel(e.event) : rentalPanel(e.rental!);
    detail.replaceChildren(...parts.filter((x): x is HTMLElement => !!x));
    if (scroll) detail.scrollIntoView({ block: 'nearest' });
  };
  grid.onclick = (ev) => {
    const card = (ev.target as Element).closest<HTMLElement>('[data-ev]');
    if (!card) return;
    const [d, n] = card.dataset.ev!.split('|');
    open(d, Number(n), true);
  };
  // After a change the screen redraws: bring back the panel that was open, if its card is still in this week.
  for (const [d, list] of onGrid) {
    const n = list.findIndex((e) => e.key === picked);
    if (n >= 0) open(d, n, false);
  }

  // ── Add a private lesson ──
  // Choosing a trainer offers that trainer's lesson lengths; the first student's
  // dance partner is offered as the second; up to four share a lesson.
  const studentOptions = students.map((s): [string, string] => [s.id, s.full_name]);
  const firstDay = dates.includes(today()) ? today() : start;
  const date = h('input', { type: 'date', value: firstDay, required: true });
  const time = h('input', { type: 'time', step: 300, required: true });
  const minutes = h('select', { required: true });
  const price = h('input', { type: 'number', step: 'any', min: 0, className: 'num' });
  const rateOf = () => rates.find((r) => r.trainer_id === trainer.value && String(r.minutes) === minutes.value);
  const showRate = () => (price.placeholder = rateOf() ? String(Number(rateOf()!.price)) : '');
  const trainer = select([['', '—'], ...trainerOptions], '', (v) => {
    minutes.replaceChildren(...rates.filter((r) => r.trainer_id === v).map((r) => h('option', { value: String(r.minutes), textContent: String(r.minutes) })));
    showRate();
  }, { required: true });
  minutes.onchange = showRate;
  const hall = select(halls.map((x): [string, string] => [x, x]), halls[0] ?? '', () => {});
  const others = [1, 2, 3].map((n) => select([['', '—'], ...studentOptions], '', () => {}, { ariaLabel: `${t('student')} ${n + 1}` }));
  const first = select([['', '—'], ...studentOptions], '', (v) => (others[0].value = students.find((s) => s.id === v)?.partner_id ?? ''), { required: true });
  const note = h('input', { type: 'text' });
  const goTo = (iso: string) => {
    flash(t('saved'));
    // Show the week it landed in: a new address redraws by itself, the same one needs a nudge.
    const target = `#/lessons/${iso}`;
    if (location.hash === target) nav.refresh();
    else location.hash = target;
  };
  const lessonForm = h('form', { className: 'stack' },
    h('h2', { textContent: t('scheduleLesson') }),
    h('div', { className: 'grid' },
      field(t('date'), date), field(t('time'), time), field(t('trainer'), trainer), field(t('minutes'), minutes),
      field(t('hall'), hall), field(t('student'), first), field(t('price'), price), field(t('comment'), note),
      field(t('secondStudent'), h('div', { className: 'row' }, ...others), 'full')
    ),
    h('p', { className: 'muted', textContent: t('lessonPriceHint') }),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('scheduleLesson') }))
  );
  lessonForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const group = [first.value, ...others.map((o) => o.value)].filter((id, i, all) => id && all.indexOf(id) === i);
    await get(db!.rpc('record_lesson', {
      l: { trainer_id: trainer.value, held_on: date.value, start_time: time.value, minutes: Number(minutes.value), hall: hall.value, price: price.value, note: note.value.trim() },
      student_ids: group,
    }));
    goTo(date.value);
  };

  // ── Add a hall rental ──
  const rDate = h('input', { type: 'date', value: firstDay, required: true });
  const rTime = h('input', { type: 'time', step: 300, required: true });
  const rMinutes = h('input', { type: 'number', min: 1, value: 60, className: 'num', required: true });
  const rHall = select(halls.map((x): [string, string] => [x, x]), halls[0] ?? '', () => {});
  const rWho = h('input', { type: 'text', required: true });
  const rPrice = h('input', { type: 'number', min: 0, step: 'any', className: 'num' });
  const rNote = h('input', { type: 'text' });
  const rentalForm = h('form', { className: 'stack' },
    h('h2', { textContent: t('addRental') }),
    h('div', { className: 'grid' },
      field(t('date'), rDate), field(t('time'), rTime), field(t('minutes'), rMinutes), field(t('hall'), rHall),
      field(t('who'), rWho), field(t('price'), rPrice), field(t('comment'), rNote, 'wide')
    ),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('addRental') }))
  );
  rentalForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const saved = await ok(db!.from('rentals').insert({ held_on: rDate.value, start_time: rTime.value, minutes: Number(rMinutes.value), hall: rHall.value, who: rWho.value.trim(), price: rPrice.value === '' ? null : Number(rPrice.value), note: rNote.value.trim() }));
    if (saved) goTo(rDate.value);
  };

  // ── Add a one-time group (master class) ──
  const eTitle = h('input', { type: 'text', required: true });
  const eDate = h('input', { type: 'date', value: firstDay, required: true });
  const eTime = h('input', { type: 'time', step: 300, required: true });
  const eMinutes = h('input', { type: 'number', min: 1, value: 90, className: 'num', required: true });
  const eHall = select(halls.map((x): [string, string] => [x, x]), halls[0] ?? '', () => {});
  const eTrainer = select([['', '—'], ...trainerOptions], '', () => {});
  const ePrice = h('input', { type: 'number', min: 0, step: 'any', className: 'num', required: true });
  const eventForm = h('form', { className: 'stack' },
    h('h2', { textContent: t('addEvent') }),
    h('div', { className: 'grid' },
      field(t('title'), eTitle, 'wide'), field(t('date'), eDate), field(t('time'), eTime), field(t('minutes'), eMinutes),
      field(t('hall'), eHall), field(t('trainer'), eTrainer), field(t('pricePerEntry'), ePrice)
    ),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('addEvent') }))
  );
  eventForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const saved = await ok(db!.from('events').insert({ title: eTitle.value.trim(), held_on: eDate.value, start_time: eTime.value, minutes: Number(eMinutes.value), hall: eHall.value, trainer_id: eTrainer.value || null, price: Number(ePrice.value) || 0 }));
    if (saved) goTo(eDate.value);
  };

  // ── Requests from trainers ──
  const decide = (r: Row, approve: boolean) => done(ok(db!.rpc('decide_lesson_request', { rid: r.id, approve })));
  const requestsCard = (asked.length > 0 || changes.length > 0) && h('section', { className: 'card' },
    h('h2', { textContent: `${t('requests')} (${asked.length + changes.length})` }),
    ...asked.map((l) => h('div', { className: 'row' },
      h('span', { className: 'grow' }, `${t('newLesson')}: ${l.trainers.full_name} · ${names(l)} · `, ltr(`${dayText(l.held_on)} ${hhmm(l.start_time ?? '')}, ${l.minutes}′`), l.hall && ` · ${l.hall}`, l.note && h('small', {}, l.note)),
      h('a', { className: 'btn', href: `#/lessons/${l.held_on}`, textContent: t('open') }),
      h('button', { type: 'button', className: 'primary', textContent: t('approve'), onclick: () => setStatus(l, 'planned') }),
      sureButton(t('reject'), () => done(ok(db!.from('lessons').delete().eq('id', l.id))))
    )),
    ...changes.map((r) => h('div', { className: 'row' },
      h('span', { className: 'grow' }, `${r.lessons.trainers.full_name} · ${names(r.lessons)} · `, ltr(`${dayText(r.lessons.held_on)} ${hhmm(r.lessons.start_time ?? '')}`),
        r.kind === 'move' ? ' → ' : ` → ${t('cancelled')}`, r.kind === 'move' && ltr(`${dayText(r.new_date)} ${hhmm(r.new_time)}`), r.note && h('small', {}, r.note)),
      h('button', { type: 'button', className: 'primary', textContent: t('approve'), onclick: () => decide(r, true) }),
      h('button', { type: 'button', textContent: t('reject'), onclick: () => decide(r, false) })
    ))
  );

  // Under the grid: what is not on it — cancelled lessons and classes, lessons without a time.
  const offLessons = lessons.filter((l) => !l.start_time || l.status === 'cancelled');
  const offClasses = classes.filter((c) => c.cancelled);
  const overdue = [...new Set(waiting.map((l) => addDays(l.held_on, -weekdayOf(l.held_on))))]; // weeks with a planned lesson whose day has passed
  return h('div', { className: 'stack' },
    requestsCard,
    h('section', { className: 'card' },
      h('div', { className: 'row monthbar' },
        h('a', { href: `#/lessons/${addDays(start, -7)}`, className: 'btn', textContent: '‹', ariaLabel: addDays(start, -7) }),
        h('h1', {}, ltr(`${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`)),
        h('a', { href: `#/lessons/${addDays(start, 7)}`, className: 'btn', textContent: '›', ariaLabel: addDays(start, 7) }),
        !dates.includes(today()) && h('a', { href: '#/lessons', className: 'btn', textContent: t('thisWeek') })
      ),
      overdue.length > 0 && h('p', { className: 'warn' }, `${t('needsConfirming')} `,
        ...overdue.flatMap((w, i) => [i > 0 && ', ', h('a', { href: `#/lessons/${w}`, textContent: fmt(w, { day: 'numeric', month: 'short' }) })])),
      h('p', { className: 'muted', textContent: t('gridHint') }),
      h('div', { className: 'scroll' }, grid),
      detail,
      (offLessons.length > 0 || offClasses.length > 0) && h('div', { className: 'stack' },
        h('h3', { textContent: t('cancelledList') }),
        ...offClasses.map((c) => h('div', { className: 'row' },
          h('span', { className: 'grow muted' }, ltr(`${dayText(c.on_date)} ${hhmm(c.start_time)}`), ` · ${c.group_name} · ${t('cancelled')}`),
          h('button', { type: 'button', textContent: `↺ ${t('backToUsual')}`, onclick: () => done(ok(db!.from('group_slot_changes').delete().eq('slot_id', c.slot_id).eq('on_date', c.on_date))) })
        )),
        ...offLessons.map((l) => h('div', { className: 'row' },
          h('span', { className: 'grow muted' }, ltr(`${dayText(l.held_on)}${l.start_time ? ` ${hhmm(l.start_time)}` : ''}`), ` · ${l.trainers.full_name} · ${names(l)} · ${t(l.status as Key)}`),
          ...lessonActions(l)
        ))
      )
    ),
    h('section', { className: 'card' }, lessonForm),
    h('section', { className: 'card' }, eventForm),
    h('section', { className: 'card' }, rentalForm)
  );
}
