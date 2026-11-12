// One calendar month: every active student, what they are charged, and the
// buttons to charge everyone by the price list or one student by hand.
import { getLang, t, LOCALE } from '../i18n';
import { db, h, get, ok, nav, input, number, sureButton, flash, money, ltr, pctOf, type Row } from '../ui';

const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()).slice(0, 7);
const shift = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
};

export async function monthView(arg?: string) {
  const ym = /^\d{4}-\d{2}$/.test(arg ?? '') ? (arg as string) : thisMonth();
  const first = `${ym}-01`;
  const [students, quotes, charges] = await Promise.all([
    get<Row[]>(db!.from('students').select('id, full_name, client_id, clients!inner(full_name, archived)').eq('archived', false).eq('clients.archived', false)),
    get<Row[]>(db!.from('student_quotes').select('*')),
    get<Row[]>(db!.from('charges').select('*').eq('kind', 'membership').eq('month', first)),
  ]);
  const balances = charges.length ? await get<Row[]>(db!.from('charge_balances').select('charge_id, paid, owed').in('charge_id', charges.map((c) => c.id))) : [];
  students.sort((a, b) => a.clients.full_name.localeCompare(b.clients.full_name) || a.full_name.localeCompare(b.full_name));

  const row = (s: Row) => {
    const q = quotes.find((x) => x.student_id === s.id);
    const c = charges.find((x) => x.student_id === s.id);
    const shown = c ?? q; // a charge keeps its own list price and discounts
    const b = c && balances.find((x) => x.charge_id === c.id);
    const pct = pctOf(shown?.discounts);
    const amount = number(c ? c.amount : q?.amount, () => c && save());
    const note = input(c?.comment, () => c && save(), { placeholder: t('comment') });

    /** The typed amount as a line: by the price list if untouched, else by hand with a reason. */
    const line = () => {
      const value = amount.value === '' ? null : Number(amount.value);
      if (value == null || !(value >= 0)) return void amount.focus();
      if (!c && q?.amount != null && value === Number(q.amount)) return { amount: value, description: q.description, list_amount: q.list_amount, discounts: q.discounts };
      if (!note.value.trim()) {
        flash(t('commentRequired'), true);
        return void note.focus();
      }
      return { amount: value, manual: true, comment: note.value.trim(), ...(c ? {} : { description: q?.description ?? '', list_amount: q?.list_amount ?? null }) };
    };
    const save = async () => {
      const patch = line();
      if (patch && (await ok(db!.from('charges').update(patch).eq('id', c!.id)))) nav.refresh();
    };

    return h('tr', { className: c ? '' : 'pending' },
      h('td', {}, h('a', { href: `#/client/${s.client_id}`, textContent: s.full_name }), s.clients.full_name !== s.full_name && h('small', {}, s.clients.full_name)),
      h('td', {}, shown?.description ? ltr(shown.description) : ''),
      h('td', {}, ltr(money(shown?.list_amount))),
      h('td', { title: Object.entries(shown?.discounts ?? {}).map(([k, v]) => `${k} ${v}%`).join(', ') }, pct ? ltr(`−${pct}%`) : ''),
      h('td', {}, amount, c?.manual && h('small', {}, t('byHand'))),
      h('td', { className: b && Number(b.owed) <= 0 ? 'ok' : '' }, b ? ltr(money(b.paid)) : ''),
      h('td', {}, note),
      h('td', { className: 'actions' },
        !c && h('button', { type: 'button', className: 'primary', textContent: t('charge'), onclick: async () => {
          const values = line();
          if (values && (await ok(db!.from('charges').insert({ student_id: s.id, kind: 'membership', month: first, ...values })))) nav.refresh();
        } }),
        c && q?.amount != null && h('button', { type: 'button', textContent: '↺', title: t('recalc'), ariaLabel: t('recalc'), onclick: async () => {
          const fresh = { amount: q.amount, description: q.description, list_amount: q.list_amount, discounts: q.discounts, manual: false, comment: '' };
          if (await ok(db!.from('charges').update(fresh).eq('id', c.id))) nav.refresh();
        } }),
        c && sureButton('×', async () => { if (await ok(db!.from('charges').delete().eq('id', c.id))) nav.refresh(); }, { title: t('del'), ariaLabel: t('del') })
      )
    );
  };

  const total = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const missing = students.filter((s) => !charges.some((c) => c.student_id === s.id)).length;
  const label = new Date(`${first}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return h('section', { className: 'card' },
    h('div', { className: 'row monthbar' },
      h('a', { href: `#/month/${shift(ym, -1)}`, className: 'btn', textContent: '‹', ariaLabel: shift(ym, -1) }),
      h('h1', { textContent: label }),
      h('a', { href: `#/month/${shift(ym, 1)}`, className: 'btn', textContent: '›', ariaLabel: shift(ym, 1) }),
      h('button', { type: 'button', className: 'primary', textContent: t('createCharges'), onclick: async () => {
        const n = await get<number>(db!.rpc('create_month_charges', { m: first }));
        flash(`${n} ${t('added')}`);
        nav.refresh();
      } })
    ),
    h('div', { className: 'scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, ...[t('students'), t('plan'), t('list'), t('discount'), t('amount'), t('paid'), t('comment'), ''].map((x) => h('th', {}, x)))),
      h('tbody', {}, ...students.map(row), !students.length && h('tr', {}, h('td', { colSpan: 8, className: 'muted', textContent: t('emptyList') })))
    )),
    h('p', { className: 'quote' }, `${t('total')}: `, ltr(money(total)), ` · ${t('paid')}: `, ltr(money(balances.reduce((s, x) => s + Number(x.paid), 0))), missing ? ` · ${missing} ${t('notCharged')}` : '')
  );
}
