// The registration forms (appendices 1, 2, 3, 4, 6, 7), as the owner wrote
// them in Russian (2026-11-14), with Hebrew and English translations. The
// translations are drafts for a lawyer to check; the meaning follows the
// Russian. One description serves both sides: the family page draws and checks
// a form from it, the client page in the CRM shows the answers and what is
// missing from it. A person's name is asked in Hebrew and in English.
export type Lang = 'he' | 'ru' | 'en';
export type L = Record<Lang, string>;
export type Answers = Record<string, any>;
const l = (ru: string, he: string, en: string): L => ({ ru, he, en });
export const pick = (x: L, lang: Lang) => x[lang] || x.ru;

/** What a form knows before anyone types: the student, the account holder, the school's lists and texts. */
export interface Ctx {
  adult: boolean;
  student: Answers;
  holder: Answers;
  groups: string[];
  docs: Record<string, unknown>;
}
type When = (a: Answers, c: Ctx) => boolean;
export interface Q {
  id: string;
  /** name2 = full name in Hebrew and in English; all = every box must be ticked; tick = one box that must be ticked. */
  type: 'text' | 'long' | 'date' | 'tel' | 'email' | 'one' | 'select' | 'many' | 'all' | 'tick' | 'yesno' | 'name2';
  label: L;
  opts?: [string, L][];
  /** Options built from the school's data (groups, school years), labels as they are. */
  dyn?: (c: Ctx) => string[];
  req?: boolean | When;
  show?: When;
  hint?: L;
  prefill?: (c: Ctx) => any;
  /** Which options this student may choose (who fills the form: a parent for a minor, the student for an adult). */
  only?: (c: Ctx) => string[];
  /** An answer that stops the form from being sent, with what to show instead. */
  stop?: [string, L];
  /** An answer that is sent but means the studio must get in touch. */
  flag?: [string, L];
}
export interface Section { title?: L; show?: When; text?: L[]; docs?: string[]; qs: Q[] }
export interface Form { code: string; num: string; title: L; intro?: L; sections: Section[]; done: L; signer: string }

// --- shared pieces -------------------------------------------------------
const YES = l('Да', 'כן', 'Yes');
const NO = l('Нет', 'לא', 'No');
const PARENT = l('Родитель или законный представитель несовершеннолетнего ученика', 'הורה או אפוטרופוס/ית של תלמיד/ה קטין/ה', 'Parent or legal guardian of a minor student');
const ADULT = l('Совершеннолетний ученик', 'תלמיד/ה בגיר/ה', 'Adult student');
const who = (label = l('Кто заполняет форму?', 'מי ממלא/ת את הטופס?', 'Who is filling in this form?')): Q => ({
  id: 'who', type: 'one', label, req: true, opts: [['parent', PARENT], ['adult', ADULT]],
  only: (c) => [c.adult ? 'adult' : 'parent'], prefill: (c) => (c.adult ? 'adult' : 'parent'),
});
const studentName = (label = l('Полное имя ученика', 'שם מלא של התלמיד/ה', "Student's full name")): Q => ({
  id: 's_name', type: 'name2', label, req: true, prefill: (c) => ({ he: c.student.full_name, en: c.student.full_name_en }),
});
const holderName = (label: L): Q & { id: string } => ({
  id: 'p_name', type: 'name2', label, req: true, prefill: (c) => ({ he: c.holder.full_name, en: c.holder.full_name_en }),
});
const birth = (id = 's_birth', label = l('Дата рождения ученика', 'תאריך לידה של התלמיד/ה', "Student's date of birth")): Q => ({
  id, type: 'date', label, req: true, prefill: (c) => c.student.birth_date,
});
const signer = (label = l('Полное имя подтверждающего лица', 'שם מלא של המאשר/ת', 'Full name of the person confirming')): Q => ({ id: 'signer', type: 'text', label, req: true });
const contactHint = l('Полное имя, связь с учеником и телефон', 'שם מלא, קרבה לתלמיד/ה וטלפון', 'Full name, relation to the student and phone');
const contactChild = l('Полное имя, связь с ребёнком и телефон', 'שם מלא, קרבה לילד/ה וטלפון', 'Full name, relation to the child and phone');
const is = (id: string, ...v: string[]): When => (a) => v.includes(a[id]);
const opts = (...pairs: [string, L][]) => pairs;

