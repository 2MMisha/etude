// Studio photos (ETUDE year-end recital, 2026). Optimized copies live in
// public/images/studio/; parents' consent for the children shown was
// confirmed by the owner (Oct 2026).
import type { Lang } from '../lib/languages';

export interface Photo {
  src: string;
  width: number;
  height: number;
  alt: Record<Lang, string>;
}

const portrait = { width: 900, height: 1600 };
const landscape = { width: 1600, height: 900 };

export const PHOTOS = {
  recitalGroup: {
    src: '/images/studio/etude-dance-school-recital-group.webp',
    ...landscape,
    alt: {
      he: 'תלמידי בית הספר לריקוד אטיוד בתמונה קבוצתית במופע סוף השנה',
      en: 'ETUDE dance school students in a group photo at the year-end recital',
      ru: 'Ученики школы танцев «Этюд» на общем фото после отчётного концерта',
    },
  },
  kidsGroup: {
    src: '/images/studio/kids-dance-group-rishon-lezion.webp',
    ...landscape,
    alt: {
      he: 'ילדים מקבוצת הריקוד של אטיוד בתלבושות הופעה, ראשון לציון',
      en: 'Children from an ETUDE dance group in performance costumes, Rishon LeZion',
      ru: 'Дети из танцевальной группы «Этюда» в концертных костюмах, Ришон-ле-Цион',
    },
  },
  kidsMedals: {
    src: '/images/studio/kids-dance-recital-medals.webp',
    width: 1600,
    height: 1066,
    alt: {
      he: 'ילדים עם מדליות ומורה במופע סוף השנה של אטיוד',
      en: 'Children with medals and their teacher at the ETUDE year-end recital',
      ru: 'Дети с медалями и педагог на отчётном концерте «Этюда»',
    },
  },
  girlGold: {
    src: '/images/studio/girl-dance-recital-gold.webp',
    ...portrait,
    alt: {
      he: 'ילדה בתלבושת זהב רוקדת במופע של אטיוד',
      en: 'A girl in a gold costume dancing at the ETUDE recital',
      ru: 'Девочка в золотом костюме танцует на отчётном концерте «Этюда»',
    },
  },
  girlLatin: {
    src: '/images/studio/girl-latin-dance-kids.webp',
    ...portrait,
    alt: {
      he: 'תלמידה צעירה רוקדת ריקוד לטיני במופע של אטיוד, ראשון לציון',
      en: 'A young student dancing Latin at the ETUDE recital in Rishon LeZion',
      ru: 'Юная ученица танцует латину на отчётном концерте «Этюда» в Ришон-ле-Ционе',
    },
  },
  teacherWithStudent: {
    src: '/images/studio/dance-teacher-with-student.webp',
    ...portrait,
    alt: {
      he: 'מורה רוקד עם תלמידה צעירה במופע של אטיוד',
      en: 'A teacher dancing with a young student at the ETUDE recital',
      ru: 'Педагог танцует с юной ученицей на отчётном концерте «Этюда»',
    },
  },
  standardCouple: {
    src: '/images/studio/ballroom-couple-standard.webp',
    ...portrait,
    alt: {
      he: 'זוג רוקד ריקוד סטנדרט במופע סוף השנה של אטיוד',
      en: 'A couple dancing ballroom (standard) at the ETUDE year-end recital',
      ru: 'Пара танцует европейскую программу на отчётном концерте «Этюда»',
    },
  },
  standardCoupleGreen: {
    src: '/images/studio/ballroom-couple-green-dress.webp',
    ...portrait,
    alt: {
      he: 'זוג בשמלה ירוקה רוקד ריקוד סטנדרט במופע של אטיוד',
      en: 'A ballroom couple in a green gown performing at the ETUDE recital',
      ru: 'Пара в зелёном платье исполняет европейский танец на концерте «Этюда»',
    },
  },
  redDress: {
    src: '/images/studio/ballroom-dancer-red-dress.webp',
    ...portrait,
    alt: {
      he: 'רקדנית בשמלה אדומה במופע של אטיוד',
      en: 'A dancer in a red ballroom gown at the ETUDE recital',
      ru: 'Танцовщица в красном бальном платье на отчётном концерте «Этюда»',
    },
  },
  latinCouple: {
    src: '/images/studio/latin-dance-couple.webp',
    ...portrait,
    alt: {
      he: 'זוג רוקד ריקוד לטיני במופע סוף השנה של אטיוד',
      en: 'A couple performing a Latin dance at the ETUDE year-end recital',
      ru: 'Пара исполняет латиноамериканский танец на отчётном концерте «Этюда»',
    },
  },
  latinPair: {
    src: '/images/studio/latin-dance-pair-recital.webp',
    ...portrait,
    alt: {
      he: 'זוג רוקד ריקוד לטיני על רחבת הריקודים במופע של אטיוד',
      en: 'A Latin dance pair on the floor at the ETUDE recital',
      ru: 'Пара танцует латину на отчётном концерте «Этюда»',
    },
  },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;
