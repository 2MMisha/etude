// Settings: the price list (programmes at 1–3 classes a week, unlimited,
// one-time entry, private lessons, rentals), the groups and the discount sizes.
import { t } from '../i18n';
import { db, h, get, ok, nav, input, number, checkbox, select, field, sureButton, type Row } from '../ui';

const PER_WEEK = [1, 2, 3];

export async function settingsView() {
  const [programs, prices, groups, settings, trainers, rates] = await Promise.all([
    get<Row[]>(db!.from('programs').select('*').order('sort').order('name')),
    get<Row[]>(db!.from('prices').select('*').order('sort').order('label')),
    get<Row[]>(db!.from('groups').select('*').order('name')),
    get<Row[]>(db!.from('settings').select('*')),
    get<Row[]>(db!.from('trainers').select('*').order('full_name')),
    get<Row[]>(db!.from('trainer_rates').select('*').order('minutes')),
  ]);
  const set = (table: string, id: string, patch: Row) => ok(db!.from(table).update(patch).eq('id', id));
  /** After a change that adds or removes a row: redraw. */
  const then = (p: Promise<boolean>) => p.then((done) => { if (done) nav.refresh(); });

  /** A price cell: typing a number saves it, clearing it removes the row. */
  const priceCell = (existing: Row | undefined, values: Row, label: string) =>
    number(existing?.amount, (v) =>
      then(
        v == null
          ? existing ? ok(db!.from('prices').delete().eq('id', existing.id)) : Promise.resolve(false)
          : existing ? set('prices', existing.id, { amount: v }) : ok(db!.from('prices').insert({ ...values, amount: v }))
      ), { ariaLabel: label });

  const newProgram = h('input', { type: 'text', placeholder: t('name'), required: true });
  const programForm = h('form', { className: 'row' }, newProgram, h('button', { type: 'submit', textContent: t('addProgramme') }));
  programForm.onsubmit = (e) => {
    e.preventDefault();
    then(ok(db!.from('programs').insert({ name: newProgram.value.trim(), sort: programs.length })));
  };

  const programmes = h('section', { className: 'card' },
    h('h2', { textContent: t('programmes') }),
    h('p', { className: 'muted', textContent: `${t('priceHint')} ${t('historyHint')}` }),
    h('div', { className: 'scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, t('name')), h('th', {}, t('minutes')), ...PER_WEEK.map((n) => h('th', {}, `${n}× ${t('perWeek')}`)), h('th', {}, t('archived')), h('th'))),
      h('tbody', {}, ...programs.map((p) => h('tr', { className: p.archived ? 'off' : '' },
        h('td', {}, input(p.name, (v, el) => (v ? set('programs', p.id, { name: v }) : (el.value = p.name)), { ariaLabel: t('name') })),
        h('td', {}, number(p.minutes, (v, el) => (v ? set('programs', p.id, { minutes: v }) : (el.value = p.minutes)), { ariaLabel: t('minutes') })),
        ...PER_WEEK.map((n) => h('td', {}, priceCell(prices.find((x) => x.program_id === p.id && x.per_week === n), { kind: 'group', program_id: p.id, per_week: n }, `${p.name} ${n}×`))),
        h('td', {}, checkbox(p.archived, (v) => then(set('programs', p.id, { archived: v })), { ariaLabel: t('archived') }))
        , h('td', { className: 'actions' }, sureButton('×', () => then(ok(db!.from('programs').delete().eq('id', p.id))), { title: t('del'), ariaLabel: t('del') }))
      )))
    )),
    programForm
  );

  /** Labelled price rows (private lessons, rentals): edit, remove, add. */
  const labelled = (kind: string, title: string) => {
    const label = h('input', { type: 'text', placeholder: t('label'), required: true });
    const amount = h('input', { type: 'number', min: 0, step: 'any', className: 'num', placeholder: '₪', required: true });
    const form = h('form', { className: 'row' }, label, amount, h('button', { type: 'submit', textContent: t('add') }));
    form.onsubmit = (e) => {
      e.preventDefault();
      then(ok(db!.from('prices').insert({ kind, label: label.value.trim(), amount: Number(amount.value) })));
    };
    return h('div', {},
      h('h3', { textContent: title }),
      ...prices.filter((x) => x.kind === kind).map((x) => h('div', { className: 'row' },
        input(x.label, (v, el) => (v ? set('prices', x.id, { label: v }) : (el.value = x.label)), { ariaLabel: t('label') }),
        number(x.amount, (v, el) => (v == null ? (el.value = x.amount) : set('prices', x.id, { amount: v })), { ariaLabel: t('amount') }),
        sureButton('×', () => then(ok(db!.from('prices').delete().eq('id', x.id))), { title: t('del'), ariaLabel: t('del') })
      )),
      form
    );
  };
  const single = (kind: string, title: string) =>
    h('label', { className: 'row' }, h('span', { className: 'grow' }, title), priceCell(prices.find((x) => x.kind === kind), { kind }, title));

  const others = h('section', { className: 'card' },
    h('h2', { textContent: t('otherPrices') }),
    single('unlimited', `${t('unlimited')}, ${t('perMonth')}`),
    single('entry', t('oneTimeEntry')),
    labelled('rental', t('rentals'))
  );

  const programOptions = programs.filter((p) => !p.archived).map((p): [string, string] => [p.id, p.name]);
  const groupName = h('input', { type: 'text', placeholder: t('name'), required: true });
  const groupProgram = select(programOptions, '', () => {});
  const groupForm = h('form', { className: 'row' }, groupName, groupProgram, h('button', { type: 'submit', textContent: t('add') }));
  groupForm.onsubmit = (e) => {
    e.preventDefault();
    then(ok(db!.from('groups').insert({ name: groupName.value.trim(), program_id: groupProgram.value })));
  };
  const groupsCard = h('section', { className: 'card' },
    h('h2', { textContent: t('groupsTitle') }),
    h('div', { className: 'scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, t('name')), h('th', {}, t('programme')), h('th', {}, t('archived')), h('th'))),
      h('tbody', {}, ...groups.map((g) => h('tr', { className: g.archived ? 'off' : '' },
        h('td', {}, input(g.name, (v, el) => (v ? set('groups', g.id, { name: v }) : (el.value = g.name)), { ariaLabel: t('name') })),
        h('td', {}, select(programs.map((p): [string, string] => [p.id, p.name]), g.program_id, (v) => set('groups', g.id, { program_id: v }), { ariaLabel: t('programme') })),
        h('td', {}, checkbox(g.archived, (v) => then(set('groups', g.id, { archived: v })), { ariaLabel: t('archived') }))
        , h('td', { className: 'actions' }, sureButton('×', () => then(ok(db!.from('groups').delete().eq('id', g.id))), { title: t('del'), ariaLabel: t('del') }))
      )))
    )),
    programOptions.length > 0 && groupForm
  );

  const pct = (id: string, title: string) =>
    h('label', { className: 'row' }, h('span', { className: 'grow' }, title),
      number(settings.find((x) => x.id === id)?.value, (v) => ok(db!.from('settings').upsert({ id, value: v ?? 0 })), { max: 100, ariaLabel: title }));
  const discounts = h('section', { className: 'card' },
    h('h2', { textContent: t('discountsTitle') }),
    pct('second_child_pct', t('secondChild')),
    pct('full_year_pct', t('fullYear'))
  );

  // Printed at the top of every payment confirmation.
  const biz: Row = settings.find((x) => x.id === 'business')?.value ?? {};
  const bizField = (key: string, label: string) =>
    field(label, input(biz[key], (v) => { biz[key] = v; ok(db!.from('settings').upsert({ id: 'business', value: biz })); }));
  const business = h('section', { className: 'card' },
    h('h2', { textContent: t('business') }),
    h('div', { className: 'grid' }, bizField('name', t('name')), bizField('address', t('address')), bizField('phone', t('phone')), bizField('number', t('bizNumber')))
  );

  // Each trainer: the lesson lengths they give, what the client pays and what the trainer gets.
  const KINDS: [string, string][] = [['percent', t('percentKind')], ['fixed', t('fixedKind')]];
  const trainerBlock = (x: Row) => {
    const minutes = h('input', { type: 'number', min: 1, className: 'num', placeholder: t('minutes'), ariaLabel: t('minutes') });
    const price = h('input', { type: 'number', min: 0, step: 'any', className: 'num', placeholder: t('price'), ariaLabel: t('price') });
    const pay = h('input', { type: 'number', min: 0, step: 'any', className: 'num', value: 100, ariaLabel: t('trainerGets') });
    const kind = select(KINDS, 'percent', () => {});
    return h('div', { className: `stack block${x.archived ? ' off' : ''}` },
      h('div', { className: 'row' },
        input(x.full_name, (v, el) => (v ? set('trainers', x.id, { full_name: v }) : (el.value = x.full_name)), { ariaLabel: t('name') }),
        h('label', { className: 'tick' }, checkbox(x.archived, (v) => then(set('trainers', x.id, { archived: v }))), t('archived')),
        sureButton('×', () => then(ok(db!.from('trainers').delete().eq('id', x.id))), { title: t('del'), ariaLabel: t('del') })
      ),
      h('div', { className: 'scroll' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, t('minutes')), h('th', {}, t('price')), h('th', { colSpan: 2 }, t('trainerGets')), h('th'))),
        h('tbody', {},
          ...rates.filter((r) => r.trainer_id === x.id).map((r) => h('tr', {},
            h('td', {}, String(r.minutes)),
            h('td', {}, number(r.price, (v, el) => (v == null ? (el.value = r.price) : set('trainer_rates', r.id, { price: v })), { ariaLabel: t('price') })),
            h('td', {}, number(r.pay_value, (v, el) => (v == null ? (el.value = r.pay_value) : set('trainer_rates', r.id, { pay_value: v })), { ariaLabel: t('trainerGets') })),
            h('td', {}, select(KINDS, r.pay_kind, (v) => set('trainer_rates', r.id, { pay_kind: v }))),
            h('td', { className: 'actions' }, sureButton('×', () => then(ok(db!.from('trainer_rates').delete().eq('id', r.id))), { title: t('del'), ariaLabel: t('del') }))
          )),
          h('tr', {}, h('td', {}, minutes), h('td', {}, price), h('td', {}, pay), h('td', {}, kind),
            h('td', { className: 'actions' }, h('button', { type: 'button', textContent: t('addRate'), onclick: () => {
              if (!(Number(minutes.value) > 0) || price.value === '') return;
              then(ok(db!.from('trainer_rates').insert({ trainer_id: x.id, minutes: Number(minutes.value), price: Number(price.value), pay_kind: kind.value, pay_value: Number(pay.value) || 0 })));
            } }))
          )
        )
      ))
    );
  };
  const newTrainer = h('input', { type: 'text', placeholder: t('name'), required: true });
  const trainerForm = h('form', { className: 'row' }, newTrainer, h('button', { type: 'submit', textContent: t('addTrainer') }));
  trainerForm.onsubmit = (e) => {
    e.preventDefault();
    then(ok(db!.from('trainers').insert({ full_name: newTrainer.value.trim() })));
  };
  const trainersCard = h('section', { className: 'card' },
    h('h2', { textContent: t('ratesTitle') }),
    h('p', { className: 'muted', textContent: t('ratesHint') }),
    ...trainers.map(trainerBlock),
    trainerForm
  );

  return h('div', { className: 'stack' }, h('h1', { textContent: t('settings') }), programmes, trainersCard, others, groupsCard, discounts, business);
}
