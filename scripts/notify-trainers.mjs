// Push notifications to the trainers' app (/trainers/) through its own OneSignal
// app, run by .github/workflows/deploy.yml in two steps:
//   1. right after the build: compares every built schedule page (dist/trainers/)
//      with the one still live on the site and writes what changed to the step's
//      output (`messages`, one per page: the lines of src/lib/scheduleDiff.ts);
//   2. after the deploy (MESSAGES set): sends each page's changes to the phones
//      that turned notifications on from that page (OneSignal tag "page").
// No ONESIGNAL_TRAINERS_REST_API_KEY → only prints what it would send.
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scheduleChanges } from '../src/lib/scheduleDiff.ts';

const SITE = 'https://etude.ristar.co';
const KEY = process.env.ONESIGNAL_TRAINERS_REST_API_KEY;
const HEADING = { he: 'שינויים בלוח הזמנים', ru: 'Изменения в расписании', en: 'Schedule changes' };
const MAX_LINES = 8;

const pageData = (html) => {
  const m = html.match(/id="ts-data"[^>]*>([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
};

/** The key as a UUID (OneSignal's format), always the same for the same key. */
function uuid(key) {
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${(8 | (parseInt(h[16], 16) & 3)).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

if (process.env.MESSAGES) {
  for (const m of JSON.parse(process.env.MESSAGES)) {
    const text = m.lines.slice(0, MAX_LINES).join('\n') + (m.lines.length > MAX_LINES ? `\n… +${m.lines.length - MAX_LINES}` : '');
    console.log(`${m.slug}:\n${text}`);
    if (!m.appId) continue;
    if (!KEY) {
      console.log(`::warning::No ONESIGNAL_TRAINERS_REST_API_KEY secret — not sent: ${m.slug}`);
      continue;
    }
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${KEY}` },
      body: JSON.stringify({
        app_id: m.appId,
        target_channel: 'push',
        filters: [{ field: 'tag', key: 'page', relation: '=', value: m.slug }],
        idempotency_key: uuid(`${m.slug}|${m.updatedAt}`),
        headings: HEADING,
        contents: { he: text, ru: text, en: text },
        url: m.url,
      }),
    });
    // A 200 can still mean nobody got it, e.g. {"errors":["All included players are not subscribed"]}.
    const body = await res.text();
    let errors;
    try { errors = JSON.parse(body).errors; } catch {}
    console.log(`::${res.ok && !errors ? 'notice' : 'warning'}::${m.slug}: ${res.status} ${body}`);
  }
} else {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
  const pages = ['dist/trainers/index.html', ...readdirSync('dist/trainers').map((d) => `dist/trainers/${d}/index.html`).filter(existsSync)];
  const messages = [];
  for (const file of pages) {
    const now = pageData(readFileSync(file, 'utf8'));
    if (!now) continue;
    const url = `${SITE}${file.slice(4, -'index.html'.length)}`;
    const res = await fetch(url).catch(() => null);
    const was = res?.ok ? pageData(await res.text()) : null; // a new page: nothing to compare with
    if (!was) continue;
    const lines = scheduleChanges(was.days, now.days, today, now.slug === 'all' || now.slug === 'rentals');
    if (lines.length) messages.push({ slug: now.slug, appId: now.pushAppId, updatedAt: now.updatedAt, url, lines });
  }
  console.log(JSON.stringify(messages, null, 2));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `messages=${JSON.stringify(messages)}\n`);
}
