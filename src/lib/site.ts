// Central business configuration.
// The fields sourced from settings below are editable by staff through the
// hidden /admin/ panel's "Site settings" tab (see README) — everything else
// here (domain, brand, taglines, address locality/region, opening days,
// analytics/accessibility embeds) is developer-only and rarely changes, so
// it stays a plain code edit.
import settings from '../data/site-settings.json';

export const SITE = {
  // Domain & repo
  domain: 'etude.ristar.co',
  siteUrl: 'https://etude.ristar.co',
  // Used at runtime by the /admin/ panel to target the right repo via the
  // GitHub API — keep both fields matching the actual origin remote.
  githubOrg: '2MMisha',
  repoName: 'etude',

  // Brand
  brandName: 'ETUDE',
  brandNameLocalized: {
    he: 'אטיוד',
    en: 'ETUDE',
    ru: 'Этюд',
  },
  // Every name people (and AI assistants) may use, so "ETUDE" isn't confused
  // with other brands of the same name. Used by the JSON-LD and llms.txt.
  alternateNames: ['ETUDE', 'ETUDE Dance School', 'אטיוד', 'סטודיו אטיוד לריקוד', 'Этюд', 'Школа танцев Этюд'],
  // Cities students actually come from (per the owner, Oct 2026).
  areaServed: ['Rishon LeZion', 'Holon', 'Bat Yam', 'Tel Aviv', 'Jerusalem', 'Ariel'],
  tagline: {
    he: 'בית ספר לריקודי סטנדרט ולטיניים',
    en: 'Ballroom & Latin Dance School',
    ru: 'Школа бальных и латиноамериканских танцев',
  },

  // Contact — editable via /admin/ "Site settings"
  phone: settings.phone,
  phoneDisplay: settings.phoneDisplay,
  whatsapp: settings.whatsapp, // international format, no +, no leading 0
  email: settings.email,

  // Location — street is editable via /admin/; the rest rarely changes
  address: {
    street: settings.address.street,
    city: 'Rishon LeZion',
    cityLocalized: {
      he: 'ראשון לציון',
      en: 'Rishon LeZion',
      ru: 'Ришон-ле-Цион',
    },
    postalCode: '7526645',
    country: 'Israel',
    countryCode: 'IL',
    region: 'Center District',
  },

  // Coordinates for map embed — editable via /admin/ once the exact studio
  // address is geocoded (right-click the spot on Google Maps / OpenStreetMap).
  geo: settings.geo,

  hours: {
    // Editable via /admin/; same hours every day per client, so "days" (which
    // day names to display) stays a developer-only list below.
    opens: settings.hours.opens,
    closes: settings.hours.closes,
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },

  // Editable via /admin/
  social: settings.social,

  // Google Business Profile link — editable via /admin/
  googleMapsUrl: settings.googleMapsUrl,
  // Google Maps place ID of the studio (from the Google Business Profile).
  googlePlaceId: 'ChIJ8XLGz3u1AhUR4HEpeYoEjgU',

  // Promotions — editable via /admin/. Turn "active" off to hide sitewide
  // once a promotion period ends, without deleting the copy.
  promo: settings.promo,

  // Accessibility widget (Tabnav) — same provider used on law.ristar.co.
  // The request key from the embed snippet issued for etude.ristar.co; the
  // widget language follows the page (see AccessibilityWidget.astro).
  tabnavReq: 'qpW9foMfxTXWGKBm8tUELM3lhjYtKw',

  // Analytics — inert until a real ID is supplied. Leave as-is to ship with
  // analytics disabled; replace with a real G-XXXXXXX ID to activate.
  ga4MeasurementId: 'G-PYNX9TKS20',

  // Contact form relay (FormSubmit — no backend required)
  formSubmitEndpoint: 'https://formsubmit.co/2mmedia.il@gmail.com',
} as const;

export type SiteConfig = typeof SITE;

/** Opening hours as a display range, e.g. "08:00–21:00". Wrapped in a
 *  left-to-right isolate so the range doesn't flip inside Hebrew text. */
export const hoursDisplay = `\u2066${SITE.hours.opens}–${SITE.hours.closes}\u2069`;

/** Whether the free trial class is currently advertised. */
export const freeTrialActive = SITE.promo.active && SITE.promo.freeTrialLesson;

/** Whether the new-immigrants (Olim) offer is currently advertised. */
export const olimOfferActive = SITE.promo.active && SITE.promo.olimOffer !== false;
