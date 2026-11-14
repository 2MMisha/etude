// /family/ — where a family registers with the school. One login per family:
// create it, give the account holder's details, add the students, and fill in
// each student's forms. Every student also has their own link
// (/family/#/s/<token>) that opens only that student's forms, without a login,
// so it can go to the other parent or to an adult student who confirms their
// own documents. Every call goes through database functions that work out
// whose family it is (supabase/migrations/20261126000000_family_registration.sql).
import { LANGS, getLang, setLang, t as crmT } from './i18n';
import { db, h, flash } from './ui';
import { signInView, newPasswordView } from './auth';
import { FORMS, PRIVACY, W, STUDENT_REL, STATE_WORD, formOf, missing, stopped, flags, visible, stateOf, pick, type Answers, type Ctx, type Form, type L, type Q, type Sent } from './forms';

const l = (ru: string, he: string, en: string): L => ({ ru, he, en });
const T = {
  createTitle: l('Создание личного кабинета', 'יצירת אזור אישי', 'Create your account'),
  createIntro: l('Создайте личный кабинет, чтобы зарегистрировать себя или членов своей семьи в танцевальной школе. В одном аккаунте можно управлять несколькими учениками и их регистрационными документами.', 'צרו אזור אישי כדי לרשום את עצמכם או את בני המשפחה לבית הספר לריקוד. בחשבון אחד אפשר לנהל כמה תלמידים ואת מסמכי הרישום שלהם.', 'Create an account to register yourself or your family with the dance school. One account can hold several students and their registration documents.'),
  repeat: l('Повторите пароль', 'חזרו על הסיסמה', 'Repeat the password'),
  agree: l('Я подтверждаю, что ознакомился(лась) с условиями использования личного кабинета и уведомлением о конфиденциальности', 'אני מאשר/ת שקראתי את תנאי השימוש באזור האישי ואת הודעת הפרטיות', 'I confirm I have read the terms of use of the account and the privacy notice'),
  terms: l('Условия использования личного кабинета', 'תנאי השימוש באזור האישי', 'Terms of use of the account'),
  privacy: l('Уведомление о конфиденциальности', 'הודעת פרטיות', 'Privacy notice'),
  create: l('Создать кабинет', 'יצירת החשבון', 'Create the account'),
  haveAccount: l('Уже есть кабинет? Войти', 'כבר יש חשבון? כניסה', 'Already have an account? Sign in'),
  newAccount: l('Нет кабинета? Создать', 'אין חשבון? יצירת חשבון', 'No account yet? Create one'),
  notSame: l('Пароли не совпадают.', 'הסיסמאות אינן זהות.', 'The passwords do not match.'),
  checkMail: l('Мы отправили письмо на {email}. Подтвердите адрес по ссылке в письме и вернитесь сюда, чтобы войти.', 'שלחנו מייל אל {email}. אשרו את הכתובת דרך הקישור במייל וחזרו לכאן כדי להיכנס.', 'We sent an email to {email}. Confirm the address with the link in it, then come back here to sign in.'),
  holderTitle: l('Ваши контактные данные', 'פרטי הקשר שלך', 'Your contact details'),
  holderIntro: l('Укажите человека, который будет основным контактным лицом семьи и управлять регистрацией учеников.', 'ציינו את האדם שיהיה איש/אשת הקשר הראשי/ת של המשפחה וינהל את רישום התלמידים.', "Give the person who will be the family's main contact and manage the students' registration."),
  first: l('Имя', 'שם פרטי', 'First name'),
  last: l('Фамилия', 'שם משפחה', 'Last name'),
  phone: l('Телефон', 'טלפון', 'Phone'),
  email: l('Электронная почта', 'אימייל', 'Email'),
  birth: l('Дата рождения', 'תאריך לידה', 'Date of birth'),
  address: l('Адрес проживания', 'כתובת מגורים', 'Home address'),
  optional: l('необязательно', 'לא חובה', 'optional'),
  relation: l('Кем вы являетесь для учеников, которых регистрируете?', 'מה הקשר שלך לתלמידים שאת/ה רושם/ת?', 'What are you to the students you are registering?'),
  save: l('Сохранить', 'שמירה', 'Save'),
  continue: l('Продолжить', 'המשך', 'Continue'),
  edit: l('Изменить', 'עריכה', 'Edit'),
  cancel: l('Отмена', 'ביטול', 'Cancel'),
  studentsTitle: l('Кого вы хотите зарегистрировать?', 'את מי תרצו לרשום?', 'Who would you like to register?'),
  studentsIntro: l('Добавьте всех участников семьи, которые будут заниматься в Студии. Вы можете добавить себя, детей и других членов семьи.', 'הוסיפו את כל בני המשפחה שילמדו בסטודיו. אפשר להוסיף את עצמכם, ילדים ובני משפחה נוספים.', 'Add everyone in the family who will dance at the studio: yourself, children and other family members.'),
  addStudent: l('Добавить ученика', 'הוספת תלמיד/ה', 'Add a student'),
  studentName: l('Имя ученика', 'שם התלמיד/ה', "Student's first name"),
  studentLast: l('Фамилия ученика', 'שם המשפחה של התלמיד/ה', "Student's last name"),
  isHolder: l('Является ли этот ученик владельцем аккаунта?', 'האם התלמיד/ה הוא/היא בעל/ת החשבון?', 'Is this student the account holder?'),
  studentRel: l('Кем ученик приходится владельцу аккаунта?', 'מה הקשר של התלמיד/ה לבעל/ת החשבון?', 'What is the student to the account holder?'),
  idNumber: l('Номер удостоверения личности или другой идентификатор', 'מספר תעודת זהות או מזהה אחר', 'ID number or other identifier'),
  studentPhone: l('Телефон ученика', 'טלפון התלמיד/ה', "Student's phone"),
  studentEmail: l('Электронная почта ученика', 'אימייל התלמיד/ה', "Student's email"),
  emailForAdult: l('Нужна совершеннолетнему ученику, который сам подтверждает свои документы', 'נדרש לתלמיד/ה בגיר/ה שמאשר/ת את המסמכים בעצמו/ה', 'Needed for an adult student who confirms their own documents'),
  forms: l('Документы', 'מסמכים', 'Documents'),
  fill: l('Заполнить', 'מילוי', 'Fill in'),
  again: l('Заполнить заново', 'מילוי מחדש', 'Fill in again'),
  link: l('Ссылка для этого ученика', 'קישור לתלמיד/ה הזה/זו', "This student's link"),
  copy: l('Скопировать ссылку', 'העתקת הקישור', 'Copy the link'),
  copied: l('Ссылка скопирована.', 'הקישור הועתק.', 'Link copied.'),
  sendWa: l('Отправить в WhatsApp', 'שליחה בוואטסאפ', 'Send on WhatsApp'),
  waText: l('Регистрация в студии ETUDE для {name}: {url}', 'רישום לסטודיו ETUDE עבור {name}: {url}', 'ETUDE studio registration for {name}: {url}'),
  adultSelf: l('{name} — совершеннолетний ученик и сам заполняет и подтверждает свои документы. Отправьте ему/ей эту ссылку.', '{name} בגיר/ה וממלא/ת ומאשר/ת את המסמכים בעצמו/ה. שלחו לו/ה את הקישור הזה.', '{name} is an adult and fills in and confirms their own documents. Send them this link.'),
  adultHere: l('Эти документы заполняет и подтверждает сам(а) {name}.', 'את המסמכים האלה ממלא/ת ומאשר/ת {name} בעצמו/ה.', '{name} fills in and confirms these documents personally.'),
  todo: l('Что ещё нужно сделать', 'מה עוד נשאר', 'Still to do'),
  continueFill: l('Продолжить заполнение', 'המשך מילוי', 'Continue filling in'),
  send: l('Отправить', 'שליחה', 'Send'),
  sending: l('Отправляем…', 'שולחים…', 'Sending…'),
  fixThese: l('Заполните, пожалуйста:', 'נא למלא:', 'Please fill in:'),
  backToList: l('← К документам', '← למסמכים', '← Back to the documents'),
  backHome: l('← В личный кабинет', '← לאזור האישי', '← Back to the account'),
  notActive: l('Эта ссылка не активна. Обратитесь к администратору Студии.', 'הקישור אינו פעיל. נא לפנות למנהלת הסטודיו.', "This link is not active. Please contact the studio's administrator."),
  notPublished: l('Студия ещё не опубликовала этот текст.', 'הסטודיו עדיין לא פרסם את הטקסט הזה.', 'The studio has not published this text yet.'),
  docProvider: l('Сведения об Исполнителе', 'פרטי נותן השירות', 'Provider details'),
  docOffer: l('Договор публичной оферты', 'חוזה ההצעה לציבור', 'Public offer agreement'),
  docPrices: l('Стоимость занятий', 'מחירי השיעורים', 'Prices'),
  docSchedule: l('Расписание занятий', 'מערכת השעות', 'Timetable'),
  inHe: l('на иврите', 'בעברית', 'in Hebrew'),
  inEn: l('на английском', 'באנגלית', 'in English'),
  choose: l('— выберите —', '— בחירה —', '— choose —'),
  born: l('род.', 'נולד/ה', 'born'),
  waiting: l('Спасибо! Ваша регистрация получена и ожидает подтверждения Студии. После подтверждения здесь можно будет добавить учеников и заполнить документы.', 'תודה! ההרשמה התקבלה וממתינה לאישור הסטודיו. לאחר האישור תוכלו להוסיף כאן תלמידים ולמלא את המסמכים.', 'Thank you! Your registration has been received and is waiting for the studio to approve it. Once approved, you can add students and fill in the documents here.'),
  error: l('Что-то пошло не так. Попробуйте ещё раз.', 'משהו השתבש. נסו שוב.', 'Something went wrong. Please try again.'),
};
const t = (k: keyof typeof T) => pick(T[k], getLang());
const tr = (x: L) => pick(x, getLang());
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

