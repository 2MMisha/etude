// The Trainers tab: what each trainer has earned by confirmed lessons, what was
// given to them, and what is still to give; with the list of payouts.
import { getLang, t, LOCALE } from '../i18n';
import { db, h, get, ok, nav, sureButton, flash, money, ltr, type Row } from '../ui';

const dateText = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[getLang()], { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });

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
