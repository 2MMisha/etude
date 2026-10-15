// Push notifications to the student app through OneSignal, run by
// .github/workflows/notify.yml. Only four kinds:
//   - a news post dated today (from 9:00, so a post scheduled ahead goes out that morning);
//   - a new event and a new or retitled "important" notice — found by comparing
//     src/data/student-app.json with the commit before the push (BEFORE);
//   - the payment day (from 9:00).
// Each notification has a fixed idempotency key, so OneSignal sends it once
// however many runs see it. No ONESIGNAL_REST_API_KEY → only prints what it would send.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const APP_ID = '064969bd-2602-4775-b49a-7b60231111d5';
const APP_URL = 'https://etude.ristar.co/student/';
const KEY = process.env.ONESIGNAL_REST_API_KEY;
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
};
const PAY_TODAY = { he: 'היום היום האחרון לתשלום המנוי', ru: 'Сегодня последний день оплаты абонемента', en: 'Today is the last day to pay the membership' };

/** The key as a UUID (OneSignal's format), always the same for the same key. */
function uuid(key) {
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${(8 | (parseInt(h[16], 16) & 3)).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// ::notice:: / ::warning:: lines show on the run's page (and in the API) without opening the log.
async function send(key, headings, contents, hash = '') {
  console.log(`${key}: ${contents.ru}`);
  if (!KEY) return console.log(`::warning::No ONESIGNAL_REST_API_KEY secret — not sent: ${key}`);
  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Key ${KEY}` },
    body: JSON.stringify({
      app_id: APP_ID,
      target_channel: 'push',
      included_segments: ['Total Subscriptions'],
      idempotency_key: uuid(key),
      headings,
      contents,
      url: APP_URL + hash,
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

// News dated today.
if (morning)
  for (const f of readdirSync('src/content/news').filter((f) => f.endsWith('.json'))) {
    const post = JSON.parse(readFileSync(`src/content/news/${f}`, 'utf8'));
    const id = f.replace(/\.json$/, '');
    if (post.date === today) await send(`news-${id}`, LABEL.news, loc(post.title), `#news/${encodeURIComponent(id)}`);
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

// Payment day (same default and range as paymentSettings in src/lib/student.ts).
const pay = app.payment ?? {};
const payDay = Math.min(28, Math.max(1, Math.round(Number(pay.day ?? 10)) || 10));
if (morning && pay.active !== false && Number(today.slice(8)) === payDay)
  await send(`pay-${today.slice(0, 7)}`, LABEL.pay, PAY_TODAY, '#studio');
