// ETUDE ads stage: ?ad=classes|rental|party &fmt=v|h &lang=ru|he. Every frame is a pure function of t (window.seek).
const Q = new URLSearchParams(location.search);
const AD = Q.get('ad') || 'classes', FMT = Q.get('fmt') || 'v', LANG = Q.get('lang') || 'ru';
const V = FMT === 'v', W = V ? 1080 : 1920, H = V ? 1920 : 1080, DUR = V ? 15 : 30, RTL = LANG === 'he';
document.documentElement.lang = LANG;
const stage = document.getElementById('stage');
Object.assign(stage.style, { width: W + 'px', height: H + 'px' });
stage.dir = RTL ? 'rtl' : 'ltr';

// ---------- copy ----------
const COPY = {
  ru: {
    school: 'Школа бальных и латиноамериканских танцев', addr: 'Ротшильд 49, Ришон-ле-Цион',
    wa: 'Пишите в WhatsApp',
    c_eyebrow: 'Бальные и латиноамериканские танцы', c_h1: 'Учитесь танцевать\nв своём темпе',
    c_trainers: 'Профессиональные\nи опытные тренеры',
    c_creds: ['Танцоры международного класса', 'Вице-чемпион России', 'Полуфиналист Чемпионата Европы'],
    c_ages: 'Дети, подростки\nи взрослые', c_ages_sub: 'от первого шага до соревнований',
    c_levels: ['Начинающие', 'Продолжающие', 'Продвинутые', 'Индивидуальные занятия'],
    c_what: 'Что мы танцуем', c_std: 'Бальные', c_std_l: ['Вальс', 'Танго', 'Фокстрот'],
    c_lat: 'Латина', c_lat_l: ['Ча-ча-ча', 'Самба', 'Румба', 'Сальса'],
    c_offer_a: 'Первое групповое занятие —', c_offer_b: 'бесплатно!', c_olim: 'Особые условия для новых репатриантов',
    r_hook: 'Нужен зал?', r_hook_sub: 'Аренда залов в Ришон-ле-Ционе', r_two: 'Два зала',
    r_big: 'Большой зал', r_small: 'Малый зал', m2: 'м²',
    r_feat: ['Паркет', 'Звуковая система', 'Кондиционер'],
    r_for: 'Подходит для', r_uses: ['Репетиций и тренировок', 'Дней рождения и вечеринок', 'Семинаров и воркшопов', 'Фото- и видеосъёмок'],
    r_cta: 'Бронируйте зал в WhatsApp',
    m_q: 'Гости не умеют\nтанцевать?', m_q1: 'Гости не умеют танцевать?', m_a: 'Научим!',
    m_what: 'Танцевальный мастер-класс\nдля вашего праздника', m_where: 'В нашем зале в Ришон-ле-Ционе', m_where_v: 'В нашем зале',
    m_styles: ['Бальные', 'Латина', 'Социальные'], m_styles_t: 'Какой стиль выберете?',
    m_occ: ['День рождения', 'Девичник', 'Корпоратив', 'Первый свадебный танец'],
    m_hall: 'В нашем зале', m_cta: 'Записывайтесь в WhatsApp',
  },
  he: {
    school: 'בית ספר לריקודי סטנדרט ולטיניים', addr: 'רוטשילד 49, ראשון לציון',
    wa: 'כתבו לנו בוואטסאפ',
    c_eyebrow: 'ריקודי סטנדרט ולטיניים', c_h1: 'ללמוד לרקוד,\nבקצב שלכם',
    c_trainers: 'מאמנים מקצועיים\nומנוסים',
    c_creds: ['רקדנים ברמה בינלאומית', 'סגנית אלופת רוסיה', 'חצי גמר באליפות אירופה'],
    c_ages: 'ילדים, נוער\nומבוגרים', c_ages_sub: 'מהצעד הראשון ועד לתחרויות',
    c_levels: ['מתחילים', 'ממשיכים', 'מתקדמים', 'שיעורים פרטיים'],
    c_what: 'מה רוקדים אצלנו', c_std: 'סטנדרט', c_std_l: ['וואלס', 'טנגו', 'פוקסטרוט'],
    c_lat: 'לטיני', c_lat_l: ['צ׳ה-צ׳ה', 'סמבה', 'רומבה', 'סלסה'],
    c_offer_a: 'שיעור ניסיון קבוצתי ראשון —', c_offer_b: 'חינם!', c_olim: 'תנאים מיוחדים לעולים חדשים',
    r_hook: 'צריכים אולם?', r_hook_sub: 'השכרת אולמות בראשון לציון', r_two: 'שני אולמות',
    r_big: 'אולם גדול', r_small: 'אולם קטן', m2: 'מ״ר',
    r_feat: ['רצפת פרקט', 'מערכת הגברה', 'מיזוג אוויר'],
    r_for: 'מתאים ל…', r_uses: ['חזרות ואימונים', 'ימי הולדת ומסיבות', 'סדנאות והרצאות', 'צילומי סטילס ווידאו'],
    r_cta: 'להזמנת אולם — כתבו לנו בוואטסאפ',
    m_q: 'האורחים לא\nיודעים לרקוד?', m_q1: 'האורחים לא יודעים לרקוד?', m_a: 'נלמד אותם!',
    m_what: 'סדנת ריקוד\nלאירוע שלכם', m_where: 'באולם שלנו בראשון לציון', m_where_v: 'באולם שלנו',
    m_styles: ['סטנדרט', 'לטיני', 'ריקודים חברתיים'], m_styles_t: 'איזה סגנון תבחרו?',
    m_occ: ['יום הולדת', 'מסיבת רווקות', 'גיבוש צוות', 'ריקוד ראשון לחתונה'],
    m_hall: 'באולם שלנו', m_cta: 'להרשמה — כתבו לנו בוואטסאפ',
  },
};
const T = COPY[LANG];
const PHONE = '053-472-6469', SITE = 'etude.ristar.co', IG = '@etude_il';
const LOGO = '/pub/images/brand/logo-full-white.svg';

// ---------- engine ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  out: x => 1 - Math.pow(1 - x, 3),
  io: x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  back: x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
};
const tracks = [];
let pend = [];
const on = fn => tracks.push(fn);
const UNITLESS = new Set(['fontWeight', 'lineHeight', 'opacity', 'zIndex', 'flex']);
const px = (v, k) => (typeof v === 'number' && !UNITLESS.has(k) ? v + 'px' : v);

