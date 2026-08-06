// All static site copy. First-pass draft copy written by the site builder —
// not certified translation. Please have a native speaker review the Hebrew
// and Russian text before publishing, particularly the About and Classes copy.
import type { Lang } from './languages';

export const translations = {
  he: {
    nav: {
      home: 'ראשי',
      about: 'אודות',
      classes: 'שיעורים',
      schedule: 'לוח זמנים',
      instructors: 'צוות ההוראה',
      gallery: 'גלריה',
      pricing: 'מחירים והרשמה',
      news: 'חדשות',
      contact: 'צור קשר',
    },
    common: {
      readMore: 'קראו עוד',
      backToNews: 'חזרה לחדשות',
      whatsapp: 'וואטסאפ',
      call: 'התקשרו',
      email: 'שלחו מייל',
      viewOnMap: 'הצגה במפה',
      allRightsReserved: 'כל הזכויות שמורות',
      draftNotice: 'התוכן באתר זה הוא טיוטה ראשונית וממתין לעדכון תוכן סופי מהלקוח.',
      placeholderImage: 'תמונה זמנית — תוחלף בתוכן אמיתי',
    },
    home: {
      heroEyebrow: 'ריקודי בלרום ולטיניים בראשון לציון',
      heroTitle: 'ללמוד לרקוד, בקצב שלכם',
      heroSubtitle:
        'שיעורים קבוצתיים ופרטיים בריקודי בלרום ולטיניים, לכל הגילאים והרמות — מהצעד הראשון ועד לרחבת הריקודים.',
      heroCtaPrimary: 'לוח השיעורים',
      heroCtaSecondary: 'צרו קשר',
      introTitle: 'סטודיו לריקוד באווירה מקצועית ונעימה',
      introBody:
        'אצלנו לומדים ריקודי בלרום, ריקודים לטיניים ושיעורי ספורט ותנועה לכל הגילאים והרמות — מתחילים לחלוטין ועד רקדנים מתקדמים. כל שיעור בנוי כך שתרגישו התקדמות אמיתית, בליווי צמוד של הצוות.',
      highlightsTitle: 'למה ETUDE',
      highlights: [
        { title: 'לכל הרמות', body: 'קבוצות מתחילים, ממשיכים ומתקדמים, וגם שיעורים פרטיים בקצב אישי.' },
        { title: 'סגנונות מגוונים', body: 'ריקודי בלרום, לטינית וסדנאות תנועה — במקום אחד.' },
        { title: 'ליווי צמוד', body: 'קבוצות קטנות ותשומת לב אישית בכל שיעור.' },
      ],
      newsTitle: 'מה קורה בסטודיו',
      ctaBandTitle: 'מוכנים לצעד הראשון?',
      ctaBandBody: 'השאירו פרטים ונחזור אליכם עם כל המידע על השיעורים המתאימים לכם.',
    },
    about: {
      title: 'אודות ETUDE',
      intro: 'ETUDE הוא סטודיו לריקוד בראשון לציון, המלמד ריקודי בלרום ולטיניים לכל הגילאים והרמות.',
      body1:
        'הסטודיו הוקם מתוך אמונה שריקוד הוא לא רק ספורט אלא גם דרך להתחבר לגוף, למוזיקה ולאנשים חדשים. אנחנו מאמינים שכל אחד יכול ללמוד לרקוד — צריך רק את המקום הנכון להתחיל בו.',
      body2:
        'הצוות שלנו מלווה תלמידים החל מהצעד הראשון ממש, דרך קבוצות לפי רמה, ועד לשיעורים פרטיים ולמסלולי תחרות למי שמעוניין בכך. השיעורים משלבים טכניקה, מוזיקליות והנאה — באווירה תומכת וללא לחץ.',
      valuesTitle: 'הגישה שלנו',
      values: [
        { title: 'מקצועיות', body: 'שיטת לימוד מובנית שמתקדמת בהדרגה, לפי הרמה האישית.' },
        { title: 'אווירה חמה', body: 'סטודיו שבו נעים לטעות, להתאמן ולהתקדם.' },
        { title: 'לכל גיל', body: 'מקבוצות ילדים ועד מבוגרים — לכל שלב בחיים יש ריקוד מתאים.' },
      ],
    },
    classes: {
      title: 'שיעורים ותוכניות',
      intro: 'שלושה מסלולים עיקריים, לכל הגילאים והרמות. ניתן לשלב בין המסלולים בהתאם למטרות האישיות שלכם.',
      categories: [
        {
          title: 'ריקודי בלרום',
          body: 'וואלס, טנגו, פוקסטרוט ועוד — הבסיס הקלאסי של ריקודי הזוגות, נלמד בהדרגה ובדיוק.',
        },
        {
          title: 'ריקודים לטיניים',
          body: 'צ׳ה-צ׳ה, סמבה, רומבה וסלסה — קצב, אנרגיה ותחושת מוזיקה בכל תנועה.',
        },
        {
          title: 'שיעורי ספורט ותנועה',
          body: 'שיעורים המשלבים כושר, קואורדינציה וריקוד — מתאימים לכל הגילאים, גם ללא ניסיון קודם.',
        },
      ],
      levelsTitle: 'רמות לימוד',
      levels: [
        { title: 'מתחילים', body: 'לא נדרש ניסיון קודם — מתחילים מהצעד הראשון ממש.' },
        { title: 'ממשיכים', body: 'לתלמידים שכבר מכירים את היסודות ורוצים להעמיק.' },
        { title: 'מתקדמים', body: 'עבודה טכנית מדויקת, כולל אפשרות למסלולי תחרות.' },
        { title: 'שיעורים פרטיים', body: 'ליווי אישי בקצב שלכם, לכל רמה ומטרה.' },
      ],
      cta: 'לפרטים ולהרשמה צרו קשר או עיינו בלוח הזמנים.',
    },
    schedule: {
      title: 'לוח זמנים',
      intro: 'השיעורים מתקיימים במהלך כל השבוע. לוח הזמנים המלא מתעדכן מעת לעת — לאישור מקום מומלץ ליצור קשר מראש.',
      placeholderNotice: 'לוח הזמנים המלא ייטען בקרוב. בינתיים, הסטודיו פתוח בין השעות 8:00 עד 21:00 בכל ימות השבוע.',
      columns: { day: 'יום', time: 'שעה', class: 'שיעור', level: 'רמה' },
    },
    instructors: {
      title: 'צוות ההוראה',
      intro: 'מדריכים מוסמכים ומנוסים, שמלווים כל תלמיד באופן אישי.',
      placeholderNotice: 'פרופילי המדריכים המלאים יעלו בקרוב.',
    },
    gallery: {
      title: 'גלריה',
      intro: 'רגעים מהסטודיו, מהשיעורים ומהאירועים שלנו.',
      placeholderNotice: 'תמונות וסרטונים מהסטודיו יעלו כאן בקרוב.',
    },
    pricing: {
      title: 'מחירים והרשמה',
      intro: 'המחירים משתנים בהתאם למסלול, לתדירות השיעורים ולגיל. נשמח לבנות עבורכם הצעה מותאמת אישית.',
      contactForPricing: 'לקבלת פרטי מחירים ותהליך ההרשמה, צרו איתנו קשר בטלפון, בוואטסאפ או במייל.',
      registrationStepsTitle: 'איך נרשמים',
      registrationSteps: [
        'יוצרים קשר ומספרים לנו קצת על עצמכם ועל מטרותיכם',
        'קובעים שיעור ניסיון או פגישת היכרות',
        'בוחרים את המסלול המתאים ומתחילים לרקוד',
      ],
    },
    news: {
      title: 'חדשות ועדכונים',
      intro: 'כל מה שקורה בסטודיו — קבוצות חדשות, אירועים ועדכונים.',
      empty: 'אין עדכונים כרגע. חזרו לבקר בקרוב.',
    },
    contact: {
      title: 'צור קשר',
      intro: 'נשמח לשמוע מכם ולעזור לכם למצוא את המסלול המתאים.',
      formTitle: 'השאירו הודעה',
      formName: 'שם מלא',
      formEmail: 'אימייל',
      formPhone: 'טלפון',
      formMessage: 'הודעה',
      formSubmit: 'שליחה',
      detailsTitle: 'פרטי התקשרות',
      hoursTitle: 'שעות פעילות',
      mapTitle: 'מיקום הסטודיו',
    },
    schemaBusinessDescription:
      'ETUDE הוא בית ספר לריקודי בלרום ולטיניים בראשון לציון, המציע שיעורים לכל הגילאים והרמות.',
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      classes: 'Classes',
      schedule: 'Schedule',
      instructors: 'Instructors',
      gallery: 'Gallery',
      pricing: 'Pricing & Registration',
      news: 'News',
      contact: 'Contact',
    },
    common: {
      readMore: 'Read more',
      backToNews: 'Back to news',
      whatsapp: 'WhatsApp',
      call: 'Call',
      email: 'Email',
      viewOnMap: 'View on map',
      allRightsReserved: 'All rights reserved',
      draftNotice: 'The copy on this site is a first-pass draft, pending final content from the client.',
      placeholderImage: 'Placeholder image — to be replaced with real content',
    },
    home: {
      heroEyebrow: 'Ballroom & Latin Dance in Rishon LeZion',
      heroTitle: 'Learn to dance, at your own pace',
      heroSubtitle:
        'Group and private lessons in ballroom and Latin dance, for every age and level — from your first step to the dance floor.',
      heroCtaPrimary: 'View the schedule',
      heroCtaSecondary: 'Get in touch',
      introTitle: 'A dance studio built on patience and progress',
      introBody:
        'We teach ballroom dances, Latin dances, and movement-based fitness lessons for every age and level — complete beginners through advanced dancers. Every class is structured so you feel real progress, with close guidance from our team throughout.',
      highlightsTitle: 'Why ETUDE',
      highlights: [
        { title: 'Every level welcome', body: 'Beginner, intermediate, and advanced groups, plus private lessons at your own pace.' },
        { title: 'A range of styles', body: 'Ballroom, Latin, and movement workshops — all under one roof.' },
        { title: 'Close guidance', body: 'Small groups and personal attention in every class.' },
      ],
      newsTitle: 'What\u2019s happening at the studio',
      ctaBandTitle: 'Ready for your first step?',
      ctaBandBody: 'Leave your details and we\u2019ll get back to you with everything you need to know.',
    },
    about: {
      title: 'About ETUDE',
      intro: 'ETUDE is a dance studio in Rishon LeZion, teaching ballroom and Latin dance to every age and level.',
      body1:
        'The studio was founded on the belief that dance is more than a sport — it\u2019s a way to connect with your body, with music, and with new people. We believe anyone can learn to dance; all it takes is the right place to start.',
      body2:
        'Our team guides students from their very first step, through level-based groups, all the way to private lessons and competition tracks for those interested. Classes combine technique, musicality, and enjoyment — in a supportive, pressure-free atmosphere.',
      valuesTitle: 'Our approach',
      values: [
        { title: 'Professional method', body: 'A structured curriculum that progresses gradually, matched to each student\u2019s level.' },
        { title: 'Warm atmosphere', body: 'A studio where it\u2019s comfortable to make mistakes, practice, and improve.' },
        { title: 'Every age', body: 'From children\u2019s groups to adults — there\u2019s a dance for every stage of life.' },
      ],
    },
    classes: {
      title: 'Classes & Programs',
      intro: 'Three main tracks, for every age and level. Mix and match according to your own goals.',
      categories: [
        {
          title: 'Ballroom dances',
          body: 'Waltz, tango, foxtrot and more — the classic foundation of partner dancing, taught gradually and precisely.',
        },
        {
          title: 'Latin dances',
          body: 'Cha-cha, samba, rumba and salsa — rhythm, energy, and musicality in every move.',
        },
        {
          title: 'Sport & movement lessons',
          body: 'Classes combining fitness, coordination, and dance — suitable for every age, no prior experience needed.',
        },
      ],
      levelsTitle: 'Skill levels',
      levels: [
        { title: 'Beginners', body: 'No prior experience needed — we start from the very first step.' },
        { title: 'Intermediate', body: 'For students who already know the basics and want to go deeper.' },
        { title: 'Advanced', body: 'Precise technical work, including an optional competition track.' },
        { title: 'Private lessons', body: 'One-on-one guidance at your own pace, for any level or goal.' },
      ],
      cta: 'Contact us or check the schedule for details and registration.',
    },
    schedule: {
      title: 'Schedule',
      intro: 'Classes run throughout the week. The full timetable is updated periodically — contact us in advance to confirm a spot.',
      placeholderNotice: 'The full schedule will be added soon. In the meantime, the studio is open 8:00 AM–9:00 PM, every day.',
      columns: { day: 'Day', time: 'Time', class: 'Class', level: 'Level' },
    },
    instructors: {
      title: 'Instructors',
      intro: 'Certified, experienced instructors who guide every student personally.',
      placeholderNotice: 'Full instructor profiles are coming soon.',
    },
    gallery: {
      title: 'Gallery',
      intro: 'Moments from the studio, our classes, and our events.',
      placeholderNotice: 'Photos and videos from the studio will be added here soon.',
    },
    pricing: {
      title: 'Pricing & Registration',
      intro: 'Pricing varies by track, class frequency, and age. We\u2019re happy to put together a plan tailored to you.',
      contactForPricing: 'For pricing details and the registration process, contact us by phone, WhatsApp, or email.',
      registrationStepsTitle: 'How to register',
      registrationSteps: [
        'Get in touch and tell us a bit about yourself and your goals',
        'Book a trial class or an introductory meeting',
        'Choose the right track and start dancing',
      ],
    },
    news: {
      title: 'News & Updates',
      intro: 'Everything happening at the studio — new groups, events, and updates.',
      empty: 'No updates right now. Check back soon.',
    },
    contact: {
      title: 'Contact',
      intro: 'We\u2019d love to hear from you and help you find the right track.',
      formTitle: 'Send us a message',
      formName: 'Full name',
      formEmail: 'Email',
      formPhone: 'Phone',
      formMessage: 'Message',
      formSubmit: 'Send',
      detailsTitle: 'Contact details',
      hoursTitle: 'Opening hours',
      mapTitle: 'Studio location',
    },
    schemaBusinessDescription:
      'ETUDE is a ballroom and Latin dance school in Rishon LeZion, offering classes for every age and level.',
  },
  ru: {
    nav: {
      home: 'Главная',
      about: 'О школе',
      classes: 'Занятия',
      schedule: 'Расписание',
      instructors: 'Преподаватели',
      gallery: 'Галерея',
      pricing: 'Цены и запись',
      news: 'Новости',
      contact: 'Контакты',
    },
    common: {
      readMore: 'Читать далее',
      backToNews: 'Назад к новостям',
      whatsapp: 'WhatsApp',
      call: 'Позвонить',
      email: 'Написать',
      viewOnMap: 'Показать на карте',
      allRightsReserved: 'Все права защищены',
      draftNotice: 'Текст на сайте — черновой вариант и ожидает финального контента от клиента.',
      placeholderImage: 'Временное изображение — будет заменено на реальный контент',
    },
    home: {
      heroEyebrow: 'Бальные и латиноамериканские танцы в Ришон-ле-Ционе',
      heroTitle: 'Учитесь танцевать в своём темпе',
      heroSubtitle:
        'Групповые и индивидуальные занятия бальными и латиноамериканскими танцами для любого возраста и уровня — от первого шага до танцпола.',
      heroCtaPrimary: 'Смотреть расписание',
      heroCtaSecondary: 'Связаться с нами',
      introTitle: 'Студия танца с профессиональной и тёплой атмосферой',
      introBody:
        'Мы преподаём бальные танцы, латиноамериканские танцы и спортивно-танцевальные занятия для любого возраста и уровня — от полных новичков до продвинутых танцоров. Каждое занятие построено так, чтобы вы ощущали реальный прогресс, при постоянной поддержке нашей команды.',
      highlightsTitle: 'Почему ETUDE',
      highlights: [
        { title: 'Любой уровень', body: 'Группы для начинающих, продолжающих и продвинутых, а также индивидуальные занятия.' },
        { title: 'Разные стили', body: 'Бальные, латиноамериканские танцы и танцевальные мастер-классы — в одном месте.' },
        { title: 'Индивидуальный подход', body: 'Небольшие группы и внимание к каждому ученику на каждом занятии.' },
      ],
      newsTitle: 'Что происходит в студии',
      ctaBandTitle: 'Готовы сделать первый шаг?',
      ctaBandBody: 'Оставьте свои данные, и мы свяжемся с вами со всей информацией о подходящих занятиях.',
    },
    about: {
      title: 'О школе ETUDE',
      intro: 'ETUDE — студия танца в Ришон-ле-Ционе, где преподают бальные и латиноамериканские танцы для любого возраста и уровня.',
      body1:
        'Студия была создана из убеждения, что танец — это не только спорт, но и способ почувствовать своё тело, музыку и новых людей. Мы верим, что танцевать может научиться каждый — нужно лишь найти правильное место, чтобы начать.',
      body2:
        'Наша команда сопровождает учеников с самого первого шага, через группы по уровням, вплоть до индивидуальных занятий и, при желании, соревновательного направления. Занятия сочетают технику, музыкальность и удовольствие — в поддерживающей и непринуждённой атмосфере.',
      valuesTitle: 'Наш подход',
      values: [
        { title: 'Профессионализм', body: 'Структурированная методика, которая развивается постепенно, соответственно уровню ученика.' },
        { title: 'Тёплая атмосфера', body: 'Студия, где комфортно ошибаться, тренироваться и расти.' },
        { title: 'Для любого возраста', body: 'От детских групп до взрослых — танец найдётся для любого этапа жизни.' },
      ],
    },
    classes: {
      title: 'Занятия и программы',
      intro: 'Три основных направления для любого возраста и уровня. Их можно сочетать в зависимости от ваших целей.',
      categories: [
        {
          title: 'Бальные танцы',
          body: 'Вальс, танго, фокстрот и другие — классическая основа парного танца, изучается постепенно и точно.',
        },
        {
          title: 'Латиноамериканские танцы',
          body: 'Ча-ча-ча, самба, румба и сальса — ритм, энергия и музыкальность в каждом движении.',
        },
        {
          title: 'Спортивно-танцевальные занятия',
          body: 'Занятия, сочетающие физическую подготовку, координацию и танец — подходят для любого возраста, опыт не требуется.',
        },
      ],
      levelsTitle: 'Уровни обучения',
      levels: [
        { title: 'Начинающие', body: 'Предыдущий опыт не требуется — начинаем с самого первого шага.' },
        { title: 'Продолжающие', body: 'Для тех, кто уже знает основы и хочет двигаться дальше.' },
        { title: 'Продвинутые', body: 'Точная техническая работа, включая возможность соревновательного направления.' },
        { title: 'Индивидуальные занятия', body: 'Персональное сопровождение в вашем темпе, для любого уровня и цели.' },
      ],
      cta: 'Свяжитесь с нами или посмотрите расписание для подробностей и записи.',
    },
    schedule: {
      title: 'Расписание',
      intro: 'Занятия проходят в течение всей недели. Полное расписание периодически обновляется — для подтверждения места рекомендуем связаться заранее.',
      placeholderNotice: 'Полное расписание будет добавлено в ближайшее время. Пока студия открыта с 8:00 до 21:00 каждый день.',
      columns: { day: 'День', time: 'Время', class: 'Занятие', level: 'Уровень' },
    },
    instructors: {
      title: 'Преподаватели',
      intro: 'Сертифицированные, опытные преподаватели, которые сопровождают каждого ученика лично.',
      placeholderNotice: 'Полные профили преподавателей будут добавлены в ближайшее время.',
    },
    gallery: {
      title: 'Галерея',
      intro: 'Моменты из жизни студии, занятий и мероприятий.',
      placeholderNotice: 'Фото и видео из студии появятся здесь в ближайшее время.',
    },
    pricing: {
      title: 'Цены и запись',
      intro: 'Стоимость зависит от направления, частоты занятий и возраста. Будем рады подобрать для вас индивидуальное предложение.',
      contactForPricing: 'Для уточнения цен и процесса записи свяжитесь с нами по телефону, WhatsApp или email.',
      registrationStepsTitle: 'Как записаться',
      registrationSteps: [
        'Свяжитесь с нами и расскажите немного о себе и своих целях',
        'Запишитесь на пробное занятие или ознакомительную встречу',
        'Выберите подходящее направление и начните танцевать',
      ],
    },
    news: {
      title: 'Новости и обновления',
      intro: 'Всё, что происходит в студии — новые группы, мероприятия и обновления.',
      empty: 'Пока нет обновлений. Загляните позже.',
    },
    contact: {
      title: 'Контакты',
      intro: 'Будем рады услышать вас и помочь подобрать подходящее направление.',
      formTitle: 'Написать нам',
      formName: 'Полное имя',
      formEmail: 'Email',
      formPhone: 'Телефон',
      formMessage: 'Сообщение',
      formSubmit: 'Отправить',
      detailsTitle: 'Контактные данные',
      hoursTitle: 'Часы работы',
      mapTitle: 'Расположение студии',
    },
    schemaBusinessDescription:
      'ETUDE — школа бальных и латиноамериканских танцев в Ришон-ле-Ционе, предлагающая занятия для любого возраста и уровня.',
  },
} satisfies Record<Lang, unknown>;

export function t(lang: Lang) {
  return translations[lang];
}