// --- Appendix 1 -----------------------------------------------------------
const f1: Form = {
  code: 'f1', num: '1', signer: 'signer',
  title: l('Регистрация ученика и принятие договора публичной оферты', 'רישום תלמיד/ה וקבלת חוזה ההצעה לציבור', 'Student registration and acceptance of the public offer agreement'),
  intro: l('Перед заполнением прочитайте действующую оферту, сведения об Исполнителе, расписание и стоимость занятий.', 'לפני המילוי יש לקרוא את ההצעה לציבור בתוקף, את פרטי נותן השירות, את מערכת השעות ואת המחירים.', 'Before filling in, read the current offer, the provider details, the timetable and the prices.'),
  sections: [
    { docs: ['doc_offer', 'doc_provider', 'doc_prices', 'schedule'], qs: [] },
    { title: l('Кто заполняет форму', 'מי ממלא/ת את הטופס', 'Who is filling in the form'), qs: [who()] },
    {
      title: l('Данные несовершеннолетнего ученика и представителя', 'פרטי התלמיד/ה הקטין/ה והנציג/ה', 'The minor student and the representative'),
      show: is('who', 'parent'),
      qs: [
        studentName(),
        birth(),
        { id: 's_id', type: 'text', label: l('Номер удостоверения личности ученика или иной идентификатор', 'מספר תעודת זהות של התלמיד/ה או מזהה אחר', "Student's ID number or other identifier"), hint: l('Только если требуется для страхования или учёта', 'רק אם נדרש לביטוח או לרישום', 'Only if needed for insurance or records'), prefill: (c) => c.student.id_number },
        { id: 's_address', type: 'text', label: l('Адрес проживания ученика', 'כתובת המגורים של התלמיד/ה', "Student's home address"), hint: l('Только если действительно необходим', 'רק אם באמת נחוץ', 'Only if really needed'), prefill: (c) => c.student.address || c.holder.address },
        holderName(l('Полное имя родителя или законного представителя', 'שם מלא של ההורה או האפוטרופוס/ית', 'Full name of the parent or legal guardian')),
        { id: 'p_status', type: 'select', label: l('Статус по отношению к ученику', 'הקשר לתלמיד/ה', 'Relation to the student'), req: true, opts: opts(['mother', l('Мать', 'אם', 'Mother')], ['father', l('Отец', 'אב', 'Father')], ['guardian', l('Опекун', 'אפוטרופוס/ית', 'Guardian')], ['custodian', l('Попечитель', 'משמורן/ית', 'Custodian')], ['other', l('Иной законный представитель', 'נציג/ה חוקי/ת אחר/ת', 'Other legal representative')]) },
        { id: 'p_id', type: 'text', label: l('Номер удостоверения личности представителя', 'מספר תעודת זהות של הנציג/ה', "Representative's ID number"), hint: l('Только при подтверждённой необходимости', 'רק כשיש בכך צורך מוכח', 'Only when there is a confirmed need') },
        { id: 'p_phone', type: 'tel', label: l('Телефон представителя', 'טלפון הנציג/ה', "Representative's phone"), req: true, prefill: (c) => c.holder.phone },
        { id: 'p_email', type: 'email', label: l('Электронная почта представителя', 'אימייל הנציג/ה', "Representative's email"), req: true, prefill: (c) => c.holder.email },
        { id: 'p_right', type: 'one', label: l('Имеете ли вы право принимать условия оферты от имени ученика?', 'האם את/ה מוסמך/ת לקבל את תנאי ההצעה בשם התלמיד/ה?', 'Are you entitled to accept the offer on behalf of the student?'), req: true, opts: opts(['yes', YES], ['no', NO]),
          stop: ['no', l('Регистрация этого ученика не может быть завершена. Пожалуйста, свяжитесь с администратором Студии.', 'לא ניתן להשלים את הרישום של תלמיד/ה זה/זו. נא לפנות למנהלת הסטודיו.', "This student's registration cannot be completed. Please contact the studio's administrator.")] },
      ],
    },
    {
      title: l('Данные совершеннолетнего ученика', 'פרטי התלמיד/ה הבגיר/ה', 'The adult student'),
      show: is('who', 'adult'),
      qs: [
        studentName(),
        birth('a_birth', l('Дата рождения', 'תאריך לידה', 'Date of birth')),
        { id: 'a_id', type: 'text', label: l('Номер удостоверения личности или иной идентификатор', 'מספר תעודת זהות או מזהה אחר', 'ID number or other identifier'), hint: l('Только если требуется', 'רק אם נדרש', 'Only if needed'), prefill: (c) => c.student.id_number },
        { id: 'a_address', type: 'text', label: l('Адрес проживания', 'כתובת מגורים', 'Home address'), prefill: (c) => c.student.address },
        { id: 'a_phone', type: 'tel', label: l('Телефон', 'טלפון', 'Phone'), req: true, prefill: (c) => c.student.phone || (c.student.is_holder ? c.holder.phone : '') },
        { id: 'a_email', type: 'email', label: l('Электронная почта', 'אימייל', 'Email'), req: true, prefill: (c) => c.student.email || (c.student.is_holder ? c.holder.email : '') },
      ],
    },
    {
      title: l('Экстренный контакт', 'איש/אשת קשר לחירום', 'Emergency contact'),
      qs: [
        { id: 'e_name', type: 'text', label: l('Полное имя контактного лица на случай экстренной ситуации', 'שם מלא של איש/אשת הקשר לחירום', 'Full name of the emergency contact'), req: true },
        { id: 'e_rel', type: 'text', label: l('Связь с учеником', 'קרבה לתלמיד/ה', 'Relation to the student'), req: true },
        { id: 'e_phone', type: 'tel', label: l('Телефон экстренного контактного лица', 'טלפון איש/אשת הקשר לחירום', "Emergency contact's phone"), req: true },
        { id: 'e_more', type: 'long', label: l('Дополнительный экстренный контакт', 'איש/אשת קשר נוסף/ת לחירום', 'Another emergency contact'), hint: contactHint },
      ],
    },
    {
      title: l('Регистрация и оплата', 'רישום ותשלום', 'Registration and payment'),
      qs: [
        { id: 'reg', type: 'one', label: l('Статус регистрации', 'סוג הרישום', 'Registration type'), req: true, opts: opts(['new', l('Новая регистрация', 'רישום חדש', 'New registration')], ['renew', l('Продление на новый учебный год', 'חידוש לשנת לימודים חדשה', 'Renewal for a new school year')]) },
        { id: 'year', type: 'select', label: l('Учебный год', 'שנת לימודים', 'School year'), req: true, dyn: () => schoolYears() },
        { id: 'group', type: 'select', label: l('Желаемая программа или группа', 'התוכנית או הקבוצה המבוקשת', 'Programme or group wanted'), req: true, dyn: (c) => c.groups,
          opts: opts(['unknown', l('Не знаю — прошу подобрать группу', 'לא יודע/ת — אבקש שיתאימו לי קבוצה', "I don't know — please find a group for me")]),
          hint: l('Окончательное распределение и перевод определяются совместным решением руководителя Студии и тренера группы.', 'השיבוץ הסופי והמעבר בין קבוצות נקבעים בהחלטה משותפת של מנהל/ת הסטודיו ומאמן/ת הקבוצה.', "The final placement and any move between groups are decided together by the studio's head and the group's trainer.") },
        { id: 'pay', type: 'one', label: l('Предпочтительный способ помесячной оплаты годового абонемента', 'אופן התשלום החודשי המועדף למנוי השנתי', 'Preferred way to pay the yearly membership month by month'), req: true, opts: opts(
          ['cheques', l('Двенадцать чеков при регистрации', 'שנים-עשר צ׳קים בעת הרישום', 'Twelve cheques at registration')],
          ['cash', l('Наличными ежемесячно до 2-го числа', 'במזומן מדי חודש עד ה-2 בחודש', 'Cash every month by the 2nd')],
          ['prepay', l('Предоплата наличными за 6–12 месяцев, если применяется скидка', 'תשלום מראש במזומן ל-6–12 חודשים, כשיש הנחה', 'Cash in advance for 6–12 months, when a discount applies')],
          ['other', l('Иной способ, официально предложенный Студией', 'אמצעי אחר שהסטודיו הציע באופן רשמי', 'Another way officially offered by the studio')]) },
        { id: 'terms', type: 'all', label: l('Подтверждение актуальных условий', 'אישור התנאים העדכניים', 'Current terms'), req: true, opts: opts(
          ['seen', l('Мне доступны актуальные расписание, стоимость, порядок оплаты и отмены', 'מערכת השעות, המחירים, אופן התשלום ומדיניות הביטול העדכניים זמינים לי', 'The current timetable, prices, payment and cancellation terms are available to me')],
          ['extra', l('Я понимаю, что соревнования, фестивали, концерты, поездки, учебно-тренировочные сборы, костюмы, реквизит, членские и регистрационные взносы могут оплачиваться отдельно', 'ידוע לי שתחרויות, פסטיבלים, הופעות, נסיעות, מחנות אימון, תלבושות, אביזרים, דמי חבר ודמי רישום עשויים להיות בתשלום נפרד', 'I understand that competitions, festivals, concerts, trips, training camps, costumes, props, membership and registration fees may be paid separately')]) },
      ],
    },
    {
      title: l('Принятие оферты', 'קבלת ההצעה', 'Accepting the offer'),
      qs: [
        { id: 'accept', type: 'all', label: l('Обязательные подтверждения', 'אישורים נדרשים', 'Required confirmations'), req: true, opts: opts(
          ['read', l('Я получил(а), прочитал(а) и полностью принимаю действующую редакцию договора публичной оферты', 'קיבלתי, קראתי ואני מקבל/ת במלואו את הנוסח התקף של חוזה ההצעה לציבור', 'I have received, read and fully accept the current version of the public offer agreement')],
          ['accept', l('Я понимаю, что отправка этой формы с обязательными подтверждениями является полным и безоговорочным акцептом оферты', 'ידוע לי ששליחת טופס זה עם האישורים הנדרשים היא קבלה מלאה ובלתי מסויגת של ההצעה', 'I understand that sending this form with the required confirmations is full and unconditional acceptance of the offer')],
          ['year', l('Я понимаю, что договор заключается на один год и продлевается на новый год только после новой регистрационной формы и оплаты первого месяца нового учебного года', 'ידוע לי שהחוזה נעשה לשנה אחת ומתחדש לשנה נוספת רק לאחר טופס רישום חדש ותשלום החודש הראשון של שנת הלימודים החדשה', 'I understand that the agreement is for one year and is renewed for a new year only after a new registration form and payment of the first month of the new school year')],
          ['update', l('Я обязуюсь своевременно сообщать об изменении контактных и медицинских данных', 'אני מתחייב/ת לעדכן בזמן על שינוי בפרטי הקשר ובמידע הרפואי', 'I will report changes to contact and medical details in good time')],
          ['events', l('Я понимаю, что отдельные платные мероприятия, поездки и учебно-тренировочные сборы требуют отдельного информирования и согласия', 'ידוע לי שאירועים, נסיעות ומחנות אימון בתשלום נפרד דורשים הודעה והסכמה נפרדות', 'I understand that separately paid events, trips and training camps need separate notice and consent')]) },
        signer(l('Полное имя лица, принимающего условия', 'שם מלא של המקבל/ת את התנאים', 'Full name of the person accepting the terms')),
        { id: 'confirm', type: 'one', label: l('Подтверждение отправки', 'אישור השליחה', 'Confirm sending'), req: true, opts: opts(['yes', l('Подтверждаю правильность данных и принимаю условия', 'אני מאשר/ת שהפרטים נכונים ומקבל/ת את התנאים', 'I confirm the details are correct and accept the terms')], ['no', l('Не подтверждаю', 'אינני מאשר/ת', 'I do not confirm')]),
          stop: ['no', l('Регистрация не завершена. Пожалуйста, свяжитесь с администратором Студии.', 'הרישום לא הושלם. נא לפנות למנהלת הסטודיו.', "The registration is not complete. Please contact the studio's administrator.")] },
      ],
    },
  ],
  done: l('Форма отправлена. Регистрация считается завершённой после получения Студией предусмотренной оплаты. Сохраните копию ответов и актуальную редакцию оферты.', 'הטופס נשלח. הרישום נחשב להושלם לאחר שהסטודיו קיבל את התשלום הנדרש. שמרו עותק של התשובות ושל נוסח ההצעה התקף.', 'The form has been sent. The registration is complete once the studio receives the payment due. Keep a copy of your answers and of the current offer.'),
};

