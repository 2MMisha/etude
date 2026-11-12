// Every string of the CRM, in the three staff languages.
export type Lang = 'he' | 'ru' | 'en';
export const LANGS: Lang[] = ['he', 'ru', 'en'];
export const LOCALE: Record<Lang, string> = { he: 'he-IL', ru: 'ru-RU', en: 'en-GB' };

const en = {
  // sign-in
  email: 'Email', password: 'Password', signIn: 'Sign in', signOut: 'Sign out', forgot: 'Forgot password?',
  sent: 'If that address is registered, a reset link is on its way.', needEmail: 'Type your email first.',
  wrong: 'Wrong email or password.', newPassword: 'New password (at least 8 characters)',
  noAccess: 'This account has no access to the system. Ask the administrator.',
  notConnected: 'The system is not connected to its database yet.',
  // common
  save: 'Save', saved: 'Saved.', add: 'Add', remove: 'Remove', del: 'Delete', sure: 'Sure?', back: '← Clients',
  name: 'Name', phone: 'Phone', address: 'Address', language: 'Language', notes: 'Notes', archived: 'Archived',
  comment: 'Comment', commentRequired: 'A comment is required.', emptyList: 'Nothing here yet.', amount: 'Amount',
  delClient: 'Delete the client and their students',
  inUse: 'It has history (students, groups or charges), so it cannot be deleted. Archive it instead.',
  // navigation
  clients: 'Clients', month: 'Month', settings: 'Settings', accounts: 'Accounts',
  // accounts
  roles: 'Roles', active: 'Active', owner: 'Owner', admin: 'Admin', trainer: 'Trainer', client: 'Client',
  accountsHint: 'A new account is created in Supabase → Authentication → Add user; here you give it a name and a role.',
  // clients
  search: 'Search by name or phone', showArchived: 'Show archived', newClient: 'New client', students: 'Students',
  samePhone: 'Same phone as', addStudent: 'Add student', clientIsStudent: 'The client is the student',
  birthDate: 'Date of birth', level: 'Level', membership: 'Membership', perWeek: 'a week', addGroup: '+ Group…',
  unlimited: 'Unlimited', discounts: 'Discounts', secondChild: 'Second child', fullYear: 'Paid for the full year',
  olimPct: 'Olim, %', customPct: 'Other discount, %', customComment: 'Reason for the discount',
  noGroups: 'Not in any group yet.', noPrice: 'No price for this combination: set it by hand on the Month screen.',
  perMonth: 'a month', charges: 'Charges', noCharges: 'No charges yet.',
  // month
  createCharges: 'Create charges for this month', added: 'added', plan: 'Plan', list: 'List price', discount: 'Discount',
  charge: 'Charge', recalc: 'Recalculate from the price list', total: 'Total', notCharged: 'not charged', byHand: 'set by hand',
  // settings
  programmes: 'Programmes and monthly prices', minutes: 'Minutes', addProgramme: 'Add programme',
  priceHint: 'Monthly price for 1, 2 or 3 classes a week. Leave a cell empty if that option does not exist.',
  otherPrices: 'Other prices', oneTimeEntry: 'One-time group entry', privateLessons: 'Private lessons', rentals: 'Hall rental',
  label: 'Name', groupsTitle: 'Groups', programme: 'Programme', discountsTitle: 'Discounts, %',
  historyHint: 'A change applies to new charges only. Charges already made keep their price.',
  // stage 2: payments, confirmations, debts, reports
  debts: "Debts", reports: "Reports", payments: "Payments", recordPayment: "Record payment",
  date: "Date", method: "Method", cash: "Cash", transfer: "Bank transfer",
  bit: "Bit", cheque: "Cheque", standing_order: "Standing order", chequeNumber: "Cheque no.",
  chequeBank: "Bank", chequeDate: "Cheque date", paperDoc: "Paper document no.", covers: "Covers",
  owes: "Owes", paidAhead: "Paid ahead", settled: "Nothing owed", useCredit: "Use the credit",
  credit: "Credit not yet used", paid: "Paid", owed: "Owed", onAccount: "On account",
  tooManyLines: "The ticked lines add up to more than the amount.", needAmount: "Enter the amount.", confirmation: "Confirmation", void: "Void",
  voidReason: "Reason for voiding", voided: "Voided", refund: "Refund", refundReason: "Reason for the refund",
  noPayments: "No payments yet.", rcTitle: "Payment confirmation", rcRefund: "Refund confirmation", rcFrom: "Received from",
  rcTo: "Returned to", rcFor: "For", businessNo: "Business no.", print: "Print / save as PDF",
  sendWhatsApp: "Send by WhatsApp", debtsTitle: "Who owes", noDebts: "Nobody owes anything.", remind: "Remind on WhatsApp",
  remindText: "Hello {name}! A reminder from ETUDE Dance School: the balance to pay is {amount}. Thank you!", received: "Received", charged: "Charged for the month", stillOwed: "Still owed for the month",
  exportExcel: "Export to Excel", business: "School details on confirmations", bizNumber: "Business number",
};
export type Key = keyof typeof en;

