// Private lessons and the trainers' money: the month's lessons with a form to
// schedule one (a couple is two students, each charged half), and the
// Trainers tab — what each has earned, what was given, what is still to give.
import { getLang, t, LOCALE, type Key } from '../i18n';
import { db, h, get, ok, nav, select, field, sureButton, flash, money, ltr, today, type Row } from '../ui';

const CHARGED = ['done', 'no_show', 'late_cancel'] as const;
const shift = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
};
const dateText = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });
const sum = (rows: Row[], key: string) => rows.reduce((s, r) => s + Number(r[key]), 0);

// A private lesson is scheduled first (planned), and confirmed afterwards: took
// place, no-show or late cancellation are charged and earn the trainer their
// part; a lesson cancelled in time costs nothing.
export async function lessonsView(arg?: string) {
  const ym = /^\d{4}-\d{2}$/.test(arg ?? '') ? (arg as string) : today().slice(0, 7);
  const [lessons, trainers, rates, students] = await Promise.all([
    get<Row[]>(db!.from('lessons').select('*, trainers(full_name), lesson_students(students(full_name))').gte('held_on', `${ym}-01`).lt('held_on', `${shift(ym, 1)}-01`).order('held_on').order('start_time')),
    get<Row[]>(db!.from('trainers').select('id, full_name').eq('archived', false).order('full_name')),
    get<Row[]>(db!.from('trainer_rates').select('*').order('minutes')),
    get<Row[]>(db!.from('students').select('id, full_name, partner_id').eq('archived', false).order('full_name')),
  ]);

  // The form. Choosing a trainer offers that trainer's lesson lengths; choosing
  // a student who has a dance partner fills in the partner as the second one.
  const studentOptions = students.map((s): [string, string] => [s.id, s.full_name]);
  const date = h('input', { type: 'date', value: today(), required: true });
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
  const second = select([['', '—'], ...studentOptions], '', () => {});
  const first = select([['', '—'], ...studentOptions], '', (v) => (second.value = students.find((s) => s.id === v)?.partner_id ?? ''), { required: true });
  const note = h('input', { type: 'text' });
  const form = h('form', { className: 'stack' },
    h('h2', { textContent: t('scheduleLesson') }),
    h('div', { className: 'grid' },
      field(t('date'), date), field(t('time'), time), field(t('trainer'), trainer), field(t('minutes'), minutes),
      field(t('student'), first), field(t('secondStudent'), second), field(t('price'), price), field(t('comment'), note)
    ),
    h('p', { className: 'muted', textContent: t('lessonPriceHint') }),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('scheduleLesson') }))
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const pair = [first.value, second.value].filter((id, i, all) => id && all.indexOf(id) === i);
    await get(db!.rpc('record_lesson', {
      l: { trainer_id: trainer.value, held_on: date.value, start_time: time.value, minutes: Number(minutes.value), price: price.value, note: note.value.trim() },
      student_ids: pair,
    }));
    flash(t('saved'));
    // Show the month the lesson landed in: a new address redraws by itself, the same one needs a nudge.
    const target = `#/lessons/${date.value.slice(0, 7)}`;
    if (location.hash === target) nav.refresh();
    else location.hash = target;
  };

  const setStatus = async (l: Row, status: string) => {
    if (await ok(db!.rpc('set_lesson_status', { lid: l.id, new_status: status }))) nav.refresh();
  };
  const row = (l: Row) => {
    const planned = l.status === 'planned';
    const waiting = planned && l.held_on < today(); // its day has passed and nobody said what happened
    const move = (patch: Row) => ok(db!.from('lessons').update(patch).eq('id', l.id)).then((done) => { if (done) nav.refresh(); });
    return h('tr', { className: l.status === 'cancelled' ? 'off' : waiting ? 'pending' : '' },
      // A planned lesson can still be moved; a confirmed one keeps its day.
      planned
        ? h('td', {}, h('div', { className: 'row when' },
            h('input', { type: 'date', value: l.held_on, ariaLabel: t('date'), onchange: (e: Event) => move({ held_on: (e.target as HTMLInputElement).value }) }),
            h('input', { type: 'time', step: 300, value: (l.start_time ?? '').slice(0, 5), ariaLabel: t('time'), onchange: (e: Event) => move({ start_time: (e.target as HTMLInputElement).value || null }) })
          ))
        : h('td', {}, ltr(`${dateText(l.held_on)}${l.start_time ? ` ${l.start_time.slice(0, 5)}` : ''}`)),
      h('td', {}, l.trainers.full_name, h('small', {}, `${l.minutes}′`)),
      h('td', {}, l.lesson_students.map((x: Row) => x.students.full_name).join(' + '), l.note && h('small', {}, l.note)),
      h('td', {}, ltr(money(l.price)), h('small', {}, `${t('trainerGets')}: ${money(l.trainer_pay)}`)),
      h('td', { className: (CHARGED as readonly string[]).includes(l.status) ? 'ok' : '' }, t(l.status as Key)),
      h('td', { className: 'actions' },
        ...(planned
          ? [
              ...CHARGED.map((st) => h('button', { type: 'button', className: st === 'done' ? 'primary' : '', textContent: t(st), onclick: () => setStatus(l, st) })),
              h('button', { type: 'button', textContent: t('cancelLesson'), onclick: () => setStatus(l, 'cancelled') }),
            ]
          : [h('button', { type: 'button', textContent: '↺', title: t('backToPlanned'), ariaLabel: t('backToPlanned'), onclick: () => setStatus(l, 'planned') })]),
        sureButton('×', async () => { if (await ok(db!.from('lessons').delete().eq('id', l.id))) nav.refresh(); }, { title: t('del'), ariaLabel: t('del') })
      )
    );
  };

  const charged = lessons.filter((l) => (CHARGED as readonly string[]).includes(l.status));
  const label = new Date(`${ym}-01T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return h('div', { className: 'stack' },
    h('section', { className: 'card' }, form),
    h('section', { className: 'card' },
      h('div', { className: 'row monthbar' },
        h('a', { href: `#/lessons/${shift(ym, -1)}`, className: 'btn', textContent: '‹', ariaLabel: shift(ym, -1) }),
        h('h1', { textContent: label }),
        h('a', { href: `#/lessons/${shift(ym, 1)}`, className: 'btn', textContent: '›', ariaLabel: shift(ym, 1) })
      ),
      lessons.some((l) => l.status === 'planned' && l.held_on < today()) && h('p', { className: 'warn', textContent: t('needsConfirming') }),
      lessons.length
        ? h('div', { className: 'scroll' }, h('table', {},
            h('thead', {}, h('tr', {}, ...[t('date'), t('trainer'), t('students'), t('price'), t('status'), ''].map((x) => h('th', {}, x)))),
            h('tbody', {}, ...lessons.map(row))
          ))
        : h('p', { className: 'muted', textContent: t('noLessons') }),
      lessons.length > 0 && h('p', { className: 'quote' },
        `${t('done')}: ${charged.length} · `, ltr(money(sum(charged, 'price'))), ` · ${t('trainerGets')}: `, ltr(money(sum(charged, 'trainer_pay'))),
        ` · ${t('planned')}: ${lessons.filter((l) => l.status === 'planned').length}`
      )
    )
  );
}

