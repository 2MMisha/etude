// Private lessons and the trainers' money: the lesson log for a month with a
// form to record one (a couple is two students, each charged half), and the
// Trainers tab — what each has earned, what was given, what is still to give.
import { getLang, t, LOCALE, type Key } from '../i18n';
import { db, h, get, ok, nav, select, field, sureButton, flash, money, ltr, today, type Row } from '../ui';

const STATUSES = ['done', 'no_show', 'late_cancel'] as const;
const shift = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
};
const dateText = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { timeZone: 'UTC' });
const sum = (rows: Row[], key: string) => rows.reduce((s, r) => s + Number(r[key]), 0);

export async function lessonsView(arg?: string) {
  const ym = /^\d{4}-\d{2}$/.test(arg ?? '') ? (arg as string) : today().slice(0, 7);
  const [lessons, trainers, rates, students] = await Promise.all([
    get<Row[]>(db!.from('lessons').select('*, trainers(full_name), lesson_students(students(full_name))').gte('held_on', `${ym}-01`).lt('held_on', `${shift(ym, 1)}-01`).order('held_on', { ascending: false }).order('created_at', { ascending: false })),
    get<Row[]>(db!.from('trainers').select('id, full_name').eq('archived', false).order('full_name')),
    get<Row[]>(db!.from('trainer_rates').select('*').order('minutes')),
    get<Row[]>(db!.from('students').select('id, full_name, partner_id').eq('archived', false).order('full_name')),
  ]);

  // The form. Choosing a trainer offers that trainer's lesson lengths; choosing
  // a student who has a dance partner fills in the partner as the second one.
  const studentOptions = students.map((s): [string, string] => [s.id, s.full_name]);
  const date = h('input', { type: 'date', value: today(), required: true });
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
  const status = select(STATUSES.map((s): [string, string] => [s, t(s)]), 'done', () => {});
  const note = h('input', { type: 'text' });
  const form = h('form', { className: 'stack' },
    h('h2', { textContent: t('recordLesson') }),
    h('div', { className: 'grid' },
      field(t('date'), date), field(t('trainer'), trainer), field(t('minutes'), minutes),
      field(t('student'), first), field(t('secondStudent'), second), field(t('status'), status),
      field(t('price'), price), field(t('comment'), note, 'wide')
    ),
    h('p', { className: 'muted', textContent: t('priceHint') }),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('recordLesson') }))
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const pair = [first.value, second.value].filter((id, i, all) => id && all.indexOf(id) === i);
    await get(db!.rpc('record_lesson', {
      l: { trainer_id: trainer.value, held_on: date.value, minutes: Number(minutes.value), status: status.value, price: price.value, note: note.value.trim() },
      student_ids: pair,
    }));
    flash(t('saved'));
    location.hash = `#/lessons/${date.value.slice(0, 7)}`;
    nav.refresh();
  };

  const label = new Date(`${ym}-01T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return h('div', { className: 'stack' },
    h('section', { className: 'card' }, form),
    h('section', { className: 'card' },
      h('div', { className: 'row monthbar' },
        h('a', { href: `#/lessons/${shift(ym, -1)}`, className: 'btn', textContent: '‹', ariaLabel: shift(ym, -1) }),
        h('h1', { textContent: label }),
        h('a', { href: `#/lessons/${shift(ym, 1)}`, className: 'btn', textContent: '›', ariaLabel: shift(ym, 1) })
      ),
      lessons.length
        ? h('div', { className: 'scroll' }, h('table', {},
            h('thead', {}, h('tr', {}, ...[t('date'), t('trainer'), t('students'), t('minutes'), t('status'), t('price'), t('trainerGets'), ''].map((x) => h('th', {}, x)))),
            h('tbody', {}, ...lessons.map((l) => h('tr', {},
              h('td', {}, ltr(dateText(l.held_on))),
              h('td', {}, l.trainers.full_name),
              h('td', {}, l.lesson_students.map((x: Row) => x.students.full_name).join(' + '), l.note && h('small', {}, l.note)),
              h('td', {}, String(l.minutes)),
              h('td', {}, t(l.status as Key)),
              h('td', {}, ltr(money(l.price))),
              h('td', {}, ltr(money(l.trainer_pay))),
              h('td', { className: 'actions' }, sureButton('×', async () => { if (await ok(db!.from('lessons').delete().eq('id', l.id))) nav.refresh(); }, { title: t('del'), ariaLabel: t('del') }))
            ))),
            h('tfoot', {}, h('tr', {}, h('th', { colSpan: 5 }, `${t('total')}: ${lessons.length}`), h('th', {}, ltr(money(sum(lessons, 'price')))), h('th', {}, ltr(money(sum(lessons, 'trainer_pay')))), h('th')))
          ))
        : h('p', { className: 'muted', textContent: t('noLessons') })
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
