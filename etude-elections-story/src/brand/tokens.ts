// ETUDE brand tokens — source: public/brand/etude-brandbook.pdf + src/styles/global.css of the site.
export const COLORS = {
  midnightNavy: '#17224A', // dark backgrounds
  navy800: '#1F2D5E',
  navy700: '#283A78',
  etudeBlue: '#2F4B9B', // the brand color
  softBlue: '#5570B8', // brush-stroke underline, small accents only
  mist: '#E6EBF7', // light text on navy
  white: '#FFFFFF',
  // Scene-only (illustration) colors, not brand colors:
  deepNavy: '#0D1533',
  dress: '#0A0F26',
  skin: '#E8B896',
  skinShade: '#CC9472',
  envelope: '#A9C0EC',
  envelopeShade: '#87A2DA',
  warmBokeh: '#FFD7A1',
} as const;

export const FONTS = {
  hebrewBrush: "'Gveret Levin', 'Heebo', sans-serif",
  russianBrush: "'Caveat', 'Montserrat', sans-serif",
  hebrew: "'Heebo', sans-serif",
  latin: "'Montserrat', sans-serif",
} as const;

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

// Instagram / TikTok story UI overlays: keep text out of these bands.
export const SAFE_ZONE = {
  top: 250,
  bottom: 300,
} as const;
