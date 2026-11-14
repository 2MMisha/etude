// "Important": the CRM's first screen (owner, 2026-11-14). Everything that waits
// for someone, in one place, each line leading to where it is dealt with:
// families waiting to be let in, families to contact (a doctor's certificate,
// a rule to explain, legal limits on collecting a child), documents missing or
// due for renewal, debts, trainers' requests, lessons and classes not yet
// confirmed, money owed to trainers, online sign-ups and birthdays.
import { getLang } from '../i18n';
import { db, h, get, money, ltr, today, type Row } from '../ui';
import { FORMS, stateOf, expired, dmy, pick, type L } from '../forms';

const l = (ru: string, he: string, en: string): L => ({ ru, he, en });
const tr = (x: L) => pick(x, getLang());
const S = {
  title: l('Важное', 'חשוב', 'Important'),
  allClear: l('Всё в порядке: ничего не ждёт.', 'הכול בסדר: שום דבר לא ממתין.', 'All clear: nothing is waiting.'),
  waiting: l('Семьи ждут подтверждения', 'משפחות ממתינות לאישור', 'Families waiting to be let in'),
  contact: l('Нужно связаться с семьёй', 'צריך ליצור קשר עם המשפחה', 'Families to contact'),
  cert: l('нужна справка от врача', 'נדרש אישור רפואי', "doctor's certificate needed"),
  docs: l('Документы не заполнены или устарели', 'מסמכים שלא מולאו או פג תוקפם', 'Documents missing or out of date'),
  soon: l('Документы скоро нужно обновить (до 30 дней)', 'מסמכים שצריך לחדש בקרוב (עד 30 יום)', 'Documents due for renewal within 30 days'),
  missing: l('не заполнено: {n}', 'לא מולאו: {n}', 'missing: {n}'),
  update: l('обновить: {n}', 'לחדש: {n}', 'to update: {n}'),
  debts: l('Долги', 'חובות', 'Debts'),
  total: l('Всего', 'סה״כ', 'Total'),
  requests: l('Запросы тренеров', 'בקשות מאמנים', "Trainers' requests"),
  newLesson: l('новый урок', 'שיעור חדש', 'new lesson'),
  move: l('перенос', 'הזזה', 'move'),
  cancel: l('отмена', 'ביטול', 'cancel'),
  unconfirmed: l('Прошедшие частные уроки не подтверждены', 'שיעורים פרטיים שעברו ולא אושרו', 'Past private lessons not confirmed'),
  unmarked: l('Групповые занятия без отметки посещаемости (14 дней)', 'שיעורים קבוצתיים ללא סימון נוכחות (14 יום)', 'Group classes without attendance (14 days)'),
  trainers: l('Тренерам к выплате', 'לתשלום למאמנים', 'To pay trainers'),
  signups: l('Новые записи онлайн (7 дней)', 'הרשמות חדשות באינטרנט (7 ימים)', 'New online sign-ups (7 days)'),
  birthdays: l('Дни рождения на этой неделе', 'ימי הולדת השבוע', 'Birthdays this week'),
  today: l('сегодня', 'היום', 'today'),
  open: l('Открыть', 'פתיחה', 'Open'),
  more: l('ещё', 'נוספים', 'more'),
};
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const ageOf = (birth: string | null) => {
  if (!birth) return 0;
  const b = new Date(`${birth}T12:00:00Z`);
  const n = new Date();
  return n.getFullYear() - b.getUTCFullYear() - (n.getMonth() < b.getUTCMonth() || (n.getMonth() === b.getUTCMonth() && n.getDate() < b.getUTCDate()) ? 1 : 0);
};

