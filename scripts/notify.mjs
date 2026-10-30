// Push notifications to the student app through OneSignal, run by
// .github/workflows/notify.yml. Only six kinds:
//   - a news post, once its date has come (from 9:00, so a post scheduled ahead goes out that morning);
//   - a new event and a new or retitled "important" notice — found by comparing
//     src/data/student-app.json with the commit before the push (BEFORE);
//   - the payment day (from 9:00);
//   - today's birthdays (from 9:00), one notification for all of them;
//   - a message typed in /admin/ (src/data/push.json).
// Each notification has a fixed idempotency key, so OneSignal sends it once
// however many runs see it. No ONESIGNAL_REST_API_KEY → only prints what it would send.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const STUDENTS = { app: '064969bd-2602-4775-b49a-7b60231111d5', url: 'https://etude.ristar.co/student/', key: process.env.ONESIGNAL_REST_API_KEY, secret: 'ONESIGNAL_REST_API_KEY' };
// The trainers' app (/trainers/) has its own OneSignal app — only admin messages addressed to it go there.
const TRAINERS = { app: '4fba65f7-ea3b-4ab1-800a-6a2e2348d176', url: 'https://etude.ristar.co/trainers/', key: process.env.ONESIGNAL_TRAINERS_REST_API_KEY, secret: 'ONESIGNAL_TRAINERS_REST_API_KEY' };
const BEFORE = /^[0-9a-f]{40}$/.test(process.env.BEFORE || '') && !/^0+$/.test(process.env.BEFORE) ? process.env.BEFORE : '';

const il = (o) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', ...o }).format(new Date());
const today = il({}); // YYYY-MM-DD, Israel
const morning = Number(il({ hour: 'numeric', hourCycle: 'h23' })) >= 9;

const pick = (l, lang) => l?.[lang] || l?.he || l?.ru || l?.en || '';
const loc = (l) => ({ he: pick(l, 'he'), ru: pick(l, 'ru'), en: pick(l, 'en') });
const LABEL = {
  news: { he: 'חדשות ETUDE', ru: 'Новость ETUDE', en: 'ETUDE news' },
  event: { he: 'אירוע ב-ETUDE', ru: 'Мероприятие ETUDE', en: 'ETUDE event' },
  notice: { he: 'חשוב', ru: 'Важно', en: 'Important' },
  pay: { he: 'תשלום מנוי ETUDE', ru: 'Оплата абонемента ETUDE', en: 'ETUDE membership payment' },
  // The same wording as the birthday card in the app (bdayToday / bdayWish).
  bday: { he: 'היום יום הולדת!', ru: 'Сегодня день рождения!', en: "It's a birthday today!" },
};
const PAY_TODAY = { he: 'היום היום האחרון לתשלום המנוי', ru: 'Сегодня последний день оплаты абонемента', en: 'Today is the last day to pay the membership' };