const HOLDER_REL: [string, L][] = [
  ['parent', l('Родитель', 'הורה', 'Parent')], ['guardian', l('Законный представитель', 'אפוטרופוס/ית', 'Legal guardian')],
  ['self', l('Я регистрирую себя', 'אני רושם/ת את עצמי', 'I am registering myself')], ['other', l('Другое', 'אחר', 'Other')],
];
const view = document.getElementById('view')!;
const signOutBtn = document.getElementById('signOut') as HTMLButtonElement;
let signedIn: string | null | undefined;
let recovering = false;
let mode: 'create' | 'signin' = 'create';
let editing = ''; // 'holder', a student's id, or ''

type Part = Node | string | false | null | undefined;
const parts = (...xs: Part[]) => xs.filter((x): x is Node | string => !!x);
const card = (...xs: Part[]) => h('section', { className: 'card' }, ...parts(...xs));
const note = (text: string, cls = 'muted') => h('p', { className: cls, textContent: text });
const req = (label: string, optional = false) => h('span', {}, label, optional && h('small', {}, ` (${t('optional')})`));
const call = async <T>(fn: string, args: Record<string, unknown> = {}): Promise<T> => {
  const { data, error } = await db!.rpc(fn, args);
  if (error) {
    flash(error.message, true);
    throw new Error(error.message);
  }
  return data as T;
};
const linkFor = (token: string) => `${location.origin}/family/#/s/${token}`;
const age18 = (birth: string) => {
  const d = new Date(`${birth}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 18);
  return d <= new Date();
};
const split = (full: string) => {
  const i = (full ?? '').trim().indexOf(' ');
  return i < 0 ? [full ?? '', ''] : [full.slice(0, i), full.slice(i + 1)];
};
const text = (props: Record<string, unknown> = {}) => h('input', { type: 'text', ...props });
const choose = (options: [string, L][], value: string, props: Record<string, unknown> = {}) =>
  h('select', props, h('option', { value: '', textContent: t('choose') }), ...options.map(([v, lab]) => h('option', { value: v, textContent: tr(lab), selected: v === value })));
/** First and last name, in Hebrew and in English. */
function nameFields(firstLabel: string, lastLabel: string, he: string, en: string) {
  const [hf, hl] = split(he);
  const [ef, el] = split(en);
  const f = { hf: text({ value: hf, required: true, lang: 'he', dir: 'rtl' }), hl: text({ value: hl, required: true, lang: 'he', dir: 'rtl' }), ef: text({ value: ef, required: true, lang: 'en', dir: 'ltr' }), el: text({ value: el, required: true, lang: 'en', dir: 'ltr' }) };
  const node = h('div', { className: 'grid' },
    h('label', { className: 'field' }, `${firstLabel} ${t('inHe')}`, f.hf), h('label', { className: 'field' }, `${lastLabel} ${t('inHe')}`, f.hl),
    h('label', { className: 'field' }, `${firstLabel} ${t('inEn')}`, f.ef), h('label', { className: 'field' }, `${lastLabel} ${t('inEn')}`, f.el));
  return { node, he: () => `${f.hf.value.trim()} ${f.hl.value.trim()}`.trim(), en: () => `${f.ef.value.trim()} ${f.el.value.trim()}`.trim() };
}

// --- 1. the account -----------------------------------------------------------
/** A document: an uploaded file opens in a new tab; built-in text unfolds; nothing yet says so. */
function docBox(title: string, body: unknown) {
  if (body && typeof body === 'object' && 'url' in body)
    return h('p', { className: 'doc' }, h('a', { href: String((body as { url: string }).url), target: '_blank', rel: 'noopener', textContent: `📄 ${title}` }));
  const content = Array.isArray(body) ? (body as L[]).map(tr).join('\n\n') : typeof body === 'string' && body.trim() ? body : t('notPublished');
  return h('details', { className: 'doc' }, h('summary', { textContent: title }), h('div', { className: 'doc-text', textContent: content }));
}

async function createView() {
  if (mode === 'signin') {
    const box = signInView();
    return h('div', { className: 'stack' }, box, h('p', { className: 'center' }, h('button', { type: 'button', className: 'link', textContent: t('newAccount'), onclick: () => { mode = 'create'; render(); } })));
  }
  const docs = (await db!.rpc('public_docs')).data ?? {};
  const email = h('input', { type: 'email', required: true, autocomplete: 'username', dir: 'ltr' });
  const pass = h('input', { type: 'password', required: true, minLength: 8, autocomplete: 'new-password' });
  const pass2 = h('input', { type: 'password', required: true, minLength: 8, autocomplete: 'new-password' });
  const agree = h('input', { type: 'checkbox', required: true });
  const msg = h('p', { className: 'msg', role: 'status' });
  const button = h('button', { className: 'primary', type: 'submit', textContent: t('create') });
  const form = h('form', { className: 'card sign wide' },
    h('h1', { textContent: t('createTitle') }), note(t('createIntro')),
    h('label', {}, t('email'), email), h('label', {}, crmT('newPassword'), pass), h('label', {}, t('repeat'), pass2),
    docBox(t('terms'), docs.doc_terms), docBox(t('privacy'), PRIVACY), docs.doc_privacy?.url && docBox(t('privacy'), docs.doc_privacy),
    h('label', { className: 'tick' }, agree, t('agree')),
    button, msg,
    h('button', { type: 'button', className: 'link', textContent: t('haveAccount'), onclick: () => { mode = 'signin'; render(); } })
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    msg.className = 'msg bad';
    if (pass.value !== pass2.value) return void (msg.textContent = t('notSame'));
    button.disabled = true;
    const { data, error } = await db!.auth.signUp({ email: email.value.trim(), password: pass.value, options: { emailRedirectTo: `${location.origin}/family/` } });
    button.disabled = false;
    if (error) return void (msg.textContent = error.message);
    // With email confirmation on, there is no session until the link in the email is opened.
    if (!data.session) {
      msg.className = 'msg';
      msg.textContent = fill(t('checkMail'), { email: email.value.trim() });
      mode = 'signin';
    }
  };
  return form;
}

// --- 2. the account holder --------------------------------------------------------
function holderForm(holder: Answers | null, email: string) {
  const names = nameFields(t('first'), t('last'), holder?.full_name ?? '', holder?.full_name_en ?? '');
  const phone = h('input', { type: 'tel', required: true, value: holder?.phone ?? '', autocomplete: 'tel', dir: 'ltr' });
  const birth = h('input', { type: 'date', value: holder?.birth_date ?? '' });
  const address = text({ value: holder?.address ?? '', autocomplete: 'street-address' });
  const rel = choose(HOLDER_REL, holder?.relation ?? '', { required: true });
  const form = h('form', { className: 'card' },
    h('h1', { textContent: t('holderTitle') }), note(t('holderIntro')),
    names.node,
    h('div', { className: 'grid' },
      h('label', { className: 'field' }, t('phone'), phone),
      h('label', { className: 'field' }, t('email'), h('input', { type: 'email', value: email, disabled: true, dir: 'ltr' })),
      h('label', { className: 'field' }, req(t('birth'), true), birth),
      h('label', { className: 'field' }, req(t('address'), true), address)),
    h('label', { className: 'field' }, t('relation'), rel),
    h('div', { className: 'row' }, h('button', { className: 'primary', type: 'submit', textContent: holder ? t('save') : t('continue') }),
      holder && h('button', { type: 'button', textContent: t('cancel'), onclick: () => { editing = ''; render(); } }))
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    await call('family_save', { h: { full_name: names.he(), full_name_en: names.en(), phone: phone.value, birth_date: birth.value, address: address.value, relation: rel.value } });
    editing = '';
    render();
  };
  return form;
}

// --- 3. the students ------------------------------------------------------------------
function studentForm(s: Answers | null, holder: Answers, done: () => void) {
  const names = nameFields(t('studentName'), t('studentLast'), s?.full_name ?? '', s?.full_name_en ?? '');
  const birth = h('input', { type: 'date', required: true, value: s?.birth_date ?? '' });
  const yes = h('input', { type: 'radio', name: 'holder', value: 'yes', checked: !!s?.is_holder });
  const no = h('input', { type: 'radio', name: 'holder', value: 'no', checked: !!s && !s.is_holder, required: true });
  const rel = choose(STUDENT_REL, s?.relation ?? '');
  const relBox = h('label', { className: 'field' }, t('studentRel'), rel);
  const id = text({ value: s?.id_number ?? '', dir: 'ltr', maxLength: 20 });
  const address = text({ value: s?.address ?? '' });
  const phone = h('input', { type: 'tel', value: s?.phone ?? '', dir: 'ltr' });
  const email = h('input', { type: 'email', value: s?.email ?? '', dir: 'ltr' });
  const emailHint = h('small', { textContent: t('emailForAdult') });
  const sync = () => {
    relBox.hidden = yes.checked;
    rel.required = no.checked;
    const adult = !!birth.value && age18(birth.value);
    email.required = adult && no.checked;
  };
  yes.onchange = () => {
    // The holder as a student: their name and contacts are already known.
    const fresh = nameFields(t('studentName'), t('studentLast'), holder.full_name, holder.full_name_en);
    names.node.replaceWith(fresh.node);
    Object.assign(names, fresh);
    if (!phone.value) phone.value = holder.phone ?? '';
    if (!email.value) email.value = holder.email ?? '';
    if (!birth.value && holder.birth_date) birth.value = holder.birth_date;
    sync();
  };
  no.onchange = birth.onchange = sync;
  sync();
  const form = h('form', { className: 'card' },
    h('h2', { textContent: s ? `${t('edit')}: ${s.full_name}` : t('addStudent') }),
    h('fieldset', { className: 'choice' }, h('legend', { textContent: t('isHolder') }), h('label', { className: 'tick' }, yes, tr(W.yes)), h('label', { className: 'tick' }, no, tr(W.no))),
    names.node,
    h('div', { className: 'grid' },
      h('label', { className: 'field' }, t('birth'), birth),
      relBox,
      h('label', { className: 'field' }, req(t('idNumber'), true), id),
      h('label', { className: 'field' }, req(t('address'), true), address),
      h('label', { className: 'field' }, t('studentPhone'), phone),
      h('label', { className: 'field' }, t('studentEmail'), email, emailHint)),
    h('div', { className: 'row' }, h('button', { className: 'primary', type: 'submit', textContent: t('save') }),
      h('button', { type: 'button', textContent: t('cancel'), onclick: () => { editing = ''; render(); } }))
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    await call('family_save_student', { sid: s?.id ?? null, s: {
      full_name: names.he(), full_name_en: names.en(), birth_date: birth.value, is_holder: yes.checked, relation: rel.value,
      id_number: id.value, address: address.value, phone: phone.value, email: email.value,
    } });
    done();
  };
  return form;
}

/** What is still missing for one student, in words: name, form, what to do. */
function todoFor(s: Answers): string[] {
  return FORMS.flatMap((f) => {
    const state = stateOf(f.code, s.needed, s.forms[f.code]);
    const form = `${tr(W.appendix)}${f.num} — ${tr(f.title)}`;
    const word = state === 'none' ? W.missingForm : state === 'update' ? W.updateForm : state === 'ask' ? W.askForm : null;
    return word ? [fill(tr(word), { name: s.full_name, form })] : [];
  });
}

function formList(s: Answers, token: string) {
  return h('ul', { className: 'docs' }, ...FORMS.map((f) => {
    const sent: Sent | undefined = s.forms[f.code];
    const state = stateOf(f.code, s.needed, sent);
    return h('li', { className: `doc-row is-${state}` },
      h('span', {}, h('strong', { textContent: `${tr(W.appendix)}${f.num}` }), ` ${tr(f.title)}`),
      h('span', { className: `pill ${state}`, textContent: tr(STATE_WORD[state]) }),
      state !== 'notNeeded' && h('a', { className: 'btn', href: `#/s/${token}/${f.code}`, textContent: state === 'none' ? t('fill') : t('again') })
    );
  }));
}