// --- Appendix 2 -----------------------------------------------------------
const limited = is('limits', 'yes');
const f2: Form = {
  code: 'f2', num: '2', signer: 'signer',
  title: l('Декларация здоровья и разрешение на экстренную помощь', 'הצהרת בריאות והרשאה לטיפול חירום', 'Health declaration and permission for emergency care'),
  intro: l('Укажите только сведения, необходимые для безопасности занятий, выступлений, поездок и учебно-тренировочных сборов.', 'יש לציין רק מידע הנחוץ לבטיחות בשיעורים, בהופעות, בנסיעות ובמחנות אימון.', 'Give only what is needed for safety in classes, performances, trips and training camps.'),
  sections: [
    {
      title: l('Ученик и заполняющее лицо', 'התלמיד/ה והממלא/ת', 'Student and the person filling in'),
      qs: [who(), studentName(), birth(), { id: 'f_phone', type: 'tel', label: l('Телефон лица, заполняющего форму', 'טלפון הממלא/ת את הטופס', 'Phone of the person filling in'), req: true, prefill: (c) => (c.adult ? c.student.phone : c.holder.phone) }],
    },
    {
      title: l('Состояние здоровья', 'מצב בריאותי', 'Health'),
      qs: [
        { id: 'limits', type: 'one', label: l('Есть ли известные ограничения для участия в танцевальных занятиях, репетициях, выступлениях, соревнованиях, поездках или учебно-тренировочных сборах?', 'האם ידועות מגבלות להשתתפות בשיעורי ריקוד, חזרות, הופעות, תחרויות, נסיעות או מחנות אימון?', 'Are there any known limits to taking part in dance classes, rehearsals, performances, competitions, trips or training camps?'), req: true,
          opts: opts(['no', l('Нет известных ограничений', 'אין מגבלות ידועות', 'No known limits')], ['yes', l('Да, имеются особенности или ограничения', 'כן, יש מגבלות או צרכים מיוחדים', 'Yes, there are conditions or limits')]) },
        { id: 'allergy', type: 'long', show: limited, req: limited, label: l('Аллергии и известные реакции', 'אלרגיות ותגובות ידועות', 'Allergies and known reactions'), hint: l('Укажите аллерген, признаки реакции и необходимые действия', 'ציינו את האלרגן, סימני התגובה ומה יש לעשות', 'Say what causes it, the signs and what to do') },
        { id: 'conditions', type: 'long', show: limited, req: limited, label: l('Астма, эпилепсия, диабет или другие состояния', 'אסתמה, אפילפסיה, סוכרת או מצבים אחרים', 'Asthma, epilepsy, diabetes or other conditions') },
        { id: 'injuries', type: 'long', show: limited, req: limited, label: l('Недавние травмы, боль или ограничения движений', 'פציעות אחרונות, כאב או הגבלה בתנועה', 'Recent injuries, pain or limited movement') },
        { id: 'meds', type: 'long', show: limited, label: l('Лекарства или медицинские средства, важные для экстренной помощи', 'תרופות או אמצעים רפואיים החשובים לטיפול חירום', 'Medicines or medical aids that matter in an emergency'), hint: l('Укажите только необходимую информацию и порядок действий', 'ציינו רק את המידע הנחוץ ואת אופן הפעולה', 'Give only what is needed and what to do') },
        { id: 'doctor_recs', type: 'long', show: limited, label: l('Рекомендации врача или функциональные ограничения', 'המלצות רופא/ה או מגבלות תפקודיות', "Doctor's advice or functional limits") },
        { id: 'kupah', type: 'select', show: limited, label: l('Купат холим', 'קופת חולים', 'Health fund (kupat holim)'), opts: opts(['clalit', l('Клалит', 'כללית', 'Clalit')], ['maccabi', l('Маккаби', 'מכבי', 'Maccabi')], ['meuhedet', l('Меухедет', 'מאוחדת', 'Meuhedet')], ['leumit', l('Леумит', 'לאומית', 'Leumit')], ['other', l('Другое', 'אחר', 'Other')], ['none', l('Предпочитаю не указывать', 'מעדיף/ה לא לציין', 'Prefer not to say')]) },
        { id: 'doctor', type: 'text', show: limited, label: l('Лечащий врач и телефон', 'רופא/ה מטפל/ת וטלפון', "Doctor's name and phone") },
      ],
    },
    {
      title: l('Экстренные контакты', 'אנשי קשר לחירום', 'Emergency contacts'),
      qs: [
        { id: 'ec1', type: 'long', label: l('Экстренный контакт 1', 'איש/אשת קשר לחירום 1', 'Emergency contact 1'), req: true, hint: contactHint },
        { id: 'ec2', type: 'long', label: l('Экстренный контакт 2', 'איש/אשת קשר לחירום 2', 'Emergency contact 2'), hint: contactHint },
      ],
    },
    {
      title: l('Разрешение и подтверждения', 'הרשאה ואישורים', 'Permission and confirmations'),
      qs: [
        { id: 'emergency', type: 'one', label: l('Разрешение на экстренные действия', 'הרשאה לפעולה בחירום', 'Permission to act in an emergency'), req: true, opts: opts(
          ['allow', l('Если со мной невозможно своевременно связаться, разрешаю сотрудникам вызвать экстренную службу и передать медицинским работникам минимально необходимую информацию', 'אם לא ניתן להשיג אותי בזמן, אני מרשה לצוות להזעיק שירותי חירום ולמסור לצוות הרפואי את המידע ההכרחי בלבד', 'If I cannot be reached in time, I allow the staff to call the emergency services and give the medical staff the minimum information needed')],
          ['deny', l('Не даю такого разрешения', 'אינני נותן/ת הרשאה זו', 'I do not give this permission')]),
          flag: ['deny', l('Свяжитесь с администратором Студии до допуска к занятиям.', 'נא לפנות למנהלת הסטודיו לפני ההשתתפות בשיעורים.', "Please contact the studio's administrator before taking part in classes.")] },
        { id: 'confirms', type: 'all', label: l('Подтверждения', 'אישורים', 'Confirmations'), req: true, opts: opts(
          ['true', l('Сведения указаны полно и достоверно по состоянию на дату отправки', 'המידע מלא ונכון למועד השליחה', 'The information is complete and true on the day it is sent')],
          ['update', l('Я обязуюсь незамедлительно сообщать об изменениях', 'אני מתחייב/ת לעדכן מיד על כל שינוי', 'I will report any change at once')],
          ['medical', l('Я понимаю, что решение о лечении принимает медицинский специалист, а расходы определяются законом, страховкой и правилами соответствующей службы', 'ידוע לי שההחלטה על טיפול מתקבלת על ידי איש/אשת מקצוע רפואי/ת, והעלויות נקבעות לפי החוק, הביטוח וכללי השירות הרלוונטי', 'I understand that a medical professional decides on treatment, and that costs follow the law, the insurance and the rules of the service concerned')],
          ['trainer', l('Я разрешаю сообщить тренеру только те ограничения, которые необходимы для безопасного участия', 'אני מרשה למסור למאמן/ת רק את המגבלות הנחוצות להשתתפות בטוחה', 'I allow the trainer to be told only the limits needed to take part safely')]) },
        signer(),
      ],
    },
  ],
  done: l('Декларация здоровья принята. При изменении состояния здоровья заполните новую форму и сообщите администратору. В неотложной ситуации обращайтесь в экстренную службу, а не через эту форму.', 'הצהרת הבריאות התקבלה. אם מצב הבריאות משתנה, מלאו טופס חדש ועדכנו את המנהלת. במקרה חירום פנו לשירותי החירום, לא דרך הטופס הזה.', 'The health declaration has been received. If health changes, fill in a new form and tell the administrator. In an emergency, call the emergency services, not this form.'),
};