const ru: Record<Key, string> = {
  email: 'Эл. почта', password: 'Пароль', signIn: 'Войти', signOut: 'Выйти', forgot: 'Забыли пароль?',
  sent: 'Если адрес зарегистрирован, на него отправлена ссылка для сброса.', needEmail: 'Сначала введите почту.',
  wrong: 'Неверная почта или пароль.', newPassword: 'Новый пароль (не короче 8 символов)',
  noAccess: 'У этой учётной записи нет доступа к системе. Обратитесь к администратору.',
  notConnected: 'Система ещё не подключена к базе данных.',
  save: 'Сохранить', saved: 'Сохранено.', add: 'Добавить', remove: 'Убрать', del: 'Удалить', sure: 'Точно?', back: '← Клиенты',
  name: 'Имя', phone: 'Телефон', address: 'Адрес', language: 'Язык', notes: 'Заметки', archived: 'В архиве',
  comment: 'Комментарий', commentRequired: 'Нужен комментарий.', emptyList: 'Пока пусто.', amount: 'Сумма',
  delClient: 'Удалить клиента и его учеников',
  inUse: 'Есть связанные записи (ученики, группы или начисления), поэтому удалить нельзя. Отправьте в архив.',
  clients: 'Клиенты', month: 'Месяц', settings: 'Настройки', accounts: 'Учётные записи',
  roles: 'Роли', active: 'Активна', owner: 'Владелец', admin: 'Администратор', trainer: 'Тренер', client: 'Клиент',
  accountsHint: 'Новая учётная запись создаётся в Supabase → Authentication → Add user; здесь ей дают имя и роль.',
  search: 'Поиск по имени или телефону', showArchived: 'Показать архив', newClient: 'Новый клиент', students: 'Ученики',
  samePhone: 'Тот же телефон у', addStudent: 'Добавить ученика', clientIsStudent: 'Клиент сам занимается',
  birthDate: 'Дата рождения', level: 'Уровень', membership: 'Абонемент', perWeek: 'в неделю', addGroup: '+ Группа…',
  unlimited: 'Безлимит', discounts: 'Скидки', secondChild: 'Второй ребёнок', fullYear: 'Оплата за весь год',
  olimPct: 'Олим, %', customPct: 'Другая скидка, %', customComment: 'Причина скидки',
  noGroups: 'Пока не записан ни в одну группу.', noPrice: 'Для такого сочетания нет цены: задайте её вручную на экране «Месяц».',
  perMonth: 'в месяц', charges: 'Начисления', noCharges: 'Начислений пока нет.',
  createCharges: 'Начислить за этот месяц', added: 'добавлено', plan: 'Программа', list: 'Цена по прайсу', discount: 'Скидка',
  charge: 'Начислить', recalc: 'Пересчитать по прайсу', total: 'Итого', notCharged: 'без начисления', byHand: 'вручную',
  programmes: 'Программы и цены за месяц', minutes: 'Минут', addProgramme: 'Добавить программу',
  priceHint: 'Цена за месяц при 1, 2 или 3 занятиях в неделю. Оставьте ячейку пустой, если такого варианта нет.',
  otherPrices: 'Другие цены', oneTimeEntry: 'Разовое занятие в группе', privateLessons: 'Индивидуальные занятия', rentals: 'Аренда зала',
  label: 'Название', groupsTitle: 'Группы', programme: 'Программа', discountsTitle: 'Скидки, %',
  historyHint: 'Изменение действует только на новые начисления. Уже сделанные сохраняют свою цену.',
  // stage 2: payments, confirmations, debts, reports
  debts: "Долги", reports: "Отчёты", payments: "Оплаты", recordPayment: "Записать оплату",
  date: "Дата", method: "Способ", cash: "Наличные", transfer: "Перевод",
  bit: "Bit", cheque: "Чек", standing_order: "Ораат кева", chequeNumber: "Номер чека",
  chequeBank: "Банк", chequeDate: "Дата чека", paperDoc: "Номер бумажного документа", covers: "За что",
  owes: "Долг", paidAhead: "Переплата", settled: "Долга нет", useCredit: "Зачесть переплату",
  credit: "Незачтённая переплата", paid: "Оплачено", owed: "Осталось", onAccount: "В счёт будущих занятий",
  tooManyLines: "Отмеченные строки в сумме больше, чем оплата.", needAmount: "Введите сумму.", confirmation: "Подтверждение", void: "Аннулировать",
  voidReason: "Причина аннулирования", voided: "Аннулировано", refund: "Возврат", refundReason: "Причина возврата",
  noPayments: "Оплат пока нет.", rcTitle: "Подтверждение оплаты", rcRefund: "Подтверждение возврата", rcFrom: "Получено от",
  rcTo: "Возвращено", rcFor: "За что", businessNo: "Номер бизнеса", print: "Печать / сохранить PDF",
  sendWhatsApp: "Отправить в WhatsApp", debtsTitle: "Кто должен", noDebts: "Никто ничего не должен.", remind: "Напомнить в WhatsApp",
  remindText: "Здравствуйте, {name}! Напоминание от школы танцев ETUDE: к оплате {amount}. Спасибо!", received: "Получено", charged: "Начислено за месяц", stillOwed: "Не оплачено за месяц",
  exportExcel: "Выгрузить в Excel", business: "Данные школы на подтверждениях", bizNumber: "Номер бизнеса",
};

