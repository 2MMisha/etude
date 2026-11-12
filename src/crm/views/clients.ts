// Clients list, and one client's page: the family, each student's groups,
// discounts, suggested monthly price and charges.
import { t, LANGS } from '../i18n';
import { paymentsCard } from './payments';
import { db, h, get, ok, nav, input, number, checkbox, select, field, tick, sureButton, flash, money, ltr, pctOf, today, fillThisMonth, type Row } from '../ui';

const digits = (s: string) => s.replace(/\D/g, '').replace(/^972/, '0');

export async function clientsView() {
  const [clients, students] = await Promise.all([
    get<Row[]>(db!.from('clients').select('id, full_name, phone, archived').order('full_name')),
    get<Row[]>(db!.from('students').select('client_id, full_name, archived').order('full_name')),
  ]);
  const kids = (id: string) => students.filter((s) => s.client_id === id && !s.archived).map((s) => s.full_name).join(', ');

  const body = h('tbody');
  const search = h('input', { type: 'search', placeholder: t('search') });
  const archived = h('input', { type: 'checkbox' });
  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const rows = clients.filter((c) => (archived.checked || !c.archived) && (!q || `${c.full_name} ${c.phone} ${kids(c.id)}`.toLowerCase().includes(q)));
    body.replaceChildren(
      ...rows.map((c) => h('tr', { className: c.archived ? 'off' : '' },
        h('td', {}, h('a', { href: `#/client/${c.id}`, textContent: c.full_name })),
        h('td', {}, ltr(c.phone)),
        h('td', {}, kids(c.id))
      ))
    );
    if (!rows.length) body.append(h('tr', {}, h('td', { colSpan: 3, className: 'muted', textContent: t('emptyList') })));
  };
  search.oninput = archived.onchange = draw;
  draw();

  const name = h('input', { type: 'text', placeholder: t('name'), required: true });
  const phone = h('input', { type: 'tel', placeholder: t('phone') });
  const form = h('form', { className: 'row' }, name, phone, h('button', { className: 'primary', type: 'submit', textContent: t('newClient') }));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = await get<Row>(db!.from('clients').insert({ full_name: name.value.trim(), phone: phone.value.trim() }).select('id').single());
    location.hash = `#/client/${row.id}`;
  };

  return h('section', { className: 'card' },
    h('h1', { textContent: t('clients') }),
    form,
    h('div', { className: 'row' }, search, tick(t('showArchived'), archived)),
    h('div', { className: 'scroll' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, t('name')), h('th', {}, t('phone')), h('th', {}, t('students')))), body))
  );
}