// --- Appendix 3 (minors only) ---------------------------------------------
const f3: Form = {
  code: 'f3', num: '3', signer: 'signer',
  title: l('Получение несовершеннолетнего ученика и самостоятельный уход', 'איסוף תלמיד/ה קטין/ה ועזיבה עצמאית', 'Collecting a minor student and leaving alone'),
  sections: [
    {
      title: l('Основные данные', 'פרטים בסיסיים', 'Basic details'),
      qs: [
        studentName(l('Полное имя ребёнка', 'שם מלא של הילד/ה', "Child's full name")),
        holderName(l('Полное имя родителя или законного представителя', 'שם מלא של ההורה או האפוטרופוס/ית', 'Full name of the parent or legal guardian')),
        { id: 'p_phone', type: 'tel', label: l('Телефон родителя или законного представителя', 'טלפון ההורה או האפוטרופוס/ית', 'Phone of the parent or legal guardian'), req: true, prefill: (c) => c.holder.phone },
      ],
    },
    {
      title: l('Постоянный порядок ухода', 'סדר העזיבה הקבוע', 'How the child usually leaves'),
      qs: [
        { id: 'leave', type: 'one', label: l('Как ребёнок обычно покидает Студию?', 'איך הילד/ה עוזב/ת את הסטודיו בדרך כלל?', 'How does the child usually leave the studio?'), req: true, opts: opts(
          ['adult', l('Только с указанным взрослым', 'רק עם מבוגר/ת מורשה', 'Only with a named adult')],
          ['alone', l('Самостоятельно после занятия', 'לבד אחרי השיעור', 'Alone after class')],
          ['mixed', l('Смешанный порядок в зависимости от дня', 'משתנה לפי היום', 'It depends on the day')]) },
      ],
    },
    {
      title: l('Лица, которым разрешено забирать ребёнка', 'אנשים המורשים לאסוף את הילד/ה', 'People allowed to collect the child'),
      show: is('leave', 'adult', 'mixed'),
      qs: [
        { id: 'auth1', type: 'long', label: l('Уполномоченное лицо 1', 'מורשה/ית 1', 'Authorised person 1'), req: true, hint: contactChild },
        { id: 'auth2', type: 'long', label: l('Уполномоченное лицо 2', 'מורשה/ית 2', 'Authorised person 2'), hint: contactChild },
        { id: 'auth3', type: 'long', label: l('Уполномоченное лицо 3', 'מורשה/ית 3', 'Authorised person 3'), hint: contactChild },
        { id: 'auth4', type: 'long', label: l('Уполномоченное лицо 4', 'מורשה/ית 4', 'Authorised person 4'), hint: contactChild },
        { id: 'legal', type: 'one', label: l('Есть ли известные юридические или иные ограничения на передачу ребёнка определённому лицу?', 'האם ידועות מגבלות משפטיות או אחרות על מסירת הילד/ה לאדם מסוים?', 'Are there known legal or other limits on handing the child to a certain person?'), req: true,
          opts: opts(['no', NO], ['yes', l('Да — свяжусь с администратором по защищённому каналу', 'כן — אפנה למנהלת בערוץ מאובטח', 'Yes — I will contact the administrator through a secure channel')]),
          hint: l('Не описывайте конфиденциальные обстоятельства и не прикладывайте документы к этой форме.', 'אין לפרט נסיבות חסויות ואין לצרף מסמכים לטופס זה.', 'Do not describe confidential circumstances and do not attach documents to this form.'),
          flag: ['yes', l('Администратор свяжется с вами.', 'המנהלת תיצור איתך קשר.', 'The administrator will contact you.')] },
      ],
    },
    {
      title: l('Самостоятельный уход', 'עזיבה עצמאית', 'Leaving alone'),
      show: is('leave', 'alone', 'mixed'),
      qs: [
        { id: 'alone_ok', type: 'yesno', label: l('Разрешаете ли вы ребёнку самостоятельно покидать Студию после окончания занятия?', 'האם את/ה מרשה לילד/ה לעזוב את הסטודיו לבד בסוף השיעור?', 'Do you allow the child to leave the studio alone after class?'), req: true },
        { id: 'days', type: 'many', show: is('alone_ok', 'yes'), req: is('alone_ok', 'yes'), label: l('Дни, когда разрешён самостоятельный уход', 'ימים שבהם מותרת עזיבה עצמאית', 'Days when leaving alone is allowed'), opts: opts(
          ['sun', l('Воскресенье', 'ראשון', 'Sunday')], ['mon', l('Понедельник', 'שני', 'Monday')], ['tue', l('Вторник', 'שלישי', 'Tuesday')], ['wed', l('Среда', 'רביעי', 'Wednesday')],
          ['thu', l('Четверг', 'חמישי', 'Thursday')], ['fri', l('Пятница', 'שישי', 'Friday')], ['sat', l('Суббота', 'שבת', 'Saturday')],
          ['any', l('После любого занятия по действующему расписанию', 'אחרי כל שיעור לפי מערכת השעות', 'After any class on the current timetable')]) },
        { id: 'alone_more', type: 'long', show: is('alone_ok', 'yes'), label: l('Дополнительные условия самостоятельного ухода', 'תנאים נוספים לעזיבה עצמאית', 'Other conditions for leaving alone'), hint: l('Например, только после определённой группы или только после сообщения родителю', 'למשל רק אחרי קבוצה מסוימת או רק אחרי הודעה להורה', 'For example only after a certain group, or only after messaging the parent') },
      ],
    },
    {
      title: l('Подтверждение', 'אישור', 'Confirmation'),
      qs: [
        { id: 'confirms', type: 'all', label: l('Обязательные подтверждения', 'אישורים נדרשים', 'Required confirmations'), req: true, opts: opts(
          ['right', l('Я вправе определить порядок получения ребёнка', 'אני מוסמך/ת לקבוע את סדר איסוף הילד/ה', 'I am entitled to decide how the child is collected')],
          ['order', l('Я подтверждаю указанный постоянный порядок', 'אני מאשר/ת את הסדר הקבוע שצוין', 'I confirm the usual arrangement above')],
          ['once', l('Я понимаю, что разовое изменение действует только после подтверждения администратором', 'ידוע לי ששינוי חד-פעמי תקף רק לאחר אישור המנהלת', 'I understand that a one-time change applies only once the administrator confirms it')],
          ['update', l('Я обязуюсь сообщить Студии об изменениях новой отправкой формы', 'אני מתחייב/ת לעדכן את הסטודיו על שינויים בשליחת טופס חדש', 'I will tell the studio about changes by sending this form again')]) },
        signer(l('Полное имя родителя или законного представителя', 'שם מלא של ההורה או האפוטרופוס/ית', 'Full name of the parent or legal guardian')),
      ],
    },
  ],
  done: l('Порядок получения ребёнка сохранён. Разовые изменения действуют только после отдельного подтверждения администратором Студии.', 'סדר איסוף הילד/ה נשמר. שינויים חד-פעמיים תקפים רק לאחר אישור נפרד של מנהלת הסטודיו.', "The collection arrangement has been saved. One-time changes apply only after the studio's administrator confirms them."),
};

