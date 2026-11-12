// One calendar month at a glance: every active student, what they were
// charged, what is paid and what is still owed. Nothing is typed here — one
// button charges everyone by the price list; changing a charge or taking a
// payment happens on the client's page (click the name).
import { getLang, t, LOCALE } from '../i18n';
import { db, h, get, nav, flash, money, ltr, pctOf, today, fillThisMonth, type Row } from '../ui';

const shift = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
};

export async function monthView(arg?: string) {
  const ym = /^\d{4}-\d{2}$/.test(arg ?? '') ? (arg as string) : today().slice(0, 7);
  const first = `${ym}-01`;
  const isNow = ym === today().slice(0, 7);
  if (isNow) await fillThisMonth();
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
    const b = c && balances.find((x) => x.charge_id === c.id);
    const shown = c ?? q; // a charge keeps its own description and discounts
    const pct = pctOf(shown?.discounts);
    const owed = b ? Number(b.owed) : 0;
    return h('tr', { className: c ? '' : 'pending' },
      h('td', {}, h('a', { href: `#/client/${s.client_id}/pay`, textContent: s.full_name }), s.clients.full_name !== s.full_name && h('small', {}, s.clients.full_name)),
      h('td', {}, shown?.description ? ltr(shown.description) : '', pct > 0 && h('small', {}, ltr(`−${pct}%`))),
      c
        ? h('td', {}, ltr(money(c.amount)), c.manual && h('small', {}, `${t('byHand')}: ${c.comment}`))
        : h('td', { className: 'muted' }, t('notCharged'), q?.amount != null && h('small', {}, ltr(money(q.amount)))),
      h('td', {}, b ? ltr(money(b.paid)) : ''),
      h('td', { className: b ? (owed > 0 ? 'owes' : 'ok') : '' }, b ? (owed > 0 ? ltr(money(owed)) : '✓') : '')
    );
  };

  const charged = charges.reduce((sum, c) => sum + Number(c.amount), 0);
  const paid = balances.reduce((sum, b) => sum + Number(b.paid), 0);
  const missing = students.filter((s) => !charges.some((c) => c.student_id === s.id)).length;
  const label = new Date(`${first}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return h('section', { className: 'card' },
    h('div', { className: 'row monthbar' },
      h('a', { href: `#/month/${shift(ym, -1)}`, className: 'btn', textContent: '‹', ariaLabel: shift(ym, -1) }),
      h('h1', { textContent: label }),
      h('a', { href: `#/month/${shift(ym, 1)}`, className: 'btn', textContent: '›', ariaLabel: shift(ym, 1) }),
      // Shown while someone with a price has no line: another month (paying ahead), or a student who joined after this month was filled in.
      students.some((s) => !charges.some((c) => c.student_id === s.id) && quotes.find((x) => x.student_id === s.id)?.amount != null) && h('button', { type: 'button', className: 'primary', textContent: t('createCharges'), onclick: async () => {
        const n = await get<number>(db!.rpc('create_month_charges', { m: first }));
        flash(`${n} ${t('added')}`);
        nav.refresh();
      } })
    ),
    h('p', { className: 'muted', textContent: t('monthHint') }),
    h('div', { className: 'scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, ...[t('students'), t('plan'), t('chargedCol'), t('paid'), t('owed')].map((x) => h('th', {}, x)))),
      h('tbody', {}, ...students.map(row), !students.length && h('tr', {}, h('td', { colSpan: 5, className: 'muted', textContent: t('emptyList') })))
    )),
    h('p', { className: 'quote' },
      `${t('chargedCol')}: `, ltr(money(charged)), ` · ${t('paid')}: `, ltr(money(paid)), ` · ${t('owed')}: `, ltr(money(charged - paid)),
      missing ? ` · ${missing} ${t('notCharged')}` : ''
    )
  );
}
