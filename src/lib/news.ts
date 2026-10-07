import { getCollection } from 'astro:content';

/** Today's date in Israel as YYYY-MM-DD (the studio's calendar day). */
export function todayInIsrael(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
}

/**
 * News posts whose date has arrived. A post dated in the future stays
 * hidden; the hourly rebuild (.github/workflows/deploy.yml) publishes it
 * on that day.
 */
export function getPublishedNews() {
  const today = todayInIsrael();
  return getCollection('news', (post) => post.data.date <= today);
}