// --- Appendix 4 -----------------------------------------------------------
const yn = (id: string, label: L): Q => ({ id, type: 'yesno', label, req: true });
const f4: Form = {
  code: 'f4', num: '4', signer: 'signer',
  title: l('Фото, видео, публикации и электронная связь', 'צילום, וידאו, פרסומים ותקשורת אלקטרונית', 'Photos, video, publication and electronic contact'),
  intro: l('Каждое добровольное согласие выбирается отдельно. Отказ от рекламной публикации не влияет на обычное обучение.', 'כל הסכמה וולונטרית נבחרת בנפרד. סירוב לפרסום שיווקי אינו משפיע על הלימודים הרגילים.', 'Each voluntary consent is chosen separately. Saying no to marketing use does not affect normal classes.'),
  sections: [
    { title: l('Участник и подтверждающее лицо', 'המשתתף/ת והמאשר/ת', 'Participant and the person confirming'), qs: [who(), studentName(), signer()] },
    {
      title: l('Отдельные решения', 'החלטות נפרדות', 'Separate choices'),
      qs: [
        yn('p_internal', l('Разрешаю фото и видео для внутреннего анализа обучения, доступные только уполномоченным сотрудникам', 'אני מרשה צילום ווידאו לניתוח פנימי של הלמידה, זמינים רק לצוות מורשה', 'I allow photos and video for internal analysis of training, seen only by authorised staff')),
        yn('p_site', l('Разрешаю публикацию общих групповых материалов на официальном сайте Студии', 'אני מרשה פרסום חומרים קבוצתיים כלליים באתר הרשמי של הסטודיו', "I allow general group material on the studio's official website")),
        yn('p_social', l('Разрешаю публикацию общих групповых материалов в официальных социальных сетях Студии', 'אני מרשה פרסום חומרים קבוצתיים כלליים ברשתות החברתיות הרשמיות של הסטודיו', "I allow general group material on the studio's official social media")),
        yn('p_ads', l('Разрешаю использование изображения ученика в рекламных материалах Студии', 'אני מרשה שימוש בדמות התלמיד/ה בחומרי הפרסום של הסטודיו', "I allow the student's image in the studio's advertising")),
        yn('p_name', l('Разрешаю указывать имя ученика вместе с изображением', 'אני מרשה לציין את שם התלמיד/ה לצד התמונה', "I allow the student's name to be shown with the image")),
        yn('p_events', l('Разрешаю фото и видео во время концертов, соревнований, фестивалей, поездок и учебно-тренировочных сборов для последующей публикации в пределах выбранных выше согласий', 'אני מרשה צילום ווידאו בהופעות, תחרויות, פסטיבלים, נסיעות ומחנות אימון, לפרסום בגבולות ההסכמות שנבחרו למעלה', 'I allow photos and video at concerts, competitions, festivals, trips and training camps, to be published within the consents chosen above')),
        yn('wa_group', l('Разрешаю добавить мой номер телефона в группу WhatsApp, где номер виден другим участникам', 'אני מרשה להוסיף את מספר הטלפון שלי לקבוצת וואטסאפ שבה המספר גלוי למשתתפים אחרים', 'I allow my phone number to be added to a WhatsApp group where other members can see it')),
        yn('marketing', l('Согласен(на) получать отдельные рекламные сообщения Студии', 'אני מסכים/ה לקבל הודעות פרסומיות מהסטודיו', 'I agree to receive marketing messages from the studio')),
      ],
    },
    {
      title: l('Каналы связи', 'ערוצי תקשורת', 'How to contact you'),
      qs: [
        { id: 'channels', type: 'many', label: l('Предпочтительные каналы организационной связи', 'ערוצים מועדפים לתקשורת ארגונית', 'Preferred ways for organisational messages'), req: true,
          opts: opts(['email', l('Электронная почта', 'אימייל', 'Email')], ['whatsapp', l('WhatsApp', 'וואטסאפ', 'WhatsApp')], ['call', l('Телефонный звонок', 'שיחת טלפון', 'Phone call')], ['sms', l('SMS', 'SMS', 'SMS')]),
          hint: l('Организационные сообщения об услуге не являются рекламным согласием.', 'הודעות ארגוניות על השירות אינן הסכמה לפרסום.', 'Organisational messages about the service are not a marketing consent.') },
        { id: 'channels_note', type: 'long', label: l('Ограничения или комментарии', 'הגבלות או הערות', 'Limits or comments') },
      ],
    },
    {
      title: l('Подтверждение', 'אישור', 'Confirmation'),
      qs: [
        { id: 'confirms', type: 'all', label: l('Подтверждение выбора', 'אישור הבחירות', 'Confirming the choices'), req: true, opts: opts(
          ['each', l('Я сделал(а) отдельный выбор по каждому виду использования', 'בחרתי בנפרד לגבי כל סוג שימוש', 'I have made a separate choice for each kind of use')],
          ['withdraw', l('Я понимаю, что могу отозвать добровольное согласие на будущее через официальный контакт Студии', 'ידוע לי שאוכל לבטל הסכמה וולונטרית מכאן והלאה דרך הקשר הרשמי של הסטודיו', "I understand I can withdraw a voluntary consent for the future through the studio's official contact")],
          ['past', l('Я понимаю, что отзыв не отменяет уже законно выполненные действия и не влияет на необходимую организационную связь', 'ידוע לי שביטול אינו מבטל פעולות שכבר נעשו כדין ואינו משפיע על התקשורת הארגונית הנחוצה', 'I understand that withdrawing does not undo what was lawfully done already and does not affect necessary organisational contact')]) },
      ],
    },
  ],
  done: l('Ваши решения сохранены. Для изменения или отзыва согласия на будущее сообщите администратору Студии.', 'הבחירות שלך נשמרו. כדי לשנות או לבטל הסכמה מכאן והלאה, פנו למנהלת הסטודיו.', "Your choices have been saved. To change or withdraw a consent for the future, tell the studio's administrator."),
};

