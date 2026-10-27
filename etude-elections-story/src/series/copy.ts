// Copy for the "Сегодня все выбирают… а мы свой выбор сделали давно" series.
// Keep it strictly neutral: no parties, ballot letters, flags, politicians or "vote for".
// Contact details come from the site's src/data/site-settings.json (admin-editable) — keep them in sync.
export const SERIES_COPY = {
  story01: {
    he: 'היום כולם בוחרים',
    ru: 'Сегодня все выбирают',
  },
  story02: {
    he: 'ואנחנו בחרנו מזמן',
    ru: 'а мы свой выбор сделали давно',
  },
  story03: {
    he: 'בחרנו בריקוד',
    ru: 'Мы выбрали танец',
    stylesHe: 'ואלס · טנגו · פוקסטרוט · סמבה · צ׳ה-צ׳ה · ג׳ייב',
    stylesRu: 'вальс · танго · фокстрот · самба · ча-ча-ча · джайв',
  },
  story04: {
    he: 'בואו לרקוד איתנו',
    ru: 'Танцуйте с нами',
    offerHe: 'שיעור הניסיון הקבוצתי הראשון — חינם',
    offerRu: 'Первое пробное занятие — бесплатно',
    addressHe: 'רוטשילד 49, ראשון לציון',
    addressRu: 'Ротшильд 49, Ришон-ле-Цион',
    contact: 'WhatsApp 054-779-8676 · @etude_il',
  },
} as const;