function el(tag, cls, parent, html, style) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  if (style) for (const k in style) n.style[k] = px(style[k], k);
  (parent || stage).appendChild(n);
  return n;
}
// position from the reading-start side (left in RU, right in HE)
function at(n, x, y, w, h) {
  n.style.position = 'absolute';
  n.style[RTL ? 'right' : 'left'] = px(x);
  if (y != null) n.style.top = px(y);
  if (w != null) n.style.width = px(w);
  if (h != null) n.style.height = px(h);
  return n;
}
const sx = (x, w = 0) => (RTL ? W - x - w : x); // mirror an x coordinate for SVG drawings

function scene(tin, tout) {
  const s = el('div', 'scene');
  on(t => { s.style.display = t >= tin - 1e-6 && t < tout - 1e-6 ? 'block' : 'none'; });
  return s;
}
// enter at tin, leave at tout (null = stays)
function anim(n, tin, tout, o = {}) {
  const d = o.d ?? 0.55, od = o.od ?? 0.3, k = o.k ?? 'up', dist = o.dist ?? 36;
  on(t => {
    if (t < tin || (tout != null && t >= tout + od)) { n.style.opacity = 0; return; }
    const raw = clamp((t - tin) / d), p = E.out(raw), q = tout == null ? 0 : E.io(clamp((t - tout) / od));
    let x = 0, y = 0, s = 1, op = p * (1 - q);
    if (k === 'up') y = (1 - p) * dist - q * dist * 0.6;
    else if (k === 'pop') { s = lerp(0.5, 1, E.back(raw)) * (1 - 0.06 * q); op = clamp(raw * 3) * (1 - q); }
    else if (k === 'side') { const g = (o.dir ?? 1) * (RTL ? -1 : 1); x = ((1 - p) - q * 0.5) * dist * g; }
    else if (k === 'zoom') s = lerp(1.1, 1, p) * (1 + 0.03 * q);
    else if (k === 'slide') { y = (1 - p) * dist; op = 1 - q; }
    n.style.opacity = op;
    n.style.transform = `translate(${x}px,${y}px) scale(${s})`;
  });
}
// word-by-word reveal; '\n' forces a line break. Returns the time the line is fully settled.
function words(n, text, tin, tout, o = {}) {
  const st = o.st ?? 0.08, d = o.d ?? 0.6;
  let i = 0;
  text.split('\n').forEach(line => {
    const ln = el('div', null, n);
    line.split(' ').forEach((w, wi, arr) => {
      anim(el('span', 'w', ln, w), tin + st * i++, tout, { k: o.k ?? 'up', d, dist: o.dist ?? 44, od: o.od });
      if (wi < arr.length - 1) ln.appendChild(document.createTextNode(' '));
    });
  });
  return tin + st * (i - 1) + d;
}
const NF = { f8: 866, f10: 757 };
function clip(parent, dir, start, tin, tout) {
  const img = el('img', 'cover', parent);
  on(t => {
    if (t < tin - 0.05 || t > tout + 0.05) return;
    const f = clamp(1 + Math.floor((start + Math.max(0, t - tin)) * 30 + 1e-4), 1, NF[dir]);
    const src = `${dir}/${String(f).padStart(4, '0')}.jpg`;
    if (img.dataset.src !== src) { img.dataset.src = src; img.src = src; pend.push(img.decode().catch(() => {})); }
  });
  return img;
}
function photo(parent, src, tin, tout, o = {}) {
  const img = el('img', 'cover', parent);
  img.src = src;
  on(t => {
    const p = clamp((t - tin) / (tout - tin));
    if (o.pan) img.style.objectPosition = `${lerp(o.pan[0], o.pan[1], E.io(p))}% ${o.py ?? 50}%`;
    else img.style.objectPosition = o.pos ?? '50% 50%';
    img.style.transform = `scale(${lerp(o.s0 ?? 1.1, o.s1 ?? 1, p)})`;
  });
  return img;
}
function icon(name, size = '1.05em') {
  return `<svg class="line" viewBox="0 0 24 24" style="width:${size};height:${size};flex:none">${ICON[name]}</svg>`;
}
const ICON = {
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  ig: '<rect width="20" height="20" x="2" y="2" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><path d="M17.5 6.5h.01"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  parquet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M10 3v6M15 9v6M8 15v6M16 15v6"/>',
  sound: '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.36 18.36a9 9 0 0 0 0-12.73"/>',
  snow: '<path d="M2 12h20M12 2v20"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3M12 8v3M17 8v3"/><path d="M7 4h.01M12 4h.01M17 4h.01"/>',
  board: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  crown: '<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.3l4.27-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.67a1 1 0 0 0 1.52-.3z"/><path d="M5 21h14"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  rings: '<circle cx="8.5" cy="14.5" r="5.5"/><circle cx="15.5" cy="14.5" r="5.5"/><path d="m8.5 4 1.6 2-1.6 2-1.6-2z"/>',
};
const WA = `<svg viewBox="0 0 32 32" style="width:1.05em;height:1.05em;flex:none"><circle cx="16" cy="16" r="16" fill="#25D366"/><path d="M16 7a9 9 0 0 0-7.8 13.5L7 25l4.6-1.2A9 9 0 1 0 16 7z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path fill="#fff" d="M12.8 11.4c.3-.6.8-.6 1.1-.1l.9 1.6c.2.4.1.8-.2 1.1l-.5.5c.6 1.3 1.6 2.3 2.9 2.9l.5-.5c.3-.3.7-.4 1.1-.2l1.6.9c.5.3.5.8-.1 1.1-1 .6-2.3.7-3.5 0a9.6 9.6 0 0 1-3.8-3.8c-.7-1.2-.6-2.5 0-3.5z"/></svg>`;

