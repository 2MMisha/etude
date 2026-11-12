// Money in: the payments card on a client's page (balance, record a payment,
// void, refund), the printable confirmation, the Debts list and the monthly
// report with its Excel export.
import { getLang, t, tIn, LOCALE, type Key, type Lang } from '../i18n';
import { db, h, get, ok, nav, input, select, field, flash, money, ltr, type Row } from '../ui';

const METHODS = ['cash', 'transfer', 'bit', 'cheque', 'standing_order'] as const;
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
const monthName = (lang: Lang, iso: string) =>
  new Date(`${iso.slice(0, 7)}-01T12:00:00Z`).toLocaleDateString(LOCALE[lang], { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateText = (lang: Lang, iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { timeZone: 'UTC' });
const sum = (rows: Row[], key = 'amount') => rows.reduce((s, r) => s + Number(r[key]), 0);
/** What a charge is for, in a given language: "Kids 2×45, November 2026". */
const chargeLabel = (lang: Lang, c: Row) => [c.description, c.month && monthName(lang, c.month)].filter(Boolean).join(', ') || c.comment || '';
/** A WhatsApp chat with the text ready. Israeli numbers are typed 05x…, WhatsApp wants 9725x…. */
const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(text)}`;
const methodText = (lang: Lang, p: Row) =>
  tIn(lang, p.method as Key) + (p.method === 'cheque' ? [` ${p.cheque_number}`, p.cheque_bank, p.cheque_date && dateText(lang, p.cheque_date)].filter(Boolean).join(', ') : '');

// ── The payments card on a client's page ─────────────────────────────────────
export async function paymentsCard(client: Row, students: Row[], charges: Row[]) {
  const [balances, payments, perCharge] = await Promise.all([
    get<Row[]>(db!.from('client_balances').select('*').eq('client_id', client.id)),
    get<Row[]>(db!.from('payments').select('*, payment_lines(charge_id, amount)').eq('client_id', client.id).order('number', { ascending: false })),
    get<Row[]>(db!.from('charge_balances').select('charge_id, owed').in('student_id', students.map((s) => s.id))),
  ]);
  const bal = balances[0] ?? { balance: 0, credit: 0 };
  const chargeText = (id: string) => {
    const c = charges.find((x) => x.id === id);
    return c ? `${students.find((s) => s.id === c.student_id)?.full_name ?? ''}: ${chargeLabel(getLang(), c)}` : '?';
  };
  const open = perCharge
    .filter((b) => Number(b.owed) > 0 && charges.some((c) => c.id === b.charge_id))
    .sort((a, b) => (charges.find((c) => c.id === a.charge_id)!.month ?? '').localeCompare(charges.find((c) => c.id === b.charge_id)!.month ?? ''));

  const balance = Number(bal.balance);
  const headline = h('p', { className: `quote${balance > 0 ? ' owes' : ''}` },
    balance > 0 ? `${t('owes')}: ` : balance < 0 ? `${t('paidAhead')}: ` : t('settled'),
    balance !== 0 && ltr(money(Math.abs(balance))),
    Number(bal.credit) > 0 && open.length > 0 && h('button', { type: 'button', textContent: `${t('useCredit')} (${money(bal.credit)})`, onclick: async () => {
      await get(db!.rpc('use_credit', { client: client.id }));
      flash(t('saved'));
      nav.refresh();
    } })
  );

  // Record a payment: tick what it covers; the amount follows the ticks until it is typed by hand.
  const date = h('input', { type: 'date', value: today(), required: true });
  const amount = h('input', { type: 'number', step: 'any', min: 0, className: 'num', required: true });
  const chequeNumber = h('input', { type: 'text', placeholder: t('chequeNumber') });
  const chequeBank = h('input', { type: 'text', placeholder: t('chequeBank') });
  const chequeDate = h('input', { type: 'date', title: t('chequeDate'), ariaLabel: t('chequeDate') });
  const cheque = h('div', { className: 'row', hidden: true }, chequeNumber, chequeBank, chequeDate);
  const method = select(METHODS.map((m): [string, string] => [m, t(m)]), 'cash', (v) => (cheque.hidden = v !== 'cheque'));
  const paperDoc = h('input', { type: 'text' });
  const comment = h('input', { type: 'text' });
  let typed = false;
  amount.oninput = () => (typed = true);
  const picks = open.map((b) => {
    const box = h('input', { type: 'checkbox' });
    const part = h('input', { type: 'number', step: 'any', min: 0, max: Number(b.owed), value: Number(b.owed), className: 'num', ariaLabel: t('amount') });
    const follow = () => {
      if (!typed) amount.value = String(picks.filter((p) => p.box.checked).reduce((s, p) => s + Number(p.part.value), 0) || '');
    };
    box.onchange = part.oninput = follow;
    return { id: b.charge_id as string, box, part, row: h('label', { className: 'row pick' }, box, h('span', { className: 'grow' }, chargeText(b.charge_id)), part) };
  });
  const form = h('form', { className: 'stack' },
    h('h3', { textContent: t('recordPayment') }),
    ...picks.map((p) => p.row),
    h('div', { className: 'grid' }, field(t('date'), date), field(t('method'), method), field(t('amount'), amount), field(t('paperDoc'), paperDoc)),
    cheque,
    field(t('comment'), comment),
    h('div', {}, h('button', { className: 'primary', type: 'submit', textContent: t('recordPayment') }))
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const total = Number(amount.value);
    if (!(total > 0)) return flash(t('needAmount'), true);
    const lines = picks.filter((p) => p.box.checked && Number(p.part.value) > 0).map((p) => ({ charge_id: p.id, amount: Number(p.part.value) }));
    if (sum(lines) > total + 0.001) return flash(t('tooManyLines'), true);
    const id = await get<string>(db!.rpc('record_payment', {
      p: { client_id: client.id, paid_on: date.value, method: method.value, amount: total, cheque_number: chequeNumber.value.trim(), cheque_bank: chequeBank.value.trim(), cheque_date: chequeDate.value, paper_doc: paperDoc.value.trim(), comment: comment.value.trim() },
      lines,
    }));
    location.hash = `#/receipt/${id}`;
  };

  const payRow = (p: Row) => {
    const actions = h('td', { className: 'actions' });
    /** Swap the buttons for a reason field (and an amount, for a refund) plus a confirm button. */
    const ask = (label: Key, reasonLabel: Key, withAmount: boolean, run: (reason: string, amount: number) => void) => {
      const reason = h('input', { type: 'text', placeholder: t(reasonLabel) });
      const part = h('input', { type: 'number', step: 'any', min: 0, max: Number(p.amount), value: Number(p.amount), className: 'num', ariaLabel: t('amount') });
      actions.replaceChildren(h('div', { className: 'row' }, withAmount && part, reason, h('button', { type: 'button', className: 'danger', textContent: t(label), onclick: () => {
        if (!reason.value.trim()) return flash(t('commentRequired'), true);
        if (withAmount && !(Number(part.value) > 0 && Number(part.value) <= Number(p.amount))) return flash(t('needAmount'), true);
        run(reason.value.trim(), Number(part.value));
      } })));
      reason.focus();
    };
    if (!p.voided) {
      if (Number(p.amount) > 0) actions.append(
        h('button', { type: 'button', textContent: t('refund'), onclick: () => ask('refund', 'refundReason', true, async (reason, back) => {
          // Money not yet put against a charge goes back first; then the lines, as negative lines on the same charges.
          let left = back - Math.min(back, Math.max(Number(p.amount) - sum(p.payment_lines), 0));
          const lines: Row[] = [];
          for (const l of p.payment_lines) {
            if (left <= 0) break;
            const take = Math.min(left, Number(l.amount));
            lines.push({ charge_id: l.charge_id, amount: -take });
            left -= take;
          }
          const id = await get<string>(db!.rpc('record_payment', { p: { client_id: client.id, paid_on: today(), method: p.method, amount: -back, comment: reason }, lines }));
          location.hash = `#/receipt/${id}`;
        }) })
      );
      actions.append(
        h('button', { type: 'button', textContent: t('void'), onclick: () => ask('void', 'voidReason', false, async (reason) => {
          if (await ok(db!.from('payments').update({ voided: true, void_reason: reason }).eq('id', p.id))) nav.refresh();
        }) })
      );
    }
    return h('tr', { className: p.voided ? 'off' : '' },
      h('td', {}, h('a', { href: `#/receipt/${p.id}`, textContent: `№ ${p.number}` })),
      h('td', {}, ltr(dateText(getLang(), p.paid_on))),
      h('td', {}, methodText(getLang(), p)),
      h('td', {}, ltr(money(p.amount))),
      h('td', {},
        ...p.payment_lines.map((l: Row) => h('div', {}, chargeText(l.charge_id), ' ', ltr(money(l.amount)))),
        p.comment && h('small', {}, p.comment),
        p.voided && h('small', {}, `${t('voided')}: ${p.void_reason}`)
      ),
      h('td', {}, input(p.paper_doc, (v) => ok(db!.from('payments').update({ paper_doc: v }).eq('id', p.id)), { ariaLabel: t('paperDoc'), disabled: p.voided })),
      actions
    );
  };

  return h('section', { className: 'card' },
    h('h2', { textContent: t('payments') }),
    headline,
    form,
    payments.length
      ? h('div', { className: 'scroll' }, h('table', {},
          h('thead', {}, h('tr', {}, ...['№', t('date'), t('method'), t('amount'), t('covers'), t('paperDoc'), ''].map((x) => h('th', {}, x)))),
          h('tbody', {}, ...payments.map(payRow))
        ))
      : h('p', { className: 'muted', textContent: t('noPayments') })
  );
}