function shareRow(token: string, name: string) {
  const url = linkFor(token);
  return h('div', { className: 'row' },
    h('input', { type: 'text', value: url, readOnly: true, dir: 'ltr', ariaLabel: t('link'), onfocus: (e: Event) => (e.target as HTMLInputElement).select() }),
    h('button', { type: 'button', textContent: t('copy'), onclick: async () => { await navigator.clipboard?.writeText(url); flash(t('copied')); } }),
    h('a', { className: 'btn', target: '_blank', rel: 'noopener', href: `https://wa.me/?text=${encodeURIComponent(fill(t('waText'), { name, url }))}`, textContent: t('sendWa') })
  );
}

async function homeView() {
  const me = await call<Answers | null>('family_me');
  const email = (await db!.auth.getUser()).data.user?.email ?? '';
  if (!me || editing === 'holder') return holderForm(me?.holder ?? null, email);
  const { holder, students } = me as { holder: Answers; students: Answers[] };
  // A new family waits until the studio lets it in.
  if (!me.approved) return h('div', { className: 'stack' },
    card(
      h('div', { className: 'row spread' }, h('h1', { textContent: holder.full_name }), h('button', { type: 'button', textContent: t('edit'), onclick: () => { editing = 'holder'; render(); } })),
      note(parts(holder.full_name_en, holder.phone, holder.email).join(' · ')),
      note(t('waiting'), 'warn')
    ));
  if (editing === 'new' || !students.length) return h('div', { className: 'stack' },
    card(h('h1', { textContent: t('studentsTitle') }), note(t('studentsIntro'))),
    studentForm(null, holder, () => { editing = ''; render(); }));

  const todo = students.flatMap(todoFor);
  const relWord = (code: string) => tr(HOLDER_REL.find(([v]) => v === code)?.[1] ?? l('', '', ''));
  return h('div', { className: 'stack' },
    card(
      h('div', { className: 'row spread' }, h('h1', { textContent: holder.full_name }), h('button', { type: 'button', textContent: t('edit'), onclick: () => { editing = 'holder'; render(); } })),
      note(parts(holder.full_name_en, holder.phone, holder.email, relWord(holder.relation)).join(' · '))
    ),
    card(h('h2', { textContent: todo.length ? t('todo') : tr(W.allDone) }), todo.length > 0 && h('ul', { className: 'todo' }, ...todo.map((x) => h('li', { textContent: x })))),
    ...students.map((s) => editing === s.id ? studentForm(s, holder, () => { editing = ''; render(); }) : card(
      h('div', { className: 'row spread' },
        h('h2', {}, s.full_name, h('small', { textContent: ` ${s.full_name_en} · ${t('born')} ${s.birth_date}` })),
        h('button', { type: 'button', textContent: t('edit'), onclick: () => { editing = s.id; render(); } })),
      s.needed.length === 5 && !s.is_holder && note(fill(t('adultSelf'), { name: s.full_name }), 'warn'),
      formList(s, s.token),
      h('h3', { textContent: t('link') }),
      shareRow(s.token, s.full_name)
    )),
    h('p', {}, h('button', { type: 'button', className: 'primary', textContent: `+ ${t('addStudent')}`, onclick: () => { editing = 'new'; render(); } }))
  );
}