// ---------- shared pieces ----------
function background() {
  const bg = el('div', 'fill');
  const blob = (c, r) => el('div', 'abs', bg, null, { width: r * 2, height: r * 2, left: -r, top: -r, borderRadius: '50%', background: `radial-gradient(circle, ${c} 0%, rgba(23,34,74,0) 68%)` });
  const b1 = blob('rgba(85,112,184,.55)', V ? 900 : 950), b2 = blob('rgba(47,75,155,.7)', V ? 1000 : 900), b3 = blob('rgba(120,150,230,.22)', 700);
  const pat = el('div', 'fill', bg, null, { backgroundImage: 'url(/pub/images/brand/bg.webp)', backgroundSize: '1120px auto', filter: 'invert(1) brightness(1.6)', mixBlendMode: 'screen', opacity: 0.035 });
  on(t => {
    b1.style.transform = `translate(${W * (0.15 + 0.12 * Math.sin(t * 0.21))}px, ${H * (0.18 + 0.1 * Math.cos(t * 0.17))}px)`;
    b2.style.transform = `translate(${W * (0.85 + 0.1 * Math.cos(t * 0.19))}px, ${H * (0.8 + 0.08 * Math.sin(t * 0.23))}px)`;
    b3.style.transform = `translate(${W * (0.55 + 0.2 * Math.sin(t * 0.13 + 1))}px, ${H * (0.45 + 0.15 * Math.cos(t * 0.11))}px)`;
    pat.style.backgroundPosition = `${-t * 6}px ${t * 3}px`;
  });
}
function grads(parent) {
  el('div', 'fill', parent, null, { background: 'linear-gradient(180deg, rgba(15,22,50,.7) 0, rgba(15,22,50,0) 420px)' });
  el('div', 'fill', parent, null, { background: V ? 'linear-gradient(0deg, rgba(15,22,50,.94) 0, rgba(15,22,50,.82) 520px, rgba(15,22,50,0) 1120px)'
    : 'linear-gradient(0deg, rgba(15,22,50,.95) 0, rgba(15,22,50,.75) 260px, rgba(15,22,50,0) 560px)' });
}
function tile(parent, name, size) {
  return el('span', 'tile', parent, icon(name, '58%'), { width: size, height: size });
}
function contacts(parent, t0, cta) {
  const c = el('div', null, parent, null, { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: V ? 30 : 22, marginTop: V ? 56 : 34 });
  anim(el('div', 'sans', c, cta, { fontWeight: 600, fontSize: V ? 42 : 38, color: 'var(--sky)' }), t0, null);
  const pill = el('div', 'pill sans', c, `${WA}<span class="ltr">${PHONE}</span>`, { fontSize: V ? 78 : 72 });
  anim(pill, t0 + 0.2, null, { k: 'pop', d: 0.6 });
  const r = el('div', 'row sans', c, null, { fontSize: V ? 38 : 36, fontWeight: 600, gap: '1.3em', flexWrap: 'wrap', justifyContent: 'center' });
  anim(el('span', 'row', r, `${icon('globe')}<span class="ltr">${SITE}</span>`), t0 + 0.45, null);
  anim(el('span', 'row', r, `${icon('ig')}<span class="ltr">${IG}</span>`), t0 + 0.55, null);
  if (!V) anim(el('span', 'row', r, `${icon('pin')}<span>${T.addr}</span>`), t0 + 0.65, null);
  else anim(el('div', 'row sans', c, `${icon('pin')}<span>${T.addr}</span>`, { fontSize: 38, fontWeight: 600 }), t0 + 0.65, null);
  // a soft glow sweeps the phone pill on the beat-ish, to keep the end card alive
  on(t => { const g = 0.5 + 0.5 * Math.sin((t - t0) * 2.2); pill.style.boxShadow = `0 20px 50px -20px rgba(0,0,0,.6), 0 0 ${30 + 30 * g}px rgba(185,203,255,${0.15 + 0.2 * g})`; });
}
function endCard(tin, cta, head) {
  const s = scene(tin, DUR + 1);
  const box = el('div', 'abs', s, null, V ? { left: 60, right: 60, top: 220, bottom: 430 } : { left: 100, right: 100, top: 60, bottom: 60 });
  Object.assign(box.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' });
  const lg = el('img', null, box, null, { width: V ? 460 : 400 });
  lg.src = LOGO;
  anim(lg, tin + 0.05, null, { k: 'zoom', d: 0.9 });
  const t = head ? head(box, tin + 0.3) : tin + 0.35;
  contacts(box, t, cta);
}
function topLogo(parent, tin, tout, w) {
  const lg = el('img', 'abs', parent, null, { width: w, left: (W - w) / 2, top: V ? 200 : 46 });
  lg.src = LOGO;
  lg.style.filter = 'drop-shadow(0 4px 18px rgba(0,0,0,.45))';
  anim(lg, tin, tout, { k: 'fade', d: 0.6 });
}
function hbox(parent, style) { // bottom-anchored, centered text box over footage (vertical)
  return el('div', 'abs shadow', parent, null, Object.assign({ left: 70, right: 70, bottom: 440, textAlign: 'center' }, style || {}));
}

// ---------- footprints ----------
const SOLE = 'M20 0C33 0 40 14 39 30C38 46 32 58 27 66L13 66C8 58 2 46 1 30C0 14 7 0 20 0Z';
function foot(parent, s, size, life, fill) {
  // s: {x, y, r, f:'L'|'R', t, label}
  const wrap = el('div', 'abs', parent, null, { left: s.x - size * 0.2, top: s.y - size * 0.5, width: size * 0.4, height: size, transform: `rotate(${s.r}deg)` });
  const inner = el('div', null, wrap, `<svg viewBox="0 0 40 100" style="width:100%;height:100%;overflow:visible"><g fill="${fill || '#dbe4fb'}" ${s.f === 'L' ? 'transform="translate(40,0) scale(-1,1)"' : ''}><path d="${SOLE}"/><ellipse cx="20" cy="87" rx="10" ry="11"/></g></svg>`);
  anim(inner, s.t, s.t + life, { k: 'pop', d: 0.35, od: 0.5 });
  if (s.label) {
    const lb = el('div', 'abs sans', parent, s.label, { left: s.lx ?? s.x - 30, top: s.ly ?? s.y + size * 0.6, width: 60, textAlign: 'center', fontWeight: 700, fontSize: size * 0.3, color: 'var(--hi)', direction: 'ltr' });
    anim(lb, s.t + 0.04, s.t + life, { k: 'up', d: 0.3, dist: 12, od: 0.5 });
  }
}
// traveling cha-cha style steps along a line: beats 1 2 3 4 & per bar
function travel(parent, { x0, y, dx, t0, t1, beat, size, life, gap }) {
  const pat = [[0, '1'], [1, '2'], [2, '3'], [3, '4'], [3.5, '&']];
  const dir = RTL ? -1 : 1;
  let x = x0, i = 0;
  for (let bar = 0; ; bar++) {
    for (const [b, lab] of pat) {
      const t = t0 + (bar * 4 + b) * beat;
      if (t > t1) return;
      const f = i % 2 ? 'R' : 'L';
      const side = (f === 'L' ? -1 : 1) * dir;
      foot(parent, { x: sx(x), y: y + side * gap, r: 90 * dir, f, t, label: lab, lx: sx(x) - 30, ly: y + side * gap + (side > 0 ? size * 0.32 : -size * 0.32 - size * 0.36) }, size, life);
      x += b === 3 || b === 3.5 ? dx * 0.55 : dx;
      i++;
    }
  }
}
// clumsy steps for the "can't dance" joke
function messy(parent, cx, cy, t0, beat, size, spread) {
  const pts = [[-0.9, 0.2, 140, 'L'], [-0.25, -0.35, -60, 'R'], [0.2, 0.3, 200, 'L'], [0.75, -0.15, 25, 'L'], [0.35, 0.05, -150, 'R']];
  pts.forEach(([a, b, r, f], i) => foot(parent, { x: cx + a * spread, y: cy + b * spread, r, f, t: t0 + i * beat * 0.8, label: '?', lx: cx + a * spread - 30, ly: cy + b * spread - size * 0.75 }, size, 1.85 - i * beat * 0.8, '#9fb2e6'));
}
// looping dance-step diagram, toes up. seq: [x, y, foot, label] in a ~300x300 box
function diagram(parent, seq, x, y, t0, t1, beat, size) {
  const n = seq.length, loop = (n + 3) * beat;
  for (let c = 0; t0 + c * loop < t1; c++) {
    seq.forEach(([dx, dy, f, lab], i) => {
      const t = t0 + c * loop + i * beat;
      if (t >= t1) return;
      foot(parent, { x: x + dx, y: y + dy, r: 0, f, t, label: lab, lx: x + dx - 30, ly: y + dy - size * 0.95 }, size, Math.min((n - i + 2) * beat, t1 - t));
    });
  }
}
const BOX = [[-30, -80, 'L', '1'], [70, -80, 'R', '2'], [20, -80, 'L', '3'], [70, 60, 'R', '4'], [-30, 60, 'L', '5'], [20, 60, 'R', '6']];
const CHA = [[-30, -80, 'L', '2'], [40, 30, 'R', '3'], [-60, 30, 'L', '4'], [10, 30, 'R', '&'], [-90, 30, 'L', '1']];
const SALSA = [[-30, -80, 'L', '1'], [40, 30, 'R', '2'], [-20, 30, 'L', '3'], [40, 130, 'R', '5'], [-20, 30, 'L', '6'], [40, 30, 'R', '7']];

// ---------- floor plan (rental) ----------
function plan(parent, big, small, o) {
  // big/small: {x,y,w,h} in stage coords (already mirrored for RTL by caller)
  const svg = el('div', 'fill', parent, `<svg width="${W}" height="${H}" style="position:absolute;inset:0;overflow:visible">
    <defs><pattern id="pq" width="64" height="18" patternUnits="userSpaceOnUse"><rect width="64" height="18" fill="rgba(110,140,220,.20)"/><path d="M0 18H64M0 0V18M32 9H64M32 0V9" stroke="rgba(200,215,255,.35)" stroke-width="1.5" fill="none"/></pattern>
    <pattern id="pq2" width="64" height="18" patternUnits="userSpaceOnUse" x="32"><rect width="64" height="18" fill="rgba(110,140,220,.20)"/><path d="M0 18H64M0 0V9M32 9V18" stroke="rgba(200,215,255,.35)" stroke-width="1.5" fill="none"/></pattern></defs>
    <g id="g"></g></svg>`).querySelector('#g');
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); svg.appendChild(n); return n; };
  const halls = [[big, o.bigDraw], [small, o.smallDraw]].map(([r, [a, b]]) => {
    const fill = mk('rect', { x: r.x, y: r.y, width: 0, height: r.h, fill: 'url(#pq)' });
    const per = 2 * (r.w + r.h);
    const rect = mk('rect', { x: r.x, y: r.y, width: r.w, height: r.h, fill: 'none', stroke: '#e6ebf7', 'stroke-width': V ? 5 : 4, 'stroke-dasharray': per, 'stroke-linejoin': 'round' });
    const ticks = mk('path', { d: [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].map(([x, y]) => `M${x - 14} ${y}h-14M${x} ${y - 14}v-14M${x + 14} ${y}h14M${x} ${y + 14}v14`).join(''), stroke: 'rgba(185,203,255,.6)', 'stroke-width': 2, fill: 'none' });
    on(t => {
      const p = E.io(clamp((t - a) / (b - a)));
      rect.setAttribute('stroke-dashoffset', per * (1 - p));
      ticks.style.opacity = clamp((t - b + 0.2) / 0.4);
      const fp = E.io(clamp((t - o.fill) / 0.8));
      fill.setAttribute('width', r.w * fp);
      if (RTL) fill.setAttribute('x', r.x + r.w * (1 - fp));
    });
    return { r, rect };
  });
  return { svg, mk, halls };
}
function counter(parent, r, n, tin, size, label, lsize) {
  const box = el('div', 'abs sans', parent, null, { left: r.x, top: r.y, width: r.w, height: r.h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textShadow: '0 2px 16px rgba(10,16,40,.8)' });
  const num = el('div', null, box, null, { fontSize: size, fontWeight: 800, lineHeight: 1 });
  anim(num, tin, null, { k: 'pop', d: 0.5 });
  on(t => { num.innerHTML = `<span class="ltr">${Math.round(n * E.out(clamp((t - tin) / 1.0)))}</span> ${T.m2}`; });
  anim(el('div', null, box, label, { fontSize: lsize, fontWeight: 600, color: 'var(--sky)', marginTop: lsize * 0.35 }), tin + 0.35, null, { dist: 16 });
}
function speakerFx(parent, x, y, s, tin) {
  const g = el('div', 'abs', parent, null, { left: x, top: y, width: s, height: s });
  anim(el('span', 'tile', g, icon('sound', '62%'), { width: s, height: s, background: 'rgba(23,34,74,.85)' }), tin, null, { k: 'pop' });
  for (let i = 0; i < 3; i++) {
    const ring = el('div', 'abs', g, null, { left: 0, top: 0, width: s, height: s, borderRadius: '50%', border: '3px solid rgba(185,203,255,.7)' });
    on(t => { if (t < tin + 0.3) { ring.style.opacity = 0; return; } const ph = ((t - tin) * 0.8 + i / 3) % 1; ring.style.opacity = 0.8 * (1 - ph); ring.style.transform = `scale(${1 + ph * 1.6})`; });
  }
}
function airFx(parent, x, y, s, tin, w) {
  const g = el('div', 'abs', parent, null, { left: x, top: y, width: s, height: s });
  anim(el('span', 'tile', g, icon('snow', '62%'), { width: s, height: s, background: 'rgba(23,34,74,.85)' }), tin, null, { k: 'pop' });
  const lines = el('div', 'abs', parent, `<svg width="${w}" height="${s * 2.2}" style="overflow:visible">${[0, 1, 2].map(i => `<path d="M0 ${s * 0.5 + i * s * 0.6} q ${w / 8} -18 ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0 t ${w / 4} 0" fill="none" stroke="rgba(185,203,255,.55)" stroke-width="3" stroke-linecap="round" stroke-dasharray="40 60"/>`).join('')}</svg>`, { left: RTL ? x - w + s : x, top: y + s * 0.9 });
  const paths = lines.querySelectorAll('path');
  on(t => { lines.style.opacity = clamp((t - tin - 0.2) / 0.5); paths.forEach((p, i) => p.setAttribute('stroke-dashoffset', -(t - tin) * 110 * (RTL ? -1 : 1) - i * 30)); });
}

