// The regular weekly group classes, read from the CRM at build time
// (public_week() in supabase/migrations/20261221000000_public_week_family_prices.sql):
// what the public Schedule page and llms-full.txt show. No one-date changes,
// private lessons or rentals. The site rebuilds hourly, so a class added or moved
// for every week in the CRM (Settings, Groups) shows here by itself.
// If the database can't be reached the list is empty and the page shows its
// "full schedule coming soon" note instead of failing the build.
import { SUPABASE_URL, SUPABASE_KEY } from './crmConfig';
import { minutesToTime } from './timetable';

export interface WeekSlot {
  weekday: number; // 0 = Sunday
  start: string; // "17:45"
  end: string;
  group: string;
  program: string;
  trainer: string;
  hall: string;
}

let cached: Promise<WeekSlot[]> | undefined;

export function getPublicWeek(): Promise<WeekSlot[]> {
  cached ??= (async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_week`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows: { weekday: number; start_time: string; minutes: number; group_name: string; program: string; trainer: string; hall: string }[] = await res.json();
    return rows.map((r) => {
      const start = r.start_time.slice(0, 5);
      const [h, m] = start.split(':').map(Number);
      return { weekday: r.weekday, start, end: minutesToTime(h * 60 + m + r.minutes), group: r.group_name, program: r.program, trainer: r.trainer, hall: r.hall };
    });
  })().catch((err) => {
    console.warn(`[schedule] CRM unavailable (${err.message}) - the page shows its placeholder`);
    return [];
  });
  return cached;
}