// ── The confirmation: printed, saved as PDF or sent as text, in the client's language ──
export async function receiptView(id?: string) {
  const [p, settings] = await Promise.all([
    get<Row>(db!.from('payments').select('*, clients(id, full_name, phone, lang), payment_lines(amount, charges(description, month, comment, students(full_name)))').eq('id', id).single()),
    get<Row[]>(db!.from('settings').select('value').eq('id', 'business')),
  ]);
  const biz: Row = settings[0]?.value ?? {};
  const L: Lang = p.clients.lang;
  const refund = Number(p.amount) < 0;
  const lines: Row[] = p.payment_lines.map((l: Row) => ({ who: l.charges.students.full_name, what: chargeLabel(L, l.charges), amount: Math.abs(Number(l.amount)) }));
  const spare = Math.abs(Number(p.amount)) - sum(lines);
  if (spare > 0.001 && !refund) lines.push({ who: '', what: tIn(L, 'onAccount'), amount: spare });
  const title = `${tIn(L, refund ? 'rcRefund' : 'rcTitle')} № ${p.number}`;
  const total = money(Math.abs(Number(p.amount)));

  const text = [
    biz.name, title, dateText(L, p.paid_on),
    `${tIn(L, refund ? 'rcTo' : 'rcFrom')}: ${p.clients.full_name}`,
    ...lines.map((l) => `• ${[l.who, l.what].filter(Boolean).join(': ')} — ${money(l.amount)}`),
    `${tIn(L, 'total')}: ${total} (${methodText(L, p)})`,
  ].filter(Boolean).join('\n');

  return h('div', { className: 'stack' },
    h('div', { className: 'row noprint' },
      h('a', { href: `#/client/${p.clients.id}`, textContent: `← ${p.clients.full_name}` }),
      h('span', { className: 'grow' }),
      h('button', { type: 'button', className: 'primary', textContent: t('print'), onclick: () => print() }),
      p.clients.phone && h('a', { className: 'btn', href: waLink(p.clients.phone, text), target: '_blank', rel: 'noopener', textContent: t('sendWhatsApp') })
    ),
    h('article', { className: `card receipt${p.voided ? ' void' : ''}`, lang: L, dir: L === 'he' ? 'rtl' : 'ltr' },
      h('header', {},
        h('img', { src: '/images/brand/icon.svg', alt: '' }),
        h('div', {},
          h('strong', {}, biz.name),
          h('div', {}, biz.address),
          biz.phone && h('div', {}, ltr(biz.phone)),
          biz.number && h('div', {}, `${tIn(L, 'businessNo')} `, ltr(biz.number))
        )
      ),
      h('h1', { textContent: title }),
      p.voided && h('p', { className: 'stamp', textContent: tIn(L, 'voided') }),
      h('dl', {},
        h('dt', {}, tIn(L, 'date')), h('dd', {}, ltr(dateText(L, p.paid_on))),
        h('dt', {}, tIn(L, refund ? 'rcTo' : 'rcFrom')), h('dd', {}, p.clients.full_name),
        h('dt', {}, tIn(L, 'method')), h('dd', {}, methodText(L, p)),
        p.paper_doc && h('dt', {}, tIn(L, 'paperDoc')), p.paper_doc && h('dd', {}, ltr(p.paper_doc)),
        p.comment && h('dt', {}, tIn(L, 'comment')), p.comment && h('dd', {}, p.comment)
      ),
      h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, tIn(L, 'rcFor')), h('th', { className: 'sum' }, tIn(L, 'amount')))),
        h('tbody', {}, ...lines.map((l) => h('tr', {}, h('td', {}, [l.who, l.what].filter(Boolean).join(': ')), h('td', { className: 'sum' }, ltr(money(l.amount)))))),
        h('tfoot', {}, h('tr', {}, h('th', {}, tIn(L, 'total')), h('th', { className: 'sum' }, ltr(total))))
      )
    )
  );
}