// ---------- ad 1: dance classes ----------
function classesV() {
  const B = 1.875 / 4, c1 = 3.75, c2 = 6.5625, c3 = 7.96875, c4 = 9.375;
  const s1 = scene(0, c1); clip(s1, 'f8', 0.8, 0, c1);
  const s2 = scene(c1, c2); clip(s2, 'f10', 0.0, c1, c2);
  const s3 = scene(c2, c3); photo(s3, 'p2.jpg', c2, c3, { pan: [20, 70], s0: 1.06, s1: 1 });
  const s4 = scene(c3, c4 + 0.45); const p9 = el('div', 'fill', s4); photo(p9, 'p9.jpg', c3, c4, { s0: 1.14, s1: 1.02, pos: '50% 30%' });
  const ov = scene(0, c4 + 0.45); grads(ov);
  anim(p9, c3, c4, { k: 'fade', d: 0.01, od: 0.4 }); anim(ov, 0, c4, { k: 'fade', d: 0.01, od: 0.4 });
  topLogo(ov, 0.2, c4 - 0.35, 250);
  let b = hbox(ov);
  anim(el('div', 'eyebrow sans', b, T.c_eyebrow, { fontSize: 30, marginBottom: 18 }), 0.25, c1 - 0.35);
  words(el('div', 'script', b, null, { fontSize: 118 }), T.c_h1, 0.4, c1 - 0.35);
  b = hbox(ov);
  words(el('div', 'script', b, null, { fontSize: 112 }), T.c_trainers, c1 + 0.12, c2 - 0.35);
  b = hbox(ov);
  words(el('div', 'script', b, null, { fontSize: 116 }), T.c_ages, c2 + 0.12, c4 - 0.35);
  anim(el('div', 'sans', b, T.c_ages_sub, { fontSize: 44, fontWeight: 600, marginTop: 14, color: 'var(--sky)' }), c2 + 0.6, c4 - 0.35);
  endCard(c4 + 0.05, T.wa, (box, t) => {
    const o = el('div', 'script', box, null, { marginTop: 50 });
    anim(el('div', null, o, T.c_offer_a, { fontSize: 76 }), t, null);
    anim(el('div', null, o, T.c_offer_b, { fontSize: 170, color: 'var(--hi)', lineHeight: 1.1 }), t + 0.35, null, { k: 'pop', d: 0.6 });
    anim(el('div', 'chip sans', box, T.c_olim, { fontSize: 34, marginTop: 26, fontWeight: 600 }), t + 0.9, null);
    return t + 1.5;
  });
}
function classesH() {
  const B = 1.875 / 4, c1 = 3.75, c2 = 9.375, c3 = 15, c4 = 20.625, c5 = 24.375;
  // 1. triptych hook
  const s1 = scene(0, c1);
  [['f8', 10.5], ['f10', 15.0], ['f8', 18.0]].forEach(([d, st], i) => {
    const p = el('div', 'abs', s1, null, { left: i * 642, top: 0, width: 636, height: 1080, overflow: 'hidden' });
    clip(p, d, st, 0, c1);
    anim(p, i * B * 0.5, null, { k: 'slide', dist: 1080, d: 0.75 });
  });
  grads(s1);
  topLogo(s1, 0.5, c1 - 0.35, 230);
  const hb = el('div', 'abs shadow', s1, null, { left: 80, right: 80, bottom: 70, textAlign: 'center' });
  anim(el('div', 'eyebrow sans', hb, T.c_eyebrow, { fontSize: 30, marginBottom: 10 }), 0.6, c1 - 0.35);
  words(el('div', 'script', hb, null, { fontSize: 104 }), T.c_h1.replace('\n', ' '), 0.75, c1 - 0.35);
  // 2+3. footage panel on the far side, text on the reading side
  const panel = el('div', 'abs card', scene(c1, c3 + 0.4), null, { top: 0, height: 1080, width: 640, borderRadius: 0 });
  panel.style[RTL ? 'left' : 'right'] = '0px';
  const pa = scene(c1, c2), pb = scene(c2, c3);
  panel.appendChild(pa); panel.appendChild(pb);
  clip(pa, 'f8', 0.8, c1, c2); clip(pb, 'f10', 0.0, c2, c3);
  anim(panel, c1, c3, { k: 'side', dir: 1, dist: 640, d: 0.6, od: 0.4 });
  const s2 = scene(c1, c2);
  const col2 = at(el('div', null, s2), 120, 150, 1060);
  words(el('div', 'script', col2, null, { fontSize: 120, marginBottom: 46 }), T.c_what, c1 + 0.2, c2 - 0.35);
  [[T.c_std, T.c_std_l, 0], [T.c_lat, T.c_lat_l, 3]].forEach(([lab, list, k0]) => {
    anim(el('div', 'eyebrow sans', col2, lab, { fontSize: 32, margin: '28px 0 18px' }), c1 + 0.55 + k0 * B, c2 - 0.35);
    const r = el('div', 'row', col2, null, { gap: 18, flexWrap: 'wrap' });
    list.forEach((x, i) => anim(el('span', 'chip sans', r, x, { fontSize: 50 }), c1 + 0.75 + (k0 + i) * B, c2 - 0.35, { k: 'pop', d: 0.45 }));
  });
  const s3 = scene(c2, c3);
  const col3 = at(el('div', null, s3), 120, 200, 1060);
  words(el('div', 'script', col3, null, { fontSize: 116, marginBottom: 50 }), T.c_trainers, c2 + 0.2, c3 - 0.35);
  T.c_creds.forEach((x, i) => anim(el('div', 'row sans', col3, `${tile(document.createElement('div'), 'award', 76).outerHTML}<span>${x}</span>`, { fontSize: 46, fontWeight: 600, marginTop: 22 }), c2 + 1.0 + i * 2 * B, c3 - 0.35, { k: 'side', dir: -1, dist: 50 }));
  // 4. collage + ages/levels
  const s4 = scene(c3, c4);
  // [src, offset from the far edge, top, w, h, focus]
  const cards = [['p2.jpg', 80, 90, 900, 506, '50% 40%'], ['p6.jpg', 542, 620, 438, 380, '50% 22%'], ['p9.jpg', 80, 620, 438, 380, '50% 28%']];
  cards.forEach(([src, off, y, w, h, pos], i) => {
    const c = el('div', 'abs card', s4, null, { top: y, width: w, height: h });
    c.style[RTL ? 'left' : 'right'] = px(off);
    photo(c, src, c3, c4, { pos, s0: 1.12, s1: 1.0 });
    anim(c, c3 + 0.15 + i * B, c4 - 0.4, { k: 'zoom', d: 0.7 });
  });
  const col4 = at(el('div', null, s4), 110, 170, 760);
  words(el('div', 'script', col4, null, { fontSize: 108 }), T.c_ages, c3 + 0.3, c4 - 0.4);
  anim(el('div', 'sans', col4, T.c_ages_sub, { fontSize: 42, fontWeight: 600, color: 'var(--sky)', margin: '20px 0 44px' }), c3 + 0.9, c4 - 0.4);
  const lv = el('div', 'row', col4, null, { gap: 16, flexWrap: 'wrap' });
  T.c_levels.forEach((x, i) => anim(el('span', 'chip sans', lv, x, { fontSize: 36 }), c3 + 1.5 + i * B, c4 - 0.4, { k: 'pop', d: 0.45 }));
  // 5. offer
  const s5 = scene(c4, c5);
  const ob = el('div', 'abs script', s5, null, { left: 100, right: 100, top: 210, textAlign: 'center' });
  anim(el('div', null, ob, T.c_offer_a, { fontSize: 92 }), c4 + 0.15, c5 - 0.35);
  anim(el('div', null, ob, T.c_offer_b, { fontSize: 230, color: 'var(--hi)', lineHeight: 1.1 }), c4 + 0.5, c5 - 0.35, { k: 'pop', d: 0.6 });
  const ol = el('div', 'abs', s5, null, { left: 0, right: 0, top: 760, textAlign: 'center' });
  anim(el('span', 'chip sans', ol, T.c_olim, { fontSize: 44 }), c4 + 1.2, c5 - 0.35);
  // 6. end card
  endCard(c5, T.wa, (box, t) => { anim(el('div', 'sans', box, T.school, { fontSize: 36, fontWeight: 500, color: 'var(--sky)', marginTop: 18 }), t, null); return t + 0.3; });
}

