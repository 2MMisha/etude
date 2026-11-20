// Clients list, and one client's page: the family, each student's groups,
// discounts, suggested monthly price and charges.
import { t, LANGS, getLang } from '../i18n';
import { pick, stateOf } from '../forms';
import { paymentsCard } from './payments';
import { registrationCard, attention, regWord, formFacts } from './registration';
import { exportCard } from './export';
import { notifyCard, notifyMany } from './notify';
import { db, h, get, ok, nav, input, number, checkbox, select, field, tick, sureButton, flash, money, ltr, pctOf, today, fillThisMonth, studentPicker, studentLabel, type Row, keep, nameIn } from '../ui';

const digits = (s: string) => s.replace(/\D/g, '').replace(/^972/, '0');
/** The list's view (families or students) and sort order, kept while the CRM is open. */
const list = { mode: 'families' as 'families' | 'students', sort: '', desc: false };

export async function clientsView() {
  const [clients, students, enrollments, groups, owing] = await Promise.all([
    get<Row[]>(db!.from('clients').select('id, full_name, full_name_en, phone, email, archived, online, approved, user_id, lang, created_at').order('full_name')),
    get<Row[]>(db!.from('students').select('id, client_id, full_name, full_name_en, phone, email, id_number, archived, birth_date, created_at').order('full_name')),
    get<Row[]>(db!.from('enrollments').select('student_id, group_id')),
    get<Row[]>(db!.from('groups').select('id, name, includes, archived, program_id').order('name')),
    get<Row[]>(db!.from('client_balances').select('client_id, balance')),
  ]);
  // For the more filters: programmes, who teaches which group, private lessons around now, documents.
  const around = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const [programs, trainers, slots, lessons, forms] = await Promise.all([
    get<Row[]>(db!.from('programs').select('id, name, archived').order('name')),
    get<Row[]>(db!.from('trainers').select('id, full_name, archived').order('full_name')),
    get<Row[]>(db!.from('group_slots').select('group_id, trainer_id')),
    get<Row[]>(db!.from('lessons').select('trainer_id, lesson_students(student_id)').gte('held_on', around(-60)).lte('held_on', around(60))),
    get<Row[]>(db!.from('student_forms').select('student_id, form, submitted_at, needs_update').order('submitted_at', { ascending: false })),
  ]);
  const asking = await attention();
  // A family that registered online and is not checked yet, or one that asked to be contacted.
  const marks = (id: string) => `${students.some((s) => s.client_id === id && asking.has(s.id)) ? ' ⚠' : ''}`;
  const kids = (id: string) => students.filter((s) => s.client_id === id && !s.archived).map((s) => nameIn(s)).join(', ');

  const body = h('tbody');
  const search = h('input', { type: 'search', placeholder: t('search') });
  const archived = h('input', { type: 'checkbox' });
  // Filters (stage 5): a group (its own students and those of a group that includes it), who owes, who waits, who to contact.
  const fsay = (ru: string, he: string, en: string) => pick({ ru, he, en }, getLang());
  const groupSel = h('select', { ariaLabel: fsay('Группа', 'קבוצה', 'Group') }, h('option', { value: '', textContent: fsay('Все группы', 'כל הקבוצות', 'All groups') }),
    ...groups.filter((g) => !g.archived).map((g) => h('option', { value: g.id, textContent: g.name })));
  const owesBox = h('input', { type: 'checkbox' });
  const waitingBox = h('input', { type: 'checkbox' });
  const contactBox = h('input', { type: 'checkbox' });
  const programSel = h('select', { ariaLabel: fsay('Программа', 'תוכנית', 'Programme') }, h('option', { value: '', textContent: fsay('Все программы', 'כל התוכניות', 'All programmes') }),
    ...programs.filter((x) => !x.archived).map((x) => h('option', { value: x.id, textContent: x.name })));
  const trainerSel = h('select', { ariaLabel: fsay('Тренер', 'מאמן/ת', 'Trainer') }, h('option', { value: '', textContent: fsay('Все тренеры', 'כל המאמנים', 'All trainers') }),
    ...trainers.filter((x) => !x.archived).map((x) => h('option', { value: x.id, textContent: x.full_name })));
  const ageSel = h('select', { ariaLabel: fsay('Возраст', 'גיל', 'Age') },
    ...([['', fsay('Все возрасты', 'כל הגילאים', 'All ages')], ['minor', fsay('Есть ребёнок до 18', 'יש ילד/ה מתחת ל-18', 'Has a child under 18')], ['adult', fsay('Есть взрослый ученик', 'יש תלמיד/ה בוגר/ת', 'Has an adult student')]] as [string, string][]).map(([v, t2]) => h('option', { value: v, textContent: t2 })));
  const docsBox = h('input', { type: 'checkbox' });
  const appBox = h('input', { type: 'checkbox' });
  const live = (clientId: string) => students.filter((x) => x.client_id === clientId && !x.archived);
  const groupsOf = (sid: string) => enrollments.filter((e) => e.student_id === sid).flatMap((e) => [e.group_id, ...(groups.find((g) => g.id === e.group_id)?.includes ?? [])]);
  const adultNow = (b: string | null) => !!b && (Date.now() - new Date(`${b}T12:00:00Z`).getTime()) / (365.25 * 864e5) >= 18;
  const missingDocs = (sid: string, birth: string | null) => {
    const needed = adultNow(birth) ? ['f1', 'f2', 'f4', 'f6', 'f7'] : ['f1', 'f2', 'f3', 'f4', 'f6', 'f7'];
    return needed.some((code) => {
      const r = forms.find((f) => f.student_id === sid && f.form === code);
      return ['none', 'update'].includes(stateOf(code, needed, r && { at: r.submitted_at, signed_by: '', needs_update: r.needs_update, ask: null, clarified: true }));
    });
  };
  const byProgram = (clientId: string, pid: string) => live(clientId).some((x) => groupsOf(x.id).some((gid) => groups.find((g) => g.id === gid)?.program_id === pid));
  const byTrainer = (clientId: string, tid: string) => live(clientId).some((x) =>
    groupsOf(x.id).some((gid) => slots.some((sl) => sl.group_id === gid && sl.trainer_id === tid)) ||
    lessons.some((ls) => ls.trainer_id === tid && (ls.lesson_students ?? []).some((y: Row) => y.student_id === x.id)));
  const inGroup = (clientId: string, gid: string) => students.some((s) => s.client_id === clientId && !s.archived &&
    enrollments.some((e) => e.student_id === s.id && (e.group_id === gid || (groups.find((g) => g.id === e.group_id)?.includes ?? []).includes(gid))));
  // Search finds a client by its own details and by any of its students' (names in Hebrew and English,
  // phone, email, ID number) — what the family typed in the account. Phones match with or without dashes.
  const digitsOf = (x: unknown) => String(x ?? '').replace(/\D/g, '');
  const searchText = (c: Row) => {
    const kidsRows = students.filter((s) => s.client_id === c.id);
    const words = [c.full_name, c.full_name_en, c.phone, c.email, ...kidsRows.flatMap((s) => [s.full_name, s.full_name_en, s.phone, s.email, s.id_number])];
    return `${words.join(' ')} ${words.map(digitsOf).filter((d) => d.length >= 3).join(' ')}`.toLowerCase();
  };
  // Each family's balance: more than 0 = owes, less than 0 = has credit.
  const balance = (id: string) => Number(owing.find((b) => b.client_id === id)?.balance ?? 0);
  const owes = (id: string) => balance(id) > 0;
  const docsMissing = (c: Row) => !!c.user_id && live(c.id).some((x) => missingDocs(x.id, x.birth_date));
  const ageOf = (b: string | null) => (b ? Math.floor((Date.now() - new Date(`${b}T12:00:00Z`).getTime()) / (365.25 * 864e5)) : null);
  const dmy = (iso: string) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '');
  const groupNames = (sid: string) => enrollments.filter((e) => e.student_id === sid).map((e) => groups.find((g) => g.id === e.group_id)?.name).filter(Boolean).join(', ');
  const familyOf = (s: Row) => clients.find((c) => c.id === s.client_id) ?? {};
  const tag = (text: string, cls = '') => h('small', { className: `tag ${cls}`, textContent: text });
  const status = (c: Row) => [
    c.online && !c.approved && tag(`🆕 ${regWord('waiting')}`),
    docsMissing(c) && tag(fsay('Не хватает документов', 'חסרים מסמכים', 'Documents missing'), 'bad'),
    c.user_id && c.approved && tag(`📱 ${fsay('Приложение', 'אפליקציה', 'App')}`),
  ];
  const balanceCell = (id: string) => {
    const b = balance(id);
    return b === 0 ? '' : h('span', { className: b > 0 ? 'bad' : 'good' }, ltr(money(Math.abs(b))), b < 0 ? ` ${fsay('кредит', 'זיכוי', 'credit')}` : '');
  };

  // The columns of each view: a heading, what it sorts by, and the cell.
  interface Col { label: string; key: (r: Row) => string | number; cell: (r: Row) => Node | string | (Node | string | false | null | undefined | '')[] }
  const famCols: Col[] = [
    { label: t('name'), key: (c) => nameIn(c), cell: (c) => [h('a', { href: `#/client/${c.id}${c.online ? '/reg' : ''}`, textContent: nameIn(c) + marks(c.id) })] },
    { label: t('phone'), key: (c) => c.phone ?? '', cell: (c) => ltr(c.phone) },
    { label: t('students'), key: (c) => kids(c.id), cell: (c) => kids(c.id) },
    { label: fsay('Баланс', 'יתרה', 'Balance'), key: (c) => balance(c.id), cell: (c) => balanceCell(c.id) },
    { label: fsay('Статус', 'סטטוס', 'Status'), key: (c) => (c.online && !c.approved ? 0 : docsMissing(c) ? 1 : c.user_id ? 2 : 3), cell: (c) => status(c).filter((x): x is HTMLElement => !!x) },
    { label: fsay('Добавлен', 'נוסף/ה', 'Added'), key: (c) => c.created_at, cell: (c) => ltr(dmy(c.created_at)) },
  ];
  const stuCols: Col[] = [
    { label: t('name'), key: (x) => nameIn(x), cell: (x) => [h('a', { href: `#/client/${x.client_id}/students`, textContent: studentLabel(x) + (asking.has(x.id) ? ' ⚠' : '') })] },
    { label: fsay('Возраст', 'גיל', 'Age'), key: (x) => ageOf(x.birth_date) ?? -1, cell: (x) => String(ageOf(x.birth_date) ?? '') },
    { label: fsay('Группы', 'קבוצות', 'Groups'), key: (x) => groupNames(x.id), cell: (x) => groupNames(x.id) },
    { label: fsay('Семья', 'משפחה', 'Family'), key: (x) => nameIn(familyOf(x)), cell: (x) => [h('a', { href: `#/client/${x.client_id}`, textContent: nameIn(familyOf(x)) })] },
    { label: fsay('Документы', 'מסמכים', 'Documents'), key: (x) => (familyOf(x).user_id ? (missingDocs(x.id, x.birth_date) ? 0 : 1) : 2),
      cell: (x) => (familyOf(x).user_id ? (missingDocs(x.id, x.birth_date) ? tag(fsay('Не хватает', 'חסרים', 'Missing'), 'bad') : '✓') : '—') },
    { label: fsay('Добавлен', 'נוסף/ה', 'Added'), key: (x) => x.created_at, cell: (x) => ltr(dmy(x.created_at)) },
  ];

  // One student passes the filters the same way a family does, but by its own groups, age and documents.
  const q = () => search.value.trim().toLowerCase();
  const found = (text: string) => !q() || text.includes(q()) || (digitsOf(q()).length >= 3 && text.includes(digitsOf(q())));
  const familyOk = (c: Row) => (!owesBox.checked || owes(c.id)) && (!waitingBox.checked || (c.online && !c.approved)) && (!appBox.checked || (c.user_id && c.approved));
  const studentOk = (x: Row) => {
    const c = familyOf(x);
    const own = [x.full_name, x.full_name_en, x.phone, x.email, x.id_number, c.full_name, c.full_name_en, c.phone];
    return (archived.checked || (!x.archived && !c.archived)) && found(`${own.join(' ')} ${own.map(digitsOf).filter((d) => d.length >= 3).join(' ')}`.toLowerCase())
      && familyOk(c)
      && (!groupSel.value || groupsOf(x.id).includes(groupSel.value))
      && (!contactBox.checked || asking.has(x.id))
      && (!programSel.value || groupsOf(x.id).some((gid) => groups.find((g) => g.id === gid)?.program_id === programSel.value))
      && (!trainerSel.value || groupsOf(x.id).some((gid) => slots.some((sl) => sl.group_id === gid && sl.trainer_id === trainerSel.value)) ||
          lessons.some((ls) => ls.trainer_id === trainerSel.value && (ls.lesson_students ?? []).some((y: Row) => y.student_id === x.id)))
      && (!ageSel.value || (ageSel.value === 'adult') === adultNow(x.birth_date))
      && (!docsBox.checked || (c.user_id && missingDocs(x.id, x.birth_date)));
  };

  let shown: Row[] = [];
  const head = h('thead');
  const modeBtns = (['families', 'students'] as const).map((m) => h('button', { type: 'button', textContent: m === 'families' ? fsay('Семьи', 'משפחות', 'Families') : t('students'),
    ariaPressed: String(list.mode === m), onclick: () => { list.mode = m; list.sort = ''; modeBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(['families', 'students'][i] === m))); draw(); } }));
  const draw = () => {
    const families = clients.filter((c) => (archived.checked || !c.archived) && found(searchText(c))
      && (!groupSel.value || inGroup(c.id, groupSel.value))
      && familyOk(c)
      && (!contactBox.checked || students.some((s) => s.client_id === c.id && asking.has(s.id)))
      && (!programSel.value || byProgram(c.id, programSel.value))
      && (!trainerSel.value || byTrainer(c.id, trainerSel.value))
      && (!ageSel.value || live(c.id).some((x) => (ageSel.value === 'adult') === adultNow(x.birth_date)))
      && (!docsBox.checked || docsMissing(c)));
    const studentsShown = list.mode === 'students' ? students.filter(studentOk) : [];
    // "Notify these clients" reaches the families of what is on the screen.
    shown = list.mode === 'families' ? families : clients.filter((c) => studentsShown.some((x) => x.client_id === c.id));
    const cols = list.mode === 'families' ? famCols : stuCols;
    const rows = list.mode === 'families' ? [...families] : studentsShown;
    const col = cols.find((c) => c.label === list.sort);
    if (!col) rows.sort((a, b) => nameIn(a).localeCompare(nameIn(b), getLang())); // by the name shown
    else rows.sort((a, b) => { const x = col.key(a), y = col.key(b); const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), getLang()); return list.desc ? -r : r; });
    head.replaceChildren(h('tr', {}, ...cols.map((c) => h('th', {}, h('button', { type: 'button', className: 'link sort', textContent: `${c.label}${list.sort === c.label ? (list.desc ? ' ▼' : ' ▲') : ''}`,
      onclick: () => { list.desc = list.sort === c.label ? !list.desc : false; list.sort = c.label; draw(); } })))));
    body.replaceChildren(...rows.map((r) => {
      const off = r.archived || (list.mode === 'students' && familyOf(r).archived);
      return h('tr', { className: off ? 'off' : '' }, ...cols.map((c) => { const v = c.cell(r); return h('td', {}, ...(Array.isArray(v) ? v.filter((x): x is Node | string => !!x) : [v])); }));
    }));
    if (!rows.length) body.append(h('tr', {}, h('td', { colSpan: cols.length, className: 'muted', textContent: t('emptyList') })));
    count.textContent = `${rows.length}`;
  };
  const count = h('span', { className: 'muted' });
  for (const [k, el] of Object.entries({ search, archived, groupSel, owesBox, waitingBox, contactBox, programSel, trainerSel, ageSel, docsBox, appBox })) keep(`clients.${k}`, el);
  search.oninput = archived.onchange = groupSel.onchange = owesBox.onchange = waitingBox.onchange = contactBox.onchange = programSel.onchange = trainerSel.onchange = ageSel.onchange = docsBox.onchange = appBox.onchange = draw;
  draw();

  const name = h('input', { type: 'text', placeholder: t('name'), required: true });
  const phone = h('input', { type: 'tel', placeholder: t('phone') });
  const form = h('form', { className: 'row' }, name, phone, h('button', { className: 'primary', type: 'submit', textContent: t('newClient') }));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = await get<Row>(db!.from('clients').insert({ full_name: name.value.trim(), phone: phone.value.trim() }).select('id').single());
    location.hash = `#/client/${row.id}`;
  };

  return h('div', { className: 'stack' },
    h('section', { className: 'card' },
      h('h1', { textContent: t('clients') }),
      form,
      h('div', { className: 'row' }, search, tick(t('showArchived'), archived)),
      h('div', { className: 'row' }, groupSel, tick(fsay('Должники', 'חייבים', 'Owe money'), owesBox), tick(fsay('Ждут подтверждения', 'ממתינים לאישור', 'Waiting to be let in'), waitingBox), tick(fsay('Нужно связаться', 'צריך ליצור קשר', 'To contact'), contactBox)),
      h('div', { className: 'row' }, programSel, trainerSel, ageSel, tick(fsay('Не хватает документов', 'חסרים מסמכים', 'Documents missing'), docsBox), tick(fsay('С приложением', 'עם האפליקציה', 'Have the app'), appBox)),
      notifyMany(() => shown),
      h('div', { className: 'row' }, ...modeBtns, count),
      h('div', { className: 'scroll' }, h('table', {}, head, body))
    ),
    exportCard()
  );
}