export async function clientView(id?: string, tab?: string) {
  const client = await get<Row>(db!.from('clients').select('*').eq('id', id).single());
  await fillThisMonth();
  const [students, groups, others, everyone] = await Promise.all([
    get<Row[]>(db!.from('students').select('*').eq('client_id', id).order('created_at')),
    get<Row[]>(db!.from('groups').select('id, name, archived').order('name')),
    get<Row[]>(db!.from('clients').select('id, full_name, phone').neq('id', id)),
    get<Row[]>(db!.from('students').select('id, full_name').eq('archived', false).order('full_name')),
  ]);
  const ids = students.map((s) => s.id);
  const [enrollments, quotes, charges] = await Promise.all([
    get<Row[]>(db!.from('enrollments').select('*').in('student_id', ids)),
    get<Row[]>(db!.from('student_quotes').select('*').in('student_id', ids)),
    get<Row[]>(db!.from('charges').select('*').in('student_id', ids).order('month', { ascending: false }).limit(500)),
  ]);

  /** Save one or more columns; `redraw` when the change moves the suggested price. */
  const set = async (table: string, row: Row, patch: Row, redraw = false) => {
    const done = await ok(db!.from(table).update(patch).eq('id', row.id));
    if (done) Object.assign(row, patch);
    if (done && redraw) nav.refresh();
    return done;
  };
  /** A name can't be saved empty: put the old one back. */
  const nameInput = (table: string, row: Row) =>
    input(row.full_name, (v, el) => (v ? set(table, row, { full_name: v }) : (el.value = row.full_name)));

  const twins = client.phone && digits(client.phone).length >= 7 ? others.filter((o) => digits(o.phone) === digits(client.phone)) : [];
  const clientCard = h('section', { className: 'card' },
    h('div', { className: 'grid' },
      field(t('name'), nameInput('clients', client)),
      field(t('phone'), input(client.phone, (v) => set('clients', client, { phone: v }, true), { type: 'tel' })),
      field(t('email'), input(client.email, (v) => set('clients', client, { email: v }), { type: 'email' })),
      field(t('address'), input(client.address, (v) => set('clients', client, { address: v }))),
      field(t('language'), select(LANGS.map((l) => [l, l.toUpperCase()]), client.lang, (v) => set('clients', client, { lang: v })))
    ),
    twins.length > 0 && h('p', { className: 'warn' }, `${t('samePhone')}: `, ...twins.flatMap((o, i) => [i > 0 && ', ', h('a', { href: `#/client/${o.id}`, textContent: o.full_name })])),
    field(t('notes'), Object.assign(h('textarea', { value: client.notes, rows: 2 }), { onchange: (e: Event) => set('clients', client, { notes: (e.target as HTMLTextAreaElement).value.trim() }) })),
    h('div', { className: 'row spread' },
      tick(t('archived'), checkbox(client.archived, (v) => set('clients', client, { archived: v }))),
      // Students first (one statement: all or none); charges on any of them stop it.
      sureButton(t('delClient'), async () => {
        if ((await ok(db!.from('students').delete().eq('client_id', client.id))) && (await ok(db!.from('clients').delete().eq('id', client.id)))) location.hash = '#/clients';
      })
    )
  );

  const studentCard = (s: Row) => {
    const mine = enrollments.filter((e) => e.student_id === s.id);
    const q = quotes.find((x) => x.student_id === s.id);
    const free = groups.filter((g) => !g.archived && !mine.some((e) => e.group_id === g.id));
    const upd = (patch: Row, redraw = false) => set('students', s, patch, redraw);

    const customPct = number(s.custom_pct || null, () => saveCustom());
    const customNote = input(s.custom_comment, () => saveCustom());
    // The two go to the database together: a discount without a reason is refused there.
    const saveCustom = () => {
      const pct = Number(customPct.value) || 0;
      if (pct > 0 && !customNote.value.trim()) {
        flash(t('commentRequired'), true);
        return customNote.focus();
      }
      upd({ custom_pct: pct, custom_comment: customNote.value.trim() }, true);
    };

    const pct = pctOf(q?.discounts);
    const quote =
      !mine.length && !s.unlimited ? t('noGroups')
      : q?.amount == null ? t('noPrice')
      : h('span', {}, ltr(`${q.description}: ${money(q.list_amount)}${pct ? ` − ${pct}%` : ''} = ${money(q.amount)}`), ` ${t('perMonth')}`);

    const lines = charges.filter((c) => c.student_id === s.id);
    const byPriceList = q?.amount != null && { amount: q.amount, description: q.description, list_amount: q.list_amount, discounts: q.discounts, manual: false, comment: '' };

    // A charge: its amount can be changed by hand (a reason is then required),
    // put back to the price list, or deleted — unless a payment already covers it.
    const chargeRow = (c: Row) => {
      const amount = number(c.amount, () => save());
      const note = input(c.comment, () => save(), { placeholder: t('comment'), ariaLabel: t('comment') });
      const save = async () => {
        if (amount.value === '') return void (amount.value = c.amount);
        if (!note.value.trim()) {
          flash(t('commentRequired'), true);
          return note.focus();
        }
        if (await ok(db!.from('charges').update({ amount: Number(amount.value), manual: true, comment: note.value.trim() }).eq('id', c.id))) nav.refresh();
      };
      return h('tr', {},
        h('td', {}, c.month ? h('a', { href: `#/month/${c.month.slice(0, 7)}`, textContent: c.month.slice(0, 7) }) : ltr(c.day ?? '')),
        h('td', {}, c.kind === 'private' && `${t('privateLesson')}: `, ltr(c.description), c.manual && h('small', {}, t('byHand'))),
        h('td', {}, amount),
        h('td', {}, note),
        h('td', { className: 'actions' },
          byPriceList && c.kind === 'membership' && h('button', { type: 'button', textContent: '↺', title: t('recalc'), ariaLabel: t('recalc'), onclick: async () => {
            if (await ok(db!.from('charges').update(byPriceList).eq('id', c.id))) nav.refresh();
          } }),
          sureButton('×', async () => { if (await ok(db!.from('charges').delete().eq('id', c.id))) nav.refresh(); }, { title: t('del'), ariaLabel: t('del') })
        )
      );
    };

    // Charge one month: by the price list if the amount is left as suggested, else by hand with a reason.
    const newMonth = h('input', { type: 'month', value: today().slice(0, 7), required: true, ariaLabel: t('month') });
    const newAmount = h('input', { type: 'number', step: 'any', min: 0, className: 'num', value: q?.amount ?? '', required: true, ariaLabel: t('amount') });
    const newNote = h('input', { type: 'text', placeholder: t('comment') });
    const addCharge = h('form', { className: 'row' }, newMonth, newAmount, newNote, h('button', { type: 'submit', textContent: t('addCharge') }));
    addCharge.onsubmit = async (e) => {
      e.preventDefault();
      const value = Number(newAmount.value);
      const listed = byPriceList && value === Number(q!.amount) && !newNote.value.trim();
      if (!listed && !newNote.value.trim()) {
        flash(t('commentRequired'), true);
        return newNote.focus();
      }
      const line = listed ? byPriceList : { amount: value, manual: true, comment: newNote.value.trim(), description: q?.description ?? '', list_amount: q?.list_amount ?? null };
      if (await ok(db!.from('charges').insert({ student_id: s.id, kind: 'membership', month: `${newMonth.value}-01`, ...line }))) nav.refresh();
    };

    return h('section', { className: `card${s.archived ? ' off' : ''}` },
      h('div', { className: 'grid' },
        field(t('name'), nameInput('students', s)),
        field(t('birthDate'), input(s.birth_date, (v) => upd({ birth_date: v || null }), { type: 'date' })),
        field(t('phone'), input(s.phone, (v) => upd({ phone: v }), { type: 'tel' })),
        field(t('level'), input(s.level, (v) => upd({ level: v }))),
        // A couple: the two point at each other, and a private lesson for one offers the other.
        field(t('partner'), select([['', '—'], ...everyone.filter((x) => x.id !== s.id).map((x): [string, string] => [x.id, x.full_name])], s.partner_id ?? '', (v) => upd({ partner_id: v || null }, true)))
      ),
      field(t('notes'), input(s.notes, (v) => upd({ notes: v }))),

      h('h3', { textContent: t('membership') }),
      h('div', { className: 'chips' },
        ...mine.map((e) => h('span', { className: 'chip' },
          groups.find((g) => g.id === e.group_id)?.name ?? '?',
          select([1, 2, 3, 4, 5].map((n) => [String(n), `${n}× ${t('perWeek')}`]), String(e.per_week), async (v) => {
            if (await ok(db!.from('enrollments').update({ per_week: Number(v) }).eq('id', e.id))) nav.refresh();
          }),
          h('button', { type: 'button', className: 'x', textContent: '×', title: t('remove'), ariaLabel: t('remove'), onclick: async () => {
            if (await ok(db!.from('enrollments').delete().eq('id', e.id))) nav.refresh();
          } })
        )),
        free.length > 0 && select([['', t('addGroup')], ...free.map((g): [string, string] => [g.id, g.name])], '', async (v) => {
          if (v && (await ok(db!.from('enrollments').insert({ student_id: s.id, group_id: v })))) nav.refresh();
        })
      ),
      h('div', { className: 'row' },
        tick(t('unlimited'), checkbox(s.unlimited, (v) => upd({ unlimited: v }, true))),
        tick(t('secondChild'), checkbox(s.second_child, (v) => upd({ second_child: v }, true))),
        tick(t('fullYear'), checkbox(s.full_year, (v) => upd({ full_year: v }, true)))
      ),
      h('div', { className: 'grid' },
        field(t('olimPct'), number(s.olim_pct || null, (v) => upd({ olim_pct: v ?? 0 }, true), { max: 100 })),
        field(t('customPct'), customPct),
        field(t('customComment'), customNote, 'wide')
      ),
      h('p', { className: 'quote' }, quote),

      h('h3', { textContent: t('charges') }),
      lines.length
        ? h('div', { className: 'scroll' }, h('table', {}, h('tbody', {}, ...lines.map(chargeRow))))
        : h('p', { className: 'muted', textContent: t('noCharges') }),
      addCharge,
      h('div', { className: 'row spread' },
        tick(t('archived'), checkbox(s.archived, (v) => upd({ archived: v }, true))),
        sureButton(t('del'), async () => { if (await ok(db!.from('students').delete().eq('id', s.id))) nav.refresh(); })
      )
    );
  };

  const addStudent = async (row: Row) => {
    if (await ok(db!.from('students').insert({ client_id: client.id, ...row }))) nav.refresh();
  };
  const newName = h('input', { type: 'text', placeholder: t('name'), required: true });
  const addForm = h('form', { className: 'row' }, newName, h('button', { type: 'submit', textContent: t('addStudent') }),
    !students.length && h('button', { type: 'button', textContent: t('clientIsStudent'), onclick: () => addStudent({ full_name: client.full_name, phone: client.phone }) })
  );
  addForm.onsubmit = (e) => {
    e.preventDefault();
    addStudent({ full_name: newName.value.trim() });
  };

  // Three tabs, so the page isn't one long scroll: details, money, students.
  const TABS: [string, string][] = [['info', t('tabInfo')], ['pay', t('payments')], ['students', `${t('students')} (${students.length})`]];
  const current = TABS.some(([k]) => k === tab) ? tab : 'info';
  const body =
    current === 'pay' ? [await paymentsCard(client, students, charges)]
    : current === 'students' ? [...students.map(studentCard), h('section', { className: 'card' }, addForm)]
    : [clientCard];

  return h('div', { className: 'stack' },
    h('a', { href: '#/clients', textContent: t('back') }),
    h('h1', { textContent: client.full_name }),
    h('nav', { className: 'subtabs' }, ...TABS.map(([k, label]) => h('a', { href: `#/client/${client.id}/${k}`, textContent: label, ariaCurrent: k === current ? 'page' : null }))),
    ...body
  );
}
