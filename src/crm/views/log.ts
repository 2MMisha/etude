// Activity log (stage 5): who changed what and when. Every table records its
// changes in activity_log (the database's log_change trigger); staff can read
// it. This screen shows the latest changes in plain words, with filters by
// what was changed, by person and by date.
import { getLang } from '../i18n';
import { db, h, get, ltr, type Row } from '../ui';
import { pick, type L } from '../forms';

const l = (ru: string, he: string, en: string): L => ({ ru, he, en });
const tr = (x: L) => pick(x, getLang());
const S = {
  title: l('Журнал изменений', 'יומן שינויים', 'Activity log'),
  hint: l('Последние 300 изменений. Кто добавил, изменил или удалил запись, и что именно.', '300 השינויים האחרונים: מי הוסיף, שינה או מחק רשומה, ומה בדיוק.', 'The latest 300 changes: who added, changed or deleted a record, and what exactly.'),
  everything: l('Всё', 'הכול', 'Everything'),
  everyone: l('Все', 'כולם', 'Everyone'),
  since: l('С даты', 'מתאריך', 'Since'),
  insert: l('добавил(а)', 'הוסיף/ה', 'added'),
  update: l('изменил(а)', 'שינה/תה', 'changed'),
  delete: l('удалил(а)', 'מחק/ה', 'deleted'),
  system: l('система', 'המערכת', 'the system'),
  family: l('семья', 'משפחה', 'a family'),
  empty: l('Ничего не найдено.', 'לא נמצא דבר.', 'Nothing found.'),
};
const TABLES: Record<string, L> = {
  clients: l('Клиент', 'לקוח', 'Client'), students: l('Ученик', 'תלמיד/ה', 'Student'), enrollments: l('Запись в группу', 'רישום לקבוצה', 'Group enrolment'),
  charges: l('Начисление', 'חיוב', 'Charge'), payments: l('Оплата', 'תשלום', 'Payment'), payment_lines: l('Строка оплаты', 'שורת תשלום', 'Payment line'),
  prices: l('Цена', 'מחיר', 'Price'), programs: l('Программа', 'תוכנית', 'Programme'), groups: l('Группа', 'קבוצה', 'Group'),
  group_slots: l('Время занятия', 'זמן שיעור', 'Class time'), group_slot_changes: l('Изменение занятия', 'שינוי שיעור', 'Class change'),
  lessons: l('Частный урок', 'שיעור פרטי', 'Private lesson'), lesson_students: l('Ученик урока', 'תלמיד/ה בשיעור', 'Lesson student'),
  lesson_requests: l('Запрос тренера', 'בקשת מאמן/ת', "Trainer's request"), trainers: l('Тренер', 'מאמן/ת', 'Trainer'),
  trainer_rates: l('Ставка тренера', 'תעריף מאמן/ת', 'Trainer rate'), trainer_payouts: l('Выплата тренеру', 'תשלום למאמן/ת', 'Trainer payout'),
  expenses: l('Расход', 'הוצאה', 'Expense'), events: l('Мастер-класс', 'כיתת אמן', 'Master class'), entries: l('Разовый вход', 'כניסה חד-פעמית', 'One-time entry'),
  rentals: l('Аренда', 'השכרה', 'Rental'), profiles: l('Учётная запись', 'חשבון', 'Account'), settings: l('Настройка', 'הגדרה', 'Setting'),
  student_forms: l('Анкета', 'טופס', 'Form'), student_notes: l('Комментарий', 'הערה', 'Comment'),
  class_sessions: l('Проведённое занятие', 'שיעור שהתקיים', 'Class held'), attendance: l('Посещаемость', 'נוכחות', 'Attendance'),
};
// Fields that say nothing to a person.
const NOISE = new Set(['id', 'created_at', 'created_by', 'updated_at', 'form_token', 'user_id', 'client_id', 'student_id', 'group_id', 'program_id', 'trainer_id', 'charge_id', 'payment_id', 'lesson_id', 'slot_id', 'event_id', 'decided_by', 'answers']);
/** A short name for a row: its name, title or description. */
const nameOf = (r: Row | null) => (r ? r.full_name ?? r.name ?? r.title ?? r.who ?? r.description ?? r.guest_name ?? r.label ?? (r.number != null ? `№ ${r.number}` : '') : '');
const show = (v: unknown) => (v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export async function logView(filter?: string) {
  const [table = '', who = '', since = ''] = (filter ?? '').split('~').map(decodeURIComponent);
  let q = db!.from('activity_log').select('*').order('id', { ascending: false }).limit(300);
  if (table) q = q.eq('table_name', table);
  if (who) q = who === 'system' ? q.is('actor', null) : q.eq('actor', who);
  if (since) q = q.gte('at', since);
  const [rows, people] = await Promise.all([get<Row[]>(q), get<Row[]>(db!.from('profiles').select('id, full_name, email, roles'))]);
  const go = (t: string, w: string, s: string) => { location.hash = `#/log/${[t, w, s].map(encodeURIComponent).join('~')}`; };
  const person = (id: string | null) => {
    if (!id) return tr(S.system);
    const p = people.find((x) => x.id === id);
    if (!p) return '?';
    const staff = p.roles.includes('owner') || p.roles.includes('admin') || p.roles.includes('trainer');
    return p.full_name || p.email || (staff ? '?' : tr(S.family));
  };
  const tableSel = h('select', {}, h('option', { value: '', textContent: tr(S.everything) }),
    ...Object.entries(TABLES).map(([k, v]) => h('option', { value: k, textContent: tr(v), selected: k === table })));
  const whoSel = h('select', {}, h('option', { value: '', textContent: tr(S.everyone) }), h('option', { value: 'system', textContent: tr(S.system), selected: who === 'system' }),
    ...people.filter((p) => p.roles.some((r: string) => r !== 'client')).map((p) => h('option', { value: p.id, textContent: p.full_name || p.email, selected: p.id === who })));
  const sinceIn = h('input', { type: 'date', value: since, ariaLabel: tr(S.since) });
  tableSel.onchange = whoSel.onchange = sinceIn.onchange = () => go(tableSel.value, whoSel.value, sinceIn.value);

  const what = (r: Row) => {
    if (r.action === 'update') {
      const keys = Object.keys(r.new ?? {}).filter((k) => !NOISE.has(k) && JSON.stringify(r.old?.[k]) !== JSON.stringify(r.new?.[k]));
      if (keys.length) return keys.map((k) => `${k}: ${show(r.old?.[k])} → ${show(r.new?.[k])}`).join('\n');
      // Only links between records changed (a login linked to a trainer, a student moved to a family…): name them.
      return Object.keys(r.new ?? {}).filter((k) => k !== 'updated_at' && JSON.stringify(r.old?.[k]) !== JSON.stringify(r.new?.[k])).join(', ');
    }
    return nameOf(r.new ?? r.old) || (r.table_name === 'settings' ? r.row_id : '');
  };
  const link = (r: Row) => {
    const row = r.new ?? r.old ?? {};
    if (r.table_name === 'clients' && r.action !== 'delete') return `#/client/${r.row_id}`;
    if (['students', 'payments', 'student_forms', 'student_notes'].includes(r.table_name) && row.client_id) return `#/client/${row.client_id}`;
    if (r.table_name === 'payments' && r.action !== 'delete') return `#/receipt/${r.row_id}`;
    return '';
  };

  return h('section', { className: 'card' },
    h('h1', { textContent: tr(S.title) }),
    h('p', { className: 'muted', textContent: tr(S.hint) }),
    h('div', { className: 'row' }, tableSel, whoSel, sinceIn),
    rows.length
      ? h('div', { className: 'scroll' }, h('table', { className: 'log' },
          h('tbody', {}, ...rows.map((r) => h('tr', {},
            h('td', {}, ltr(new Date(r.at).toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' }))),
            h('td', { textContent: person(r.actor) }),
            h('td', {}, `${tr(S[r.action as 'insert' | 'update' | 'delete'] ?? S.update)} · `, link(r) ? h('a', { href: link(r), textContent: TABLES[r.table_name] ? tr(TABLES[r.table_name]) : r.table_name }) : (TABLES[r.table_name] ? tr(TABLES[r.table_name]) : r.table_name)),
            h('td', { className: 'log-what', textContent: what(r) })
          )))
        ))
      : h('p', { className: 'muted', textContent: tr(S.empty) })
  );
}
