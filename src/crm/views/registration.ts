// The client page's Registration tab: what the family filled in on /family/.
// Per student: each form's state, every answer by section and question, who
// confirmed it and when, the required answers that are missing, anything the
// family asked the studio to contact them about, and staff comments. For a
// family that registered online and is already in the CRM: join the two.
import { getLang, t } from '../i18n';
import { db, h, get, ok, nav, select, field, checkbox, tick, sureButton, flash, ltr, type Row } from '../ui';
import { FORMS, W, visible, missing, flags, answered, stateOf, pick, STUDENT_REL, STATE_WORD, type Ctx, type Form, type L, type Q, type Sent } from '../forms';


const l = (ru: string, he: string, en: string): L => ({ ru, he, en });
const S = {
  title: l('Регистрация', 'רישום', 'Registration'),
  online: l('Семья зарегистрировалась онлайн и ждёт решения: впустить её или нет. Если эта семья уже есть в системе, соедините её с существующим клиентом (это тоже впускает).', 'המשפחה נרשמה באינטרנט וממתינה להחלטה אם לאשר אותה. אם המשפחה כבר קיימת במערכת, אחדו אותה עם הלקוח הקיים (גם זה מאשר).', 'This family registered online and is waiting for a decision: let it in or not. If it is already in the system, join it to the existing client (that lets it in too).'),
  waiting: l('ждёт подтверждения', 'ממתין לאישור', 'waiting for approval'),
  approve: l('Впустить', 'לאשר', 'Let in'),
  refuse: l('Отказать', 'לדחות', 'Refuse'),
  joinTitle: l('Эта семья уже есть в системе?', 'המשפחה כבר קיימת במערכת?', 'Is this family already in the system?'),
  joinHint: l('Сначала для каждого ученика выберите, кто он из уже существующих (если он уже есть), потом соедините семьи. Оплаты и история остаются у существующего клиента, ссылки семьи продолжают работать.', 'קודם בחרו לכל תלמיד/ה מי הוא/היא מבין הקיימים (אם קיים/ת), ואז אחדו את המשפחות. התשלומים וההיסטוריה נשארים אצל הלקוח הקיים, והקישורים של המשפחה ממשיכים לעבוד.', 'First, for each student, choose who they are among those already there (if they are), then join the families. Payments and history stay with the existing client; the family’s links keep working.'),
  joinInto: l('Соединить с клиентом…', 'איחוד עם לקוח…', 'Join with client…'),
  sameAs: l('Тот же ученик, что…', 'אותו/ה תלמיד/ה כמו…', 'Same student as…'),
  noLogin: l('Семья ещё не зарегистрировалась онлайн. Отправьте ей ссылку на регистрацию:', 'המשפחה עוד לא נרשמה באינטרנט. שלחו לה את קישור ההרשמה:', 'This family has not registered online yet. Send them the registration link:'),
  hasLogin: l('Вход семьи', 'כניסת המשפחה', 'Family login'),
  link: l('Ссылка ученика', 'קישור התלמיד/ה', "Student's link"),
  answers: l('Ответы', 'תשובות', 'Answers'),
  needsUpdate: l('Попросить обновить', 'לבקש עדכון', 'Ask to update'),
  clarified: l('Уточнено', 'הובהר', 'Clarified'),
  contact: l('Нужно связаться', 'צריך ליצור קשר', 'Contact needed'),
  notes: l('Комментарии и история обращений', 'הערות והיסטוריית פניות', 'Comments and contact history'),
  addNote: l('Добавить', 'הוספה', 'Add'),
  missingAnswers: l('Не хватает ответов', 'חסרות תשובות', 'Missing answers'),
  adult: l('совершеннолетний', 'בגיר/ה', 'adult'),
  minor: l('несовершеннолетний', 'קטין/ה', 'minor'),
  holder: l('владелец аккаунта', 'בעל/ת החשבון', 'account holder'),
  older: l('Несовершеннолетний ученик старшего возраста', 'תלמיד/ה קטין/ה בוגר/ת', 'Older minor student'),
};
const tr = (x: L) => pick(x, getLang());
export const regWord = (k: keyof typeof S) => tr(S[k]);