// --- Appendix 6 -----------------------------------------------------------
export const PRIVACY: L[] = [
  l('Ответственный за данные — Исполнитель, указанный в карточке Исполнителя, опубликованной вместе с офертой. Обращения направляются через официальные контакты Студии.', 'האחראי על המידע הוא נותן השירות המופיע בכרטיס נותן השירות שפורסם יחד עם ההצעה. פניות נשלחות דרך פרטי הקשר הרשמיים של הסטודיו.', "The controller of the data is the provider named in the provider details published with the offer. Requests go through the studio's official contacts."),
  l('Собираются идентификационные и контактные данные, сведения о программе, посещаемости и платежах, минимально необходимые сведения о здоровье и безопасности, выбранные согласия, записи об инцидентах и организационных сообщениях.', 'נאספים פרטי זיהוי וקשר, מידע על התוכנית, הנוכחות והתשלומים, המידע ההכרחי בלבד על בריאות ובטיחות, ההסכמות שנבחרו, ותיעוד של אירועים והודעות ארגוניות.', 'We collect identity and contact details, programme, attendance and payment information, the minimum health and safety information needed, the consents chosen, and records of incidents and organisational messages.'),
  l('Данные используются для регистрации и исполнения договора, безопасности, связи, платежей и бухгалтерского учёта, страхования, организации занятий, выступлений, поездок и учебно-тренировочных сборов, исполнения закона и защиты законных прав.', 'המידע משמש לרישום ולביצוע החוזה, לבטיחות, לתקשורת, לתשלומים ולהנהלת חשבונות, לביטוח, לארגון שיעורים, הופעות, נסיעות ומחנות אימון, לקיום החוק ולהגנה על זכויות חוקיות.', 'The data is used for registration and carrying out the agreement, safety, contact, payments and bookkeeping, insurance, organising classes, performances, trips and training camps, meeting the law and protecting legal rights.'),
  l('Данные, без которых невозможно безопасно оказать услугу или оформить платёж, являются необходимыми. Рекламные согласия, публикация изображения и добавление номера в видимую другим участникам группу добровольны.', 'מידע שבלעדיו אי אפשר לתת את השירות בבטחה או לטפל בתשלום הוא מידע הכרחי. הסכמה לפרסום, פרסום תמונה והוספת המספר לקבוצה הגלויה למשתתפים אחרים הן וולונטריות.', 'Data without which the service cannot be given safely or a payment handled is necessary. Marketing consents, publishing an image and adding a number to a group other members can see are voluntary.'),
  l('Получателями могут быть уполномоченные сотрудники, бухгалтер или платёжный провайдер, страховщик, а в необходимом объёме — организатор мероприятия, перевозчик и государственный орган при наличии правового основания.', 'המקבלים יכולים להיות צוות מורשה, רואה/ת חשבון או ספק תשלומים, מבטח, ובמידה הנחוצה — מארגן/ת אירוע, מוביל/ה וגוף ממשלתי כשיש לכך בסיס חוקי.', 'Recipients may be authorised staff, the accountant or payment provider, the insurer and, as far as needed, an event organiser, a carrier and a public authority where there is a legal basis.'),
  l('Данные хранятся не дольше, чем необходимо для заявленных целей, требований законодательства, страхования и защиты прав. Конкретные сроки определяются действующей политикой хранения Студии.', 'המידע נשמר לא יותר מהנדרש למטרות שצוינו, לדרישות החוק, לביטוח ולהגנה על זכויות. התקופות המדויקות נקבעות במדיניות השמירה של הסטודיו.', "Data is kept no longer than needed for the stated purposes, legal requirements, insurance and protecting rights. Exact periods follow the studio's retention policy."),
  l('По официальным контактам можно направить применимый по закону запрос на доступ, исправление, обновление данных или согласий. Медицинские сведения не размещаются в общих группах.', 'דרך פרטי הקשר הרשמיים אפשר להגיש בקשה לפי החוק לעיון, תיקון או עדכון של המידע או של ההסכמות. מידע רפואי אינו מפורסם בקבוצות משותפות.', 'Through the official contacts you can make a request under the law to see, correct or update your data or consents. Medical information is never posted in shared groups.'),
];
const f6: Form = {
  code: 'f6', num: '6', signer: 'signer',
  title: l('Уведомление о конфиденциальности и подтверждение ознакомления', 'הודעת פרטיות ואישור קריאה', 'Privacy notice and acknowledgement'),
  intro: l('Форма подтверждает получение уведомления и не заменяет отдельные добровольные согласия на рекламу, фото, видео и публикации.', 'הטופס מאשר את קבלת ההודעה ואינו מחליף את ההסכמות הוולונטריות הנפרדות לפרסום, צילום, וידאו ופרסומים.', 'This form confirms the notice was received; it does not replace the separate voluntary consents for marketing, photos, video and publication.'),
  sections: [
    { text: PRIVACY, docs: ['doc_privacy'], qs: [] },
    {
      qs: [
        who(l('Кто подтверждает ознакомление?', 'מי מאשר/ת את הקריאה?', 'Who is confirming they have read it?')),
        studentName(),
        signer(),
        { id: 'confirms', type: 'all', label: l('Подтверждение ознакомления', 'אישור קריאה', 'Acknowledgement'), req: true, opts: opts(
          ['read', l('Я получил(а) и прочитал(а) уведомление о конфиденциальности', 'קיבלתי וקראתי את הודעת הפרטיות', 'I have received and read the privacy notice')],
          ['clear', l('Мне понятны основные категории данных, цели, получатели, сроки хранения и официальный канал обращений', 'הבנתי את סוגי המידע העיקריים, המטרות, המקבלים, תקופות השמירה וערוץ הפניות הרשמי', 'I understand the main kinds of data, the purposes, the recipients, how long it is kept and the official channel for requests')],
          ['not_consent', l('Я понимаю, что это подтверждение не является согласием на добровольную рекламу или публикацию изображения', 'ידוע לי שאישור זה אינו הסכמה לפרסום וולונטרי או לפרסום תמונה', 'I understand this acknowledgement is not consent to voluntary marketing or publishing an image')]) },
      ],
    },
  ],
  done: l('Подтверждение ознакомления сохранено. По вопросам доступа, исправления или обновления данных используйте официальный контакт Студии.', 'אישור הקריאה נשמר. לעיון, תיקון או עדכון של המידע פנו דרך הקשר הרשמי של הסטודיו.', "The acknowledgement has been saved. To see, correct or update your data, use the studio's official contact."),
};

