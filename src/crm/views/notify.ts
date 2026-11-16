// Staff notifications to the families' phones (owner, 2026-11-16): from a
// client's page (with ready texts: missing documents, what is to pay) or to
// every client a filtered Clients list shows. Sent by staff_push in the
// database, through the same channel as the automatic messages; kept in push_log.
import { getLang, type Lang } from '../i18n';
import { db, h, get, flash, nav, money, ltr, type Row } from '../ui';
import { FORMS, W, stateOf, pick, type L } from '../forms';

const l = (ru: string, he: string, en: string): L => ({ ru, he, en });
const tr = (x: L) => pick(x, getLang());
const S = {
  title: l('Уведомление в приложение', 'הודעה לאפליקציה', 'Notification to the app'),
  many: l('📣 Уведомление этим клиентам', '📣 הודעה ללקוחות האלה', '📣 Notify these clients'),
  reach: l('дойдёт до {n} из {all} (у остальных нет входа в приложение)', 'תגיע ל-{n} מתוך {all} (לשאר אין כניסה לאפליקציה)', 'reaches {n} of {all} (the others have no app login)'),
  noLogin: l('У семьи нет входа в приложение — уведомление до неё не дойдёт. Отправьте ей ссылку на регистрацию.', 'למשפחה אין כניסה לאפליקציה — ההודעה לא תגיע. שלחו לה את קישור ההרשמה.', 'This family has no app login, so a notification will not reach them. Send them the registration link.'),
  head: l('Заголовок', 'כותרת', 'Title'),
  body: l('Текст', 'טקסט', 'Text'),
  send: l('Отправить', 'שליחה', 'Send'),
  sent: l('Отправлено: {n}', 'נשלח: {n}', 'Sent: {n}'),
  none: l('Ни у кого из них нет входа в приложение.', 'לאף אחד מהם אין כניסה לאפליקציה.', 'None of them has an app login.'),
  docs: l('Напомнить о документах', 'תזכורת על מסמכים', 'Remind about documents'),
  pay: l('Напомнить об оплате', 'תזכורת על תשלום', 'Remind about payment'),
  history: l('Отправленные уведомления', 'הודעות שנשלחו', 'Notifications sent'),
  notSent: l('не отправлено', 'לא נשלח', 'not sent'),
  hint: l('Уведомление придёт на телефоны семьи, если она вошла в «Кабинет» в приложении и разрешила уведомления. Пишите на языке семьи: {lang}.', 'ההודעה תגיע לטלפונים של המשפחה אם נכנסה ל"חשבון" באפליקציה ואישרה התראות. כתבו בשפת המשפחה: {lang}.', 'It reaches the family’s phones if they signed in to the Account in the app and allowed notifications. Write in the family’s language: {lang}.'),
};
const LANG_NAME: Record<string, string> = { he: 'עברית', ru: 'русский', en: 'English' };
// Ready texts, written in the family's language.
const READY = {
  docsTitle: l('Не хватает документов', 'חסרים מסמכים', 'Documents missing'),
  docsBody: l('Пожалуйста, заполните в приложении → «Кабинет»: {list}', 'נא למלא באפליקציה ← "החשבון": {list}', 'Please fill in, in the app → Account: {list}'),
  payTitle: l('Напоминание об оплате', 'תזכורת תשלום', 'Payment reminder'),
  payBody: l('К оплате {amount}. Подробности — в приложении → «Кабинет».', 'לתשלום {amount}. הפרטים באפליקציה ← "החשבון".', '{amount} to pay. Details in the app → Account.'),
};

/** A title, a text and a Send button; send(title, text) returns how many families it reached. */
function composer(send: (title: string, body: string) => Promise<number>, extra: Node[] = []) {
  const head = h('input', { type: 'text', maxLength: 100, placeholder: tr(S.head), ariaLabel: tr(S.head) });
  const text = h('textarea', { rows: 3, maxLength: 1000, placeholder: tr(S.body), ariaLabel: tr(S.body) });
  const button = h('button', { type: 'button', className: 'primary', textContent: tr(S.send), onclick: async () => {
    if (!head.value.trim() || !text.value.trim()) return flash(`${tr(S.head)} / ${tr(S.body)}`, true);
    button.disabled = true;
    try {
      const n = await send(head.value.trim(), text.value.trim());
      flash(n ? tr(S.sent).replace('{n}', String(n)) : tr(S.none), !n);
      if (n) { head.value = ''; text.value = ''; nav.refresh(); }
    } finally {
      button.disabled = false;
    }
  } });
  return { head, text, node: h('div', { className: 'stack' }, h('div', { className: 'row' }, ...extra), head, text, h('div', {}, button)) };
}
const push = (ids: string[], title: string, body: string) => get<number>(db!.rpc('staff_push', { client_ids: ids, title, body }));

