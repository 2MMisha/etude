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
  tagline: {
    he: 'בית ספר לריקודי בלרום ולטיניים',
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

  // Promotions — editable via /admin/. Turn "active" off to hide sitewide
  // once a promotion period ends, without deleting the copy.
  promo: settings.promo,

  // Accessibility widget (Tabnav) — same provider used on law.ristar.co.
  // Inert until a real embed snippet is issued for this domain. Sign up at
  // https://tabnav.com/get-free-widget with etude.ristar.co as the domain;
  // they'll email a ready-to-paste <script> snippet — paste it verbatim
  // into tabnavEmbedCode below (see README section on the accessibility
  // widget for details). Left blank, no accessibility widget loads.
  tabnavEmbedCode: '',

  // Analytics — inert until a real ID is supplied. Leave as-is to ship with
  // analytics disabled; replace with a real G-XXXXXXX ID to activate.
  ga4MeasurementId: '', // e.g. 'G-XXXXXXXXXX'

  // Contact form relay (FormSubmit — no backend required)
  formSubmitEndpoint: 'https://formsubmit.co/2mmedia.il@gmail.com',
} as const;

export type SiteConfig = typeof SITE;