// ---------- ad 2: hall rental ----------
function grid(parent, tin) {
  const g = el('div', 'fill', parent, null, { backgroundImage: 'linear-gradient(rgba(185,203,255,.07) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(185,203,255,.07) 1.5px, transparent 1.5px)', backgroundSize: '60px 60px', backgroundPosition: '-1px -1px' });
  anim(g, tin, null, { k: 'fade', d: 1.2 });
}
function rentalV() {
  const B = 0.625, c1 = 2.5, c2 = 5.625, c3 = 8.125, c4 = 11.875;
  const sp = scene(0, c3 + 0.5); grid(sp, 0);
  const big = { x: 240, y: 600, w: 600, h: 405 }, small = { x: sx(240, 300), y: 1050, w: 300, h: 192 };
  const pl = el('div', 'fill', sp);
  plan(pl, big, small, { bigDraw: [0.8, 2.3], smallDraw: [2.65, 3.3], fill: c2 + 0.05 });
  counter(pl, big, 135, 2.9, 104, T.r_big, 36);
  counter(pl, small, 32, 3.35, 64, T.r_small, 26);
  speakerFx(pl, sx(big.x + 26, 96), big.y + 26, 96, c2 + 0.6);
  airFx(pl, sx(big.x + big.w - 26 - 96, 96), big.y + 26, 96, c2 + 1.25, 300);
  anim(pl, 0, c3 - 0.1, { k: 'fade', d: 0.01, od: 0.45 });
  // 1. hook
  const s1 = scene(0, c1 + 0.4);
  const hb = el('div', 'abs', s1, null, { left: 60, right: 60, top: 250, textAlign: 'center' });
  words(el('div', 'script', hb, null, { fontSize: 190 }), T.r_hook, 0.1, c1 - 0.3, { st: 0.12 });
  anim(el('div', 'eyebrow sans', hb, T.r_hook_sub, { fontSize: 36, marginTop: 12 }), 0.6, c1 - 0.3);
  // 2. two halls
  const s2 = scene(c1, c2 + 0.4);
  words(el('div', 'abs script', s2, null, { left: 60, right: 60, top: 320, textAlign: 'center', fontSize: 150 }), T.r_two, c1 + 0.1, c2 - 0.3);
  // 3. features
  const s3 = scene(c2, c3 + 0.4);
  const fr = el('div', 'abs', s3, null, { left: 40, right: 40, top: 280, display: 'flex', justifyContent: 'center', gap: 20 });
  T.r_feat.forEach((x, i) => {
    const c = el('div', 'sans', fr, null, { width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, fontSize: 34, fontWeight: 700, textAlign: 'center' });
    tile(c, ['parquet', 'sound', 'snow'][i], 130); el('div', null, c, x);
    anim(c, c2 + 0.05 + i * B, c3 - 0.3, { k: 'pop' });
  });
  // 4. uses
  const s4 = scene(c3, c4 + 0.4);
  words(el('div', 'abs script', s4, null, { left: 60, right: 60, top: 300, textAlign: 'center', fontSize: 130 }), T.r_for, c3 + 0.2, c4 - 0.3);
  const ul = at(el('div', null, s4), 110, 560, 860);
  T.r_uses.forEach((x, i) => {
    const r = el('div', 'row sans', ul, null, { fontSize: 52, fontWeight: 700, gap: 34, marginBottom: 44 });
    tile(r, ['music', 'cake', 'board', 'camera'][i], 120); el('span', null, r, x);
    anim(r, c3 + 0.55 + i * B * 0.5, c4 - 0.3, { k: 'side', dir: -1, dist: 60 });
  });
  endCard(c4, T.r_cta);
}
function rentalH() {
  const B = 0.625, c1 = 2.5, c2 = 7.5, c3 = 12.5, c4 = 20;
  const sp = scene(0, c3 + 0.5); grid(sp, 0);
  const bw = 663, bh = 448, sw = 331, shh = 213, gx = 30, x0 = 1920 - 96 - bw - gx - sw;
  const big = { x: sx(x0, bw), y: 316, w: bw, h: bh }, small = { x: sx(x0 + bw + gx, sw), y: 316 + bh - shh, w: sw, h: shh };
  const pl = el('div', 'fill', sp);
  plan(pl, big, small, { bigDraw: [0.7, 2.2], smallDraw: [2.65, 3.3], fill: c2 + 0.05 });
  counter(pl, big, 135, 2.9, 96, T.r_big, 34);
  counter(pl, small, 32, 3.35, 60, T.r_small, 24);
  speakerFx(pl, sx(x0 + 24, 86), big.y + 24, 86, c2 + 0.6);
  airFx(pl, sx(x0 + bw - 24 - 86, 86), big.y + 24, 86, c2 + 1.25, 300);
  anim(pl, 0, c3 - 0.1, { k: 'fade', d: 0.01, od: 0.45 });
  const col = (s) => at(el('div', null, s, null, { display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 1080 }), 110, 0, 680);
  const s1 = scene(0, c1 + 0.4), k1 = col(s1);
  words(el('div', 'script', k1, null, { fontSize: 150 }), T.r_hook, 0.1, c1 - 0.3, { st: 0.12 });
  anim(el('div', 'eyebrow sans', k1, T.r_hook_sub, { fontSize: 32, marginTop: 16 }), 0.6, c1 - 0.3);
  const s2 = scene(c1, c2 + 0.4), k2 = col(s2);
  words(el('div', 'script', k2, null, { fontSize: 140 }), T.r_two, c1 + 0.1, c2 - 0.3);
  anim(el('div', 'row sans', k2, `${icon('pin')}<span>${T.addr}</span>`, { fontSize: 36, fontWeight: 600, marginTop: 24, color: 'var(--sky)' }), c1 + 0.7, c2 - 0.3);
  const s3 = scene(c2, c3 + 0.4), k3 = col(s3);
  T.r_feat.forEach((x, i) => {
    const r = el('div', 'row sans', k3, null, { fontSize: 50, fontWeight: 700, gap: 30, margin: '22px 0' });
    tile(r, ['parquet', 'sound', 'snow'][i], 110); el('span', null, r, x);
    anim(r, c2 + 0.05 + i * B, c3 - 0.3, { k: 'side', dir: -1, dist: 60 });
  });
  const s4 = scene(c3, c4 + 0.4);
  words(el('div', 'abs script', s4, null, { left: 80, right: 80, top: 130, textAlign: 'center', fontSize: 124 }), T.r_for, c3 + 0.3, c4 - 0.35);
  const row = el('div', 'abs', s4, null, { left: 110, right: 110, top: 400, display: 'flex', justifyContent: 'space-between' });
  T.r_uses.forEach((x, i) => {
    const c = el('div', 'sans', row, null, { width: 390, height: 430, borderRadius: 30, background: 'rgba(255,255,255,.06)', border: '2px solid rgba(255,255,255,.14)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 34, padding: '0 26px', fontSize: 44, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 });
    const tl = tile(c, ['music', 'cake', 'board', 'camera'][i], 150); el('div', null, c, x);
    anim(c, c3 + 0.7 + i * B, c4 - 0.35, { k: 'up', dist: 80, d: 0.7 });
    on(t => { tl.style.transform = `translateY(${Math.sin((t - i * 0.5) * 2.5) * 6}px)`; });
  });
  endCard(c4, T.r_cta);
}

// ---------- ad 3: party master class ----------
function partyV() {
  const B = 1.875 / 4, c1 = 2.8125, c2 = 6.5625, c3 = 10.3125;
  const fp = scene(0, c2 + 0.6);
  messy(fp, 540, 1260, 0.05, B, 96, 230);
  travel(fp, { x0: 120, y: 1260, dx: 118, t0: 1.875, t1: c2 - 0.4, beat: B, size: 92, life: 4 * B, gap: 46 });
  const s1 = scene(0, c1 + 0.4);
  const qb = el('div', 'abs', s1, null, { left: 60, right: 60, top: 300, textAlign: 'center' });
  words(el('div', 'script', qb, null, { fontSize: 120 }), T.m_q, 0.05, c1 - 0.3, { st: 0.07 });
  anim(el('div', 'script', qb, T.m_a, { fontSize: 230, color: 'var(--hi)', marginTop: 24 }), 1.875, c1 - 0.3, { k: 'pop', d: 0.55 });
  const s2 = scene(c1, c2 + 0.4);
  const wb = el('div', 'abs', s2, null, { left: 50, right: 50, top: 290, textAlign: 'center' });
  words(el('div', 'script', wb, null, { fontSize: 98 }), T.m_what, c1 + 0.12, c2 - 0.3);
  anim(el('div', 'eyebrow sans', wb, T.m_where_v, { fontSize: 40, margin: '30px 0 40px' }), c1 + 0.75, c2 - 0.3);
  const ch = el('div', 'row', wb, null, { gap: 16, justifyContent: 'center', flexWrap: 'wrap' });
  T.m_styles.forEach((x, i) => anim(el('span', 'chip sans', ch, x, { fontSize: 44 }), c1 + 1.2 + i * B, c2 - 0.3, { k: 'pop', d: 0.45 }));
  const s3 = scene(c2, c3 + 0.4);
  const ol = at(el('div', null, s3), 100, 420, 880);
  T.m_occ.forEach((x, i) => {
    const r = el('div', 'row sans', ol, null, { fontSize: 58, fontWeight: 700, gap: 36, marginBottom: 56 });
    tile(r, ['cake', 'crown', 'users', 'rings'][i], 130); el('span', null, r, x);
    anim(r, c2 + 0.12 + i * B, c3 - 0.3, { k: 'side', dir: -1, dist: 70 });
  });
  endCard(c3, T.m_cta);
}
function partyH() {
  const B = 1.875 / 4, c1 = 3.75, c2 = 9.375, c3 = 15, c4 = 20.625, c5 = 24.375;
  const fp = scene(0, c2 + 0.6);
  messy(fp, 960, 860, 0.05, B, 84, 240);
  travel(fp, { x0: 140, y: 860, dx: 122, t0: 1.875, t1: c2 - 0.4, beat: B, size: 80, life: 5 * B, gap: 40 });
  const s1 = scene(0, c1 + 0.4);
  const qb = el('div', 'abs', s1, null, { left: 80, right: 80, top: 130, textAlign: 'center' });
  words(el('div', 'script', qb, null, { fontSize: 118 }), T.m_q1, 0.05, c1 - 0.3, { st: 0.07 });
  anim(el('div', 'script', qb, T.m_a, { fontSize: 230, color: 'var(--hi)', marginTop: 10 }), 1.875, c1 - 0.3, { k: 'pop', d: 0.55 });
  const s2 = scene(c1, c2 + 0.4);
  const wb = el('div', 'abs', s2, null, { left: 80, right: 80, top: 160, textAlign: 'center' });
  words(el('div', 'script', wb, null, { fontSize: 118 }), T.m_what, c1 + 0.15, c2 - 0.3);
  anim(el('div', 'eyebrow sans', wb, T.m_where, { fontSize: 38, marginTop: 30 }), c1 + 0.85, c2 - 0.3);
  const s3 = scene(c2, c3 + 0.4);
  const row = el('div', 'abs', s3, null, { left: 110, right: 110, top: 300, display: 'flex', justifyContent: 'space-between' });
  T.m_occ.forEach((x, i) => {
    const c = el('div', 'sans', row, null, { width: 390, height: 480, borderRadius: 30, background: 'rgba(255,255,255,.06)', border: '2px solid rgba(255,255,255,.14)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, padding: '0 26px', fontSize: 48, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 });
    const tl = tile(c, ['cake', 'crown', 'users', 'rings'][i], 170); el('div', null, c, x);
    anim(c, c2 + 0.2 + i * B, c3 - 0.35, { k: 'up', dist: 80, d: 0.7 });
    on(t => { tl.style.transform = `translateY(${Math.sin((t - i * 0.4) * 3.35) * 6}px)`; });
  });
  const s4 = scene(c3, c4 + 0.4);
  words(el('div', 'abs script', s4, null, { left: 80, right: 80, top: 90, textAlign: 'center', fontSize: 116 }), T.m_styles_t, c3 + 0.15, c4 - 0.35);
  [BOX, CHA, SALSA].forEach((seq, i) => {
    const cx = [380, 960, 1540][RTL ? 2 - i : i];
    diagram(s4, seq, cx, 610, c3 + 0.6 + i * 0.25, c4 - 0.35, B, 70);
    anim(el('div', 'abs sans', s4, T.m_styles[i], { left: cx - 260, width: 520, top: 850, textAlign: 'center', fontSize: 50, fontWeight: 700 }), c3 + 0.5 + i * B, c4 - 0.35);
  });
  const s5 = scene(c4, c5 + 0.4);
  words(el('div', 'abs script', s5, null, { left: 80, right: 80, top: 150, textAlign: 'center', fontSize: 130 }), T.m_hall, c4 + 0.12, c5 - 0.3);
  const fr = el('div', 'abs', s5, null, { left: 80, right: 80, top: 470, display: 'flex', justifyContent: 'center', gap: 90 });
  T.r_feat.forEach((x, i) => {
    const c = el('div', 'sans', fr, null, { width: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, fontSize: 46, fontWeight: 700 });
    tile(c, ['parquet', 'sound', 'snow'][i], 170); el('div', null, c, x);
    anim(c, c4 + 0.45 + i * B, c5 - 0.3, { k: 'pop' });
  });
  endCard(c5, T.m_cta);
}

// ---------- boot ----------
background();
({ classes: { v: classesV, h: classesH }, rental: { v: rentalV, h: rentalH }, party: { v: partyV, h: partyH } })[AD][FMT]();

window.DUR = DUR;
window.seek = async t => { pend = []; for (const f of tracks) f(t); await Promise.all(pend); };
window.ready = async () => {
  const fonts = LANG === 'he'
    ? ['400 100px "Gveret Levin"', '500 40px Heebo', '600 40px Heebo', '700 40px Heebo', '800 40px Heebo']
    : ['400 100px "Marck Script"', '500 40px Montserrat', '600 40px Montserrat', '700 40px Montserrat', '800 40px Montserrat'];
  await Promise.all(fonts.map(f => document.fonts.load(f, LANG === 'he' ? 'שלום אבג' : 'Привет abc 0123')));
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => (i.src ? i.decode().catch(() => {}) : null)));
  return document.fonts.check(fonts[0], LANG === 'he' ? 'שלום' : 'Привет');
};