/** The box on a client's page. */
export async function notifyCard(client: Row, students: Row[]) {
  const L = (client.lang ?? 'he') as Lang;
  if (!client.user_id) return h('section', { className: 'card' }, h('h2', { textContent: tr(S.title) }), h('p', { className: 'muted', textContent: tr(S.noLogin) }));
  const ids = students.filter((s) => !s.archived).map((s) => s.id);
  const [forms, balance, sentLog] = await Promise.all([
    ids.length ? get<Row[]>(db!.from('student_forms').select('student_id, form, submitted_at, needs_update, clarified').in('student_id', ids).order('submitted_at', { ascending: false })) : Promise.resolve([] as Row[]),
    get<Row[]>(db!.from('client_balances').select('balance').eq('client_id', client.id)),
    get<Row[]>(db!.from('push_log').select('at, title, body, sent').contains('user_ids', [client.user_id]).order('id', { ascending: false }).limit(10)),
  ]);
  // What each student still needs, as the family sees it.
  const missing = students.filter((s) => !s.archived).flatMap((s) => {
    const age = s.birth_date ? (Date.now() - new Date(`${s.birth_date}T12:00:00Z`).getTime()) / (365.25 * 864e5) : 0;
    const needed = age >= 18 ? ['f1', 'f2', 'f4', 'f6', 'f7'] : ['f1', 'f2', 'f3', 'f4', 'f6', 'f7'];
    const nums = FORMS.filter((f) => {
      const r = forms.find((x) => x.student_id === s.id && x.form === f.code);
      return ['none', 'update'].includes(stateOf(f.code, needed, r && { at: r.submitted_at, signed_by: '', needs_update: r.needs_update, ask: null, clarified: true }));
    }).map((f) => `№${f.num}`);
    return nums.length ? [`${s.full_name} — ${pick(W.appendix, L).trim()} ${nums.join(', ')}`] : [];
  });
  const owed = Number(balance[0]?.balance ?? 0);
  const c = composer((title, body) => push([client.id], title, body), [
    missing.length > 0 && h('button', { type: 'button', textContent: tr(S.docs), onclick: () => {
      c.head.value = pick(READY.docsTitle, L);
      c.text.value = pick(READY.docsBody, L).replace('{list}', missing.join('; '));
    } }),
    owed > 0 && h('button', { type: 'button', textContent: tr(S.pay), onclick: () => {
      c.head.value = pick(READY.payTitle, L);
      c.text.value = pick(READY.payBody, L).replace('{amount}', money(owed));
    } }),
  ].filter((x): x is HTMLButtonElement => !!x));
  return h('section', { className: 'card' },
    h('h2', { textContent: tr(S.title) }),
    h('p', { className: 'muted', textContent: tr(S.hint).replace('{lang}', LANG_NAME[L] ?? L) }),
    c.node,
    sentLog.length > 0 && h('details', {},
      h('summary', { textContent: `${tr(S.history)} (${sentLog.length})` }),
      h('ul', { className: 'money-list' }, ...sentLog.map((p) => h('li', {},
        h('span', {}, ltr(new Date(p.at).toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' })), ' ', h('strong', { textContent: p.title }), ` — ${p.body}`),
        !p.sent && h('small', { className: 'pill none', textContent: tr(S.notSent) })))))
  );
}

/** "Notify these clients": for whatever the Clients list shows right now. */
export function notifyMany(visible: () => Row[]) {
  const box = h('div', { className: 'stack' });
  const toggle = h('button', { type: 'button', textContent: tr(S.many), onclick: () => {
    if (box.childElementCount) return box.replaceChildren();
    const rows = visible();
    const reachable = rows.filter((c) => c.user_id && c.approved && !c.archived);
    const c = composer((title, body) => push(reachable.map((x) => x.id), title, body));
    box.replaceChildren(h('p', { className: 'muted', textContent: tr(S.reach).replace('{n}', String(reachable.length)).replace('{all}', String(rows.length)) }), c.node);
  } });
  return h('div', { className: 'stack' }, h('div', {}, toggle), box);
}
