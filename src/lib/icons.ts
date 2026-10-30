// Inline SVG icons for the student app (24×24, stroke = currentColor, Lucide-style
// outlines). Sized in CSS (.ic) a bit larger than the text next to them.
const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 13.5h2M11 13.5h2M14.5 13.5h2M7.5 17h2M11 17h2"/>',
  dance: '<circle cx="13" cy="4" r="2"/><path d="M13 6.5 11 12l3 3.5-1 5.5"/><path d="M11 12 7.5 14l-2.5 4"/><path d="m12.3 8.5 4.7-2.5 2.5 2"/><path d="M11.8 9 7 7.5 5 4"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/>',
  request: '<rect x="4" y="3" width="16" height="18.5" rx="2.5"/><path d="M8.5 3V1.8h7V3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  star: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
  starFill: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" fill="currentColor"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  phone: '<path d="M5 3.5h3.5l1.8 4.6-2.3 1.5a11 11 0 0 0 6.4 6.4l1.5-2.3 4.6 1.8V19a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3 5.7 2 2 0 0 1 5 3.5z"/>',
  chat: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.3A8.5 8.5 0 1 1 20.5 11.5z"/><path d="M9 9.5c.3 2.4 2.1 4.3 4.6 4.8l1-1.2 1.8.8"/>',
  pin: '<path d="M12 21.5s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9.5" r="2.5"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="0.7" fill="currentColor"/>',
  install: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3M10.5 18.5h3"/>',
  megaphone: '<path d="M3.5 10v4a1 1 0 0 0 1 1H7l9 5V4L7 9H4.5a1 1 0 0 0-1 1z"/><path d="M7 15l1.5 5.5h2.5L9.6 15.5"/><path d="M19.5 9.5a3.5 3.5 0 0 1 0 5"/>',
  wallet: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v4"/><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M16 12.5h5v3h-5a1.5 1.5 0 0 1 0-3z"/>',
  check: '<circle cx="12" cy="12" r="9.5"/><path d="m7.5 12.3 3 3 6-6.3"/>',
  send: '<path d="M21.5 2.5 10.5 13.5"/><path d="M21.5 2.5 14.5 21.5l-4-8-8-4z"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2.5"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5"/><path d="M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7 6.5 6.5 0 0 1-5.6-3.2L2.8 15a1.5 1.5 0 0 1 2.5-1.6L8 16"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  cake: '<path d="M4 21h16M5 21v-7.5a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5V21"/><path d="M5 16c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0"/><path d="M12 12V8.5M8 12V9.5M16 12V9.5"/><path d="M12 6.5c-.9 0-1.3-.8-1-1.5L12 3l1 2c.3.7-.1 1.5-1 1.5z"/>',
  invite: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0"/><path d="M18.5 8v6M15.5 11h6"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>',
  trophy: '<path d="M8 3.5h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 5.5H4.5v1.5A3.5 3.5 0 0 0 8 10.5M16 5.5h3.5v1.5a3.5 3.5 0 0 1-3.5 3.5"/><path d="M12 13v4M8.5 20.5h7l-1-3.5h-5z"/>',
  printer: '<path d="M6 9V2.5h12V9"/><path d="M6 18H4.5A2.5 2.5 0 0 1 2 15.5v-4A2.5 2.5 0 0 1 4.5 9h15a2.5 2.5 0 0 1 2.5 2.5v4a2.5 2.5 0 0 1-2.5 2.5H18"/><rect x="6" y="14" width="12" height="7.5" rx="1"/>',
  download: '<path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5"/><path d="M4 17.5v3h16v-3"/>',
  link: '<path d="M10 13.5a4.5 4.5 0 0 0 6.8.5l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.7 1.7"/><path d="M14 10.5a4.5 4.5 0 0 0-6.8-.5l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.7-1.7"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6.5 9 6.5 9-6.5"/>',
  facebook: '<path d="M17.5 2.5h-3a5 5 0 0 0-5 5v3h-3v4h3v8h4v-8h3l1-4h-4v-3a1 1 0 0 1 1-1h3z"/>',
  x: '<path d="M4 3.5h4.5l11.5 17h-4.5z"/><path d="M19.5 3.5l-6.6 7.4M4.5 20.5l6.6-7.4"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** `<svg>` markup for an icon; extra class `ic--flip` mirrors it in right-to-left text (arrows). */
export function icon(name: IconName, extraClass = ''): string {
  return `<svg class="ic${extraClass ? ` ${extraClass}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}
