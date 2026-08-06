// Central business configuration.
// Non-technical staff should NOT need to touch this file — it's for the
// developer to update phone/address/socials/etc. For News & Schedule content,
// use the GitHub Actions workflows instead (see README).

export const SITE = {
  // Domain & repo
  domain: 'etude.ristar.co',
  siteUrl: 'https://etude.ristar.co',
  githubOrg: 'ristar-co', // GitHub org slugs cannot contain dots — adjust if your
                          // actual org handle differs from "ristar.co"
  repoName: '2mmisha',

  // Brand
  brandName: 'ETUDE',
  brandNameLocalized: {
    he: 'אטיוד',
    en: 'ETUDE',
    ru: 'Этюд',
  },
  tagline: {
    he: 'בית ספר לריקודי בלרום ולטיניים',
    en: 'Ballroom & Latin Dance School',
    ru: 'Школа бальных и латиноамериканских танцев',
  },

  // Contact
  phone: '+972-53-472-6458',
  phoneDisplay: '053-472-6458',
  whatsapp: '972534726458', // international format, no +, no leading 0
  email: '2mmedia.il@gmail.com',

  // Location
  address: {
    street: 'Meow Pow St. 34',
    city: 'Rishon LeZion',
    cityLocalized: {
      he: 'ראשון לציון',
      en: 'Rishon LeZion',
      ru: 'Ришон-ле-Цион',
    },
    country: 'Israel',
    countryCode: 'IL',
    region: 'Center District',
  },

  // Coordinates for map embed — approximate center of Rishon LeZion,
  // documented placeholder until the exact studio address is geocoded
  geo: {
    lat: 31.9730,
    lng: 34.7925,
  },

  hours: {
    // Same hours every day per client
    opens: '08:00',
    closes: '21:00',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },

  social: {
    instagram: 'https://www.instagram.com/etude_il/',
  },

  // Analytics — inert until a real ID is supplied. Leave as-is to ship with
  // analytics disabled; replace with a real G-XXXXXXX ID to activate.
  ga4MeasurementId: '', // e.g. 'G-XXXXXXXXXX'

  // Contact form relay (FormSubmit — no backend required)
  formSubmitEndpoint: 'https://formsubmit.co/2mmedia.il@gmail.com',
} as const;

export type SiteConfig = typeof SITE;