export async function clientView(id?: string, tab?: string) {
  const client = await get<Row>(db!.from('clients').select('*').eq('id', id).single());
  await fillThisMonth();
  const [students, groups, others, everyone] = await Promise.all([
    get<Row[]>(db!.from('students').select('*').eq('client_id', id).order('created_at')),
    get<Row[]>(db!.from('groups').select('id, name, archived').order('name')),
    get<Row[]>(db!.from('clients').select('id, full_name, full_name_en, phone, user_id').neq('id', id).order('full_name')),
    get<Row[]>(db!.from('students').select('id, full_name, full_name_en, client_id').eq('archived', false).order('full_name')),
  ]);
  const ids = students.map((s) => s.id);
  const [enrollments, quotes, charges, forms] = await Promise.all([
    get<Row[]>(db!.from('enrollments').select('*').in('student_id', ids)),
    get<Row[]>(db!.from('student_quotes').select('*').in('student_id', ids)),
    get<Row[]>(db!.from('charges').select('*').in('student_id', ids).order('month', { ascending: false }).limit(500)),
    get<Row[]>(db!.from('student_forms').select('student_id, form, answers, submitted_at').in('student_id', ids).order('submitted_at', { ascending: false })),
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
      field(`${t('name')} (EN)`, input(client.full_name_en, (v) => set('clients', client, { full_name_en: v }), { dir: 'ltr' })),
      field(t('phone'), input(client.phone, (v) => set('clients', client, { phone: v }, true), { type: 'tel' })),
      field(t('email'), input(client.email, (v) => set('clients', client, { email: v }), { type: 'email' })),
      field(t('address'), input(client.address, (v) => set('clients', client, { address: v }))),
      field(t('language'), select(LANGS.map((l) => [l, l.toUpperCase()]), client.lang, (v) => set('clients', client, { lang: v })))
    ),
    twins.length > 0 && h('p', { className: 'warn' }, `${t('samePhone')}: `, ...twins.flatMap((o, i) => [i > 0 && ', ', h('a', { href: `#/client/${o.id}`, textContent: nameIn(o) })])),
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
        h('td', {}, c.kind === 'private' && `${t('privateLesson')}: `, c.kind === 'entry' && `${t('oneTimeEntry')}: `, ltr(c.description), c.manual && h('small', {}, t('byHand'))),
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
        field(`${t('name')} (EN)`, input(s.full_name_en, (v) => upd({ full_name_en: v }), { dir: 'ltr' })),
        field(t('birthDate'), input(s.birth_date, (v) => upd({ birth_date: v || null }), { type: 'date' })),
        field(t('phone'), input(s.phone, (v) => upd({ phone: v }), { type: 'tel' })),
        field(t('email'), input(s.email, (v) => upd({ email: v }), { type: 'email', dir: 'ltr' })),
        field(t('idNumber'), input(s.id_number, (v) => upd({ id_number: v }), { dir: 'ltr' })),
        field(t('address'), input(s.address, (v) => upd({ address: v }))),
        field(t('level'), input(s.level, (v) => upd({ level: v }))),
        // A couple: the two point at each other, and a private lesson for one offers the other.
        field(t('partner'), studentPicker(everyone.filter((x) => x.id !== s.id), s.partner_id ?? '', (v) => upd({ partner_id: v || null }, true), { ariaLabel: t('partner') }))
      ),
      field(t('notes'), input(s.notes, (v) => upd({ notes: v }))),
      formFacts(s.id, client.id, forms),

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
  const TABS: [string, string][] = [['info', t('tabInfo')], ['pay', t('payments')], ['students', `${t('students')} (${students.length})`], ['reg', `${regWord('title')}${client.online ? ' 🆕' : ''}`]];
  const current = TABS.some(([k]) => k === tab) ? tab : 'info';
  const body =
    current === 'pay' ? [await paymentsCard(client, students, charges)]
    : current === 'reg' ? await registrationCard(client, students, everyone, others)
    : current === 'students' ? [...students.map(studentCard), h('section', { className: 'card' }, addForm)]
    : [clientCard, await notifyCard(client, students)];

  return h('div', { className: 'stack' },
    h('a', { href: '#/clients', textContent: t('back') }),
    h('h1', { textContent: nameIn(client) }),
    h('nav', { className: 'subtabs' }, ...TABS.map(([k, label]) => h('a', { href: `#/client/${client.id}/${k}`, textContent: label, ariaCurrent: k === current ? 'page' : null }))),
    ...body
  );
}