// --- 4. one student's forms (by link) ----------------------------------------------------
const stash: Record<string, Answers> = {}; // answers being typed, per student and form, kept across redraws

function control(q: Q, a: Answers, c: Ctx, redraw: () => void): Node {
  const v = a[q.id];
  const set = (x: unknown) => (a[q.id] = x);
  const options = (): [string, string][] => [...(q.dyn?.(c) ?? []).map((x): [string, string] => [x, x]), ...(q.opts ?? []).map(([id, lab]): [string, string] => [id, tr(lab)])];
  switch (q.type) {
    case 'long': {
      const el = h('textarea', { rows: 3, value: v ?? '', maxLength: 2000 });
      el.oninput = () => set(el.value);
      return el;
    }
    case 'name2': {
      const he = text({ value: v?.he ?? '', lang: 'he', dir: 'rtl', ariaLabel: t('inHe') });
      const en = text({ value: v?.en ?? '', lang: 'en', dir: 'ltr', ariaLabel: t('inEn') });
      he.oninput = en.oninput = () => set({ he: he.value, en: en.value });
      return h('div', { className: 'grid' }, h('label', { className: 'field' }, t('inHe'), he), h('label', { className: 'field' }, t('inEn'), en));
    }
    case 'select': {
      const el = h('select', {}, h('option', { value: '', textContent: t('choose') }), ...options().map(([id, lab]) => h('option', { value: id, textContent: lab, selected: id === v })));
      el.onchange = () => { set(el.value); redraw(); };
      return el;
    }
    case 'one': case 'yesno': {
      const allowed = q.only?.(c);
      const opts = q.type === 'yesno' ? [['yes', tr(W.yes)], ['no', tr(W.no)]] : options().filter(([id]) => !allowed || allowed.includes(id));
      return h('div', { className: 'choices' }, ...opts.map(([id, lab]) => {
        const r = h('input', { type: 'radio', name: q.id, value: id, checked: v === id });
        r.onchange = () => { set(id); redraw(); };
        return h('label', { className: 'tick' }, r, lab);
      }));
    }
    case 'many': case 'all': {
      const list: string[] = Array.isArray(v) ? v : [];
      return h('div', { className: 'choices' }, ...options().map(([id, lab]) => {
        const box = h('input', { type: 'checkbox', checked: list.includes(id) });
        box.onchange = () => { set(box.checked ? [...list.filter((x) => x !== id), id] : list.filter((x) => x !== id)); redraw(); };
        return h('label', { className: 'tick' }, box, lab);
      }));
    }
    case 'tick': {
      const box = h('input', { type: 'checkbox', checked: v === true });
      box.onchange = () => set(box.checked);
      return h('label', { className: 'tick' }, box, tr(q.label));
    }
    default: {
      const el = h('input', { type: q.type, value: v ?? '', maxLength: 200, dir: q.type === 'text' ? 'auto' : 'ltr' });
      el.oninput = () => set(el.value);
      return el;
    }
  }
}

