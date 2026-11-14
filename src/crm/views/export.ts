// Export clients or students to Excel with only the columns chosen (owner,
// 2026-11-14). Shown at the bottom of the Clients screen. The choice of columns
// is remembered on this computer.
import { getLang } from '../i18n';
import { db, h, get, today, flash, type Row } from '../ui';
import { FORMS, W, STUDENT_REL, stateOf, pick, type L } from '../forms';

const l = (ru: string, he: string, en: string): L => ({ ru, he, en });
const tr = (x: L) => pick(x, getLang());
const S = {
  title: l('Выгрузка в Excel', 'ייצוא לאקסל', 'Export to Excel'),
  hint: l('Выберите, кого выгружать и какие данные. Выбор запоминается на этом компьютере.', 'בחרו את מי לייצא ואילו נתונים. הבחירה נשמרת במחשב הזה.', 'Choose who to export and which details. The choice is remembered on this computer.'),
  clients: l('Клиенты', 'לקוחות', 'Clients'),
  students: l('Ученики', 'תלמידים', 'Students'),
  archived: l('Включая архивных', 'כולל בארכיון', 'Include archived'),
  all: l('Выбрать всё', 'לבחור הכול', 'Select all'),
  none: l('Снять всё', 'לנקות הכול', 'Clear all'),
  go: l('⬇ Скачать Excel', '⬇ הורדת אקסל', '⬇ Download Excel'),
  pick: l('Выберите хотя бы одну колонку.', 'בחרו לפחות עמודה אחת.', 'Choose at least one column.'),
};

type Col = { id: string; label: L; get: (r: Row) => unknown };
const yes = (b: unknown) => (b ? '✓' : '');
const age = (birth: string | null) => {
  if (!birth) return '';
  const b = new Date(`${birth}T12:00:00Z`);
  const n = new Date();
  let y = n.getFullYear() - b.getUTCFullYear();
  if (n.getMonth() < b.getUTCMonth() || (n.getMonth() === b.getUTCMonth() && n.getDate() < b.getUTCDate())) y--;
  return y;
};
const HOLDER_REL: Record<string, L> = {
  parent: l('Родитель', 'הורה', 'Parent'), guardian: l('Законный представитель', 'אפוטרופוס/ית', 'Legal guardian'),
  self: l('Сам(а)', 'בעצמו/ה', 'Self'), other: l('Другое', 'אחר', 'Other'),
};

