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
      availableInLangPrefix: 'האתר זמין גם ב-',
      dismiss: 'סגירה',
      privacy: 'מדיניות פרטיות',
      accessibility: 'הצהרת נגישות',
      viewOnGoogleMaps: 'ניווט ב-Google Maps',
    },
    home: {
      heroEyebrow: 'ריקודי בלרום ולטיניים בראשון לציון',
      heroTitle: 'ללמוד לרקוד, בקצב שלכם',
      heroSubtitle:
        'שיעורים קבוצתיים ופרטיים בריקודי בלרום ולטיניים, לכל הגילאים והרמות — מהצעד הראשון ועד לרחבת הריקודים.',
      heroCtaPrimary: 'שיעור ניסיון חינם',
      heroCtaSecondary: 'לוח השיעורים',
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
    testimonials: {
      title: 'מה אומרים אצלנו',
      placeholderNotice: 'הציטוטים שלהלן הם דוגמאות זמניות להמחשת העיצוב, ויוחלפו בהמלצות אמיתיות של תלמידים.',
      items: [
        {
          quote: 'הצטרפתי בלי שום ניסיון קודם, והיום אני כבר לא מפספסת שיעור. האווירה תומכת וכיף ללמוד כאן.',
          role: 'תלמידה, קבוצת מתחילים',
        },
        {
          quote: 'הילדים שלי מחכים לשיעור כל שבוע. הצוות סבלני ומקצועי, ורואים התקדמות אמיתית.',
          role: 'הורה לתלמידים בסטודיו',
        },
        {
          quote: 'עברתי לקבוצת המתקדמים אחרי כשנה, וההדרכה הטכנית פה ברמה גבוהה מאוד.',
          role: 'תלמיד, קבוצת מתקדמים',
        },
      ],
    },
    promo: {
      badge: 'מבצע',
      trialTitle: 'שיעור ניסיון קבוצתי ראשון — חינם!',
      trialBody: 'בואו להתנסות ללא שום התחייבות — השיעור הקבוצתי הראשון שלכם אצלנו על חשבון הבית.',
      olimTitle: 'הנחה לעולים חדשים',
      olimBody: 'עולים חדשים נהנים מהנחה על המנוי: 90% הנחה בשנה הראשונה, 50% בשנה השנייה ו-15% בשנה השלישית.',
    },
    faq: {
      title: 'שאלות נפוצות',
      items: [
        {
          q: 'האם השיעור הראשון בחינם?',
          a: 'כן — השיעור הקבוצתי הראשון שלכם אצלנו הוא ללא עלות וללא כל התחייבות מצדכם.',
        },
        {
          q: 'אני עולה חדש/ה — האם מגיעה לי הנחה?',
          a: 'כן. עולים חדשים זכאים להנחה על המנוי: 90% הנחה בשנה הראשונה, 50% בשנה השנייה ו-15% בשנה השלישית.',
        },
        {
          q: 'אין לי שום ניסיון קודם בריקוד — זה מתאים לי?',
          a: 'בהחלט. קבוצות המתחילים שלנו בנויות בדיוק בשביל זה, ואפשר גם לקבוע שיעור פרטי אם תעדיפו קצב אישי.',
        },
        {
          q: 'מאיזה גיל אפשר להצטרף?',
          a: 'יש לנו קבוצות לכל הגילאים — מילדים ועד מבוגרים, בכל רמות הניסיון.',
        },
        {
          q: 'איך נרשמים או קובעים שיעור ניסיון?',
          a: 'יוצרים איתנו קשר בטלפון, בוואטסאפ או במייל, ואנחנו נקבע יחד את השיעור המתאים לכם.',
        },
      ],
    },
    privacy: {
      title: 'מדיניות פרטיות',
      updatedNote: 'טיוטה ראשונית — מומלץ לבצע בדיקה משפטית לפני פרסום סופי.',
      intro:
        'הפרטיות שלכם חשובה לנו. מסמך זה מסביר אילו מידע אנו אוספים באתר ETUDE, כיצד אנו משתמשים בו, ועם מי הוא עשוי להיות משותף.',
      sections: [
        {
          title: 'מידע שאנו אוספים',
          body: 'כאשר אתם ממלאים את טופס יצירת הקשר, אנו אוספים את השם, כתובת האימייל, מספר הטלפון וההודעה שהזנתם. איננו אוספים מידע זה באופן אוטומטי — רק כאשר אתם בוחרים לשלוח אותו במפורש.',
        },
        {
          title: 'שירותי צד שלישי',
          body: 'טופס יצירת הקשר מופעל באמצעות שירות חיצוני (FormSubmit) השולח את ההודעה ישירות לתיבת המייל שלנו. כשמופעל, ניתוח תנועה באתר מתבצע באמצעות Google Analytics. ווידג\'ט הנגישות באתר (Tabnav) עשוי לטעון סקריפט מצד שלישי לצורך מתן כלי נגישות. לכל אחד מהשירותים הללו מדיניות פרטיות משלו.',
        },
        {
          title: 'עוגיות (Cookies)',
          body: 'האתר עשוי להשתמש בעוגיות בסיסיות הנדרשות לתפעולו, ובעוגיות אנליטיקה כאשר Google Analytics מופעל, לצורך הבנת השימוש הכללי באתר.',
        },
        {
          title: 'כיצד אנו משתמשים במידע',
          body: 'אנו משתמשים במידע שאתם שולחים אך ורק כדי להשיב לפנייתכם ולתאם שיעורים או פרטים נוספים. איננו מוכרים או משכירים את פרטיכם לגורמים חיצוניים.',
        },
        {
          title: 'שמירת מידע',
          body: 'הודעות שנשלחות דרך טופס יצירת הקשר נשמרות בתיבת המייל שלנו לצורך מעקב ותקשורת שוטפת, ואינן נשמרות במאגר מידע נפרד.',
        },
        {
          title: 'הזכויות שלכם',
          body: 'ניתן לפנות אלינו בכל עת בבקשה לעיין, לתקן או למחוק מידע אישי שנשלח אלינו דרך האתר.',
        },
        {
          title: 'יצירת קשר',
          body: 'לשאלות בנושא פרטיות, ניתן לפנות אלינו בטלפון, בוואטסאפ או במייל — הפרטים המלאים מופיעים בעמוד "צור קשר".',
        },
      ],
    },
    accessibility: {
      title: 'הצהרת נגישות',
      updatedNote: 'עודכן לאחרונה: אוגוסט 2026',
      intro:
        'צוות ETUDE רואה חשיבות רבה במתן שירות שוויוני ונגיש לכלל הגולשים, לרבות אנשים עם מוגבלות. אנו פועלים להנגשת האתר בהתאם לתקן הישראלי (ת"י 5568) ברמה AA, המבוסס על הנחיות WCAG 2.1 הבינלאומיות.',
      sections: [
        {
          title: 'ווידג\'ט הנגישות',
          body: 'באתר מותקן ווידג\'ט נגישות (Tabnav), המאפשר לגולשים להתאים את תצוגת האתר לצרכיהם: הגדלת טקסט, שינוי ניגודיות צבעים, הדגשת קישורים, ניווט מקלדת, ועוד. ניתן להפעיל את הווידג\'ט באמצעות סמל הנגישות המוצג באתר.',
        },
        {
          title: 'מגבלות ידועות',
          body: 'אנו פועלים באופן שוטף לשיפור נגישות האתר. אם נתקלתם באלמנט שאינו נגיש כראוי, נשמח שתעדכנו אותנו כדי שנוכל לטפל בכך בהקדם.',
        },
        {
          title: 'פניות בנושא נגישות',
          body: 'ניתן לפנות בכל נושא הקשור לנגישות האתר ישירות אל רכז הנגישות מטעם האתר.',
        },
      ],
      coordinatorTitle: 'רכז נגישות',
    },
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
      availableInLangPrefix: 'This site is also available in ',
      dismiss: 'Dismiss',
      privacy: 'Privacy Policy',
      accessibility: 'Accessibility Statement',
      viewOnGoogleMaps: 'Get directions on Google Maps',
    },
    home: {
      heroEyebrow: 'Ballroom & Latin Dance in Rishon LeZion',
      heroTitle: 'Learn to dance, at your own pace',
      heroSubtitle:
        'Group and private lessons in ballroom and Latin dance, for every age and level — from your first step to the dance floor.',
      heroCtaPrimary: 'Book a free trial class',
      heroCtaSecondary: 'View the schedule',
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
    testimonials: {
      title: 'What people say',
      placeholderNotice: 'The quotes below are temporary placeholders to show the design — real student testimonials will replace them.',
      items: [
        {
          quote: 'I joined with zero prior experience, and now I never miss a class. The atmosphere is supportive and genuinely fun to learn in.',
          role: 'Student, beginner group',
        },
        {
          quote: 'My kids look forward to class every week. The team is patient and professional, and we see real progress.',
          role: 'Parent of studio students',
        },
        {
          quote: 'I moved up to the advanced group after about a year, and the technical coaching here is excellent.',
          role: 'Student, advanced group',
        },
      ],
    },
    promo: {
      badge: 'Special offer',
      trialTitle: 'Your first group trial class is free',
      trialBody: 'Come try it with no commitment — your first group class with us is on the house.',
      olimTitle: 'Discount for new immigrants (Olim)',
      olimBody: 'New immigrants (Olim) receive a discount on subscriptions: 90% off in the first year, 50% in the second year, and 15% in the third year.',
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          q: 'Is the first class really free?',
          a: 'Yes — your first group class with us is completely free, with no commitment on your part.',
        },
        {
          q: "I'm a new immigrant (Oleh/Olah) — do I get a discount?",
          a: 'Yes. New immigrants receive a discount on subscriptions: 90% off in the first year, 50% in the second year, and 15% in the third year.',
        },
        {
          q: "I have zero dance experience — is this for me?",
          a: 'Absolutely. Our beginner groups are built exactly for that, and you can also book a private lesson if you prefer a one-on-one pace.',
        },
        {
          q: 'What ages can join?',
          a: 'We have groups for every age, from children to adults, at every experience level.',
        },
        {
          q: 'How do I register or book a trial class?',
          a: "Contact us by phone, WhatsApp, or email, and we'll set up the right class together.",
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      updatedNote: 'First-pass draft — recommended to have this reviewed by counsel before final publication.',
      intro:
        'Your privacy matters to us. This page explains what information the ETUDE website collects, how we use it, and who it may be shared with.',
      sections: [
        {
          title: 'Information we collect',
          body: "When you fill out the contact form, we collect the name, email address, phone number, and message you provide. We don't collect this information automatically — only when you choose to submit it.",
        },
        {
          title: 'Third-party services',
          body: "The contact form is powered by an external service (FormSubmit) that delivers your message directly to our email inbox. When enabled, site traffic is analyzed using Google Analytics. The site's accessibility widget (Tabnav) may load a third-party script to provide accessibility tools. Each of these services has its own privacy policy.",
        },
        {
          title: 'Cookies',
          body: 'The site may use basic cookies required for it to function, and analytics cookies when Google Analytics is enabled, to understand general site usage.',
        },
        {
          title: 'How we use your information',
          body: "We use the information you submit solely to respond to your inquiry and arrange classes or further details. We don't sell or rent your details to third parties.",
        },
        {
          title: 'Data retention',
          body: 'Messages sent through the contact form are kept in our email inbox for ongoing follow-up and communication, and are not stored in a separate database.',
        },
        {
          title: 'Your rights',
          body: 'You may contact us at any time to review, correct, or request deletion of personal information you\u2019ve submitted through this site.',
        },
        {
          title: 'Contact us',
          body: 'For privacy-related questions, reach us by phone, WhatsApp, or email — full details are on the Contact page.',
        },
      ],
    },
    accessibility: {
      title: 'Accessibility Statement',
      updatedNote: 'Last updated: August 2026',
      intro:
        'The ETUDE team is committed to providing an equal and accessible experience for all visitors, including people with disabilities. We work to make this site accessible in line with the Israeli Standard (IS 5568) at level AA, based on the international WCAG 2.1 guidelines.',
      sections: [
        {
          title: 'Accessibility widget',
          body: "This site includes an accessibility widget (Tabnav) that lets visitors adjust the site to their needs: enlarging text, changing color contrast, highlighting links, keyboard navigation, and more. Open it via the accessibility icon shown on the site.",
        },
        {
          title: 'Known limitations',
          body: "We're continuously working to improve the site's accessibility. If you come across an element that isn't properly accessible, we'd appreciate you letting us know so we can address it promptly.",
        },
        {
          title: 'Accessibility inquiries',
          body: "For any accessibility-related matter on this site, you're welcome to contact the site's accessibility coordinator directly.",
        },
      ],
      coordinatorTitle: 'Accessibility Coordinator',
    },
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
      availableInLangPrefix: 'Этот сайт также доступен на ',
      dismiss: 'Закрыть',
      privacy: 'Политика конфиденциальности',
      accessibility: 'Заявление о доступности',
      viewOnGoogleMaps: 'Маршрут на Google Maps',
    },
    home: {
      heroEyebrow: 'Бальные и латиноамериканские танцы в Ришон-ле-Ционе',
      heroTitle: 'Учитесь танцевать в своём темпе',
      heroSubtitle:
        'Групповые и индивидуальные занятия бальными и латиноамериканскими танцами для любого возраста и уровня — от первого шага до танцпола.',
      heroCtaPrimary: 'Бесплатное пробное занятие',
      heroCtaSecondary: 'Смотреть расписание',
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
    testimonials: {
      title: 'Отзывы наших учеников',
      placeholderNotice: 'Приведённые ниже цитаты — временные примеры для демонстрации дизайна, они будут заменены на реальные отзывы учеников.',
      items: [
        {
          quote: 'Я начала без какого-либо опыта, а теперь не пропускаю ни одного занятия. Атмосфера очень поддерживающая, заниматься по-настоящему интересно.',
          role: 'Ученица, группа начинающих',
        },
        {
          quote: 'Мои дети ждут занятие каждую неделю. Команда терпеливая и профессиональная, виден реальный прогресс.',
          role: 'Родитель учеников студии',
        },
        {
          quote: 'Через год я перешёл в группу продвинутых, и техническая подготовка здесь на очень высоком уровне.',
          role: 'Ученик, группа продвинутых',
        },
      ],
    },
    promo: {
      badge: 'Специальное предложение',
      trialTitle: 'Первое групповое пробное занятие — бесплатно',
      trialBody: 'Приходите попробовать без каких-либо обязательств — первое групповое занятие у нас за наш счёт.',
      olimTitle: 'Скидка для новых репатриантов (олим)',
      olimBody: 'Новые репатрианты (олим) получают скидку на абонемент: 90% в первый год, 50% во второй год и 15% в третий год.',
    },
    faq: {
      title: 'Часто задаваемые вопросы',
      items: [
        {
          q: 'Первое занятие действительно бесплатное?',
          a: 'Да — ваше первое групповое занятие у нас полностью бесплатно и без каких-либо обязательств.',
        },
        {
          q: 'Я новый репатриант (оле/ola) — положена ли мне скидка?',
          a: 'Да. Новые репатрианты получают скидку на абонемент: 90% в первый год, 50% во второй год и 15% в третий год.',
        },
        {
          q: 'У меня совсем нет опыта в танцах — подойдёт ли мне это?',
          a: 'Безусловно. Наши группы для начинающих созданы именно для этого, а также можно записаться на индивидуальное занятие, если вы предпочитаете личный темп.',
        },
        {
          q: 'С какого возраста можно записаться?',
          a: 'У нас есть группы для любого возраста — от детей до взрослых, любого уровня подготовки.',
        },
        {
          q: 'Как записаться или забронировать пробное занятие?',
          a: 'Свяжитесь с нами по телефону, WhatsApp или email, и мы вместе подберём подходящее занятие.',
        },
      ],
    },
    privacy: {
      title: 'Политика конфиденциальности',
      updatedNote: 'Черновой вариант — рекомендуется юридическая проверка перед окончательной публикацией.',
      intro:
        'Ваша конфиденциальность важна для нас. Этот документ объясняет, какую информацию собирает сайт ETUDE, как мы её используем и с кем можем ею делиться.',
      sections: [
        {
          title: 'Какую информацию мы собираем',
          body: 'Когда вы заполняете контактную форму, мы собираем указанные вами имя, email, номер телефона и сообщение. Мы не собираем эту информацию автоматически — только когда вы сами решаете её отправить.',
        },
        {
          title: 'Сторонние сервисы',
          body: 'Контактная форма работает через внешний сервис (FormSubmit), который доставляет сообщение напрямую на нашу почту. При включении аналитика посещаемости сайта осуществляется через Google Analytics. Виджет доступности сайта (Tabnav) может загружать сторонний скрипт для предоставления инструментов доступности. У каждого из этих сервисов есть собственная политика конфиденциальности.',
        },
        {
          title: 'Файлы cookie',
          body: 'Сайт может использовать базовые cookie-файлы, необходимые для его работы, а также аналитические cookie при включённом Google Analytics — для понимания общей статистики использования сайта.',
        },
        {
          title: 'Как мы используем вашу информацию',
          body: 'Мы используем предоставленную вами информацию исключительно для ответа на ваш запрос и организации занятий или уточнения деталей. Мы не продаём и не передаём ваши данные третьим лицам.',
        },
        {
          title: 'Хранение данных',
          body: 'Сообщения, отправленные через контактную форму, хранятся в нашей почте для дальнейшей связи и не сохраняются в отдельной базе данных.',
        },
        {
          title: 'Ваши права',
          body: 'Вы можете в любое время связаться с нами с просьбой ознакомиться, исправить или удалить личную информацию, отправленную через этот сайт.',
        },
        {
          title: 'Связаться с нами',
          body: 'По вопросам конфиденциальности свяжитесь с нами по телефону, WhatsApp или email — полные контактные данные указаны на странице «Контакты».',
        },
      ],
    },
    accessibility: {
      title: 'Заявление о доступности',
      updatedNote: 'Последнее обновление: август 2026 г.',
      intro:
        'Команда ETUDE придаёт большое значение равному и доступному обслуживанию всех посетителей, включая людей с ограниченными возможностями. Мы стремимся сделать сайт доступным в соответствии с израильским стандартом (ת"י 5568) уровня AA, основанным на международных рекомендациях WCAG 2.1.',
      sections: [
        {
          title: 'Виджет доступности',
          body: 'На сайте установлен виджет доступности (Tabnav), позволяющий посетителям настраивать отображение сайта под свои потребности: увеличение текста, изменение контрастности, выделение ссылок, навигация с клавиатуры и другое. Откройте его с помощью значка доступности на сайте.',
        },
        {
          title: 'Известные ограничения',
          body: 'Мы постоянно работаем над улучшением доступности сайта. Если вы столкнулись с элементом, который недостаточно доступен, будем благодарны, если вы сообщите нам об этом, чтобы мы могли оперативно это исправить.',
        },
        {
          title: 'Обращения по вопросам доступности',
          body: 'По любым вопросам, связанным с доступностью сайта, вы можете обратиться напрямую к координатору по доступности сайта.',
        },
      ],
      coordinatorTitle: 'Координатор по доступности',
    },
  },
} satisfies Record<Lang, unknown>;

export function t(lang: Lang) {
  return translations[lang];
}