function formView(token: string, page: Answers, f: Form) {
  const c: Ctx = { adult: page.adult, student: page, holder: page.holder, groups: page.groups ?? [], docs: page.docs ?? {} };
  const key = `${token}/${f.code}`;
  if (!stash[key]) {
    // Start from what is already known: names, dates, contacts.
    const a: Answers = {};
    for (const s of f.sections) for (const q of s.qs) {
      const v = q.prefill?.(c);
      if (v && (typeof v !== 'object' || v.he || v.en)) a[q.id] = v;
    }
    stash[key] = a;
  }
  const a = stash[key];
  const box = h('div', { className: 'stack' });
  let tried = false;
  const draw = () => {
    const holes = new Set(tried ? missing(f, a, c).map((q) => q.id) : []);
    const stop = stopped(f, a, c);
    const button = h('button', { className: 'primary', type: 'submit', textContent: t('send'), disabled: !!stop });
    const form = h('form', { className: 'stack', noValidate: true },
      ...visible(f, a, c).map(({ s, qs }) => card(
        s.title && h('h2', { textContent: tr(s.title) }),
        ...(s.text ?? []).map((p) => note(tr(p), 'doc-p')),
        ...(s.docs ?? []).filter((d) => d !== 'doc_privacy' || (c.docs[d] as { url?: string })?.url).map((d) => d === 'schedule'
          ? h('p', {}, h('a', { href: `/${getLang()}/schedule/`, target: '_blank', rel: 'noopener', textContent: t('docSchedule') }))
          : docBox(t(({ doc_provider: 'docProvider', doc_offer: 'docOffer', doc_prices: 'docPrices', doc_terms: 'terms', doc_privacy: 'privacy' } as const)[d as 'doc_offer']), c.docs[d])),
        ...qs.map((q) => h('div', { className: `q${holes.has(q.id) ? ' need' : ''}` },
          q.type !== 'tick' && h('p', { className: 'q-label' }, tr(q.label), !q.req && h('small', { textContent: ` (${t('optional')})` })),
          control(q, a, c, draw),
          q.hint && h('small', { className: 'q-hint', textContent: tr(q.hint) }),
          q.stop && a[q.id] === q.stop[0] && note(tr(q.stop[1]), 'warn'),
          q.flag && a[q.id] === q.flag[0] && note(tr(q.flag[1]), 'warn')
        ))
      )),
      tried && holes.size > 0 && card(note(t('fixThese'), 'warn'), h('ul', {}, ...missing(f, a, c).map((q) => h('li', { textContent: tr(q.label) })))),
      h('div', { className: 'row' }, button, h('a', { className: 'btn', href: `#/s/${token}`, textContent: t('backToList') }))
    );
    form.onsubmit = async (e) => {
      e.preventDefault();
      tried = true;
      if (missing(f, a, c).length || stopped(f, a, c)) return draw();
      button.disabled = true;
      button.textContent = t('sending');
      // Only what was on screen goes: answers to questions that a later choice hid are dropped.
      const sent: Answers = {};
      for (const { qs } of visible(f, a, c)) for (const q of qs) if (a[q.id] !== undefined) sent[q.id] = a[q.id];
      sent._signed_by = sent[f.signer];
      if (flags(f, a, c).length) sent._ask = '1';
      const { error } = await db!.rpc('submit_student_form', { tok: token, f: f.code, answers: sent, lang: getLang() });
      if (error) {
        flash(error.message || t('error'), true);
        return draw();
      }
      delete stash[key];
      box.replaceChildren(card(
        h('h2', { textContent: tr(f.title) }),
        note(tr(f.done), 'ok'),
        ...flags(f, a, c).map((x) => note(tr(x), 'warn')),
        h('a', { className: 'btn primary', href: `#/s/${token}`, textContent: t('backToList') })
      ));
      scrollTo(0, 0);
    };
    box.replaceChildren(
      card(h('p', { className: 'muted', textContent: `${page.full_name} · ${tr(W.appendix)}${f.num}` }), h('h1', { textContent: tr(f.title) }), f.intro && note(tr(f.intro)),
        page.adult && note(fill(t('adultHere'), { name: page.full_name }), 'warn')),
      form
    );
  };
  draw();
  return box;
}