// ── Debts: every family that owes, with a ready WhatsApp reminder ────────────
export async function debtsView() {
  const [balances, clients] = await Promise.all([
    get<Row[]>(db!.from('client_balances').select('client_id, balance').gt('balance', 0)),
    get<Row[]>(db!.from('clients').select('id, full_name, phone, lang')),
  ]);
  const rows: Row[] = balances
    .map((b): Row => ({ ...clients.find((c) => c.id === b.client_id), owed: Number(b.balance) }))
    .filter((r) => r.id)
    .sort((a, b) => b.owed - a.owed);
  return h('section', { className: 'card' },
    h('h1', { textContent: t('debtsTitle') }),
    rows.length
      ? h('div', { className: 'scroll' }, h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, t('name')), h('th', {}, t('phone')), h('th', {}, t('owes')), h('th'))),
          h('tbody', {}, ...rows.map((r) => h('tr', {},
            h('td', {}, h('a', { href: `#/client/${r.id}`, textContent: r.full_name })),
            h('td', {}, ltr(r.phone ?? '')),
            h('td', {}, ltr(money(r.owed))),
            h('td', { className: 'actions' }, r.phone && h('a', { className: 'btn', target: '_blank', rel: 'noopener', textContent: t('remind'),
              href: waLink(r.phone, tIn(r.lang as Lang, 'remindText').replace('{name}', r.full_name).replace('{amount}', money(r.owed))) }))
          ))),
          h('tfoot', {}, h('tr', {}, h('th', { colSpan: 2 }, t('total')), h('th', {}, ltr(money(sum(rows, 'owed')))), h('th')))
        ))
      : h('p', { className: 'muted', textContent: t('noDebts') })
  );
}