export async function trainersView() {
  const [trainers, balances, payouts] = await Promise.all([
    get<Row[]>(db!.from('trainers').select('id, full_name, archived').order('full_name')),
    get<Row[]>(db!.from('trainer_balances').select('*')),
    get<Row[]>(db!.from('trainer_payouts').select('*, trainers(full_name)').order('paid_on', { ascending: false }).order('created_at', { ascending: false }).limit(100)),
  ]);
  const row = (x: Row) => {
    const b = balances.find((y) => y.trainer_id === x.id) ?? { earned: 0, paid: 0, owed: 0 };
    const amount = h('input', { type: 'number', step: 'any', className: 'num', value: Number(b.owed) > 0 ? Number(b.owed) : '', ariaLabel: t('amount') });
    const note = h('input', { type: 'text', placeholder: t('comment') });
    return h('tr', { className: x.archived ? 'off' : '' },
      h('td', {}, x.full_name),
      h('td', {}, ltr(money(b.earned))),
      h('td', {}, ltr(money(b.paid))),
      h('td', { className: Number(b.owed) > 0 ? 'owes' : '' }, ltr(money(b.owed))),
      h('td', { className: 'actions' }, h('div', { className: 'row' }, amount, note, h('button', { type: 'button', textContent: t('recordPayout'), onclick: async () => {
        if (!(Number(amount.value) > 0)) return flash(t('needAmount'), true);
        if (await ok(db!.from('trainer_payouts').insert({ trainer_id: x.id, amount: Number(amount.value), comment: note.value.trim() }))) nav.refresh();
      } })))
    );
  };
  return h('div', { className: 'stack' },
    h('section', { className: 'card' },
      h('h1', { textContent: t('trainersTab') }),
      h('div', { className: 'scroll' }, h('table', {},
        h('thead', {}, h('tr', {}, ...[t('trainer'), t('earned'), t('given'), t('toGive'), ''].map((x) => h('th', {}, x)))),
        h('tbody', {}, ...trainers.map(row), !trainers.length && h('tr', {}, h('td', { colSpan: 5, className: 'muted', textContent: t('emptyList') })))
      ))
    ),
    h('section', { className: 'card' },
      h('h2', { textContent: t('payouts') }),
      payouts.length
        ? h('div', { className: 'scroll' }, h('table', {}, h('tbody', {}, ...payouts.map((p) => h('tr', {},
            h('td', {}, ltr(dateText(p.paid_on))),
            h('td', {}, p.trainers.full_name),
            h('td', {}, ltr(money(p.amount))),
            h('td', { className: 'muted' }, p.comment),
            h('td', { className: 'actions' }, sureButton('×', async () => { if (await ok(db!.from('trainer_payouts').delete().eq('id', p.id))) nav.refresh(); }, { title: t('del'), ariaLabel: t('del') }))
          )))))
        : h('p', { className: 'muted', textContent: t('noPayouts') })
    )
  );
}