// --- Appendix 7 -----------------------------------------------------------
const RULES: L[] = [
  l('В зал входят только с разрешения тренера, в подходящей чистой обуви и одежде.', 'נכנסים לאולם רק באישור המאמן/ת, בנעליים ובבגדים מתאימים ונקיים.', "The hall is entered only with the trainer's permission, in suitable clean shoes and clothes."),
  l('Украшения и опасные предметы снимаются до занятия.', 'תכשיטים וחפצים מסוכנים מוסרים לפני השיעור.', 'Jewellery and dangerous objects come off before class.'),
  l('О боли, головокружении, травме, конфликте или небезопасной ситуации необходимо сразу сообщить тренеру.', 'על כאב, סחרחורת, פציעה, סכסוך או מצב לא בטוח יש לדווח מיד למאמן/ת.', 'Pain, dizziness, injury, a conflict or an unsafe situation is reported to the trainer at once.'),
  l('Запрещены травля, угрозы, унижение, дискриминация, опасные толчки и выполнение элементов без разрешения.', 'אסורים בריונות, איומים, השפלה, אפליה, דחיפות מסוכנות וביצוע תרגילים ללא אישור.', 'Bullying, threats, humiliation, discrimination, dangerous pushing and doing elements without permission are forbidden.'),
  l('Тренер объясняет профессиональную физическую коррекцию; ученик может в любой момент сообщить о дискомфорте.', 'המאמן/ת מסביר/ה תיקון גופני מקצועי; התלמיד/ה יכול/ה בכל רגע לומר שאינו/ה בנוח.', 'The trainer explains any professional physical correction; the student can say at any time that they are uncomfortable.'),
  l('Несовершеннолетний не покидает занятие, мероприятие, поездку или учебно-тренировочный сбор без установленного разрешения и порядка передачи.', 'קטין/ה אינו/ה עוזב/ת שיעור, אירוע, נסיעה או מחנה אימון ללא האישור וסדר המסירה שנקבעו.', 'A minor does not leave a class, event, trip or training camp without the agreed permission and hand-over.'),
  l('Личная переписка сотрудника с несовершеннолетним ведётся только по организационным вопросам и с включением родителя, кроме законно и письменно согласованных случаев.', 'התכתבות אישית של איש/אשת צוות עם קטין/ה נעשית רק בנושאים ארגוניים ובשיתוף ההורה, למעט מקרים שסוכמו כדין ובכתב.', 'Private messages between staff and a minor are only about organisation and include the parent, except where lawfully agreed in writing.'),
  l('Сотрудник не перевозит несовершеннолетнего на личном автомобиле и не встречается с ним вне программы без отдельного согласия и установленного порядка.', 'איש/אשת צוות אינו/ה מסיע/ה קטין/ה ברכב פרטי ואינו/ה נפגש/ת איתו/ה מחוץ לתוכנית ללא הסכמה נפרדת וסדר שנקבע.', 'Staff do not drive a minor in a private car or meet them outside the programme without separate consent and an agreed procedure.'),
  l('В раздевалках и санитарных помещениях запрещены фото, видео и камеры наблюдения.', 'בחדרי ההלבשה ובשירותים אסורים צילום, וידאו ומצלמות אבטחה.', 'Photos, video and security cameras are forbidden in changing rooms and toilets.'),
  l('Во время поездки или сбора соблюдаются сообщённые правила проживания, режима, питания, надзора, связи и действий при досрочном отъезде. О подозрении на причинение вреда несовершеннолетнему можно сообщить руководителю, тренеру или назначенному ответственному лицу; при предусмотренных законом обстоятельствах информация передаётся компетентному органу.', 'בנסיעה או במחנה מקיימים את הכללים שנמסרו לגבי לינה, סדר יום, אוכל, השגחה, תקשורת ועזיבה מוקדמת. על חשד לפגיעה בקטין/ה אפשר לדווח למנהל/ת, למאמן/ת או לאחראי/ת שמונה; במקרים שהחוק קובע, המידע מועבר לרשות המוסמכת.', 'On a trip or at a camp, the rules given for lodging, schedule, meals, supervision, contact and leaving early are kept. A suspicion that a minor is being harmed can be reported to the head, a trainer or the appointed person; where the law requires, it is passed to the competent authority.'),
];
const f7: Form = {
  code: 'f7', num: '7', signer: 'signer',
  title: l('Правила безопасного поведения и защиты несовершеннолетних', 'כללי התנהגות בטוחה והגנה על קטינים', 'Safe conduct and protection of minors'),
  intro: l('Правила распространяются на занятия, репетиции, выступления, соревнования, поездки и учебно-тренировочные сборы.', 'הכללים חלים על שיעורים, חזרות, הופעות, תחרויות, נסיעות ומחנות אימון.', 'The rules apply to classes, rehearsals, performances, competitions, trips and training camps.'),
  sections: [
    {
      title: l('Основные данные', 'פרטים בסיסיים', 'Basic details'),
      qs: [
        { ...who(), opts: [['parent', PARENT], ['adult', ADULT], ['older', l('Несовершеннолетний ученик старшего возраста дополнительно к форме родителя', 'תלמיד/ה קטין/ה בוגר/ת, בנוסף לטופס של ההורה', 'An older minor student, in addition to the parent’s form')]],
          only: (c) => (c.adult ? ['adult'] : ['parent', 'older']) },
        studentName(),
      ],
    },
    {
      title: l('Правила', 'הכללים', 'The rules'),
      qs: RULES.map((label, i): Q => ({ id: `r${i + 1}`, type: 'tick', label, req: true })),
    },
    {
      title: l('Уточнение и подтверждение', 'הבהרה ואישור', 'Questions and confirmation'),
      qs: [
        { id: 'clarify', type: 'one', label: l('Есть ли правило, которое требует разъяснения?', 'האם יש כלל שדורש הבהרה?', 'Is there a rule you would like explained?'), req: true, opts: opts(['no', NO], ['yes', l('Да — прошу связаться со мной', 'כן — אבקש שיצרו איתי קשר', 'Yes — please contact me')]),
          flag: ['yes', l('Администратор свяжется с вами до завершения оформления или допуска к соответствующей активности.', 'המנהלת תיצור איתך קשר לפני השלמת הרישום או ההשתתפות בפעילות.', 'The administrator will contact you before the registration is completed or before the activity concerned.')] },
        { id: 'which', type: 'long', show: is('clarify', 'yes'), req: is('clarify', 'yes'), label: l('Какое правило необходимо разъяснить?', 'איזה כלל צריך הבהרה?', 'Which rule needs explaining?') },
        { id: 'confirms', type: 'all', label: l('Итоговое подтверждение', 'אישור סופי', 'Final confirmation'), req: true, opts: opts(
          ['keep', l('Я ознакомлен(а) с правилами и обязуюсь их соблюдать или объяснить их несовершеннолетнему ученику', 'קראתי את הכללים ואני מתחייב/ת לשמור עליהם או להסביר אותם לתלמיד/ה הקטין/ה', 'I have read the rules and will keep them, or explain them to the minor student')],
          ['report', l('Я понимаю, что вопросы безопасности можно сообщать любому сотруднику, который обязан передать их ответственному лицу', 'ידוע לי שאפשר לדווח על נושאי בטיחות לכל איש/אשת צוות, שחייב/ת להעביר אותם לאחראי/ת', 'I understand that safety concerns can be raised with any staff member, who must pass them on to the person responsible')],
          ['inform', l('Я обязуюсь сообщать актуальную информацию, влияющую на безопасное участие', 'אני מתחייב/ת למסור מידע עדכני המשפיע על השתתפות בטוחה', 'I will share up-to-date information that affects safe participation')]) },
        signer(),
      ],
    },
  ],
  done: l('Подтверждение правил сохранено.', 'אישור הכללים נשמר.', 'Your confirmation of the rules has been saved.'),
};