// ── Reports: one month of money, and the Excel file for the accountant ───────
const shift = (ym: string, by: number) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
};

export async function reportsView(arg?: string) {
  const ym = /^\d{4}-\d{2}$/.test(arg ?? '') ? (arg as string) : today().slice(0, 7);
  const [payments, charges] = await Promise.all([
    get<Row[]>(db!.from('payments').select('*, clients(full_name), payment_lines(amount, charges(description, month, comment, students(full_name)))').gte('paid_on', `${ym}-01`).lt('paid_on', `${shift(ym, 1)}-01`).order('number')),
    get<Row[]>(db!.from('charges').select('id, amount').eq('month', `${ym}-01`)),
  ]);
  const owed = charges.length ? sum(await get<Row[]>(db!.from('charge_balances').select('owed').in('charge_id', charges.map((c) => c.id))), 'owed') : 0;
  const live = payments.filter((p) => !p.voided);
  const lang = getLang();
  const covers = (p: Row) => p.payment_lines.map((l: Row) => `${l.charges.students.full_name}: ${chargeLabel(lang, l.charges)} (${Number(l.amount)})`).join('; ');

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.json_to_sheet(payments.map((p) => ({
      [t('date')]: p.paid_on, '№': p.number, [t('paperDoc')]: p.paper_doc, [t('client')]: p.clients.full_name, [t('method')]: methodText(lang, p),
      [t('amount')]: Number(p.amount), [t('covers')]: covers(p), [t('comment')]: p.comment, [t('voided')]: p.voided ? p.void_reason : '',
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, ym);
    XLSX.writeFile(book, `etude-payments-${ym}.xlsx`);
  };

  return h('section', { className: 'card' },
    h('div', { className: 'row monthbar' },
      h('a', { href: `#/reports/${shift(ym, -1)}`, className: 'btn', textContent: '‹', ariaLabel: shift(ym, -1) }),
      h('h1', { textContent: monthName(lang, ym) }),
      h('a', { href: `#/reports/${shift(ym, 1)}`, className: 'btn', textContent: '›', ariaLabel: shift(ym, 1) }),
      h('button', { type: 'button', className: 'primary', textContent: t('exportExcel'), disabled: !payments.length, onclick: exportExcel })
    ),
    h('table', {}, h('tbody', {},
      ...METHODS.filter((m) => live.some((p) => p.method === m)).map((m) => h('tr', {}, h('td', {}, t(m)), h('td', {}, ltr(money(sum(live.filter((p) => p.method === m))))))),
      h('tr', {}, h('th', {}, t('received')), h('th', {}, ltr(money(sum(live))))),
      h('tr', {}, h('td', {}, t('charged')), h('td', {}, ltr(money(sum(charges))))),
      h('tr', {}, h('td', {}, t('stillOwed')), h('td', {}, ltr(money(owed))))
    )),
    payments.length
      ? h('div', { className: 'scroll' }, h('table', {},
          h('thead', {}, h('tr', {}, ...['№', t('date'), t('client'), t('method'), t('amount'), t('covers')].map((x) => h('th', {}, x)))),
          h('tbody', {}, ...payments.map((p) => h('tr', { className: p.voided ? 'off' : '' },
            h('td', {}, h('a', { href: `#/receipt/${p.id}`, textContent: `№ ${p.number}` })),
            h('td', {}, ltr(dateText(lang, p.paid_on))),
            h('td', {}, p.clients.full_name),
            h('td', {}, methodText(lang, p)),
            h('td', {}, ltr(money(p.amount))),
            h('td', {}, covers(p), p.voided && h('small', {}, `${t('voided')}: ${p.void_reason}`))
          )))
        ))
      : h('p', { className: 'muted', textContent: t('noPayments') })
  );
}