/** The key as a UUID (OneSignal's format), always the same for the same key. */
function uuid(key) {
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${(8 | (parseInt(h[16], 16) & 3)).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// ::notice:: / ::warning:: lines show on the run's page (and in the API) without opening the log.
async function send(key, headings, contents, hash = '', to = STUDENTS) {
  console.log(`${key}: ${contents.ru}`);
  if (!to.key) return console.log(`::warning::No ${to.secret} secret — not sent: ${key}`);
  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${to.key}` },
    body: JSON.stringify({
      app_id: to.app,
      target_channel: 'push',
      included_segments: ['Total Subscriptions'],
      idempotency_key: uuid(key),
      headings,
      contents,
      url: to.url + hash,
    }),
  });
  // A 200 can still mean nobody got it, e.g. {"errors":["All included players are not subscribed"]}.
  const text = await res.text();
  let errors;
  try { errors = JSON.parse(text).errors; } catch {}
  const ok = res.ok && !errors;
  console.log(`::${ok ? 'notice' : 'warning'}::${key}: ${res.status} ${text}`);
  if (!res.ok) process.exitCode = 1;
}

const app = JSON.parse(readFileSync('src/data/student-app.json', 'utf8'));
let old = null;
if (BEFORE) {
  try { old = JSON.parse(execSync(`git show ${BEFORE}:src/data/student-app.json`, { encoding: 'utf8' })); } catch { old = null; } // BEFORE not fetched: skip the comparison rather than resend everything
}

// News: a post dated in the last week, or one added by this push whatever its
// date, once its date has come. Not only "dated today": a post published a day
// after its date, or a scheduled run that GitHub starts late, still goes out.
// The idempotency key keeps it to one notification per post.
const weekAgo = new Date(Date.parse(`${today}T12:00:00Z`) - 7 * 864e5).toISOString().slice(0, 10);
let hadNews = null; // post files in the commit before the push
if (BEFORE) {
  try { hadNews = new Set(execSync(`git ls-tree --name-only ${BEFORE} src/content/news/`, { encoding: 'utf8' }).split('\n').map((p) => p.split('/').pop())); } catch {}
}
if (morning)
  for (const f of readdirSync('src/content/news').filter((f) => f.endsWith('.json'))) {
    const post = JSON.parse(readFileSync(`src/content/news/${f}`, 'utf8'));
    const id = f.replace(/\.json$/, '');
    const added = hadNews && !hadNews.has(f);
    if (post.date <= today && (post.date >= weekAgo || added)) await send(`news-${id}`, LABEL.news, loc(post.title), `#news/${encodeURIComponent(id)}`);
  }

if (old) {
  // New upcoming events.
  const had = new Set((old.events ?? []).map((e) => e.id));
  for (const e of app.events ?? [])
    if (!had.has(e.id) && e.date >= today) {
      const when = `${e.date.slice(8, 10)}.${e.date.slice(5, 7)}${e.start ? ` ${e.start}` : ''}`;
      const t = loc(e.title);
      await send(`event-${e.id}`, LABEL.event, { he: `${t.he} · ${when}`, ru: `${t.ru} · ${when}`, en: `${t.en} · ${when}` }, `#event/${encodeURIComponent(e.id)}`);
    }

  // The "important" notice: switched on, or its title changed (a body typo fix doesn't buzz everyone).
  const n = app.notice;
  const title = JSON.stringify(n?.title ?? {});
  const live = n?.active && pick(n.title, 'he') && !(n.until && n.until < today);
  if (live && !(old.notice?.active && JSON.stringify(old.notice.title ?? {}) === title))
    await send(`notice-${createHash('sha1').update(title).digest('hex')}`, LABEL.notice, loc(n.title), '#notice');
}

// A message sent from /admin/ (src/data/push.json): once, on the push that changed it.
if (old) {
  let p = {}, before = {};
  try { p = JSON.parse(readFileSync('src/data/push.json', 'utf8')); } catch {}
  try { before = JSON.parse(execSync(`git show ${BEFORE}:src/data/push.json`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })); } catch {}
  const title = loc(p.title);
  if (p.id && p.id !== before.id && pick(p.body, 'he'))
    await send(`push-${p.id}`, title.he ? title : { he: 'ETUDE', ru: 'ETUDE', en: 'ETUDE' }, loc(p.body), '', p.to === 'trainers' ? TRAINERS : STUDENTS);
}

// Payment day (same default and range as paymentSettings in src/lib/student.ts).
const pay = app.payment ?? {};
const payDay = Math.min(28, Math.max(1, Math.round(Number(pay.day ?? 10)) || 10));
if (morning && pay.active !== false && Number(today.slice(8)) === payDay)
  await send(`pay-${today.slice(0, 7)}`, LABEL.pay, PAY_TODAY, '#studio');

// Today's birthdays (the list from /admin/, the same as the card in the app).
const names = (app.birthdays ?? []).filter((b) => b.day === Number(today.slice(8)) && b.month === Number(today.slice(5, 7))).map((b) => b.name);
if (morning && names.length) {
  const list = names.join(', ');
  await send(`bday-${today}`, LABEL.bday, { he: `מזל טוב ל${list}! 🎉`, ru: `Поздравляем: ${list}! 🎉`, en: `Happy birthday, ${list}! 🎉` }, '#home');
}
