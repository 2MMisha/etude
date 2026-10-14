// /student/cal/pay-<lang>.ics — a monthly "pay your membership" event on the
// due day (10:00), with reminders a few days before and on the day. Offered in
// the student app next to the payment banner. Empty when the reminder is off.
import type { APIRoute, GetStaticPaths } from 'astro';
import { buildIcs } from '../../../lib/calendar';
import { STUDIO_LOCATION } from '../../../lib/trainers';
import { PAYMENT_TEXT, paymentBody, paymentSettings } from '../../../lib/student';
import { ALL_LANGS, type Lang } from '../../../lib/languages';
import app from '../../../data/student-app.json';

export const getStaticPaths: GetStaticPaths = () => ALL_LANGS.map((lang) => ({ params: { lang } }));

export const GET: APIRoute = ({ params }) => {
  const lang = params.lang as Lang;
  const pay = paymentSettings((app as { payment?: object }).payment);
  const day = String(pay.day).padStart(2, '0');
  const events = pay.active
    ? [
        {
          date: `2026-01-${day}`,
          start: '10:00',
          end: '10:15',
          title: PAYMENT_TEXT[lang].title,
          description: paymentBody(lang, pay.day),
          location: STUDIO_LOCATION,
          rrule: `FREQ=MONTHLY;BYMONTHDAY=${pay.day}`,
          alarms: [...(pay.before > 0 ? [pay.before * 1440] : []), 0],
        },
      ]
    : [];
  return new Response(buildIcs(events, PAYMENT_TEXT[lang].title), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
};