export async function homeView() {
  const d0 = today();
  const [clients, students, forms, balances, requested, changes, unconfirmed, classes, sessions, trainerOwed, signups] = await Promise.all([
    get<Row[]>(db!.from('clients').select('id, full_name, phone, online, approved, user_id, archived')),
    get<Row[]>(db!.from('students').select('id, client_id, full_name, birth_date, archived')),
    get<Row[]>(db!.from('student_forms').select('student_id, form, submitted_at, needs_update, clarified, answers').order('submitted_at', { ascending: false })),
    get<Row[]>(db!.from('client_balances').select('client_id, balance').gt('balance', 0)),
    get<Row[]>(db!.from('lessons').select('id, held_on, start_time, trainers(full_name)').eq('status', 'requested').order('held_on')),
    get<Row[]>(db!.from('lesson_requests').select('id, kind, lessons(held_on, start_time, trainers(full_name))').eq('status', 'pending')),
    get<Row[]>(db!.from('lessons').select('id, held_on, start_time, trainers(full_name), lesson_students(students(full_name))').eq('status', 'planned').lt('held_on', d0).order('held_on')),
    get<Row[]>(db!.rpc('group_classes_between', { d1: plusDays(d0, -14), d2: plusDays(d0, -1) })),
    get<Row[]>(db!.from('class_sessions').select('slot_id, held_on').gte('held_on', plusDays(d0, -30))),
    get<Row[]>(db!.from('trainer_balances').select('trainer_id, owed').gt('owed', 0)),
    get<Row[]>(db!.from('entries').select('id, guest_name, created_at, events(title, held_on), students(full_name)').eq('online', true).gte('created_at', plusDays(d0, -7))),
  ]);
  const trainerNames = trainerOwed.length ? await get<Row[]>(db!.from('trainers').select('id, full_name').in('id', trainerOwed.map((x) => x.trainer_id))) : [];
  const clientOf = (sid: string) => clients.find((c) => c.id === students.find((s) => s.id === sid)?.client_id);
  const studentName = (sid: string) => students.find((s) => s.id === sid)?.full_name ?? '?';
  const latest = new Map<string, Row>(); // newest form per student and form
  for (const f of forms) if (!latest.has(`${f.student_id}/${f.form}`)) latest.set(`${f.student_id}/${f.form}`, f);

  const sections: HTMLElement[] = [];
  const item = (href: string, ...kids: (Node | string | false | null | undefined)[]) =>
    h('li', {}, h('a', { href }, ...kids.filter((k): k is Node | string => !!k)));
  const section = (key: keyof typeof S, list: HTMLElement[], tone = '', extra?: Node) => {
    if (!list.length) return;
    sections.push(h('section', { className: `card attention ${tone}`, id: `imp-${key}` },
      h('h2', {}, tr(S[key]), h('span', { className: 'count', textContent: String(list.length) })),
      h('ul', { className: 'imp-list' }, ...list.slice(0, 10), list.length > 10 && h('li', { className: 'muted', textContent: `+${list.length - 10} ${tr(S.more)}` })),
      extra ?? null));
  };

  // Families waiting to be let in.
  section('waiting', clients.filter((c) => c.online && !c.approved && !c.archived)
    .map((c) => item(`#/client/${c.id}/reg`, h('strong', { textContent: c.full_name }), ' ', ltr(c.phone ?? ''))), 'urgent');

  // Families to contact: a flagged answer the studio has not marked as clarified.
  const contacts: HTMLElement[] = [];
  for (const f of latest.values()) {
    if (f.answers?._ask !== '1' || f.clarified) continue;
    const c = clientOf(f.student_id);
    if (!c || c.archived) continue;
    const def = FORMS.find((x) => x.code === f.form);
    const cert = f.form === 'f2' && Object.entries(f.answers).some(([k, v]) => /^h\d/.test(k) && v === 'yes');
    contacts.push(item(`#/client/${c.id}/reg`, h('strong', { textContent: studentName(f.student_id) }), ` — №${def?.num ?? '?'}`,
      cert && h('span', { className: 'pill ask', textContent: ` ${tr(S.cert)}` }), ' ', ltr(c.phone ?? '')));
  }
  section('contact', contacts, 'urgent');

  // Documents: for families registered in the app.
  const docLines: HTMLElement[] = [];
  const soonLines: HTMLElement[] = [];
  for (const s of students) {
    const c = clients.find((x) => x.id === s.client_id);
    if (s.archived || !c?.user_id || !c.approved || c.archived) continue;
    const needed = ageOf(s.birth_date) >= 18 ? ['f1', 'f2', 'f4', 'f6', 'f7'] : ['f1', 'f2', 'f3', 'f4', 'f6', 'f7'];
    let none = 0, update = 0;
    const soon: string[] = [];
    for (const code of needed) {
      const r = latest.get(`${s.id}/${code}`);
      const st = stateOf(code, needed, r && { at: r.submitted_at, signed_by: '', needs_update: r.needs_update, ask: null, clarified: true });
      if (st === 'none') none++;
      if (st === 'update') update++;
      if (st === 'done' && r && expired(r.submitted_at, new Date(Date.now() + 30 * 864e5))) soon.push(`№${FORMS.find((x) => x.code === code)?.num}`);
    }
    if (none || update)
      docLines.push(item(`#/client/${c.id}/reg`, h('strong', { textContent: s.full_name }), ' — ',
        [none && tr(S.missing).replace('{n}', String(none)), update && tr(S.update).replace('{n}', String(update))].filter(Boolean).join(', ')));
    if (soon.length) soonLines.push(item(`#/client/${c.id}/reg`, h('strong', { textContent: s.full_name }), ` — ${soon.join(', ')}`));
  }
  section('docs', docLines);
  section('soon', soonLines);

  // Debts.
  const owing = balances.map((b) => ({ c: clients.find((x) => x.id === b.client_id), owed: Number(b.balance) })).filter((x) => x.c).sort((a, b) => b.owed - a.owed);
  section('debts', owing.slice(0, 10).map((x) => item(`#/client/${x.c!.id}/pay`, h('strong', { textContent: x.c!.full_name }), ' — ', ltr(money(x.owed)))), '',
    owing.length ? h('p', {}, h('a', { href: '#/debts', textContent: `${tr(S.total)}: ${money(owing.reduce((a, x) => a + x.owed, 0))} → ${tr(S.open)}` })) : undefined);

  // Trainers' requests: new lessons asked for, moves and cancellations.
  const when = (l: Row | null) => (l ? `${dmy(l.held_on)} ${String(l.start_time ?? '').slice(0, 5)}` : '');
  section('requests', [
    ...requested.map((x) => item(`#/lessons/${x.held_on}`, h('strong', { textContent: x.trainers?.full_name ?? '' }), ` — ${tr(S.newLesson)}, `, ltr(when(x)))),
    ...changes.map((x) => item(`#/lessons/${x.lessons?.held_on ?? ''}`, h('strong', { textContent: x.lessons?.trainers?.full_name ?? '' }), ` — ${tr(x.kind === 'move' ? S.move : S.cancel)}, `, ltr(when(x.lessons)))),
  ], 'urgent');

  // Past private lessons still "planned".
  section('unconfirmed', unconfirmed.map((x) => item(`#/lessons/${x.held_on}`, ltr(when(x)), ' ', h('strong', { textContent: x.trainers?.full_name ?? '' }), ' — ',
    (x.lesson_students ?? []).map((ls: Row) => ls.students?.full_name).filter(Boolean).join(', '))));

  // Group classes of the last two weeks that nobody marked.
  section('unmarked', classes
    .filter((c) => !c.cancelled && c.held_on < d0 && !sessions.some((s) => s.slot_id === c.slot_id && s.held_on === c.on_date))
    .sort((a, b) => `${a.held_on} ${a.start_time}`.localeCompare(`${b.held_on} ${b.start_time}`))
    .map((c) => item(`#/lessons/${c.held_on}`, ltr(`${dmy(c.held_on)} ${String(c.start_time).slice(0, 5)}`), ' ', h('strong', { textContent: c.group_name }))));

  // Money owed to trainers.
  section('trainers', trainerOwed.map((x) => item('#/trainersTab', h('strong', { textContent: trainerNames.find((t) => t.id === x.trainer_id)?.full_name ?? '?' }), ' — ', ltr(money(x.owed)))));

  // Online sign-ups to one-time groups.
  section('signups', signups.map((x) => item(`#/lessons/${x.events?.held_on ?? ''}`, h('strong', { textContent: x.guest_name || x.students?.full_name || '' }), ` — ${x.events?.title ?? ''} `, ltr(x.events?.held_on ? dmy(x.events.held_on) : ''))));

  // Birthdays today and in the coming week.
  const days = Array.from({ length: 7 }, (_, i) => plusDays(d0, i));
  section('birthdays', students
    .filter((s) => s.birth_date && !s.archived && days.some((d) => d.slice(5) === s.birth_date.slice(5)))
    .sort((a, b) => days.findIndex((d) => d.slice(5) === a.birth_date.slice(5)) - days.findIndex((d) => d.slice(5) === b.birth_date.slice(5)))
    .map((s) => item(`#/client/${s.client_id}/students`, h('strong', { textContent: s.full_name }), ' — ',
      s.birth_date.slice(5) === d0.slice(5) ? tr(S.today) : ltr(dmy(`${d0.slice(0, 4)}-${s.birth_date.slice(5)}`).slice(0, 5)), ` (${ageOf(s.birth_date) + (s.birth_date.slice(5) === d0.slice(5) ? 0 : 1)})`)));

  return h('div', { className: 'stack' },
    h('h1', { textContent: tr(S.title) }),
    sections.length
      ? h('nav', { className: 'chips' }, ...sections.map((s) => h('a', { className: 'chip', href: `#/home`, onclick: (e: Event) => { e.preventDefault(); s.scrollIntoView({ behavior: 'smooth' }); },
          textContent: `${s.querySelector('h2')!.firstChild!.textContent} · ${s.querySelector('.count')!.textContent}` })))
      : h('p', { className: 'card', textContent: tr(S.allClear) }),
    ...sections
  );
}