const adult = (birth: string | null) => {
  if (!birth) return false;
  const d = new Date(`${birth}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 18);
  return d <= new Date();
};
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });

/** One answer as text, in the screen's language. */
function shown(q: Q, v: any): string {
  const opt = (id: string) => { const o = q.opts?.find(([x]) => x === id); return o ? tr(o[1]) : id; };
  if (v == null || v === '') return '';
  if (q.type === 'name2') return [v.he, v.en].filter(Boolean).join(' / ');
  if (q.type === 'tick') return v ? '✓' : '';
  if (q.type === 'yesno') return v === 'yes' ? tr(W.yes) : tr(W.no);
  if (Array.isArray(v)) return v.map(opt).join('\n');
  return q.opts ? opt(v) : String(v);
}

function answersOf(f: Form, a: Row, c: Ctx) {
  return h('div', { className: 'stack' }, ...visible(f, a, c).filter(({ qs }) => qs.length).map(({ s, qs }) => h('div', {},
    s.title && h('h4', { textContent: tr(s.title) }),
    h('dl', { className: 'answers' }, ...qs.flatMap((q) => {
      const empty = !answered(q, a[q.id]);
      const required = typeof q.req === 'function' ? q.req(a, c) : !!q.req;
      return [h('dt', { textContent: tr(q.label) }), h('dd', { className: empty && required ? 'need' : '', textContent: empty ? (required ? tr(W.unanswered).replace('{q}', '').trim() : '—') : shown(q, a[q.id]) })];
    }))
  )));
}

export async function registrationCard(client: Row, students: Row[], everyone: Row[], clients: Row[]) {
  const ids = students.map((s) => s.id);
  const [forms, notes] = await Promise.all([
    get<Row[]>(db!.from('student_forms').select('*').in('student_id', ids).order('submitted_at', { ascending: false })),
    get<Row[]>(db!.from('student_notes').select('*').in('student_id', ids).order('created_at', { ascending: false })),
  ]);
  const familyLink = `${location.origin}/family/`;
  const holder = { full_name: client.full_name, full_name_en: client.full_name_en, phone: client.phone, email: client.email, relation: client.relation, address: client.address };

  const top = h('section', { className: 'card' },
    h('div', { className: 'row spread' }, h('h2', { textContent: tr(S.title) }),
      // Everything open, then the browser's print (or save as PDF); menus and buttons are hidden on paper.
      h('button', { type: 'button', className: 'noprint', textContent: `🖨 ${t('printShort')}`, onclick: () => {
        document.querySelectorAll('details').forEach((d) => (d.open = true));
        print();
      } })),
    client.online && h('div', { className: 'stack' },
      h('p', { className: 'warn', textContent: tr(S.online) }),
      h('div', { className: 'row' },
        h('button', { type: 'button', className: 'primary', textContent: tr(S.approve), onclick: async () => { if (await ok(db!.rpc('approve_family', { cid: client.id }))) nav.refresh(); } }),
        sureButton(tr(S.refuse), async () => { if (await ok(db!.rpc('refuse_family', { cid: client.id }))) location.hash = '#/clients'; })),
      h('h3', { textContent: tr(S.joinTitle) }),
      h('p', { className: 'muted', textContent: tr(S.joinHint) }),
      select([['', tr(S.joinInto)], ...clients.filter((c) => c.id !== client.id && !c.user_id).map((c): [string, string] => [c.id, `${c.full_name}${c.phone ? ` · ${c.phone}` : ''}`])], '', async (into) => {
        if (!into) return;
        const { error } = await db!.rpc('merge_client', { from_id: client.id, into_id: into });
        if (error) return flash(error.message, true);
        location.hash = `#/client/${into}/reg`;
      })
    ),
    client.user_id
      ? h('p', { className: 'muted' }, `${tr(S.hasLogin)}: `, ltr(client.email))
      : h('div', { className: 'stack' }, h('p', { className: 'muted', textContent: tr(S.noLogin) }), h('input', { type: 'text', readOnly: true, value: familyLink, dir: 'ltr' }))
  );

  const studentBlock = (s: Row) => {
    const isAdult = adult(s.birth_date);
    const needed = isAdult ? ['f1', 'f2', 'f4', 'f6', 'f7'] : ['f1', 'f2', 'f3', 'f4', 'f6', 'f7'];
    const c: Ctx = { adult: isAdult, student: s, holder, groups: [], docs: {} };
    const mine = forms.filter((f) => f.student_id === s.id);
    const latest = (code: string) => mine.find((f) => f.form === code); // newest first
    const rel = STUDENT_REL.find(([v]) => v === s.relation)?.[1];
    const link = `${location.origin}/family/#/s/${s.form_token}`;

    const rows = FORMS.map((f) => {
      const row = latest(f.code);
      const sent: Sent | undefined = row && { at: row.submitted_at, signed_by: row.signed_by, needs_update: row.needs_update, ask: row.answers?._ask ?? null, clarified: row.clarified };
      const state = stateOf(f.code, needed, sent);
      const holes = row ? missing(f, row.answers, c) : [];
      const asks = row ? flags(f, row.answers, c) : [];
      return h('details', { className: 'block' },
        h('summary', {},
          h('strong', { textContent: `${tr(W.appendix)}${f.num} ` }), tr(f.title), ' ',
          h('span', { className: `pill ${state}`, textContent: tr(STATE_WORD[state]) }),
          holes.length > 0 && h('span', { className: 'pill none', textContent: ` ${tr(S.missingAnswers)}: ${holes.length}` }),
          asks.length > 0 && !row?.clarified && h('span', { className: 'pill ask', textContent: ` ⚠ ${tr(S.contact)}` })
        ),
        row && h('div', { className: 'stack' },
          h('p', { className: 'muted' }, `${tr(W.signedBy)}: ${row.signed_by} · `, ltr(when(row.submitted_at)), mine.filter((x) => x.form === f.code).length > 1 ? ` · ${mine.filter((x) => x.form === f.code).length}×` : ''),
          ...asks.map((x) => h('p', { className: 'warn', textContent: `⚠ ${tr(x)}` })),
          holes.length > 0 && h('p', { className: 'warn', textContent: `${tr(S.missingAnswers)}: ${holes.map((q) => tr(q.label)).join('; ')}` }),
          h('div', { className: 'row' },
            tick(tr(S.needsUpdate), checkbox(row.needs_update, async (v) => { if (await ok(db!.from('student_forms').update({ needs_update: v }).eq('id', row.id))) nav.refresh(); })),
            asks.length > 0 && tick(tr(S.clarified), checkbox(row.clarified, async (v) => { if (await ok(db!.from('student_forms').update({ clarified: v }).eq('id', row.id))) nav.refresh(); }))
          ),
          answersOf(f, row.answers, c)
        )
      );
    });

    const noteBox = h('textarea', { rows: 2 });
    const noteForm = h('form', { className: 'row' }, noteBox, h('button', { type: 'submit', textContent: tr(S.addNote) }));
    noteForm.onsubmit = async (e) => {
      e.preventDefault();
      if (noteBox.value.trim() && (await ok(db!.from('student_notes').insert({ student_id: s.id, body: noteBox.value.trim() })))) nav.refresh();
    };

    return h('section', { className: 'card' },
      h('h2', {}, s.full_name, h('small', { textContent: ` ${s.full_name_en || ''} · ${s.birth_date ?? '?'} · ${tr(isAdult ? S.adult : S.minor)}${s.is_holder ? ` · ${tr(S.holder)}` : rel ? ` · ${tr(rel)}` : ''}` })),
      field(tr(S.link), h('div', { className: 'row' },
        h('input', { type: 'text', readOnly: true, value: link, dir: 'ltr' }),
        h('button', { type: 'button', textContent: '⧉', title: 'Copy', onclick: async () => { await navigator.clipboard?.writeText(link); flash('✓'); } }))),
      client.online && select([['', tr(S.sameAs)], ...everyone.filter((x) => x.id !== s.id && x.client_id !== client.id).map((x): [string, string] => [x.id, x.full_name])], '', async (into) => {
        if (!into) return;
        const { error } = await db!.rpc('merge_student', { from_id: s.id, into_id: into });
        if (error) return flash(error.message, true);
        nav.refresh();
      }),
      ...rows,
      h('h3', { textContent: tr(S.notes) }),
      ...notes.filter((n) => n.student_id === s.id).map((n) => h('p', {}, ltr(when(n.created_at)), ` — ${n.body} `,
        sureButton('×', async () => { if (await ok(db!.from('student_notes').delete().eq('id', n.id))) nav.refresh(); }, { className: 'x' }))),
      noteForm
    );
  };

  return [top, ...students.filter((s) => !s.archived).map(studentBlock)];
}

/** For the clients list: which clients need a look (registered online, or asked to be contacted). */
export async function attention() {
  const rows = await get<Row[]>(db!.from('student_forms').select('student_id, form, submitted_at, clarified, answers->>_ask').order('submitted_at', { ascending: false }));
  const seen = new Set<string>();
  const asking = new Set<string>();
  for (const r of rows) {
    const k = `${r.student_id}/${r.form}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (r._ask === '1' && !r.clarified) asking.add(r.student_id);
  }
  return asking;
}