const CLIENT_COLS: Col[] = [
  { id: 'name', label: l('Имя (иврит)', 'שם (עברית)', 'Name (Hebrew)'), get: (r) => r.full_name },
  { id: 'name_en', label: l('Имя (англ.)', 'שם (אנגלית)', 'Name (English)'), get: (r) => r.full_name_en },
  { id: 'phone', label: l('Телефон', 'טלפון', 'Phone'), get: (r) => r.phone },
  { id: 'email', label: l('Эл. почта', 'אימייל', 'Email'), get: (r) => r.email },
  { id: 'address', label: l('Адрес', 'כתובת', 'Address'), get: (r) => r.address },
  { id: 'birth', label: l('Дата рождения', 'תאריך לידה', 'Date of birth'), get: (r) => r.birth_date },
  { id: 'relation', label: l('Кто для учеников', 'קשר לתלמידים', 'Relation to students'), get: (r) => (HOLDER_REL[r.relation] ? tr(HOLDER_REL[r.relation]) : '') },
  { id: 'lang', label: l('Язык', 'שפה', 'Language'), get: (r) => r.lang },
  { id: 'kids', label: l('Ученики', 'תלמידים', 'Students'), get: (r) => r._kids },
  { id: 'count', label: l('Кол-во учеников', 'מספר תלמידים', 'Number of students'), get: (r) => r._count },
  { id: 'online', label: l('Вход в приложение', 'כניסה לאפליקציה', 'App login'), get: (r) => yes(r.user_id) },
  { id: 'notes', label: l('Заметки', 'הערות', 'Notes'), get: (r) => r.notes },
  { id: 'archived', label: l('В архиве', 'בארכיון', 'Archived'), get: (r) => yes(r.archived) },
];
const STUDENT_COLS: Col[] = [
  { id: 'name', label: l('Имя (иврит)', 'שם (עברית)', 'Name (Hebrew)'), get: (r) => r.full_name },
  { id: 'name_en', label: l('Имя (англ.)', 'שם (אנגלית)', 'Name (English)'), get: (r) => r.full_name_en },
  { id: 'birth', label: l('Дата рождения', 'תאריך לידה', 'Date of birth'), get: (r) => r.birth_date },
  { id: 'age', label: l('Возраст', 'גיל', 'Age'), get: (r) => age(r.birth_date) },
  { id: 'phone', label: l('Телефон ученика', 'טלפון התלמיד/ה', "Student's phone"), get: (r) => r.phone },
  { id: 'email', label: l('Эл. почта ученика', 'אימייל התלמיד/ה', "Student's email"), get: (r) => r.email },
  { id: 'id_number', label: l('Номер удостоверения', 'מספר זהות', 'ID number'), get: (r) => r.id_number },
  { id: 'address', label: l('Адрес', 'כתובת', 'Address'), get: (r) => r.address },
  { id: 'groups', label: l('Группы', 'קבוצות', 'Groups'), get: (r) => r._groups },
  { id: 'level', label: l('Уровень', 'רמה', 'Level'), get: (r) => r.level },
  { id: 'client', label: l('Клиент', 'לקוח/ה', 'Client'), get: (r) => r._client?.full_name },
  { id: 'client_phone', label: l('Телефон клиента', 'טלפון הלקוח/ה', "Client's phone"), get: (r) => r._client?.phone },
  { id: 'client_email', label: l('Эл. почта клиента', 'אימייל הלקוח/ה', "Client's email"), get: (r) => r._client?.email },
  { id: 'relation', label: l('Кем приходится', 'קרבה', 'Relation'), get: (r) => (r.is_holder ? '—' : tr(STUDENT_REL.find(([v]) => v === r.relation)?.[1] ?? l('', '', ''))) },
  { id: 'docs', label: l('Документы', 'מסמכים', 'Documents'), get: (r) => r._docs },
  { id: 'notes', label: l('Заметки', 'הערות', 'Notes'), get: (r) => r.notes },
  { id: 'archived', label: l('В архиве', 'בארכיון', 'Archived'), get: (r) => yes(r.archived) },
];

const saved = (key: string, fallback: string[]) => {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as string[]; } catch { return fallback; }
};
const save = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };

export function exportCard() {
  let kind: 'clients' | 'students' = (saved('etude-export-kind', ['clients'])[0] as 'clients' | 'students') ?? 'clients';
  const chosen: Record<string, Set<string>> = {
    clients: new Set(saved('etude-export-clients', ['name', 'phone', 'email', 'kids'])),
    students: new Set(saved('etude-export-students', ['name', 'birth', 'age', 'groups', 'client', 'client_phone'])),
  };
  const archived = h('input', { type: 'checkbox' });
  const box = h('div', { className: 'chips' });
  const drawCols = () => {
    const cols = kind === 'clients' ? CLIENT_COLS : STUDENT_COLS;
    box.replaceChildren(...cols.map((c) => {
      const b = h('button', { type: 'button', textContent: tr(c.label), ariaPressed: String(chosen[kind].has(c.id)) });
      b.onclick = () => {
        chosen[kind].has(c.id) ? chosen[kind].delete(c.id) : chosen[kind].add(c.id);
        b.ariaPressed = String(chosen[kind].has(c.id));
        save(`etude-export-${kind}`, [...chosen[kind]]);
      };
      return b;
    }));
  };
  const kindButtons = (['clients', 'students'] as const).map((k) => {
    const b = h('button', { type: 'button', textContent: tr(S[k]), ariaPressed: String(k === kind) });
    b.onclick = () => {
      kind = k;
      save('etude-export-kind', [k]);
      kindButtons.forEach((x, i) => (x.ariaPressed = String(['clients', 'students'][i] === k)));
      drawCols();
    };
    return b;
  });
  const setAll = (on: boolean) => {
    chosen[kind] = new Set(on ? (kind === 'clients' ? CLIENT_COLS : STUDENT_COLS).map((c) => c.id) : []);
    save(`etude-export-${kind}`, [...chosen[kind]]);
    drawCols();
  };

  const download = async () => {
    const cols = (kind === 'clients' ? CLIENT_COLS : STUDENT_COLS).filter((c) => chosen[kind].has(c.id));
    if (!cols.length) return flash(tr(S.pick), true);
    const [clients, students, enrollments, groups, forms] = await Promise.all([
      get<Row[]>(db!.from('clients').select('*').order('full_name')),
      get<Row[]>(db!.from('students').select('*').order('full_name')),
      get<Row[]>(db!.from('enrollments').select('student_id, group_id, per_week')),
      get<Row[]>(db!.from('groups').select('id, name')),
      kind === 'students' && chosen.students.has('docs')
        ? get<Row[]>(db!.from('student_forms').select('student_id, form, submitted_at, needs_update, clarified, answers->>_ask').order('submitted_at', { ascending: false }))
        : Promise.resolve([] as Row[]),
    ]);
    const live = (r: Row) => archived.checked || !r.archived;
    let rows: Row[];
    if (kind === 'clients') {
      rows = clients.filter(live).map((c) => {
        const kids = students.filter((s) => s.client_id === c.id && !s.archived);
        return { ...c, _kids: kids.map((s) => s.full_name).join(', '), _count: kids.length };
      });
    } else {
      rows = students.filter(live).map((s) => {
        const adult = age(s.birth_date) !== '' && Number(age(s.birth_date)) >= 18;
        const needed = adult ? ['f1', 'f2', 'f4', 'f6', 'f7'] : ['f1', 'f2', 'f3', 'f4', 'f6', 'f7'];
        const docs = FORMS.filter((f) => needed.includes(f.code)).map((f) => {
          const r = forms.find((x) => x.student_id === s.id && x.form === f.code); // newest first
          const st = stateOf(f.code, needed, r && { at: r.submitted_at, signed_by: '', needs_update: r.needs_update, ask: r._ask, clarified: r.clarified });
          return `${f.num}: ${tr(W[st])}`;
        });
        return {
          ...s,
          _client: clients.find((c) => c.id === s.client_id),
          _groups: enrollments.filter((e) => e.student_id === s.id).map((e) => `${groups.find((g) => g.id === e.group_id)?.name ?? '?'}${e.per_week > 1 ? ` ×${e.per_week}` : ''}`).join(', '),
          _docs: docs.join('; '),
        };
      });
    }
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([cols.map((c) => tr(c.label)), ...rows.map((r) => cols.map((c) => c.get(r) ?? ''))]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, tr(S[kind]).slice(0, 31));
    XLSX.writeFile(book, `etude-${kind}-${today()}.xlsx`);
  };

  drawCols();
  return h('details', { className: 'card' },
    h('summary', { textContent: tr(S.title) }),
    h('p', { className: 'muted', textContent: tr(S.hint) }),
    h('div', { className: 'chips' }, ...kindButtons),
    box,
    h('div', { className: 'row' },
      h('button', { type: 'button', className: 'link', textContent: tr(S.all), onclick: () => setAll(true) }),
      h('button', { type: 'button', className: 'link', textContent: tr(S.none), onclick: () => setAll(false) }),
      h('label', { className: 'tick' }, archived, tr(S.archived))),
    h('div', {}, h('button', { type: 'button', className: 'primary', textContent: tr(S.go), onclick: download }))
  );
}
