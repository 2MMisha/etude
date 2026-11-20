// Dashboard (stage 5): the school at a glance. This month's money (to pay,
// paid, debts), how many students and families, what happens today, what
// waits for an answer, and income over the last six months. Every number
// leads to the screen where it is dealt with.
import { getLang, LOCALE, type Lang } from '../i18n';
import { db, h, get, money, ltr, today, type Row, nameIn } from '../ui';
import { pick, dmy, type L } from '../forms';

const l = (ru: string, he: string, en: string): L => ({ ru, he, en });
const tr = (x: L) => pick(x, getLang());
const S = {
  title: l('Сводка', 'סיכום', 'Dashboard'),
  students: l('Активные ученики', 'תלמידים פעילים', 'Active students'),
  families: l('семей', 'משפחות', 'families'),
  newThisMonth: l('новых в этом месяце', 'חדשים החודש', 'new this month'),
  charged: l('Начислено за месяц', 'חויב החודש', 'Charged this month'),
  paid: l('Оплачено за месяц', 'שולם החודש', 'Paid this month'),
  debts: l('Долги', 'חובות', 'Debts'),
  clientsOwe: l('клиентов должны', 'לקוחות חייבים', 'clients owe'),
  trainers: l('Тренерам к выплате', 'לתשלום למאמנים', 'To pay trainers'),
  waiting: l('Ждут ответа', 'ממתינים לתשובה', 'Waiting for an answer'),
  requests: l('запросы тренеров', 'בקשות מאמנים', "trainers' requests"),
  familiesWaiting: l('семьи ждут подтверждения', 'משפחות ממתינות לאישור', 'families waiting to be let in'),
  unconfirmed: l('прошедшие уроки без подтверждения', 'שיעורים שעברו ללא אישור', 'past lessons not confirmed'),
  today: l('Сегодня', 'היום', 'Today'),
  nothingToday: l('Сегодня занятий нет.', 'אין שיעורים היום.', 'No classes today.'),
  privateLesson: l('частный урок', 'שיעור פרטי', 'private lesson'),
  rental: l('аренда', 'השכרה', 'rental'),
  cancelled: l('отменено', 'בוטל', 'cancelled'),
  income: l('Поступления по месяцам', 'הכנסות לפי חודש', 'Income by month'),
  byMethod: l('Способы оплаты в этом месяце', 'אמצעי תשלום החודש', 'Payment methods this month'),
  allClear: l('ничего не ждёт', 'שום דבר לא ממתין', 'nothing waiting'),
};
const METHOD: Record<string, L> = {
  cash: l('Наличные', 'מזומן', 'Cash'), transfer: l('Перевод', 'העברה', 'Transfer'), bit: l('Bit', 'ביט', 'Bit'),
  cheque: l('Чек', 'צ׳ק', 'Cheque'), standing_order: l('Пост. поручение', 'הוראת קבע', 'Standing order'),
};
const plusMonths = (ym: string, n: number) => {
  const d = new Date(`${ym}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
};
const monthShort = (lang: Lang, ym: string) => new Date(`${ym}-01T12:00:00Z`).toLocaleDateString(LOCALE[lang], { month: 'short', timeZone: 'UTC' });
const sum = (rows: Row[], key = 'amount') => rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);

export async function dashboardView() {
  const lang = getLang();
  const d0 = today();
  const ym = d0.slice(0, 7);
  const from6 = `${plusMonths(ym, -5)}-01`;
  const monthEnd = `${plusMonths(ym, 1)}-01`;
  const [students, enrollments, clients, charges, payments, balances, trainerOwed, requested, changes, unconfirmed, classes, lessons, rentals, events] = await Promise.all([
    get<Row[]>(db!.from('students').select('id, client_id, archived, unlimited, created_at')),
    get<Row[]>(db!.from('enrollments').select('student_id')),
    get<Row[]>(db!.from('clients').select('id, archived, online, approved')),
    get<Row[]>(db!.from('charges').select('amount, month, day').or(`month.eq.${ym}-01,and(day.gte.${ym}-01,day.lt.${monthEnd})`)),
    get<Row[]>(db!.from('payments').select('amount, method, paid_on').eq('voided', false).gte('paid_on', from6)),
    get<Row[]>(db!.from('client_balances').select('balance').gt('balance', 0)),
    get<Row[]>(db!.from('trainer_balances').select('owed').gt('owed', 0)),
    get<Row[]>(db!.from('lessons').select('id').eq('status', 'requested')),
    get<Row[]>(db!.from('lesson_requests').select('id').eq('status', 'pending')),
    get<Row[]>(db!.from('lessons').select('id').eq('status', 'planned').lt('held_on', d0)),
    get<Row[]>(db!.rpc('group_classes_between', { d1: d0, d2: d0 })),
    get<Row[]>(db!.from('lessons').select('start_time, minutes, status, trainers(full_name), lesson_students(students(full_name, full_name_en))').eq('held_on', d0).in('status', ['planned', 'done', 'no_show', 'late_cancel'])),
    get<Row[]>(db!.from('rentals').select('start_time, minutes, who, hall').eq('held_on', d0)),
    get<Row[]>(db!.from('events').select('start_time, minutes, title, hall').eq('held_on', d0)),
  ]);

  const active = students.filter((s) => !s.archived && (s.unlimited || enrollments.some((e) => e.student_id === s.id)));
  const families = new Set(active.map((s) => s.client_id)).size;
  const newOnes = students.filter((s) => !s.archived && String(s.created_at).slice(0, 7) === ym).length;
  const paidMonth = payments.filter((p) => String(p.paid_on).slice(0, 7) === ym);
  const waiting = requested.length + changes.length;
  const waitingFamilies = clients.filter((c) => c.online && !c.approved && !c.archived).length;

  const tile = (href: string, label: L, value: string, sub?: string, tone = '') =>
    h('a', { className: `tile ${tone}`, href }, h('span', { className: 'tile-label', textContent: tr(label) }), h('strong', { dir: 'ltr', textContent: value }), sub && h('small', { textContent: sub }));

  // Today, in time order: classes, private lessons, master classes, rentals.
  const end = (start: string, minutes: number) => {
    const [hh, mm] = start.split(':').map(Number);
    const x = Math.min(hh * 60 + mm + minutes, 24 * 60 - 1);
    return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  };
  const items = [
    ...classes.map((c) => ({ t: String(c.start_time).slice(0, 5), m: c.minutes, what: c.group_name, extra: [c.hall, c.cancelled && tr(S.cancelled)].filter(Boolean).join(' · '), off: c.cancelled })),
    ...lessons.map((x) => ({ t: String(x.start_time ?? '').slice(0, 5), m: x.minutes, what: `${tr(S.privateLesson)}: ${(x.lesson_students ?? []).map((s: Row) => nameIn(s.students)).filter(Boolean).join(', ')}`, extra: x.trainers?.full_name ?? '', off: false })),
    ...events.map((e) => ({ t: String(e.start_time).slice(0, 5), m: e.minutes, what: `★ ${e.title}`, extra: e.hall, off: false })),
    ...rentals.map((r) => ({ t: String(r.start_time).slice(0, 5), m: r.minutes, what: `🔑 ${tr(S.rental)}: ${r.who}`, extra: r.hall, off: false })),
  ].filter((x) => x.t).sort((a, b) => a.t.localeCompare(b.t));

  // Income: the last six months, as bars.
  const months = Array.from({ length: 6 }, (_, i) => plusMonths(ym, i - 5));
  const perMonth = months.map((m) => ({ m, v: sum(payments.filter((p) => String(p.paid_on).slice(0, 7) === m)) }));
  const top = Math.max(1, ...perMonth.map((x) => x.v));
  const methods = Object.entries(paidMonth.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.method]: (acc[p.method] ?? 0) + Number(p.amount) }), {}));

  return h('div', { className: 'stack' },
    h('h1', { textContent: `${tr(S.title)} · ${dmy(d0)}` }),
    h('div', { className: 'tiles' },
      tile('#/clients', S.students, String(active.length), `${families} ${tr(S.families)} · ${newOnes} ${tr(S.newThisMonth)}`),
      tile(`#/month/${ym}`, S.charged, money(sum(charges))),
      tile(`#/reports/${ym}`, S.paid, money(sum(paidMonth))),
      tile('#/debts', S.debts, money(sum(balances, 'balance')), `${balances.length} ${tr(S.clientsOwe)}`, balances.length ? 'warn-tile' : ''),
      tile('#/trainersTab', S.trainers, money(sum(trainerOwed, 'owed'))),
      tile('#/lessons', S.waiting, String(waiting + waitingFamilies + unconfirmed.length),
        waiting + waitingFamilies + unconfirmed.length
          ? [waiting && `${waiting} ${tr(S.requests)}`, waitingFamilies && `${waitingFamilies} ${tr(S.familiesWaiting)}`, unconfirmed.length && `${unconfirmed.length} ${tr(S.unconfirmed)}`].filter(Boolean).join(' · ')
          : tr(S.allClear),
        waiting + waitingFamilies ? 'warn-tile' : '')
    ),
    h('section', { className: 'card' },
      h('h2', {}, h('a', { href: `#/lessons/${d0}`, textContent: tr(S.today) })),
      items.length
        ? h('ul', { className: 'imp-list' }, ...items.map((x) => h('li', { className: x.off ? 'off' : '' },
            h('a', { href: `#/lessons/${d0}` }, ltr(`${x.t}–${end(x.t, x.m)}`), ' ', h('strong', { textContent: x.what }), x.extra ? ` · ${x.extra}` : ''))))
        : h('p', { className: 'muted', textContent: tr(S.nothingToday) })
    ),
    h('section', { className: 'card' },
      h('h2', { textContent: tr(S.income) }),
      h('div', { className: 'bars' }, ...perMonth.map((x) => h('a', { className: 'bar', href: `#/reports/${x.m}`, title: money(x.v) },
        h('span', { className: 'bar-value', dir: 'ltr', textContent: x.v ? money(x.v) : '' }),
        h('span', { className: 'bar-fill', style: `block-size: ${Math.round((x.v / top) * 100)}%` }),
        h('span', { className: 'bar-label', textContent: monthShort(lang, x.m) })))),
      methods.length > 0 && h('p', { className: 'muted' }, `${tr(S.byMethod)}: `, methods.map(([m, v]) => `${METHOD[m] ? tr(METHOD[m]) : m} ${money(v)}`).join(' · '))
    )
  );
}