async function studentView(token: string, code?: string) {
  const { data: page } = /^[0-9a-f-]{36}$/i.test(token) ? await db!.rpc('student_by_token', { tok: token }) : { data: null };
  if (!page) return card(note(t('notActive'), 'warn'));
  if (code && page.needed.includes(code)) return formView(token, page, formOf(code));
  const todo = todoFor({ ...page, full_name: page.full_name });
  return h('div', { className: 'stack' },
    signedIn && h('a', { href: '#/', textContent: t('backHome') }),
    card(
      h('h1', {}, page.full_name, h('small', { textContent: ` ${page.full_name_en} · ${t('born')} ${page.birth_date}` })),
      page.adult && note(fill(t('adultHere'), { name: page.full_name }), 'warn'),
      formList(page, token)
    ),
    card(h('h2', { textContent: todo.length ? t('todo') : tr(W.allDone) }), todo.length > 0 && h('ul', { className: 'todo' }, ...todo.map((x) => h('li', { textContent: x }))))
  );
}

// --- the page -------------------------------------------------------------------------
async function render() {
  document.getElementById('langs')!.replaceChildren(...LANGS.map((x) => h('button', { type: 'button', textContent: x.toUpperCase(), ariaPressed: String(x === getLang()), onclick: () => { setLang(x); render(); } })));
  signOutBtn.hidden = !signedIn;
  signOutBtn.textContent = crmT('signOut');
  const [, route, token, code] = location.hash.split('/');
  try {
    if (route === 's' && token) return view.replaceChildren(await studentView(token, code));
    if (recovering) return view.replaceChildren(newPasswordView(() => { recovering = false; render(); }));
    if (!signedIn) return view.replaceChildren(await createView());
    view.replaceChildren(await homeView());
  } catch (e) {
    view.replaceChildren(card(note(e instanceof Error ? e.message : t('error'), 'warn')));
  }
}

setLang(getLang());
signOutBtn.onclick = () => db?.auth.signOut();
addEventListener('hashchange', () => { editing = ''; render().then(() => scrollTo(0, 0)); });
db!.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') recovering = true;
  const who = session?.user.id ?? null;
  if (who === signedIn && event !== 'PASSWORD_RECOVERY') return;
  signedIn = who;
  setTimeout(render);
});