const he: Record<Key, string> = {
  email: 'אימייל', password: 'סיסמה', signIn: 'כניסה', signOut: 'יציאה', forgot: 'שכחתי סיסמה',
  sent: 'אם הכתובת רשומה, נשלח אליה קישור לאיפוס.', needEmail: 'הקלידו את האימייל קודם.',
  wrong: 'אימייל או סיסמה שגויים.', newPassword: 'סיסמה חדשה (8 תווים לפחות)',
  noAccess: 'לחשבון הזה אין גישה למערכת. פנו למנהל/ת.',
  notConnected: 'המערכת עדיין לא מחוברת למסד הנתונים.',
  save: 'שמירה', saved: 'נשמר.', add: 'הוספה', remove: 'הסרה', del: 'מחיקה', sure: 'בטוח?', back: '→ לקוחות',
  name: 'שם', phone: 'טלפון', address: 'כתובת', language: 'שפה', notes: 'הערות', archived: 'בארכיון',
  comment: 'הערה', commentRequired: 'חובה לכתוב הערה.', emptyList: 'עדיין אין כאן כלום.', amount: 'סכום',
  delClient: 'מחיקת הלקוח/ה והתלמידים',
  inUse: 'יש רשומות קשורות (תלמידים, קבוצות או חיובים), ולכן אי אפשר למחוק. העבירו לארכיון.',
  clients: 'לקוחות', month: 'חודש', settings: 'הגדרות', accounts: 'חשבונות',
  roles: 'תפקידים', active: 'פעיל', owner: 'בעלים', admin: 'מנהל/ת', trainer: 'מאמן/ת', client: 'לקוח/ה',
  accountsHint: 'חשבון חדש יוצרים ב-Supabase ← Authentication ← Add user; כאן נותנים לו שם ותפקיד.',
  search: 'חיפוש לפי שם או טלפון', showArchived: 'להציג ארכיון', newClient: 'לקוח חדש', students: 'תלמידים',
  samePhone: 'אותו טלפון אצל', addStudent: 'הוספת תלמיד/ה', clientIsStudent: 'הלקוח/ה הוא/היא התלמיד/ה',
  birthDate: 'תאריך לידה', level: 'רמה', membership: 'מנוי', perWeek: 'בשבוע', addGroup: '+ קבוצה…',
  unlimited: 'ללא הגבלה', discounts: 'הנחות', secondChild: 'ילד/ה שני/ה', fullYear: 'תשלום לכל השנה',
  olimPct: 'עולים, %', customPct: 'הנחה אחרת, %', customComment: 'סיבת ההנחה',
  noGroups: 'עדיין לא רשום/ה לאף קבוצה.', noPrice: 'אין מחיר לשילוב הזה: קבעו אותו ידנית במסך "חודש".',
  perMonth: 'לחודש', charges: 'חיובים', noCharges: 'עדיין אין חיובים.',
  createCharges: 'יצירת חיובים לחודש הזה', added: 'נוספו', plan: 'תוכנית', list: 'מחיר מחירון', discount: 'הנחה',
  charge: 'לחייב', recalc: 'חישוב מחדש לפי המחירון', total: 'סה"כ', notCharged: 'ללא חיוב', byHand: 'ידני',
  programmes: 'תוכניות ומחירים לחודש', minutes: 'דקות', addProgramme: 'הוספת תוכנית',
  priceHint: 'מחיר לחודש עבור 1, 2 או 3 שיעורים בשבוע. השאירו תא ריק אם אין אפשרות כזו.',
  otherPrices: 'מחירים נוספים', oneTimeEntry: 'כניסה חד-פעמית לקבוצה', privateLessons: 'שיעורים פרטיים', rentals: 'השכרת אולם',
  label: 'שם', groupsTitle: 'קבוצות', programme: 'תוכנית', discountsTitle: 'הנחות, %',
  historyHint: 'שינוי חל רק על חיובים חדשים. חיובים שכבר נוצרו שומרים על המחיר שלהם.',
  // stage 2: payments, confirmations, debts, reports
  debts: "חובות", reports: "דוחות", payments: "תשלומים", recordPayment: "רישום תשלום",
  date: "תאריך", method: "אמצעי תשלום", cash: "מזומן", transfer: "העברה בנקאית",
  bit: "ביט", cheque: "צ'ק", standing_order: "הוראת קבע", chequeNumber: "מספר צ'ק",
  chequeBank: "בנק", chequeDate: "תאריך הצ'ק", paperDoc: "מספר מסמך ידני", covers: "עבור",
  owes: "חוב", paidAhead: "שולם מראש", settled: "אין חוב", useCredit: "לקזז את היתרה",
  credit: "יתרת זכות שלא נוצלה", paid: "שולם", owed: "נותר", onAccount: "על חשבון שיעורים עתידיים",
  tooManyLines: "סכום השורות המסומנות גדול מסכום התשלום.", needAmount: "הקלידו סכום.", confirmation: "אישור", void: "ביטול",
  voidReason: "סיבת הביטול", voided: "בוטל", refund: "החזר", refundReason: "סיבת ההחזר",
  noPayments: "עדיין אין תשלומים.", rcTitle: "אישור תשלום", rcRefund: "אישור החזר", rcFrom: "התקבל מאת",
  rcTo: "הוחזר ל", rcFor: "עבור", businessNo: "ע.מ", print: "הדפסה / שמירה כ-PDF",
  sendWhatsApp: "שליחה בוואטסאפ", debtsTitle: "מי חייב", noDebts: "אף אחד לא חייב.", remind: "תזכורת בוואטסאפ",
  remindText: "שלום {name}! תזכורת מסטודיו ETUDE: היתרה לתשלום היא {amount}. תודה!", received: "התקבל", charged: "חויב עבור החודש", stillOwed: "טרם שולם עבור החודש",
  exportExcel: "ייצוא לאקסל", business: "פרטי בית הספר על האישורים", bizNumber: "מספר עוסק",
};

const T: Record<Lang, Record<Key, string>> = { en, ru, he };

// Same key as the trainers' app, so the choice follows the person.
export const storedLang = (): Lang | undefined => {
  try {
    return LANGS.find((l) => l === localStorage.getItem('etude-lang'));
  } catch {
    return undefined;
  }
};
let lang: Lang = storedLang() ?? LANGS.find((l) => navigator.language.startsWith(l)) ?? 'he';

export const getLang = () => lang;
export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem('etude-lang', l);
  } catch {}
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
}
export const t = (k: Key) => T[lang][k];
/** A string in a given language: confirmations and reminders go out in the client's language, not the screen's. */
export const tIn = (l: Lang, k: Key) => T[l][k];