export const FORMS: Form[] = [f1, f2, f3, f4, f6, f7];
export const formOf = (code: string) => FORMS.find((f) => f.code === code)!;

/** This school year and the next, e.g. "2026–2027"; a new year starts in September. */
export function schoolYears(now = new Date()) {
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return [`${y}–${y + 1}`, `${y + 1}–${y + 2}`];
}

// --- checking ---------------------------------------------------------------
const truthy = (when: boolean | When | undefined, a: Answers, c: Ctx) => (typeof when === 'function' ? when(a, c) : !!when);
export const shown = (x: { show?: When }, a: Answers, c: Ctx) => !x.show || x.show(a, c);

/** Every question the person sees with these answers, section by section. */
export const visible = (f: Form, a: Answers, c: Ctx) =>
  f.sections.filter((s) => shown(s, a, c)).map((s) => ({ s, qs: s.qs.filter((q) => shown(q, a, c)) }));

export function answered(q: Q, v: any) {
  if (q.type === 'name2') return !!(v?.he?.trim() && v?.en?.trim());
  if (q.type === 'all') return Array.isArray(v) && (q.opts ?? []).every(([id]) => v.includes(id));
  if (q.type === 'many') return Array.isArray(v) && v.length > 0;
  if (q.type === 'tick') return v === true;
  return typeof v === 'string' ? v.trim() !== '' : v != null;
}

/** The required questions without an answer. */
export const missing = (f: Form, a: Answers, c: Ctx) =>
  visible(f, a, c).flatMap(({ qs }) => qs.filter((q) => truthy(q.req, a, c) && !answered(q, a[q.id])));

/** An answer that stops sending (appendix 1: not entitled, or not confirmed). */
export const stopped = (f: Form, a: Answers, c: Ctx) =>
  visible(f, a, c).flatMap(({ qs }) => qs.filter((q) => q.stop && a[q.id] === q.stop[0]).map((q) => q.stop![1]))[0] ?? null;

/** Answers that mean the studio has to get in touch. */
export const flags = (f: Form, a: Answers, c: Ctx) =>
  visible(f, a, c).flatMap(({ qs }) => qs.filter((q) => q.flag && a[q.id] === q.flag[0]).map((q) => q.flag![1]));

// --- statuses -----------------------------------------------------------------
export type State = 'none' | 'done' | 'update' | 'ask' | 'notNeeded';
export interface Sent { at: string; signed_by: string; needs_update: boolean; ask: string | null; clarified: boolean }
export function stateOf(code: string, needed: string[], sent?: Sent): State {
  if (!needed.includes(code)) return 'notNeeded';
  if (!sent) return 'none';
  if (sent.needs_update) return 'update';
  if (sent.ask === '1' && !sent.clarified) return 'ask';
  return 'done';
}

// Words both pages use.
export const W = {
  appendix: l('Приложение №', 'נספח מס׳ ', 'Appendix '),
  none: l('Не заполнена', 'לא מולא', 'Not filled in'),
  done: l('Заполнена', 'מולא', 'Filled in'),
  update: l('Нужно обновить', 'צריך לעדכן', 'Needs updating'),
  ask: l('Ожидает уточнения', 'ממתין להבהרה', 'Waiting for clarification'),
  notNeeded: l('Не требуется', 'לא נדרש', 'Not needed'),
  allDone: l('Все документы заполнены', 'כל המסמכים מולאו', 'All documents are filled in'),
  missingForm: l('Для ученика {name} не заполнено: {form}', 'עבור {name} לא מולא: {form}', 'For {name}, not filled in: {form}'),
  updateForm: l('Для ученика {name} нужно обновить: {form}', 'עבור {name} צריך לעדכן: {form}', 'For {name}, please update: {form}'),
  askForm: l('{name}, {form}: администратор должен связаться с вами', '{name}, {form}: המנהלת צריכה ליצור איתך קשר', '{name}, {form}: the administrator needs to contact you'),
  unanswered: l('Нет ответа: {q}', 'אין תשובה: {q}', 'No answer: {q}'),
  signedBy: l('Подтвердил(а)', 'אישר/ה', 'Confirmed by'),
  he: l('на иврите', 'בעברית', 'in Hebrew'),
  en: l('на английском', 'באנגלית', 'in English'),
  yes: YES,
  no: NO,
};

// Who a student is to the account holder, and the words for a form’s state.
export const STUDENT_REL: [string, L][] = [
  ['son', l('Сын', 'בן', 'Son')], ['daughter', l('Дочь', 'בת', 'Daughter')], ['spouse', l('Супруг/супруга', 'בן/בת זוג', 'Spouse')],
  ['sibling', l('Брат/сестра', 'אח/אחות', 'Brother/sister')], ['relative', l('Другой родственник', 'קרוב/ת משפחה אחר/ת', 'Another relative')], ['other', l('Другое', 'אחר', 'Other')],
];
export const STATE_WORD = { none: W.none, done: W.done, update: W.update, ask: W.ask, notNeeded: W.notNeeded };

