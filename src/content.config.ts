import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Each News post is one JSON file per entry: src/content/news/<id>.json
// Written/updated by staff via the "News: Add or Update Post" GitHub Actions
// workflow (see .github/workflows/news-add-update.yml) — do not hand-edit
// unless you're comfortable with the JSON format.
const news = defineCollection({
  loader: glob({ pattern: '**/*.json', base: 'src/content/news' }),
  schema: z.object({
    // Same id is used as the URL slug for every language
    date: z.string(), // ISO date, e.g. "2026-08-01"
    image: z.string().optional(), // URL; falls back to a placeholder when absent
    title: z.object({ he: z.string(), en: z.string(), ru: z.string() }),
    body: z.object({ he: z.string(), en: z.string(), ru: z.string() }),
  }),
});

// Each Schedule entry is one JSON file per class slot: src/content/schedule/<id>.json
// Written/updated via the "Schedule: Add or Update Slot" workflow.
const schedule = defineCollection({
  loader: glob({ pattern: '**/*.json', base: 'src/content/schedule' }),
  schema: z.object({
    day: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
    startTime: z.string(), // "18:00"
    endTime: z.string(), // "19:00"
    level: z.enum(['beginner', 'intermediate', 'advanced', 'private']),
    className: z.object({ he: z.string(), en: z.string(), ru: z.string() }),
  }),
});

export const collections = { news, schedule };
